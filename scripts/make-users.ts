import bcrypt from "bcryptjs";
import { prisma } from "../src/prisma";

async function main() {
  const hash = await bcrypt.hash("Password123!", 10);
  const accounts = [
    ["admin@audit.local", "ADMIN"],
    ["agent@audit.local", "AGENT"],
    ["user1@audit.local", "USER"],
    ["user2@audit.local", "USER"],
  ] as const;

  for (const [email, role] of accounts) {
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, role, isActive: true, passwordHash: hash },
    });
    console.log("OK :", email, role);
  }
}

main().finally(() => prisma.$disconnect());
