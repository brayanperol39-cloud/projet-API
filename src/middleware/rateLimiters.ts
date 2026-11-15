import rateLimit from "express-rate-limit";
import { tooMany } from "../utils/httpError";

// Limite globale : 200 requêtes / 15 min par IP
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => next(tooMany()),
});

// Limite stricte sur le login : 10 tentatives / 15 min par IP
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => next(tooMany("Trop de tentatives de connexion, réessayez plus tard")),
});