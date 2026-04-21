import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { logError } from "../../lib/logError";
import { reportAndSwallow } from "../../lib/observability/catchDiscipline";
import { recordPlatformGuardSkip } from "../../lib/observability/platformGuardDiscipline";
import { getPlatformNetworkSnapshot } from "../../lib/offline/platformNetwork.service";
import { ensureSignedIn } from "../../lib/supabaseClient";
import { useDirectorUiStore } from "./directorUi.store";
import type { DirectorLifecycleDeps } from "./director.lifecycle.contract";
import { setupDirectorRealtimeLifecycle } from "./director.lifecycle.realtime";
import {
  createRefreshState,
  type RefreshFn,
  runRefresh,
  resolveDirectorLifecycleRefreshPlan,
  resolveDirectorTabSwitchPlan,
  resolveDirectorWebResumePlan,
  shouldTriggerFocusReturnRefresh,
} from "./director.lifecycle.refresh";
import {
  DIRECTOR_LIFECYCLE_REFRESH_MIN_INTERVAL_MS,
  DIRECTOR_WEB_RESUME_MIN_INTERVAL_MS,
  buildDirectorFinanceScopeKey,
  buildDirectorPropsScopeKey,
  buildDirectorReportsScopeKey,
  buildDirectorRowsScopeKey,
  buildDirectorVisibleScopeKey,
  resolveDirectorVisibleRefreshPlan,
} from "./director.lifecycle.scope";

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
}: DirectorLifecycleDeps) {
  const didInit = useRef(false);
  const lastInitedTabRef = useRef<string | null>(null);
  const lastInitedPeriodRef = useRef("");
  const appStateRef = useRef(AppState.currentState);
  const lastWebResumeAtRef = useRef(0);
  const lastLifecycleRefreshAtRef = useRef(0);
  const prevFocusedRef = useRef(false);
  const rtChannelRef = useRef<RealtimeChannel | null>(null);
  const handoffChannelRef = useRef<RealtimeChannel | null>(null);
  const rowsRefreshRef = useRef(createRefreshState());
  const propsRefreshRef = useRef(createRefreshState());
  const financeRefreshRef = useRef(createRefreshState());
  const reportRefreshRef = useRef(createRefreshState());
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
        scopeKey: buildDirectorRowsScopeKey(requestTab),
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
        scopeKey: buildDirectorPropsScopeKey(requestTab),
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
        scopeKey: buildDirectorFinanceScopeKey(finFrom, finTo),
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
        scopeKey: buildDirectorReportsScopeKey(repFrom, repTo),
      },
      { queueOnOverlap: true },
    );
  }, [repFrom, repTo, setRefreshReason]);

  const refreshCurrentVisibleScope = useCallback((reasonBase: string, force = false) => {
    const plan = resolveDirectorVisibleRefreshPlan({ dirTab, requestTab }, reasonBase, force);
    if (plan.kind === "request_props") {
      void refreshProps(plan.reason, plan.force);
      return;
    }
    if (plan.kind === "request_rows") {
      void refreshRows(plan.reason, plan.force);
      return;
    }
    if (plan.kind === "finance") {
      void refreshFinanceScoped(plan.reason);
      return;
    }
    if (plan.kind === "reports") {
      void refreshReportScoped(plan.reason);
    }
  }, [dirTab, refreshFinanceScoped, refreshProps, refreshReportScoped, refreshRows, requestTab]);

  const dirTabRef = useRef(dirTab);
  const requestTabRef = useRef(requestTab);
  const showRtToastRef = useRef(showRtToast);
  const refreshCurrentVisibleScopeRef = useRef(refreshCurrentVisibleScope);
  const refreshRowsHandlerRef = useRef(refreshRows);
  const refreshPropsHandlerRef = useRef(refreshProps);
  const runLifecycleScopedRefreshRef = useRef<(reasonBase: string, trigger: string) => void>(() => undefined);

  dirTabRef.current = dirTab;
  requestTabRef.current = requestTab;
  showRtToastRef.current = showRtToast;
  refreshCurrentVisibleScopeRef.current = refreshCurrentVisibleScope;
  refreshRowsHandlerRef.current = refreshRows;
  refreshPropsHandlerRef.current = refreshProps;

  const runLifecycleScopedRefresh = useCallback((reasonBase: string, trigger: string) => {
    const networkSnapshot = getPlatformNetworkSnapshot();
    const scopeKey = buildDirectorVisibleScopeKey({ dirTab, requestTab });
    const plan = resolveDirectorLifecycleRefreshPlan({
      didInit: didInit.current,
      scopeKey,
      networkHydrated: networkSnapshot.hydrated,
      networkKnownOffline: networkSnapshot.networkKnownOffline,
      lastLifecycleRefreshAt: lastLifecycleRefreshAtRef.current,
      minIntervalMs: DIRECTOR_LIFECYCLE_REFRESH_MIN_INTERVAL_MS,
      now: Date.now(),
    });

    if (plan.kind === "skip") {
      recordPlatformGuardSkip(plan.skipReason, {
        screen: "director",
        surface: "visible_scope",
        event: "refresh_scope",
        trigger,
        extra: {
          scopeKey: plan.scopeKey,
          ...(plan.networkKnownOffline ? { networkKnownOffline: true } : {}),
        },
      });
      return;
    }

    lastLifecycleRefreshAtRef.current = plan.nextLastLifecycleRefreshAt;
    refreshCurrentVisibleScope(reasonBase, true);
  }, [dirTab, refreshCurrentVisibleScope, requestTab]);
  runLifecycleScopedRefreshRef.current = runLifecycleScopedRefresh;

  useEffect(() => {
    if (didInit.current || !isScreenFocused) return;

    const scopeKey = buildDirectorVisibleScopeKey({ dirTab, requestTab });

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
              scopeKey,
            },
          });
          return;
        }

        didInit.current = true;
        lastInitedTabRef.current = buildDirectorVisibleScopeKey({ dirTab, requestTab });
        lastInitedPeriodRef.current = `${finFrom}-${finTo}-${repFrom}-${repTo}`;
        refreshCurrentVisibleScope("screen_init");
      } catch (error) {
        logError("director.lifecycle.ensureSignedIn", error);
      }
    })();
  }, [dirTab, finFrom, finTo, isScreenFocused, refreshCurrentVisibleScope, repFrom, repTo, requestTab]);

  useEffect(() => {
    if (!isScreenFocused || !didInit.current) return;

    const plan = resolveDirectorTabSwitchPlan({
      scope: { dirTab, requestTab, finFrom, finTo, repFrom, repTo },
      lastTabKey: lastInitedTabRef.current,
      lastPeriodKey: lastInitedPeriodRef.current,
    });

    lastInitedTabRef.current = plan.nextTabKey;
    lastInitedPeriodRef.current = plan.nextPeriodKey;

    if (plan.kind !== "refresh") return;

    if (plan.refreshPlan.kind === "request_props") {
      void refreshProps(plan.refreshPlan.reason, plan.refreshPlan.force);
      return;
    }
    if (plan.refreshPlan.kind === "request_rows") {
      void refreshRows(plan.refreshPlan.reason, plan.refreshPlan.force);
      return;
    }
    if (plan.refreshPlan.kind === "finance") {
      void refreshFinanceScoped(plan.refreshPlan.reason);
      return;
    }
    if (plan.refreshPlan.kind === "reports") {
      void refreshReportScoped(plan.refreshPlan.reason);
    }
  }, [
    dirTab,
    finFrom,
    finTo,
    isScreenFocused,
    refreshFinanceScoped,
    refreshProps,
    refreshReportScoped,
    refreshRows,
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

      runLifecycleScopedRefreshRef.current("app_resume", "app_active");
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
            scopeKey: buildDirectorVisibleScopeKey({ dirTab, requestTab }),
          },
        });
      }
    };
  }, [dirTab, isScreenFocused, requestTab]);

  useEffect(() => {
    const wasFocused = prevFocusedRef.current;
    prevFocusedRef.current = isScreenFocused;

    if (!shouldTriggerFocusReturnRefresh({
      wasFocused,
      isScreenFocused,
      didInit: didInit.current,
    })) {
      return;
    }

    runLifecycleScopedRefresh("screen_focus", "screen_focus");
  }, [isScreenFocused, runLifecycleScopedRefresh]);

  useEffect(() => {
    if (!isScreenFocused) return;
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const triggerWebResume = (reasonBase: string) => {
      const plan = resolveDirectorWebResumePlan({
        lastWebResumeAt: lastWebResumeAtRef.current,
        now: Date.now(),
        minIntervalMs: DIRECTOR_WEB_RESUME_MIN_INTERVAL_MS,
      });
      if (plan.kind === "skip") return;

      lastWebResumeAtRef.current = plan.nextLastWebResumeAt;
      runLifecycleScopedRefreshRef.current(reasonBase, reasonBase);
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
  }, [isScreenFocused]);

  useEffect(() => {
    return setupDirectorRealtimeLifecycle({
      isScreenFocused,
      refs: {
        dirTabRef,
        requestTabRef,
        showRtToastRef,
        refreshCurrentVisibleScopeRef,
        refreshRowsHandlerRef,
        refreshPropsHandlerRef,
        rtChannelRef,
        handoffChannelRef,
      },
    });
  }, [isScreenFocused]);
}
