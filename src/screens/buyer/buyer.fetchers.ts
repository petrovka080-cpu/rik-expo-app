import type { SupabaseClient } from "@supabase/supabase-js";
import type { BuyerInboxRow } from "../../lib/catalog_api";
import {
  isRpcRowsEnvelope,
  RpcValidationError,
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
  isBuyerSummaryBucketsScopeResponse,
  withBuyerBucketCanonicalCount,
  type BuyerProposalBucketRow,
  type BuyerSummaryBucketCounts,
} from "./buyer.fetchers.data";

export type { BuyerProposalBucketRow } from "./buyer.fetchers.data";

type LogFn = (msg: unknown, ...rest: unknown[]) => void;
type BuyerRpcScopeClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<{
    data: unknown;
    error: unknown;
  }>;
};

const BUYER_BUCKETS_RPC_SOURCE_KIND = "rpc:buyer_summary_buckets_scope_v1";
const BUYER_INBOX_RPC_SOURCE_KIND = "rpc:buyer_summary_inbox_scope_v1";
const BUYER_INBOX_COMPAT_LIST_SOURCE_KIND = "compat:listBuyerInbox";
const BUYER_INBOX_COMPAT_REPAIR_SOURCE_KIND =
  "rpc:buyer_summary_inbox_scope_v1+compat:listBuyerInbox";
const BUYER_INBOX_FULL_SCAN_GROUP_PAGE_SIZE = 100;
const BUYER_INBOX_FULL_SCAN_MAX_GROUPS = 5000;
const BUYER_INBOX_FULL_SCAN_MAX_PAGES = Math.ceil(
  BUYER_INBOX_FULL_SCAN_MAX_GROUPS / BUYER_INBOX_FULL_SCAN_GROUP_PAGE_SIZE,
);
const BUYER_INBOX_MAX_GROUP_PAGE_SIZE = 100;
const uniqIds = (values: (string | null | undefined)[]) =>
  Array.from(
    new Set(
      (values || []).map((value) => String(value ?? "").trim()).filter(Boolean),
    ),
  );

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

const getRedactedBuyerRpcErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (error instanceof RpcValidationError) return fallback;
  return error instanceof Error && error.message.trim()
    ? error.message.trim()
    : String(error ?? fallback);
};

const getBuyerInboxCompatibilityGroupTime = (
  rows: BuyerInboxRow[],
): number => {
  const times = rows
    .map((row) => Date.parse(String(row.created_at ?? "")))
    .filter((value) => Number.isFinite(value));
  return times.length ? Math.max(...times) : 0;
};

const matchesBuyerInboxCompatibilitySearch = (
  row: BuyerInboxRow,
  search: string | null | undefined,
): boolean => {
  const needle = String(search ?? "").trim().toLowerCase();
  if (!needle) return true;

  return [
    row.request_id,
    row.request_id_old,
    row.request_item_id,
    row.rik_code,
    row.name_human,
    row.app_code,
    row.note,
    row.object_name,
    row.status,
    row.created_at,
    row.director_reject_reason,
    row.director_reject_note,
    row.last_offer_supplier,
    row.last_offer_note,
  ]
    .map((value) => String(value ?? "").toLowerCase())
    .some((value) => value.includes(needle));
};

const sliceBuyerInboxCompatibilityRows = (params: {
  rows: BuyerInboxRow[];
  offsetGroups: number;
  limitGroups: number;
  search?: string | null;
}): BuyerInboxLoadResult => {
  const normalizedOffsetGroups = normalizeBuyerInboxOffset(params.offsetGroups);
  const normalizedLimitGroups = normalizeBuyerInboxLimit(params.limitGroups);
  const searchText = toMaybeText(params.search);
  const groups = new Map<string, BuyerInboxRow[]>();

  for (const row of params.rows) {
    if (!matchesBuyerInboxCompatibilitySearch(row, searchText)) continue;
    const requestId = String(row?.request_id ?? "").trim();
    if (!requestId) continue;
    const group = groups.get(requestId) ?? [];
    group.push(row);
    groups.set(requestId, group);
  }

  const sortedGroups = Array.from(groups.entries()).sort((left, right) => {
    const byTime =
      getBuyerInboxCompatibilityGroupTime(right[1]) -
      getBuyerInboxCompatibilityGroupTime(left[1]);
    if (byTime !== 0) return byTime;
    return right[0].localeCompare(left[0]);
  });
  const selectedGroups = sortedGroups.slice(
    normalizedOffsetGroups,
    normalizedOffsetGroups + normalizedLimitGroups,
  );
  const rows = selectedGroups.flatMap(([, groupRows]) => groupRows);
  const requestIds = selectedGroups.map(([requestId]) => requestId);

  return {
    rows,
    requestIds,
    meta: {
      offsetGroups: normalizedOffsetGroups,
      limitGroups: normalizedLimitGroups,
      returnedGroupCount: selectedGroups.length,
      totalGroupCount: sortedGroups.length,
      hasMore:
        normalizedOffsetGroups + selectedGroups.length < sortedGroups.length,
      search: searchText,
    },
    sourceMeta: {
      primaryOwner: "rpc_scope_v1",
      fallbackUsed: true,
      sourceKind: BUYER_INBOX_COMPAT_LIST_SOURCE_KIND,
      parityStatus: "not_checked",
      backendFirstPrimary: true,
    },
  };
};

const groupBuyerInboxRowsByRequestId = (rows: BuyerInboxRow[]) => {
  const groups = new Map<string, BuyerInboxRow[]>();
  for (const row of rows) {
    const requestId = String(row?.request_id ?? "").trim();
    if (!requestId) continue;
    const group = groups.get(requestId) ?? [];
    group.push(row);
    groups.set(requestId, group);
  }
  return groups;
};

const repairBuyerInboxVisibleGroupsFromCompatibilityRows = (
  result: BuyerInboxLoadResult,
  compatibilityRows: BuyerInboxRow[],
): BuyerInboxLoadResult | null => {
  if (!result.requestIds.length || !compatibilityRows.length) return null;

  const visibleRequestIds = new Set(result.requestIds);
  const rpcGroups = groupBuyerInboxRowsByRequestId(result.rows);
  const compatibilityGroups = groupBuyerInboxRowsByRequestId(
    compatibilityRows.filter((row) =>
      visibleRequestIds.has(String(row?.request_id ?? "").trim()),
    ),
  );
  const rows: BuyerInboxRow[] = [];
  let repaired = false;

  for (const requestId of result.requestIds) {
    const currentGroup = rpcGroups.get(requestId) ?? [];
    const compatibilityGroup = compatibilityGroups.get(requestId) ?? [];
    if (compatibilityGroup.length > currentGroup.length) {
      rows.push(...compatibilityGroup);
      repaired = true;
    } else {
      rows.push(...currentGroup);
    }
  }

  if (!repaired) return null;

  return {
    ...result,
    rows,
    requestIds: uniqIds(rows.map((row) => row?.request_id)),
    sourceMeta: {
      ...result.sourceMeta,
      fallbackUsed: true,
      sourceKind: BUYER_INBOX_COMPAT_REPAIR_SOURCE_KIND,
    },
  };
};

const shouldRepairBuyerInboxVisibleGroups = (
  result: BuyerInboxLoadResult,
  normalizedLimitGroups: number,
): boolean => {
  if (result.meta.returnedGroupCount <= 0 || result.requestIds.length === 0) {
    return false;
  }

  const groups = groupBuyerInboxRowsByRequestId(result.rows);
  if (groups.size === 0) return false;

  if (result.rows.length === normalizedLimitGroups) return true;

  return result.requestIds.some((requestId) => {
    const groupSize = groups.get(requestId)?.length ?? 0;
    return groupSize === normalizedLimitGroups;
  });
};

const buildBuyerInboxFullScanGroupCeilingError = () =>
  new Error(
    `buyer_summary_inbox_scope_v1 full scan exceeded max group ceiling (${BUYER_INBOX_FULL_SCAN_MAX_GROUPS})`,
  );

const buildBuyerInboxFullScanPageCeilingError = () =>
  new Error(
    `buyer_summary_inbox_scope_v1 full scan exceeded max page ceiling (${BUYER_INBOX_FULL_SCAN_MAX_PAGES})`,
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
  listBuyerInbox?: () => Promise<BuyerInboxRow[]>;
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

    for (
      let fullScanPageIndex = 0;
      fullScanPageIndex < BUYER_INBOX_FULL_SCAN_MAX_PAGES;
      fullScanPageIndex += 1
    ) {
      const page = await loadBuyerInboxWindowScope({
        supabase,
        offsetGroups,
        limitGroups: BUYER_INBOX_FULL_SCAN_GROUP_PAGE_SIZE,
      });

      if (
        page.meta.totalGroupCount > BUYER_INBOX_FULL_SCAN_MAX_GROUPS ||
        returnedGroupCount + page.meta.returnedGroupCount >
          BUYER_INBOX_FULL_SCAN_MAX_GROUPS
      ) {
        throw buildBuyerInboxFullScanGroupCeilingError();
      }

      rows.push(...page.rows);
      totalGroupCount = page.meta.totalGroupCount;
      returnedGroupCount += page.meta.returnedGroupCount;
      pageCount += 1;

      if (!page.meta.hasMore) {
        const result: BuyerInboxLoadResult = {
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
        let finalResult = result;
        if (
          params.listBuyerInbox &&
          shouldRepairBuyerInboxVisibleGroups(
            result,
            BUYER_INBOX_FULL_SCAN_GROUP_PAGE_SIZE,
          )
        ) {
          try {
            const compatibilityRows = await params.listBuyerInbox();
            const repairedResult =
              repairBuyerInboxVisibleGroupsFromCompatibilityRows(
                result,
                compatibilityRows,
              );

            if (repairedResult) {
              finalResult = repairedResult;
              recordPlatformObservability({
                screen: "buyer",
                surface: "summary_inbox",
                category: "fetch",
                event: "load_inbox_full_compat_group_repair",
                result: "success",
                sourceKind: BUYER_INBOX_COMPAT_REPAIR_SOURCE_KIND,
                fallbackUsed: true,
                rowCount: finalResult.rows.length,
                extra: {
                  primaryOwner: finalResult.sourceMeta.primaryOwner,
                  backendFirstPrimary: true,
                  requestIds: finalResult.requestIds.length,
                  totalGroupCount: finalResult.meta.totalGroupCount,
                  returnedGroupCount: finalResult.meta.returnedGroupCount,
                  pageCount,
                  primaryRowCount: result.rows.length,
                },
              });
            }
          } catch (compatibilityError) {
            log?.(
              "[buyer] listBuyerInbox full scan compatibility group repair skipped:",
              compatibilityError instanceof Error
                ? compatibilityError.message
                : String(compatibilityError),
            );
            recordPlatformObservability({
              screen: "buyer",
              surface: "summary_inbox",
              category: "fetch",
              event: "load_inbox_full_compat_group_repair",
              result: "error",
              sourceKind: BUYER_INBOX_COMPAT_REPAIR_SOURCE_KIND,
              fallbackUsed: false,
              errorStage: "compat_full_group_repair",
              errorClass:
                compatibilityError instanceof Error
                  ? compatibilityError.name
                  : undefined,
              errorMessage:
                compatibilityError instanceof Error
                  ? compatibilityError.message
                  : String(compatibilityError ?? ""),
              extra: {
                pageCount,
                totalGroupCount,
                returnedGroupCount,
                primaryRowCount: result.rows.length,
              },
            });
          }
        }

        observation.success({
          rowCount: finalResult.rows.length,
          sourceKind: finalResult.sourceMeta.sourceKind,
          fallbackUsed: finalResult.sourceMeta.fallbackUsed,
          extra: {
            primaryOwner: finalResult.sourceMeta.primaryOwner,
            backendFirstPrimary: true,
            requestIds: finalResult.requestIds.length,
            totalGroupCount: finalResult.meta.totalGroupCount,
            returnedGroupCount: finalResult.meta.returnedGroupCount,
            pageCount,
          },
        });
        return finalResult;
      }

      if (page.meta.returnedGroupCount <= 0) {
        throw new Error(
          "buyer_summary_inbox_scope_v1 reported hasMore with empty page",
        );
      }

      offsetGroups += page.meta.returnedGroupCount;
    }

    throw buildBuyerInboxFullScanPageCeilingError();
  } catch (error) {
    log?.(
      "[buyer] loadBuyerInboxData rpc error:",
      error instanceof Error ? error.message : String(error),
    );
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
  const { data, error } = await runContainedRpc(
    supabase,
    "buyer_summary_inbox_scope_v1",
    {
      p_offset: normalizedOffsetGroups,
      p_limit: normalizedLimitGroups,
      p_search: search?.trim() || null,
      p_company_id: null,
    },
    {
      screen: "buyer",
      surface: "summary_inbox",
      owner: "buyer.fetchers",
      sourceKind: BUYER_INBOX_RPC_SOURCE_KIND,
    },
  );
  if (error) throw error;

  const validated = validateRpcResponse(data, isRpcRowsEnvelope, {
    rpcName: "buyer_summary_inbox_scope_v1",
    caller: "loadBuyerInboxWindowScope",
    domain: "buyer",
  });
  const envelope = adaptBuyerSummaryInboxScopeEnvelope(validated);
  const totalGroupCount = toInt(envelope.meta.total_group_count, 0);
  const pageReturnedGroupCount = toInt(envelope.meta.returned_group_count, 0);
  const boundedRows = envelope.rows;
  const boundedReturnedGroupCount = Math.min(
    pageReturnedGroupCount,
    normalizedLimitGroups,
  );
  return {
    rows: boundedRows,
    requestIds: uniqIds(boundedRows.map((row) => row?.request_id)),
    meta: {
      offsetGroups: toInt(envelope.meta.offset_groups, normalizedOffsetGroups),
      limitGroups: Math.min(
        toInt(envelope.meta.limit_groups, normalizedLimitGroups),
        normalizedLimitGroups,
      ),
      returnedGroupCount: boundedReturnedGroupCount,
      totalGroupCount,
      hasMore:
        typeof envelope.meta.has_more === "boolean"
          ? Boolean(envelope.meta.has_more)
          : normalizedOffsetGroups + boundedReturnedGroupCount <
            totalGroupCount,
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

    if (
      params.listBuyerInbox &&
      shouldRepairBuyerInboxVisibleGroups(result, normalizedLimitGroups)
    ) {
      try {
        const compatibilityRows = await params.listBuyerInbox();
        const repairedResult = repairBuyerInboxVisibleGroupsFromCompatibilityRows(
          result,
          compatibilityRows,
        );

        if (repairedResult) {
          recordPlatformObservability({
            screen: "buyer",
            surface: "summary_inbox",
            category: "fetch",
            event: "load_inbox_compat_group_repair",
            result: "success",
            sourceKind: BUYER_INBOX_COMPAT_REPAIR_SOURCE_KIND,
            fallbackUsed: true,
            rowCount: repairedResult.rows.length,
            extra: {
              primaryOwner: repairedResult.sourceMeta.primaryOwner,
              backendFirstPrimary: true,
              requestIds: repairedResult.requestIds.length,
              offsetGroups: repairedResult.meta.offsetGroups,
              limitGroups: repairedResult.meta.limitGroups,
              returnedGroupCount: repairedResult.meta.returnedGroupCount,
              totalGroupCount: repairedResult.meta.totalGroupCount,
              hasMore: repairedResult.meta.hasMore,
              search: repairedResult.meta.search,
              primaryRowCount: result.rows.length,
            },
          });
          observation.success({
            rowCount: repairedResult.rows.length,
            sourceKind: repairedResult.sourceMeta.sourceKind,
            fallbackUsed: true,
            extra: {
              primaryOwner: repairedResult.sourceMeta.primaryOwner,
              backendFirstPrimary: true,
              requestIds: repairedResult.requestIds.length,
              offsetGroups: repairedResult.meta.offsetGroups,
              limitGroups: repairedResult.meta.limitGroups,
              returnedGroupCount: repairedResult.meta.returnedGroupCount,
              totalGroupCount: repairedResult.meta.totalGroupCount,
              hasMore: repairedResult.meta.hasMore,
              search: repairedResult.meta.search,
              primaryRowCount: result.rows.length,
            },
          });
          return repairedResult;
        }
      } catch (compatibilityError) {
        log?.(
          "[buyer] listBuyerInbox compatibility group repair skipped:",
          compatibilityError instanceof Error
            ? compatibilityError.message
            : String(compatibilityError),
        );
        recordPlatformObservability({
          screen: "buyer",
          surface: "summary_inbox",
          category: "fetch",
          event: "load_inbox_compat_group_repair",
          result: "error",
          sourceKind: BUYER_INBOX_COMPAT_REPAIR_SOURCE_KIND,
          fallbackUsed: false,
          errorStage: "compat_group_repair",
          errorClass:
            compatibilityError instanceof Error
              ? compatibilityError.name
              : undefined,
          errorMessage:
            compatibilityError instanceof Error
              ? compatibilityError.message
              : String(compatibilityError ?? ""),
          extra: {
            offsetGroups: normalizedOffsetGroups,
            limitGroups: normalizedLimitGroups,
            search: search?.trim() || null,
          },
        });
      }
    }

    if (
      params.listBuyerInbox &&
      result.rows.length === 0 &&
      result.meta.totalGroupCount === 0
    ) {
      try {
        const compatibilityRows = await params.listBuyerInbox();
        const compatibilityResult = sliceBuyerInboxCompatibilityRows({
          rows: compatibilityRows,
          offsetGroups: normalizedOffsetGroups,
          limitGroups: normalizedLimitGroups,
          search,
        });

        if (compatibilityResult.meta.totalGroupCount > 0) {
          recordPlatformObservability({
            screen: "buyer",
            surface: "summary_inbox",
            category: "fetch",
            event: "load_inbox_compat_readback",
            result: "success",
            sourceKind: BUYER_INBOX_COMPAT_LIST_SOURCE_KIND,
            fallbackUsed: true,
            rowCount: compatibilityResult.rows.length,
            extra: {
              primaryOwner: compatibilityResult.sourceMeta.primaryOwner,
              backendFirstPrimary: true,
              requestIds: compatibilityResult.requestIds.length,
              offsetGroups: compatibilityResult.meta.offsetGroups,
              limitGroups: compatibilityResult.meta.limitGroups,
              returnedGroupCount: compatibilityResult.meta.returnedGroupCount,
              totalGroupCount: compatibilityResult.meta.totalGroupCount,
              hasMore: compatibilityResult.meta.hasMore,
              search: compatibilityResult.meta.search,
            },
          });
          observation.success({
            rowCount: compatibilityResult.rows.length,
            sourceKind: compatibilityResult.sourceMeta.sourceKind,
            fallbackUsed: true,
            extra: {
              primaryOwner: compatibilityResult.sourceMeta.primaryOwner,
              backendFirstPrimary: true,
              requestIds: compatibilityResult.requestIds.length,
              offsetGroups: compatibilityResult.meta.offsetGroups,
              limitGroups: compatibilityResult.meta.limitGroups,
              returnedGroupCount: compatibilityResult.meta.returnedGroupCount,
              totalGroupCount: compatibilityResult.meta.totalGroupCount,
              hasMore: compatibilityResult.meta.hasMore,
              search: compatibilityResult.meta.search,
            },
          });
          return compatibilityResult;
        }
      } catch (compatibilityError) {
        log?.(
          "[buyer] listBuyerInbox compatibility readback skipped:",
          compatibilityError instanceof Error
            ? compatibilityError.message
            : String(compatibilityError),
        );
        recordPlatformObservability({
          screen: "buyer",
          surface: "summary_inbox",
          category: "fetch",
          event: "load_inbox_compat_readback",
          result: "error",
          sourceKind: BUYER_INBOX_COMPAT_LIST_SOURCE_KIND,
          fallbackUsed: false,
          errorStage: "compat_readback",
          errorClass:
            compatibilityError instanceof Error
              ? compatibilityError.name
              : undefined,
          errorMessage:
            compatibilityError instanceof Error
              ? compatibilityError.message
              : String(compatibilityError ?? ""),
          extra: {
            offsetGroups: normalizedOffsetGroups,
            limitGroups: normalizedLimitGroups,
            search: search?.trim() || null,
          },
        });
      }
    }

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
    const failureReason =
      error instanceof Error ? error.message : String(error ?? "");
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

async function loadBuyerBucketsDataRpcInternal(
  params: {
    supabase: SupabaseClient;
    log?: LogFn;
  },
  options?: {
    observe?: boolean;
  },
): Promise<BuyerBucketsLoadResult> {
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
    const { data, error } = await runContainedRpc(
      supabase,
      "buyer_summary_buckets_scope_v1",
      undefined,
      {
        screen: "buyer",
        surface: "summary_buckets",
        owner: "buyer.fetchers",
        sourceKind: BUYER_BUCKETS_RPC_SOURCE_KIND,
      },
    );
    if (error) throw error;

    const validated = validateRpcResponse(
      data,
      isBuyerSummaryBucketsScopeResponse,
      {
        rpcName: "buyer_summary_buckets_scope_v1",
        caller:
          "src/screens/buyer/buyer.fetchers.loadBuyerBucketsDataRpcInternal",
        domain: "buyer",
      },
    );
    const envelope = adaptBuyerSummaryBucketsScopeEnvelope(validated);
    const result: BuyerBucketsLoadResult = {
      pending: withBuyerBucketCanonicalCount(
        envelope.pending,
        envelope.counts.pendingCount,
      ),
      approved: withBuyerBucketCanonicalCount(
        envelope.approved,
        envelope.counts.approvedCount,
      ),
      rejected: withBuyerBucketCanonicalCount(
        envelope.rejected,
        envelope.counts.rejectedCount,
      ),
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
      rowCount:
        result.pending.length + result.approved.length + result.rejected.length,
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
        bucketCount: [result.pending, result.approved, result.rejected].filter(
          (rows) => rows.length > 0,
        ).length,
        backendFirstPrimary: true,
      },
    });
    return result;
  } catch (e: unknown) {
    const redactedMessage = getRedactedBuyerRpcErrorMessage(
      e,
      "buyer buckets RPC validation failed",
    );
    log?.("[buyer] loadBuyerBucketsDataRpc error:", redactedMessage);
    observation?.error(e, {
      rowCount: 0,
      errorStage: "load_buckets_rpc",
      sourceKind: BUYER_BUCKETS_RPC_SOURCE_KIND,
      errorMessage: redactedMessage,
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
    const result = await loadBuyerBucketsDataRpcInternal(params, {
      observe: false,
    });
    observation.success({
      rowCount:
        result.pending.length + result.approved.length + result.rejected.length,
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
    const failureReason = getRedactedBuyerRpcErrorMessage(
      error,
      "buyer buckets RPC validation failed",
    );
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
      errorMessage: failureReason || undefined,
    });
    throw error;
  }
}
