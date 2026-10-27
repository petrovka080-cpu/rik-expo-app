import type { SupabaseClient } from "@supabase/supabase-js";

export type BuyerAccountingFlagUpdate = {
  sent_to_accountant_at?: string;
  payment_status?: string;
  invoice_amount?: number;
};

export function fetchBuyerAccountingFlagsRow(
  supabase: SupabaseClient,
  proposalId: string,
) {
  return supabase
    .from("proposals")
    .select("payment_status, sent_to_accountant_at, invoice_amount")
    .eq("id", proposalId)
    .maybeSingle();
}

export function updateBuyerAccountingFlagsRow(
  supabase: SupabaseClient,
  proposalId: string,
  update: BuyerAccountingFlagUpdate,
) {
  return supabase.from("proposals").update(update).eq("id", proposalId);
}
