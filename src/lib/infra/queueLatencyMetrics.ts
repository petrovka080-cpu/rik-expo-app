import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../database.types";
import { supabase } from "../supabaseClient";

export type QueueLatencyMetrics = {
  queueWaitMs: number;
  queueDepth: number;
  oldestPendingAt: string | null;
};

type QueueLatencySupabaseClient = Pick<SupabaseClient<Database>, "rpc">;
type SubmitJobsMetricsRpcRow =
  Database["public"]["Functions"]["submit_jobs_metrics"]["Returns"][number];

export async function fetchQueueLatencyMetricsWithClient(
  supabaseClient: QueueLatencySupabaseClient,
): Promise<QueueLatencyMetrics> {
  const { data, error } = await supabaseClient.rpc("submit_jobs_metrics");
  if (error) throw error;

  const metricsRow =
    Array.isArray(data) && data.length > 0
      ? (data[0] as Partial<SubmitJobsMetricsRpcRow>)
      : null;
  const queueDepth = Number(metricsRow?.pending ?? 0) || 0;
  const oldestPendingAt =
    metricsRow?.oldest_pending == null
      ? null
      : String(metricsRow.oldest_pending);
  const queueWaitMs = oldestPendingAt
    ? Math.max(0, Date.now() - new Date(oldestPendingAt).getTime())
    : 0;

  return {
    queueWaitMs,
    queueDepth,
    oldestPendingAt,
  };
}

export async function fetchQueueLatencyMetrics(): Promise<QueueLatencyMetrics> {
  return fetchQueueLatencyMetricsWithClient(supabase);
}
