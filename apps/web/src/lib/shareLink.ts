import type { Camera } from "@everypaper/canvas-core";

/**
 * Parses ?x=&y=&zoom= from a location.search-style string into a partial
 * camera. Returns null if none of the params are present/valid.
 */
export function parseShareParams(search: string): Partial<Camera> | null {
  const params = new URLSearchParams(search);
  const xStr = params.get("x");
  const yStr = params.get("y");
  const zoomStr = params.get("zoom");
  if (xStr === null && yStr === null && zoomStr === null) return null;

  const result: Partial<Camera> = {};

  if (xStr !== null) {
    const x = Number(xStr);
    if (Number.isFinite(x)) result.x = x;
  }
  if (yStr !== null) {
    const y = Number(yStr);
    if (Number.isFinite(y)) result.y = y;
  }
  if (zoomStr !== null) {
    const zoom = Number(zoomStr);
    if (Number.isFinite(zoom) && zoom > 0) result.zoom = zoom;
  }

  return Object.keys(result).length > 0 ? result : null;
}

/** Builds a shareable URL for the current page with the camera encoded as query params. */
export function buildShareUrl(currentUrl: string, camera: Camera): string {
  const url = new URL(currentUrl);
  url.searchParams.set("x", camera.x.toFixed(1));
  url.searchParams.set("y", camera.y.toFixed(1));
  url.searchParams.set("zoom", camera.zoom.toFixed(3));
  return url.toString();
}
