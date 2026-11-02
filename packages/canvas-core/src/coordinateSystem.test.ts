import { describe, expect, it } from "vitest";
import { CoordinateSystem } from "./coordinateSystem.js";

describe("CoordinateSystem", () => {
  it("round-trips world <-> screen at zoom 1", () => {
    const coords = new CoordinateSystem({ x: 0, y: 0, zoom: 1 }, { width: 800, height: 600, dpr: 1 });
    const screen = coords.worldToScreen(100, -50);
    expect(screen).toEqual({ x: 500, y: 250 });
    const world = coords.screenToWorld(screen.x, screen.y);
    expect(world.x).toBeCloseTo(100);
    expect(world.y).toBeCloseTo(-50);
  });

  it("zoomAt keeps the target screen point fixed in world space", () => {
    const coords = new CoordinateSystem({ x: 0, y: 0, zoom: 1 }, { width: 800, height: 600, dpr: 1 });
    const before = coords.screenToWorld(200, 150);
    coords.zoomAt(200, 150, 2, 0.1, 8);
    const after = coords.screenToWorld(200, 150);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    expect(coords.getCamera().zoom).toBe(2);
  });

  it("computes visible world bounds", () => {
    const coords = new CoordinateSystem({ x: 0, y: 0, zoom: 1 }, { width: 100, height: 100, dpr: 1 });
    const bounds = coords.visibleWorldBounds();
    expect(bounds).toEqual({ minX: -50, minY: -50, maxX: 50, maxY: 50 });
  });
});
