import type { PointerPoint } from "./pointerHandler.js";

export interface PinchState {
  centerX: number;
  centerY: number;
  distance: number;
}

export interface GestureCallbacks {
  onPinchZoom?: (centerX: number, centerY: number, scaleFactor: number) => void;
  onTwoFingerPan?: (dx: number, dy: number) => void;
}

/** Derives pinch-zoom and two-finger-pan gestures from the set of currently active pointers. */
export class GestureController {
  private lastPinch: PinchState | null = null;

  constructor(private callbacks: GestureCallbacks) {}

  update(pointers: PointerPoint[]): void {
    if (pointers.length < 2) {
      this.lastPinch = null;
      return;
    }
    const a = pointers[0];
    const b = pointers[1];
    if (!a || !b) return;
    const centerX = (a.x + b.x) / 2;
    const centerY = (a.y + b.y) / 2;
    const distance = Math.hypot(a.x - b.x, a.y - b.y);

    if (this.lastPinch) {
      const scaleFactor = distance / Math.max(1, this.lastPinch.distance);
      if (Number.isFinite(scaleFactor) && scaleFactor > 0) {
        this.callbacks.onPinchZoom?.(centerX, centerY, scaleFactor);
      }
      this.callbacks.onTwoFingerPan?.(centerX - this.lastPinch.centerX, centerY - this.lastPinch.centerY);
    }

    this.lastPinch = { centerX, centerY, distance };
  }

  reset(): void {
    this.lastPinch = null;
  }
}
