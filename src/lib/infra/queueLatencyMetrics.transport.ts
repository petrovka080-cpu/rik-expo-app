import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../database.types";
import { callRateLimitedSupabaseRpc } from "../api/supabaseRpcAdapter";
import { supabase } from "../supabaseClient";

export type QueueLatencySupabaseClient = Pick<SupabaseClient<Database>, "rpc">;
export type SubmitJobsMetricsRpcRow =
  Database["public"]["Functions"]["submit_jobs_metrics"]["Returns"][number];
export type SubmitJobsMetricsRpcResult = {
  data: SubmitJobsMetricsRpcRow[] | null;
  error: { message?: string | null } | null;
};

export function fetchSubmitJobsMetricsRowsWithClient(
  supabaseClient: QueueLatencySupabaseClient,
) {
  return callRateLimitedSupabaseRpc<SubmitJobsMetricsRpcResult>(
    supabaseClient,
    "submit_jobs_metrics",
  );
}

export function fetchSubmitJobsMetricsRows() {
  return fetchSubmitJobsMetricsRowsWithClient(supabase);
}
