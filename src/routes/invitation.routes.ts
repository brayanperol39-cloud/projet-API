import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma";
import { hashToken } from "../utils/tokens";
import { validatePassword } from "../utils/password";

const router = Router();

// Accepter une invitation et définir son mot de passe (route publique : le token fait foi)
router.post("/accept-invitation", async (req, res) => {
  const { token, password } = req.body ?? {};
  if (typeof token !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "token et password sont requis" });
  }

  // CORRECTION VULN-003 : politique de mot de passe côté serveur
  const pwdError = validatePassword(password);
  if (pwdError) {
    return res.status(400).json({ error: pwdError });
  }

  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  // Même message pour inconnu, déjà utilisé, expiré ou compte désactivé
  if (
    !invitation ||
    invitation.usedAt ||
    invitation.expiresAt < new Date() ||
    !invitation.user.isActive
  ) {
    return res.status(400).json({ error: "Invitation invalide ou expirée" });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Transaction : le token est consommé et le mot de passe défini en une seule opération
  const done = await prisma.$transaction(async (tx) => {
    const claimed = await tx.invitation.updateMany({
      where: { id: invitation.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) return false; // déjà utilisé entre-temps
    await tx.user.update({ where: { id: invitation.userId }, data: { passwordHash } });
    return true;
  });

  if (!done) return res.status(400).json({ error: "Invitation invalide ou expirée" });
  res.json({ message: "Mot de passe défini, vous pouvez maintenant vous connecter" });
});

export default router;