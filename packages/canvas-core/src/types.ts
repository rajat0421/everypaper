import type { Bounds, Point } from "@everypaper/shared";

export interface Stroke {
  id: string;
  sessionId: string;
  points: Point[];
  color: string;
  brushSize: number;
  isEraser: boolean;
  bounds: Bounds;
  tileIds: string[];
  createdAt: number;
  pending?: boolean;
}

export interface TextItem {
  id: string;
  sessionId: string;
  x: number;
  y: number;
  content: string;
  color: string;
  fontSize: number;
  createdAt: number;
  pending?: boolean;
}

export interface Camera {
  x: number; // world x at center of viewport
  y: number; // world y at center of viewport
  zoom: number; // world units per screen pixel = 1 / zoom
}

export interface ScreenSize {
  width: number;
  height: number;
  dpr: number;
}

export interface TileData {
  tileId: string;
  strokes: Stroke[];
  texts: TextItem[];
  loadedAt: number;
}

export type TileFetcher = (tileId: string) => Promise<TileData>;
