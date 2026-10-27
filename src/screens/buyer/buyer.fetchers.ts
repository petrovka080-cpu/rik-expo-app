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
  enrichBuyerRowsWithRequestContext,
  type BuyerRequestContextQueryClient,
} from "../../features/office/buyerRequestContextEnrichment";
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
export type BuyerInboxDataClient = BuyerRpcScopeClient &
  BuyerRequestContextQueryClient;

type BuyerReadModelQueryResult = {
  data?: unknown;
  error?: unknown;
};

type BuyerReadModelRangeStep = {
  range: (
    from: number,
    to: number,
  ) => PromiseLike<BuyerReadModelQueryResult>;
};

type BuyerReadModelFilterStep = BuyerReadModelRangeStep & {
  order: (
    column: string,
    options: { ascending: boolean },
  ) => BuyerReadModelFilterStep;
};

type BuyerReadModelQueryBuilder = {
  select: (columns: string) => {
    in: (
      column: string,
      values: readonly string[],
    ) => BuyerReadModelFilterStep;
  };
};

type BuyerReadModelQueryClient = {
  from?: (table: string) => BuyerReadModelQueryBuilder;
};

const BUYER_BUCKETS_RPC_SOURCE_KIND = "rpc:buyer_summary_buckets_scope_v1";
const BUYER_INBOX_RPC_SOURCE_KIND = "rpc:buyer_summary_inbox_scope_v1";
const BUYER_INBOX_COMPAT_LIST_SOURCE_KIND = "compat:listBuyerInbox";
const BUYER_INBOX_COMPAT_REPAIR_SOURCE_KIND =
  "rpc:buyer_summary_inbox_scope_v1+compat:listBuyerInbox";
const BUYER_INBOX_REQUEST_ITEMS_COMPLETION_SOURCE_KIND =
  "rpc:buyer_summary_inbox_scope_v1+request_items";
const BUYER_INBOX_FULL_SCAN_GROUP_PAGE_SIZE = 100;
const BUYER_INBOX_FULL_SCAN_MAX_GROUPS = 5000;
const BUYER_INBOX_FULL_SCAN_MAX_PAGES = Math.ceil(
  BUYER_INBOX_FULL_SCAN_MAX_GROUPS / BUYER_INBOX_FULL_SCAN_GROUP_PAGE_SIZE,
);
const BUYER_INBOX_MAX_GROUP_PAGE_SIZE = 100;
const BUYER_INBOX_REQUEST_ITEMS_COMPLETION_PAGE_SIZE = 1000;
const BUYER_INBOX_REQUEST_ITEMS_COMPLETION_MAX_ROWS = 10000;
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

type BuyerCanonicalRequestItemRow = {
  id?: string | null;
  request_id?: string | null;
  rik_code?: string | null;
  name_human?: string | null;
  qty?: string | number | null;
  uom?: string | null;
  app_code?: string | null;
  note?: string | null;
  kind?: string | null;
  item_kind?: string | null;
  status?: string | null;
  created_at?: string | null;
  director_reject_note?: string | null;
  director_reject_at?: string | null;
};

type BuyerProposalGuardRow = {
  request_item_id?: string | null;
  proposals?:
    | { status?: string | null; payment_status?: string | null }
    | { status?: string | null; payment_status?: string | null }[]
    | null;
};

const BUYER_CANONICAL_REQUEST_ITEMS_SELECT =
  "id,request_id,rik_code,name_human,qty,uom,app_code,note,kind,item_kind,status,created_at,director_reject_note,director_reject_at";
const BUYER_PROPOSAL_ITEM_GUARD_SELECT =
  "request_item_id,proposals!inner(status,payment_status)";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const asMaybeNumber = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isCanonicalRequestItemRow = (
  value: unknown,
): value is BuyerCanonicalRequestItemRow => {
  if (!isRecord(value)) return false;
  return Boolean(toMaybeText(value.id) && toMaybeText(value.request_id));
};

const isBuyerProposalGuardRow = (
  value: unknown,
): value is BuyerProposalGuardRow => {
  if (!isRecord(value)) return false;
  return Boolean(toMaybeText(value.request_item_id));
};

const normalizeStatusText = (value: unknown): string =>
  String(value ?? "").trim().toLowerCase();

const isBlockedBuyerRequestItemStatus = (value: unknown): boolean => {
  const status = normalizeStatusText(value);
  return (
    status.startsWith("rejected") ||
    status.startsWith("cancelled") ||
    status.startsWith("canceled") ||
    status.startsWith("отклон") ||
    status.startsWith("отмен") ||
    status.startsWith("на доработке")
  );
};

const isActiveProposalState = (
  proposal: { status?: string | null; payment_status?: string | null } | null | undefined,
): boolean => {
  const status = normalizeStatusText(proposal?.status);
  const paymentStatus = normalizeStatusText(proposal?.payment_status);
  return (
    status === "на утверждении" ||
    status === "утверждено" ||
    status === "pending" ||
    status === "approved" ||
    paymentStatus.startsWith("на доработке")
  );
};

const buyerProposalGuardEntries = (
  row: BuyerProposalGuardRow,
): { status?: string | null; payment_status?: string | null }[] => {
  const proposals = row.proposals;
  if (Array.isArray(proposals)) return proposals.filter(isRecord);
  return isRecord(proposals) ? [proposals] : [];
};

const chunkBuyerIds = (ids: readonly string[], size: number): string[][] => {
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += size) {
    chunks.push(ids.slice(index, index + size));
  }
  return chunks;
};

const loadCanonicalRequestItemsForBuyerGroups = async (
  client: BuyerReadModelQueryClient | null | undefined,
  requestIds: readonly string[],
): Promise<BuyerCanonicalRequestItemRow[]> => {
  if (!client?.from || !requestIds.length) return [];

  const rows: BuyerCanonicalRequestItemRow[] = [];
  for (const ids of chunkBuyerIds(requestIds, 100)) {
    let offset = 0;
    let hasMoreRows = true;
    while (hasMoreRows) {
      if (rows.length >= BUYER_INBOX_REQUEST_ITEMS_COMPLETION_MAX_ROWS) {
        throw new Error(
          `buyer request item completion exceeded max row ceiling (${BUYER_INBOX_REQUEST_ITEMS_COMPLETION_MAX_ROWS})`,
        );
      }

      const { data, error } = await client
        .from("request_items")
        .select(BUYER_CANONICAL_REQUEST_ITEMS_SELECT)
        .in("request_id", ids)
        .order("id", { ascending: true })
        .range(
          offset,
          offset + BUYER_INBOX_REQUEST_ITEMS_COMPLETION_PAGE_SIZE - 1,
        );

      if (error) throw error;
      const pageRows = Array.isArray(data)
        ? data.filter(isCanonicalRequestItemRow)
        : [];
      rows.push(...pageRows);

      if (pageRows.length < BUYER_INBOX_REQUEST_ITEMS_COMPLETION_PAGE_SIZE) {
        hasMoreRows = false;
      } else {
        offset += BUYER_INBOX_REQUEST_ITEMS_COMPLETION_PAGE_SIZE;
      }
    }
  }

  return rows;
};

const loadActiveProposalRequestItemIds = async (
  client: BuyerReadModelQueryClient | null | undefined,
  requestItemIds: readonly string[],
): Promise<Set<string>> => {
  if (!client?.from || !requestItemIds.length) return new Set();

  const activeIds = new Set<string>();
  for (const ids of chunkBuyerIds(requestItemIds, 500)) {
    const { data, error } = await client
      .from("proposal_items")
      .select(BUYER_PROPOSAL_ITEM_GUARD_SELECT)
      .in("request_item_id", ids)
      .range(0, ids.length - 1);

    if (error) throw error;
    const rows = Array.isArray(data) ? data.filter(isBuyerProposalGuardRow) : [];
    for (const row of rows) {
      if (!buyerProposalGuardEntries(row).some(isActiveProposalState)) {
        continue;
      }
      const requestItemId = toMaybeText(row.request_item_id);
      if (requestItemId) activeIds.add(requestItemId);
    }
  }
  return activeIds;
};

const canonicalRequestItemToBuyerInboxRow = (
  row: BuyerCanonicalRequestItemRow,
  base: BuyerInboxRow,
): BuyerInboxRow => {
  const requestId = toMaybeText(row.request_id) ?? base.request_id;
  const requestItemId = toMaybeText(row.id) ?? base.request_item_id;
  const kind = toMaybeText(row.kind) ?? toMaybeText(row.item_kind) ?? base.kind ?? null;

  return {
    request_id: requestId,
    request_id_old: base.request_id_old ?? null,
    request_item_id: requestItemId,
    rik_code: toMaybeText(row.rik_code),
    name_human: toMaybeText(row.name_human) ?? base.name_human ?? "—",
    qty: asMaybeNumber(row.qty) ?? row.qty ?? 0,
    uom: toMaybeText(row.uom),
    app_code: toMaybeText(row.app_code),
    note: toMaybeText(row.note),
    kind,
    object_name: base.object_name ?? null,
    object: base.object ?? null,
    site_address_snapshot: base.site_address_snapshot ?? null,
    request_no: base.request_no ?? null,
    display_no: base.display_no ?? null,
    level_code: base.level_code ?? null,
    system_code: base.system_code ?? null,
    zone_code: base.zone_code ?? null,
    request_note: base.request_note ?? null,
    request_comment: base.request_comment ?? null,
    need_by: base.need_by ?? null,
    submitted_at: base.submitted_at ?? null,
    approved_at: base.approved_at ?? null,
    status: toMaybeText(row.status) ?? base.status,
    created_at: toMaybeText(row.created_at) ?? base.created_at,
    director_reject_note:
      toMaybeText(row.director_reject_note) ?? base.director_reject_note ?? null,
    director_reject_at:
      toMaybeText(row.director_reject_at) ?? base.director_reject_at ?? null,
    director_reject_reason: base.director_reject_reason ?? null,
    last_offer_supplier: base.last_offer_supplier ?? null,
    last_offer_price: base.last_offer_price ?? null,
    last_offer_note: base.last_offer_note ?? null,
  };
};

const completeBuyerInboxVisibleGroupsWithRequestItems = async (
  result: BuyerInboxLoadResult,
  client: BuyerReadModelQueryClient,
  log?: LogFn,
): Promise<BuyerInboxLoadResult> => {
  if (!result.rows.length || !result.requestIds.length || !client?.from) {
    return result;
  }

  try {
    const canonicalRows = await loadCanonicalRequestItemsForBuyerGroups(
      client,
      result.requestIds,
    );
    if (!canonicalRows.length) return result;

    const activeProposalItemIds = await loadActiveProposalRequestItemIds(
      client,
      uniqIds(canonicalRows.map((row) => row.id ?? null)),
    );
    const currentGroups = groupBuyerInboxRowsByRequestId(result.rows);
    const canonicalGroups = new Map<string, BuyerCanonicalRequestItemRow[]>();
    for (const row of canonicalRows) {
      const requestId = toMaybeText(row.request_id);
      const requestItemId = toMaybeText(row.id);
      if (!requestId || !requestItemId) continue;
      if (activeProposalItemIds.has(requestItemId)) continue;
      if (isBlockedBuyerRequestItemStatus(row.status)) continue;
      const group = canonicalGroups.get(requestId) ?? [];
      group.push(row);
      canonicalGroups.set(requestId, group);
    }

    const rows: BuyerInboxRow[] = [];
    let completed = false;
    for (const requestId of result.requestIds) {
      const currentGroup = currentGroups.get(requestId) ?? [];
      const canonicalGroup = canonicalGroups.get(requestId) ?? [];
      const currentIds = new Set(
        uniqIds(currentGroup.map((row) => row.request_item_id)),
      );
      const hasMissingCanonicalRows = canonicalGroup.some((row) => {
        const id = toMaybeText(row.id);
        return Boolean(id && !currentIds.has(id));
      });

      if (
        currentGroup.length > 0 &&
        canonicalGroup.length >= currentGroup.length &&
        hasMissingCanonicalRows
      ) {
        const base = currentGroup[0]!;
        rows.push(
          ...canonicalGroup.map((row) =>
            canonicalRequestItemToBuyerInboxRow(row, base),
          ),
        );
        completed = true;
      } else {
        rows.push(...currentGroup);
      }
    }

    if (!completed) return result;

    recordPlatformObservability({
      screen: "buyer",
      surface: "summary_inbox",
      category: "fetch",
      event: "load_inbox_request_items_completion",
      result: "success",
      sourceKind: BUYER_INBOX_REQUEST_ITEMS_COMPLETION_SOURCE_KIND,
      fallbackUsed: true,
      rowCount: rows.length,
      extra: {
        requestIds: result.requestIds.length,
        primaryRowCount: result.rows.length,
        completedRowCount: rows.length,
      },
    });

    return {
      ...result,
      rows,
      requestIds: uniqIds(rows.map((row) => row?.request_id)),
      sourceMeta: {
        ...result.sourceMeta,
        fallbackUsed: true,
        sourceKind: result.sourceMeta.sourceKind.includes("+request_items")
          ? result.sourceMeta.sourceKind
          : `${result.sourceMeta.sourceKind}+request_items`,
      },
    };
  } catch (error) {
    log?.(
      "[buyer] request item completion skipped:",
      error instanceof Error ? error.message : String(error ?? ""),
    );
    recordPlatformObservability({
      screen: "buyer",
      surface: "summary_inbox",
      category: "fetch",
      event: "load_inbox_request_items_completion",
      result: "error",
      sourceKind: BUYER_INBOX_REQUEST_ITEMS_COMPLETION_SOURCE_KIND,
      fallbackUsed: false,
      errorStage: "request_items_completion",
      errorClass: error instanceof Error ? error.name : undefined,
      errorMessage: error instanceof Error ? error.message : String(error ?? ""),
    });
    return result;
  }
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

const enrichBuyerInboxLoadResultWithRequestContext = async (
  result: BuyerInboxLoadResult,
  client: BuyerRequestContextQueryClient,
  log?: LogFn,
): Promise<BuyerInboxLoadResult> => {
  const completedResult = await completeBuyerInboxVisibleGroupsWithRequestItems(
    result,
    client as BuyerReadModelQueryClient,
    log,
  );
  const rows = await enrichBuyerRowsWithRequestContext(completedResult.rows, {
    client,
    log: (message, error) =>
      log?.(
        message,
        error instanceof Error ? error.message : String(error ?? ""),
      ),
  });

  if (rows === completedResult.rows) return completedResult;

  return {
    ...completedResult,
    rows,
    requestIds: uniqIds(rows.map((row) => row?.request_id)),
  };
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
  supabase: BuyerInboxDataClient;
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

        finalResult = await enrichBuyerInboxLoadResultWithRequestContext(
          finalResult,
          supabase,
          log,
        );

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
  supabase: BuyerInboxDataClient;
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
  supabase: BuyerInboxDataClient;
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
          const enrichedRepairedResult =
            await enrichBuyerInboxLoadResultWithRequestContext(
              repairedResult,
              supabase,
              log,
            );
          recordPlatformObservability({
            screen: "buyer",
            surface: "summary_inbox",
            category: "fetch",
            event: "load_inbox_compat_group_repair",
            result: "success",
            sourceKind: BUYER_INBOX_COMPAT_REPAIR_SOURCE_KIND,
            fallbackUsed: true,
            rowCount: enrichedRepairedResult.rows.length,
            extra: {
              primaryOwner: enrichedRepairedResult.sourceMeta.primaryOwner,
              backendFirstPrimary: true,
              requestIds: enrichedRepairedResult.requestIds.length,
              offsetGroups: enrichedRepairedResult.meta.offsetGroups,
              limitGroups: enrichedRepairedResult.meta.limitGroups,
              returnedGroupCount:
                enrichedRepairedResult.meta.returnedGroupCount,
              totalGroupCount: enrichedRepairedResult.meta.totalGroupCount,
              hasMore: enrichedRepairedResult.meta.hasMore,
              search: enrichedRepairedResult.meta.search,
              primaryRowCount: result.rows.length,
            },
          });
          observation.success({
            rowCount: enrichedRepairedResult.rows.length,
            sourceKind: enrichedRepairedResult.sourceMeta.sourceKind,
            fallbackUsed: true,
            extra: {
              primaryOwner: enrichedRepairedResult.sourceMeta.primaryOwner,
              backendFirstPrimary: true,
              requestIds: enrichedRepairedResult.requestIds.length,
              offsetGroups: enrichedRepairedResult.meta.offsetGroups,
              limitGroups: enrichedRepairedResult.meta.limitGroups,
              returnedGroupCount:
                enrichedRepairedResult.meta.returnedGroupCount,
              totalGroupCount: enrichedRepairedResult.meta.totalGroupCount,
              hasMore: enrichedRepairedResult.meta.hasMore,
              search: enrichedRepairedResult.meta.search,
              primaryRowCount: result.rows.length,
            },
          });
          return enrichedRepairedResult;
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
          const enrichedCompatibilityResult =
            await enrichBuyerInboxLoadResultWithRequestContext(
              compatibilityResult,
              supabase,
              log,
            );
          recordPlatformObservability({
            screen: "buyer",
            surface: "summary_inbox",
            category: "fetch",
            event: "load_inbox_compat_readback",
            result: "success",
            sourceKind: BUYER_INBOX_COMPAT_LIST_SOURCE_KIND,
            fallbackUsed: true,
            rowCount: enrichedCompatibilityResult.rows.length,
            extra: {
              primaryOwner: enrichedCompatibilityResult.sourceMeta.primaryOwner,
              backendFirstPrimary: true,
              requestIds: enrichedCompatibilityResult.requestIds.length,
              offsetGroups: enrichedCompatibilityResult.meta.offsetGroups,
              limitGroups: enrichedCompatibilityResult.meta.limitGroups,
              returnedGroupCount:
                enrichedCompatibilityResult.meta.returnedGroupCount,
              totalGroupCount: enrichedCompatibilityResult.meta.totalGroupCount,
              hasMore: enrichedCompatibilityResult.meta.hasMore,
              search: enrichedCompatibilityResult.meta.search,
            },
          });
          observation.success({
            rowCount: enrichedCompatibilityResult.rows.length,
            sourceKind: enrichedCompatibilityResult.sourceMeta.sourceKind,
            fallbackUsed: true,
            extra: {
              primaryOwner: enrichedCompatibilityResult.sourceMeta.primaryOwner,
              backendFirstPrimary: true,
              requestIds: enrichedCompatibilityResult.requestIds.length,
              offsetGroups: enrichedCompatibilityResult.meta.offsetGroups,
              limitGroups: enrichedCompatibilityResult.meta.limitGroups,
              returnedGroupCount:
                enrichedCompatibilityResult.meta.returnedGroupCount,
              totalGroupCount: enrichedCompatibilityResult.meta.totalGroupCount,
              hasMore: enrichedCompatibilityResult.meta.hasMore,
              search: enrichedCompatibilityResult.meta.search,
            },
          });
          return enrichedCompatibilityResult;
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

    const enrichedResult = await enrichBuyerInboxLoadResultWithRequestContext(
      result,
      supabase,
      log,
    );

    observation.success({
      rowCount: enrichedResult.rows.length,
      sourceKind: enrichedResult.sourceMeta.sourceKind,
      fallbackUsed: false,
      extra: {
        primaryOwner: enrichedResult.sourceMeta.primaryOwner,
        backendFirstPrimary: true,
        requestIds: enrichedResult.requestIds.length,
        offsetGroups: enrichedResult.meta.offsetGroups,
        limitGroups: enrichedResult.meta.limitGroups,
        returnedGroupCount: enrichedResult.meta.returnedGroupCount,
        totalGroupCount: enrichedResult.meta.totalGroupCount,
        hasMore: enrichedResult.meta.hasMore,
        search: enrichedResult.meta.search,
      },
    });
    return enrichedResult;
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
