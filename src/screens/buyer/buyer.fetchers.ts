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
import {
  buildProposalItemCountMap,
  filterProposalBucketsWithItems,
  mapProposalSummaryRows,
  mapRejectedProposalRows,
  type BuyerProposalBucketRow,
} from "./buyer.fetchers.data";

export type { BuyerProposalBucketRow } from "./buyer.fetchers.data";

const REWORK_STATUS_LOWER = BUYER_STATUS_REWORK.toLowerCase();
const uniqIds = (values: Array<string | null | undefined>) =>
  Array.from(new Set((values || []).map((value) => String(value ?? "").trim()).filter(Boolean)));

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

    const reqIds = uniqIds((inbox || []).map((r) => r?.request_id));

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
    const pendingPromise = fetchBuyerProposalSummaryByStatus(supabase, BUYER_STATUS_PENDING);
    const approvedPromise = fetchBuyerProposalSummaryByStatus(supabase, BUYER_STATUS_APPROVED);
    const rejectedPromise = fetchBuyerRejectedProposalRows(supabase);

    const pQ = await pendingPromise;
    const pendingClean = !pQ.error ? mapProposalSummaryRows(pQ.data) : [];
    setPending(pendingClean);

    const apQ = await approvedPromise;
    const approvedClean = !apQ.error ? mapProposalSummaryRows(apQ.data) : [];
    setApproved(approvedClean);

    const reAcc = await rejectedPromise;
    const rejectedRaw = !reAcc.error ? mapRejectedProposalRows(reAcc.data, REWORK_STATUS_LOWER) : [];

    let rejectedClean = rejectedRaw;
    try {
      const ids = rejectedRaw.map((r) => r.id);
      if (ids.length) {
        const pi = await fetchBuyerProposalItemIds(supabase, ids);
        if (!pi.error) {
          rejectedClean = filterProposalBucketsWithItems(
            rejectedRaw,
            buildProposalItemCountMap(pi.data),
          );
        }
      }
    } catch {
      // no-op
    }

    setRejected(rejectedClean);

    try {
      const proposalIds = uniqIds([
        ...pendingClean.map((x) => x.id),
        ...approvedClean.map((x) => x.id),
        ...rejectedClean.map((x) => x.id),
      ]);
      if (proposalIds.length) {
        await preloadProposalTitles?.(proposalIds);
      }
    } catch {
      // no-op
    }
  } catch (e: unknown) {
    log?.("[buyer] fetchBuckets error:", e instanceof Error ? e.message : String(e));
  } finally {
    setLoadingBuckets(false);
  }
}
