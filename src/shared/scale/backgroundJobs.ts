import type { BffFlow, BffResponseEnvelope } from "./bffContracts";
import { buildBffError, redactBffText } from "./bffSafety";

export type BackgroundJobStatus = "contract_only" | "shadow_ready" | "active";

export type BackgroundJobPriority = "low" | "normal" | "high";

export type BackgroundJobQueueCategory =
  | "mutation_sensitive"
  | "report_heavy"
  | "cache_refresh"
  | "reconciliation"
  | "notification";

export type BackgroundJobFlow =
  | "proposal.submit.finalize"
  | "warehouse.receive.apply"
  | "accountant.payment.apply"
  | "director.report.build"
  | "pdf.report.render"
  | "cache.read_model.refresh"
  | "marketplace.catalog.reindex"
  | "realtime.channel.reconcile"
  | "notification.digest";

export type BackgroundJobConfig = {
  enabled: boolean;
  shadowMode?: boolean | null;
  queueUrl?: string | null;
};

export type BackgroundJobContract = {
  flow: BackgroundJobFlow;
  sourceBffFlow?: BffFlow;
  queueName: string;
  status: BackgroundJobStatus;
  category: BackgroundJobQueueCategory;
  defaultPriority: BackgroundJobPriority;
  maxAttempts: number;
  maxPayloadBytes: number;
  idempotencyRequired: true;
  payloadPiiAllowed: false;
  ownerApprovalRequiredForProduction: true;
};

export type BackgroundJobPlan = {
  flow: BackgroundJobFlow;
  enabled: boolean;
  shadowMode: boolean;
  queueConfigured: boolean;
  networkExecutionAllowed: false;
  workerExecutionAllowed: false;
};

export type BackgroundJobMetadata = Record<string, string | number | boolean | null | undefined>;

export type BackgroundJobRequest = {
  flow: BackgroundJobFlow;
  priority?: BackgroundJobPriority;
  idempotencyKey?: string | null;
  metadata?: BackgroundJobMetadata;
};

export type BackgroundJobAccepted = {
  jobId: string;
  flow: BackgroundJobFlow;
  queued: boolean;
  priority: BackgroundJobPriority;
};

export type BackgroundJobEnvelope = BffResponseEnvelope<BackgroundJobAccepted>;

export const BACKGROUND_JOB_MAX_ATTEMPTS = 5;
export const BACKGROUND_JOB_DEFAULT_ATTEMPTS = 3;
export const BACKGROUND_JOB_MAX_PAYLOAD_BYTES = 16_384;

const SAFE_METADATA_KEYS = new Set([
  "flow",
  "role",
  "result",
  "error_class",
  "cache_model",
  "consistency",
  "page_size",
  "attempt",
  "dry_run",
]);

export const BACKGROUND_JOB_CONTRACTS: readonly BackgroundJobContract[] = [
  {
    flow: "proposal.submit.finalize",
    sourceBffFlow: "proposal.submit",
    queueName: "proposal_submit_finalize_v1",
    status: "contract_only",
    category: "mutation_sensitive",
    defaultPriority: "high",
    maxAttempts: 3,
    maxPayloadBytes: BACKGROUND_JOB_MAX_PAYLOAD_BYTES,
    idempotencyRequired: true,
    payloadPiiAllowed: false,
    ownerApprovalRequiredForProduction: true,
  },
  {
    flow: "warehouse.receive.apply",
    sourceBffFlow: "warehouse.receive",
    queueName: "warehouse_receive_apply_v1",
    status: "contract_only",
    category: "mutation_sensitive",
    defaultPriority: "high",
    maxAttempts: 3,
    maxPayloadBytes: BACKGROUND_JOB_MAX_PAYLOAD_BYTES,
    idempotencyRequired: true,
    payloadPiiAllowed: false,
    ownerApprovalRequiredForProduction: true,
  },
  {
    flow: "accountant.payment.apply",
    sourceBffFlow: "accountant.payment.apply",
    queueName: "accountant_payment_apply_v1",
    status: "contract_only",
    category: "mutation_sensitive",
    defaultPriority: "high",
    maxAttempts: 3,
    maxPayloadBytes: BACKGROUND_JOB_MAX_PAYLOAD_BYTES,
    idempotencyRequired: true,
    payloadPiiAllowed: false,
    ownerApprovalRequiredForProduction: true,
  },
  {
    flow: "director.report.build",
    sourceBffFlow: "director.dashboard",
    queueName: "director_report_build_v1",
    status: "contract_only",
    category: "report_heavy",
    defaultPriority: "normal",
    maxAttempts: BACKGROUND_JOB_DEFAULT_ATTEMPTS,
    maxPayloadBytes: BACKGROUND_JOB_MAX_PAYLOAD_BYTES,
    idempotencyRequired: true,
    payloadPiiAllowed: false,
    ownerApprovalRequiredForProduction: true,
  },
  {
    flow: "pdf.report.render",
    sourceBffFlow: "pdf.report.request",
    queueName: "pdf_report_render_v1",
    status: "contract_only",
    category: "report_heavy",
    defaultPriority: "normal",
    maxAttempts: BACKGROUND_JOB_DEFAULT_ATTEMPTS,
    maxPayloadBytes: BACKGROUND_JOB_MAX_PAYLOAD_BYTES,
    idempotencyRequired: true,
    payloadPiiAllowed: false,
    ownerApprovalRequiredForProduction: true,
  },
  {
    flow: "cache.read_model.refresh",
    queueName: "cache_read_model_refresh_v1",
    status: "contract_only",
    category: "cache_refresh",
    defaultPriority: "low",
    maxAttempts: BACKGROUND_JOB_DEFAULT_ATTEMPTS,
    maxPayloadBytes: BACKGROUND_JOB_MAX_PAYLOAD_BYTES,
    idempotencyRequired: true,
    payloadPiiAllowed: false,
    ownerApprovalRequiredForProduction: true,
  },
  {
    flow: "marketplace.catalog.reindex",
    sourceBffFlow: "catalog.marketplace.list",
    queueName: "marketplace_catalog_reindex_v1",
    status: "contract_only",
    category: "cache_refresh",
    defaultPriority: "low",
    maxAttempts: BACKGROUND_JOB_DEFAULT_ATTEMPTS,
    maxPayloadBytes: BACKGROUND_JOB_MAX_PAYLOAD_BYTES,
    idempotencyRequired: true,
    payloadPiiAllowed: false,
    ownerApprovalRequiredForProduction: true,
  },
  {
    flow: "realtime.channel.reconcile",
    sourceBffFlow: "realtime.channel.lifecycle",
    queueName: "realtime_channel_reconcile_v1",
    status: "contract_only",
    category: "reconciliation",
    defaultPriority: "normal",
    maxAttempts: 2,
    maxPayloadBytes: BACKGROUND_JOB_MAX_PAYLOAD_BYTES,
    idempotencyRequired: true,
    payloadPiiAllowed: false,
    ownerApprovalRequiredForProduction: true,
  },
  {
    flow: "notification.digest",
    queueName: "notification_digest_v1",
    status: "contract_only",
    category: "notification",
    defaultPriority: "low",
    maxAttempts: 2,
    maxPayloadBytes: BACKGROUND_JOB_MAX_PAYLOAD_BYTES,
    idempotencyRequired: true,
    payloadPiiAllowed: false,
    ownerApprovalRequiredForProduction: true,
  },
] as const;

export function isBackgroundJobBoundaryEnabled(config: BackgroundJobConfig): boolean {
  return config.enabled === true && config.shadowMode === true && typeof config.queueUrl === "string" && config.queueUrl.trim().length > 0;
}

export function buildBackgroundJobPlan(config: BackgroundJobConfig, flow: BackgroundJobFlow): BackgroundJobPlan {
  return {
    flow,
    enabled: isBackgroundJobBoundaryEnabled(config),
    shadowMode: config.shadowMode === true,
    queueConfigured: typeof config.queueUrl === "string" && config.queueUrl.trim().length > 0,
    networkExecutionAllowed: false,
    workerExecutionAllowed: false,
  };
}

export function clampBackgroundJobAttempts(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return BACKGROUND_JOB_DEFAULT_ATTEMPTS;
  return Math.min(Math.max(Math.trunc(parsed), 1), BACKGROUND_JOB_MAX_ATTEMPTS);
}

export function sanitizeBackgroundJobMetadata(metadata?: BackgroundJobMetadata): Record<string, string | number | boolean | null> {
  const safe: Record<string, string | number | boolean | null> = {};
  if (!metadata) return safe;

  for (const [key, value] of Object.entries(metadata)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!SAFE_METADATA_KEYS.has(normalizedKey) || value === undefined) continue;
    safe[normalizedKey] = typeof value === "string" ? redactBffText(value) : value;
  }

  return safe;
}

export function buildBackgroundJobError(code: string, message: unknown): BackgroundJobEnvelope {
  return {
    ok: false,
    error: buildBffError(code, message),
  };
}

export async function enqueueBackgroundJobDisabled(request: BackgroundJobRequest): Promise<BackgroundJobEnvelope> {
  void sanitizeBackgroundJobMetadata(request.metadata);
  return buildBackgroundJobError("BACKGROUND_JOB_DISABLED", "Background job boundary is disabled");
}
