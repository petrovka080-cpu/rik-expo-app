import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchBuyerAccountingFlagsRow,
  updateBuyerAccountingFlagsRow,
  type BuyerAccountingFlagUpdate,
} from "./useBuyerAccountingFlags.transport";

type BuyerAccountingFlagRow = {
  payment_status?: string | null;
  sent_to_accountant_at?: string | null;
  invoice_amount?: number | null;
};

export async function fetchBuyerAccountingFlags(
  supabase: SupabaseClient,
  proposalId: string,
) {
  const { data, error } = await fetchBuyerAccountingFlagsRow(supabase, proposalId);

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
  return await updateBuyerAccountingFlagsRow(supabase, proposalId, update);
}
