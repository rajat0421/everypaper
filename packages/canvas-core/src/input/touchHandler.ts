import type { PointerPoint } from "./pointerHandler.js";

export interface SwipeMomentum {
  vx: number; // px/ms
  vy: number;
}

/**
 * Tracks single-finger touch movement to produce swipe momentum for inertial
 * panning on mobile once the finger lifts.
 */
export class TouchHandler {
  private history: { x: number; y: number; t: number }[] = [];
  private readonly maxHistoryMs = 100;

  record(point: PointerPoint): void {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    this.history.push({ x: point.x, y: point.y, t: now });
    const cutoff = now - this.maxHistoryMs;
    while (this.history.length > 0 && (this.history[0]?.t ?? Infinity) < cutoff) {
      this.history.shift();
    }
  }

  reset(): void {
    this.history = [];
  }

  computeMomentum(): SwipeMomentum {
    if (this.history.length < 2) return { vx: 0, vy: 0 };
    const first = this.history[0]!;
    const last = this.history[this.history.length - 1]!;
    const dt = Math.max(1, last.t - first.t);
    return {
      vx: (last.x - first.x) / dt,
      vy: (last.y - first.y) / dt
    };
  }
}
