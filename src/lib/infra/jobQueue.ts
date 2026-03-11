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

export async function enqueueSubmitJob(input: EnqueueSubmitJobInput): Promise<SubmitJobRow> {
  const payload = {
    client_request_id: input.clientRequestId ?? null,
    job_type: String(input.jobType || "").trim(),
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    entity_key: input.entityKey ?? input.entityId ?? null,
    payload: input.payload ?? {},
    status: "pending" as SubmitJobStatus,
  };

  if (!payload.job_type) {
    throw new Error("enqueueSubmitJob: jobType is required");
  }

  const { data, error } = await supabase
    .from("submit_jobs" as any)
    .insert(payload as any)
    .select(JOB_SELECT)
    .single();

  if (error) throw error;
  return data as SubmitJobRow;
}

export async function claimSubmitJobs(workerId: string, limit = WORKER_BATCH_SIZE, jobType?: string): Promise<SubmitJobRow[]> {
  const payload = {
    p_worker_id: workerId,
    p_limit: limit,
    p_job_type: jobType ?? null,
  } as any;

  const first = await supabase.rpc("submit_jobs_claim" as any, payload);
  if (!first.error) return (Array.isArray(first.data) ? first.data : []) as SubmitJobRow[];

  const msg = String(first.error.message || "");
  const isOldSignature =
    msg.includes("submit_jobs_claim") &&
    (msg.includes("p_job_type") || msg.includes("schema cache"));
  if (!isOldSignature) throw first.error;

  const second = await supabase.rpc("submit_jobs_claim" as any, {
    p_worker_id: workerId,
    p_limit: limit,
  } as any);
  if (!second.error) return (Array.isArray(second.data) ? second.data : []) as SubmitJobRow[];

  const secondMsg = String(second.error.message || "");
  const missingClaimRpc = secondMsg.includes("submit_jobs_claim") && secondMsg.includes("schema cache");
  if (!missingClaimRpc) throw second.error;

  // Legacy schema fallback when claim RPC is absent/incompatible in runtime DB.
  let selectQ = supabase
    .from("submit_jobs" as any)
    .select("id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (jobType) selectQ = selectQ.eq("job_type", jobType);
  const picked = await selectQ;
  if (picked.error) throw picked.error;
  const ids = Array.isArray(picked.data)
    ? picked.data.map((row: any) => String(row?.id || "").trim()).filter(Boolean)
    : [];
  if (!ids.length) return [];

  const lockedUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const upd = await supabase
    .from("submit_jobs" as any)
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
      worker_id: workerId,
      locked_until: lockedUntil,
    } as any)
    .in("id", ids)
    .eq("status", "pending")
    .select(JOB_SELECT);
  if (upd.error) throw upd.error;
  return (Array.isArray(upd.data) ? upd.data : []) as SubmitJobRow[];
}

export async function recoverStuckSubmitJobs(): Promise<number> {
  const { data, error } = await supabase.rpc("submit_jobs_recover_stuck" as any);
  if (error) throw error;
  return Number(data ?? 0) || 0;
}

export async function markSubmitJobCompleted(jobId: string): Promise<void> {
  const first = await supabase.rpc("submit_jobs_mark_completed" as any, { p_job_id: jobId } as any);
  if (!first.error) {
    const normalize = await supabase
      .from("submit_jobs" as any)
      .update({
        error: null,
        next_retry_at: null,
        locked_until: null,
      } as any)
      .eq("id", jobId);
    if (normalize.error) throw normalize.error;
    return;
  }

  const msg = String(first.error.message || "");
  const fallbackNeeded = msg.includes("submit_jobs_mark_completed") && msg.includes("schema cache");
  if (!fallbackNeeded) throw first.error;

  const fallback = await supabase
    .from("submit_jobs" as any)
    .update({
      status: "completed",
      error: null,
      next_retry_at: null,
      processed_at: new Date().toISOString(),
      locked_until: null,
    } as any)
    .eq("id", jobId);
  if (fallback.error) throw fallback.error;
}

export async function markSubmitJobFailed(jobId: string, message: string): Promise<{ retryCount: number; status: string }> {
  const first = await supabase.rpc("submit_jobs_mark_failed" as any, {
    p_job_id: jobId,
    p_error: message,
  } as any);
  if (!first.error) {
    const row = Array.isArray(first.data) && first.data.length ? first.data[0] : (first.data ?? null);
    return {
      retryCount: Number((row as any)?.retry_count ?? 0),
      status: String((row as any)?.status ?? "failed"),
    };
  }

  const msg = String(first.error.message || "");
  const fallbackNeeded = msg.includes("submit_jobs_mark_failed") && msg.includes("schema cache");
  if (!fallbackNeeded) throw first.error;

  const current = await supabase
    .from("submit_jobs" as any)
    .select("retry_count")
    .eq("id", jobId)
    .maybeSingle();
  if (current.error) throw current.error;
  const retryCount = Number((current.data as any)?.retry_count ?? 0) + 1;
  const status = retryCount >= 5 ? "failed" : "pending";
  const nextRetryAt = status === "pending" ? new Date(Date.now() + 30_000).toISOString() : null;
  const patch = await supabase
    .from("submit_jobs" as any)
    .update({
      retry_count: retryCount,
      error: message,
      status,
      next_retry_at: nextRetryAt,
      locked_until: null,
    } as any)
    .eq("id", jobId);
  if (patch.error) throw patch.error;

  return {
    retryCount,
    status,
  };
}

export async function fetchSubmitJobMetrics(): Promise<SubmitJobMetrics> {
  const { data, error } = await supabase.rpc("submit_jobs_metrics" as any);
  if (error) throw error;
  const row = Array.isArray(data) && data.length ? data[0] : (data ?? {});
  return {
    pending: Number((row as any)?.pending ?? 0),
    processing: Number((row as any)?.processing ?? 0),
    failed: Number((row as any)?.failed ?? 0),
    oldest_pending: ((row as any)?.oldest_pending as string | null) ?? null,
  };
}
