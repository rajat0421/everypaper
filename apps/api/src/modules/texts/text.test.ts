import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { createSessionCookie } from "../../test/helpers.js";

describe("texts", () => {
  it("creates a text, sanitizes control characters, and it is fetchable via /canvas/tiles", async () => {
    const app = createApp();
    const cookie = await createSessionCookie(app);

    const createRes = await request(app)
      .post("/api/v1/texts")
      .set("Cookie", cookie)
      .send({
        x: 100,
        y: 200,
        content: "hello\u0007world",
        color: "#123456",
        fontSize: 20,
        clientTextId: "dddddddd-dddd-dddd-dddd-dddddddddddd"
      })
      .expect(201);

    expect(createRes.body.content).toBe("helloworld");

    const tilesRes = await request(app).get("/api/v1/canvas/tiles/0/0").expect(200);
    expect(tilesRes.body.texts).toHaveLength(1);
    expect(tilesRes.body.texts[0].id).toBe(createRes.body.id);
  });

  it("rejects text over the max length with 400", async () => {
    const app = createApp();
    const cookie = await createSessionCookie(app);

    await request(app)
      .post("/api/v1/texts")
      .set("Cookie", cookie)
      .send({ x: 0, y: 0, content: "a".repeat(1000), color: "#000000", fontSize: 20 })
      .expect(400);
  });

  it("rejects deletion by a session that does not own the text, allows the owner", async () => {
    const app = createApp();
    const ownerCookie = await createSessionCookie(app);
    const otherCookie = await createSessionCookie(app);

    const createRes = await request(app)
      .post("/api/v1/texts")
      .set("Cookie", ownerCookie)
      .send({ x: 1, y: 1, content: "mine", color: "#ffffff", fontSize: 12 })
      .expect(201);

    await request(app).delete(`/api/v1/texts/${createRes.body.id}`).set("Cookie", otherCookie).expect(403);
    await request(app).delete(`/api/v1/texts/${createRes.body.id}`).set("Cookie", ownerCookie).expect(200);
  });
});
