import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

describe("health", () => {
  it("GET /health returns 200", async () => {
    const app = createApp();
    const res = await request(app).get("/health").expect(200);
    expect(res.body.status).toBe("ok");
  });

  it("GET /health/ready returns 200 when mongo is connected", async () => {
    const app = createApp();
    const res = await request(app).get("/health/ready").expect(200);
    expect(res.body.mongo).toBe("connected");
  });
});
