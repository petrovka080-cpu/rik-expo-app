import type { SupabaseClient } from "@supabase/supabase-js";

type BuyerAccountingFlagRow = {
  payment_status?: string | null;
  sent_to_accountant_at?: string | null;
  invoice_amount?: number | null;
};

type BuyerAccountingFlagUpdate = {
  sent_to_accountant_at?: string;
  payment_status?: string;
  invoice_amount?: number;
};

export async function fetchBuyerAccountingFlags(
  supabase: SupabaseClient,
  proposalId: string,
) {
  const { data, error } = await supabase
    .from("proposals")
    .select("payment_status, sent_to_accountant_at, invoice_amount")
    .eq("id", proposalId)
    .maybeSingle();

  return {
    data: (data as BuyerAccountingFlagRow | null) ?? null,
    error,
  };
}

export async function updateBuyerAccountingFlags(
  supabase: SupabaseClient,
  proposalId: string,
  update: BuyerAccountingFlagUpdate,
) {
  return await supabase.from("proposals").update(update).eq("id", proposalId);
}
