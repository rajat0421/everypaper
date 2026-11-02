import { TILE_SIZE } from "./constants.js";
import type { Bounds } from "./schemas.js";

export interface TileCoord {
  tx: number;
  ty: number;
}

export function tileIdOf({ tx, ty }: TileCoord): string {
  return `${tx}:${ty}`;
}

export function parseTileId(id: string): TileCoord {
  const parts = id.split(":").map(Number);
  const tx = parts[0];
  const ty = parts[1];
  if (tx === undefined || ty === undefined || !Number.isFinite(tx) || !Number.isFinite(ty)) {
    throw new Error(`Invalid tile id: ${id}`);
  }
  return { tx, ty };
}

export function worldToTile(x: number, y: number, tileSize = TILE_SIZE): TileCoord {
  return {
    tx: Math.floor(x / tileSize),
    ty: Math.floor(y / tileSize)
  };
}

export function tileToWorldOrigin({ tx, ty }: TileCoord, tileSize = TILE_SIZE): { x: number; y: number } {
  return { x: tx * tileSize, y: ty * tileSize };
}

/** All tile ids a bounding box overlaps (inclusive). */
export function tilesForBounds(bounds: Bounds, tileSize = TILE_SIZE): string[] {
  const minTile = worldToTile(bounds.minX, bounds.minY, tileSize);
  const maxTile = worldToTile(bounds.maxX, bounds.maxY, tileSize);
  const ids: string[] = [];
  for (let tx = minTile.tx; tx <= maxTile.tx; tx++) {
    for (let ty = minTile.ty; ty <= maxTile.ty; ty++) {
      ids.push(tileIdOf({ tx, ty }));
    }
  }
  return ids;
}

/** Visible tiles for a viewport in world coordinates, with an optional prefetch margin in tiles. */
export function visibleTiles(
  viewportBounds: Bounds,
  tileSize = TILE_SIZE,
  marginTiles = 1
): string[] {
  const minTile = worldToTile(viewportBounds.minX, viewportBounds.minY, tileSize);
  const maxTile = worldToTile(viewportBounds.maxX, viewportBounds.maxY, tileSize);
  const ids: string[] = [];
  for (let tx = minTile.tx - marginTiles; tx <= maxTile.tx + marginTiles; tx++) {
    for (let ty = minTile.ty - marginTiles; ty <= maxTile.ty + marginTiles; ty++) {
      ids.push(tileIdOf({ tx, ty }));
    }
  }
  return ids;
}

export function boundsFromPoints(points: { x: number; y: number }[], padding = 0): Bounds {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding
  };
}

export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}
