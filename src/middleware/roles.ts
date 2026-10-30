import { Request, Response, NextFunction } from "express";

type Role = "SUPER_ADMIN" | "ADMIN" | "AGENT" | "USER";

export function requireRole(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Non authentifié" });
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: "Accès interdit pour votre rôle" });
    }
    next();
  };
}
