
import { describe, test, expect } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/prisma";
import { makeUser, bearer } from "./helpers";

async function ticketFor(userId: number, title = "Ticket de test") {
  return prisma.ticket.create({ data: { title, description: "desc", createdById: userId } });
}

describe("Accès aux tickets", () => {
  test("sans token : 401", async () => {
    expect((await request(app).get("/tickets")).status).toBe(401);
  });

  test("un USER crée un ticket, le créateur est enregistré", async () => {
    const u = await makeUser("USER");
    const res = await request(app).post("/tickets").set(bearer(u.token)).send({ title: "Panne", description: "Écran noir" });
    expect(res.status).toBe(201);
    expect(res.body.data.createdById).toBe(u.user.id);
  });

  test("champs inconnus refusés (mass assignment)", async () => {
    const u = await makeUser("USER");
    const res = await request(app).post("/tickets").set(bearer(u.token))
      .send({ title: "Panne", description: "x", status: "closed", createdById: 999 });
    expect(res.status).toBe(400);
  });

  test("un USER ne voit que ses tickets, l'AGENT voit tout", async () => {
    const a = await makeUser("USER");
    const b = await makeUser("USER");
    const agent = await makeUser("AGENT");
    await ticketFor(a.user.id);
    await ticketFor(b.user.id);

    const mine = await request(app).get("/tickets").set(bearer(a.token));
    expect(mine.body.data).toHaveLength(1);
    expect(mine.body.data[0].createdById).toBe(a.user.id);

    const all = await request(app).get("/tickets").set(bearer(agent.token));
    expect(all.body.data).toHaveLength(2);
  });

  test("lecture d'un ticket : propriétaire 200, autre USER 404, AGENT 200", async () => {
    const a = await makeUser("USER");
    const b = await makeUser("USER");
    const agent = await makeUser("AGENT");
    const t = await ticketFor(a.user.id);

    expect((await request(app).get(`/tickets/${t.id}`).set(bearer(a.token))).status).toBe(200);
    expect((await request(app).get(`/tickets/${t.id}`).set(bearer(b.token))).status).toBe(404);
    expect((await request(app).get(`/tickets/${t.id}`).set(bearer(agent.token))).status).toBe(200);
  });

  test("changement de statut : USER 403, AGENT 200, statut invalide 400", async () => {
    const a = await makeUser("USER");
    const agent = await makeUser("AGENT");
    const t = await ticketFor(a.user.id);

    const denied = await request(app).patch(`/tickets/${t.id}/status`).set(bearer(a.token)).send({ status: "closed" });
    expect(denied.status).toBe(403);

    const ok = await request(app).patch(`/tickets/${t.id}/status`).set(bearer(agent.token)).send({ status: "closed" });
    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe("closed");

    const bad = await request(app).patch(`/tickets/${t.id}/status`).set(bearer(agent.token)).send({ status: "nimportequoi" });
    expect(bad.status).toBe(400);
  });
});

describe("Pagination, filtre, tri", () => {
  test("pagination : page 3 de 25 tickets, limit 10 → 5 éléments", async () => {
    const agent = await makeUser("AGENT");
    await prisma.ticket.createMany({
      data: Array.from({ length: 25 }, (_, i) => ({ title: `Ticket ${i}`, description: "d", createdById: agent.user.id })),
    });
    const res = await request(app).get("/tickets?page=3&limit=10").set(bearer(agent.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.meta).toMatchObject({ page: 3, limit: 10, total: 25, totalPages: 3 });
  });

  test("limit trop grand : 400", async () => {
    const agent = await makeUser("AGENT");
    expect((await request(app).get("/tickets?limit=1000").set(bearer(agent.token))).status).toBe(400);
  });

  test("filtre par statut et tri par titre", async () => {
    const agent = await makeUser("AGENT");
    await prisma.ticket.createMany({
      data: [
        { title: "Bravo", description: "d", status: "open", createdById: agent.user.id },
        { title: "Alpha", description: "d", status: "open", createdById: agent.user.id },
        { title: "Charlie", description: "d", status: "closed", createdById: agent.user.id },
      ],
    });
    const res = await request(app).get("/tickets?status=open&sortBy=title&order=asc").set(bearer(agent.token));
    expect(res.body.data.map((t: any) => t.title)).toEqual(["Alpha", "Bravo"]);
  });

  test("injection SQL : traitée comme du texte ou rejetée, jamais exécutée", async () => {
    const agent = await makeUser("AGENT");
    await ticketFor(agent.user.id);

    const search = await request(app).get("/tickets").query({ q: "' OR 1=1 --" }).set(bearer(agent.token));
    expect(search.status).toBe(200);
    expect(search.body.data).toHaveLength(0);

    const sort = await request(app).get("/tickets").query({ sortBy: "id; DROP TABLE tickets" }).set(bearer(agent.token));
    expect(sort.status).toBe(400);

    expect(await prisma.ticket.count()).toBe(1);
  });
});
