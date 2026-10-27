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

export type BatchReliabilityOutcome =
  | "full_success"
  | "degraded_success"
  | "hard_failure";

export type BatchReliabilityMemberPolicy<Key extends string> = {
  key: Key;
  critical: boolean;
};

export type BatchReliabilityPlan<Key extends string> = {
  members: readonly BatchReliabilityMemberPolicy<Key>[];
};

export type BatchReliabilityNormalizedError = {
  error: Error;
  name: string;
  message: string;
};

export type BatchReliabilityFailure<Key extends string> = {
  key: Key;
  critical: boolean;
  error: BatchReliabilityNormalizedError;
};

export type BatchReliabilityApplyResult<Key extends string, Value> = {
  status: BatchReliabilityOutcome;
  values: Record<Key, Value>;
  failures: BatchReliabilityFailure<Key>[];
  firstCriticalFailure: BatchReliabilityFailure<Key> | null;
};

export function createBatchReliabilityPlan<Key extends string>(
  members: readonly BatchReliabilityMemberPolicy<Key>[],
): BatchReliabilityPlan<Key> {
  const seen = new Set<string>();
  for (const member of members) {
    if (seen.has(member.key)) {
      throw new Error(`Duplicate batch reliability member: ${member.key}`);
    }
    seen.add(member.key);
  }

  return {
    members: [...members],
  };
}

export function classifyBatchReliabilityOutcome<Key extends string>(
  plan: BatchReliabilityPlan<Key>,
  failedKeys: Iterable<Key>,
): BatchReliabilityOutcome {
  const failureSet = new Set<Key>(failedKeys);
  if (failureSet.size === 0) return "full_success";

  const hasCriticalFailure = plan.members.some(
    (member) => member.critical && failureSet.has(member.key),
  );
  return hasCriticalFailure ? "hard_failure" : "degraded_success";
}

const pickBatchReliabilityErrorMessage = (error: unknown): string | null => {
  if (error instanceof Error) {
    const message = String(error.message ?? "").trim();
    return message || null;
  }
  if (typeof error === "string") {
    const message = error.trim();
    return message || null;
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = String(record.message ?? "").trim();
    if (message) return message;
  }
  return null;
};

const pickBatchReliabilityErrorName = (error: unknown): string => {
  if (error instanceof Error) {
    return String(error.name ?? "Error").trim() || "Error";
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const name = String(record.name ?? "").trim();
    if (name) return name;
  }
  return "Error";
};

export function normalizeBatchReliabilityError(
  error: unknown,
  fallbackMessage: string,
): BatchReliabilityNormalizedError {
  const message = pickBatchReliabilityErrorMessage(error) ?? fallbackMessage;
  if (error instanceof Error && String(error.message ?? "").trim()) {
    return {
      error,
      name: pickBatchReliabilityErrorName(error),
      message,
    };
  }

  const normalized = new Error(message);
  normalized.name = pickBatchReliabilityErrorName(error);
  return {
    error: normalized,
    name: normalized.name,
    message,
  };
}

export function applyBatchReliabilityPlan<Key extends string, Value>(params: {
  plan: BatchReliabilityPlan<Key>;
  settled: Record<Key, PromiseSettledResult<Value>>;
  getFallbackValue: (key: Key) => Value;
  getFallbackMessage?: (key: Key) => string;
}): BatchReliabilityApplyResult<Key, Value> {
  const failures: BatchReliabilityFailure<Key>[] = [];
  const values = {} as Record<Key, Value>;

  for (const member of params.plan.members) {
    const result = params.settled[member.key];
    if (result.status === "fulfilled") {
      values[member.key] = result.value;
      continue;
    }

    const error = normalizeBatchReliabilityError(
      result.reason,
      params.getFallbackMessage?.(member.key) ??
        `Batch reliability member failed: ${member.key}`,
    );
    failures.push({
      key: member.key,
      critical: member.critical,
      error,
    });
    values[member.key] = params.getFallbackValue(member.key);
  }

  const status = classifyBatchReliabilityOutcome(
    params.plan,
    failures.map((failure) => failure.key),
  );
  const firstCriticalFailure =
    failures.find((failure) => failure.critical) ?? null;

  return {
    status,
    values,
    failures,
    firstCriticalFailure,
  };
}
