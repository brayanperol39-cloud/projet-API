import { Request, Response, NextFunction } from "express";
import { PERMISSIONS, Role } from "../config/permissions";
import { requireRole } from "./roles";

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Non authentifié" });
    if (!PERMISSIONS[req.user.role].includes(permission)) {
      return res.status(403).json({ error: "Permission refusée" });
    }
    next();
  };
}

// authorize = vérifie le rôle PUIS la permission
export function authorize(roles: Role[], permission: string) {
  return [requireRole(...roles), requirePermission(permission)];
}
