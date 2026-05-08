import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "../database.types";
import {
  DEFAULT_QUEUE_WORKER_COMPACTION_DELAY_MS,
  DEFAULT_QUEUE_WORKER_CONCURRENCY,
  DEFAULT_SUBMIT_JOB_CLAIM_LIMIT,
  resolveQueueWorkerCompactionDelayMs,
  resolveQueueWorkerConfiguredConcurrency,
  resolveSubmitJobClaimLimit,
} from "../../workers/queueWorker.limits";
import {
  isRpcNumberLike,
  isRpcRecord as isRpcObjectRecord,
  isRpcVoidResponse,
  validateRpcResponse,
} from "../api/queryBoundary";
import { jobQueueSupabaseClient } from "./jobQueue.transport";

export type SubmitJobStatus = "pending" | "processing" | "completed" | "failed";

export type EnqueueSubmitJobInput = {
  jobType: string;
  entityType?: string | null;
  entityId?: string | null;
  entityKey?: string | null;
  payload?: Record<string, unknown> | null;
  clientRequestId?: string | null;
};

export type SubmitJobRow = {
  id: string;
  client_request_id: string | null;
  job_type: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_key: string | null;
  payload: Record<string, unknown> | null;
  status: SubmitJobStatus;
  retry_count: number;
  error: string | null;
  created_by: string | null;
  created_at: string;
  started_at: string | null;
  worker_id: string | null;
  next_retry_at: string | null;
  locked_until: string | null;
  processed_at: string | null;
};

export type SubmitJobMetrics = {
  pending: number;
  processing: number;
  failed: number;
  oldest_pending: string | null;
};

type SubmitJobsTableRow = Database["public"]["Tables"]["submit_jobs"]["Row"] & {
  created_by?: string | null;
};
type SubmitJobsInsert = Database["public"]["Tables"]["submit_jobs"]["Insert"];
type SubmitJobsClaimRpcArgs =
  Database["public"]["Functions"]["submit_jobs_claim"]["Args"];
type SubmitJobsClaimRpcRow =
  Database["public"]["Functions"]["submit_jobs_claim"]["Returns"][number];
type SubmitJobsRecoverStuckRpcReturns =
  Database["public"]["Functions"]["submit_jobs_recover_stuck"]["Returns"];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type SubmitJobsMarkCompletedRpcArgs =
  Database["public"]["Functions"]["submit_jobs_mark_completed"]["Args"];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type SubmitJobsMarkFailedRpcArgs =
  Database["public"]["Functions"]["submit_jobs_mark_failed"]["Args"];
type SubmitJobsMetricsRpcRow =
  Database["public"]["Functions"]["submit_jobs_metrics"]["Returns"][number];
type SubmitJobsClaimLegacyArgs = {
  p_worker_id: string;
  p_limit: number;
  p_job_type?: string | null;
};
type SubmitJobsMarkCompletedLegacyArgs = { p_job_id: string };
type SubmitJobsMarkFailedLegacyArgs = { p_job_id: string; p_error: string };
type SubmitJobsMarkFailedRpcRow = {
  retry_count?: number | string | null;
  status?: string | null;
  next_retry_at?: string | null;
};
type QueueRpcError = {
  message?: string | null;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  status?: number | string | null;
  statusCode?: number | string | null;
};

type SubmitJobsRpcCompatBoundary = {
  rpc(
    fn: "submit_jobs_claim",
    args: SubmitJobsClaimLegacyArgs,
  ): Promise<{
    data: SubmitJobsClaimRpcRow[] | null;
    error: QueueRpcError | null;
  }>;
  rpc(
    fn: "submit_jobs_mark_completed",
    args: SubmitJobsMarkCompletedLegacyArgs,
  ): Promise<{ data: null; error: QueueRpcError | null }>;
  rpc(
    fn: "submit_jobs_mark_failed",
    args: SubmitJobsMarkFailedLegacyArgs,
  ): Promise<{
    data: SubmitJobsMarkFailedRpcRow[] | SubmitJobsMarkFailedRpcRow | null;
    error: QueueRpcError | null;
  }>;
};
export type JobQueueSupabaseClient = Pick<
  SupabaseClient<Database>,
  "from" | "rpc"
>;

const toQueueRpcCompat = (queueClient: JobQueueSupabaseClient) =>
  queueClient as unknown as SubmitJobsRpcCompatBoundary;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getStringOrNull = (value: unknown): string | null => {
  if (value == null) return null;
  return String(value);
};

const getNumberOrDefault = (value: unknown, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const getJsonRecordOrNull = (
  value: Json | null | undefined,
): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const parseSubmitJobsTableRow = (value: unknown): SubmitJobsTableRow | null => {
  if (!isRecord(value)) return null;
  const payload =
    "payload" in value ? (value.payload as Json | null | undefined) : null;
  return {
    id: String(value.id ?? ""),
    client_request_id: getStringOrNull(value.client_request_id),
    created_at: getStringOrNull(value.created_at),
    entity_id: getStringOrNull(value.entity_id),
    entity_key: getStringOrNull(value.entity_key),
    entity_type: getStringOrNull(value.entity_type),
    error: getStringOrNull(value.error),
    job_type: String(value.job_type ?? ""),
    locked_until: getStringOrNull(value.locked_until),
    next_retry_at: getStringOrNull(value.next_retry_at),
    payload: payload ?? null,
    processed_at: getStringOrNull(value.processed_at),
    retry_count: getNumberOrDefault(value.retry_count, 0),
    started_at: getStringOrNull(value.started_at),
    status: String(value.status ?? ""),
    worker_id: getStringOrNull(value.worker_id),
    created_by: getStringOrNull(value.created_by),
  };
};

function normalizeSubmitJobRow(value: unknown): SubmitJobRow {
  const row = parseSubmitJobsTableRow(value);
  return {
    id: row?.id ?? "",
    client_request_id: row?.client_request_id ?? null,
    job_type: row?.job_type ?? "",
    entity_type: row?.entity_type ?? null,
    entity_id: row?.entity_id ?? null,
    entity_key: row?.entity_key ?? null,
    payload: row ? getJsonRecordOrNull(row.payload) : null,
    status: (row?.status ?? "failed") as SubmitJobStatus,
    retry_count: row?.retry_count ?? 0,
    error: row?.error ?? null,
    created_by: row?.created_by ?? null,
    created_at: row?.created_at ?? "",
    started_at: row?.started_at ?? null,
    worker_id: row?.worker_id ?? null,
    next_retry_at: row?.next_retry_at ?? null,
    locked_until: row?.locked_until ?? null,
    processed_at: row?.processed_at ?? null,
  };
}

function normalizeSubmitJobRows(value: unknown): SubmitJobRow[] {
  return Array.isArray(value)
    ? value.map(normalizeSubmitJobRow).filter((row) => row.id)
    : [];
}

const parseSubmitJobFailedRpcResult = (
  value: unknown,
): { retryCount: number; status: string } => {
  const row = Array.isArray(value)
    ? value.length > 0
      ? value[0]
      : null
    : value;
  if (!isRecord(row)) {
    return { retryCount: 0, status: "failed" };
  }
  return {
    retryCount: getNumberOrDefault(row.retry_count, 0),
    status: String(row.status ?? "failed"),
  };
};

const parseSubmitJobMetricsRow = (value: unknown): SubmitJobMetrics => {
  const row = Array.isArray(value)
    ? value.length > 0
      ? value[0]
      : null
    : value;
  if (!isRecord(row)) {
    return { pending: 0, processing: 0, failed: 0, oldest_pending: null };
  }
  const typedRow = row as Partial<SubmitJobsMetricsRpcRow>;
  return {
    pending: getNumberOrDefault(typedRow.pending, 0),
    processing: getNumberOrDefault(typedRow.processing, 0),
    failed: getNumberOrDefault(typedRow.failed, 0),
    oldest_pending: getStringOrNull(typedRow.oldest_pending),
  };
};

const isSubmitJobStatusValue = (value: unknown): value is SubmitJobStatus =>
  value === "pending" ||
  value === "processing" ||
  value === "completed" ||
  value === "failed";

export const isSubmitJobsClaimRpcResponse = (
  value: unknown,
): value is SubmitJobsClaimRpcRow[] =>
  Array.isArray(value) &&
  value.every((row) =>
    isRpcObjectRecord(row) &&
    typeof row.id === "string" &&
    row.id.trim().length > 0 &&
    typeof row.job_type === "string" &&
    row.job_type.trim().length > 0 &&
    isSubmitJobStatusValue(row.status),
  );

export const isSubmitJobsRecoverStuckRpcResponse = (
  value: unknown,
): value is SubmitJobsRecoverStuckRpcReturns => isRpcNumberLike(value);

export const isSubmitJobsMarkCompletedRpcResponse = (
  value: unknown,
): value is null | undefined => isRpcVoidResponse(value);

const isSubmitJobsMarkFailedRow = (
  value: unknown,
): value is SubmitJobsMarkFailedRpcRow =>
  isRpcObjectRecord(value) &&
  isRpcNumberLike(value.retry_count) &&
  typeof value.status === "string" &&
  value.status.trim().length > 0 &&
  (value.next_retry_at == null || typeof value.next_retry_at === "string");

export const isSubmitJobsMarkFailedRpcResponse = (
  value: unknown,
): value is SubmitJobsMarkFailedRpcRow[] | SubmitJobsMarkFailedRpcRow | null =>
  value == null ||
  isSubmitJobsMarkFailedRow(value) ||
  (Array.isArray(value) && value.every(isSubmitJobsMarkFailedRow));

const isSubmitJobsMetricsRow = (value: unknown): value is Partial<SubmitJobsMetricsRpcRow> =>
  isRpcObjectRecord(value) &&
  isRpcNumberLike(value.pending) &&
  isRpcNumberLike(value.processing) &&
  isRpcNumberLike(value.failed) &&
  (value.oldest_pending == null || typeof value.oldest_pending === "string");

export const isSubmitJobsMetricsRpcResponse = (
  value: unknown,
): value is SubmitJobsMetricsRpcRow[] | SubmitJobsMetricsRpcRow =>
  isSubmitJobsMetricsRow(value) ||
  (Array.isArray(value) && value.every(isSubmitJobsMetricsRow));

const rpcErrorText = (error: QueueRpcError | null | undefined) => {
  if (!error) return "";
  return [
    error.message,
    error.code,
    error.details,
    error.hint,
    error.status,
    error.statusCode,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ");
};

const isMissingOrIncompatibleRpcError = (
  fn: string,
  error: QueueRpcError | null | undefined,
) => {
  const haystack = rpcErrorText(error).toLowerCase();
  if (!haystack) return false;
  return (
    haystack.includes("pgrst202") ||
    haystack.includes("schema cache") ||
    haystack.includes("could not find") ||
    haystack.includes("not found") ||
    haystack.includes("function not found") ||
    haystack.includes("404") ||
    (haystack.includes(fn.toLowerCase()) && haystack.includes("function"))
  );
};

const queueInfraError = (scope: string, error: QueueRpcError | null) =>
  new Error(`${scope}: ${rpcErrorText(error) || "unknown"}`);

const queueRpcRequiredError = (
  scope: string,
  fn: string,
  error: QueueRpcError | null,
) =>
  new Error(
    `${scope}: ${fn} RPC is required; client-side submit_jobs mutation fallback is disabled (${rpcErrorText(error) || "unknown"})`,
  );

const toBool = (value: unknown): boolean => {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
};

const JOB_QUEUE_ENABLED_RAW = process.env.EXPO_PUBLIC_JOB_QUEUE_ENABLED;
const IS_DEV_RUNTIME =
  (typeof globalThis !== "undefined" &&
    (globalThis as { __DEV__?: unknown }).__DEV__ === true) ||
  process.env.NODE_ENV !== "production";

export const JOB_QUEUE_ENABLED = toBool(JOB_QUEUE_ENABLED_RAW ?? "false");

if (IS_DEV_RUNTIME) {
  if (__DEV__)
    console.info("[jobQueue.env]", {
      EXPO_PUBLIC_JOB_QUEUE_ENABLED: JOB_QUEUE_ENABLED_RAW ?? null,
      JOB_QUEUE_ENABLED,
    });
}

export const WORKER_CONCURRENCY = resolveQueueWorkerConfiguredConcurrency(
  process.env.EXPO_PUBLIC_WORKER_CONCURRENCY ?? process.env.WORKER_CONCURRENCY,
  DEFAULT_QUEUE_WORKER_CONCURRENCY,
);
export const WORKER_BATCH_SIZE = resolveSubmitJobClaimLimit(
  process.env.EXPO_PUBLIC_WORKER_BATCH_SIZE ?? process.env.WORKER_BATCH_SIZE,
  DEFAULT_SUBMIT_JOB_CLAIM_LIMIT,
);
export const COMPACTION_DELAY_MS = resolveQueueWorkerCompactionDelayMs(
  process.env.EXPO_PUBLIC_COMPACTION_DELAY_MS ??
    process.env.COMPACTION_DELAY_MS,
  DEFAULT_QUEUE_WORKER_COMPACTION_DELAY_MS,
);

const JOB_SELECT =
  "id,client_request_id,job_type,entity_type,entity_id,entity_key,payload,status,retry_count,error,created_at,started_at,worker_id,next_retry_at,locked_until,processed_at";

const buildSubmitJobInsert = (
  input: EnqueueSubmitJobInput,
): SubmitJobsInsert => ({
  client_request_id: input.clientRequestId ?? null,
  job_type: String(input.jobType || "").trim(),
  entity_type: input.entityType ?? null,
  entity_id: input.entityId ?? null,
  entity_key: input.entityKey ?? input.entityId ?? null,
  payload: (input.payload ?? {}) as Json,
  status: "pending",
});

const buildSubmitJobsClaimArgs = (
  workerId: string,
  limit: number,
): SubmitJobsClaimRpcArgs => ({
  p_worker: workerId,
  p_limit: limit,
});

const buildSubmitJobsClaimLegacyArgs = (
  workerId: string,
  limit: number,
  jobType?: string,
): SubmitJobsClaimLegacyArgs => ({
  p_worker_id: workerId,
  p_limit: limit,
  p_job_type: jobType ?? null,
});

async function enqueueSubmitJobWithClient(
  queueClient: JobQueueSupabaseClient,
  input: EnqueueSubmitJobInput,
): Promise<SubmitJobRow> {
  const payload = buildSubmitJobInsert(input);

  if (!payload.job_type) {
    throw new Error("enqueueSubmitJob: jobType is required");
  }

  const { data, error } = await queueClient
    .from("submit_jobs")
    .insert(payload)
    .select(JOB_SELECT)
    .single();

  if (error) throw error;
  return normalizeSubmitJobRow(data);
}

async function claimSubmitJobsWithClient(
  queueClient: JobQueueSupabaseClient,
  workerId: string,
  limit = WORKER_BATCH_SIZE,
  jobType?: string,
): Promise<SubmitJobRow[]> {
  const normalizedLimit = resolveSubmitJobClaimLimit(limit, WORKER_BATCH_SIZE);
  const queueRpcCompat = toQueueRpcCompat(queueClient);
  const primary = await queueClient.rpc(
    "submit_jobs_claim",
    buildSubmitJobsClaimArgs(workerId, normalizedLimit),
  );
  if (!primary.error) {
    const validated = validateRpcResponse(primary.data, isSubmitJobsClaimRpcResponse, {
      rpcName: "submit_jobs_claim",
      caller: "claimSubmitJobsWithClient.primary",
      domain: "unknown",
    });
    return normalizeSubmitJobRows(validated);
  }

  if (!isMissingOrIncompatibleRpcError("submit_jobs_claim", primary.error)) {
    throw primary.error;
  }

  const primaryMsg = String(primary.error.message || "");
  const tryLegacyCompat =
    primaryMsg.includes("submit_jobs_claim") &&
    (primaryMsg.includes("p_worker") || primaryMsg.includes("schema cache"));

  if (tryLegacyCompat) {
    const legacy = await queueRpcCompat.rpc(
      "submit_jobs_claim",
      buildSubmitJobsClaimLegacyArgs(workerId, normalizedLimit, jobType),
    );
    if (!legacy.error) {
      const validated = validateRpcResponse(legacy.data, isSubmitJobsClaimRpcResponse, {
        rpcName: "submit_jobs_claim",
        caller: "claimSubmitJobsWithClient.legacy",
        domain: "unknown",
      });
      return normalizeSubmitJobRows(validated);
    }

    if (!isMissingOrIncompatibleRpcError("submit_jobs_claim", legacy.error)) {
      throw legacy.error;
    }

    throw queueRpcRequiredError(
      "claimSubmitJobs",
      "submit_jobs_claim",
      legacy.error,
    );
  }

  throw queueRpcRequiredError(
    "claimSubmitJobs",
    "submit_jobs_claim",
    primary.error,
  );
}

async function recoverStuckSubmitJobsWithClient(
  queueClient: JobQueueSupabaseClient,
): Promise<number> {
  const { data, error } = await queueClient.rpc("submit_jobs_recover_stuck");
  if (error) throw queueInfraError("recoverStuckSubmitJobs", error);
  return getNumberOrDefault(validateRpcResponse(data, isSubmitJobsRecoverStuckRpcResponse, {
    rpcName: "submit_jobs_recover_stuck",
    caller: "recoverStuckSubmitJobsWithClient",
    domain: "unknown",
  }), 0);
}

async function markSubmitJobCompletedWithClient(
  queueClient: JobQueueSupabaseClient,
  jobId: string,
): Promise<void> {
  const queueRpcCompat = toQueueRpcCompat(queueClient);
  const first = await queueClient.rpc("submit_jobs_mark_completed", {
    p_id: jobId,
  });
  if (!first.error) {
    validateRpcResponse(first.data, isSubmitJobsMarkCompletedRpcResponse, {
      rpcName: "submit_jobs_mark_completed",
      caller: "markSubmitJobCompletedWithClient.primary",
      domain: "unknown",
    });
    return;
  }

  if (
    !isMissingOrIncompatibleRpcError("submit_jobs_mark_completed", first.error)
  ) {
    throw queueInfraError("markSubmitJobCompleted.rpc", first.error);
  }

  const legacy = await queueRpcCompat.rpc("submit_jobs_mark_completed", {
    p_job_id: jobId,
  });
  if (!legacy.error) {
    validateRpcResponse(legacy.data, isSubmitJobsMarkCompletedRpcResponse, {
      rpcName: "submit_jobs_mark_completed",
      caller: "markSubmitJobCompletedWithClient.legacy",
      domain: "unknown",
    });
    return;
  }

  if (
    !isMissingOrIncompatibleRpcError("submit_jobs_mark_completed", legacy.error)
  ) {
    throw queueInfraError("markSubmitJobCompleted.legacyRpc", legacy.error);
  }

  throw queueRpcRequiredError(
    "markSubmitJobCompleted",
    "submit_jobs_mark_completed",
    legacy.error,
  );
}

async function markSubmitJobFailedWithClient(
  queueClient: JobQueueSupabaseClient,
  jobId: string,
  message: string,
): Promise<{ retryCount: number; status: string }> {
  const queueRpcCompat = toQueueRpcCompat(queueClient);
  const first = await queueClient.rpc("submit_jobs_mark_failed", {
    p_id: jobId,
    p_error: message,
  });
  if (!first.error) {
    const validated = validateRpcResponse(first.data, isSubmitJobsMarkFailedRpcResponse, {
      rpcName: "submit_jobs_mark_failed",
      caller: "markSubmitJobFailedWithClient.primary",
      domain: "unknown",
    });
    return parseSubmitJobFailedRpcResult(validated);
  }

  if (
    !isMissingOrIncompatibleRpcError("submit_jobs_mark_failed", first.error)
  ) {
    throw queueInfraError("markSubmitJobFailed.rpc", first.error);
  }

  const legacy = await queueRpcCompat.rpc("submit_jobs_mark_failed", {
    p_job_id: jobId,
    p_error: message,
  });
  if (!legacy.error) {
    const validated = validateRpcResponse(legacy.data, isSubmitJobsMarkFailedRpcResponse, {
      rpcName: "submit_jobs_mark_failed",
      caller: "markSubmitJobFailedWithClient.legacy",
      domain: "unknown",
    });
    return parseSubmitJobFailedRpcResult(validated);
  }

  if (
    !isMissingOrIncompatibleRpcError("submit_jobs_mark_failed", legacy.error)
  ) {
    throw queueInfraError("markSubmitJobFailed.legacyRpc", legacy.error);
  }

  throw queueRpcRequiredError(
    "markSubmitJobFailed",
    "submit_jobs_mark_failed",
    legacy.error,
  );
}

async function fetchSubmitJobMetricsWithClient(
  queueClient: JobQueueSupabaseClient,
): Promise<SubmitJobMetrics> {
  const { data, error } = await queueClient.rpc("submit_jobs_metrics");
  if (error) throw error;
  return parseSubmitJobMetricsRow(validateRpcResponse(data, isSubmitJobsMetricsRpcResponse, {
    rpcName: "submit_jobs_metrics",
    caller: "fetchSubmitJobMetricsWithClient",
    domain: "unknown",
  }));
}

export function createJobQueueApi(queueClient: JobQueueSupabaseClient) {
  return {
    enqueueSubmitJob: (input: EnqueueSubmitJobInput) =>
      enqueueSubmitJobWithClient(queueClient, input),
    claimSubmitJobs: (
      workerId: string,
      limit = WORKER_BATCH_SIZE,
      jobType?: string,
    ) => claimSubmitJobsWithClient(queueClient, workerId, limit, jobType),
    recoverStuckSubmitJobs: () =>
      recoverStuckSubmitJobsWithClient(queueClient),
    markSubmitJobCompleted: (jobId: string) =>
      markSubmitJobCompletedWithClient(queueClient, jobId),
    markSubmitJobFailed: (jobId: string, message: string) =>
      markSubmitJobFailedWithClient(queueClient, jobId, message),
    fetchSubmitJobMetrics: () =>
      fetchSubmitJobMetricsWithClient(queueClient),
  };
}

export async function enqueueSubmitJob(
  input: EnqueueSubmitJobInput,
): Promise<SubmitJobRow> {
  return enqueueSubmitJobWithClient(jobQueueSupabaseClient, input);
}

export async function claimSubmitJobs(
  workerId: string,
  limit = WORKER_BATCH_SIZE,
  jobType?: string,
): Promise<SubmitJobRow[]> {
  return claimSubmitJobsWithClient(
    jobQueueSupabaseClient,
    workerId,
    limit,
    jobType,
  );
}

export async function recoverStuckSubmitJobs(): Promise<number> {
  return recoverStuckSubmitJobsWithClient(jobQueueSupabaseClient);
}

export async function markSubmitJobCompleted(jobId: string): Promise<void> {
  return markSubmitJobCompletedWithClient(jobQueueSupabaseClient, jobId);
}

export async function markSubmitJobFailed(
  jobId: string,
  message: string,
): Promise<{ retryCount: number; status: string }> {
  return markSubmitJobFailedWithClient(jobQueueSupabaseClient, jobId, message);
}

export async function fetchSubmitJobMetrics(): Promise<SubmitJobMetrics> {
  return fetchSubmitJobMetricsWithClient(jobQueueSupabaseClient);
}
