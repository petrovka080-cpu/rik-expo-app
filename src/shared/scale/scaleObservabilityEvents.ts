import type { BffMutationOperation } from "./bffMutationHandlers";
import type { BffReadOperation } from "./bffReadHandlers";
import type { CachePolicyRoute } from "./cachePolicies";
import type { IdempotencyPolicyOperation } from "./idempotencyPolicies";
import type { JobType } from "./jobPolicies";
import type { RateLimitEnforcementOperation } from "./rateLimitPolicies";

export type ScaleObservabilityCategory =
  | "bff"
  | "cache"
  | "job"
  | "idempotency"
  | "rate_limit"
  | "abuse"
  | "queue"
  | "ai"
  | "realtime";

export type ScaleObservabilitySeverity = "debug" | "info" | "warning" | "error" | "critical";

export type ScaleObservabilityResult =
  | "success"
  | "error"
  | "planned"
  | "allowed"
  | "limited"
  | "warning"
  | "skipped";

export type ScaleObservabilityScope = "present_redacted" | "missing" | "not_applicable";

export type ScaleObservabilityEventName =
  | "bff.route.request"
  | "bff.route.error"
  | "cache.hit"
  | "cache.miss"
  | "cache.stale"
  | "cache.invalidation.planned"
  | "job.enqueue.planned"
  | "job.retry.planned"
  | "job.dead_letter.planned"
  | "idempotency.reserved"
  | "idempotency.duplicate_in_flight"
  | "idempotency.duplicate_committed"
  | "rate_limit.allowed"
  | "rate_limit.soft_limited"
  | "rate_limit.hard_limited"
  | "abuse.suspicious"
  | "queue.backpressure.warning"
  | "ai.workflow.action.planned"
  | "realtime.channel_budget.warning";

export type ScaleObservabilityEventContract = {
  eventName: ScaleObservabilityEventName;
  category: ScaleObservabilityCategory;
  severity: ScaleObservabilitySeverity;
  defaultResult: ScaleObservabilityResult;
  sampled: boolean;
  redacted: true;
  externalExportEnabledByDefault: false;
};

export type ScaleObservabilityEvent = {
  eventName: ScaleObservabilityEventName;
  category: ScaleObservabilityCategory;
  severity: ScaleObservabilitySeverity;
  timestamp: string;
  routeOrOperation: string;
  safeActorScope: ScaleObservabilityScope;
  safeCompanyScope: ScaleObservabilityScope;
  durationMs?: number;
  result: ScaleObservabilityResult;
  reasonCode?: string;
  sampled: boolean;
  redacted: true;
};

export type BffObservabilityMetadata = {
  requestEvent: "bff.route.request";
  errorEvent: "bff.route.error";
  latencyMetric: "bff.route.latency";
  errorRateMetric: "bff.route.error_rate";
  externalExportEnabledByDefault: false;
};

export type CacheObservabilityMetadata = {
  hitEvent: "cache.hit";
  missEvent: "cache.miss";
  staleEvent: "cache.stale";
  invalidationPlannedEvent: "cache.invalidation.planned";
  hitRateMetric: "cache.hit_rate";
  staleRateMetric: "cache.stale_rate";
  externalExportEnabledByDefault: false;
};

export type JobObservabilityMetadata = {
  enqueuePlannedEvent: "job.enqueue.planned";
  retryPlannedEvent: "job.retry.planned";
  deadLetterPlannedEvent: "job.dead_letter.planned";
  enqueueRateMetric: "job.enqueue_rate";
  retryRateMetric: "job.retry_rate";
  deadLetterRateMetric: "job.dead_letter_rate";
  externalExportEnabledByDefault: false;
};

export type IdempotencyObservabilityMetadata = {
  reservedEvent: "idempotency.reserved";
  duplicateInFlightEvent: "idempotency.duplicate_in_flight";
  duplicateCommittedEvent: "idempotency.duplicate_committed";
  duplicateRateMetric: "idempotency.duplicate_rate";
  externalExportEnabledByDefault: false;
};

export type RateLimitObservabilityMetadata = {
  allowedEvent: "rate_limit.allowed";
  softLimitedEvent: "rate_limit.soft_limited";
  hardLimitedEvent: "rate_limit.hard_limited";
  softLimitRateMetric: "rate_limit.soft_limit_rate";
  hardLimitRateMetric: "rate_limit.hard_limit_rate";
  externalExportEnabledByDefault: false;
};

export type AbuseObservabilityMetadata = {
  suspiciousEvent: "abuse.suspicious";
  suspiciousRateMetric: "abuse.suspicious_rate";
  externalExportEnabledByDefault: false;
};

export type QueueObservabilityMetadata = {
  backpressureWarningEvent: "queue.backpressure.warning";
  backpressureRateMetric: "queue.backpressure_rate";
  externalExportEnabledByDefault: false;
};

export type AiWorkflowObservabilityMetadata = {
  actionPlannedEvent: "ai.workflow.action.planned";
  usageRateMetric: "ai.workflow.usage_rate";
  externalExportEnabledByDefault: false;
};

export type RealtimeObservabilityMetadata = {
  channelBudgetWarningEvent: "realtime.channel_budget.warning";
  channelBudgetWarningRateMetric: "realtime.channel_budget_warning_rate";
  externalExportEnabledByDefault: false;
};

const contract = (
  value: Omit<ScaleObservabilityEventContract, "redacted" | "externalExportEnabledByDefault">,
): ScaleObservabilityEventContract =>
  Object.freeze({
    ...value,
    redacted: true,
    externalExportEnabledByDefault: false,
  });

export const SCALE_OBSERVABILITY_EVENT_REGISTRY: readonly ScaleObservabilityEventContract[] = Object.freeze([
  contract({ eventName: "bff.route.request", category: "bff", severity: "info", defaultResult: "success", sampled: true }),
  contract({ eventName: "bff.route.error", category: "bff", severity: "error", defaultResult: "error", sampled: true }),
  contract({ eventName: "cache.hit", category: "cache", severity: "debug", defaultResult: "success", sampled: true }),
  contract({ eventName: "cache.miss", category: "cache", severity: "debug", defaultResult: "skipped", sampled: true }),
  contract({ eventName: "cache.stale", category: "cache", severity: "warning", defaultResult: "warning", sampled: true }),
  contract({ eventName: "cache.invalidation.planned", category: "cache", severity: "info", defaultResult: "planned", sampled: true }),
  contract({ eventName: "job.enqueue.planned", category: "job", severity: "info", defaultResult: "planned", sampled: true }),
  contract({ eventName: "job.retry.planned", category: "job", severity: "warning", defaultResult: "planned", sampled: true }),
  contract({ eventName: "job.dead_letter.planned", category: "job", severity: "error", defaultResult: "planned", sampled: true }),
  contract({ eventName: "idempotency.reserved", category: "idempotency", severity: "info", defaultResult: "success", sampled: true }),
  contract({ eventName: "idempotency.duplicate_in_flight", category: "idempotency", severity: "warning", defaultResult: "warning", sampled: true }),
  contract({ eventName: "idempotency.duplicate_committed", category: "idempotency", severity: "info", defaultResult: "skipped", sampled: true }),
  contract({ eventName: "rate_limit.allowed", category: "rate_limit", severity: "debug", defaultResult: "allowed", sampled: true }),
  contract({ eventName: "rate_limit.soft_limited", category: "rate_limit", severity: "warning", defaultResult: "limited", sampled: true }),
  contract({ eventName: "rate_limit.hard_limited", category: "rate_limit", severity: "critical", defaultResult: "limited", sampled: true }),
  contract({ eventName: "abuse.suspicious", category: "abuse", severity: "warning", defaultResult: "warning", sampled: true }),
  contract({ eventName: "queue.backpressure.warning", category: "queue", severity: "warning", defaultResult: "warning", sampled: true }),
  contract({ eventName: "ai.workflow.action.planned", category: "ai", severity: "info", defaultResult: "planned", sampled: true }),
  contract({ eventName: "realtime.channel_budget.warning", category: "realtime", severity: "warning", defaultResult: "warning", sampled: true }),
] as const);

export const BFF_OBSERVABILITY_METADATA: BffObservabilityMetadata = Object.freeze({
  requestEvent: "bff.route.request",
  errorEvent: "bff.route.error",
  latencyMetric: "bff.route.latency",
  errorRateMetric: "bff.route.error_rate",
  externalExportEnabledByDefault: false,
});

export const CACHE_OBSERVABILITY_METADATA: CacheObservabilityMetadata = Object.freeze({
  hitEvent: "cache.hit",
  missEvent: "cache.miss",
  staleEvent: "cache.stale",
  invalidationPlannedEvent: "cache.invalidation.planned",
  hitRateMetric: "cache.hit_rate",
  staleRateMetric: "cache.stale_rate",
  externalExportEnabledByDefault: false,
});

export const JOB_OBSERVABILITY_METADATA: JobObservabilityMetadata = Object.freeze({
  enqueuePlannedEvent: "job.enqueue.planned",
  retryPlannedEvent: "job.retry.planned",
  deadLetterPlannedEvent: "job.dead_letter.planned",
  enqueueRateMetric: "job.enqueue_rate",
  retryRateMetric: "job.retry_rate",
  deadLetterRateMetric: "job.dead_letter_rate",
  externalExportEnabledByDefault: false,
});

export const IDEMPOTENCY_OBSERVABILITY_METADATA: IdempotencyObservabilityMetadata = Object.freeze({
  reservedEvent: "idempotency.reserved",
  duplicateInFlightEvent: "idempotency.duplicate_in_flight",
  duplicateCommittedEvent: "idempotency.duplicate_committed",
  duplicateRateMetric: "idempotency.duplicate_rate",
  externalExportEnabledByDefault: false,
});

export const RATE_LIMIT_OBSERVABILITY_METADATA: RateLimitObservabilityMetadata = Object.freeze({
  allowedEvent: "rate_limit.allowed",
  softLimitedEvent: "rate_limit.soft_limited",
  hardLimitedEvent: "rate_limit.hard_limited",
  softLimitRateMetric: "rate_limit.soft_limit_rate",
  hardLimitRateMetric: "rate_limit.hard_limit_rate",
  externalExportEnabledByDefault: false,
});

export const ABUSE_OBSERVABILITY_METADATA: AbuseObservabilityMetadata = Object.freeze({
  suspiciousEvent: "abuse.suspicious",
  suspiciousRateMetric: "abuse.suspicious_rate",
  externalExportEnabledByDefault: false,
});

export const QUEUE_OBSERVABILITY_METADATA: QueueObservabilityMetadata = Object.freeze({
  backpressureWarningEvent: "queue.backpressure.warning",
  backpressureRateMetric: "queue.backpressure_rate",
  externalExportEnabledByDefault: false,
});

export const AI_WORKFLOW_OBSERVABILITY_METADATA: AiWorkflowObservabilityMetadata = Object.freeze({
  actionPlannedEvent: "ai.workflow.action.planned",
  usageRateMetric: "ai.workflow.usage_rate",
  externalExportEnabledByDefault: false,
});

export const REALTIME_OBSERVABILITY_METADATA: RealtimeObservabilityMetadata = Object.freeze({
  channelBudgetWarningEvent: "realtime.channel_budget.warning",
  channelBudgetWarningRateMetric: "realtime.channel_budget_warning_rate",
  externalExportEnabledByDefault: false,
});

export const BFF_READ_OBSERVABILITY_EVENT_MAP: Record<BffReadOperation, BffObservabilityMetadata> = Object.freeze({
  "request.proposal.list": BFF_OBSERVABILITY_METADATA,
  "marketplace.catalog.search": BFF_OBSERVABILITY_METADATA,
  "warehouse.ledger.list": BFF_OBSERVABILITY_METADATA,
  "accountant.invoice.list": BFF_OBSERVABILITY_METADATA,
  "director.pending.list": BFF_OBSERVABILITY_METADATA,
});

export const BFF_MUTATION_OBSERVABILITY_EVENT_MAP: Record<BffMutationOperation, BffObservabilityMetadata> = Object.freeze({
  "proposal.submit": BFF_OBSERVABILITY_METADATA,
  "warehouse.receive.apply": BFF_OBSERVABILITY_METADATA,
  "accountant.payment.apply": BFF_OBSERVABILITY_METADATA,
  "director.approval.apply": BFF_OBSERVABILITY_METADATA,
  "request.item.update": BFF_OBSERVABILITY_METADATA,
});

export const CACHE_OBSERVABILITY_EVENT_MAP: Record<CachePolicyRoute, CacheObservabilityMetadata> = Object.freeze({
  "request.proposal.list": CACHE_OBSERVABILITY_METADATA,
  "marketplace.catalog.search": CACHE_OBSERVABILITY_METADATA,
  "warehouse.ledger.list": CACHE_OBSERVABILITY_METADATA,
  "accountant.invoice.list": CACHE_OBSERVABILITY_METADATA,
  "director.pending.list": CACHE_OBSERVABILITY_METADATA,
  "warehouse.stock.page": CACHE_OBSERVABILITY_METADATA,
  "buyer.summary.inbox": CACHE_OBSERVABILITY_METADATA,
  "warehouse.issue.queue": CACHE_OBSERVABILITY_METADATA,
});

export const JOB_OBSERVABILITY_EVENT_MAP: Record<JobType, JobObservabilityMetadata> = Object.freeze({
  "proposal.submit.followup": JOB_OBSERVABILITY_METADATA,
  "warehouse.receive.postprocess": JOB_OBSERVABILITY_METADATA,
  "accountant.payment.postprocess": JOB_OBSERVABILITY_METADATA,
  "director.approval.postprocess": JOB_OBSERVABILITY_METADATA,
  "request.item.update.postprocess": JOB_OBSERVABILITY_METADATA,
  "pdf.document.generate": JOB_OBSERVABILITY_METADATA,
  "director.report.generate": JOB_OBSERVABILITY_METADATA,
  "notification.fanout": JOB_OBSERVABILITY_METADATA,
  "cache.readmodel.refresh": JOB_OBSERVABILITY_METADATA,
  "offline.replay.bridge": JOB_OBSERVABILITY_METADATA,
});

export const IDEMPOTENCY_OBSERVABILITY_EVENT_MAP: Record<IdempotencyPolicyOperation, IdempotencyObservabilityMetadata> = Object.freeze({
  "proposal.submit": IDEMPOTENCY_OBSERVABILITY_METADATA,
  "warehouse.receive.apply": IDEMPOTENCY_OBSERVABILITY_METADATA,
  "accountant.payment.apply": IDEMPOTENCY_OBSERVABILITY_METADATA,
  "director.approval.apply": IDEMPOTENCY_OBSERVABILITY_METADATA,
  "request.item.update": IDEMPOTENCY_OBSERVABILITY_METADATA,
  "offline.replay.bridge": IDEMPOTENCY_OBSERVABILITY_METADATA,
  "proposal.submit.followup": IDEMPOTENCY_OBSERVABILITY_METADATA,
  "warehouse.receive.postprocess": IDEMPOTENCY_OBSERVABILITY_METADATA,
  "accountant.payment.postprocess": IDEMPOTENCY_OBSERVABILITY_METADATA,
  "director.approval.postprocess": IDEMPOTENCY_OBSERVABILITY_METADATA,
});

export const RATE_LIMIT_OBSERVABILITY_EVENT_MAP: Record<RateLimitEnforcementOperation, RateLimitObservabilityMetadata> = Object.freeze({
  "request.proposal.list": RATE_LIMIT_OBSERVABILITY_METADATA,
  "marketplace.catalog.search": RATE_LIMIT_OBSERVABILITY_METADATA,
  "warehouse.ledger.list": RATE_LIMIT_OBSERVABILITY_METADATA,
  "accountant.invoice.list": RATE_LIMIT_OBSERVABILITY_METADATA,
  "director.pending.list": RATE_LIMIT_OBSERVABILITY_METADATA,
  "warehouse.issue.queue": RATE_LIMIT_OBSERVABILITY_METADATA,
  "buyer.summary.inbox": RATE_LIMIT_OBSERVABILITY_METADATA,
  "warehouse.stock.page": RATE_LIMIT_OBSERVABILITY_METADATA,
  "proposal.submit": RATE_LIMIT_OBSERVABILITY_METADATA,
  "warehouse.receive.apply": RATE_LIMIT_OBSERVABILITY_METADATA,
  "accountant.payment.apply": RATE_LIMIT_OBSERVABILITY_METADATA,
  "director.approval.apply": RATE_LIMIT_OBSERVABILITY_METADATA,
  "request.item.update": RATE_LIMIT_OBSERVABILITY_METADATA,
  "notification.fanout": RATE_LIMIT_OBSERVABILITY_METADATA,
  "cache.readmodel.refresh": RATE_LIMIT_OBSERVABILITY_METADATA,
  "offline.replay.bridge": RATE_LIMIT_OBSERVABILITY_METADATA,
  "realtime.channel.setup": RATE_LIMIT_OBSERVABILITY_METADATA,
  "realtime.subscription.refresh": RATE_LIMIT_OBSERVABILITY_METADATA,
  "ai.workflow.action": RATE_LIMIT_OBSERVABILITY_METADATA,
});

export function getScaleObservabilityEventContract(
  eventName: ScaleObservabilityEventName,
): ScaleObservabilityEventContract | null {
  return SCALE_OBSERVABILITY_EVENT_REGISTRY.find((entry) => entry.eventName === eventName) ?? null;
}

export function buildScaleObservabilityEvent(input: {
  eventName: ScaleObservabilityEventName;
  routeOrOperation: string;
  timestamp?: string;
  safeActorScope?: ScaleObservabilityScope;
  safeCompanyScope?: ScaleObservabilityScope;
  durationMs?: number;
  result?: ScaleObservabilityResult;
  reasonCode?: string;
  sampled?: boolean;
}): ScaleObservabilityEvent {
  const contractForEvent = getScaleObservabilityEventContract(input.eventName);
  if (!contractForEvent) {
    throw new Error("Unknown scale observability event");
  }

  return {
    eventName: contractForEvent.eventName,
    category: contractForEvent.category,
    severity: contractForEvent.severity,
    timestamp: input.timestamp ?? new Date(0).toISOString(),
    routeOrOperation: input.routeOrOperation,
    safeActorScope: input.safeActorScope ?? "not_applicable",
    safeCompanyScope: input.safeCompanyScope ?? "not_applicable",
    durationMs: input.durationMs,
    result: input.result ?? contractForEvent.defaultResult,
    reasonCode: input.reasonCode,
    sampled: input.sampled ?? contractForEvent.sampled,
    redacted: true,
  };
}

export function validateScaleObservabilityEventContract(
  contractToValidate: ScaleObservabilityEventContract,
): boolean {
  return (
    SCALE_OBSERVABILITY_EVENT_REGISTRY.some((entry) => entry.eventName === contractToValidate.eventName) &&
    contractToValidate.redacted === true &&
    contractToValidate.externalExportEnabledByDefault === false &&
    typeof contractToValidate.sampled === "boolean"
  );
}
