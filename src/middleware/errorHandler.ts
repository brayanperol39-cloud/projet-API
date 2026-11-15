import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { HttpError } from "../utils/httpError";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Données invalides",
        details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    });
  }

  // JSON mal formé dans le body
  if (typeof err === "object" && err !== null && (err as any).type === "entity.parse.failed") {
    return res.status(400).json({ error: { code: "INVALID_JSON", message: "JSON invalide" } });
  }

  // Enregistrement introuvable côté Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ressource introuvable" } });
  }

  console.error(err); // jamais de détails internes envoyés au client
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne du serveur" } });
}