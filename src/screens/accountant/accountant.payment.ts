import { supabase } from "../../lib/supabaseClient";

type PaymentRow = {
  paid_at?: string | null;
  created_at?: string | null;
  id?: number | string | null;
};

export async function fetchLastPaymentIdByProposal(proposalId: string): Promise<number | null> {
  const pid = String(proposalId || "").trim();
  if (!pid) return null;

  const { data, error } = await supabase
    .from("proposal_payments")
    .select("id, paid_at, created_at")
    .eq("proposal_id", pid)
    .order("paid_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(1);

  if (error) return null;

  const row = (Array.isArray(data) ? data[0] : null) as PaymentRow | null;
  const id = Number(row?.id ?? 0);
  return Number.isFinite(id) && id > 0 ? id : null;
}
