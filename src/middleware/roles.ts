import { Request, Response, NextFunction } from "express";
import { forbidden, unauthorized } from "../utils/httpError";

type Role = "SUPER_ADMIN" | "ADMIN" | "AGENT" | "USER";

export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!allowed.includes(req.user.role)) return next(forbidden("Accès interdit pour votre rôle"));
    next();
  };
}