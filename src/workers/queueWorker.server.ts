import { createJobQueueApi } from "../lib/infra/jobQueue";
import { fetchQueueLatencyMetricsWithClient } from "../lib/infra/queueLatencyMetrics";
import {
  SERVER_SUPABASE_CLIENT_HOST,
  SERVER_SUPABASE_CLIENT_KIND,
  getServerSupabaseClient,
} from "../lib/server/serverSupabaseClient";
import { startQueueWorker, type QueueWorkerHandle } from "./queueWorker";

export function startServerQueueWorker(options: Parameters<typeof startQueueWorker>[0] = {}): QueueWorkerHandle {
  const serverSupabase = getServerSupabaseClient();
  const queueApi = createJobQueueApi(serverSupabase);

  return startQueueWorker(options, {
    supabaseClient: serverSupabase,
    queueApi,
    fetchQueueLatencyMetrics: () => fetchQueueLatencyMetricsWithClient(serverSupabase),
    sourceMeta: {
      SUPABASE_HOST: SERVER_SUPABASE_CLIENT_HOST,
      SUPABASE_KEY_KIND: SERVER_SUPABASE_CLIENT_KIND,
    },
  });
}
