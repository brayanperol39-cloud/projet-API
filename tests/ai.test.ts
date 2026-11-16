import { describe, test, expect, vi } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/prisma";
import { makeUser, bearer } from "./helpers";

vi.mock("../src/services/ai", () => ({
  analyzeTicket: vi.fn().mockResolvedValue({
    summary: "Écran noir au démarrage",
    category: "bug",
    priority: "high",
    suggestedReply: "Bonjour, pouvez-vous redémarrer l'appareil ?",
  }),
}));

describe("Analyse IA des tickets", () => {
  test("USER : 403 ; sans token : 401", async () => {
    const user = await makeUser("USER");
    const t = await prisma.ticket.create({ data: { title: "Panne", description: "x", createdById: user.user.id } });
    expect((await request(app).post(`/tickets/${t.id}/analyze`)).status).toBe(401);
    expect((await request(app).post(`/tickets/${t.id}/analyze`).set(bearer(user.token))).status).toBe(403);
  });

  test("AGENT : 200 avec une analyse validée", async () => {
    const user = await makeUser("USER");
    const agent = await makeUser("AGENT");
    const t = await prisma.ticket.create({ data: { title: "Panne", description: "x", createdById: user.user.id } });
    const res = await request(app).post(`/tickets/${t.id}/analyze`).set(bearer(agent.token));
    expect(res.status).toBe(200);
    expect(res.body.data.priority).toBe("high");
  });

  test("ticket inexistant : 404", async () => {
    const agent = await makeUser("AGENT");
    expect((await request(app).post("/tickets/9999/analyze").set(bearer(agent.token))).status).toBe(404);
  });
});