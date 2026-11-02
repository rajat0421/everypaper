import { tileIdOf, worldToTile, tilesForBounds, boundsFromPoints } from "@everypaper/shared";
import type { Point, Bounds } from "@everypaper/shared";

/** Room name for a given tile id. Kept as a function in case of future prefixing. */
export function tileRoomName(tileId: string): string {
  return `tile:${tileId}`;
}

export function tileRoomsForPoint(x: number, y: number): string[] {
  return [tileRoomName(tileIdOf(worldToTile(x, y)))];
}

export function tileRoomsForPoints(points: Point[]): string[] {
  const bounds = boundsFromPoints(points);
  return tilesForBounds(bounds).map(tileRoomName);
}

export function tileRoomsForBounds(bounds: Bounds): string[] {
  return tilesForBounds(bounds).map(tileRoomName);
}
