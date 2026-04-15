import { useCallback, useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import { useFocusEffect } from "expo-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BuyerTab } from "../buyer.types";
import type { BuyerPublicationState } from "./useBuyerState";

import type { BuyerInboxRow } from "../../../lib/catalog_api";
import type {
  BuyerBucketsLoadResult,
  BuyerInboxLoadResult,
  BuyerProposalBucketRow,
} from "../buyer.fetchers";
import { loadBuyerInboxWindowData } from "../buyer.fetchers";
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
const BUYER_INBOX_GROUP_PAGE_SIZE = 12;
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
  const inboxLoadedGroupsRef = useRef(0);
  const inboxTotalGroupsRef = useRef(0);
  const inboxHasMoreRef = useRef(false);
  const inboxLoadInFlightRef = useRef<Promise<void> | null>(null);
  const queuedInboxResetRef = useRef<BuyerSummaryRefreshReason | null>(null);
  const summaryRefreshInFlightRef = useRef(false);
  const searchKey = String(searchQuery ?? "").trim();
  const visibleBucketRowsCount = pending.length + approved.length + rejected.length;
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

  const normalizeBuyerPublicationMessage = useCallback(
    (scope: BuyerSummaryPublicationScope, error: unknown) => {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : scope === "inbox"
            ? "Не удалось загрузить заявки снабженца."
            : "Не удалось загрузить предложения снабженца.";
      return message;
    },
    [],
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

  const applyInboxResult = useCallback(async (
    inbox: BuyerInboxLoadResult,
    options?: { append?: boolean },
  ) => {
    setRows((previous) => {
      if (!options?.append) return inbox.rows;
      const seen = new Set(previous.map((row) => String(row.request_item_id ?? "").trim()).filter(Boolean));
      const appended = inbox.rows.filter((row) => {
        const key = String(row.request_item_id ?? "").trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return previous.concat(appended);
    });
    inboxLoadedGroupsRef.current = inbox.meta.offsetGroups + inbox.meta.returnedGroupCount;
    inboxTotalGroupsRef.current = inbox.meta.totalGroupCount;
    inboxHasMoreRef.current = inbox.meta.hasMore;
    setInboxHasMore(inbox.meta.hasMore);
    setInboxTotalCount(inbox.meta.totalGroupCount);
    recordPlatformObservability({
      screen: "buyer",
      surface: "inbox_list",
      category: "ui",
      event: "content_ready",
      result: "success",
      rowCount: inbox.rows.length,
      sourceKind: inbox.sourceMeta.sourceKind,
      fallbackUsed: inbox.sourceMeta.fallbackUsed,
      extra: {
        primaryOwner: inbox.sourceMeta.primaryOwner,
        backendFirstPrimary: inbox.sourceMeta.backendFirstPrimary,
        offsetGroups: inbox.meta.offsetGroups,
        limitGroups: inbox.meta.limitGroups,
        returnedGroupCount: inbox.meta.returnedGroupCount,
        totalGroupCount: inbox.meta.totalGroupCount,
        hasMore: inbox.meta.hasMore,
        search: inbox.meta.search,
        append: Boolean(options?.append),
      },
    });
    publishBuyerScopeState("inbox", "ready", null, {
      hasData: inbox.rows.length > 0,
      append: Boolean(options?.append),
      totalGroupCount: inbox.meta.totalGroupCount,
      sourceKind: inbox.sourceMeta.sourceKind,
    });
    if (!inbox.requestIds.length) return;
    try {
      await preloadDisplayNos(inbox.requestIds);
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
        extra: {
          requestIds: inbox.requestIds,
          rowCount: inbox.rows.length,
        },
      });
    }
  }, [preloadDisplayNos, publishBuyerScopeState, setInboxHasMore, setInboxTotalCount, setRows]);

  const loadInboxWindow = useCallback(async (options: {
    reason: BuyerSummaryRefreshReason;
    reset: boolean;
    showScopeLoading?: boolean;
  }) => {
    if (!focusedRef.current) {
      recordPlatformGuardSkip("not_focused", {
        screen: "buyer",
        surface: "summary_inbox",
        event: "load_inbox",
        trigger: options.reason,
      });
      return;
    }
    if (!options.reset && !inboxHasMoreRef.current) {
      recordPlatformGuardSkip("no_more_pages", {
        screen: "buyer",
        surface: "summary_inbox",
        event: "load_inbox",
        trigger: options.reason,
        extra: {
          offsetGroups: inboxLoadedGroupsRef.current,
        },
      });
      return;
    }
    const networkSnapshot = getPlatformNetworkSnapshot();
    if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
      recordPlatformGuardSkip("network_known_offline", {
        screen: "buyer",
        surface: "summary_inbox",
        event: "load_inbox",
        trigger: options.reason,
        extra: {
          offsetGroups: options.reset ? 0 : inboxLoadedGroupsRef.current,
          search: searchKey || null,
          networkKnownOffline: true,
        },
      });
      return;
    }

    if (inboxLoadInFlightRef.current) {
      if (options.reset) {
        queuedInboxResetRef.current = options.reason;
      }
      return;
    }

    const offsetGroups = options.reset ? 0 : inboxLoadedGroupsRef.current;
    const task = (async () => {
      if (options.reset) {
        if (options.showScopeLoading) setLoadingInbox(true);
      } else {
        setLoadingInboxMore(true);
      }

      try {
        const inbox = await loadBuyerInboxWindowData({
          supabase,
          listBuyerInbox,
          offsetGroups,
          limitGroups: BUYER_INBOX_GROUP_PAGE_SIZE,
          search: searchKey || null,
          log,
        });
        if (!focusedRef.current) return;
        await applyInboxResult(inbox, { append: !options.reset });
      } catch (error) {
        publishBuyerScopeState(
          "inbox",
          rows.length > 0 ? "degraded" : "error",
          normalizeBuyerPublicationMessage("inbox", error),
          {
            reason: options.reason,
            reset: options.reset,
            search: searchKey || null,
            hasData: rows.length > 0,
          },
        );
        throw error;
      } finally {
        if (options.reset) {
          if (options.showScopeLoading) setLoadingInbox(false);
        } else {
          setLoadingInboxMore(false);
        }
        inboxLoadInFlightRef.current = null;
        const queuedResetReason = queuedInboxResetRef.current;
        queuedInboxResetRef.current = null;
        if (queuedResetReason && focusedRef.current) {
          void loadInboxWindow({
            reason: queuedResetReason,
            reset: true,
            showScopeLoading: false,
          });
        }
      }
    })();

    inboxLoadInFlightRef.current = task;
    await task;
  }, [
    applyInboxResult,
    listBuyerInbox,
    log,
    normalizeBuyerPublicationMessage,
    publishBuyerScopeState,
    rows.length,
    searchKey,
    setLoadingInbox,
    setLoadingInboxMore,
    supabase,
  ]);

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
      if (wantsInbox) {
        await loadInboxWindow({
          reason: options.reason,
          reset: true,
          showScopeLoading: !!options.showScopeLoading,
        });
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
                  normalizeBuyerPublicationMessage("buckets", error),
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
    log,
    loadInboxWindow,
    normalizeBuyerPublicationMessage,
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
    isRefreshInFlight: () => summaryRefreshInFlightRef.current || inboxLoadInFlightRef.current != null,
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
    try {
      await loadInboxWindow({
        reason: "focus",
        reset: false,
      });
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
          offsetGroups: inboxLoadedGroupsRef.current,
          search: searchKey || null,
        },
      });
      log?.("[buyer.summary] inbox next page failed:", error instanceof Error ? error.message : String(error));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO(P1): review deps
  }, [loadInboxWindow]);

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
    void loadInboxWindow({
      reason: "focus",
      reset: true,
      showScopeLoading: false,
    });
  }, [activeTab, loadInboxWindow, searchKey]);

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
