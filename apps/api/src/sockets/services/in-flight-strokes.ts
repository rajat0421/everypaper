import type { Point } from "@everypaper/shared";

export interface InFlightStroke {
  clientStrokeId: string;
  sessionId: string;
  socketId: string;
  color: string;
  brushSize: number;
  isEraser: boolean;
  points: Point[];
  rooms: Set<string>;
  lastSeq: number;
}

/**
 * Tracks strokes that have been started but not yet finalized (stroke:end),
 * so subsequent stroke:points / stroke:end events can be authorized against
 * the session that started them, and so points can be re-broadcast to the
 * same set of tile rooms the stroke was announced to.
 */
export class InFlightStrokeTracker {
  private readonly strokes = new Map<string, InFlightStroke>();

  start(stroke: InFlightStroke): void {
    this.strokes.set(stroke.clientStrokeId, stroke);
  }

  get(clientStrokeId: string): InFlightStroke | undefined {
    return this.strokes.get(clientStrokeId);
  }

  end(clientStrokeId: string): void {
    this.strokes.delete(clientStrokeId);
  }

  /** Clears all in-flight strokes owned by a given socket (on disconnect). */
  clearForSocket(socketId: string): void {
    for (const [id, stroke] of this.strokes) {
      if (stroke.socketId === socketId) {
        this.strokes.delete(id);
      }
    }
  }
}
