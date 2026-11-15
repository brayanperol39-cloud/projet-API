
import { describe, test, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("Rate limiting", () => {
  beforeAll(() => { process.env.DISABLE_RATE_LIMIT = "0"; });
  afterAll(() => { process.env.DISABLE_RATE_LIMIT = "1"; });

  test("la 11e tentative de login depuis la même IP renvoie 429", async () => {
    let last = 0;
    for (let i = 0; i < 11; i++) {
      const res = await request(app).post("/auth/login").send({ email: `inconnu${i}@test.com`, password: "x" });
      last = res.status;
    }
    expect(last).toBe(429);
  });
});
