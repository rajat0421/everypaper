import { describe, expect, it } from "vitest";
import { buildShareUrl, parseShareParams } from "./shareLink";

describe("parseShareParams", () => {
  it("returns null when no camera params are present", () => {
    expect(parseShareParams("")).toBeNull();
    expect(parseShareParams("?foo=bar")).toBeNull();
  });

  it("parses a full camera from the query string", () => {
    expect(parseShareParams("?x=100.5&y=-40&zoom=2")).toEqual({ x: 100.5, y: -40, zoom: 2 });
  });

  it("ignores invalid numeric values", () => {
    expect(parseShareParams("?x=notanumber&y=10")).toEqual({ y: 10 });
  });

  it("ignores a non-positive zoom", () => {
    expect(parseShareParams("?zoom=0")).toBeNull();
    expect(parseShareParams("?zoom=-1")).toBeNull();
  });
});

describe("buildShareUrl", () => {
  it("encodes the camera into x/y/zoom query params", () => {
    const url = buildShareUrl("https://everypaper.app/", { x: 12.345, y: -6, zoom: 1.5 });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("x")).toBe("12.3");
    expect(parsed.searchParams.get("y")).toBe("-6.0");
    expect(parsed.searchParams.get("zoom")).toBe("1.500");
  });

  it("preserves the base path", () => {
    const url = buildShareUrl("https://everypaper.app/room", { x: 0, y: 0, zoom: 1 });
    expect(url.startsWith("https://everypaper.app/room?")).toBe(true);
  });
});
