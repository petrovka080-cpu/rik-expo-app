import {
  recordPlatformObservability,
  type PlatformObservabilityEvent,
} from "./platformObservability";

export type PlatformGuardReason =
  | "auth_not_ready"
  | "bootstrap_not_ready"
  | "network_known_offline"
  | "not_focused"
  | "frozen_modal"
  | "recent_same_scope"
  | "recent_error"
  | "inactive_tab"
  | "no_more_pages";

export type PlatformGuardDecision = {
  allowed: boolean;
  reason: PlatformGuardReason | null;
  scopeKey: string;
  joinedInflight: boolean;
  recentHit: boolean;
  networkKnownOffline: boolean;
  authReady: boolean;
  bootstrapReady: boolean;
  refreshScope?: string | null;
};

type PlatformGuardScope = Pick<PlatformObservabilityEvent, "screen" | "surface" | "event"> & {
  trigger?: string;
  sourceKind?: string;
  extra?: Record<string, unknown>;
};

export const createPlatformGuardDecision = (params: {
  scopeKey: string;
  allowed: boolean;
  reason?: PlatformGuardReason | null;
  joinedInflight?: boolean;
  recentHit?: boolean;
  networkKnownOffline?: boolean;
  authReady?: boolean;
  bootstrapReady?: boolean;
  refreshScope?: string | null;
}): PlatformGuardDecision => ({
  allowed: params.allowed,
  reason: params.allowed ? null : params.reason ?? null,
  scopeKey: params.scopeKey,
  joinedInflight: params.joinedInflight === true,
  recentHit: params.recentHit === true,
  networkKnownOffline: params.networkKnownOffline === true,
  authReady: params.authReady !== false,
  bootstrapReady: params.bootstrapReady !== false,
  refreshScope: params.refreshScope ?? null,
});

export const recordPlatformGuardDecision = (
  scope: PlatformGuardScope,
  decision: PlatformGuardDecision,
) => {
  if (decision.allowed) return;
  recordPlatformObservability({
    screen: scope.screen,
    surface: scope.surface,
    category: "reload",
    event: scope.event,
    result: "skipped",
    trigger: scope.trigger,
    sourceKind: scope.sourceKind,
    extra: {
      guardReason: decision.reason,
      scopeKey: decision.scopeKey,
      joinedInflight: decision.joinedInflight,
      recentScopeHit: decision.recentHit,
      networkKnownOffline: decision.networkKnownOffline,
      authReady: decision.authReady,
      bootstrapReady: decision.bootstrapReady,
      refreshScope: decision.refreshScope,
      ...(scope.extra ?? {}),
    },
  });
};

export const recordPlatformGuardSkip = (
  reason: PlatformGuardReason,
  scope: PlatformGuardScope,
) => {
  recordPlatformGuardDecision(
    scope,
    createPlatformGuardDecision({
      scopeKey: `${scope.screen}|${scope.surface}|${scope.event}`,
      allowed: false,
      reason,
    }),
  );
};

export const isPlatformGuardCoolingDown = (params: {
  lastAt: number;
  minIntervalMs: number;
  now?: number;
}) => {
  const now = params.now ?? Date.now();
  return now - params.lastAt < params.minIntervalMs;
};
