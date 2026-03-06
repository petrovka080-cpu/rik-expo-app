import { useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export function useBuyerEnsureAccountingFlags(params: {
  supabase: SupabaseClient;
  proposalSubmit: (proposalId: string) => Promise<unknown>;
}) {
  const { supabase, proposalSubmit } = params;

  const ensureAccountingFlags = useCallback(
    async (proposalId: string, invoiceAmountNum?: number) => {
      try {
        const chk = await supabase
          .from("proposals")
          .select("payment_status, sent_to_accountant_at, invoice_amount")
          .eq("id", proposalId)
          .maybeSingle();

        if (chk.error) return;

        const ps = String(chk.data?.payment_status ?? "").trim();
        const sent = !!chk.data?.sent_to_accountant_at;
        const shouldReset = ps.length === 0 || /^на доработке/i.test(ps);

        if (!sent || shouldReset || (chk.data?.invoice_amount == null && typeof invoiceAmountNum === "number")) {
          const upd: { sent_to_accountant_at?: string; payment_status?: string; invoice_amount?: number } = {};
          if (!sent) upd.sent_to_accountant_at = new Date().toISOString();
          if (shouldReset) upd.payment_status = "К оплате";
          if (chk.data?.invoice_amount == null && typeof invoiceAmountNum === "number") {
            upd.invoice_amount = invoiceAmountNum;
          }
          if (Object.keys(upd).length) {
            await supabase.from("proposals").update(upd).eq("id", proposalId);
            await proposalSubmit(proposalId);
          }
        }
      } catch {
        // no-op
      }
    },
    [supabase, proposalSubmit]
  );

  return { ensureAccountingFlags };
}

