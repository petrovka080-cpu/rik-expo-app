import {
  fetchSubmitJobsMetricsRows,
  fetchSubmitJobsMetricsRowsWithClient,
  type QueueLatencySupabaseClient,
  type SubmitJobsMetricsRpcRow,
} from "./queueLatencyMetrics.transport";

export type QueueLatencyMetrics = {
  queueWaitMs: number;
  queueDepth: number;
  oldestPendingAt: string | null;
};

function mapSubmitJobsMetricsRows(
  data: SubmitJobsMetricsRpcRow[] | null,
): QueueLatencyMetrics {
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

export async function fetchQueueLatencyMetricsWithClient(
  supabaseClient: QueueLatencySupabaseClient,
): Promise<QueueLatencyMetrics> {
  const { data, error } = await fetchSubmitJobsMetricsRowsWithClient(supabaseClient);
  if (error) throw error;

  return mapSubmitJobsMetricsRows(data);
}

export async function fetchQueueLatencyMetrics(): Promise<QueueLatencyMetrics> {
  const { data, error } = await fetchSubmitJobsMetricsRows();
  if (error) throw error;

  return mapSubmitJobsMetricsRows(data);
}
