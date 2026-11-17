
import { beforeEach, afterAll } from "vitest";
import { prisma } from "../src/prisma";

// Garde-fou : on ne touche jamais à une base qui n'est pas une base de test
const url = process.env.DATABASE_URL ?? "";
if (!/test/i.test(url.split("/").pop() ?? "")) {
  throw new Error(`Refus de lancer les tests sur cette base : ${url}`);
}

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    `TRUNCATE "AuditLog","RefreshToken","PasswordResetToken","Invitation","Ticket","User" RESTART IDENTITY CASCADE`
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});
