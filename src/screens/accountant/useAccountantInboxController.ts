import { useCallback, useRef, useState, type MutableRefObject } from "react";

import { getPlatformNetworkSnapshot } from "../../lib/offline/platformNetwork.service";
import {
  beginPlatformObservability,
  recordPlatformObservability,
} from "../../lib/observability/platformObservability";
import { recordPlatformGuardSkip } from "../../lib/observability/platformGuardDiscipline";
import { runNextTick } from "./helpers";
import {
  ACCOUNTANT_INBOX_PAGE_SIZE,
  loadAccountantInboxPage,
  type AccountantLoadTrigger,
} from "./accountant.repository";
import {
  buildAccountantInboxCacheKey,
  buildAccountantInboxSnapshot,
  mergeAccountantInboxRowsIfChanged,
  selectAccountantInboxPreview,
  type InboxWindowSnapshot,
} from "./accountant.selectors";
import type { AccountantInboxUiRow, Tab } from "./types";

const errorMessage = (error: unknown) => {
  const value = error as { message?: string };
  return value?.message ?? String(error);
};

export function useAccountantInboxController(params: {
  authReady: boolean;
  freezeWhileOpen: boolean;
  focusedRef: MutableRefObject<boolean>;
  tabRef: MutableRefObject<Tab>;
}) {
  const { authReady, freezeWhileOpen, focusedRef, tabRef } = params;

  const [rows, setRows] = useState<AccountantInboxUiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const loadSeqRef = useRef(0);
  const inflightKeyRef = useRef<string | null>(null);
  const appendInflightKeyRef = useRef<string | null>(null);
  const queuedLoadRef = useRef<{ force: boolean; tab: Tab } | null>(null);
  const lastLoadedKeyRef = useRef<string | null>(null);
  const cacheByTabRef = useRef<Partial<Record<Tab, InboxWindowSnapshot>>>({});

  const applyPreview = useCallback((preview: InboxWindowSnapshot | null) => {
    if (preview) {
      setRows((prev) => mergeAccountantInboxRowsIfChanged(prev, preview.rows));
      setHasMore(preview.hasMore);
      setTotalCount(preview.totalRowCount);
      return;
    }
    setRows((prev) => (prev.length ? [] : prev));
    setHasMore(false);
    setTotalCount(0);
  }, []);

  const primeInboxPreviewForTab = useCallback(
    (tab: Tab) => {
      applyPreview(selectAccountantInboxPreview(cacheByTabRef.current, tab));
    },
    [applyPreview],
  );

  const loadInbox = useCallback(
    async (
      force?: boolean,
      tabOverride?: Tab,
      trigger: AccountantLoadTrigger = force ? "manual" : "focus",
    ) => {
      const tab = tabOverride ?? tabRef.current;
      if (!authReady) {
        recordPlatformGuardSkip("auth_not_ready", {
          screen: "accountant",
          surface: "inbox_list",
          event: "load_inbox",
          trigger,
          extra: { tab },
        });
        return;
      }
      if (!focusedRef.current) {
        recordPlatformGuardSkip("not_focused", {
          screen: "accountant",
          surface: "inbox_list",
          event: "load_inbox",
          trigger,
          extra: { tab },
        });
        return;
      }
      if (freezeWhileOpen) {
        recordPlatformGuardSkip("frozen_modal", {
          screen: "accountant",
          surface: "inbox_list",
          event: "load_inbox",
          trigger,
          extra: { tab },
        });
        return;
      }
      const networkSnapshot = getPlatformNetworkSnapshot();
      if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
        recordPlatformGuardSkip("network_known_offline", {
          screen: "accountant",
          surface: "inbox_list",
          event: "load_inbox",
          trigger,
          extra: { tab, networkKnownOffline: true },
        });
        return;
      }

      const key = buildAccountantInboxCacheKey(tab);
      applyPreview(selectAccountantInboxPreview(cacheByTabRef.current, tab));

      if (inflightKeyRef.current || appendInflightKeyRef.current) {
        recordPlatformObservability({
          screen: "accountant",
          surface: "inbox_list",
          category: "reload",
          event: "load_inbox",
          result: "queued_rerun",
          trigger,
          extra: { tab },
        });
        queuedLoadRef.current = {
          force: Boolean(force) || queuedLoadRef.current?.force === true,
          tab,
        };
        return;
      }
      if (!force && lastLoadedKeyRef.current === key) return;

      inflightKeyRef.current = key;
      const cached = selectAccountantInboxPreview(cacheByTabRef.current, tab);
      setLoading(!(cached && cached.rows.length > 0));
      const seq = ++loadSeqRef.current;
      const observation = beginPlatformObservability({
        screen: "accountant",
        surface: "inbox_list",
        category: "fetch",
        event: "load_inbox",
        sourceKind: "rpc:accountant_inbox_scope_v1",
        trigger,
      });

      try {
        const result = await loadAccountantInboxPage({
          tab,
          offsetRows: 0,
          limitRows: ACCOUNTANT_INBOX_PAGE_SIZE,
        });
        if (seq !== loadSeqRef.current) return;
        if (tab !== tabRef.current) return;

        const snapshot = buildAccountantInboxSnapshot({
          previous: cacheByTabRef.current[tab],
          result,
          append: false,
        });
        cacheByTabRef.current[tab] = snapshot;
        setHasMore(snapshot.hasMore);
        setTotalCount(snapshot.totalRowCount);
        setRows((prev) => mergeAccountantInboxRowsIfChanged(prev, snapshot.rows));
        recordPlatformObservability({
          screen: "accountant",
          surface: "inbox_list",
          category: "ui",
          event: "content_ready",
          result: "success",
          rowCount: snapshot.rows.length,
          extra: {
            tab,
            totalRowCount: snapshot.totalRowCount,
          },
        });
        observation.success({
          rowCount: snapshot.rows.length,
          sourceKind: result.sourceMeta.sourceKind,
          fallbackUsed: result.sourceMeta.fallbackUsed,
          extra: {
            tab,
            primaryOwner: result.sourceMeta.primaryOwner,
            backendFirstPrimary: result.sourceMeta.backendFirstPrimary,
            offsetRows: result.meta.offsetRows,
            limitRows: result.meta.limitRows,
            returnedRowCount: result.meta.returnedRowCount,
            totalRowCount: result.meta.totalRowCount,
            hasMore: result.meta.hasMore,
          },
        });
        lastLoadedKeyRef.current = key;
      } catch (error: unknown) {
        if (__DEV__) console.error("[accountant load]", errorMessage(error));
        observation.error(error, {
          rowCount: 0,
          errorStage: "load_inbox_scope_v1",
          extra: { tab },
        });
      } finally {
        if (seq === loadSeqRef.current && tab === tabRef.current) setLoading(false);
        inflightKeyRef.current = null;
        const queued = queuedLoadRef.current;
        queuedLoadRef.current = null;
        if (
          queued &&
          focusedRef.current &&
          !freezeWhileOpen &&
          (queued.force || buildAccountantInboxCacheKey(queued.tab) !== lastLoadedKeyRef.current)
        ) {
          runNextTick(() => {
            void loadInbox(queued.force, queued.tab);
          });
        }
      }
    },
    [applyPreview, authReady, focusedRef, freezeWhileOpen, tabRef],
  );

  const loadMoreInbox = useCallback(async () => {
    const tab = tabRef.current;
    const current = selectAccountantInboxPreview(cacheByTabRef.current, tab);
    if (!authReady) {
      recordPlatformGuardSkip("auth_not_ready", {
        screen: "accountant",
        surface: "inbox_list",
        event: "load_inbox_page",
        trigger: "scroll",
        extra: { tab },
      });
      return;
    }
    if (!focusedRef.current || freezeWhileOpen) return;
    if (!current?.hasMore) {
      recordPlatformGuardSkip("no_more_pages", {
        screen: "accountant",
        surface: "inbox_list",
        event: "load_inbox_page",
        trigger: "scroll",
        extra: { tab },
      });
      return;
    }
    const networkSnapshot = getPlatformNetworkSnapshot();
    if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
      recordPlatformGuardSkip("network_known_offline", {
        screen: "accountant",
        surface: "inbox_list",
        event: "load_inbox_page",
        trigger: "scroll",
        extra: { tab, networkKnownOffline: true },
      });
      return;
    }
    if (inflightKeyRef.current || appendInflightKeyRef.current) {
      recordPlatformObservability({
        screen: "accountant",
        surface: "inbox_list",
        category: "reload",
        event: "load_inbox_page",
        result: "joined_inflight",
        trigger: "scroll",
        extra: { tab },
      });
      return;
    }

    appendInflightKeyRef.current = `${tab}:${current.nextOffsetRows}`;
    setLoadingMore(true);
    const observation = beginPlatformObservability({
      screen: "accountant",
      surface: "inbox_list",
      category: "fetch",
      event: "load_inbox_page",
      sourceKind: "rpc:accountant_inbox_scope_v1",
      trigger: "scroll",
    });
    try {
      const result = await loadAccountantInboxPage({
        tab,
        offsetRows: current.nextOffsetRows,
        limitRows: current.limitRows,
      });
      if (!focusedRef.current || tabRef.current !== tab) return;
      const snapshot = buildAccountantInboxSnapshot({
        previous: current,
        result,
        append: true,
      });
      cacheByTabRef.current[tab] = snapshot;
      setHasMore(snapshot.hasMore);
      setTotalCount(snapshot.totalRowCount);
      setRows(snapshot.rows);
      observation.success({
        rowCount: result.rows.length,
        sourceKind: result.sourceMeta.sourceKind,
        fallbackUsed: result.sourceMeta.fallbackUsed,
        extra: {
          tab,
          primaryOwner: result.sourceMeta.primaryOwner,
          offsetRows: result.meta.offsetRows,
          limitRows: result.meta.limitRows,
          returnedRowCount: result.meta.returnedRowCount,
          totalRowCount: result.meta.totalRowCount,
          hasMore: result.meta.hasMore,
          mergedRowCount: snapshot.rows.length,
        },
      });
    } catch (error: unknown) {
      if (__DEV__) console.error("[accountant load more]", errorMessage(error));
      observation.error(error, {
        rowCount: 0,
        errorStage: "load_inbox_scope_v1_page",
        extra: { tab },
      });
    } finally {
      appendInflightKeyRef.current = null;
      setLoadingMore(false);
    }
  }, [authReady, focusedRef, freezeWhileOpen, tabRef]);

  const isInboxRefreshInFlight = useCallback(
    () => Boolean(inflightKeyRef.current || appendInflightKeyRef.current),
    [],
  );

  return {
    rows,
    setRows,
    loading,
    refreshing,
    setRefreshing,
    loadingMore,
    hasMore,
    totalCount,
    cacheByTabRef,
    loadInbox,
    loadMoreInbox,
    primeInboxPreviewForTab,
    isInboxRefreshInFlight,
  };
}
