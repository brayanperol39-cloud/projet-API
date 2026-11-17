import { describe, test, expect, vi, afterEach, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/prisma";
import { makeUser, bearer } from "./helpers";

const fakeOpenAI = () =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ choices: [{ message: { content: "Résumé de test" } }] }),
  } as Response);

beforeEach(() => { process.env.OPENAI_API_KEY = "sk-test"; });
afterEach(() => { vi.restoreAllMocks(); });

describe("Résumé IA", () => {
  test("un USER reçoit 403", async () => {
    const u = await makeUser("USER");
    const t = await prisma.ticket.create({ data: { title: "Panne", description: "x", createdById: u.user.id } });
    const res = await request(app).post(`/tickets/${t.id}/ai/summary`).set(bearer(u.token));
    expect(res.status).toBe(403);
  });

  test("un AGENT reçoit le résumé", async () => {
    fakeOpenAI();
    const u = await makeUser("USER");
    const agent = await makeUser("AGENT");
    const t = await prisma.ticket.create({ data: { title: "Panne", description: "x", createdById: u.user.id } });
    const res = await request(app).post(`/tickets/${t.id}/ai/summary`).set(bearer(agent.token));
    expect(res.status).toBe(200);
    expect(res.body.data.summary).toBe("Résumé de test");
  });

  test("ticket inexistant : 404", async () => {
    const agent = await makeUser("AGENT");
    const res = await request(app).post("/tickets/9999/ai/summary").set(bearer(agent.token));
    expect(res.status).toBe(404);
  });
});