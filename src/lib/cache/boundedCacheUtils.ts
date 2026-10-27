/**
 * Enforces a maximum size on a Map by evicting the oldest entries (FIFO).
 * This is the canonical eviction utility for all module-level caches.
 *
 * Usage:
 *   cache.set(key, value);
 *   trimMapSize(cache, MAX_SIZE);
 */
export const trimMapSize = <K, V>(map: Map<K, V>, max: number): void => {
  if (map.size <= max) return;
  const excess = map.size - max;
  const iter = map.keys();
  for (let i = 0; i < excess; i++) {
    const k = iter.next().value;
    if (k !== undefined) map.delete(k);
  }
};

/**
 * Enforces a maximum size on a Set by evicting the oldest entries (FIFO).
 */
export const trimSetSize = <V>(set: Set<V>, max: number): void => {
  if (set.size <= max) return;
  const excess = set.size - max;
  const iter = set.values();
  for (let i = 0; i < excess; i++) {
    const v = iter.next().value;
    if (v !== undefined) set.delete(v);
  }
};
