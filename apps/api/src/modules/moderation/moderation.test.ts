import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { createSessionCookie } from "../../test/helpers.js";

describe("moderation", () => {
  it("accepts a report from an authenticated session", async () => {
    const app = createApp();
    const cookie = await createSessionCookie(app);

    const res = await request(app)
      .post("/api/v1/reports")
      .set("Cookie", cookie)
      .send({ targetType: "stroke", targetId: "000000000000000000000000", reason: "spam" })
      .expect(201);

    expect(res.body.status).toBe("open");
  });

  it("rejects moderator removal without the moderator key", async () => {
    const app = createApp();
    await request(app).post("/api/v1/moderation/strokes/000000000000000000000000/remove").expect(401);
  });

  it("allows a moderator to remove a stroke regardless of ownership", async () => {
    const app = createApp();
    const ownerCookie = await createSessionCookie(app);

    const createRes = await request(app)
      .post("/api/v1/strokes")
      .set("Cookie", ownerCookie)
      .send({ color: "#abcdef", brushSize: 2, points: [{ x: 1, y: 1 }] })
      .expect(201);

    await request(app)
      .post(`/api/v1/moderation/strokes/${createRes.body.id}/remove`)
      .set("x-moderator-key", "test-moderator-key")
      .send({ reason: "inappropriate" })
      .expect(200);

    const tilesRes = await request(app).get("/api/v1/canvas/tiles/0/0").expect(200);
    expect(tilesRes.body.strokes).toHaveLength(0);
  });
});
