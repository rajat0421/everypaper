import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server as HttpServer } from "node:http";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import type { Server as IoServer } from "socket.io";
import { SOCKET_EVENTS } from "@everypaper/shared";
import { createApp } from "../app.js";
import { createSocketServer } from "./index.js";

let httpServer: HttpServer;
let io: IoServer;
let baseUrl: string;

async function createSession(): Promise<string> {
  const res = await fetch(`${baseUrl}/api/v1/sessions`, { method: "POST" });
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error("No Set-Cookie header from /sessions");
  // Strip cookie attributes, keep only name=value for the request header.
  return setCookie.split(";")[0] ?? setCookie;
}

function connectClient(cookie: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(baseUrl, {
      extraHeaders: { Cookie: cookie },
      transports: ["websocket"],
      forceNew: true
    });
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", (err) => reject(err));
  });
}

beforeAll(async () => {
  const app = createApp();
  httpServer = createServer(app);
  io = createSocketServer(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const address = httpServer.address();
  if (!address || typeof address === "string") throw new Error("Failed to bind test server");
  baseUrl = `http://127.0.0.1:${address.port}`;
}, 30_000);

afterAll(async () => {
  io.close();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

describe("socket auth", () => {
  it("rejects a connection without a valid session cookie", async () => {
    await expect(
      new Promise((resolve, reject) => {
        const socket = ioClient(baseUrl, { transports: ["websocket"], forceNew: true });
        socket.once("connect", () => reject(new Error("should not have connected")));
        socket.once("connect_error", (err) => resolve(err));
      })
    ).resolves.toBeDefined();
  });

  it("accepts a connection with a valid session cookie", async () => {
    const cookie = await createSession();
    const socket = await connectClient(cookie);
    expect(socket.connected).toBe(true);
    socket.close();
  });
});

describe("canvas subscribe + sync", () => {
  it("replies with canvas:sync after canvas:subscribe", async () => {
    const cookie = await createSession();
    const socket = await connectClient(cookie);

    const syncPromise = new Promise((resolve) => {
      socket.once(SOCKET_EVENTS.CANVAS_SYNC, resolve);
    });

    socket.emit(SOCKET_EVENTS.CANVAS_SUBSCRIBE, { tileIds: ["0:0"] });
    const payload = await syncPromise;
    expect(payload).toHaveProperty("tiles");

    socket.close();
  });
});

describe("stroke broadcast between two clients", () => {
  it("lets a second subscribed client see a stroke the first client draws", async () => {
    const cookieA = await createSession();
    const cookieB = await createSession();
    const socketA = await connectClient(cookieA);
    const socketB = await connectClient(cookieB);

    await Promise.all([
      new Promise((resolve) => {
        socketA.emit(SOCKET_EVENTS.CANVAS_SUBSCRIBE, { tileIds: ["0:0"] });
        socketA.once(SOCKET_EVENTS.CANVAS_SYNC, resolve);
      }),
      new Promise((resolve) => {
        socketB.emit(SOCKET_EVENTS.CANVAS_SUBSCRIBE, { tileIds: ["0:0"] });
        socketB.once(SOCKET_EVENTS.CANVAS_SYNC, resolve);
      })
    ]);

    const completedPromise = new Promise((resolve) => {
      socketB.once(SOCKET_EVENTS.STROKE_COMPLETED, resolve);
    });

    const clientStrokeId = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
    socketA.emit(SOCKET_EVENTS.STROKE_START, {
      clientStrokeId,
      color: "#ff00ff",
      brushSize: 5,
      isEraser: false,
      startPoint: { x: 2, y: 2 }
    });
    socketA.emit(SOCKET_EVENTS.STROKE_POINTS, {
      clientStrokeId,
      seq: 0,
      points: [{ x: 3, y: 3 }]
    });
    socketA.emit(SOCKET_EVENTS.STROKE_END, { clientStrokeId });

    const completed = (await completedPromise) as { clientStrokeId?: string };
    expect(completed).toBeDefined();

    socketA.close();
    socketB.close();
  }, 10_000);

  it("rejects stroke:delete from a session that does not own the stroke", async () => {
    const ownerCookie = await createSession();
    const otherCookie = await createSession();
    const ownerSocket = await connectClient(ownerCookie);
    const otherSocket = await connectClient(otherCookie);

    const clientStrokeId = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    const completedPromise = new Promise((resolve) => {
      ownerSocket.once(SOCKET_EVENTS.STROKE_COMPLETED, resolve);
    });
    ownerSocket.emit(SOCKET_EVENTS.CANVAS_SUBSCRIBE, { tileIds: ["0:0"] });
    await new Promise((resolve) => ownerSocket.once(SOCKET_EVENTS.CANVAS_SYNC, resolve));

    ownerSocket.emit(SOCKET_EVENTS.STROKE_START, {
      clientStrokeId,
      color: "#000000",
      brushSize: 2,
      isEraser: false,
      startPoint: { x: 1, y: 1 }
    });
    ownerSocket.emit(SOCKET_EVENTS.STROKE_END, { clientStrokeId });
    const completed = (await completedPromise) as { id: string };

    const errorPromise = new Promise((resolve) => {
      otherSocket.once(SOCKET_EVENTS.ERROR, resolve);
    });
    otherSocket.emit(SOCKET_EVENTS.STROKE_DELETE, { strokeId: completed.id });
    const error = (await errorPromise) as { code: string };
    expect(error.code).toBe("FORBIDDEN");

    ownerSocket.close();
    otherSocket.close();
  }, 10_000);
});
