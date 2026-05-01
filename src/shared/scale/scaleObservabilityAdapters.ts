import {
  getScaleMetricPolicy,
  type ScaleMetricName,
} from "./scaleMetricsPolicies";
import {
  resolveScaleProviderRuntimeConfig,
  SCALE_PROVIDER_RUNTIME_ENV_NAMES,
  type ScaleProviderRuntimeEnvironment,
} from "./providerRuntimeConfig";
import {
  assertScaleObservabilityTagIsBounded,
  containsSensitiveScaleObservabilityValue,
  sanitizeScaleObservabilityEvent,
  type ScaleObservabilitySafetyError,
} from "./scaleObservabilitySafety";
import type { ScaleObservabilityEvent } from "./scaleObservabilityEvents";

export type ScaleObservabilityAdapterKind =
  | "noop"
  | "in_memory"
  | "external_export"
  | "external_contract";

export type ScaleObservabilityRecordResult =
  | { ok: true; externalTelemetrySent: boolean }
  | {
      ok: false;
      reason: "disabled" | "unknown_metric" | "export_failed" | ScaleObservabilitySafetyError;
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

export type ScaleObservabilityExportFetch = (
  input: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
  },
) => Promise<{ ok: boolean }>;

export type ScaleObservabilityExportAdapterOptions = {
  endpoint: string;
  token: string;
  namespace?: string;
  fetchImpl?: ScaleObservabilityExportFetch;
};

export type ScaleObservabilityExportEnv = Record<string, string | undefined>;

export type CreateScaleObservabilityAdapterFromEnvOptions = {
  runtimeEnvironment?: ScaleProviderRuntimeEnvironment;
  fetchImpl?: ScaleObservabilityExportFetch;
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

const normalizeText = (value: unknown): string => String(value ?? "").trim();

const normalizeExportEndpoint = (value: unknown): string => normalizeText(value).replace(/\/+$/g, "");

const isSafeExportEndpoint = (endpoint: string): boolean => {
  if (!endpoint || containsSensitiveScaleObservabilityValue(endpoint)) return false;
  try {
    const parsed = new URL(endpoint);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
};

const isSafeOptionalNamespace = (namespace: string): boolean =>
  !namespace || assertScaleObservabilityTagIsBounded(namespace);

const defaultScaleObservabilityExportFetch = (): ScaleObservabilityExportFetch | null => {
  if (typeof globalThis.fetch !== "function") return null;
  return globalThis.fetch as ScaleObservabilityExportFetch;
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

export class ExternalScaleObservabilityExportAdapter implements ScaleObservabilityAdapter {
  private readonly endpoint: string;
  private readonly token: string;
  private readonly namespace: string;
  private readonly fetchImpl: ScaleObservabilityExportFetch | null;
  private events = 0;
  private metrics = 0;
  private spans = 0;
  private flushes = 0;
  private invalidRecords = 0;

  constructor(options: ScaleObservabilityExportAdapterOptions) {
    this.endpoint = normalizeExportEndpoint(options.endpoint);
    this.token = normalizeText(options.token);
    this.namespace = normalizeText(options.namespace);
    this.fetchImpl = options.fetchImpl ?? defaultScaleObservabilityExportFetch();
  }

  async recordEvent(event: ScaleObservabilityEvent): Promise<ScaleObservabilityRecordResult> {
    const safe = sanitizeScaleObservabilityEvent(event);
    if (!safe.ok) {
      this.invalidRecords += 1;
      return { ok: false, reason: safe.reason, externalTelemetrySent: false };
    }
    const exported = await this.exportPayload("event", safe.event);
    if (!exported) return { ok: false, reason: "export_failed", externalTelemetrySent: false };
    this.events += 1;
    return { ok: true, externalTelemetrySent: true };
  }

  async recordMetric(metric: ScaleObservabilityMetricInput): Promise<ScaleObservabilityRecordResult> {
    const policy = getScaleMetricPolicy(metric.metricName);
    if (!policy) {
      this.invalidRecords += 1;
      return { ok: false, reason: "unknown_metric", externalTelemetrySent: false };
    }
    if (!Number.isFinite(metric.value)) {
      this.invalidRecords += 1;
      return { ok: false, reason: "unsafe_event", externalTelemetrySent: false };
    }
    const safeTags = cloneSafeMetricTags(metric.tags);
    if (safeTags === null) {
      this.invalidRecords += 1;
      return { ok: false, reason: "invalid_tag", externalTelemetrySent: false };
    }
    const exported = await this.exportPayload("metric", {
      metricName: metric.metricName,
      value: metric.value,
      tags: safeTags,
      timestamp: metric.timestamp,
      policy: {
        category: policy.category,
        unit: policy.unit,
        aggregation: policy.aggregation,
        aggregateSafe: true,
        piiSafe: true,
        externalExportEnabledByDefault: false,
      },
    });
    if (!exported) return { ok: false, reason: "export_failed", externalTelemetrySent: false };
    this.metrics += 1;
    return { ok: true, externalTelemetrySent: true };
  }

  async recordSpanStart(name: string, atMs = Date.now()): Promise<ScaleObservabilitySpanToken | null> {
    const safeName = normalizeSpanName(name);
    if (!safeName || !Number.isFinite(atMs)) {
      this.invalidRecords += 1;
      return null;
    }
    const startedAtMs = Math.max(0, Math.floor(atMs));
    return {
      spanId: `span:${startedAtMs}:${safeName}`,
      name: safeName,
      startedAtMs,
    };
  }

  async recordSpanEnd(
    token: ScaleObservabilitySpanToken,
    atMs = Date.now(),
  ): Promise<ScaleObservabilityRecordResult> {
    const safeName = normalizeSpanName(token.name);
    if (
      !safeName ||
      !assertScaleObservabilityTagIsBounded(token.spanId) ||
      !Number.isFinite(token.startedAtMs) ||
      !Number.isFinite(atMs)
    ) {
      this.invalidRecords += 1;
      return { ok: false, reason: "unsafe_event", externalTelemetrySent: false };
    }
    const startedAtMs = Math.max(0, Math.floor(token.startedAtMs));
    const endedAtMs = Math.max(startedAtMs, Math.floor(atMs));
    const exported = await this.exportPayload("span", {
      spanId: token.spanId,
      name: safeName,
      startedAtMs,
      endedAtMs,
      durationMs: Math.max(0, endedAtMs - startedAtMs),
      redacted: true,
    });
    if (!exported) return { ok: false, reason: "export_failed", externalTelemetrySent: false };
    this.spans += 1;
    return { ok: true, externalTelemetrySent: true };
  }

  async flush(): Promise<ScaleObservabilityRecordResult> {
    this.flushes += 1;
    return { ok: true, externalTelemetrySent: false };
  }

  getHealth(): ScaleObservabilityHealth {
    const enabled = this.canUseExporter();
    return {
      kind: "external_export",
      enabled,
      externalNetworkEnabled: enabled,
      externalExportEnabledByDefault: false,
      events: this.events,
      metrics: this.metrics,
      spans: this.spans,
      invalidRecords: this.invalidRecords,
      flushes: this.flushes,
    };
  }

  private canUseExporter(): boolean {
    return (
      isSafeExportEndpoint(this.endpoint) &&
      this.token.length > 0 &&
      isSafeOptionalNamespace(this.namespace) &&
      this.fetchImpl !== null
    );
  }

  private async exportPayload(kind: "event" | "metric" | "span", payload: unknown): Promise<boolean> {
    if (!this.canUseExporter() || !this.fetchImpl) return false;
    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          kind,
          namespace: this.namespace || undefined,
          payload,
          redacted: true,
          rawInputIncluded: false,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export function createScaleObservabilityAdapterFromEnv(
  env: ScaleObservabilityExportEnv = typeof process !== "undefined" ? process.env : {},
  options: CreateScaleObservabilityAdapterFromEnvOptions = {},
): ScaleObservabilityAdapter {
  const runtimeConfig = resolveScaleProviderRuntimeConfig(env, {
    runtimeEnvironment: options.runtimeEnvironment,
  });
  const observabilityStatus = runtimeConfig.providers.observability_export;
  if (!observabilityStatus.liveNetworkAllowed) return new NoopScaleObservabilityAdapter();

  const envNames = SCALE_PROVIDER_RUNTIME_ENV_NAMES.observability_export;
  return new ExternalScaleObservabilityExportAdapter({
    endpoint: normalizeText(env[envNames.required[0]]),
    token: normalizeText(env[envNames.required[1]]),
    namespace: normalizeText(env[envNames.optional[0]]),
    fetchImpl: options.fetchImpl,
  });
}
