export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string = "ERROR",
    public details?: unknown
  ) {
    super(message);
  }
}

export const badRequest = (m = "Requête invalide", details?: unknown) =>
  new HttpError(400, m, "BAD_REQUEST", details);
export const unauthorized = (m = "Non authentifié") => new HttpError(401, m, "UNAUTHORIZED");
export const forbidden = (m = "Accès interdit") => new HttpError(403, m, "FORBIDDEN");
export const notFound = (m = "Ressource introuvable") => new HttpError(404, m, "NOT_FOUND");
export const conflict = (m = "Conflit") => new HttpError(409, m, "CONFLICT");
export const tooMany = (m = "Trop de requêtes") => new HttpError(429, m, "TOO_MANY_REQUESTS");