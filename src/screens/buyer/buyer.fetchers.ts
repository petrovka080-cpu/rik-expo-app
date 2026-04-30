import type { SupabaseClient } from "@supabase/supabase-js";
import type { BuyerInboxRow } from "../../lib/catalog_api";
import {
  isRpcRowsEnvelope,
  runContainedRpc,
  validateRpcResponse,
} from "../../lib/api/queryBoundary";
import {
  beginPlatformObservability,
  recordPlatformObservability,
} from "../../lib/observability/platformObservability";
import {
  adaptBuyerSummaryInboxScopeEnvelope,
  adaptBuyerSummaryBucketsScopeEnvelope,
  withBuyerBucketCanonicalCount,
  type BuyerProposalBucketRow,
  type BuyerSummaryBucketCounts,
} from "./buyer.fetchers.data";

export type { BuyerProposalBucketRow } from "./buyer.fetchers.data";

type LogFn = (msg: unknown, ...rest: unknown[]) => void;
type BuyerRpcScopeClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{
    data: unknown;
    error: unknown;
  }>;
};

const BUYER_BUCKETS_RPC_SOURCE_KIND = "rpc:buyer_summary_buckets_scope_v1";
const BUYER_INBOX_RPC_SOURCE_KIND = "rpc:buyer_summary_inbox_scope_v1";
const BUYER_INBOX_FULL_SCAN_GROUP_PAGE_SIZE = 100;
const BUYER_INBOX_MAX_GROUP_PAGE_SIZE = 100;
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

const normalizeBuyerInboxOffset = (value: unknown): number => toInt(value, 0);

const normalizeBuyerInboxLimit = (value: unknown): number =>
  Math.min(
    BUYER_INBOX_MAX_GROUP_PAGE_SIZE,
    Math.max(1, toInt(value, BUYER_INBOX_FULL_SCAN_GROUP_PAGE_SIZE)),
  );

export type BuyerInboxWindowMeta = {
  offsetGroups: number;
  limitGroups: number;
  returnedGroupCount: number;
  totalGroupCount: number;
  hasMore: boolean;
  search: string | null;
};

export type BuyerInboxSourceMeta = {
  primaryOwner: "rpc_scope_v1";
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
  counts: BuyerSummaryBucketCounts;
  proposalIds: string[];
  meta?: Record<string, unknown>;
  sourceMeta: {
    primaryOwner: "rpc_scope_v1";
    fallbackUsed: boolean;
    sourceKind: string;
    parityStatus: "not_checked";
    backendFirstPrimary: boolean;
  };
};

export async function loadBuyerInboxData(params: {
  supabase: BuyerRpcScopeClient;
  log?: LogFn;
}): Promise<BuyerInboxLoadResult> {
  const { supabase, log } = params;
  const observation = beginPlatformObservability({
    screen: "buyer",
    surface: "summary_inbox",
    category: "fetch",
    event: "load_inbox_full",
    sourceKind: BUYER_INBOX_RPC_SOURCE_KIND,
  });

  try {
    const rows: BuyerInboxRow[] = [];
    let totalGroupCount = 0;
    let returnedGroupCount = 0;
    let pageCount = 0;
    let offsetGroups = 0;

    while (true) {
      const page = await loadBuyerInboxWindowScope({
        supabase,
        offsetGroups,
        limitGroups: BUYER_INBOX_FULL_SCAN_GROUP_PAGE_SIZE,
      });

      rows.push(...page.rows);
      totalGroupCount = page.meta.totalGroupCount;
      returnedGroupCount += page.meta.returnedGroupCount;
      pageCount += 1;

      if (!page.meta.hasMore) {
        const result = {
          rows,
          requestIds: uniqIds(rows.map((row) => row?.request_id)),
          meta: {
            offsetGroups: 0,
            limitGroups: BUYER_INBOX_FULL_SCAN_GROUP_PAGE_SIZE,
            returnedGroupCount,
            totalGroupCount,
            hasMore: false,
            search: null,
          },
          sourceMeta: {
            primaryOwner: "rpc_scope_v1" as const,
            fallbackUsed: false,
            sourceKind: BUYER_INBOX_RPC_SOURCE_KIND,
            parityStatus: "not_checked" as const,
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
            totalGroupCount,
            returnedGroupCount,
            pageCount,
          },
        });
        return result;
      }

      if (page.meta.returnedGroupCount <= 0) {
        throw new Error("buyer_summary_inbox_scope_v1 reported hasMore with empty page");
      }

      offsetGroups += page.meta.returnedGroupCount;
    }
  } catch (error) {
    log?.("[buyer] loadBuyerInboxData rpc error:", error instanceof Error ? error.message : String(error));
    observation.error(error, {
      rowCount: 0,
      errorStage: "load_inbox_full_scope_v1",
      sourceKind: BUYER_INBOX_RPC_SOURCE_KIND,
      fallbackUsed: false,
    });
    throw error;
  }
}

const loadBuyerInboxWindowScope = async (params: {
  supabase: BuyerRpcScopeClient;
  offsetGroups: number;
  limitGroups: number;
  search?: string | null;
}): Promise<BuyerInboxLoadResult> => {
  const { supabase, offsetGroups, limitGroups, search } = params;
  const normalizedOffsetGroups = normalizeBuyerInboxOffset(offsetGroups);
  const normalizedLimitGroups = normalizeBuyerInboxLimit(limitGroups);
  const { data, error } = await runContainedRpc(supabase, "buyer_summary_inbox_scope_v1", {
    p_offset: normalizedOffsetGroups,
    p_limit: normalizedLimitGroups,
    p_search: search?.trim() || null,
    p_company_id: null,
  }, {
    screen: "buyer",
    surface: "summary_inbox",
    owner: "buyer.fetchers",
    sourceKind: BUYER_INBOX_RPC_SOURCE_KIND,
  });
  if (error) throw error;

  const validated = validateRpcResponse(data, isRpcRowsEnvelope, {
    rpcName: "buyer_summary_inbox_scope_v1",
    caller: "loadBuyerInboxWindowScope",
    domain: "buyer",
  });
  const envelope = adaptBuyerSummaryInboxScopeEnvelope(validated);
  const totalGroupCount = toInt(envelope.meta.total_group_count, 0);
  const pageReturnedGroupCount = toInt(envelope.meta.returned_group_count, 0);
  return {
    rows: envelope.rows,
    requestIds: uniqIds(envelope.rows.map((row) => row?.request_id)),
    meta: {
      offsetGroups: toInt(envelope.meta.offset_groups, normalizedOffsetGroups),
      limitGroups: toInt(envelope.meta.limit_groups, normalizedLimitGroups),
      returnedGroupCount: pageReturnedGroupCount,
      totalGroupCount,
      hasMore:
        typeof envelope.meta.has_more === "boolean"
          ? Boolean(envelope.meta.has_more)
          : normalizedOffsetGroups + pageReturnedGroupCount < totalGroupCount,
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
};

export async function loadBuyerInboxWindowData(params: {
  supabase: BuyerRpcScopeClient;
  listBuyerInbox?: () => Promise<BuyerInboxRow[]>;
  offsetGroups: number;
  limitGroups: number;
  search?: string | null;
  log?: LogFn;
}): Promise<BuyerInboxLoadResult> {
  const { supabase, offsetGroups, limitGroups, search, log } = params;
  const observation = beginPlatformObservability({
    screen: "buyer",
    surface: "summary_inbox",
    category: "fetch",
    event: "load_inbox",
    sourceKind: BUYER_INBOX_RPC_SOURCE_KIND,
  });

  try {
    const normalizedOffsetGroups = normalizeBuyerInboxOffset(offsetGroups);
    const normalizedLimitGroups = normalizeBuyerInboxLimit(limitGroups);
    const result = await loadBuyerInboxWindowScope({
      supabase,
      offsetGroups: normalizedOffsetGroups,
      limitGroups: normalizedLimitGroups,
      search,
    });

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
    const failureReason = error instanceof Error ? error.message : String(error ?? "");
    log?.("[buyer] loadBuyerInboxWindowData rpc error:", failureReason);
    recordPlatformObservability({
      screen: "buyer",
      surface: "summary_inbox",
      category: "fetch",
      event: "load_inbox_primary_rpc",
      result: "error",
      sourceKind: BUYER_INBOX_RPC_SOURCE_KIND,
      errorStage: "load_inbox_rpc",
      errorClass: error instanceof Error ? error.name : undefined,
      errorMessage: failureReason || undefined,
      fallbackUsed: false,
      extra: {
        offsetGroups: normalizeBuyerInboxOffset(offsetGroups),
        limitGroups: normalizeBuyerInboxLimit(limitGroups),
        search: search?.trim() || null,
      },
    });
    observation.error(error, {
      rowCount: 0,
      sourceKind: BUYER_INBOX_RPC_SOURCE_KIND,
      fallbackUsed: false,
      errorStage: "load_inbox_rpc",
      extra: {
        offsetGroups: normalizeBuyerInboxOffset(offsetGroups),
        limitGroups: normalizeBuyerInboxLimit(limitGroups),
        search: search?.trim() || null,
      },
    });
    throw error;
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
    const { data, error } = await runContainedRpc(supabase, "buyer_summary_buckets_scope_v1", undefined, {
      screen: "buyer",
      surface: "summary_buckets",
      owner: "buyer.fetchers",
      sourceKind: BUYER_BUCKETS_RPC_SOURCE_KIND,
    });
    if (error) throw error;

    const envelope = adaptBuyerSummaryBucketsScopeEnvelope(data);
    const result: BuyerBucketsLoadResult = {
      pending: withBuyerBucketCanonicalCount(envelope.pending, envelope.counts.pendingCount),
      approved: withBuyerBucketCanonicalCount(envelope.approved, envelope.counts.approvedCount),
      rejected: withBuyerBucketCanonicalCount(envelope.rejected, envelope.counts.rejectedCount),
      counts: envelope.counts,
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
        pendingCount: result.counts.pendingCount,
        approvedCount: result.counts.approvedCount,
        rejectedCount: result.counts.rejectedCount,
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
        pendingCount: result.counts.pendingCount,
        approvedCount: result.counts.approvedCount,
        rejectedCount: result.counts.rejectedCount,
        proposalIds: result.proposalIds.length,
        primaryOwner: result.sourceMeta.primaryOwner,
        backendFirstPrimary: result.sourceMeta.backendFirstPrimary,
      },
    });
    return result;
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : String(error ?? "");
    params.log?.("[buyer] loadBuyerBucketsData rpc error:", failureReason);
    recordPlatformObservability({
      screen: "buyer",
      surface: "summary_buckets",
      category: "fetch",
      event: "load_buckets_primary_rpc",
      result: "error",
      sourceKind: BUYER_BUCKETS_RPC_SOURCE_KIND,
      errorStage: "load_buckets_rpc",
      errorClass: error instanceof Error ? error.name : undefined,
      errorMessage: failureReason || undefined,
      fallbackUsed: false,
    });
    observation.error(error, {
      rowCount: 0,
      sourceKind: BUYER_BUCKETS_RPC_SOURCE_KIND,
      fallbackUsed: false,
      errorStage: "load_buckets_rpc",
    });
    throw error;
  }
}
