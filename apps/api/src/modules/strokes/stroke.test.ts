import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { createSessionCookie } from "../../test/helpers.js";

describe("strokes", () => {
  it("creates a stroke, computes bounds/tileIds, and it is fetchable via /canvas/tiles", async () => {
    const app = createApp();
    const cookie = await createSessionCookie(app);

    const createRes = await request(app)
      .post("/api/v1/strokes")
      .set("Cookie", cookie)
      .send({
        color: "#ff0000",
        brushSize: 4,
        isEraser: false,
        points: [
          { x: 10, y: 10 },
          { x: 50, y: 60 }
        ],
        clientStrokeId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
      })
      .expect(201);

    expect(createRes.body.bounds).toEqual({ minX: 10, minY: 10, maxX: 50, maxY: 60 });
    expect(createRes.body.tileIds).toEqual(["0:0"]);

    const tilesRes = await request(app).get("/api/v1/canvas/tiles?ids=0:0").expect(200);
    expect(tilesRes.body.tiles[0].strokes).toHaveLength(1);
    expect(tilesRes.body.tiles[0].strokes[0].id).toBe(createRes.body.id);
  });

  it("is idempotent on clientStrokeId (retried stroke:end style submits don't duplicate)", async () => {
    const app = createApp();
    const cookie = await createSessionCookie(app);
    const payload = {
      color: "#00ff00",
      brushSize: 2,
      isEraser: false,
      points: [{ x: 1, y: 1 }],
      clientStrokeId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
    };

    const first = await request(app).post("/api/v1/strokes").set("Cookie", cookie).send(payload).expect(201);
    const second = await request(app).post("/api/v1/strokes").set("Cookie", cookie).send(payload).expect(201);

    expect(second.body.id).toBe(first.body.id);
  });

  it("rejects invalid stroke payloads with 400", async () => {
    const app = createApp();
    const cookie = await createSessionCookie(app);

    await request(app)
      .post("/api/v1/strokes")
      .set("Cookie", cookie)
      .send({ color: "not-a-color", brushSize: 4, points: [{ x: 1, y: 1 }] })
      .expect(400);
  });

  it("rejects deletion by a session that does not own the stroke", async () => {
    const app = createApp();
    const ownerCookie = await createSessionCookie(app);
    const otherCookie = await createSessionCookie(app);

    const createRes = await request(app)
      .post("/api/v1/strokes")
      .set("Cookie", ownerCookie)
      .send({
        color: "#0000ff",
        brushSize: 3,
        points: [{ x: 5, y: 5 }],
        clientStrokeId: "cccccccc-cccc-cccc-cccc-cccccccccccc"
      })
      .expect(201);

    await request(app)
      .delete(`/api/v1/strokes/${createRes.body.id}`)
      .set("Cookie", otherCookie)
      .expect(403);

    await request(app)
      .delete(`/api/v1/strokes/${createRes.body.id}`)
      .set("Cookie", ownerCookie)
      .expect(200);
  });
});
