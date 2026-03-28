import type { SupabaseClient } from "@supabase/supabase-js";
import type { BuyerInboxRow } from "../../lib/catalog_api";
import {
  beginPlatformObservability,
  recordPlatformObservability,
} from "../../lib/observability/platformObservability";
import {
  BUYER_STATUS_APPROVED,
  BUYER_STATUS_PENDING,
  BUYER_STATUS_REWORK,
  fetchBuyerProposalItemIds,
  fetchBuyerProposalSummaryByStatuses,
  fetchBuyerRejectedProposalRows,
} from "./buyer.buckets.repo";
import {
  adaptBuyerSummaryInboxScopeEnvelope,
  adaptBuyerSummaryBucketsScopeEnvelope,
  buildProposalItemCountMap,
  filterProposalBucketsWithItems,
  mapProposalSummaryRows,
  mapRejectedProposalRows,
  type BuyerProposalBucketRow,
} from "./buyer.fetchers.data";
import { matchesBuyerSearchQuery } from "./buyer.list.selectors";
import { selectGroups } from "./buyer.selectors";

export type { BuyerProposalBucketRow } from "./buyer.fetchers.data";

type LogFn = (msg: unknown, ...rest: unknown[]) => void;

const REWORK_STATUS_LOWER = BUYER_STATUS_REWORK.toLowerCase();
const BUYER_BUCKETS_RPC_SOURCE_KIND = "rpc:buyer_summary_buckets_scope_v1";
const BUYER_BUCKETS_LEGACY_SOURCE_KIND = "rest:v_proposals_summary+proposals+proposal_items";
const BUYER_INBOX_RPC_SOURCE_KIND = "rpc:buyer_summary_inbox_scope_v1";
const BUYER_INBOX_LEGACY_SOURCE_KIND = "rpc:list_buyer_inbox+client_group_window";
const uniqIds = (values: (string | null | undefined)[]) =>
  Array.from(new Set((values || []).map((value) => String(value ?? "").trim()).filter(Boolean)));

const toInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : fallback;
};

const toMaybeText = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text || null;
};

export type BuyerInboxWindowMeta = {
  offsetGroups: number;
  limitGroups: number;
  returnedGroupCount: number;
  totalGroupCount: number;
  hasMore: boolean;
  search: string | null;
};

export type BuyerInboxSourceMeta = {
  primaryOwner: "rpc_scope_v1" | "legacy_client_group_window";
  fallbackUsed: boolean;
  sourceKind: string;
  parityStatus: "not_checked";
  backendFirstPrimary: boolean;
};

export type BuyerInboxLoadResult = {
  rows: BuyerInboxRow[];
  requestIds: string[];
  meta: BuyerInboxWindowMeta;
  sourceMeta: BuyerInboxSourceMeta;
};

export type BuyerBucketsLoadResult = {
  pending: BuyerProposalBucketRow[];
  approved: BuyerProposalBucketRow[];
  rejected: BuyerProposalBucketRow[];
  proposalIds: string[];
  meta?: Record<string, unknown>;
  sourceMeta: {
    primaryOwner: "rpc_scope_v1" | "legacy_client_stitch";
    fallbackUsed: boolean;
    sourceKind: string;
    parityStatus: "not_checked";
    backendFirstPrimary: boolean;
  };
};

export async function loadBuyerInboxData(params: {
  listBuyerInbox: () => Promise<BuyerInboxRow[]>;
  log?: LogFn;
}): Promise<BuyerInboxLoadResult> {
  const { listBuyerInbox, log } = params;
  const observation = beginPlatformObservability({
    screen: "buyer",
    surface: "summary_inbox",
    category: "fetch",
    event: "load_inbox",
    sourceKind: "rpc:list_buyer_inbox",
  });

  let rows: BuyerInboxRow[] = [];
  let loadError: unknown = null;
  try {
    rows = await listBuyerInbox();
  } catch (e: unknown) {
    loadError = e;
    log?.("[buyer] listBuyerInbox ex:", e instanceof Error ? e.message : String(e));
  }

  const result = {
    rows: rows || [],
    requestIds: uniqIds((rows || []).map((row) => row?.request_id)),
    meta: {
      offsetGroups: 0,
      limitGroups: 0,
      returnedGroupCount: 0,
      totalGroupCount: 0,
      hasMore: false,
      search: null,
    },
    sourceMeta: {
      primaryOwner: "legacy_client_group_window" as const,
      fallbackUsed: false,
      sourceKind: BUYER_INBOX_LEGACY_SOURCE_KIND,
      parityStatus: "not_checked" as const,
      backendFirstPrimary: false,
    },
  };
  if (loadError) {
    observation.error(loadError, {
      rowCount: result.rows.length,
      errorStage: "rpc:list_buyer_inbox",
    });
  } else {
    observation.success({
      rowCount: result.rows.length,
      extra: {
        requestIds: result.requestIds.length,
      },
    });
  }
  return result;
}

const sliceBuyerInboxRowsWindow = (params: {
  rows: BuyerInboxRow[];
  offsetGroups: number;
  limitGroups: number;
  search?: string | null;
}): BuyerInboxLoadResult => {
  const { rows, offsetGroups, limitGroups, search } = params;
  const groups = selectGroups(rows);
  const filteredGroups = search?.trim()
    ? groups.filter((group) => matchesBuyerSearchQuery(group, search))
    : groups;
  const pageGroups = filteredGroups.slice(offsetGroups, offsetGroups + limitGroups);
  const pageRows = pageGroups.flatMap((group) => group.items);
  return {
    rows: pageRows,
    requestIds: uniqIds(pageRows.map((row) => row?.request_id)),
    meta: {
      offsetGroups,
      limitGroups,
      returnedGroupCount: pageGroups.length,
      totalGroupCount: filteredGroups.length,
      hasMore: offsetGroups + pageGroups.length < filteredGroups.length,
      search: search?.trim() ? search.trim() : null,
    },
    sourceMeta: {
      primaryOwner: "legacy_client_group_window",
      fallbackUsed: false,
      sourceKind: BUYER_INBOX_LEGACY_SOURCE_KIND,
      parityStatus: "not_checked",
      backendFirstPrimary: false,
    },
  };
};

export async function loadBuyerInboxWindowData(params: {
  supabase: SupabaseClient;
  listBuyerInbox: () => Promise<BuyerInboxRow[]>;
  offsetGroups: number;
  limitGroups: number;
  search?: string | null;
  log?: LogFn;
}): Promise<BuyerInboxLoadResult> {
  const { supabase, listBuyerInbox, offsetGroups, limitGroups, search, log } = params;
  const observation = beginPlatformObservability({
    screen: "buyer",
    surface: "summary_inbox",
    category: "fetch",
    event: "load_inbox",
    sourceKind: BUYER_INBOX_RPC_SOURCE_KIND,
  });

  try {
    const { data, error } = await supabase.rpc("buyer_summary_inbox_scope_v1" as never, {
      p_offset: Math.max(0, offsetGroups),
      p_limit: Math.max(1, limitGroups),
      p_search: search?.trim() || null,
      p_company_id: null,
    } as never);
    if (error) throw error;

    const envelope = adaptBuyerSummaryInboxScopeEnvelope(data);
    const totalGroupCount = toInt(envelope.meta.total_group_count, 0);
    const returnedGroupCount = toInt(envelope.meta.returned_group_count, 0);
    const result: BuyerInboxLoadResult = {
      rows: envelope.rows,
      requestIds: uniqIds(envelope.rows.map((row) => row?.request_id)),
      meta: {
        offsetGroups: toInt(envelope.meta.offset_groups, Math.max(0, offsetGroups)),
        limitGroups: toInt(envelope.meta.limit_groups, Math.max(1, limitGroups)),
        returnedGroupCount,
        totalGroupCount,
        hasMore:
          typeof envelope.meta.has_more === "boolean"
            ? Boolean(envelope.meta.has_more)
            : Math.max(0, offsetGroups) + returnedGroupCount < totalGroupCount,
        search: toMaybeText(envelope.meta.search),
      },
      sourceMeta: {
        primaryOwner: "rpc_scope_v1",
        fallbackUsed: false,
        sourceKind: BUYER_INBOX_RPC_SOURCE_KIND,
        parityStatus: "not_checked",
        backendFirstPrimary: true,
      },
    };

    observation.success({
      rowCount: result.rows.length,
      sourceKind: result.sourceMeta.sourceKind,
      fallbackUsed: false,
      extra: {
        primaryOwner: result.sourceMeta.primaryOwner,
        backendFirstPrimary: true,
        requestIds: result.requestIds.length,
        offsetGroups: result.meta.offsetGroups,
        limitGroups: result.meta.limitGroups,
        returnedGroupCount: result.meta.returnedGroupCount,
        totalGroupCount: result.meta.totalGroupCount,
        hasMore: result.meta.hasMore,
        search: result.meta.search,
      },
    });
    return result;
  } catch (error) {
    const fallbackReason = error instanceof Error ? error.message : String(error ?? "");
    log?.("[buyer] loadBuyerInboxWindowData rpc error:", fallbackReason);
    recordPlatformObservability({
      screen: "buyer",
      surface: "summary_inbox",
      category: "fetch",
      event: "load_inbox_primary_rpc",
      result: "error",
      sourceKind: BUYER_INBOX_RPC_SOURCE_KIND,
      errorStage: "load_inbox_rpc",
      errorClass: error instanceof Error ? error.name : undefined,
      errorMessage: fallbackReason || undefined,
      fallbackUsed: true,
      extra: {
        offsetGroups,
        limitGroups,
      },
    });

    const legacy = await loadBuyerInboxData({
      listBuyerInbox,
      log,
    });
    const fallback = sliceBuyerInboxRowsWindow({
      rows: legacy.rows,
      offsetGroups,
      limitGroups,
      search,
    });

    observation.success({
      rowCount: fallback.rows.length,
      sourceKind: fallback.sourceMeta.sourceKind,
      fallbackUsed: true,
      extra: {
        primaryOwner: fallback.sourceMeta.primaryOwner,
        backendFirstPrimary: false,
        requestIds: fallback.requestIds.length,
        offsetGroups: fallback.meta.offsetGroups,
        limitGroups: fallback.meta.limitGroups,
        returnedGroupCount: fallback.meta.returnedGroupCount,
        totalGroupCount: fallback.meta.totalGroupCount,
        hasMore: fallback.meta.hasMore,
        fallbackReason,
        search: fallback.meta.search,
      },
    });

    return {
      ...fallback,
      sourceMeta: {
        ...fallback.sourceMeta,
        fallbackUsed: true,
      },
    };
  }
}

async function loadBuyerBucketsDataLegacyInternal(params: {
  supabase: SupabaseClient;
  log?: LogFn;
}, options?: {
  observe?: boolean;
}): Promise<BuyerBucketsLoadResult> {
  const { supabase, log } = params;
  const observation =
    options?.observe !== false
      ? beginPlatformObservability({
          screen: "buyer",
          surface: "summary_buckets",
          category: "fetch",
          event: "load_buckets_legacy",
          sourceKind: BUYER_BUCKETS_LEGACY_SOURCE_KIND,
        })
      : null;

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
    const rejectedIds = rejectedRaw.map((row) => row.id);

    let rejected = rejectedRaw;
    try {
      if (rejectedIds.length) {
        const itemIdsResponse = await fetchBuyerProposalItemIds(supabase, rejectedIds);
        if (!itemIdsResponse.error) {
          rejected = filterProposalBucketsWithItems(
            rejectedRaw,
            buildProposalItemCountMap(itemIdsResponse.data),
          );
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? "");
      log?.("[buyer] rejected overlay item-count fallback:", message);
      recordPlatformObservability({
        screen: "buyer",
        surface: "summary_buckets",
        category: "fetch",
        event: "load_buckets_rejected_overlay",
        result: "error",
        sourceKind: BUYER_BUCKETS_LEGACY_SOURCE_KIND,
        fallbackUsed: true,
        errorStage: "rejected_overlay_item_count",
        errorClass: error instanceof Error ? error.name : undefined,
        errorMessage: message || undefined,
        extra: {
          primaryOwner: "legacy_client_stitch",
          rejectedIds: rejectedIds.length,
          mode: "degraded",
        },
      });
    }

    const result = {
      pending,
      approved,
      rejected,
      proposalIds: uniqIds([
        ...pending.map((row) => row.id),
        ...approved.map((row) => row.id),
        ...rejected.map((row) => row.id),
      ]),
      meta: {
        legacyStageCount: rejectedIds.length ? 3 : 2,
        rejectedOverlayApplied: rejectedIds.length > 0,
      },
      sourceMeta: {
        primaryOwner: "legacy_client_stitch" as const,
        fallbackUsed: false,
        sourceKind: BUYER_BUCKETS_LEGACY_SOURCE_KIND,
        parityStatus: "not_checked" as const,
        backendFirstPrimary: false,
      },
    };
    observation?.success({
      rowCount: pending.length + approved.length + rejected.length,
      sourceKind: BUYER_BUCKETS_LEGACY_SOURCE_KIND,
      fallbackUsed: false,
      extra: {
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length,
        proposalIds: result.proposalIds.length,
        primaryOwner: "legacy_client_stitch",
        bucketCount: [pending, approved, rejected].filter((rows) => rows.length > 0).length,
        legacyStageCount: result.meta.legacyStageCount,
      },
    });
    return result;
  } catch (e: unknown) {
    log?.("[buyer] loadBuyerBucketsData error:", e instanceof Error ? e.message : String(e));
    observation?.error(e, {
      rowCount: 0,
      errorStage: "load_buckets_legacy",
      sourceKind: BUYER_BUCKETS_LEGACY_SOURCE_KIND,
    });
    return {
      pending: [],
      approved: [],
      rejected: [],
      proposalIds: [],
      sourceMeta: {
        primaryOwner: "legacy_client_stitch",
        fallbackUsed: false,
        sourceKind: BUYER_BUCKETS_LEGACY_SOURCE_KIND,
        parityStatus: "not_checked",
        backendFirstPrimary: false,
      },
    };
  }
}

async function loadBuyerBucketsDataRpcInternal(params: {
  supabase: SupabaseClient;
  log?: LogFn;
}, options?: {
  observe?: boolean;
}): Promise<BuyerBucketsLoadResult> {
  const { supabase, log } = params;
  const observation =
    options?.observe !== false
      ? beginPlatformObservability({
          screen: "buyer",
          surface: "summary_buckets",
          category: "fetch",
          event: "load_buckets_rpc",
          sourceKind: BUYER_BUCKETS_RPC_SOURCE_KIND,
        })
      : null;

  try {
    const { data, error } = await supabase.rpc("buyer_summary_buckets_scope_v1" as never);
    if (error) throw error;

    const envelope = adaptBuyerSummaryBucketsScopeEnvelope(data);
    const result: BuyerBucketsLoadResult = {
      pending: envelope.pending,
      approved: envelope.approved,
      rejected: envelope.rejected,
      proposalIds: uniqIds([
        ...envelope.pending.map((row) => row.id),
        ...envelope.approved.map((row) => row.id),
        ...envelope.rejected.map((row) => row.id),
      ]),
      meta: envelope.meta,
      sourceMeta: {
        primaryOwner: "rpc_scope_v1",
        fallbackUsed: false,
        sourceKind: BUYER_BUCKETS_RPC_SOURCE_KIND,
        parityStatus: "not_checked",
        backendFirstPrimary: true,
      },
    };

    observation?.success({
      rowCount: result.pending.length + result.approved.length + result.rejected.length,
      sourceKind: BUYER_BUCKETS_RPC_SOURCE_KIND,
      fallbackUsed: false,
      extra: {
        pending: result.pending.length,
        approved: result.approved.length,
        rejected: result.rejected.length,
        proposalIds: result.proposalIds.length,
        primaryOwner: "rpc_scope_v1",
        bucketCount: [result.pending, result.approved, result.rejected].filter((rows) => rows.length > 0).length,
        backendFirstPrimary: true,
      },
    });
    return result;
  } catch (e: unknown) {
    log?.("[buyer] loadBuyerBucketsDataRpc error:", e instanceof Error ? e.message : String(e));
    observation?.error(e, {
      rowCount: 0,
      errorStage: "load_buckets_rpc",
      sourceKind: BUYER_BUCKETS_RPC_SOURCE_KIND,
    });
    throw e;
  }
}

export async function loadBuyerBucketsDataLegacy(params: {
  supabase: SupabaseClient;
  log?: LogFn;
}): Promise<BuyerBucketsLoadResult> {
  return await loadBuyerBucketsDataLegacyInternal(params, { observe: true });
}

export async function loadBuyerBucketsDataRpc(params: {
  supabase: SupabaseClient;
  log?: LogFn;
}): Promise<BuyerBucketsLoadResult> {
  return await loadBuyerBucketsDataRpcInternal(params, { observe: true });
}

export async function loadBuyerBucketsData(params: {
  supabase: SupabaseClient;
  log?: LogFn;
}): Promise<BuyerBucketsLoadResult> {
  const observation = beginPlatformObservability({
    screen: "buyer",
    surface: "summary_buckets",
    category: "fetch",
    event: "load_buckets",
    sourceKind: BUYER_BUCKETS_RPC_SOURCE_KIND,
  });

  try {
    const result = await loadBuyerBucketsDataRpcInternal(params, { observe: false });
    observation.success({
      rowCount: result.pending.length + result.approved.length + result.rejected.length,
      sourceKind: result.sourceMeta.sourceKind,
      fallbackUsed: false,
      extra: {
        pending: result.pending.length,
        approved: result.approved.length,
        rejected: result.rejected.length,
        proposalIds: result.proposalIds.length,
        primaryOwner: result.sourceMeta.primaryOwner,
        backendFirstPrimary: result.sourceMeta.backendFirstPrimary,
      },
    });
    return result;
  } catch (error) {
    const fallbackReason = error instanceof Error ? error.message : String(error ?? "");
    recordPlatformObservability({
      screen: "buyer",
      surface: "summary_buckets",
      category: "fetch",
      event: "load_buckets_primary_rpc",
      result: "error",
      sourceKind: BUYER_BUCKETS_RPC_SOURCE_KIND,
      errorStage: "load_buckets_rpc",
      errorClass: error instanceof Error ? error.name : undefined,
      errorMessage: fallbackReason || undefined,
      fallbackUsed: true,
    });

    const fallback = await loadBuyerBucketsDataLegacyInternal(params, { observe: false });
    observation.success({
      rowCount: fallback.pending.length + fallback.approved.length + fallback.rejected.length,
      sourceKind: fallback.sourceMeta.sourceKind,
      fallbackUsed: true,
      extra: {
        pending: fallback.pending.length,
        approved: fallback.approved.length,
        rejected: fallback.rejected.length,
        proposalIds: fallback.proposalIds.length,
        primaryOwner: fallback.sourceMeta.primaryOwner,
        backendFirstPrimary: false,
        fallbackReason,
      },
    });
    return {
      ...fallback,
      sourceMeta: {
        ...fallback.sourceMeta,
        fallbackUsed: true,
      },
    };
  }
}
