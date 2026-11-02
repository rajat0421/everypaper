import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

describe("sessions", () => {
  it("creates a new session and sets a cookie on POST /sessions", async () => {
    const app = createApp();
    const res = await request(app).post("/api/v1/sessions").expect(201);

    expect(res.body.sessionId).toEqual(expect.any(String));
    expect(res.body.createdAt).toEqual(expect.any(String));
    expect(res.headers["set-cookie"]).toBeDefined();
    const cookieHeader = Array.isArray(res.headers["set-cookie"])
      ? res.headers["set-cookie"][0]
      : res.headers["set-cookie"];
    expect(cookieHeader).toContain("HttpOnly");
    expect(cookieHeader).toContain("SameSite=Lax");
  });

  it("returns the same session on repeated requests with the cookie", async () => {
    const app = createApp();
    const first = await request(app).post("/api/v1/sessions").expect(201);
    const cookie = first.headers["set-cookie"]?.[0];
    if (!cookie) throw new Error("Expected Set-Cookie header");

    const second = await request(app).get("/api/v1/sessions/me").set("Cookie", cookie).expect(200);

    expect(second.body.sessionId).toBe(first.body.sessionId);
  });

  it("creates a new session via GET /sessions/me when no cookie is present", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/sessions/me").expect(201);
    expect(res.body.sessionId).toEqual(expect.any(String));
    expect(res.headers["set-cookie"]).toBeDefined();
  });
});
