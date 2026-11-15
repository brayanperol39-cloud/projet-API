
import { describe, test, expect } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/prisma";
import { makeUser, bearer } from "./helpers";

describe("Authentification", () => {
  test("login réussi : 200 et tokens", async () => {
    const u = await makeUser("USER");
    const res = await request(app).post("/auth/login").send({ email: u.email, password: u.password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.role).toBe("USER");
  });

  test("mauvais mot de passe : 401 au format d'erreur unique", async () => {
    const u = await makeUser("USER");
    const res = await request(app).post("/auth/login").send({ email: u.email, password: "faux" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  test("compte désactivé : 401", async () => {
    const u = await makeUser("USER", { isActive: false });
    const res = await request(app).post("/auth/login").send({ email: u.email, password: u.password });
    expect(res.status).toBe(401);
  });

  test("données invalides : 400 VALIDATION_ERROR", async () => {
    const res = await request(app).post("/auth/login").send({ email: "pas-un-email" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("5 échecs verrouillent le compte, même avec le bon mot de passe, et créent un audit log", async () => {
    const u = await makeUser("USER");
    for (let i = 0; i < 5; i++) {
      await request(app).post("/auth/login").send({ email: u.email, password: "faux" });
    }
    const res = await request(app).post("/auth/login").send({ email: u.email, password: u.password });
    expect(res.status).toBe(429);

    const log = await prisma.auditLog.findFirst({ where: { action: "ACCOUNT_LOCKED", targetId: u.user.id } });
    expect(log).not.toBeNull();
  });

  test("/auth/me : sans token 401, token falsifié 401, token valide 200", async () => {
    const u = await makeUser("USER");
    expect((await request(app).get("/auth/me")).status).toBe(401);
    expect((await request(app).get("/auth/me").set(bearer("faux.token.ici"))).status).toBe(401);
    const ok = await request(app).get("/auth/me").set(bearer(u.token));
    expect(ok.status).toBe(200);
    expect(ok.body.data.email).toBe(u.email);
  });

  test("un token d'un compte désactivé est refusé aussitôt", async () => {
    const u = await makeUser("USER");
    await prisma.user.update({ where: { id: u.user.id }, data: { isActive: false } });
    expect((await request(app).get("/auth/me").set(bearer(u.token))).status).toBe(401);
  });
});
