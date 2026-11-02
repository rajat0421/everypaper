import type { Bounds } from "@everypaper/shared";
import { CoordinateSystem } from "./coordinateSystem.js";
import type { Camera, ScreenSize } from "./types.js";

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 8;

export type ViewportListener = (camera: Camera) => void;

export class Viewport {
  private camera: Camera;
  private screen: ScreenSize;
  private coords: CoordinateSystem;
  private listeners = new Set<ViewportListener>();

  constructor(initial: Camera = { x: 0, y: 0, zoom: 1 }, screen: ScreenSize = { width: 0, height: 0, dpr: 1 }) {
    this.camera = initial;
    this.screen = screen;
    this.coords = new CoordinateSystem(this.camera, this.screen);
  }

  getCamera(): Camera {
    return this.camera;
  }

  getCoordinateSystem(): CoordinateSystem {
    return this.coords;
  }

  setScreen(screen: ScreenSize): void {
    this.screen = screen;
    this.coords.setScreen(screen);
  }

  pan(dxScreen: number, dyScreen: number): void {
    const dxWorld = dxScreen / this.camera.zoom;
    const dyWorld = dyScreen / this.camera.zoom;
    this.setCamera({ ...this.camera, x: this.camera.x - dxWorld, y: this.camera.y - dyWorld });
  }

  panToWorld(x: number, y: number): void {
    this.setCamera({ ...this.camera, x, y });
  }

  zoomAtScreenPoint(screenX: number, screenY: number, factor: number): void {
    const newZoom = this.camera.zoom * factor;
    const next = this.coords.zoomAt(screenX, screenY, newZoom, MIN_ZOOM, MAX_ZOOM);
    this.setCamera(next);
  }

  setZoom(zoom: number): void {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    this.setCamera({ ...this.camera, zoom: clamped });
  }

  reset(): void {
    this.setCamera({ x: 0, y: 0, zoom: 1 });
  }

  visibleWorldBounds(marginPx = 0): Bounds {
    return this.coords.visibleWorldBounds(marginPx);
  }

  private setCamera(camera: Camera): void {
    this.camera = camera;
    this.coords.setCamera(camera);
    for (const listener of this.listeners) listener(camera);
  }

  subscribe(listener: ViewportListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
