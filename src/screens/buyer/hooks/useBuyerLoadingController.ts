import { useCallback, useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import { useFocusEffect } from "expo-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BuyerTab } from "../buyer.types";
import type { BuyerPublicationState } from "./useBuyerState";

import type { BuyerInboxRow } from "../../../lib/catalog_api";
import type {
  BuyerBucketsLoadResult,
  BuyerProposalBucketRow,
} from "../buyer.fetchers";
import {
  createBuyerSummaryService,
  type BuyerSummaryRefreshReason,
  type BuyerSummaryScope,
} from "../buyer.summary.service";
import { recordPlatformObservability } from "../../../lib/observability/platformObservability";
import { reportAndSwallow } from "../../../lib/observability/catchDiscipline";
import {
  isPlatformGuardCoolingDown,
  recordPlatformGuardSkip,
} from "../../../lib/observability/platformGuardDiscipline";
import { getPlatformNetworkSnapshot } from "../../../lib/offline/platformNetwork.service";
import { useBuyerRealtimeLifecycle } from "../buyer.realtime.lifecycle";
import { useBuyerInboxQuery } from "../useBuyerInboxQuery";
import { normalizeBuyerPublicationMessage } from "../buyer.list.ui";

/**
 * useBuyerLoadingController — orchestrates buyer data loading.
 *
 * P6.3 migration: inbox window loading is now delegated to
 * useBuyerInboxQuery (React Query useInfiniteQuery).
 *
 * Removed:
 * - Manual inboxLoadInFlightRef (inflight join) — replaced by query dedup
 * - Manual queuedInboxResetRef (queue-on-overlap) — replaced by query invalidation
 * - Manual inboxLoadedGroupsRef (pagination state) — replaced by query page tracking
 * - Manual inboxTotalGroupsRef (pagination state) — replaced by query page tracking
 * - Manual inboxHasMoreRef (pagination state) — replaced by query page tracking
 *
 * Preserved:
 * - Same return shape (5 keys)
 * - Focus/network guards
 * - Summary service for buckets/subcontracts
 * - Realtime lifecycle
 * - All observability events
 */

type AlertFn = (title: string, message?: string) => void;
type LogFn = (msg: unknown, ...rest: unknown[]) => void;

type RefreshSummaryOptions = {
  reason: BuyerSummaryRefreshReason;
  scopes?: BuyerSummaryScope[];
  force?: boolean;
  showScopeLoading?: boolean;
  showRefreshing?: boolean;
};

type BuyerSummaryPublicationScope = "inbox" | "buckets";

const DEFAULT_SCOPES: BuyerSummaryScope[] = ["inbox", "buckets", "subcontracts"];
const BUYER_FOCUS_REFRESH_MIN_INTERVAL_MS = 1200;

const getVisibleScopes = (activeTab: BuyerTab): BuyerSummaryScope[] => {
  if (activeTab === "subcontracts") return ["subcontracts"];
  if (activeTab === "pending" || activeTab === "approved" || activeTab === "rejected") {
    return ["buckets", "subcontracts"];
  }
  return ["inbox", "subcontracts"];
};

const _getProposalChangeScopes = (activeTab: BuyerTab): BuyerSummaryScope[] => {
  if (activeTab === "pending" || activeTab === "approved" || activeTab === "rejected") {
    return ["buckets"];
  }
  if (activeTab === "inbox") return ["inbox"];
  return [];
};

export function useBuyerLoadingController(params: {
  supabase: SupabaseClient;
  activeTab: BuyerTab;
  searchQuery?: string;
  rows: BuyerInboxRow[];
  pending: BuyerProposalBucketRow[];
  approved: BuyerProposalBucketRow[];
  rejected: BuyerProposalBucketRow[];
  listBuyerInbox: () => Promise<BuyerInboxRow[]>;
  preloadDisplayNos: (reqIds: string[]) => void | Promise<void>;
  preloadProposalTitles: (proposalIds: string[]) => void | Promise<void>;
  setLoadingInbox: (v: boolean) => void;
  setLoadingInboxMore: (v: boolean) => void;
  setInboxHasMore: (v: boolean) => void;
  setInboxTotalCount: (count: number) => void;
  setInboxPublicationState: Dispatch<SetStateAction<BuyerPublicationState>>;
  setInboxPublicationMessage: Dispatch<SetStateAction<string | null>>;
  setRows: Dispatch<SetStateAction<BuyerInboxRow[]>>;
  setLoadingBuckets: (v: boolean) => void;
  setBucketsPublicationState: Dispatch<SetStateAction<BuyerPublicationState>>;
  setBucketsPublicationMessage: Dispatch<SetStateAction<string | null>>;
  setPending: (rows: BuyerProposalBucketRow[]) => void;
  setApproved: (rows: BuyerProposalBucketRow[]) => void;
  setRejected: (rows: BuyerProposalBucketRow[]) => void;
  setSubcontractCount: (count: number) => void;
  setRefreshing: (v: boolean) => void;
  setRefreshReason?: (value: "focus" | "manual" | "mutation" | null) => void;
  kickMsInbox: number;
  kickMsBuckets: number;
  alert: AlertFn;
  log?: LogFn;
}) {
  const {
    supabase,
    activeTab,
    searchQuery,
    rows,
    pending,
    approved,
    rejected,
    listBuyerInbox,
    preloadDisplayNos,
    preloadProposalTitles,
    setLoadingInbox,
    setLoadingInboxMore,
    setInboxHasMore,
    setInboxTotalCount,
    setInboxPublicationState,
    setInboxPublicationMessage,
    setRows,
    setLoadingBuckets,
    setBucketsPublicationState,
    setBucketsPublicationMessage,
    setPending,
    setApproved,
    setRejected,
    setSubcontractCount,
    setRefreshing,
    setRefreshReason,
    kickMsInbox,
    kickMsBuckets,
    alert,
    log,
  } = params;

  const focusedRef = useRef(false);
  const hasHydratedRef = useRef(false);
  const lastFocusRefreshAtRef = useRef(0);
  const summaryRefreshInFlightRef = useRef(false);
  const searchKey = String(searchQuery ?? "").trim();
  const visibleBucketRowsCount = pending.length + approved.length + rejected.length;

  // ── React Query inbox ──
  const inboxQuery = useBuyerInboxQuery({
    supabase,
    listBuyerInbox,
    searchQuery: searchKey,
    enabled: focusedRef.current,
    log,
  });

  // ── Sync query data → parent setters ──
  const prevInboxRowCountRef = useRef(-1);
  useEffect(() => {
    if (inboxQuery.isLoading || inboxQuery.rows.length === prevInboxRowCountRef.current) return;
    prevInboxRowCountRef.current = inboxQuery.rows.length;
    setRows(inboxQuery.rows);
    setInboxHasMore(inboxQuery.hasMore);
    setInboxTotalCount(inboxQuery.totalGroupCount);

    if (inboxQuery.lastPageMeta && inboxQuery.lastPageSourceMeta) {
      recordPlatformObservability({
        screen: "buyer",
        surface: "inbox_list",
        category: "ui",
        event: "content_ready",
        result: "success",
        rowCount: inboxQuery.rows.length,
        sourceKind: inboxQuery.lastPageSourceMeta.sourceKind,
        fallbackUsed: inboxQuery.lastPageSourceMeta.fallbackUsed,
        extra: {
          primaryOwner: inboxQuery.lastPageSourceMeta.primaryOwner,
          backendFirstPrimary: inboxQuery.lastPageSourceMeta.backendFirstPrimary,
          totalGroupCount: inboxQuery.totalGroupCount,
          hasMore: inboxQuery.hasMore,
          search: inboxQuery.lastPageMeta.search,
        },
      });
      setInboxPublicationState("ready");
      setInboxPublicationMessage(null);
    }

    // Preload display nos
    if (inboxQuery.requestIds.length) {
      void (async () => {
        try {
          await preloadDisplayNos(inboxQuery.requestIds);
        } catch (error) {
          reportAndSwallow({
            screen: "buyer",
            surface: "inbox_list",
            event: "preload_display_nos_failed",
            error,
            kind: "soft_failure",
            category: "ui",
            sourceKind: "cache:display_no",
            errorStage: "preload_display_no",
            extra: { requestIds: inboxQuery.requestIds, rowCount: inboxQuery.rows.length },
          });
        }
      })();
    }
  }, [
    inboxQuery.isLoading,
    inboxQuery.rows,
    inboxQuery.hasMore,
    inboxQuery.totalGroupCount,
    inboxQuery.requestIds,
    inboxQuery.lastPageMeta,
    inboxQuery.lastPageSourceMeta,
    preloadDisplayNos,
    setInboxHasMore,
    setInboxPublicationMessage,
    setInboxPublicationState,
    setInboxTotalCount,
    setRows,
  ]);

  // ── Sync loading states ──
  useEffect(() => {
    setLoadingInbox(inboxQuery.isLoading);
  }, [inboxQuery.isLoading, setLoadingInbox]);

  useEffect(() => {
    setLoadingInboxMore(inboxQuery.isFetchingNextPage);
  }, [inboxQuery.isFetchingNextPage, setLoadingInboxMore]);

  // ── Sync error state ──
  useEffect(() => {
    if (inboxQuery.isError && inboxQuery.error) {
      const errorMsg =
        inboxQuery.error instanceof Error && inboxQuery.error.message.trim()
          ? inboxQuery.error.message.trim()
          : "Не удалось загрузить заявки снабженца.";
      const publicationState = rows.length > 0 ? "degraded" : "error";
      setInboxPublicationState(publicationState);
      setInboxPublicationMessage(normalizeBuyerPublicationMessage("inbox", publicationState, errorMsg));
    }
  }, [inboxQuery.isError, inboxQuery.error, rows.length, setInboxPublicationMessage, setInboxPublicationState]);

  const summaryService = useMemo(
    () =>
      createBuyerSummaryService({
        supabase,
        listBuyerInbox,
        kickMsInbox,
        kickMsBuckets,
        log,
      }),
    [supabase, listBuyerInbox, kickMsInbox, kickMsBuckets, log],
  );

  const normalizeBuyerScopePublicationMessage = useCallback(
    (scope: BuyerSummaryPublicationScope, error: unknown) => {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : scope === "inbox"
            ? "Не удалось загрузить заявки снабженца."
            : "Не удалось загрузить предложения снабженца.";
      return normalizeBuyerPublicationMessage(
        scope,
        visibleBucketRowsCount > 0 ? "degraded" : "error",
        message,
      );
    },
    [visibleBucketRowsCount],
  );

  const publishBuyerScopeState = useCallback(
    (
      scope: BuyerSummaryPublicationScope,
      state: BuyerPublicationState,
      message: string | null,
      extra?: Record<string, unknown>,
    ) => {
      if (scope === "inbox") {
        setInboxPublicationState(state);
        setInboxPublicationMessage(message);
      } else {
        setBucketsPublicationState(state);
        setBucketsPublicationMessage(message);
      }

      recordPlatformObservability({
        screen: "buyer",
        surface: scope === "inbox" ? "summary_inbox" : "summary_buckets",
        category: "ui",
        event: "publish_state",
        result: state === "ready" ? "success" : "error",
        errorMessage: message ?? undefined,
        extra: {
          owner: "buyer_loading_controller",
          publishState: state,
          ...extra,
        },
      });
    },
    [
      setBucketsPublicationMessage,
      setBucketsPublicationState,
      setInboxPublicationMessage,
      setInboxPublicationState,
    ],
  );

  const applyBucketsResult = useCallback(async (buckets: BuyerBucketsLoadResult) => {
    setPending(buckets.pending);
    setApproved(buckets.approved);
    setRejected(buckets.rejected);
    recordPlatformObservability({
      screen: "buyer",
      surface: "bucket_lists",
      category: "ui",
      event: "content_ready",
      result: "success",
      rowCount: buckets.pending.length + buckets.approved.length + buckets.rejected.length,
      sourceKind: buckets.sourceMeta.sourceKind,
      fallbackUsed: buckets.sourceMeta.fallbackUsed,
      extra: {
        primaryOwner: buckets.sourceMeta.primaryOwner,
        backendFirstPrimary: buckets.sourceMeta.backendFirstPrimary,
        bucketCount: [buckets.pending, buckets.approved, buckets.rejected].filter((rows) => rows.length > 0).length,
        proposalIds: buckets.proposalIds.length,
      },
    });
    publishBuyerScopeState("buckets", "ready", null, {
      hasData: buckets.pending.length + buckets.approved.length + buckets.rejected.length > 0,
      proposalIds: buckets.proposalIds.length,
      sourceKind: buckets.sourceMeta.sourceKind,
    });
    if (!buckets.proposalIds.length) return;
    try {
      await preloadProposalTitles(buckets.proposalIds);
    } catch (error) {
      reportAndSwallow({
        screen: "buyer",
        surface: "bucket_lists",
        event: "preload_proposal_titles_failed",
        error,
        kind: "soft_failure",
        category: "ui",
        sourceKind: "cache:proposal_title",
        errorStage: "preload_proposal_titles",
        extra: {
          proposalIds: buckets.proposalIds,
          bucketRowCount: buckets.pending.length + buckets.approved.length + buckets.rejected.length,
        },
      });
    }
  }, [preloadProposalTitles, publishBuyerScopeState, setApproved, setPending, setRejected]);

  const refreshSummary = useCallback(async (options: RefreshSummaryOptions) => {
    if (!focusedRef.current) {
      recordPlatformGuardSkip("not_focused", {
        screen: "buyer",
        surface: "summary_root",
        event: "refresh_summary",
        trigger: options.reason,
      });
      return;
    }

    if (options.reason === "manual") setRefreshReason?.("manual");
    else if (options.reason === "mutation" || options.reason === "subscription" || options.reason === "realtime") {
      setRefreshReason?.("mutation");
    } else {
      setRefreshReason?.("focus");
    }

    const scopes = options.scopes ?? DEFAULT_SCOPES;
    const wantsInbox = scopes.includes("inbox");
    const serviceScopes = scopes.filter((scope) => scope !== "inbox");
    const showBucketsLoading = !!options.showScopeLoading && scopes.includes("buckets");
    const networkSnapshot = getPlatformNetworkSnapshot();
    if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
      recordPlatformGuardSkip("network_known_offline", {
        screen: "buyer",
        surface: "summary_root",
        event: "refresh_summary",
        trigger: options.reason,
        extra: {
          scopes,
          networkKnownOffline: true,
        },
      });
      return;
    }

    summaryRefreshInFlightRef.current = true;
    if (options.showRefreshing) setRefreshing(true);
    if (showBucketsLoading) setLoadingBuckets(true);

    try {
      // ── Inbox: delegate to React Query ──
      if (wantsInbox) {
        if (options.force) {
          inboxQuery.invalidate();
        } else {
          void inboxQuery.refetch();
        }
      }

      const result = serviceScopes.length
        ? await (async () => {
            try {
              return await summaryService.load({
                reason: options.reason,
                scopes: serviceScopes,
                force: options.force,
              });
            } catch (error) {
              if (serviceScopes.includes("buckets")) {
                publishBuyerScopeState(
                  "buckets",
                  visibleBucketRowsCount > 0 ? "degraded" : "error",
                  normalizeBuyerScopePublicationMessage("buckets", error),
                  {
                    reason: options.reason,
                    hasData: visibleBucketRowsCount > 0,
                  },
                );
              }
              throw error;
            }
          })()
        : {};

      if (!focusedRef.current) return;

      if (result.buckets) {
        await applyBucketsResult(result.buckets);
      }
      if (result.subcontracts?.count != null) {
        setSubcontractCount(result.subcontracts.count);
      }

      hasHydratedRef.current = true;
    } catch (e: unknown) {
      reportAndSwallow({
        screen: "buyer",
        surface: "summary_root",
        event: "refresh_summary_nonfatal_failed",
        error: e,
        kind: "soft_failure",
        sourceKind: "buyer_summary",
        errorStage: "refresh_summary",
        trigger: options.reason,
        extra: {
          scopes,
          hasHydrated: hasHydratedRef.current,
        },
      });
      log?.("[buyer.summary] refresh failed:", e instanceof Error ? e.message : String(e));
    } finally {
      summaryRefreshInFlightRef.current = false;
      if (showBucketsLoading) setLoadingBuckets(false);
      if (options.showRefreshing) setRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO(P1): review deps
  }, [
    approved.length,
    applyBucketsResult,
    inboxQuery,
    log,
    normalizeBuyerScopePublicationMessage,
    pending.length,
    publishBuyerScopeState,
    rejected.length,
    setRefreshReason,
    setLoadingBuckets,
    setRefreshing,
    setSubcontractCount,
    summaryService,
    visibleBucketRowsCount,
  ]);

  useBuyerRealtimeLifecycle({
    activeTab,
    focusedRef,
    onNotification: alert,
    onRefreshScopes: async (next) => {
      await refreshSummary(next);
    },
    isRefreshInFlight: () => summaryRefreshInFlightRef.current || inboxQuery.isFetching,
  });

  const fetchInbox = useCallback(async () => {
    await refreshSummary({
      reason: "mutation",
      scopes: ["inbox"],
      force: true,
    });
  }, [refreshSummary]);

  const fetchBuckets = useCallback(async () => {
    await refreshSummary({
      reason: "mutation",
      scopes: ["buckets"],
      force: true,
    });
  }, [refreshSummary]);

  const fetchSubcontractsCount = useCallback(async () => {
    await refreshSummary({
      reason: "mutation",
      scopes: ["subcontracts"],
      force: true,
    });
  }, [refreshSummary]);

  const fetchInboxNextPage = useCallback(async () => {
    if (!focusedRef.current) {
      recordPlatformGuardSkip("not_focused", {
        screen: "buyer",
        surface: "summary_inbox",
        event: "load_inbox",
        trigger: "focus",
      });
      return;
    }
    if (!inboxQuery.hasMore) {
      recordPlatformGuardSkip("no_more_pages", {
        screen: "buyer",
        surface: "summary_inbox",
        event: "load_inbox",
        trigger: "focus",
      });
      return;
    }
    const networkSnapshot = getPlatformNetworkSnapshot();
    if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
      recordPlatformGuardSkip("network_known_offline", {
        screen: "buyer",
        surface: "summary_inbox",
        event: "load_inbox",
        trigger: "focus",
        extra: { networkKnownOffline: true },
      });
      return;
    }
    try {
      await inboxQuery.fetchNextPage();
    } catch (error) {
      reportAndSwallow({
        screen: "buyer",
        surface: "inbox_list",
        event: "load_next_page_nonfatal_failed",
        error,
        kind: "soft_failure",
        sourceKind: "buyer_inbox_pagination",
        errorStage: "load_next_page",
        trigger: "focus",
        extra: {
          search: searchKey || null,
        },
      });
      log?.("[buyer.summary] inbox next page failed:", error instanceof Error ? error.message : String(error));
    }
  }, [inboxQuery, log, searchKey]);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;

      const focusReason: BuyerSummaryRefreshReason = hasHydratedRef.current ? "focus" : "initial";
      const now = Date.now();
      if (
        focusReason === "focus" &&
        isPlatformGuardCoolingDown({
          lastAt: lastFocusRefreshAtRef.current,
          minIntervalMs: BUYER_FOCUS_REFRESH_MIN_INTERVAL_MS,
          now,
        })
      ) {
        recordPlatformGuardSkip("recent_same_scope", {
          screen: "buyer",
          surface: "summary_root",
          event: "refresh_summary",
          trigger: focusReason,
        });
      } else {
        lastFocusRefreshAtRef.current = now;
      void refreshSummary({
        reason: focusReason,
        scopes: getVisibleScopes(activeTab),
        showScopeLoading: !hasHydratedRef.current,
      });
      }

      return () => {
        focusedRef.current = false;
      };
    }, [activeTab, refreshSummary]),
  );

  useEffect(() => {
    if (!focusedRef.current) return;
    if (activeTab !== "inbox") return;
    if (!hasHydratedRef.current) return;
    // When search changes, the query key changes and React Query re-fetches automatically.
    // Just invalidate to force fresh data.
    inboxQuery.invalidate();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- search key drives reload
  }, [activeTab, searchKey]);

  const onRefresh = useCallback(async () => {
    await refreshSummary({
      reason: "manual",
      scopes: getVisibleScopes(activeTab),
      force: true,
      showRefreshing: true,
    });
  }, [activeTab, refreshSummary]);

  return {
    fetchInbox,
    fetchInboxNextPage,
    fetchBuckets,
    fetchSubcontractsCount,
    onRefresh,
  };
}
