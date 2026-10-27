import { useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchBuyerAccountingFlags } from "./useBuyerAccountingFlagsRepo";

export async function verifyBuyerAccountingServerState(params: {
  supabase: SupabaseClient;
  proposalId: string;
}) {
  const chk = await fetchBuyerAccountingFlags(params.supabase, params.proposalId);
  if (chk.error) throw chk.error;

  const sentToAccountantAt = String(chk.data?.sent_to_accountant_at ?? "").trim();
  if (!sentToAccountantAt) {
    throw new Error("Server truth did not confirm sent_to_accountant_at");
  }

  return {
    paymentStatus: String(chk.data?.payment_status ?? "").trim() || null,
    sentToAccountantAt,
    invoiceAmount: chk.data?.invoice_amount ?? null,
  };
}

export function useBuyerEnsureAccountingFlags(params: {
  supabase: SupabaseClient;
  proposalSubmit: (proposalId: string) => Promise<unknown>;
}) {
  const { supabase } = params;

  const ensureAccountingFlags = useCallback(
    async (proposalId: string) => {
      await verifyBuyerAccountingServerState({ supabase, proposalId });
    },
    [supabase],
  );

  return { ensureAccountingFlags };
}
