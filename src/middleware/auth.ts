import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma";
import { verifyAccessToken } from "../utils/tokens";

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; role: "SUPER_ADMIN" | "ADMIN" | "AGENT" | "USER" };
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant" });
  }

  try {
    const payload = verifyAccessToken(header.slice(7));
    const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) } });

    // On relit l'utilisateur en base : un compte désactivé est refusé tout de suite
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Compte inexistant ou désactivé" });
    }

    req.user = { id: user.id, role: user.role };
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide ou expiré" });
  }
}
