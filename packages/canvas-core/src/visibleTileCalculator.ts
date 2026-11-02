import { TILE_SIZE, visibleTiles } from "@everypaper/shared";
import type { Bounds } from "@everypaper/shared";

export class VisibleTileCalculator {
  constructor(private tileSize = TILE_SIZE) {}

  /** Tiles currently on screen, no margin. */
  visible(bounds: Bounds): string[] {
    return visibleTiles(bounds, this.tileSize, 0);
  }

  /** Tiles to prefetch: visible tiles plus a ring of neighbors. */
  withPrefetch(bounds: Bounds, marginTiles = 1): string[] {
    return visibleTiles(bounds, this.tileSize, marginTiles);
  }
}
