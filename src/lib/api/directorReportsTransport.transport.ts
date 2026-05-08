import { applySupabaseAbortSignal } from "../requestCancellation";
import { supabase } from "../supabaseClient";
import {
  DIRECTOR_REPORTS_SERVER_AGGREGATION_CONTRACT,
  toDirectorReportsAggregationRpcParams,
  type DirectorReportsAggregationRequestDto,
} from "./director_reports.aggregation.contracts";

export async function callDirectorReportTransportScopeRpc(
  request: DirectorReportsAggregationRequestDto,
  signal?: AbortSignal | null,
) {
  return await applySupabaseAbortSignal(
    supabase.rpc(
      DIRECTOR_REPORTS_SERVER_AGGREGATION_CONTRACT.rpcName,
      toDirectorReportsAggregationRpcParams(request),
    ),
    signal,
  );
}
