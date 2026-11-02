export interface PointerPoint {
  pointerId: number;
  x: number;
  y: number;
  pressure: number;
  pointerType: string;
}

export interface PointerHandlerCallbacks {
  onDown?: (p: PointerPoint, evt: PointerEvent) => void;
  onMove?: (p: PointerPoint, evt: PointerEvent) => void;
  onUp?: (p: PointerPoint, evt: PointerEvent) => void;
  onCancel?: (p: PointerPoint, evt: PointerEvent) => void;
  onWheel?: (evt: WheelEvent) => void;
}

/** Normalizes mouse, pen and touch input into a single pointer stream via the Pointer Events API. */
export class PointerHandler {
  private activePointers = new Map<number, PointerPoint>();

  constructor(private element: HTMLElement, private callbacks: PointerHandlerCallbacks) {
    this.handleDown = this.handleDown.bind(this);
    this.handleMove = this.handleMove.bind(this);
    this.handleUp = this.handleUp.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
  }

  attach(): void {
    this.element.addEventListener("pointerdown", this.handleDown);
    this.element.addEventListener("pointermove", this.handleMove);
    this.element.addEventListener("pointerup", this.handleUp);
    this.element.addEventListener("pointercancel", this.handleCancel);
    this.element.addEventListener("pointerleave", this.handleUp);
    this.element.addEventListener("wheel", this.handleWheel, { passive: false });
  }

  detach(): void {
    this.element.removeEventListener("pointerdown", this.handleDown);
    this.element.removeEventListener("pointermove", this.handleMove);
    this.element.removeEventListener("pointerup", this.handleUp);
    this.element.removeEventListener("pointercancel", this.handleCancel);
    this.element.removeEventListener("pointerleave", this.handleUp);
    this.element.removeEventListener("wheel", this.handleWheel);
  }

  getActivePointers(): PointerPoint[] {
    return [...this.activePointers.values()];
  }

  private toPoint(evt: PointerEvent): PointerPoint {
    const rect = this.element.getBoundingClientRect();
    return {
      pointerId: evt.pointerId,
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top,
      pressure: evt.pressure || 0.5,
      pointerType: evt.pointerType
    };
  }

  private handleDown(evt: PointerEvent): void {
    const p = this.toPoint(evt);
    this.activePointers.set(p.pointerId, p);
    this.element.setPointerCapture?.(evt.pointerId);
    this.callbacks.onDown?.(p, evt);
  }

  private handleMove(evt: PointerEvent): void {
    const p = this.toPoint(evt);
    if (this.activePointers.has(p.pointerId)) {
      this.activePointers.set(p.pointerId, p);
    }
    this.callbacks.onMove?.(p, evt);
  }

  private handleUp(evt: PointerEvent): void {
    const p = this.toPoint(evt);
    this.activePointers.delete(p.pointerId);
    this.callbacks.onUp?.(p, evt);
  }

  private handleCancel(evt: PointerEvent): void {
    const p = this.toPoint(evt);
    this.activePointers.delete(p.pointerId);
    this.callbacks.onCancel?.(p, evt);
  }

  private handleWheel(evt: WheelEvent): void {
    evt.preventDefault();
    this.callbacks.onWheel?.(evt);
  }
}
