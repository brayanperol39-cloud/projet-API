
import { describe, test, expect } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/prisma";
import { makeUser, bearer } from "./helpers";

describe("Permissions sur /users", () => {
  test("USER et AGENT : 403 ; ADMIN : 200", async () => {
    const user = await makeUser("USER");
    const agent = await makeUser("AGENT");
    const admin = await makeUser("ADMIN");

    const r1 = await request(app).get("/users").set(bearer(user.token));
    expect(r1.status).toBe(403);
    expect(r1.body.error.code).toBe("FORBIDDEN");
    expect((await request(app).get("/users").set(bearer(agent.token))).status).toBe(403);
    expect((await request(app).get("/users").set(bearer(admin.token))).status).toBe(200);
  });

  test("un ADMIN ne peut pas créer un admin", async () => {
    const admin = await makeUser("ADMIN");
    const res = await request(app).post("/users/admins").set(bearer(admin.token)).send({ email: "nouveau@test.com" });
    expect(res.status).toBe(403);
  });

  test("création d'un utilisateur : 201 et audit log USER_CREATED", async () => {
    const admin = await makeUser("ADMIN");
    const res = await request(app).post("/users").set(bearer(admin.token)).send({ email: "nouveau@test.com" });
    expect(res.status).toBe(201);
    const log = await prisma.auditLog.findFirst({ where: { action: "USER_CREATED", targetId: res.body.id } });
    expect(log?.actorId).toBe(admin.user.id);
  });
});

describe("Changement de rôle", () => {
  test("un ADMIN ne peut pas changer un rôle", async () => {
    const admin = await makeUser("ADMIN");
    const target = await makeUser("USER");
    const res = await request(app).patch(`/users/${target.user.id}/role`).set(bearer(admin.token)).send({ role: "AGENT" });
    expect(res.status).toBe(403);
  });

  test("le SUPER_ADMIN change un rôle : 200 et audit log avec ancien/nouveau rôle", async () => {
    const sa = await makeUser("SUPER_ADMIN");
    const target = await makeUser("USER");
    const res = await request(app).patch(`/users/${target.user.id}/role`).set(bearer(sa.token)).send({ role: "AGENT" });
    expect(res.status).toBe(200);

    const log = await prisma.auditLog.findFirst({ where: { action: "ROLE_CHANGED", targetId: target.user.id } });
    expect(log?.actorId).toBe(sa.user.id);
    expect(log?.metadata).toEqual({ from: "USER", to: "AGENT" });
  });

  test("on ne peut pas changer son propre rôle", async () => {
    const sa = await makeUser("SUPER_ADMIN");
    const res = await request(app).patch(`/users/${sa.user.id}/role`).set(bearer(sa.token)).send({ role: "USER" });
    expect(res.status).toBe(400);
  });
});

describe("Désactivation de compte", () => {
  test("désactivation : compte inactif, sessions coupées, token refusé, audit log", async () => {
    const admin = await makeUser("ADMIN");
    const target = await makeUser("USER");
    await prisma.refreshToken.create({
      data: { userId: target.user.id, tokenHash: "hash-test", expiresAt: new Date(Date.now() + 3600_000) },
    });

    const res = await request(app).patch(`/users/${target.user.id}/disable`).set(bearer(admin.token));
    expect(res.status).toBe(200);

    expect((await prisma.user.findUnique({ where: { id: target.user.id } }))?.isActive).toBe(false);
    expect((await prisma.refreshToken.findFirst({ where: { userId: target.user.id } }))?.revokedAt).not.toBeNull();
    expect((await request(app).get("/auth/me").set(bearer(target.token))).status).toBe(401);

    const log = await prisma.auditLog.findFirst({ where: { action: "ACCOUNT_DEACTIVATED", targetId: target.user.id } });
    expect(log?.actorId).toBe(admin.user.id);
  });

  test("un ADMIN ne peut pas désactiver un AGENT, ni lui-même", async () => {
    const admin = await makeUser("ADMIN");
    const agent = await makeUser("AGENT");
    expect((await request(app).patch(`/users/${agent.user.id}/disable`).set(bearer(admin.token))).status).toBe(403);
    expect((await request(app).patch(`/users/${admin.user.id}/disable`).set(bearer(admin.token))).status).toBe(400);
  });
});

describe("Consultation des audit logs", () => {
  test("USER 403, ADMIN 200", async () => {
    const user = await makeUser("USER");
    const admin = await makeUser("ADMIN");
    expect((await request(app).get("/audit-logs").set(bearer(user.token))).status).toBe(403);
    const res = await request(app).get("/audit-logs").set(bearer(admin.token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
