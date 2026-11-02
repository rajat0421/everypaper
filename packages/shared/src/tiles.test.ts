import { describe, expect, it } from "vitest";
import { boundsFromPoints, parseTileId, tileIdOf, tilesForBounds, worldToTile } from "./tiles.js";

describe("worldToTile", () => {
  it("maps origin to tile 0,0", () => {
    expect(worldToTile(0, 0)).toEqual({ tx: 0, ty: 0 });
  });

  it("handles negative coordinates", () => {
    expect(worldToTile(-1, -1)).toEqual({ tx: -1, ty: -1 });
    expect(worldToTile(-1024, -1024)).toEqual({ tx: -1, ty: -1 });
    expect(worldToTile(-1025, -1025)).toEqual({ tx: -2, ty: -2 });
  });
});

describe("tileIdOf / parseTileId", () => {
  it("round-trips", () => {
    const id = tileIdOf({ tx: -3, ty: 5 });
    expect(id).toBe("-3:5");
    expect(parseTileId(id)).toEqual({ tx: -3, ty: 5 });
  });
});

describe("tilesForBounds", () => {
  it("covers a bounding box spanning multiple tiles", () => {
    const ids = tilesForBounds({ minX: -10, minY: -10, maxX: 1030, maxY: 1030 });
    expect(ids).toContain("-1:-1");
    expect(ids).toContain("0:0");
    expect(ids).toContain("1:1");
    expect(ids.length).toBe(9);
  });
});

describe("boundsFromPoints", () => {
  it("computes bounding box with padding", () => {
    const bounds = boundsFromPoints(
      [
        { x: 0, y: 0 },
        { x: 10, y: -5 }
      ],
      2
    );
    expect(bounds).toEqual({ minX: -2, minY: -7, maxX: 12, maxY: 2 });
  });

  it("returns zero bounds for empty input", () => {
    expect(boundsFromPoints([])).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
  });
});
