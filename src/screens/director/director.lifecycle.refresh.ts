import { isPlatformGuardCoolingDown } from "../../lib/observability/platformGuardDiscipline";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";

import type { DirectorLifecycleScopeSnapshot } from "./director.lifecycle.contract";
import {
  buildDirectorPeriodKey,
  buildDirectorVisibleScopeKey,
  resolveDirectorVisibleRefreshPlan,
} from "./director.lifecycle.scope";

export type RefreshState = {
  inFlight: Promise<void> | null;
  rerunQueued: boolean;
  rerunForce: boolean;
};

export type RefreshFn = (force?: boolean) => Promise<void>;

export type DirectorLifecycleRefreshPlan =
  | {
      kind: "skip";
      skipReason: "bootstrap_not_ready" | "network_known_offline" | "recent_same_scope";
      scopeKey: string;
      networkKnownOffline?: boolean;
    }
  | {
      kind: "refresh";
      nextLastLifecycleRefreshAt: number;
    };

export type DirectorTabSwitchPlan =
  | {
      kind: "skip";
      nextTabKey: string;
      nextPeriodKey: string;
    }
  | {
      kind: "refresh";
      nextTabKey: string;
      nextPeriodKey: string;
      refreshPlan: ReturnType<typeof resolveDirectorVisibleRefreshPlan>;
    };

export const createRefreshState = (): RefreshState => ({
  inFlight: null,
  rerunQueued: false,
  rerunForce: false,
});

export const runRefresh = (
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

export const resolveDirectorLifecycleRefreshPlan = (params: {
  didInit: boolean;
  scopeKey: string;
  networkHydrated: boolean;
  networkKnownOffline: boolean;
  lastLifecycleRefreshAt: number;
  minIntervalMs: number;
  now: number;
}): DirectorLifecycleRefreshPlan => {
  if (!params.didInit) {
    return {
      kind: "skip",
      skipReason: "bootstrap_not_ready",
      scopeKey: params.scopeKey,
    };
  }

  if (params.networkHydrated && params.networkKnownOffline) {
    return {
      kind: "skip",
      skipReason: "network_known_offline",
      scopeKey: params.scopeKey,
      networkKnownOffline: true,
    };
  }

  if (
    isPlatformGuardCoolingDown({
      lastAt: params.lastLifecycleRefreshAt,
      minIntervalMs: params.minIntervalMs,
      now: params.now,
    })
  ) {
    return {
      kind: "skip",
      skipReason: "recent_same_scope",
      scopeKey: params.scopeKey,
    };
  }

  return {
    kind: "refresh",
    nextLastLifecycleRefreshAt: params.now,
  };
};

export const shouldTriggerFocusReturnRefresh = (params: {
  wasFocused: boolean;
  isScreenFocused: boolean;
  didInit: boolean;
}) => !params.wasFocused && params.isScreenFocused && params.didInit;

export const resolveDirectorWebResumePlan = (params: {
  lastWebResumeAt: number;
  now: number;
  minIntervalMs: number;
}) => {
  if (params.now - params.lastWebResumeAt < params.minIntervalMs) {
    return {
      kind: "skip" as const,
    };
  }

  return {
    kind: "refresh" as const,
    nextLastWebResumeAt: params.now,
  };
};

export const resolveDirectorTabSwitchPlan = (params: {
  scope: DirectorLifecycleScopeSnapshot;
  lastTabKey: string | null;
  lastPeriodKey: string;
}): DirectorTabSwitchPlan => {
  const nextTabKey = buildDirectorVisibleScopeKey(params.scope);
  const nextPeriodKey = buildDirectorPeriodKey(params.scope);
  if (params.lastTabKey === nextTabKey && params.lastPeriodKey === nextPeriodKey) {
    return {
      kind: "skip",
      nextTabKey,
      nextPeriodKey,
    };
  }

  return {
    kind: "refresh",
    nextTabKey,
    nextPeriodKey,
    refreshPlan: resolveDirectorVisibleRefreshPlan(params.scope, "tab_switch"),
  };
};
