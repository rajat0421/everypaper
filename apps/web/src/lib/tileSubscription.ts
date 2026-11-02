/**
 * Pure diffing logic for the tile subscription set: given the set of tile ids
 * we're currently subscribed to on the socket and the next set of visible
 * tile ids from the engine, compute what to subscribe/unsubscribe.
 */
export interface TileSubscriptionDiff {
  toSubscribe: string[];
  toUnsubscribe: string[];
}

export function diffTileSubscriptions(
  current: ReadonlySet<string>,
  next: readonly string[]
): TileSubscriptionDiff {
  const nextSet = new Set(next);
  const toSubscribe = next.filter((id) => !current.has(id));
  const toUnsubscribe = [...current].filter((id) => !nextSet.has(id));
  return { toSubscribe, toUnsubscribe };
}

export function applyTileDiff(current: ReadonlySet<string>, diff: TileSubscriptionDiff): Set<string> {
  const next = new Set(current);
  for (const id of diff.toSubscribe) next.add(id);
  for (const id of diff.toUnsubscribe) next.delete(id);
  return next;
}
