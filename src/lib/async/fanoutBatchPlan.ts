export type FanoutBatchSkipped<T> = {
  index: number;
  item: T;
  reason: "max_items_exceeded";
};

export type FanoutBatchPlan<T> = {
  sourceCount: number;
  resolveItems: T[];
  sourceToResolveIndex: (number | null)[];
  duplicateCount: number;
  cappedCount: number;
  skipped: FanoutBatchSkipped<T>[];
};

export function planFanoutBatch<T>(
  items: readonly T[],
  params: {
    maxItems: number;
    getKey: (item: T, index: number) => string;
  },
): FanoutBatchPlan<T> {
  const source = Array.isArray(items) ? items : Array.from(items);
  const parsedMaxItems = Math.floor(Number(params.maxItems));
  const maxItems = Number.isFinite(parsedMaxItems) && parsedMaxItems > 0 ? parsedMaxItems : 1;
  const resolveItems: T[] = [];
  const sourceToResolveIndex: (number | null)[] = new Array(source.length).fill(null);
  const skipped: FanoutBatchSkipped<T>[] = [];
  const indexByKey = new Map<string, number>();
  let duplicateCount = 0;

  source.forEach((item, index) => {
    const key = params.getKey(item, index);
    const existingIndex = indexByKey.get(key);
    if (existingIndex != null) {
      sourceToResolveIndex[index] = existingIndex;
      duplicateCount += 1;
      return;
    }

    if (resolveItems.length >= maxItems) {
      skipped.push({ index, item, reason: "max_items_exceeded" });
      return;
    }

    const resolveIndex = resolveItems.length;
    indexByKey.set(key, resolveIndex);
    resolveItems.push(item);
    sourceToResolveIndex[index] = resolveIndex;
  });

  return {
    sourceCount: source.length,
    resolveItems,
    sourceToResolveIndex,
    duplicateCount,
    cappedCount: skipped.length,
    skipped,
  };
}
