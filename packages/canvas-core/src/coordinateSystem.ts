import type { Camera, ScreenSize } from "./types.js";

/**
 * Converts between world coordinates (infinite plane, shared by all visitors)
 * and screen coordinates (pixels within the current viewport), given a camera.
 *
 * zoom is screen-pixels-per-world-unit: screen = (world - camera) * zoom + center
 */
export class CoordinateSystem {
  constructor(private camera: Camera, private screen: ScreenSize) {}

  setCamera(camera: Camera): void {
    this.camera = camera;
  }

  setScreen(screen: ScreenSize): void {
    this.screen = screen;
  }

  getCamera(): Camera {
    return this.camera;
  }

  getScreen(): ScreenSize {
    return this.screen;
  }

  worldToScreen(x: number, y: number): { x: number; y: number } {
    const { zoom } = this.camera;
    return {
      x: (x - this.camera.x) * zoom + this.screen.width / 2,
      y: (y - this.camera.y) * zoom + this.screen.height / 2
    };
  }

  screenToWorld(x: number, y: number): { x: number; y: number } {
    const { zoom } = this.camera;
    return {
      x: (x - this.screen.width / 2) / zoom + this.camera.x,
      y: (y - this.screen.height / 2) / zoom + this.camera.y
    };
  }

  /** World-space bounding box currently visible on screen. */
  visibleWorldBounds(marginPx = 0) {
    const topLeft = this.screenToWorld(-marginPx, -marginPx);
    const bottomRight = this.screenToWorld(
      this.screen.width + marginPx,
      this.screen.height + marginPx
    );
    return {
      minX: Math.min(topLeft.x, bottomRight.x),
      minY: Math.min(topLeft.y, bottomRight.y),
      maxX: Math.max(topLeft.x, bottomRight.x),
      maxY: Math.max(topLeft.y, bottomRight.y)
    };
  }

  /** Zoom towards a specific screen point (e.g. cursor), keeping that world point fixed. */
  zoomAt(screenX: number, screenY: number, newZoom: number, minZoom: number, maxZoom: number): Camera {
    const clamped = Math.min(maxZoom, Math.max(minZoom, newZoom));
    const worldBefore = this.screenToWorld(screenX, screenY);
    const nextCamera: Camera = { ...this.camera, zoom: clamped };
    this.setCamera(nextCamera);
    const worldAfter = this.screenToWorld(screenX, screenY);
    const corrected: Camera = {
      x: this.camera.x + (worldBefore.x - worldAfter.x),
      y: this.camera.y + (worldBefore.y - worldAfter.y),
      zoom: clamped
    };
    this.setCamera(corrected);
    return corrected;
  }
}
