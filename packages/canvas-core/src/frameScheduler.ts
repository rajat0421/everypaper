export type FrameCallback = (timestamp: number) => void;

/** Thin wrapper around requestAnimationFrame that coalesces repeated schedule() calls into one frame. */
export class FrameScheduler {
  private rafId: number | null = null;
  private dirty = false;

  constructor(
    private callback: FrameCallback,
    // Bound explicitly: requestAnimationFrame is a native Window method, and
    // calling it as `this.raf(...)` (i.e. as a method of this class) rather
    // than as `window.requestAnimationFrame(...)` trips the browser's
    // receiver/brand check and throws "Illegal invocation" otherwise.
    private raf: typeof requestAnimationFrame =
      typeof window !== "undefined" ? window.requestAnimationFrame.bind(window) : requestAnimationFrame
  ) {}

  schedule(): void {
    this.dirty = true;
    if (this.rafId !== null) return;
    this.rafId = this.raf((timestamp) => {
      this.rafId = null;
      if (this.dirty) {
        this.dirty = false;
        this.callback(timestamp);
      }
    });
  }

  cancel(cancelFn: typeof cancelAnimationFrame = cancelAnimationFrame): void {
    if (this.rafId !== null) {
      cancelFn(this.rafId);
      this.rafId = null;
    }
    this.dirty = false;
  }
}
