import type { Bounds } from "@everypaper/shared";
import { TileCache } from "./tileCache.js";
import { VisibleTileCalculator } from "./visibleTileCalculator.js";
import type { Stroke, TextItem, TileData, TileFetcher } from "./types.js";

export type TileManagerListener = (tileId: string, data: TileData) => void;

/**
 * Owns tile loading/caching/eviction and tells the engine which tiles are
 * currently visible, prefetching a ring of neighbors so panning feels seamless.
 */
export class TileManager {
  private cache = new TileCache();
  private calculator = new VisibleTileCalculator();
  private inflight = new Map<string, Promise<TileData>>();
  private listeners = new Set<TileManagerListener>();
  private localStrokes = new Map<string, Stroke>(); // optimistic/local strokes not yet tile-indexed
  private localTexts = new Map<string, TextItem>();

  constructor(private fetchTile: TileFetcher) {}

  onTileLoaded(listener: TileManagerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getTile(tileId: string): TileData | undefined {
    return this.cache.get(tileId);
  }

  async ensureVisible(bounds: Bounds, prefetchMargin = 1): Promise<void> {
    const ids = this.calculator.withPrefetch(bounds, prefetchMargin);
    await Promise.all(ids.map((id) => this.load(id)));
    this.evictFarTiles(ids);
  }

  private async load(tileId: string): Promise<TileData> {
    const cached = this.cache.get(tileId);
    if (cached) return cached;
    const existing = this.inflight.get(tileId);
    if (existing) return existing;

    const promise = this.fetchTile(tileId)
      .then((data) => {
        this.cache.set(tileId, data);
        this.inflight.delete(tileId);
        for (const listener of this.listeners) listener(tileId, data);
        return data;
      })
      .catch((err) => {
        this.inflight.delete(tileId);
        throw err;
      });

    this.inflight.set(tileId, promise);
    return promise;
  }

  private evictFarTiles(keepIds: string[]): void {
    const keep = new Set(keepIds);
    for (const id of this.cache.keys()) {
      if (!keep.has(id)) this.cache.delete(id);
    }
  }

  addLocalStroke(stroke: Stroke): void {
    this.localStrokes.set(stroke.id, stroke);
  }

  removeLocalStroke(id: string): void {
    this.localStrokes.delete(id);
  }

  addLocalText(text: TextItem): void {
    this.localTexts.set(text.id, text);
  }

  removeLocalText(id: string): void {
    this.localTexts.delete(id);
  }

  /** All strokes known for a tile: persisted + any local optimistic strokes overlapping it. */
  getStrokesForTile(tileId: string): Stroke[] {
    const persisted = this.cache.get(tileId)?.strokes ?? [];
    const local = [...this.localStrokes.values()].filter((s) => s.tileIds.includes(tileId));
    const seen = new Set(persisted.map((s) => s.id));
    return [...persisted, ...local.filter((s) => !seen.has(s.id))];
  }

  getTextsForTile(tileId: string): TextItem[] {
    return this.cache.get(tileId)?.texts ?? [];
  }

  getLocalStrokes(): Stroke[] {
    return [...this.localStrokes.values()];
  }

  getLocalTexts(): TextItem[] {
    return [...this.localTexts.values()];
  }

  applyStrokeDeleted(strokeId: string): void {
    this.removeLocalStroke(strokeId);
    for (const [tileId, data] of this.cacheEntries()) {
      const next = data.strokes.filter((s) => s.id !== strokeId);
      if (next.length !== data.strokes.length) {
        this.cache.set(tileId, { ...data, strokes: next });
      }
    }
  }

  applyTextDeleted(textId: string): void {
    this.removeLocalText(textId);
    for (const [tileId, data] of this.cacheEntries()) {
      const next = data.texts.filter((t) => t.id !== textId);
      if (next.length !== data.texts.length) {
        this.cache.set(tileId, { ...data, texts: next });
      }
    }
  }

  applyStrokeUpserted(stroke: Stroke): void {
    this.removeLocalStroke(stroke.id);
    for (const tileId of stroke.tileIds) {
      const data = this.cache.get(tileId);
      if (!data) continue;
      const withoutDup = data.strokes.filter((s) => s.id !== stroke.id);
      this.cache.set(tileId, { ...data, strokes: [...withoutDup, stroke] });
    }
  }

  applyTextUpserted(text: TextItem, tileId: string): void {
    this.removeLocalText(text.id);
    const data = this.cache.get(tileId);
    if (!data) return;
    const withoutDup = data.texts.filter((t) => t.id !== text.id);
    this.cache.set(tileId, { ...data, texts: [...withoutDup, text] });
  }

  private *cacheEntries(): IterableIterator<[string, TileData]> {
    for (const id of this.cache.keys()) {
      const data = this.cache.get(id);
      if (data) yield [id, data];
    }
  }
}
