import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma";
import { authenticate } from "../middleware/auth";
import {
  hashToken,
  refreshTtlMs,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/tokens";

const router = Router();

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
router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "email et password sont requis" });
  }

  const user = await prisma.user.findUnique({ where: { email: email.trim() } });

  // Même message dans tous les cas d'échec : on ne révèle pas si le compte existe
  if (
    !user ||
    !user.passwordHash ||
    !user.isActive ||
    !(await bcrypt.compare(password, user.passwordHash))
  ) {
    return res.status(401).json({ error: "Identifiants invalides" });
  }

  const tokens = await issueTokens(user);
  res.json({ ...tokens, user: { id: user.id, email: user.email, role: user.role } });
});

// Renouvellement : l'ancien refresh token est révoqué, un nouveau est émis (rotation)
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (typeof refreshToken !== "string") {
    return res.status(400).json({ error: "refreshToken est requis" });
  }

  try {
    verifyRefreshToken(refreshToken);
  } catch {
    return res.status(401).json({ error: "Refresh token invalide ou expiré" });
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { user: true },
  });
  if (!stored) return res.status(401).json({ error: "Refresh token inconnu" });

  // Un token déjà révoqué qui revient = vol possible : on révoque toute la session
  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return res.status(401).json({ error: "Refresh token déjà utilisé, reconnectez-vous" });
  }

  if (stored.expiresAt < new Date() || !stored.user.isActive) {
    return res.status(401).json({ error: "Session expirée ou compte désactivé" });
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });
  res.json(await issueTokens(stored.user));
});

// Déconnexion : révoque le refresh token
router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (typeof refreshToken !== "string") {
    return res.status(400).json({ error: "refreshToken est requis" });
  }
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
  res.json({ message: "Déconnecté" });
});

// Utile pour tester : qui suis-je ?
router.get("/me", authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, role: true, isActive: true },
  });
  res.json(user);
});

export default router;
