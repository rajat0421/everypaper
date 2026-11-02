import type { TileData } from "./types.js";

export interface TileCacheOptions {
  maxTiles?: number;
}

/** LRU cache for loaded tile data, keyed by tile id. */
export class TileCache {
  private store = new Map<string, TileData>();
  private maxTiles: number;

  constructor(options: TileCacheOptions = {}) {
    this.maxTiles = options.maxTiles ?? 512;
  }

  get(tileId: string): TileData | undefined {
    const data = this.store.get(tileId);
    if (data) {
      // refresh recency
      this.store.delete(tileId);
      this.store.set(tileId, data);
    }
    return data;
  }

  has(tileId: string): boolean {
    return this.store.has(tileId);
  }

  set(tileId: string, data: TileData): void {
    this.store.delete(tileId);
    this.store.set(tileId, data);
    this.evictIfNeeded();
  }

  delete(tileId: string): void {
    this.store.delete(tileId);
  }

  keys(): string[] {
    return [...this.store.keys()];
  }

  size(): number {
    return this.store.size;
  }

  private evictIfNeeded(): void {
    while (this.store.size > this.maxTiles) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey === undefined) break;
      this.store.delete(oldestKey);
    }
  }
}
