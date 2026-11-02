import { describe, expect, it } from "vitest";
import { applyTileDiff, diffTileSubscriptions } from "./tileSubscription";

describe("diffTileSubscriptions", () => {
  it("subscribes to all tiles when nothing was previously subscribed", () => {
    const diff = diffTileSubscriptions(new Set(), ["0:0", "0:1"]);
    expect(diff.toSubscribe.sort()).toEqual(["0:0", "0:1"]);
    expect(diff.toUnsubscribe).toEqual([]);
  });

  it("unsubscribes from tiles no longer visible", () => {
    const diff = diffTileSubscriptions(new Set(["0:0", "0:1"]), ["0:1"]);
    expect(diff.toSubscribe).toEqual([]);
    expect(diff.toUnsubscribe).toEqual(["0:0"]);
  });

  it("computes both subscribe and unsubscribe sets for a pan", () => {
    const diff = diffTileSubscriptions(new Set(["0:0", "0:1"]), ["0:1", "1:1"]);
    expect(diff.toSubscribe).toEqual(["1:1"]);
    expect(diff.toUnsubscribe).toEqual(["0:0"]);
  });

  it("is a no-op when nothing changed", () => {
    const diff = diffTileSubscriptions(new Set(["0:0"]), ["0:0"]);
    expect(diff.toSubscribe).toEqual([]);
    expect(diff.toUnsubscribe).toEqual([]);
  });
});

describe("applyTileDiff", () => {
  it("produces the next subscribed set from a diff", () => {
    const current = new Set(["0:0", "0:1"]);
    const diff = diffTileSubscriptions(current, ["0:1", "1:1"]);
    const next = applyTileDiff(current, diff);
    expect([...next].sort()).toEqual(["0:1", "1:1"]);
  });
});
