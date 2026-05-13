export const AI_COMMAND_CENTER_REALTIME_POLICY = Object.freeze({
  contractId: "ai_command_center_realtime_policy_v1",
  realtimeEnabledByDefault: false,
  perCardRealtimeSubscriptionAllowed: false,
  globalRealtimeSubscriptionAllowed: false,
  pollingFallbackAllowed: true,
  pollingFallbackRequiresRefreshPolicy: true,
  maxSubscriptionsPerScreen: 0,
  maxSubscriptionsPerCard: 0,
  routeScope: "ai.command_center.task_stream",
} as const);

export type AiCommandCenterRealtimeDecision = {
  realtimeEnabled: false;
  perCardSubscriptionAllowed: false;
  globalSubscriptionAllowed: false;
  pollingFallbackAllowed: true;
  reason: "realtime_disabled_by_budget";
};

export function decideAiCommandCenterRealtimeUsage(): AiCommandCenterRealtimeDecision {
  return {
    realtimeEnabled: false,
    perCardSubscriptionAllowed: false,
    globalSubscriptionAllowed: false,
    pollingFallbackAllowed: true,
    reason: "realtime_disabled_by_budget",
  };
}

export function assertNoAiCommandCenterRealtimeSubscription(source: string): boolean {
  return !/\b(channel|subscribe|on)\s*\(|\.channel\s*\(|\.subscribe\s*\(/i.test(source);
}
