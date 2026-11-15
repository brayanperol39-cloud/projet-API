import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

type Client = Prisma.TransactionClient | typeof prisma;

export type AuditAction =
  | "ROLE_CHANGED"
  | "ACCOUNT_DEACTIVATED"
  | "ACCOUNT_REACTIVATED"
  | "ACCOUNT_LOCKED"
  | "USER_CREATED";

export async function audit(
  client: Client,
  entry: {
    actorId: number | null;
    action: AuditAction;
    targetType: "user" | "ticket";
    targetId?: number;
    metadata?: Prisma.InputJsonValue; // ex: { from: "USER", to: "ADMIN" }, jamais de mot de passe ni de token
    ip?: string;
  }
) {
  await client.auditLog.create({ data: entry });
}