type PlatformObservabilityScreen =
  | "global_busy"
  | "warehouse"
  | "contractor"
  | "accountant"
  | "buyer"
  | "director"
  | "foreman"
  | "market"
  | "office"
  | "ai"
  | "profile"
  | "security"
  | "reports"
  | "chat"
  | "auctions"
  | "supplier_map"
  | "request";

type PlatformObservabilityCategory = "fetch" | "ui" | "reload";

type PlatformObservabilityResult =
  | "success"
  | "error"
  | "cache_hit"
  | "joined_inflight"
  | "queued_rerun"
  | "skipped";

export type PlatformObservabilityEvent = {
  id: string;
  at: number;
  screen: PlatformObservabilityScreen;
  surface: string;
  category: PlatformObservabilityCategory;
  event: string;
  result: PlatformObservabilityResult;
  durationMs?: number;
  rowCount?: number;
  sourceKind?: string;
  cacheLayer?: string;
  fallbackUsed?: boolean;
  errorStage?: string;
  errorClass?: string;
  errorMessage?: string;
  trigger?: string;
  extra?: Record<string, unknown>;
};

type PlatformObservabilityEventInput = Omit<PlatformObservabilityEvent, "id" | "at">;

type PlatformObservabilityStore = {
  seq: number;
  events: PlatformObservabilityEvent[];
};

type PlatformObservabilityGlobal = typeof globalThis & {
  __RIK_PLATFORM_OBSERVABILITY__?: PlatformObservabilityStore;
};

export type PlatformObservabilityBucket = {
  screen: PlatformObservabilityScreen;
  surface: string;
  event: string;
  count: number;
  avgDurationMs: number;
  maxDurationMs: number;
  totalRowCount: number;
  lastSourceKind: string | null;
  fallbackCount: number;
};

export type PlatformObservabilitySummary = {
  totalEvents: number;
  fetchEvents: number;
  uiEvents: number;
  reloadEvents: number;
  errorCount: number;
  cacheHitCount: number;
  overlapCount: number;
  skippedCount: number;
  guardReasons: {
    reason: string;
    count: number;
  }[];
  topSlowFetches: PlatformObservabilityBucket[];
  recentErrors: {
    screen: PlatformObservabilityScreen;
    surface: string;
    event: string;
    errorStage: string | null;
    errorClass: string | null;
    errorMessage: string | null;
  }[];
};

export type PlatformObservabilityHotspotClassification =
  | "backend_fetch_heavy"
  | "client_transform_heavy"
  | "overlap_reload_heavy"
  | "render_heavy"
  | "mixed";

export type PlatformObservabilityHotspotConfidence = "high" | "medium" | "low";

export type PlatformObservabilityHotspotAnalysis = PlatformObservabilityBucket & {
  key: string;
  classification: PlatformObservabilityHotspotClassification;
  confidence: PlatformObservabilityHotspotConfidence;
  reason: string;
};

export type PlatformObservabilityComparisonEntry = {
  key: string;
  screen: PlatformObservabilityScreen;
  surface: string;
  event: string;
  previousDurationMs: number | null;
  currentDurationMs: number;
  deltaMs: number | null;
  deltaPercent: number | null;
  previousOwner: string | null;
  currentOwner: string | null;
  ownerChanged: boolean;
  fallbackPresent: boolean;
  classification: PlatformObservabilityHotspotClassification;
  confidence: PlatformObservabilityHotspotConfidence;
  reason: string;
};

export type PlatformObservabilityRecommendation = {
  nextBestCut: string | null;
  reason: string | null;
  confidence: PlatformObservabilityHotspotConfidence;
  classification: PlatformObservabilityHotspotClassification | null;
  candidates: {
    key: string;
    currentDurationMs: number;
    classification: PlatformObservabilityHotspotClassification;
    confidence: PlatformObservabilityHotspotConfidence;
    reason: string;
  }[];
};

const MAX_PLATFORM_OBSERVABILITY_EVENTS = 400;

const nowMs = () => {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
};

const trimText = (value: unknown) => String(value ?? "").trim();

const normalizeDuration = (value: number) => {
  if (!Number.isFinite(value)) return undefined;
  return Math.max(0, Math.round(value));
};

const toShortError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      errorClass: trimText(error.name) || "Error",
      errorMessage: trimText(error.message) || null,
    };
  }
  const record = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
  const errorClass = trimText(record.name) || null;
  const errorMessage = trimText(record.message ?? error) || null;
  return {
    errorClass,
    errorMessage,
  };
};

const getStore = (): PlatformObservabilityStore => {
  const root = globalThis as PlatformObservabilityGlobal;
  if (!root.__RIK_PLATFORM_OBSERVABILITY__) {
    root.__RIK_PLATFORM_OBSERVABILITY__ = {
      seq: 0,
      events: [],
    };
  }
  return root.__RIK_PLATFORM_OBSERVABILITY__;
};

export function recordPlatformObservability(input: PlatformObservabilityEventInput): PlatformObservabilityEvent {
  const store = getStore();
  store.seq += 1;
  const event: PlatformObservabilityEvent = {
    id: `obs-${store.seq}`,
    at: Date.now(),
    ...input,
  };
  store.events.push(event);
  if (store.events.length > MAX_PLATFORM_OBSERVABILITY_EVENTS) {
    store.events.splice(0, store.events.length - MAX_PLATFORM_OBSERVABILITY_EVENTS);
  }
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.info("[platform.observability]", {
      screen: event.screen,
      surface: event.surface,
      event: event.event,
      result: event.result,
      durationMs: event.durationMs ?? null,
      rowCount: event.rowCount ?? null,
      sourceKind: event.sourceKind ?? null,
      errorStage: event.errorStage ?? null,
    });
  }
  return event;
}

export function beginPlatformObservability(
  base: Omit<PlatformObservabilityEventInput, "result" | "durationMs" | "errorClass" | "errorMessage">,
) {
  const startedAt = nowMs();
  return {
    success(fields?: Partial<PlatformObservabilityEventInput>) {
      return recordPlatformObservability({
        ...base,
        ...fields,
        result: "success",
        durationMs: normalizeDuration(nowMs() - startedAt),
      });
    },
    error(error: unknown, fields?: Partial<PlatformObservabilityEventInput>) {
      const short = toShortError(error);
      return recordPlatformObservability({
        ...base,
        ...fields,
        result: "error",
        durationMs: normalizeDuration(nowMs() - startedAt),
        errorClass: fields?.errorClass ?? short.errorClass ?? undefined,
        errorMessage: fields?.errorMessage ?? short.errorMessage ?? undefined,
      });
    },
  };
}

export function getPlatformObservabilityEvents(): PlatformObservabilityEvent[] {
  return [...getStore().events];
}

export function resetPlatformObservabilityEvents() {
  const store = getStore();
  store.seq = 0;
  store.events.length = 0;
}

export function summarizePlatformObservabilityEvents(
  events: PlatformObservabilityEvent[] = getPlatformObservabilityEvents(),
): PlatformObservabilitySummary {
  const buckets = new Map<string, PlatformObservabilityBucket>();
  const guardReasons = new Map<string, number>();
  for (const event of events) {
    if (event.category !== "fetch" || event.result !== "success" || typeof event.durationMs !== "number") continue;
    const key = `${event.screen}|${event.surface}|${event.event}`;
    const bucket = buckets.get(key) ?? {
      screen: event.screen,
      surface: event.surface,
      event: event.event,
      count: 0,
      avgDurationMs: 0,
      maxDurationMs: 0,
      totalRowCount: 0,
      lastSourceKind: null,
      fallbackCount: 0,
    };
    bucket.count += 1;
    bucket.maxDurationMs = Math.max(bucket.maxDurationMs, event.durationMs);
    bucket.totalRowCount += Number(event.rowCount ?? 0) || 0;
    bucket.avgDurationMs =
      Math.round(
        ((bucket.avgDurationMs * (bucket.count - 1)) + event.durationMs) / bucket.count,
      );
    bucket.lastSourceKind = event.sourceKind ?? bucket.lastSourceKind;
    if (event.fallbackUsed) bucket.fallbackCount += 1;
    buckets.set(key, bucket);
  }

  for (const event of events) {
    if (event.result !== "skipped") continue;
    const reason = trimText(event.extra?.guardReason);
    if (!reason) continue;
    guardReasons.set(reason, (guardReasons.get(reason) ?? 0) + 1);
  }

  const recentErrors = events
    .filter((event) => event.result === "error")
    .slice(-10)
    .map((event) => ({
      screen: event.screen,
      surface: event.surface,
      event: event.event,
      errorStage: event.errorStage ?? null,
      errorClass: event.errorClass ?? null,
      errorMessage: event.errorMessage ?? null,
    }));

  return {
    totalEvents: events.length,
    fetchEvents: events.filter((event) => event.category === "fetch").length,
    uiEvents: events.filter((event) => event.category === "ui").length,
    reloadEvents: events.filter((event) => event.category === "reload").length,
    errorCount: events.filter((event) => event.result === "error").length,
    cacheHitCount: events.filter((event) => event.result === "cache_hit").length,
    overlapCount: events.filter(
      (event) => event.result === "joined_inflight" || event.result === "queued_rerun",
    ).length,
    skippedCount: events.filter((event) => event.result === "skipped").length,
    guardReasons: [...guardReasons.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason)),
    topSlowFetches: [...buckets.values()]
      .sort((left, right) => right.maxDurationMs - left.maxDurationMs)
      .slice(0, 10),
    recentErrors,
  };
}

const buildHotspotKey = (bucket: Pick<PlatformObservabilityBucket, "screen" | "surface" | "event">) =>
  `${bucket.screen}|${bucket.surface}|${bucket.event}`;

export function classifyPlatformObservabilityBucket(
  bucket: PlatformObservabilityBucket,
): PlatformObservabilityHotspotAnalysis {
  const sourceKind = String(bucket.lastSourceKind ?? "").trim().toLowerCase();

  if (sourceKind.includes("joined_inflight") || sourceKind.includes("queued_rerun")) {
    return {
      ...bucket,
      key: buildHotspotKey(bucket),
      classification: "overlap_reload_heavy",
      confidence: "medium",
      reason: "overlap markers dominate this hotspot",
    };
  }

  if (
    bucket.fallbackCount > 0 ||
    sourceKind.includes("legacy") ||
    sourceKind.includes("relational_enrich") ||
    sourceKind.includes("+name_map")
  ) {
    return {
      ...bucket,
      key: buildHotspotKey(bucket),
      classification: "client_transform_heavy",
      confidence: bucket.maxDurationMs >= 500 ? "high" : "medium",
      reason: "legacy/client-owned shaping or fallback is still present in the primary load chain",
    };
  }

  if (sourceKind.startsWith("rpc") || sourceKind.startsWith("view") || sourceKind.startsWith("rest:")) {
    return {
      ...bucket,
      key: buildHotspotKey(bucket),
      classification: "backend_fetch_heavy",
      confidence: bucket.maxDurationMs >= 500 ? "high" : "medium",
      reason: "primary owner is already backend/read-model bound, so remaining cost is fetch/query dominated",
    };
  }

  return {
    ...bucket,
    key: buildHotspotKey(bucket),
    classification: "mixed",
    confidence: "low",
    reason: "not enough source ownership signal to classify this hotspot more narrowly",
  };
}

export function comparePlatformObservabilityBuckets(params: {
  previous: PlatformObservabilityBucket[];
  current: PlatformObservabilityBucket[];
}): PlatformObservabilityComparisonEntry[] {
  const previousByKey = new Map(params.previous.map((bucket) => [buildHotspotKey(bucket), bucket]));

  return params.current.map((currentBucket) => {
    const analysis = classifyPlatformObservabilityBucket(currentBucket);
    const previousBucket = previousByKey.get(analysis.key) ?? null;
    const previousDurationMs = previousBucket?.maxDurationMs ?? null;
    const currentDurationMs = analysis.maxDurationMs;
    const deltaMs =
      previousDurationMs == null || !Number.isFinite(previousDurationMs)
        ? null
        : Math.round(currentDurationMs - previousDurationMs);
    const deltaPercent =
      previousDurationMs == null || previousDurationMs <= 0
        ? null
        : Math.round(((currentDurationMs - previousDurationMs) / previousDurationMs) * 100);
    const previousOwner = previousBucket?.lastSourceKind ?? null;
    const currentOwner = analysis.lastSourceKind ?? null;

    return {
      key: analysis.key,
      screen: analysis.screen,
      surface: analysis.surface,
      event: analysis.event,
      previousDurationMs,
      currentDurationMs,
      deltaMs,
      deltaPercent,
      previousOwner,
      currentOwner,
      ownerChanged: previousOwner !== currentOwner,
      fallbackPresent: analysis.fallbackCount > 0,
      classification: analysis.classification,
      confidence: analysis.confidence,
      reason: analysis.reason,
    };
  });
}

export function recommendPlatformHotspot(
  comparisons: PlatformObservabilityComparisonEntry[],
): PlatformObservabilityRecommendation {
  const ranked = [...comparisons]
    .filter((entry) => entry.currentDurationMs > 0)
    .sort((left, right) => {
      const leftScore =
        (left.ownerChanged && (left.deltaMs ?? 0) < 0 ? -150 : 0) +
        (left.fallbackPresent ? 50 : 0) +
        left.currentDurationMs;
      const rightScore =
        (right.ownerChanged && (right.deltaMs ?? 0) < 0 ? -150 : 0) +
        (right.fallbackPresent ? 50 : 0) +
        right.currentDurationMs;
      return rightScore - leftScore;
    });

  const top = ranked[0] ?? null;
  return {
    nextBestCut: top?.key ?? null,
    reason: top ? `${top.classification}: ${top.reason}` : null,
    confidence: top?.confidence ?? "low",
    classification: top?.classification ?? null,
    candidates: ranked.slice(0, 5).map((entry) => ({
      key: entry.key,
      currentDurationMs: entry.currentDurationMs,
      classification: entry.classification,
      confidence: entry.confidence,
      reason: entry.reason,
    })),
  };
}
