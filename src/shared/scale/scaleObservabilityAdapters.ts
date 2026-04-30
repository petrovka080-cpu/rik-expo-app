import {
  getScaleMetricPolicy,
  type ScaleMetricName,
} from "./scaleMetricsPolicies";
import {
  assertScaleObservabilityTagIsBounded,
  sanitizeScaleObservabilityEvent,
  type ScaleObservabilitySafetyError,
} from "./scaleObservabilitySafety";
import type { ScaleObservabilityEvent } from "./scaleObservabilityEvents";

export type ScaleObservabilityAdapterKind =
  | "noop"
  | "in_memory"
  | "external_contract";

export type ScaleObservabilityRecordResult =
  | { ok: true; externalTelemetrySent: false }
  | {
      ok: false;
      reason: "disabled" | "unknown_metric" | ScaleObservabilitySafetyError;
      externalTelemetrySent: false;
    };

export type ScaleObservabilityMetricInput = {
  metricName: ScaleMetricName;
  value: number;
  tags?: Record<string, string>;
  timestamp?: string;
};

export type ScaleObservabilitySpanToken = {
  spanId: string;
  name: string;
  startedAtMs: number;
};

export type ScaleObservabilityHealth = {
  kind: ScaleObservabilityAdapterKind;
  enabled: boolean;
  externalNetworkEnabled: boolean;
  externalExportEnabledByDefault: false;
  events: number;
  metrics: number;
  spans: number;
  maxEvents?: number;
  maxMetrics?: number;
  maxSpans?: number;
  evictedEvents?: number;
  evictedMetrics?: number;
  evictedSpans?: number;
  invalidRecords?: number;
  flushes?: number;
};

export type ScaleObservabilityAdapter = {
  recordEvent(
    event: ScaleObservabilityEvent,
  ): Promise<ScaleObservabilityRecordResult>;
  recordMetric(
    metric: ScaleObservabilityMetricInput,
  ): Promise<ScaleObservabilityRecordResult>;
  recordSpanStart(
    name: string,
    atMs?: number,
  ): Promise<ScaleObservabilitySpanToken | null>;
  recordSpanEnd(
    token: ScaleObservabilitySpanToken,
    atMs?: number,
  ): Promise<ScaleObservabilityRecordResult>;
  flush(): Promise<ScaleObservabilityRecordResult>;
  getHealth(): ScaleObservabilityHealth;
};

export const EXTERNAL_SCALE_OBSERVABILITY_ADAPTER_CONTRACT = Object.freeze({
  kind: "external_contract" as const,
  recordEvent: "contract_only",
  recordMetric: "contract_only",
  recordSpanStart: "contract_only",
  recordSpanEnd: "contract_only",
  flush: "contract_only",
  externalTelemetryCallsInTests: false,
  externalExportEnabledByDefault: false,
});

export class NoopScaleObservabilityAdapter implements ScaleObservabilityAdapter {
  async recordEvent(
    _event: ScaleObservabilityEvent,
  ): Promise<ScaleObservabilityRecordResult> {
    return { ok: false, reason: "disabled", externalTelemetrySent: false };
  }

  async recordMetric(
    _metric: ScaleObservabilityMetricInput,
  ): Promise<ScaleObservabilityRecordResult> {
    return { ok: false, reason: "disabled", externalTelemetrySent: false };
  }

  async recordSpanStart(
    _name: string,
    _atMs?: number,
  ): Promise<ScaleObservabilitySpanToken | null> {
    return null;
  }

  async recordSpanEnd(
    _token: ScaleObservabilitySpanToken,
    _atMs?: number,
  ): Promise<ScaleObservabilityRecordResult> {
    return { ok: false, reason: "disabled", externalTelemetrySent: false };
  }

  async flush(): Promise<ScaleObservabilityRecordResult> {
    return { ok: false, reason: "disabled", externalTelemetrySent: false };
  }

  getHealth(): ScaleObservabilityHealth {
    return {
      kind: "noop",
      enabled: false,
      externalNetworkEnabled: false,
      externalExportEnabledByDefault: false,
      events: 0,
      metrics: 0,
      spans: 0,
    };
  }
}

export const IN_MEMORY_SCALE_OBSERVABILITY_DEFAULT_MAX_EVENTS = 1_000;
export const IN_MEMORY_SCALE_OBSERVABILITY_DEFAULT_MAX_METRICS = 1_000;
export const IN_MEMORY_SCALE_OBSERVABILITY_DEFAULT_MAX_SPANS = 1_000;
export const IN_MEMORY_SCALE_OBSERVABILITY_MAX_RECORDS = 10_000;
export const IN_MEMORY_SCALE_OBSERVABILITY_MAX_METRIC_TAGS = 8;

export type InMemoryScaleObservabilityAdapterOptions = {
  nowMs?: () => number;
  maxEvents?: number;
  maxMetrics?: number;
  maxSpans?: number;
};

export function resolveInMemoryScaleObservabilityMaxRecords(
  value: unknown,
  fallback: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const normalized = Math.trunc(value);
  if (normalized <= 0) return fallback;
  return Math.min(normalized, IN_MEMORY_SCALE_OBSERVABILITY_MAX_RECORDS);
}

const cloneSafeMetricTags = (
  tags: Record<string, string> | undefined,
): Record<string, string> | undefined | null => {
  if (!tags) return undefined;

  if (
    Object.keys(tags).length > IN_MEMORY_SCALE_OBSERVABILITY_MAX_METRIC_TAGS
  ) {
    return null;
  }

  const safeTags: Record<string, string> = {};
  for (const [key, value] of Object.entries(tags)) {
    if (!assertScaleObservabilityTagIsBounded(key)) return null;
    if (!assertScaleObservabilityTagIsBounded(value)) return null;
    safeTags[key] = value;
  }
  return safeTags;
};

const normalizeSpanName = (name: string): string | null => {
  const normalized = name.trim().slice(0, 80);
  return assertScaleObservabilityTagIsBounded(normalized) ? normalized : null;
};

export class InMemoryScaleObservabilityAdapter implements ScaleObservabilityAdapter {
  readonly events: ScaleObservabilityEvent[] = [];
  readonly metrics: ScaleObservabilityMetricInput[] = [];
  readonly spans: (ScaleObservabilitySpanToken & { endedAtMs?: number })[] = [];
  private readonly nowMs: () => number;
  private readonly maxEvents: number;
  private readonly maxMetrics: number;
  private readonly maxSpans: number;
  private evictedEvents = 0;
  private evictedMetrics = 0;
  private evictedSpans = 0;
  private invalidRecords = 0;
  private flushes = 0;
  private nextSpanId = 1;

  constructor(
    nowOrOptions:
      | (() => number)
      | InMemoryScaleObservabilityAdapterOptions = () => Date.now(),
  ) {
    if (typeof nowOrOptions === "function") {
      this.nowMs = nowOrOptions;
      this.maxEvents = IN_MEMORY_SCALE_OBSERVABILITY_DEFAULT_MAX_EVENTS;
      this.maxMetrics = IN_MEMORY_SCALE_OBSERVABILITY_DEFAULT_MAX_METRICS;
      this.maxSpans = IN_MEMORY_SCALE_OBSERVABILITY_DEFAULT_MAX_SPANS;
      return;
    }

    this.nowMs = nowOrOptions.nowMs ?? (() => Date.now());
    this.maxEvents = resolveInMemoryScaleObservabilityMaxRecords(
      nowOrOptions.maxEvents,
      IN_MEMORY_SCALE_OBSERVABILITY_DEFAULT_MAX_EVENTS,
    );
    this.maxMetrics = resolveInMemoryScaleObservabilityMaxRecords(
      nowOrOptions.maxMetrics,
      IN_MEMORY_SCALE_OBSERVABILITY_DEFAULT_MAX_METRICS,
    );
    this.maxSpans = resolveInMemoryScaleObservabilityMaxRecords(
      nowOrOptions.maxSpans,
      IN_MEMORY_SCALE_OBSERVABILITY_DEFAULT_MAX_SPANS,
    );
  }

  private evictOldestEventsIfNeeded(): void {
    while (this.events.length > this.maxEvents) {
      this.events.shift();
      this.evictedEvents += 1;
    }
  }

  private evictOldestMetricsIfNeeded(): void {
    while (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
      this.evictedMetrics += 1;
    }
  }

  private evictOldestSpansIfNeeded(): void {
    while (this.spans.length > this.maxSpans) {
      this.spans.shift();
      this.evictedSpans += 1;
    }
  }

  async recordEvent(
    event: ScaleObservabilityEvent,
  ): Promise<ScaleObservabilityRecordResult> {
    const safe = sanitizeScaleObservabilityEvent(event);
    if (!safe.ok) {
      this.invalidRecords += 1;
      return { ok: false, reason: safe.reason, externalTelemetrySent: false };
    }
    this.events.push(safe.event);
    this.evictOldestEventsIfNeeded();
    return { ok: true, externalTelemetrySent: false };
  }

  async recordMetric(
    metric: ScaleObservabilityMetricInput,
  ): Promise<ScaleObservabilityRecordResult> {
    const policy = getScaleMetricPolicy(metric.metricName);
    if (!policy) {
      this.invalidRecords += 1;
      return {
        ok: false,
        reason: "unknown_metric",
        externalTelemetrySent: false,
      };
    }
    if (!Number.isFinite(metric.value)) {
      this.invalidRecords += 1;
      return {
        ok: false,
        reason: "unsafe_event",
        externalTelemetrySent: false,
      };
    }
    const safeTags = cloneSafeMetricTags(metric.tags);
    if (safeTags === null) {
      this.invalidRecords += 1;
      return { ok: false, reason: "invalid_tag", externalTelemetrySent: false };
    }
    this.metrics.push({
      metricName: metric.metricName,
      value: metric.value,
      tags: safeTags,
      timestamp: metric.timestamp,
    });
    this.evictOldestMetricsIfNeeded();
    return { ok: true, externalTelemetrySent: false };
  }

  async recordSpanStart(
    name: string,
    atMs = this.nowMs(),
  ): Promise<ScaleObservabilitySpanToken | null> {
    const safeName = normalizeSpanName(name);
    if (!safeName) {
      this.invalidRecords += 1;
      return null;
    }
    const token: ScaleObservabilitySpanToken = {
      spanId: `span:${this.nextSpanId}`,
      name: safeName,
      startedAtMs: atMs,
    };
    this.nextSpanId += 1;
    this.spans.push(token);
    this.evictOldestSpansIfNeeded();
    return token;
  }

  async recordSpanEnd(
    token: ScaleObservabilitySpanToken,
    atMs = this.nowMs(),
  ): Promise<ScaleObservabilityRecordResult> {
    const span = this.spans.find((entry) => entry.spanId === token.spanId);
    if (!span) {
      this.invalidRecords += 1;
      return {
        ok: false,
        reason: "unsafe_event",
        externalTelemetrySent: false,
      };
    }
    span.endedAtMs = Math.max(token.startedAtMs, atMs);
    return { ok: true, externalTelemetrySent: false };
  }

  async flush(): Promise<ScaleObservabilityRecordResult> {
    this.flushes += 1;
    return { ok: true, externalTelemetrySent: false };
  }

  getHealth(): ScaleObservabilityHealth {
    return {
      kind: "in_memory",
      enabled: true,
      externalNetworkEnabled: false,
      externalExportEnabledByDefault: false,
      events: this.events.length,
      metrics: this.metrics.length,
      spans: this.spans.length,
      maxEvents: this.maxEvents,
      maxMetrics: this.maxMetrics,
      maxSpans: this.maxSpans,
      evictedEvents: this.evictedEvents,
      evictedMetrics: this.evictedMetrics,
      evictedSpans: this.evictedSpans,
      invalidRecords: this.invalidRecords,
      flushes: this.flushes,
    };
  }
}
