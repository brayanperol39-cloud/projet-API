import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma";
import { audit } from "../services/audit";
import { authenticate } from "../middleware/auth";
import { loginLimiter } from "../middleware/rateLimiters";
import { loginSchema, refreshSchema } from "../schemas/auth.schemas";
import { tooMany, unauthorized } from "../utils/httpError";
import {
  hashToken,
  refreshTtlMs,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/tokens";

const router = Router();

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Émet un access token (court) et un refresh token (long, stocké hashé en base)
async function issueTokens(user: { id: number; role: string }) {
  const refreshToken = signRefreshToken(user.id);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + refreshTtlMs()),
    },
  });
  return { accessToken: signAccessToken(user), refreshToken };
}

// Connexion
router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body ?? {});

  const user = await prisma.user.findUnique({ where: { email } });

  // Compte verrouillé
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    throw tooMany("Compte temporairement verrouillé, réessayez plus tard");
  }

  const valid =
    !!user &&
    !!user.passwordHash &&
    user.isActive &&
    (await bcrypt.compare(password, user.passwordHash));

    if (!valid) {
    if (user) {
      const attempts = user.failedAttempts + 1;
      const lock = attempts >= MAX_FAILED_ATTEMPTS;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: lock ? 0 : attempts,
          lockedUntil: lock ? new Date(Date.now() + LOCK_DURATION_MS) : null,
        },
      });
      if (lock) {
        await audit(prisma, {
          actorId: null,
          action: "ACCOUNT_LOCKED",
          targetType: "user",
          targetId: user.id,
          ip: req.ip,
        });
      }
    }
    // Même message dans tous les cas d'échec : on ne révèle pas si le compte existe
    throw unauthorized("Identifiants invalides");
  }

  // Succès : on remet le compteur à zéro
  await prisma.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null },
  });

  const tokens = await issueTokens(user);
  res.json({ data: { ...tokens, user: { id: user.id, email: user.email, role: user.role } } });
});

// Renouvellement avec rotation du refresh token
router.post("/refresh", async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body ?? {});

  try {
    verifyRefreshToken(refreshToken);
  } catch {
    throw unauthorized("Refresh token invalide ou expiré");
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { user: true },
  });
  if (!stored) throw unauthorized("Refresh token inconnu");

  // Token déjà révoqué qui revient = vol possible : on révoque toute la session
  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw unauthorized("Refresh token déjà utilisé, reconnectez-vous");
  }

  if (stored.expiresAt < new Date() || !stored.user.isActive) {
    throw unauthorized("Session expirée ou compte désactivé");
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });
  res.json({ data: await issueTokens(stored.user) });
});

// Déconnexion
router.post("/logout", async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body ?? {});
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
  res.json({ data: { message: "Déconnecté" } });
});

// Qui suis-je ?
router.get("/me", authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, role: true, isActive: true },
  });
  res.json({ data: user });
});

export default router;