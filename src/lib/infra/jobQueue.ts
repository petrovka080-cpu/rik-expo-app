import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "../database.types";
import { supabase } from "../supabaseClient";

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
type SubmitJobsUpdate = Database["public"]["Tables"]["submit_jobs"]["Update"];
type SubmitJobsClaimRpcArgs = Database["public"]["Functions"]["submit_jobs_claim"]["Args"];
type SubmitJobsClaimRpcRow = Database["public"]["Functions"]["submit_jobs_claim"]["Returns"][number];
type SubmitJobsRecoverStuckRpcReturns = Database["public"]["Functions"]["submit_jobs_recover_stuck"]["Returns"];
type SubmitJobsMarkCompletedRpcArgs = Database["public"]["Functions"]["submit_jobs_mark_completed"]["Args"];
type SubmitJobsMarkFailedRpcArgs = Database["public"]["Functions"]["submit_jobs_mark_failed"]["Args"];
type SubmitJobsMetricsRpcRow = Database["public"]["Functions"]["submit_jobs_metrics"]["Returns"][number];
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
type SubmitJobsIdRow = { id?: string | null };
type SubmitJobsRetryCountRow = { retry_count?: number | null };

type SubmitJobsRpcCompatBoundary = {
  rpc(
    fn: "submit_jobs_claim",
    args: SubmitJobsClaimLegacyArgs,
  ): Promise<{ data: SubmitJobsClaimRpcRow[] | null; error: { message?: string } | null }>;
  rpc(
    fn: "submit_jobs_mark_completed",
    args: SubmitJobsMarkCompletedLegacyArgs,
  ): Promise<{ data: null; error: { message?: string } | null }>;
  rpc(
    fn: "submit_jobs_mark_failed",
    args: SubmitJobsMarkFailedLegacyArgs,
  ): Promise<{
    data: SubmitJobsMarkFailedRpcRow[] | SubmitJobsMarkFailedRpcRow | null;
    error: { message?: string } | null;
  }>;
};
type JobQueueSupabaseClient = Pick<SupabaseClient<Database>, "from" | "rpc">;

const toQueueRpcCompat = (supabaseClient: JobQueueSupabaseClient) =>
  supabaseClient as unknown as SubmitJobsRpcCompatBoundary;

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

const getJsonRecordOrNull = (value: Json | null | undefined): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const parseSubmitJobsTableRow = (value: unknown): SubmitJobsTableRow | null => {
  if (!isRecord(value)) return null;
  const payload = "payload" in value ? (value.payload as Json | null | undefined) : null;
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
    status: ((row?.status ?? "failed") as SubmitJobStatus),
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
  return Array.isArray(value) ? value.map(normalizeSubmitJobRow).filter((row) => row.id) : [];
}

const parseSubmitJobIdRows = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => (isRecord(row) ? ({ id: getStringOrNull((row as SubmitJobsIdRow).id) } satisfies SubmitJobsIdRow) : null))
    .map((row) => row?.id?.trim() ?? "")
    .filter(Boolean);
};

const parseSubmitJobRetryCountRow = (value: unknown): SubmitJobsRetryCountRow | null => {
  if (!isRecord(value)) return null;
  return {
    retry_count:
      value.retry_count == null
        ? null
        : getNumberOrDefault((value as SubmitJobsRetryCountRow).retry_count, 0),
  };
};

const parseSubmitJobFailedRpcResult = (value: unknown): { retryCount: number; status: string } => {
  const row = Array.isArray(value) ? (value.length > 0 ? value[0] : null) : value;
  if (!isRecord(row)) {
    return { retryCount: 0, status: "failed" };
  }
  return {
    retryCount: getNumberOrDefault(row.retry_count, 0),
    status: String(row.status ?? "failed"),
  };
};

const parseSubmitJobMetricsRow = (value: unknown): SubmitJobMetrics => {
  const row = Array.isArray(value) ? (value.length > 0 ? value[0] : null) : value;
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

const queueInfraError = (scope: string, error: { message?: string | null } | null) =>
  new Error(`${scope}: ${String(error?.message || "unknown")}`);

const toBool = (value: unknown): boolean => {
  const v = String(value ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
};

const toInt = (value: unknown, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

const JOB_QUEUE_ENABLED_RAW = process.env.EXPO_PUBLIC_JOB_QUEUE_ENABLED;
const IS_DEV_RUNTIME =
  (typeof globalThis !== "undefined" && (globalThis as { __DEV__?: unknown }).__DEV__ === true) ||
  process.env.NODE_ENV !== "production";

export const JOB_QUEUE_ENABLED = toBool(JOB_QUEUE_ENABLED_RAW ?? "false");

if (IS_DEV_RUNTIME) {
  console.info("[jobQueue.env]", {
    EXPO_PUBLIC_JOB_QUEUE_ENABLED: JOB_QUEUE_ENABLED_RAW ?? null,
    JOB_QUEUE_ENABLED,
  });
}

export const WORKER_CONCURRENCY = toInt(
  process.env.EXPO_PUBLIC_WORKER_CONCURRENCY ?? process.env.WORKER_CONCURRENCY,
  4,
);
export const WORKER_BATCH_SIZE = toInt(
  process.env.EXPO_PUBLIC_WORKER_BATCH_SIZE ?? process.env.WORKER_BATCH_SIZE,
  10,
);
export const COMPACTION_DELAY_MS = toInt(
  process.env.EXPO_PUBLIC_COMPACTION_DELAY_MS ?? process.env.COMPACTION_DELAY_MS,
  500,
);

const JOB_SELECT =
  "id,client_request_id,job_type,entity_type,entity_id,entity_key,payload,status,retry_count,error,created_at,started_at,worker_id,next_retry_at,locked_until,processed_at";
const SUBMIT_JOBS_ID_SELECT = "id";
const SUBMIT_JOBS_RETRY_COUNT_SELECT = "retry_count";

const buildSubmitJobInsert = (input: EnqueueSubmitJobInput): SubmitJobsInsert => ({
  client_request_id: input.clientRequestId ?? null,
  job_type: String(input.jobType || "").trim(),
  entity_type: input.entityType ?? null,
  entity_id: input.entityId ?? null,
  entity_key: input.entityKey ?? input.entityId ?? null,
  payload: (input.payload ?? {}) as Json,
  status: "pending",
});

const buildSubmitJobsClaimArgs = (workerId: string, limit: number): SubmitJobsClaimRpcArgs => ({
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

const buildSubmitJobsProcessingUpdate = (workerId: string, lockedUntil: string): SubmitJobsUpdate => ({
  status: "processing",
  started_at: new Date().toISOString(),
  worker_id: workerId,
  locked_until: lockedUntil,
});

const buildSubmitJobsCompletedCleanupUpdate = (): SubmitJobsUpdate => ({
  error: null,
  next_retry_at: null,
  locked_until: null,
});

const buildSubmitJobsCompletedFallbackUpdate = (): SubmitJobsUpdate => ({
  status: "completed",
  error: null,
  next_retry_at: null,
  processed_at: new Date().toISOString(),
  locked_until: null,
});

const buildSubmitJobsFailedFallbackUpdate = (
  retryCount: number,
  message: string,
  status: string,
  nextRetryAt: string | null,
): SubmitJobsUpdate => ({
  retry_count: retryCount,
  error: message,
  status,
  next_retry_at: nextRetryAt,
  locked_until: null,
});

async function enqueueSubmitJobWithClient(
  supabaseClient: JobQueueSupabaseClient,
  input: EnqueueSubmitJobInput,
): Promise<SubmitJobRow> {
  const payload = buildSubmitJobInsert(input);

  if (!payload.job_type) {
    throw new Error("enqueueSubmitJob: jobType is required");
  }

  const { data, error } = await supabaseClient
    .from("submit_jobs")
    .insert(payload)
    .select(JOB_SELECT)
    .single();

  if (error) throw error;
  return normalizeSubmitJobRow(data);
}

async function claimSubmitJobsWithClient(
  supabaseClient: JobQueueSupabaseClient,
  workerId: string,
  limit = WORKER_BATCH_SIZE,
  jobType?: string,
): Promise<SubmitJobRow[]> {
  const queueRpcCompat = toQueueRpcCompat(supabaseClient);
  const primary = await supabaseClient.rpc("submit_jobs_claim", buildSubmitJobsClaimArgs(workerId, limit));
  if (!primary.error) return normalizeSubmitJobRows(primary.data);

  const primaryMsg = String(primary.error.message || "");
  const tryLegacyCompat =
    primaryMsg.includes("submit_jobs_claim") &&
    (primaryMsg.includes("p_worker") || primaryMsg.includes("schema cache"));

  if (tryLegacyCompat) {
    const legacy = await queueRpcCompat.rpc("submit_jobs_claim", buildSubmitJobsClaimLegacyArgs(workerId, limit, jobType));
    if (!legacy.error) return normalizeSubmitJobRows(legacy.data);

    const legacyMsg = String(legacy.error.message || "");
    const missingClaimRpc = legacyMsg.includes("submit_jobs_claim") && legacyMsg.includes("schema cache");
    if (!missingClaimRpc) throw legacy.error;
  } else {
    const missingClaimRpc = primaryMsg.includes("submit_jobs_claim") && primaryMsg.includes("schema cache");
    if (!missingClaimRpc) throw primary.error;
  }

  // Legacy schema fallback when claim RPC is absent/incompatible in runtime DB.
  let selectQ = supabaseClient
    .from("submit_jobs")
    .select(SUBMIT_JOBS_ID_SELECT)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (jobType) selectQ = selectQ.eq("job_type", jobType);
  const picked = await selectQ;
  if (picked.error) throw picked.error;
  const ids = parseSubmitJobIdRows(picked.data);
  if (!ids.length) return [];

  const lockedUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const upd = await supabaseClient
    .from("submit_jobs")
    .update(buildSubmitJobsProcessingUpdate(workerId, lockedUntil))
    .in("id", ids)
    .eq("status", "pending")
    .select(JOB_SELECT);
  if (upd.error) throw upd.error;
  return normalizeSubmitJobRows(upd.data);
}

async function recoverStuckSubmitJobsWithClient(
  supabaseClient: JobQueueSupabaseClient,
): Promise<number> {
  const { data, error } = await supabaseClient.rpc("submit_jobs_recover_stuck");
  if (error) throw queueInfraError("recoverStuckSubmitJobs", error);
  return getNumberOrDefault(data as SubmitJobsRecoverStuckRpcReturns, 0);
}

async function markSubmitJobCompletedWithClient(
  supabaseClient: JobQueueSupabaseClient,
  jobId: string,
): Promise<void> {
  const queueRpcCompat = toQueueRpcCompat(supabaseClient);
  const first = await queueRpcCompat.rpc("submit_jobs_mark_completed", { p_job_id: jobId });
  if (!first.error) {
    const normalize = await supabaseClient
      .from("submit_jobs")
      .update(buildSubmitJobsCompletedCleanupUpdate())
      .eq("id", jobId);
    if (normalize.error) throw queueInfraError("markSubmitJobCompleted.normalizeCleanup", normalize.error);
    return;
  }

  const msg = String(first.error.message || "");
  const fallbackNeeded = msg.includes("submit_jobs_mark_completed") && msg.includes("schema cache");
  if (!fallbackNeeded) throw queueInfraError("markSubmitJobCompleted.rpc", first.error);

  const fallback = await supabaseClient
    .from("submit_jobs")
    .update(buildSubmitJobsCompletedFallbackUpdate())
    .eq("id", jobId);
  if (fallback.error) throw queueInfraError("markSubmitJobCompleted.fallbackUpdate", fallback.error);
}

async function markSubmitJobFailedWithClient(
  supabaseClient: JobQueueSupabaseClient,
  jobId: string,
  message: string,
): Promise<{ retryCount: number; status: string }> {
  const queueRpcCompat = toQueueRpcCompat(supabaseClient);
  const first = await queueRpcCompat.rpc("submit_jobs_mark_failed", {
    p_job_id: jobId,
    p_error: message,
  });
  if (!first.error) {
    return parseSubmitJobFailedRpcResult(first.data);
  }

  const msg = String(first.error.message || "");
  const fallbackNeeded = msg.includes("submit_jobs_mark_failed") && msg.includes("schema cache");
  if (!fallbackNeeded) throw queueInfraError("markSubmitJobFailed.rpc", first.error);

  const current = await supabaseClient
    .from("submit_jobs")
    .select(SUBMIT_JOBS_RETRY_COUNT_SELECT)
    .eq("id", jobId)
    .maybeSingle();
  if (current.error) throw queueInfraError("markSubmitJobFailed.readRetryCount", current.error);
  const retryCount = (parseSubmitJobRetryCountRow(current.data)?.retry_count ?? 0) + 1;
  const status = retryCount >= 5 ? "failed" : "pending";
  const nextRetryAt = status === "pending" ? new Date(Date.now() + 30_000).toISOString() : null;
  const patch = await supabaseClient
    .from("submit_jobs")
    .update(buildSubmitJobsFailedFallbackUpdate(retryCount, message, status, nextRetryAt))
    .eq("id", jobId);
  if (patch.error) throw queueInfraError("markSubmitJobFailed.fallbackUpdate", patch.error);

  return {
    retryCount,
    status,
  };
}

async function fetchSubmitJobMetricsWithClient(
  supabaseClient: JobQueueSupabaseClient,
): Promise<SubmitJobMetrics> {
  const { data, error } = await supabaseClient.rpc("submit_jobs_metrics");
  if (error) throw error;
  return parseSubmitJobMetricsRow(data);
}

export function createJobQueueApi(supabaseClient: JobQueueSupabaseClient) {
  return {
    enqueueSubmitJob: (input: EnqueueSubmitJobInput) => enqueueSubmitJobWithClient(supabaseClient, input),
    claimSubmitJobs: (workerId: string, limit = WORKER_BATCH_SIZE, jobType?: string) =>
      claimSubmitJobsWithClient(supabaseClient, workerId, limit, jobType),
    recoverStuckSubmitJobs: () => recoverStuckSubmitJobsWithClient(supabaseClient),
    markSubmitJobCompleted: (jobId: string) => markSubmitJobCompletedWithClient(supabaseClient, jobId),
    markSubmitJobFailed: (jobId: string, message: string) =>
      markSubmitJobFailedWithClient(supabaseClient, jobId, message),
    fetchSubmitJobMetrics: () => fetchSubmitJobMetricsWithClient(supabaseClient),
  };
}

export async function enqueueSubmitJob(input: EnqueueSubmitJobInput): Promise<SubmitJobRow> {
  return enqueueSubmitJobWithClient(supabase, input);
}

export async function claimSubmitJobs(workerId: string, limit = WORKER_BATCH_SIZE, jobType?: string): Promise<SubmitJobRow[]> {
  return claimSubmitJobsWithClient(supabase, workerId, limit, jobType);
}

export async function recoverStuckSubmitJobs(): Promise<number> {
  return recoverStuckSubmitJobsWithClient(supabase);
}

export async function markSubmitJobCompleted(jobId: string): Promise<void> {
  return markSubmitJobCompletedWithClient(supabase, jobId);
}

export async function markSubmitJobFailed(jobId: string, message: string): Promise<{ retryCount: number; status: string }> {
  return markSubmitJobFailedWithClient(supabase, jobId, message);
}

export async function fetchSubmitJobMetrics(): Promise<SubmitJobMetrics> {
  return fetchSubmitJobMetricsWithClient(supabase);
}
