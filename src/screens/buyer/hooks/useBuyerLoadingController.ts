import { useCallback, useMemo, useRef } from "react";
import { useFocusEffect } from "expo-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BuyerTab } from "../buyer.types";

import type { BuyerInboxRow } from "../../../lib/catalog_api";
import type {
  BuyerBucketsLoadResult,
  BuyerInboxLoadResult,
  BuyerProposalBucketRow,
} from "../buyer.fetchers";
import {
  createBuyerSummaryService,
  type BuyerSummaryRefreshReason,
  type BuyerSummaryScope,
} from "../buyer.summary.service";
import { attachBuyerSubscriptions } from "../buyer.subscriptions";

type AlertFn = (title: string, message?: string) => void;
type LogFn = (msg: unknown, ...rest: unknown[]) => void;

type RefreshSummaryOptions = {
  reason: BuyerSummaryRefreshReason;
  scopes?: BuyerSummaryScope[];
  force?: boolean;
  showScopeLoading?: boolean;
  showRefreshing?: boolean;
};

const DEFAULT_SCOPES: BuyerSummaryScope[] = ["inbox", "buckets", "subcontracts"];

const getVisibleScopes = (activeTab: BuyerTab): BuyerSummaryScope[] => {
  if (activeTab === "subcontracts") return ["subcontracts"];
  if (activeTab === "pending" || activeTab === "approved" || activeTab === "rejected") {
    return ["buckets", "subcontracts"];
  }
  return ["inbox", "subcontracts"];
};

const getProposalChangeScopes = (activeTab: BuyerTab): BuyerSummaryScope[] => {
  if (activeTab === "pending" || activeTab === "approved" || activeTab === "rejected") {
    return ["buckets"];
  }
  if (activeTab === "inbox") return ["inbox"];
  return [];
};

export function useBuyerLoadingController(params: {
  supabase: SupabaseClient;
  activeTab: BuyerTab;
  listBuyerInbox: () => Promise<BuyerInboxRow[]>;
  preloadDisplayNos: (reqIds: string[]) => void | Promise<void>;
  preloadProposalTitles: (proposalIds: string[]) => void | Promise<void>;
  setLoadingInbox: (v: boolean) => void;
  setRows: (rows: BuyerInboxRow[]) => void;
  setLoadingBuckets: (v: boolean) => void;
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
    listBuyerInbox,
    preloadDisplayNos,
    preloadProposalTitles,
    setLoadingInbox,
    setRows,
    setLoadingBuckets,
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

  const applyInboxResult = useCallback(async (inbox: BuyerInboxLoadResult) => {
    setRows(inbox.rows);
    if (!inbox.requestIds.length) return;
    try {
      await preloadDisplayNos(inbox.requestIds);
    } catch {
      // no-op
    }
  }, [preloadDisplayNos, setRows]);

  const applyBucketsResult = useCallback(async (buckets: BuyerBucketsLoadResult) => {
    setPending(buckets.pending);
    setApproved(buckets.approved);
    setRejected(buckets.rejected);
    if (!buckets.proposalIds.length) return;
    try {
      await preloadProposalTitles(buckets.proposalIds);
    } catch {
      // no-op
    }
  }, [preloadProposalTitles, setApproved, setPending, setRejected]);

  const refreshSummary = useCallback(async (options: RefreshSummaryOptions) => {
    if (!focusedRef.current) return;

    if (options.reason === "manual") setRefreshReason?.("manual");
    else if (options.reason === "mutation" || options.reason === "subscription") setRefreshReason?.("mutation");
    else setRefreshReason?.("focus");

    const scopes = options.scopes ?? DEFAULT_SCOPES;
    const showInboxLoading = !!options.showScopeLoading && scopes.includes("inbox");
    const showBucketsLoading = !!options.showScopeLoading && scopes.includes("buckets");

    if (options.showRefreshing) setRefreshing(true);
    if (showInboxLoading) setLoadingInbox(true);
    if (showBucketsLoading) setLoadingBuckets(true);

    try {
      const result = await summaryService.load({
        reason: options.reason,
        scopes,
        force: options.force,
      });

      if (!focusedRef.current) return;

      if (result.inbox) {
        await applyInboxResult(result.inbox);
      }
      if (result.buckets) {
        await applyBucketsResult(result.buckets);
      }
      if (result.subcontracts?.count != null) {
        setSubcontractCount(result.subcontracts.count);
      }

      hasHydratedRef.current = true;
    } catch (e: unknown) {
      log?.("[buyer.summary] refresh failed:", e instanceof Error ? e.message : String(e));
    } finally {
      if (showInboxLoading) setLoadingInbox(false);
      if (showBucketsLoading) setLoadingBuckets(false);
      if (options.showRefreshing) setRefreshing(false);
    }
  }, [
    applyBucketsResult,
    applyInboxResult,
    log,
    setRefreshReason,
    setLoadingBuckets,
    setLoadingInbox,
    setRefreshing,
    setSubcontractCount,
    summaryService,
  ]);

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

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;

      const focusReason: BuyerSummaryRefreshReason = hasHydratedRef.current ? "focus" : "initial";
      void refreshSummary({
        reason: focusReason,
        scopes: getVisibleScopes(activeTab),
        showScopeLoading: !hasHydratedRef.current,
      });

      const detach = attachBuyerSubscriptions({
        supabase,
        focusedRef,
        onNotif: (title, message) => alert(title, message),
        onProposalsChanged: () => {
          const scopes = getProposalChangeScopes(activeTab);
          if (!scopes.length) return;
          void refreshSummary({
            reason: "subscription",
            scopes,
          });
        },
        log,
      });

      return () => {
        focusedRef.current = false;
        try {
          detach();
        } catch {
          // no-op
        }
      };
    }, [activeTab, alert, log, refreshSummary, supabase]),
  );

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
    fetchBuckets,
    fetchSubcontractsCount,
    onRefresh,
  };
}
