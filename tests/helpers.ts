
import bcrypt from "bcryptjs";
import { prisma } from "../src/prisma";
import { signAccessToken } from "../src/utils/tokens";

type Role = "SUPER_ADMIN" | "ADMIN" | "AGENT" | "USER";

// Crée un compte et fabrique directement son token (pas besoin de passer par /auth/login)
export async function makeUser(role: Role, opts: { isActive?: boolean; email?: string } = {}) {
  const password = "Password123!";
  const email = opts.email ?? `${role.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}@test.com`;
  const user = await prisma.user.create({
    data: {
      email,
      role,
      isActive: opts.isActive ?? true,
      passwordHash: await bcrypt.hash(password, 4),
    },
  });
  return { user, email, password, token: signAccessToken(user) };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
