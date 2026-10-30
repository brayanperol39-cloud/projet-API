import { prisma } from "../prisma";
import { HttpError } from "../utils/httpError";
import { Role } from "../config/permissions";

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

export async function createUser(email: string, role: "ADMIN" | "USER") {
  if (await prisma.user.findUnique({ where: { email } })) {
    throw new HttpError(409, "Cet e-mail existe déjà");
  }
  // isActive false : activé quand l'invitation est acceptée
  return prisma.user.create({ data: { email, role, isActive: false }, select: publicFields });
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

export async function disableUser(actor: Actor, id: number) {
  if (id === actor.id) throw new HttpError(400, "Tu ne peux pas te désactiver toi-même");
  const target = await findOrFail(id);
  assertCanManage(actor, target);

  // $transaction : les deux opérations réussissent ensemble ou échouent ensemble
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { isActive: false } }),
    prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function enableUser(actor: Actor, id: number) {
  const target = await findOrFail(id);
  assertCanManage(actor, target);
  if (!target.passwordHash) throw new HttpError(400, "Invitation pas encore acceptée");
  await prisma.user.update({ where: { id }, data: { isActive: true } });
}
