import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../database.types";
import { supabase } from "../supabaseClient";

export type QueueLatencySupabaseClient = Pick<SupabaseClient<Database>, "rpc">;
export type SubmitJobsMetricsRpcRow =
  Database["public"]["Functions"]["submit_jobs_metrics"]["Returns"][number];

export function fetchSubmitJobsMetricsRowsWithClient(
  supabaseClient: QueueLatencySupabaseClient,
) {
  return supabaseClient.rpc("submit_jobs_metrics");
}

export function fetchSubmitJobsMetricsRows() {
  return fetchSubmitJobsMetricsRowsWithClient(supabase);
}
