import type { SupabaseClient } from "@supabase/supabase-js";
import type { BuyerInboxRow } from "../../lib/catalog_api";
import {
  BUYER_STATUS_APPROVED,
  BUYER_STATUS_PENDING,
  BUYER_STATUS_REWORK,
  fetchBuyerProposalItemIds,
  fetchBuyerProposalSummaryByStatus,
  fetchBuyerRejectedProposalRows,
} from "./buyer.buckets.repo";

export type BuyerProposalBucketRow = {
  id: string;
  status: string;
  submitted_at: string | null;
  total_sum?: number;
  sent_to_accountant_at?: string | null;
  items_cnt?: number;
};

const REWORK_STATUS_LOWER = BUYER_STATUS_REWORK.toLowerCase();

export async function fetchBuyerInboxProd(params: {
  focusedRef: { current: boolean };
  lastKickRef: { current: number };
  kickMs: number;

  listBuyerInbox: () => Promise<BuyerInboxRow[]>;
  preloadDisplayNos: (reqIds: string[]) => void | Promise<void>;

  setLoadingInbox: (v: boolean) => void;
  setRows: (rows: BuyerInboxRow[]) => void;

  alert: (title: string, msg?: string) => void;
  log?: (msg: unknown, ...rest: unknown[]) => void;
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
    } catch (e: unknown) {
      log?.("[buyer] listBuyerInbox ex:", e instanceof Error ? e.message : String(e));
      inbox = [];
    }

    setRows(inbox || []);

    const reqIds = Array.from(new Set((inbox || []).map((r) => String(r?.request_id)).filter(Boolean)));

    try {
      await preloadDisplayNos(reqIds);
    } catch {
      // no-op
    }
  } catch (e: unknown) {
    log?.("[buyer] fetchInbox:", e instanceof Error ? e.message : String(e));
    alert("Ошибка", "Не удалось загрузить входящие заявки снабженца");
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
  setPending: (rows: BuyerProposalBucketRow[]) => void;
  setApproved: (rows: BuyerProposalBucketRow[]) => void;
  setRejected: (rows: BuyerProposalBucketRow[]) => void;

  log?: (msg: unknown, ...rest: unknown[]) => void;
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
    const pQ = await fetchBuyerProposalSummaryByStatus(supabase, BUYER_STATUS_PENDING);

    const pendingClean: BuyerProposalBucketRow[] =
      !pQ.error && Array.isArray(pQ.data)
        ? (pQ.data as Array<Record<string, unknown>>).map((x) => ({
            id: String(x.proposal_id),
            status: String(x.status),
            submitted_at: (x.submitted_at as string | null) ?? null,
            total_sum: Number(x.total_sum ?? 0),
            sent_to_accountant_at: (x.sent_to_accountant_at as string | null) ?? null,
            items_cnt: Number(x.items_cnt ?? 0),
          }))
        : [];
    setPending(pendingClean);

    const apQ = await fetchBuyerProposalSummaryByStatus(supabase, BUYER_STATUS_APPROVED);

    const approvedClean: BuyerProposalBucketRow[] =
      !apQ.error && Array.isArray(apQ.data)
        ? (apQ.data as Array<Record<string, unknown>>).map((x) => ({
            id: String(x.proposal_id),
            status: String(x.status),
            submitted_at: (x.submitted_at as string | null) ?? null,
            total_sum: Number(x.total_sum ?? 0),
            sent_to_accountant_at: (x.sent_to_accountant_at as string | null) ?? null,
            items_cnt: Number(x.items_cnt ?? 0),
          }))
        : [];
    setApproved(approvedClean);

    const reAcc = await fetchBuyerRejectedProposalRows(supabase);

    const seen = new Set<string>();
    const rejectedRaw: BuyerProposalBucketRow[] = (reAcc.data || [])
      .filter((x: Record<string, unknown>) => {
        const id = String(x?.id ?? "").trim();
        if (!id || seen.has(id)) return false;
        seen.add(id);

        const ps = String(x?.payment_status ?? "").toLowerCase();
        return ps.startsWith(REWORK_STATUS_LOWER);
      })
      .map((x: Record<string, unknown>) => {
        const ps = String(x.payment_status ?? BUYER_STATUS_REWORK);
        const submittedAt = x.submitted_at ?? x.created_at ?? null;
        return { id: String(x.id), status: ps, submitted_at: (submittedAt as string | null) };
      });

    let rejectedClean = rejectedRaw;
    try {
      const ids = rejectedRaw.map((r) => r.id);
      if (ids.length) {
        const pi = await fetchBuyerProposalItemIds(supabase, ids);
        if (!pi.error) {
          const cnt: Record<string, number> = {};
          (pi.data || []).forEach((row: Record<string, unknown>) => {
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

    try {
      await preloadProposalTitles?.([
        ...pendingClean.map((x) => x.id),
        ...approvedClean.map((x) => x.id),
        ...rejectedClean.map((x) => x.id),
      ]);
    } catch {
      // no-op
    }
  } catch (e: unknown) {
    log?.("[buyer] fetchBuckets error:", e instanceof Error ? e.message : String(e));
  } finally {
    setLoadingBuckets(false);
  }
}
