import crypto from "crypto";
import jwt from "jsonwebtoken";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable manquante dans .env : ${name}`);
  return value;
}

// Token aléatoire (invitation, reset) : on envoie celui-ci, on stocke seulement son hash
export function randomToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function signAccessToken(user: { id: number; role: string }): string {
  return jwt.sign({ sub: String(user.id), role: user.role }, env("JWT_ACCESS_SECRET"), {
    expiresIn: env("ACCESS_TOKEN_TTL") as jwt.SignOptions["expiresIn"],
  });
}

export function refreshTtlMs(): number {
  return Number(env("REFRESH_TOKEN_TTL_DAYS")) * 24 * 60 * 60 * 1000;
}

export function signRefreshToken(userId: number): string {
  // jti aléatoire : deux tokens émis la même seconde restent différents
  return jwt.sign({ sub: String(userId), jti: randomToken() }, env("JWT_REFRESH_SECRET"), {
    expiresIn: `${env("REFRESH_TOKEN_TTL_DAYS")}d` as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env("JWT_ACCESS_SECRET")) as jwt.JwtPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env("JWT_REFRESH_SECRET")) as jwt.JwtPayload;
}
