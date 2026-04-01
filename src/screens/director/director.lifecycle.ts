import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { isProposalDirectorVisibleRow } from "../../lib/api/proposals";
import { REQUEST_PENDING_EN, REQUEST_PENDING_STATUS, normalizeStatus } from "../../lib/api/requests.status";
import { logError } from "../../lib/logError";
import { ensureSignedIn, supabase } from "../../lib/supabaseClient";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import { reportAndSwallow } from "../../lib/observability/catchDiscipline";
import {
  isPlatformGuardCoolingDown,
  recordPlatformGuardSkip,
} from "../../lib/observability/platformGuardDiscipline";
import { getPlatformNetworkSnapshot } from "../../lib/offline/platformNetwork.service";
import {
  DIRECTOR_HANDOFF_BROADCAST_CHANNEL_NAME,
  DIRECTOR_HANDOFF_BROADCAST_EVENT,
  DIRECTOR_SCREEN_REALTIME_CHANNEL_NAME,
} from "../../lib/realtime/realtime.channels";
import { useDirectorUiStore } from "./directorUi.store";

type RefreshState = {
  inFlight: Promise<void> | null;
  rerunQueued: boolean;
  rerunForce: boolean;
};

type RefreshFn = (force?: boolean) => Promise<void>;

type Deps = {
  dirTab: string;
  requestTab: string;
  finFrom: string | null;
  finTo: string | null;
  repFrom: string | null;
  repTo: string | null;
  isScreenFocused: boolean;
  fetchRows: (force?: boolean) => Promise<void>;
  fetchProps: (force?: boolean) => Promise<void>;
  fetchFinance: () => Promise<void>;
  fetchReport: () => Promise<void>;
  showRtToast: (title?: string, body?: string) => void;
};

const DIRECTOR_LIVE_REQUEST_STATUSES = new Set([
  normalizeStatus(REQUEST_PENDING_STATUS),
  normalizeStatus(REQUEST_PENDING_EN),
]);

const DIRECTOR_LIVE_ITEM_STATUSES = new Set([
  normalizeStatus(REQUEST_PENDING_STATUS),
  normalizeStatus("\u0423 \u0434\u0438\u0440\u0435\u043a\u0442\u043e\u0440\u0430"),
  normalizeStatus(REQUEST_PENDING_EN),
]);

const DIRECTOR_TAB_REQUESTS = "\u0417\u0430\u044f\u0432\u043a\u0438";
const DIRECTOR_TAB_FINANCE = "\u0424\u0438\u043d\u0430\u043d\u0441\u044b";
const DIRECTOR_TAB_REPORTS = "\u041e\u0442\u0447\u0451\u0442\u044b";
const DIRECTOR_REQUEST_TAB_BUYER = "buyer";
const DIRECTOR_LIFECYCLE_REFRESH_MIN_INTERVAL_MS = 1200;

const buildRequestsScopeKey = (requestTab: string) => `${DIRECTOR_TAB_REQUESTS}:${requestTab}`;

const getRecordValue = (value: unknown, key: string): unknown => {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null;
  return (value as Record<string, unknown>)[key];
};

const shouldRefreshDirectorRowsForRequestChange = (payload: { new?: unknown; old?: unknown }) => {
  const nextStatus = normalizeStatus(getRecordValue(payload.new, "status"));
  const prevStatus = normalizeStatus(getRecordValue(payload.old, "status"));
  const nextSubmittedAt = String(getRecordValue(payload.new, "submitted_at") ?? "").trim();
  const prevSubmittedAt = String(getRecordValue(payload.old, "submitted_at") ?? "").trim();
  return (
    !!nextSubmittedAt ||
    !!prevSubmittedAt ||
    DIRECTOR_LIVE_REQUEST_STATUSES.has(nextStatus) ||
    DIRECTOR_LIVE_REQUEST_STATUSES.has(prevStatus)
  );
};

const shouldRefreshDirectorRowsForItemChange = (payload: { new?: unknown; old?: unknown }) => {
  const nextStatus = normalizeStatus(getRecordValue(payload.new, "status"));
  const prevStatus = normalizeStatus(getRecordValue(payload.old, "status"));
  return DIRECTOR_LIVE_ITEM_STATUSES.has(nextStatus) || DIRECTOR_LIVE_ITEM_STATUSES.has(prevStatus);
};

const shouldRefreshDirectorPropsForProposalChange = (payload: { new?: unknown; old?: unknown }) => {
  const nextVisible = isProposalDirectorVisibleRow(
    payload.new as { status?: unknown; submitted_at?: unknown; sent_to_accountant_at?: unknown } | null | undefined,
  );
  const prevVisible = isProposalDirectorVisibleRow(
    payload.old as { status?: unknown; submitted_at?: unknown; sent_to_accountant_at?: unknown } | null | undefined,
  );
  if (nextVisible || prevVisible) return true;
  const nextSubmittedAt = String(getRecordValue(payload.new, "submitted_at") ?? "").trim();
  const prevSubmittedAt = String(getRecordValue(payload.old, "submitted_at") ?? "").trim();
  return !!nextSubmittedAt || !!prevSubmittedAt;
};

const logDirectorLive = (payload: Record<string, unknown>) => {
  if (!__DEV__) return;
  console.info("[director.live]", payload);
};

const runRefresh = (
  stateRef: { current: RefreshState },
  refreshRef: { current: RefreshFn },
  meta: { surface: string; event: string; trigger: string; scopeKey: string },
  options?: { force?: boolean; queueOnOverlap?: boolean },
) => {
  const force = !!options?.force;
  if (stateRef.current.inFlight) {
    recordPlatformObservability({
      screen: "director",
      surface: meta.surface,
      category: "reload",
      event: meta.event,
      result: force || options?.queueOnOverlap ? "queued_rerun" : "joined_inflight",
      trigger: meta.trigger,
      extra: {
        scopeKey: meta.scopeKey,
        force,
      },
    });
    if (force) {
      stateRef.current.rerunQueued = true;
      stateRef.current.rerunForce = true;
    } else if (options?.queueOnOverlap) {
      stateRef.current.rerunQueued = true;
    }
    return stateRef.current.inFlight;
  }

  const start = (nextForce: boolean) => {
    const task = (async () => {
      try {
        await refreshRef.current(nextForce);
      } finally {
        stateRef.current.inFlight = null;
        if (stateRef.current.rerunQueued) {
          const rerunForce = stateRef.current.rerunForce;
          stateRef.current.rerunQueued = false;
          stateRef.current.rerunForce = false;
          void start(rerunForce);
        }
      }
    })();
    stateRef.current.inFlight = task;
    return task;
  };

  return start(force);
};

export function useDirectorLifecycle({
  dirTab,
  requestTab,
  finFrom,
  finTo,
  repFrom,
  repTo,
  isScreenFocused,
  fetchRows,
  fetchProps,
  fetchFinance,
  fetchReport,
  showRtToast,
}: Deps) {
  const didInit = useRef(false);
  const lastInitedTabRef = useRef<string | null>(null);
  const lastInitedPeriodRef = useRef("");
  const appStateRef = useRef(AppState.currentState);
  const lastWebResumeAtRef = useRef(0);
  const lastLifecycleRefreshAtRef = useRef(0);
  const rtChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const handoffChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const rowsRefreshRef = useRef<RefreshState>({ inFlight: null, rerunQueued: false, rerunForce: false });
  const propsRefreshRef = useRef<RefreshState>({ inFlight: null, rerunQueued: false, rerunForce: false });
  const financeRefreshRef = useRef<RefreshState>({ inFlight: null, rerunQueued: false, rerunForce: false });
  const reportRefreshRef = useRef<RefreshState>({ inFlight: null, rerunQueued: false, rerunForce: false });
  const rowsRefreshFnRef = useRef<RefreshFn>(fetchRows);
  const propsRefreshFnRef = useRef<RefreshFn>(fetchProps);
  const financeRefreshFnRef = useRef<RefreshFn>(() => fetchFinance());
  const reportRefreshFnRef = useRef<RefreshFn>(() => fetchReport());
  const setRefreshReason = useDirectorUiStore((state) => state.setRefreshReason);

  rowsRefreshFnRef.current = fetchRows;
  propsRefreshFnRef.current = fetchProps;
  financeRefreshFnRef.current = () => fetchFinance();
  reportRefreshFnRef.current = () => fetchReport();

  const refreshRows = useCallback((reason: string, force = false) => {
    setRefreshReason(reason);
    return runRefresh(
      rowsRefreshRef,
      rowsRefreshFnRef,
      {
        surface: "request_rows",
        event: "refresh_scope",
        trigger: reason,
        scopeKey: `requests:${requestTab}:rows`,
      },
      { force },
    );
  }, [requestTab, setRefreshReason]);

  const refreshProps = useCallback((reason: string, force = false) => {
    setRefreshReason(reason);
    return runRefresh(
      propsRefreshRef,
      propsRefreshFnRef,
      {
        surface: "proposal_heads",
        event: "refresh_scope",
        trigger: reason,
        scopeKey: `requests:${requestTab}:buyer_props`,
      },
      { force },
    );
  }, [requestTab, setRefreshReason]);

  const refreshFinanceScoped = useCallback((reason: string) => {
    setRefreshReason(reason);
    return runRefresh(
      financeRefreshRef,
      financeRefreshFnRef,
      {
        surface: "finance_panel",
        event: "refresh_scope",
        trigger: reason,
        scopeKey: `finance:${finFrom ?? ""}:${finTo ?? ""}`,
      },
      { queueOnOverlap: true },
    );
  }, [finFrom, finTo, setRefreshReason]);

  const refreshReportScoped = useCallback((reason: string) => {
    setRefreshReason(reason);
    return runRefresh(
      reportRefreshRef,
      reportRefreshFnRef,
      {
        surface: "reports_scope",
        event: "refresh_scope",
        trigger: reason,
        scopeKey: `reports:${repFrom ?? ""}:${repTo ?? ""}`,
      },
      { queueOnOverlap: true },
    );
  }, [repFrom, repTo, setRefreshReason]);

  const refreshRequestsScoped = useCallback((reasonBase: string, force = false) => {
    if (requestTab === DIRECTOR_REQUEST_TAB_BUYER) {
      void refreshProps(`${reasonBase}:buyer`, force);
      return;
    }
    void refreshRows(`${reasonBase}:foreman`, force);
  }, [refreshProps, refreshRows, requestTab]);

  const refreshCurrentVisibleScope = useCallback((reasonBase: string, force = false) => {
    if (dirTab === DIRECTOR_TAB_REQUESTS) {
      refreshRequestsScoped(`${reasonBase}:requests`, force);
      return;
    }
    if (dirTab === DIRECTOR_TAB_FINANCE) {
      void refreshFinanceScoped(`${reasonBase}:finance`);
      return;
    }
    if (dirTab === DIRECTOR_TAB_REPORTS) {
      void refreshReportScoped(`${reasonBase}:reports`);
    }
  }, [dirTab, refreshFinanceScoped, refreshReportScoped, refreshRequestsScoped]);

  const dirTabRef = useRef(dirTab);
  const requestTabRef = useRef(requestTab);
  const showRtToastRef = useRef(showRtToast);
  const refreshCurrentVisibleScopeRef = useRef(refreshCurrentVisibleScope);
  const refreshRowsHandlerRef = useRef(refreshRows);
  const refreshPropsHandlerRef = useRef(refreshProps);

  dirTabRef.current = dirTab;
  requestTabRef.current = requestTab;
  showRtToastRef.current = showRtToast;
  refreshCurrentVisibleScopeRef.current = refreshCurrentVisibleScope;
  refreshRowsHandlerRef.current = refreshRows;
  refreshPropsHandlerRef.current = refreshProps;

  const runLifecycleScopedRefresh = useCallback((reasonBase: string, trigger: string) => {
    if (!didInit.current) {
      recordPlatformGuardSkip("bootstrap_not_ready", {
        screen: "director",
        surface: "visible_scope",
        event: "refresh_scope",
        trigger,
        extra: {
          scopeKey: dirTab === DIRECTOR_TAB_REQUESTS ? buildRequestsScopeKey(requestTab) : dirTab,
        },
      });
      return;
    }

    const networkSnapshot = getPlatformNetworkSnapshot();
    if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
      recordPlatformGuardSkip("network_known_offline", {
        screen: "director",
        surface: "visible_scope",
        event: "refresh_scope",
        trigger,
        extra: {
          scopeKey: dirTab === DIRECTOR_TAB_REQUESTS ? buildRequestsScopeKey(requestTab) : dirTab,
          networkKnownOffline: true,
        },
      });
      return;
    }

    const now = Date.now();
    if (
      isPlatformGuardCoolingDown({
        lastAt: lastLifecycleRefreshAtRef.current,
        minIntervalMs: DIRECTOR_LIFECYCLE_REFRESH_MIN_INTERVAL_MS,
        now,
      })
    ) {
      recordPlatformGuardSkip("recent_same_scope", {
        screen: "director",
        surface: "visible_scope",
        event: "refresh_scope",
        trigger,
        extra: {
          scopeKey: dirTab === DIRECTOR_TAB_REQUESTS ? buildRequestsScopeKey(requestTab) : dirTab,
        },
      });
      return;
    }

    lastLifecycleRefreshAtRef.current = now;
    refreshCurrentVisibleScope(reasonBase, true);
  }, [dirTab, refreshCurrentVisibleScope, requestTab]);

  useEffect(() => {
    if (didInit.current || !isScreenFocused) return;

    void (async () => {
      try {
        const signedIn = await ensureSignedIn();
        if (!signedIn) {
          recordPlatformGuardSkip("auth_not_ready", {
            screen: "director",
            surface: "visible_scope",
            event: "refresh_scope",
            trigger: "screen_init",
            extra: {
              scopeKey: dirTab === DIRECTOR_TAB_REQUESTS ? buildRequestsScopeKey(requestTab) : dirTab,
            },
          });
          return;
        }

        didInit.current = true;
        lastInitedTabRef.current = dirTab === DIRECTOR_TAB_REQUESTS ? buildRequestsScopeKey(requestTab) : dirTab;
        lastInitedPeriodRef.current = `${finFrom}-${finTo}-${repFrom}-${repTo}`;
        refreshCurrentVisibleScope("screen_init");
      } catch (error) {
        logError("director.lifecycle.ensureSignedIn", error);
      }
    })();
  }, [dirTab, finFrom, finTo, isScreenFocused, refreshCurrentVisibleScope, repFrom, repTo, requestTab]);

  useEffect(() => {
    if (!isScreenFocused || !didInit.current) return;

    const periodKey = `${finFrom}-${finTo}-${repFrom}-${repTo}`;
    const tabKey = dirTab === DIRECTOR_TAB_REQUESTS ? buildRequestsScopeKey(requestTab) : dirTab;
    if (lastInitedTabRef.current === tabKey && lastInitedPeriodRef.current === periodKey) return;

    lastInitedTabRef.current = tabKey;
    lastInitedPeriodRef.current = periodKey;

    if (tabKey === DIRECTOR_TAB_FINANCE) {
      void refreshFinanceScoped("tab_switch:finance");
    } else if (tabKey === DIRECTOR_TAB_REPORTS) {
      void refreshReportScoped("tab_switch:reports");
    } else if (dirTab === DIRECTOR_TAB_REQUESTS) {
      refreshRequestsScoped("tab_switch:requests");
    }
  }, [
    dirTab,
    finFrom,
    finTo,
    isScreenFocused,
    refreshFinanceScoped,
    refreshReportScoped,
    refreshRequestsScoped,
    repFrom,
    repTo,
    requestTab,
  ]);

  useEffect(() => {
    if (!isScreenFocused) return;

    const subscription = AppState.addEventListener("change", (nextState) => {
      const previous = appStateRef.current;
      appStateRef.current = nextState;
      const resumed = (previous === "background" || previous === "inactive") && nextState === "active";
      if (!resumed) return;

      runLifecycleScopedRefresh("app_resume", "app_active");
    });

    return () => {
      try {
        subscription.remove();
      } catch (error) {
        reportAndSwallow({
          screen: "director",
          surface: "lifecycle_subscription",
          event: "app_state_listener_remove_failed",
          error,
          kind: "cleanup_only",
          category: "reload",
          errorStage: "app_state_cleanup",
          extra: {
            scopeKey: dirTab === DIRECTOR_TAB_REQUESTS ? buildRequestsScopeKey(requestTab) : dirTab,
          },
        });
      }
    };
  }, [isScreenFocused, runLifecycleScopedRefresh]);

  useEffect(() => {
    if (!isScreenFocused) return;
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const triggerWebResume = (reasonBase: string) => {
      const now = Date.now();
      if (now - lastWebResumeAtRef.current < 750) return;
      lastWebResumeAtRef.current = now;
      runLifecycleScopedRefresh(reasonBase, reasonBase);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      triggerWebResume("web_resume");
    };

    const onFocus = () => {
      triggerWebResume("web_focus");
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [isScreenFocused, runLifecycleScopedRefresh]);

  useEffect(() => {
    try {
      if (rtChannelRef.current) {
        supabase.removeChannel(rtChannelRef.current);
        rtChannelRef.current = null;
      }
      if (handoffChannelRef.current) {
        supabase.removeChannel(handoffChannelRef.current);
        handoffChannelRef.current = null;
      }
    } catch (error) {
      reportAndSwallow({
        screen: "director",
        surface: "realtime_cleanup",
        event: "teardown_previous_channels_failed",
        error,
        kind: "cleanup_only",
        category: "reload",
        errorStage: "realtime_setup",
      });
    }

    if (!isScreenFocused) return;

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let handoffChannel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      try {
        const session = await supabase.auth.getSession();
        const accessToken = session.data.session?.access_token ?? null;
        if (accessToken) {
          await supabase.realtime.setAuth(accessToken);
          logDirectorLive({
            sourcePath: "director.lifecycle.realtime_auth",
            hasAccessToken: true,
          });
        }
      } catch (error) {
        logDirectorLive({
          sourcePath: "director.lifecycle.realtime_auth",
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }

      if (cancelled) return;

      channel = supabase
        .channel(DIRECTOR_SCREEN_REALTIME_CHANNEL_NAME)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: "role=eq.director",
          },
          (payload) => {
            const next = payload.new;
            const notification =
              next && typeof next === "object" ? (next as { title?: string; body?: string }) : {};
            showRtToastRef.current(notification.title, notification.body);
            refreshCurrentVisibleScopeRef.current("realtime:notifications", true);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "proposals",
          },
          (payload) => {
            if (
              dirTabRef.current !== DIRECTOR_TAB_REQUESTS ||
              requestTabRef.current !== DIRECTOR_REQUEST_TAB_BUYER
            ) {
              return;
            }
            if (!shouldRefreshDirectorPropsForProposalChange(payload)) return;
            logDirectorLive({
              sourcePath: "director.lifecycle.proposals",
              eventType: payload.eventType,
              proposalId:
                String(getRecordValue(payload.new, "id") ?? getRecordValue(payload.old, "id") ?? "").trim() || null,
              nextStatus: String(getRecordValue(payload.new, "status") ?? "").trim() || null,
              prevStatus: String(getRecordValue(payload.old, "status") ?? "").trim() || null,
            });
            void refreshPropsHandlerRef.current("realtime:proposals", true);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "requests",
          },
          (payload) => {
            if (
              dirTabRef.current !== DIRECTOR_TAB_REQUESTS ||
              requestTabRef.current === DIRECTOR_REQUEST_TAB_BUYER
            ) {
              return;
            }
            if (!shouldRefreshDirectorRowsForRequestChange(payload)) return;
            logDirectorLive({
              sourcePath: "director.lifecycle.requests",
              eventType: payload.eventType,
              requestId:
                String(getRecordValue(payload.new, "id") ?? getRecordValue(payload.old, "id") ?? "").trim() || null,
              nextStatus: String(getRecordValue(payload.new, "status") ?? "").trim() || null,
              prevStatus: String(getRecordValue(payload.old, "status") ?? "").trim() || null,
            });
            void refreshRowsHandlerRef.current("realtime:requests", true);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "request_items",
          },
          (payload) => {
            if (
              dirTabRef.current !== DIRECTOR_TAB_REQUESTS ||
              requestTabRef.current === DIRECTOR_REQUEST_TAB_BUYER
            ) {
              return;
            }
            if (!shouldRefreshDirectorRowsForItemChange(payload)) return;
            logDirectorLive({
              sourcePath: "director.lifecycle.request_items",
              eventType: payload.eventType,
              requestId:
                String(
                  getRecordValue(payload.new, "request_id") ?? getRecordValue(payload.old, "request_id") ?? "",
                ).trim() || null,
              nextStatus: String(getRecordValue(payload.new, "status") ?? "").trim() || null,
              prevStatus: String(getRecordValue(payload.old, "status") ?? "").trim() || null,
            });
            void refreshRowsHandlerRef.current("realtime:request_items", true);
          },
        )
        .subscribe((status) => {
          logDirectorLive({
            sourcePath: "director.lifecycle.channel",
            status,
          });
        });

      rtChannelRef.current = channel;

      handoffChannel = supabase
        .channel(DIRECTOR_HANDOFF_BROADCAST_CHANNEL_NAME, {
          config: {
            broadcast: {
              ack: false,
              self: false,
            },
          },
        })
        .on("broadcast", { event: DIRECTOR_HANDOFF_BROADCAST_EVENT }, (payload) => {
          if (
            dirTabRef.current !== DIRECTOR_TAB_REQUESTS ||
            requestTabRef.current === DIRECTOR_REQUEST_TAB_BUYER
          ) {
            return;
          }
          logDirectorLive({
            sourcePath: "director.lifecycle.broadcast_handoff",
            requestId: String(getRecordValue(payload.payload, "request_id") ?? "").trim() || null,
            displayNo: String(getRecordValue(payload.payload, "display_no") ?? "").trim() || null,
          });
          void refreshRowsHandlerRef.current("broadcast:foreman_submit", true);
        })
        .subscribe((status) => {
          logDirectorLive({
            sourcePath: "director.lifecycle.broadcast_channel",
            status,
          });
        });

      handoffChannelRef.current = handoffChannel;
    })();

    return () => {
      cancelled = true;
      if (channel) {
        try {
          channel.unsubscribe();
        } catch (error) {
          reportAndSwallow({
            screen: "director",
            surface: "realtime_cleanup",
            event: "screen_channel_unsubscribe_failed",
            error,
            kind: "cleanup_only",
            category: "reload",
            errorStage: "realtime_cleanup",
          });
        }
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          reportAndSwallow({
            screen: "director",
            surface: "realtime_cleanup",
            event: "screen_channel_remove_failed",
            error,
            kind: "cleanup_only",
            category: "reload",
            errorStage: "realtime_cleanup",
          });
        }
        if (rtChannelRef.current === channel) rtChannelRef.current = null;
      }
      if (handoffChannel) {
        try {
          handoffChannel.unsubscribe();
        } catch (error) {
          reportAndSwallow({
            screen: "director",
            surface: "realtime_cleanup",
            event: "handoff_channel_unsubscribe_failed",
            error,
            kind: "cleanup_only",
            category: "reload",
            errorStage: "realtime_cleanup",
          });
        }
        try {
          supabase.removeChannel(handoffChannel);
        } catch (error) {
          reportAndSwallow({
            screen: "director",
            surface: "realtime_cleanup",
            event: "handoff_channel_remove_failed",
            error,
            kind: "cleanup_only",
            category: "reload",
            errorStage: "realtime_cleanup",
          });
        }
        if (handoffChannelRef.current === handoffChannel) handoffChannelRef.current = null;
      }
    };
  }, [isScreenFocused]);
}
