// src/screens/buyer/buyer.fetchers.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BuyerInboxRow } from "../../lib/catalog_api";

export async function fetchBuyerInboxProd(params: {
  focusedRef: { current: boolean };
  lastKickRef: { current: number };
  kickMs: number;

  listBuyerInbox: () => Promise<BuyerInboxRow[]>;
  preloadDisplayNos: (reqIds: string[]) => void | Promise<void>;

  setLoadingInbox: (v: boolean) => void;
  setRows: (rows: BuyerInboxRow[]) => void;

  alert: (title: string, msg?: string) => void;
  log?: (msg: any, ...rest: any[]) => void;
}) {
  const {
    focusedRef,
    lastKickRef,
    kickMs,
    listBuyerInbox,
    preloadDisplayNos,
    setLoadingInbox,
    setRows,
    alert,
    log,
  } = params;

  if (!focusedRef.current) return;

  const now = Date.now();
  if (now - lastKickRef.current < kickMs) return;
  lastKickRef.current = now;

  setLoadingInbox(true);
  try {
    let inbox: BuyerInboxRow[] = [];
    try {
      inbox = await listBuyerInbox();
    } catch (e: any) {
      log?.("[buyer] listBuyerInbox ex:", e?.message ?? e);
      inbox = [];
    }

    setRows(inbox);

    const reqIds = Array.from(
      new Set((inbox || []).map((r: any) => String(r?.request_id)).filter(Boolean))
    );

    try {
      await preloadDisplayNos(reqIds);
    } catch {
      // no-op
    }
  } catch (e: any) {
    log?.("[buyer] fetchInbox:", e?.message ?? e);
    alert("Ошибка", "Не удалось загрузить инбокс снабженца");
    setRows([]);
  } finally {
    setLoadingInbox(false);
  }
}

export async function fetchBuyerBucketsProd(params: {
  focusedRef: { current: boolean };
  lastKickRef: { current: number };
  kickMs: number;

  supabase: SupabaseClient;
  preloadProposalTitles?: (proposalIds: string[]) => void | Promise<void>;

  setLoadingBuckets: (v: boolean) => void;
  setPending: (rows: any[]) => void;
  setApproved: (rows: any[]) => void;
  setRejected: (rows: any[]) => void;

  log?: (msg: any, ...rest: any[]) => void;
}) {
  const {
    focusedRef,
    lastKickRef,
    kickMs,
    supabase,
    preloadProposalTitles,
    setLoadingBuckets,
    setPending,
    setApproved,
    setRejected,
    log,
  } = params;

  if (!focusedRef.current) return;

  const now = Date.now();
  if (now - lastKickRef.current < kickMs) return;
  lastKickRef.current = now;

  setLoadingBuckets(true);
  try {
    // ===== PENDING (контроль) — только НЕпустые =====
    const pQ = await supabase
      .from("v_proposals_summary")
      .select("proposal_id,status,submitted_at,sent_to_accountant_at,total_sum,items_cnt")
      .eq("status", "На утверждении")
      .gt("items_cnt", 0)
      .order("submitted_at", { ascending: false });

    const pendingClean =
      !pQ.error && Array.isArray(pQ.data)
        ? (pQ.data as any[]).map((x) => ({
            id: String(x.proposal_id),
            status: String(x.status),
            submitted_at: x.submitted_at ?? null,
            total_sum: Number(x.total_sum ?? 0),
            sent_to_accountant_at: x.sent_to_accountant_at ?? null,
            items_cnt: Number(x.items_cnt ?? 0),
          }))
        : [];
    setPending(pendingClean);

    // ===== APPROVED (готово) — только НЕпустые =====
    const apQ = await supabase
      .from("v_proposals_summary")
      .select("proposal_id,status,submitted_at,sent_to_accountant_at,total_sum,items_cnt")
      .eq("status", "Утверждено")
      .gt("items_cnt", 0)
      .order("submitted_at", { ascending: false });

    const approvedClean =
      !apQ.error && Array.isArray(apQ.data)
        ? (apQ.data as any[]).map((x) => ({
            id: String(x.proposal_id),
            status: String(x.status),
            submitted_at: x.submitted_at ?? null,
            total_sum: Number(x.total_sum ?? 0),
            sent_to_accountant_at: x.sent_to_accountant_at ?? null,
            items_cnt: Number(x.items_cnt ?? 0),
          }))
        : [];
    setApproved(approvedClean);

    // ===== REJECTED (правки) — ТОЛЬКО ОТ БУХГАЛТЕРА =====
    const reAcc = await supabase
      .from("proposals")
      .select("id, payment_status, submitted_at, created_at")
      .ilike("payment_status", "%На доработке%")
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false });

    const seen = new Set<string>();
    const rejectedRaw = (reAcc.data || [])
      .filter((x: any) => {
        const id = String(x?.id ?? "").trim();
        if (!id || seen.has(id)) return false;
        seen.add(id);

        const ps = String(x?.payment_status ?? "").toLowerCase();
        return ps.startsWith("на доработке");
      })
      .map((x: any) => {
        const ps = String(x.payment_status ?? "На доработке");
        const submitted_at = x.submitted_at ?? x.created_at ?? null;
        return { id: String(x.id), status: ps, submitted_at };
      });

    // ✅ фильтр от пустых proposals (items_cnt > 0) через proposal_items
    let rejectedClean = rejectedRaw;
    try {
      const ids = rejectedRaw.map((r) => r.id);
      if (ids.length) {
        const pi = await supabase.from("proposal_items").select("proposal_id").in("proposal_id", ids);
        if (!pi.error) {
          const cnt: Record<string, number> = {};
          (pi.data || []).forEach((row: any) => {
            const pid = String(row?.proposal_id || "");
            if (!pid) return;
            cnt[pid] = (cnt[pid] || 0) + 1;
          });
          rejectedClean = rejectedRaw.filter((r) => (cnt[r.id] || 0) > 0);
        }
      }
    } catch {
      // no-op
    }

    setRejected(rejectedClean);

    // ✅ батч-заголовки (если есть)
    try {
      await preloadProposalTitles?.([
        ...pendingClean.map((x) => x.id),
        ...approvedClean.map((x) => x.id),
        ...rejectedClean.map((x) => x.id),
      ]);
    } catch {
      // no-op
    }
  } catch (e: any) {
    log?.("[buyer] fetchBuckets error:", e?.message ?? e);
  } finally {
    setLoadingBuckets(false);
  }
}
