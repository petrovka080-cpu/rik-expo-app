import type { SupabaseClient } from "@supabase/supabase-js";

export type DirectorMetricsProposalRow = {
  payment_status?: unknown;
};

export type DirectorMetricsIncomingRow = {
  qty_expected_sum?: unknown;
  qty_received_sum?: unknown;
  pending_cnt?: unknown;
  partial_cnt?: unknown;
};

const fromIncomingHeadsUi = (supabase: SupabaseClient) =>
  supabase.from("v_wh_incoming_heads_ui" as never);

export const fetchDirectorMetricsProposalRows = (supabase: SupabaseClient) =>
  supabase
    .from("proposals")
    .select("id,payment_status,sent_to_accountant_at")
    .not("sent_to_accountant_at", "is", null)
    .limit(5000);

export const fetchDirectorMetricsIncomingRows = (supabase: SupabaseClient) =>
  fromIncomingHeadsUi(supabase)
    .select("incoming_id,qty_expected_sum,qty_received_sum,pending_cnt,partial_cnt")
    .limit(5000);
