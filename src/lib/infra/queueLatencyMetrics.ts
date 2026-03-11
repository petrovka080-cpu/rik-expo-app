import { supabase } from "../supabaseClient";

export type QueueLatencyMetrics = {
  queueWaitMs: number;
  queueDepth: number;
  oldestPendingAt: string | null;
};

export async function fetchQueueLatencyMetrics(): Promise<QueueLatencyMetrics> {
  const oldestQ = await supabase
    .from("submit_jobs" as any)
    .select("created_at", { head: false, count: "exact" })
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1);

  if (oldestQ.error) throw oldestQ.error;

  const depth = Number(oldestQ.count ?? 0) || 0;
  const firstRow =
    Array.isArray(oldestQ.data) && oldestQ.data.length
      ? (oldestQ.data[0] as { created_at?: string | null })
      : null;
  const oldestPendingAt = firstRow?.created_at ?? null;
  const queueWaitMs = oldestPendingAt ? Math.max(0, Date.now() - new Date(oldestPendingAt).getTime()) : 0;

  return {
    queueWaitMs,
    queueDepth: depth,
    oldestPendingAt,
  };
}
