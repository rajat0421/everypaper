import { boundsFromPoints, tilesForBounds } from "@everypaper/shared";
import type { Point } from "@everypaper/shared";
import type { Stroke } from "./types.js";

export type Tool = "pencil" | "eraser" | "text" | "pan";

export interface DrawingStyle {
  color: string;
  brushSize: number;
  fontSize: number;
}

export interface ActiveStroke {
  clientStrokeId: string;
  points: Point[];
  isEraser: boolean;
}

type HistoryEntry =
  | { type: "stroke"; id: string }
  | { type: "text"; id: string };

export interface DrawingControllerCallbacks {
  onStrokeStart?: (stroke: ActiveStroke, style: DrawingStyle) => void;
  onStrokePoints?: (clientStrokeId: string, points: Point[]) => void;
  onStrokeEnd?: (stroke: Stroke) => void;
  onUndoStroke?: (strokeId: string) => void;
  onRedoStroke?: (strokeId: string) => void;
}

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Owns the current tool/style, builds up the active stroke's points, and tracks an undo/redo history of this session's own contributions. */
export class DrawingController {
  private tool: Tool = "pencil";
  private style: DrawingStyle = { color: "#111111", brushSize: 4, fontSize: 24 };
  private active: ActiveStroke | null = null;
  private pointBatch: Point[] = [];
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];

  constructor(private sessionId: string, private callbacks: DrawingControllerCallbacks = {}) {}

  setTool(tool: Tool): void {
    this.tool = tool;
  }

  getTool(): Tool {
    return this.tool;
  }

  setStyle(partial: Partial<DrawingStyle>): void {
    this.style = { ...this.style, ...partial };
  }

  getStyle(): DrawingStyle {
    return this.style;
  }

  isDrawingTool(): boolean {
    return this.tool === "pencil" || this.tool === "eraser";
  }

  beginStroke(point: Point): string | null {
    if (!this.isDrawingTool()) return null;
    const clientStrokeId = genId();
    this.active = { clientStrokeId, points: [point], isEraser: this.tool === "eraser" };
    this.pointBatch = [];
    this.callbacks.onStrokeStart?.(this.active, this.style);
    return clientStrokeId;
  }

  addPoint(point: Point, batchSize = 24): void {
    if (!this.active) return;
    this.active.points.push(point);
    this.pointBatch.push(point);
    if (this.pointBatch.length >= batchSize) {
      this.flushPoints();
    }
  }

  flushPoints(): void {
    if (!this.active || this.pointBatch.length === 0) return;
    this.callbacks.onStrokePoints?.(this.active.clientStrokeId, [...this.pointBatch]);
    this.pointBatch = [];
  }

  endStroke(): Stroke | null {
    if (!this.active) return null;
    this.flushPoints();
    const bounds = boundsFromPoints(this.active.points, this.style.brushSize);
    const stroke: Stroke = {
      id: this.active.clientStrokeId,
      sessionId: this.sessionId,
      points: this.active.points,
      color: this.style.color,
      brushSize: this.style.brushSize,
      isEraser: this.active.isEraser,
      bounds,
      tileIds: tilesForBounds(bounds),
      createdAt: Date.now(),
      pending: true
    };
    this.undoStack.push({ type: "stroke", id: stroke.id });
    this.redoStack = [];
    this.active = null;
    this.callbacks.onStrokeEnd?.(stroke);
    return stroke;
  }

  cancelStroke(): void {
    this.active = null;
    this.pointBatch = [];
  }

  getActiveStroke(): ActiveStroke | null {
    return this.active;
  }

  recordText(textId: string): void {
    this.undoStack.push({ type: "text", id: textId });
    this.redoStack = [];
  }

  undo(): void {
    const entry = this.undoStack.pop();
    if (!entry) return;
    this.redoStack.push(entry);
    if (entry.type === "stroke") {
      this.callbacks.onUndoStroke?.(entry.id);
    }
    // text undo is handled the same way by the app layer via onUndoStroke-equivalent events if needed
  }

  redo(): void {
    const entry = this.redoStack.pop();
    if (!entry) return;
    this.undoStack.push(entry);
    if (entry.type === "stroke") {
      this.callbacks.onRedoStroke?.(entry.id);
    }
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
