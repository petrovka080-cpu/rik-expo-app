import type { SupabaseClient } from "@supabase/supabase-js";
import type { BuyerInboxRow } from "../../lib/catalog_api";
import {
  BUYER_STATUS_APPROVED,
  BUYER_STATUS_PENDING,
  BUYER_STATUS_REWORK,
  fetchBuyerProposalItemIds,
  fetchBuyerProposalSummaryByStatuses,
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

type LogFn = (msg: unknown, ...rest: unknown[]) => void;

const REWORK_STATUS_LOWER = BUYER_STATUS_REWORK.toLowerCase();
const uniqIds = (values: (string | null | undefined)[]) =>
  Array.from(new Set((values || []).map((value) => String(value ?? "").trim()).filter(Boolean)));

export type BuyerInboxLoadResult = {
  rows: BuyerInboxRow[];
  requestIds: string[];
};

export type BuyerBucketsLoadResult = {
  pending: BuyerProposalBucketRow[];
  approved: BuyerProposalBucketRow[];
  rejected: BuyerProposalBucketRow[];
  proposalIds: string[];
};

export async function loadBuyerInboxData(params: {
  listBuyerInbox: () => Promise<BuyerInboxRow[]>;
  log?: LogFn;
}): Promise<BuyerInboxLoadResult> {
  const { listBuyerInbox, log } = params;

  let rows: BuyerInboxRow[] = [];
  try {
    rows = await listBuyerInbox();
  } catch (e: unknown) {
    log?.("[buyer] listBuyerInbox ex:", e instanceof Error ? e.message : String(e));
  }

  return {
    rows: rows || [],
    requestIds: uniqIds((rows || []).map((row) => row?.request_id)),
  };
}

export async function loadBuyerBucketsData(params: {
  supabase: SupabaseClient;
  log?: LogFn;
}): Promise<BuyerBucketsLoadResult> {
  const { supabase, log } = params;

  try {
    const summaryPromise = fetchBuyerProposalSummaryByStatuses(supabase, [
      BUYER_STATUS_PENDING,
      BUYER_STATUS_APPROVED,
    ]);
    const rejectedPromise = fetchBuyerRejectedProposalRows(supabase);

    const summaryResponse = await summaryPromise;
    const summaryRows = !summaryResponse.error ? mapProposalSummaryRows(summaryResponse.data) : [];
    const pending = summaryRows.filter((row) => row.status === BUYER_STATUS_PENDING);
    const approved = summaryRows.filter((row) => row.status === BUYER_STATUS_APPROVED);

    const rejectedResponse = await rejectedPromise;
    const rejectedRaw = !rejectedResponse.error
      ? mapRejectedProposalRows(rejectedResponse.data, REWORK_STATUS_LOWER)
      : [];

    let rejected = rejectedRaw;
    try {
      const rejectedIds = rejectedRaw.map((row) => row.id);
      if (rejectedIds.length) {
        const itemIdsResponse = await fetchBuyerProposalItemIds(supabase, rejectedIds);
        if (!itemIdsResponse.error) {
          rejected = filterProposalBucketsWithItems(
            rejectedRaw,
            buildProposalItemCountMap(itemIdsResponse.data),
          );
        }
      }
    } catch {
      // no-op
    }

    return {
      pending,
      approved,
      rejected,
      proposalIds: uniqIds([
        ...pending.map((row) => row.id),
        ...approved.map((row) => row.id),
        ...rejected.map((row) => row.id),
      ]),
    };
  } catch (e: unknown) {
    log?.("[buyer] loadBuyerBucketsData error:", e instanceof Error ? e.message : String(e));
    return {
      pending: [],
      approved: [],
      rejected: [],
      proposalIds: [],
    };
  }
}
