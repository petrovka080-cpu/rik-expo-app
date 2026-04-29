import {
  getScaleMetricPolicy,
  type ScaleMetricName,
} from "./scaleMetricsPolicies";
import {
  sanitizeScaleObservabilityEvent,
  type ScaleObservabilitySafetyError,
} from "./scaleObservabilitySafety";
import type { ScaleObservabilityEvent } from "./scaleObservabilityEvents";

export type ScaleObservabilityAdapterKind = "noop" | "in_memory" | "external_contract";

export type ScaleObservabilityRecordResult =
  | { ok: true; externalTelemetrySent: false }
  | { ok: false; reason: "disabled" | "unknown_metric" | ScaleObservabilitySafetyError; externalTelemetrySent: false };

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
};

export type ScaleObservabilityAdapter = {
  recordEvent(event: ScaleObservabilityEvent): Promise<ScaleObservabilityRecordResult>;
  recordMetric(metric: ScaleObservabilityMetricInput): Promise<ScaleObservabilityRecordResult>;
  recordSpanStart(name: string, atMs?: number): Promise<ScaleObservabilitySpanToken | null>;
  recordSpanEnd(token: ScaleObservabilitySpanToken, atMs?: number): Promise<ScaleObservabilityRecordResult>;
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
  async recordEvent(_event: ScaleObservabilityEvent): Promise<ScaleObservabilityRecordResult> {
    return { ok: false, reason: "disabled", externalTelemetrySent: false };
  }

  async recordMetric(_metric: ScaleObservabilityMetricInput): Promise<ScaleObservabilityRecordResult> {
    return { ok: false, reason: "disabled", externalTelemetrySent: false };
  }

  async recordSpanStart(_name: string, _atMs?: number): Promise<ScaleObservabilitySpanToken | null> {
    return null;
  }

  async recordSpanEnd(_token: ScaleObservabilitySpanToken, _atMs?: number): Promise<ScaleObservabilityRecordResult> {
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

export class InMemoryScaleObservabilityAdapter implements ScaleObservabilityAdapter {
  readonly events: ScaleObservabilityEvent[] = [];
  readonly metrics: ScaleObservabilityMetricInput[] = [];
  readonly spans: (ScaleObservabilitySpanToken & { endedAtMs?: number })[] = [];

  constructor(private readonly nowMs: () => number = () => Date.now()) {}

  async recordEvent(event: ScaleObservabilityEvent): Promise<ScaleObservabilityRecordResult> {
    const safe = sanitizeScaleObservabilityEvent(event);
    if (!safe.ok) return { ok: false, reason: safe.reason, externalTelemetrySent: false };
    this.events.push(safe.event);
    return { ok: true, externalTelemetrySent: false };
  }

  async recordMetric(metric: ScaleObservabilityMetricInput): Promise<ScaleObservabilityRecordResult> {
    const policy = getScaleMetricPolicy(metric.metricName);
    if (!policy) return { ok: false, reason: "unknown_metric", externalTelemetrySent: false };
    if (!Number.isFinite(metric.value)) return { ok: false, reason: "unsafe_event", externalTelemetrySent: false };
    this.metrics.push({
      metricName: metric.metricName,
      value: metric.value,
      tags: metric.tags ? { ...metric.tags } : undefined,
      timestamp: metric.timestamp,
    });
    return { ok: true, externalTelemetrySent: false };
  }

  async recordSpanStart(name: string, atMs = this.nowMs()): Promise<ScaleObservabilitySpanToken> {
    const token: ScaleObservabilitySpanToken = {
      spanId: `span:${this.spans.length + 1}`,
      name: name.slice(0, 80),
      startedAtMs: atMs,
    };
    this.spans.push(token);
    return token;
  }

  async recordSpanEnd(
    token: ScaleObservabilitySpanToken,
    atMs = this.nowMs(),
  ): Promise<ScaleObservabilityRecordResult> {
    const span = this.spans.find((entry) => entry.spanId === token.spanId);
    if (!span) return { ok: false, reason: "unsafe_event", externalTelemetrySent: false };
    span.endedAtMs = Math.max(token.startedAtMs, atMs);
    return { ok: true, externalTelemetrySent: false };
  }

  async flush(): Promise<ScaleObservabilityRecordResult> {
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
    };
  }
}
