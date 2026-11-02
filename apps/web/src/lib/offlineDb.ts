import { openDB, type IDBPDatabase } from "idb";

export type PendingOpKind = "strokeEnd" | "textCreate" | "textDelete";

export interface PendingOp {
  id: string; // clientStrokeId / clientTextId / textId - the key used for dedupe+ack matching
  kind: PendingOpKind;
  payload: unknown;
  createdAt: number;
}

interface CachedTileRow {
  tileId: string;
  data: unknown;
  cachedAt: number;
}

const DB_NAME = "everypaper";
const DB_VERSION = 1;
const PENDING_STORE = "pendingOps";
const TILE_STORE = "tiles";
const TILE_MAX_AGE_MS = 30 * 60 * 1000;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(PENDING_STORE)) {
          db.createObjectStore(PENDING_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(TILE_STORE)) {
          db.createObjectStore(TILE_STORE, { keyPath: "tileId" });
        }
      }
    });
  }
  return dbPromise;
}

/**
 * Local persistence for two things: (1) a small queue of operations that
 * were sent but not yet acknowledged by the server, so a flaky connection
 * doesn't silently drop a completed contribution, and (2) a short-lived
 * cache of recently loaded tiles for instant re-render within the session.
 * Every method is best-effort: IndexedDB can throw (private browsing,
 * quota, disabled storage) and none of this should ever crash drawing.
 */
export const offlineDb = {
  async addPendingOp(op: PendingOp): Promise<void> {
    try {
      const db = await getDb();
      await db.put(PENDING_STORE, op);
    } catch {
      // best-effort only
    }
  },

  async removePendingOp(id: string): Promise<void> {
    try {
      const db = await getDb();
      await db.delete(PENDING_STORE, id);
    } catch {
      // best-effort only
    }
  },

  async getAllPendingOps(): Promise<PendingOp[]> {
    try {
      const db = await getDb();
      return await db.getAll(PENDING_STORE);
    } catch {
      return [];
    }
  },

  async cacheTile(tileId: string, data: unknown): Promise<void> {
    try {
      const db = await getDb();
      const row: CachedTileRow = { tileId, data, cachedAt: Date.now() };
      await db.put(TILE_STORE, row);
    } catch {
      // best-effort only
    }
  },

  async getCachedTile<T>(tileId: string): Promise<T | undefined> {
    try {
      const db = await getDb();
      const row = (await db.get(TILE_STORE, tileId)) as CachedTileRow | undefined;
      if (!row) return undefined;
      if (Date.now() - row.cachedAt > TILE_MAX_AGE_MS) return undefined;
      return row.data as T;
    } catch {
      return undefined;
    }
  },

  async pruneOldTiles(): Promise<void> {
    try {
      const db = await getDb();
      const all = (await db.getAll(TILE_STORE)) as CachedTileRow[];
      const now = Date.now();
      await Promise.all(
        all
          .filter((row) => now - row.cachedAt > TILE_MAX_AGE_MS)
          .map((row) => db.delete(TILE_STORE, row.tileId))
      );
    } catch {
      // best-effort only
    }
  }
};
