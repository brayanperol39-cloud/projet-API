import { HttpError } from "./httpError";

export function parseId(raw: unknown): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "ID invalide");
  return id;
}
