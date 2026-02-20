// src/screens/director/director.metrics.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type DirectorDashMetrics = {
  // approvals
  foreman_requests: number;
  foreman_positions: number;
  buyer_proposals: number;
  buyer_positions: number;

  // finance (accountant-like)
  pay_to_pay: number;
  pay_partial: number;
  pay_paid: number;
  pay_rework: number;

  // warehouse (incoming queue)
  wh_to_receive: number;
  wh_partial: number;
  wh_pending: number;
};

const norm = (s: any) => String(s ?? "").trim().toLowerCase();

function payBucket(raw: any): "to_pay" | "partial" | "paid" | "rework" | null {
  const s = norm(raw);
  if (!s) return "to_pay";

  if (s.startsWith("на доработке") || s.startsWith("возврат")) return "rework";
  if (s.startsWith("частично")) return "partial";
  if (s.startsWith("оплачено")) return "paid";
  if (s.startsWith("к оплате")) return "to_pay";

  // fallback
  return "to_pay";
}

export async function loadDirectorDashMetrics(
  supabase: SupabaseClient,
  args: {
    // из director.tsx
    foreman_requests: number;
    foreman_positions: number;
    buyer_proposals: number;
    buyer_positions: number;
  }
): Promise<DirectorDashMetrics> {
  const out: DirectorDashMetrics = {
    foreman_requests: Number(args.foreman_requests ?? 0) || 0,
    foreman_positions: Number(args.foreman_positions ?? 0) || 0,
    buyer_proposals: Number(args.buyer_proposals ?? 0) || 0,
    buyer_positions: Number(args.buyer_positions ?? 0) || 0,

    pay_to_pay: 0,
    pay_partial: 0,
    pay_paid: 0,
    pay_rework: 0,

    wh_to_receive: 0,
    wh_partial: 0,
    wh_pending: 0,
  };

  // ---- FINANCE COUNTS (быстро, по proposals) ----
  try {
    const q = await supabase
      .from("proposals")
      .select("id,payment_status,sent_to_accountant_at")
      .not("sent_to_accountant_at", "is", null)
      .limit(5000);

    if (!q.error && Array.isArray(q.data)) {
      for (const r of q.data as any[]) {
        const b = payBucket(r?.payment_status);
        if (b === "to_pay") out.pay_to_pay += 1;
        else if (b === "partial") out.pay_partial += 1;
        else if (b === "paid") out.pay_paid += 1;
        else if (b === "rework") out.pay_rework += 1;
      }
    }
  } catch {
    // no-op
  }

  // ---- WAREHOUSE COUNTS (очередь прихода) ----
  // Берем то, что ты уже используешь в warehouse.tsx: v_wh_incoming_heads_ui
  try {
    const q = await supabase
      .from("v_wh_incoming_heads_ui" as any)
      .select("incoming_id,qty_expected_sum,qty_received_sum,pending_cnt,partial_cnt")
      .limit(5000);

    if (!q.error && Array.isArray(q.data)) {
      let total = 0;
      let partialHeads = 0;
      let pendingHeads = 0;

      for (const r of q.data as any[]) {
        const exp = Number(r?.qty_expected_sum ?? 0) || 0;
        const rec = Number(r?.qty_received_sum ?? 0) || 0;
        const left = Math.max(0, exp - rec);

        // считаем только те, где реально осталось
        if (left <= 0) continue;

        total += 1;

        const pendCnt = Number(r?.pending_cnt ?? 0) || 0;
        const partCnt = Number(r?.partial_cnt ?? 0) || 0;

        // если есть факт приемки (rec>0) или partial_cnt>0 => "частично"
        const isPartial = (rec > 0 && left > 0) || partCnt > 0;

        if (isPartial) partialHeads += 1;
        else pendingHeads += 1;

        // pending_cnt / partial_cnt — это по строкам, но нам на дашборде достаточно heads
        // (можешь потом добавить строковые счётчики отдельно)
      }

      out.wh_to_receive = total;
      out.wh_partial = partialHeads;
      out.wh_pending = pendingHeads;
    }
  } catch {
    // no-op
  }

  return out;
}
