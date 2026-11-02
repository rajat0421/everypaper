import request from "supertest";
import type { Express } from "express";

/** Creates a session via POST /api/v1/sessions and returns the Set-Cookie header value. */
export async function createSessionCookie(app: Express): Promise<string> {
  const res = await request(app).post("/api/v1/sessions").expect(201);
  const setCookie = res.headers["set-cookie"];
  if (!setCookie || setCookie.length === 0) {
    throw new Error("Expected Set-Cookie header from POST /sessions");
  }
  // supertest/superagent returns an array of cookie strings; take the first.
  const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!cookieHeader) {
    throw new Error("Empty Set-Cookie header");
  }
  return cookieHeader;
}
