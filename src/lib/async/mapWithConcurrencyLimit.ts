export type ConcurrencyLimitOptions = {
  label?: string;
};

const normalizeLimit = (limit: number, itemCount: number) => {
  const parsed = Math.floor(Number(limit));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("mapWithConcurrencyLimit limit must be a positive number");
  }
  return Math.max(1, Math.min(parsed, Math.max(1, itemCount)));
};

export async function mapWithConcurrencyLimit<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
  _options?: ConcurrencyLimitOptions,
): Promise<R[]> {
  const source = Array.isArray(items) ? items : Array.from(items);
  if (!source.length) return [];

  const concurrency = normalizeLimit(limit, source.length);
  const results = new Array<R>(source.length);
  let nextIndex = 0;

  const run = async () => {
    while (nextIndex < source.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(source[index], index);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => run()));
  return results;
}

export async function allSettledWithConcurrencyLimit<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
  options?: ConcurrencyLimitOptions,
): Promise<PromiseSettledResult<R>[]> {
  return mapWithConcurrencyLimit(
    items,
    limit,
    async (item, index): Promise<PromiseSettledResult<R>> => {
      try {
        return {
          status: "fulfilled",
          value: await worker(item, index),
        };
      } catch (reason) {
        return {
          status: "rejected",
          reason,
        };
      }
    },
    options,
  );
}
