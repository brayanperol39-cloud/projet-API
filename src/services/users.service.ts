import { prisma } from "../prisma";
import { HttpError } from "../utils/httpError";
import { Role } from "../config/permissions";
import { audit } from "./audit";

// On ne renvoie JAMAIS passwordHash
const publicFields = { id: true, email: true, role: true, isActive: true, createdAt: true };

type Actor = { id: number; role: Role };

async function findOrFail(id: number) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new HttpError(404, "Utilisateur introuvable");
  return user;
}

// Règle : un ADMIN ne gère que des USER
function assertCanManage(actor: Actor, target: { role: Role }) {
  if (actor.role === "ADMIN" && target.role !== "USER") {
    throw new HttpError(403, "Un admin ne peut gérer que des utilisateurs");
  }
}

export async function createUser(actor: Actor, email: string, role: "ADMIN" | "USER", ip?: string) {
  if (await prisma.user.findUnique({ where: { email } })) {
    throw new HttpError(409, "Cet e-mail existe déjà");
  }
  // isActive false : activé quand l'invitation est acceptée
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, role, isActive: false },
      select: publicFields,
    });
    await audit(tx, {
      actorId: actor.id,
      action: "USER_CREATED",
      targetType: "user",
      targetId: user.id,
      metadata: { role },
      ip,
    });
    return user;
  });
}

export function listUsers() {
  return prisma.user.findMany({ select: publicFields, orderBy: { id: "asc" } });
}

export async function getUser(id: number) {
  const user = await prisma.user.findUnique({ where: { id }, select: publicFields });
  if (!user) throw new HttpError(404, "Utilisateur introuvable");
  return user;
}

export async function updateUser(actor: Actor, id: number, input: { email?: string | undefined }) {
  const target = await findOrFail(id);
  assertCanManage(actor, target);
  const data = input.email !== undefined ? { email: input.email } : {};
  return prisma.user.update({ where: { id }, data, select: publicFields });
}

// Changement de rôle : SUPER_ADMIN uniquement (imposé aussi par la route)
export async function changeRole(actor: Actor, id: number, newRole: Role, ip?: string) {
  if (actor.role !== "SUPER_ADMIN") throw new HttpError(403, "Réservé au super admin");
  if (id === actor.id) throw new HttpError(400, "Tu ne peux pas changer ton propre rôle");
  const target = await findOrFail(id);
  if (target.role === newRole) throw new HttpError(400, "L'utilisateur a déjà ce rôle");

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: { role: newRole },
      select: publicFields,
    });
    await audit(tx, {
      actorId: actor.id,
      action: "ROLE_CHANGED",
      targetType: "user",
      targetId: id,
      metadata: { from: target.role, to: newRole },
      ip,
    });
    return user;
  });
}

export async function disableUser(actor: Actor, id: number, ip?: string) {
  if (id === actor.id) throw new HttpError(400, "Tu ne peux pas te désactiver toi-même");
  const target = await findOrFail(id);
  assertCanManage(actor, target);

  // Transaction : désactivation, coupure des sessions et log réussissent ou échouent ensemble
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { isActive: false } });
    await tx.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await audit(tx, {
      actorId: actor.id,
      action: "ACCOUNT_DEACTIVATED",
      targetType: "user",
      targetId: id,
      ip,
    });
  });
}

export async function enableUser(actor: Actor, id: number, ip?: string) {
  const target = await findOrFail(id);
  assertCanManage(actor, target);
  if (!target.passwordHash) throw new HttpError(400, "Invitation pas encore acceptée");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { isActive: true } });
    await audit(tx, {
      actorId: actor.id,
      action: "ACCOUNT_REACTIVATED",
      targetType: "user",
      targetId: id,
      ip,
    });
  });
}