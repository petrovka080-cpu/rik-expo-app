import type { BffMutationOperation } from "./bffMutationHandlers";
import type { BffReadOperation } from "./bffReadHandlers";
import type { JobType } from "./jobPolicies";
import {
  RATE_LIMIT_OBSERVABILITY_EVENT_MAP,
  type RateLimitObservabilityMetadata,
} from "./scaleObservabilityEvents";

export type RateLimitPolicyScope = "actor" | "company" | "route" | "ip_or_device" | "global";

export type RateLimitPolicySeverity = "low" | "medium" | "high" | "critical";

export type RateLimitPolicyCategory = "read" | "mutation" | "job" | "realtime" | "ai";

export type RateLimitEnforcementOperation =
  | BffReadOperation
  | "warehouse.issue.queue"
  | "buyer.summary.inbox"
  | "warehouse.stock.page"
  | BffMutationOperation
  | "notification.fanout"
  | "cache.readmodel.refresh"
  | "offline.replay.bridge"
  | "realtime.channel.setup"
  | "realtime.subscription.refresh"
  | "ai.workflow.action";

export type RateEnforcementPolicy = {
  operation: RateLimitEnforcementOperation;
  category: RateLimitPolicyCategory;
  scope: RateLimitPolicyScope;
  secondaryScopes: readonly RateLimitPolicyScope[];
  windowMs: number;
  maxRequests: number;
  burst: number;
  cooldownMs: number;
  severity: RateLimitPolicySeverity;
  actorKeyRequired: boolean;
  companyKeyRequired: boolean;
  idempotencyKeyRequiredForMutations: boolean;
  piiSafeKey: true;
  defaultEnabled: false;
  enforcementEnabledByDefault: false;
  externalStoreRequiredForLiveEnforcement: true;
  observability: RateLimitObservabilityMetadata;
};

const MINUTE_MS = 60_000;

export const BFF_READ_RATE_LIMIT_OPERATIONS: readonly BffReadOperation[] = Object.freeze([
  "request.proposal.list",
  "marketplace.catalog.search",
  "warehouse.ledger.list",
  "accountant.invoice.list",
  "director.pending.list",
]);

export const LOAD_HOTSPOT_RATE_LIMIT_OPERATIONS = Object.freeze([
  "warehouse.issue.queue",
  "buyer.summary.inbox",
  "warehouse.stock.page",
] as const);

export const BFF_MUTATION_RATE_LIMIT_OPERATIONS: readonly BffMutationOperation[] = Object.freeze([
  "proposal.submit",
  "warehouse.receive.apply",
  "accountant.payment.apply",
  "director.approval.apply",
  "request.item.update",
]);

export const JOB_RATE_LIMIT_OPERATIONS = Object.freeze([
  "notification.fanout",
  "cache.readmodel.refresh",
  "offline.replay.bridge",
] as const);

export const REALTIME_RATE_LIMIT_OPERATIONS = Object.freeze([
  "realtime.channel.setup",
  "realtime.subscription.refresh",
] as const);

export const AI_RATE_LIMIT_OPERATIONS = Object.freeze(["ai.workflow.action"] as const);

const policy = (value: Omit<RateEnforcementPolicy, "piiSafeKey" | "defaultEnabled" | "enforcementEnabledByDefault" | "externalStoreRequiredForLiveEnforcement" | "observability">): RateEnforcementPolicy =>
  Object.freeze({
    ...value,
    piiSafeKey: true,
    defaultEnabled: false,
    enforcementEnabledByDefault: false,
    externalStoreRequiredForLiveEnforcement: true,
    observability: RATE_LIMIT_OBSERVABILITY_EVENT_MAP[value.operation],
  });

export const RATE_ENFORCEMENT_POLICY_REGISTRY: readonly RateEnforcementPolicy[] = Object.freeze([
  policy({
    operation: "request.proposal.list",
    category: "read",
    scope: "company",
    secondaryScopes: ["actor", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 90,
    burst: 20,
    cooldownMs: 15_000,
    severity: "medium",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: false,
  }),
  policy({
    operation: "marketplace.catalog.search",
    category: "read",
    scope: "ip_or_device",
    secondaryScopes: ["company", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 120,
    burst: 25,
    cooldownMs: 10_000,
    severity: "medium",
    actorKeyRequired: false,
    companyKeyRequired: false,
    idempotencyKeyRequiredForMutations: false,
  }),
  policy({
    operation: "warehouse.ledger.list",
    category: "read",
    scope: "company",
    secondaryScopes: ["actor", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 70,
    burst: 15,
    cooldownMs: 20_000,
    severity: "high",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: false,
  }),
  policy({
    operation: "accountant.invoice.list",
    category: "read",
    scope: "company",
    secondaryScopes: ["actor", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 50,
    burst: 10,
    cooldownMs: 30_000,
    severity: "high",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: false,
  }),
  policy({
    operation: "director.pending.list",
    category: "read",
    scope: "company",
    secondaryScopes: ["actor", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 80,
    burst: 15,
    cooldownMs: 20_000,
    severity: "medium",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: false,
  }),
  policy({
    operation: "warehouse.issue.queue",
    category: "read",
    scope: "company",
    secondaryScopes: ["actor", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 40,
    burst: 8,
    cooldownMs: 30_000,
    severity: "high",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: false,
  }),
  policy({
    operation: "buyer.summary.inbox",
    category: "read",
    scope: "company",
    secondaryScopes: ["actor", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 60,
    burst: 12,
    cooldownMs: 20_000,
    severity: "high",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: false,
  }),
  policy({
    operation: "warehouse.stock.page",
    category: "read",
    scope: "company",
    secondaryScopes: ["actor", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 45,
    burst: 8,
    cooldownMs: 15_000,
    severity: "high",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: false,
  }),
  policy({
    operation: "proposal.submit",
    category: "mutation",
    scope: "actor",
    secondaryScopes: ["company", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 20,
    burst: 4,
    cooldownMs: 30_000,
    severity: "critical",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: true,
  }),
  policy({
    operation: "warehouse.receive.apply",
    category: "mutation",
    scope: "actor",
    secondaryScopes: ["company", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 20,
    burst: 4,
    cooldownMs: 30_000,
    severity: "critical",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: true,
  }),
  policy({
    operation: "accountant.payment.apply",
    category: "mutation",
    scope: "actor",
    secondaryScopes: ["company", "route"],
    windowMs: 5 * MINUTE_MS,
    maxRequests: 8,
    burst: 1,
    cooldownMs: 120_000,
    severity: "critical",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: true,
  }),
  policy({
    operation: "director.approval.apply",
    category: "mutation",
    scope: "actor",
    secondaryScopes: ["company", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 20,
    burst: 4,
    cooldownMs: 30_000,
    severity: "critical",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: true,
  }),
  policy({
    operation: "request.item.update",
    category: "mutation",
    scope: "actor",
    secondaryScopes: ["company", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 25,
    burst: 5,
    cooldownMs: 30_000,
    severity: "high",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: true,
  }),
  policy({
    operation: "notification.fanout",
    category: "job",
    scope: "company",
    secondaryScopes: ["actor", "global"],
    windowMs: 5 * MINUTE_MS,
    maxRequests: 5,
    burst: 1,
    cooldownMs: 120_000,
    severity: "critical",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: false,
  }),
  policy({
    operation: "cache.readmodel.refresh",
    category: "job",
    scope: "global",
    secondaryScopes: ["route"],
    windowMs: 5 * MINUTE_MS,
    maxRequests: 10,
    burst: 2,
    cooldownMs: 60_000,
    severity: "high",
    actorKeyRequired: false,
    companyKeyRequired: false,
    idempotencyKeyRequiredForMutations: false,
  }),
  policy({
    operation: "offline.replay.bridge",
    category: "job",
    scope: "actor",
    secondaryScopes: ["ip_or_device", "route"],
    windowMs: MINUTE_MS,
    maxRequests: 10,
    burst: 2,
    cooldownMs: 60_000,
    severity: "critical",
    actorKeyRequired: true,
    companyKeyRequired: false,
    idempotencyKeyRequiredForMutations: true,
  }),
  policy({
    operation: "realtime.channel.setup",
    category: "realtime",
    scope: "actor",
    secondaryScopes: ["company", "ip_or_device"],
    windowMs: MINUTE_MS,
    maxRequests: 30,
    burst: 5,
    cooldownMs: 20_000,
    severity: "high",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: false,
  }),
  policy({
    operation: "realtime.subscription.refresh",
    category: "realtime",
    scope: "actor",
    secondaryScopes: ["company", "ip_or_device"],
    windowMs: MINUTE_MS,
    maxRequests: 60,
    burst: 10,
    cooldownMs: 15_000,
    severity: "medium",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: false,
  }),
  policy({
    operation: "ai.workflow.action",
    category: "ai",
    scope: "actor",
    secondaryScopes: ["company", "route"],
    windowMs: 5 * MINUTE_MS,
    maxRequests: 5,
    burst: 1,
    cooldownMs: 120_000,
    severity: "critical",
    actorKeyRequired: true,
    companyKeyRequired: true,
    idempotencyKeyRequiredForMutations: false,
  }),
] as const);

export const BFF_READ_RATE_ENFORCEMENT_POLICY_MAP: Record<BffReadOperation, RateLimitEnforcementOperation> = Object.freeze({
  "request.proposal.list": "request.proposal.list",
  "marketplace.catalog.search": "marketplace.catalog.search",
  "warehouse.ledger.list": "warehouse.ledger.list",
  "accountant.invoice.list": "accountant.invoice.list",
  "director.pending.list": "director.pending.list",
});

export const BFF_MUTATION_RATE_ENFORCEMENT_POLICY_MAP: Record<BffMutationOperation, RateLimitEnforcementOperation> = Object.freeze({
  "proposal.submit": "proposal.submit",
  "warehouse.receive.apply": "warehouse.receive.apply",
  "accountant.payment.apply": "accountant.payment.apply",
  "director.approval.apply": "director.approval.apply",
  "request.item.update": "request.item.update",
});

export const JOB_RATE_ENFORCEMENT_POLICY_MAP: Partial<Record<JobType, RateLimitEnforcementOperation>> = Object.freeze({
  "proposal.submit.followup": "proposal.submit",
  "warehouse.receive.postprocess": "warehouse.receive.apply",
  "accountant.payment.postprocess": "accountant.payment.apply",
  "director.approval.postprocess": "director.approval.apply",
  "request.item.update.postprocess": "request.item.update",
  "notification.fanout": "notification.fanout",
  "cache.readmodel.refresh": "cache.readmodel.refresh",
  "offline.replay.bridge": "offline.replay.bridge",
});

export function getRateEnforcementPolicy(
  operation: RateLimitEnforcementOperation,
): RateEnforcementPolicy | null {
  return RATE_ENFORCEMENT_POLICY_REGISTRY.find((entry) => entry.operation === operation) ?? null;
}

export function getRateEnforcementPoliciesByCategory(
  category: RateLimitPolicyCategory,
): readonly RateEnforcementPolicy[] {
  return RATE_ENFORCEMENT_POLICY_REGISTRY.filter((entry) => entry.category === category);
}

export function getRateEnforcementPolicyForBffReadOperation(
  operation: BffReadOperation,
): RateEnforcementPolicy | null {
  return getRateEnforcementPolicy(BFF_READ_RATE_ENFORCEMENT_POLICY_MAP[operation]);
}

export function getRateEnforcementPolicyForBffMutationOperation(
  operation: BffMutationOperation,
): RateEnforcementPolicy | null {
  return getRateEnforcementPolicy(BFF_MUTATION_RATE_ENFORCEMENT_POLICY_MAP[operation]);
}

export function getRateEnforcementPolicyForJobType(jobType: JobType): RateEnforcementPolicy | null {
  const operation = JOB_RATE_ENFORCEMENT_POLICY_MAP[jobType];
  return operation ? getRateEnforcementPolicy(operation) : null;
}

export function validateRateEnforcementPolicy(policyToValidate: RateEnforcementPolicy): boolean {
  return (
    RATE_ENFORCEMENT_POLICY_REGISTRY.some((entry) => entry.operation === policyToValidate.operation) &&
    policyToValidate.windowMs > 0 &&
    Number.isInteger(policyToValidate.windowMs) &&
    policyToValidate.maxRequests > 0 &&
    Number.isInteger(policyToValidate.maxRequests) &&
    policyToValidate.burst > 0 &&
    Number.isInteger(policyToValidate.burst) &&
    policyToValidate.burst <= policyToValidate.maxRequests &&
    policyToValidate.cooldownMs >= 0 &&
    Number.isInteger(policyToValidate.cooldownMs) &&
    policyToValidate.piiSafeKey === true &&
    policyToValidate.defaultEnabled === false &&
    policyToValidate.enforcementEnabledByDefault === false &&
    policyToValidate.externalStoreRequiredForLiveEnforcement === true &&
    (policyToValidate.category !== "mutation" || policyToValidate.idempotencyKeyRequiredForMutations === true)
  );
}
