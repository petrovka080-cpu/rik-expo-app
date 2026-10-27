import type { ScaleObservabilityCategory } from "./scaleObservabilityEvents";

export type ScaleMetricName =
  | "bff.route.latency"
  | "bff.route.error_rate"
  | "cache.hit_rate"
  | "cache.miss_rate"
  | "cache.stale_rate"
  | "job.enqueue_rate"
  | "job.retry_rate"
  | "job.dead_letter_rate"
  | "idempotency.duplicate_rate"
  | "idempotency.failed_final_rate"
  | "rate_limit.soft_limit_rate"
  | "rate_limit.hard_limit_rate"
  | "abuse.suspicious_rate"
  | "queue.backpressure_rate"
  | "ai.workflow.usage_rate"
  | "realtime.channel_budget_warning_rate"
  | "realtime.limit_projection_warning_rate";

export type ScaleMetricUnit = "milliseconds" | "ratio" | "count";

export type ScaleMetricAggregation = "p50_p95_p99" | "rate" | "sum";

export type ScaleMetricPolicy = {
  metricName: ScaleMetricName;
  category: ScaleObservabilityCategory;
  unit: ScaleMetricUnit;
  aggregation: ScaleMetricAggregation;
  windowMs: number;
  alertThreshold: number;
  defaultEnabled: false;
  piiSafe: true;
  aggregateSafe: true;
  externalExportEnabledByDefault: false;
};

const MINUTE_MS = 60_000;

const policy = (
  input: Omit<
    ScaleMetricPolicy,
    "defaultEnabled" | "piiSafe" | "aggregateSafe" | "externalExportEnabledByDefault"
  >,
): ScaleMetricPolicy =>
  Object.freeze({
    ...input,
    defaultEnabled: false,
    piiSafe: true,
    aggregateSafe: true,
    externalExportEnabledByDefault: false,
  });

export const SCALE_METRIC_POLICY_REGISTRY: readonly ScaleMetricPolicy[] = Object.freeze([
  policy({
    metricName: "bff.route.latency",
    category: "bff",
    unit: "milliseconds",
    aggregation: "p50_p95_p99",
    windowMs: MINUTE_MS,
    alertThreshold: 1_500,
  }),
  policy({
    metricName: "bff.route.error_rate",
    category: "bff",
    unit: "ratio",
    aggregation: "rate",
    windowMs: MINUTE_MS * 5,
    alertThreshold: 0.02,
  }),
  policy({
    metricName: "cache.hit_rate",
    category: "cache",
    unit: "ratio",
    aggregation: "rate",
    windowMs: MINUTE_MS * 5,
    alertThreshold: 0.5,
  }),
  policy({
    metricName: "cache.miss_rate",
    category: "cache",
    unit: "ratio",
    aggregation: "rate",
    windowMs: MINUTE_MS * 5,
    alertThreshold: 0.4,
  }),
  policy({
    metricName: "cache.stale_rate",
    category: "cache",
    unit: "ratio",
    aggregation: "rate",
    windowMs: MINUTE_MS * 5,
    alertThreshold: 0.15,
  }),
  policy({
    metricName: "job.enqueue_rate",
    category: "job",
    unit: "count",
    aggregation: "rate",
    windowMs: MINUTE_MS,
    alertThreshold: 500,
  }),
  policy({
    metricName: "job.retry_rate",
    category: "job",
    unit: "ratio",
    aggregation: "rate",
    windowMs: MINUTE_MS * 5,
    alertThreshold: 0.08,
  }),
  policy({
    metricName: "job.dead_letter_rate",
    category: "job",
    unit: "ratio",
    aggregation: "rate",
    windowMs: MINUTE_MS * 5,
    alertThreshold: 0.01,
  }),
  policy({
    metricName: "idempotency.duplicate_rate",
    category: "idempotency",
    unit: "ratio",
    aggregation: "rate",
    windowMs: MINUTE_MS * 5,
    alertThreshold: 0.1,
  }),
  policy({
    metricName: "idempotency.failed_final_rate",
    category: "idempotency",
    unit: "ratio",
    aggregation: "rate",
    windowMs: MINUTE_MS * 5,
    alertThreshold: 0.02,
  }),
  policy({
    metricName: "rate_limit.soft_limit_rate",
    category: "rate_limit",
    unit: "ratio",
    aggregation: "rate",
    windowMs: MINUTE_MS * 5,
    alertThreshold: 0.2,
  }),
  policy({
    metricName: "rate_limit.hard_limit_rate",
    category: "rate_limit",
    unit: "ratio",
    aggregation: "rate",
    windowMs: MINUTE_MS * 5,
    alertThreshold: 0.05,
  }),
  policy({
    metricName: "abuse.suspicious_rate",
    category: "abuse",
    unit: "ratio",
    aggregation: "rate",
    windowMs: MINUTE_MS * 5,
    alertThreshold: 0.03,
  }),
  policy({
    metricName: "queue.backpressure_rate",
    category: "queue",
    unit: "ratio",
    aggregation: "rate",
    windowMs: MINUTE_MS * 5,
    alertThreshold: 0.05,
  }),
  policy({
    metricName: "ai.workflow.usage_rate",
    category: "ai",
    unit: "count",
    aggregation: "rate",
    windowMs: MINUTE_MS * 5,
    alertThreshold: 100,
  }),
  policy({
    metricName: "realtime.channel_budget_warning_rate",
    category: "realtime",
    unit: "ratio",
    aggregation: "rate",
    windowMs: MINUTE_MS * 5,
    alertThreshold: 0.02,
  }),
  policy({
    metricName: "realtime.limit_projection_warning_rate",
    category: "realtime",
    unit: "ratio",
    aggregation: "rate",
    windowMs: MINUTE_MS * 5,
    alertThreshold: 0.02,
  }),
] as const);

export function getScaleMetricPolicy(metricName: ScaleMetricName): ScaleMetricPolicy | null {
  return SCALE_METRIC_POLICY_REGISTRY.find((policyEntry) => policyEntry.metricName === metricName) ?? null;
}

export function getScaleMetricPoliciesByCategory(
  category: ScaleObservabilityCategory,
): readonly ScaleMetricPolicy[] {
  return SCALE_METRIC_POLICY_REGISTRY.filter((entry) => entry.category === category);
}

export function validateScaleMetricPolicy(policyToValidate: ScaleMetricPolicy): boolean {
  return (
    SCALE_METRIC_POLICY_REGISTRY.some((entry) => entry.metricName === policyToValidate.metricName) &&
    policyToValidate.windowMs > 0 &&
    policyToValidate.alertThreshold >= 0 &&
    policyToValidate.defaultEnabled === false &&
    policyToValidate.piiSafe === true &&
    policyToValidate.aggregateSafe === true &&
    policyToValidate.externalExportEnabledByDefault === false
  );
}
