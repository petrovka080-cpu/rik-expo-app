import { useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { BuyerInboxRow } from "../../../lib/catalog_api";
import type { BuyerProposalBucketRow } from "../buyer.fetchers";
import { fetchBuyerInboxProd, fetchBuyerBucketsProd } from "../buyer.fetchers";
import { attachBuyerSubscriptions } from "../buyer.subscriptions";
import { fetchBuyerSubcontractCount } from "./useBuyerSubcontractCount";

type AlertFn = (title: string, message?: string) => void;
type LogFn = (msg: unknown, ...rest: unknown[]) => void;

type RefreshState = {
  inFlight: Promise<void> | null;
  rerunQueued: boolean;
  rerunWaiter: Promise<void> | null;
  resolveRerunWaiter: (() => void) | null;
  rejectRerunWaiter: ((error: unknown) => void) | null;
};

type RefreshStateRef = {
  current: RefreshState;
};

export function useBuyerLoadingController(params: {
  supabase: SupabaseClient;
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
  kickMsInbox: number;
  kickMsBuckets: number;
  alert: AlertFn;
  log?: LogFn;
}) {
  const {
    supabase,
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
    kickMsInbox,
    kickMsBuckets,
    alert,
    log,
  } = params;

  const focusedRef = useRef(false);
  const lastInboxKickRef = useRef(0);
  const lastBucketsKickRef = useRef(0);
  const inboxRefreshRef = useRef<RefreshState>({ inFlight: null, rerunQueued: false, rerunWaiter: null, resolveRerunWaiter: null, rejectRerunWaiter: null });
  const bucketsRefreshRef = useRef<RefreshState>({ inFlight: null, rerunQueued: false, rerunWaiter: null, resolveRerunWaiter: null, rejectRerunWaiter: null });
  const subcontractsRefreshRef = useRef<RefreshState>({ inFlight: null, rerunQueued: false, rerunWaiter: null, resolveRerunWaiter: null, rejectRerunWaiter: null });

  const runRefresh = useCallback((stateRef: RefreshStateRef, refresh: () => Promise<void>) => {
    if (stateRef.current.inFlight) {
      stateRef.current.rerunQueued = true;
      if (!stateRef.current.rerunWaiter) {
        stateRef.current.rerunWaiter = new Promise<void>((resolve, reject) => {
          stateRef.current.resolveRerunWaiter = resolve;
          stateRef.current.rejectRerunWaiter = reject;
        });
      }
      return stateRef.current.rerunWaiter;
    }

    const start = () => {
      const task = (async () => {
        try {
          await refresh();
          if (!stateRef.current.rerunQueued) {
            stateRef.current.resolveRerunWaiter?.();
            stateRef.current.rerunWaiter = null;
            stateRef.current.resolveRerunWaiter = null;
            stateRef.current.rejectRerunWaiter = null;
          }
        } catch (error) {
          if (!stateRef.current.rerunQueued) {
            stateRef.current.rejectRerunWaiter?.(error);
            stateRef.current.rerunWaiter = null;
            stateRef.current.resolveRerunWaiter = null;
            stateRef.current.rejectRerunWaiter = null;
          }
          throw error;
        } finally {
          stateRef.current.inFlight = null;
          if (stateRef.current.rerunQueued) {
            stateRef.current.rerunQueued = false;
            void start();
          }
        }
      })();
      stateRef.current.inFlight = task;
      return task;
    };

    return start();
  }, []);

  const fetchInbox = useCallback(async () => {
    await runRefresh(inboxRefreshRef, async () => {
      await fetchBuyerInboxProd({
        focusedRef,
        lastKickRef: lastInboxKickRef,
        kickMs: kickMsInbox,
        listBuyerInbox,
        preloadDisplayNos,
        setLoadingInbox,
        setRows,
        alert,
        log,
      });
    });
  }, [kickMsInbox, listBuyerInbox, preloadDisplayNos, setLoadingInbox, setRows, alert, log, runRefresh]);

  const fetchBuckets = useCallback(async () => {
    await runRefresh(bucketsRefreshRef, async () => {
      await fetchBuyerBucketsProd({
        focusedRef,
        lastKickRef: lastBucketsKickRef,
        kickMs: kickMsBuckets,
        supabase,
        preloadProposalTitles,
        setLoadingBuckets,
        setPending,
        setApproved,
        setRejected,
        log,
      });
    });
  }, [
    kickMsBuckets,
    supabase,
    preloadProposalTitles,
    setLoadingBuckets,
    setPending,
    setApproved,
    setRejected,
    log,
    runRefresh,
  ]);

  const fetchSubcontractsCount = useCallback(async () => {
    await runRefresh(subcontractsRefreshRef, async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData?.user?.id;
        if (!uid) return;
        const count = await fetchBuyerSubcontractCount(supabase, uid);
        if (count != null) setSubcontractCount(count);
      } catch {
        // no-op
      }
    });
  }, [supabase, setSubcontractCount, runRefresh]);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;

      void Promise.all([
        fetchInbox(),
        fetchBuckets(),
        fetchSubcontractsCount()
      ]);

      const detach = attachBuyerSubscriptions({
        supabase,
        focusedRef,
        onNotif: (t, m) => alert(t, m),
        onProposalsChanged: () => {
          void Promise.all([fetchBuckets(), fetchInbox()]);
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
    }, [fetchInbox, fetchBuckets, fetchSubcontractsCount, supabase, alert, log])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchInbox(),
      fetchBuckets(),
      fetchSubcontractsCount()
    ]);
    setRefreshing(false);
  }, [fetchInbox, fetchBuckets, fetchSubcontractsCount, setRefreshing]);

  return {
    fetchInbox,
    fetchBuckets,
    fetchSubcontractsCount,
    onRefresh,
  };
}
