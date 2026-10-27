export const AI_COMMAND_CENTER_REFRESH_POLICY = Object.freeze({
  contractId: "ai_command_center_refresh_policy_v1",
  minRefreshIntervalMs: 30_000,
  requestTimeoutMs: 8_000,
  maxRetries: 1,
  duplicateInFlightAllowed: false,
  cancellationRequired: true,
  pollingLoopAllowed: false,
  pollingLoopCeiling: 0,
} as const);

export type AiCommandCenterRefreshDecisionInput = {
  nowMs: number;
  lastRefreshAtMs?: number | null;
  inFlight?: boolean;
};

export type AiCommandCenterRefreshDecision = {
  allowed: boolean;
  reason:
    | "refresh_allowed"
    | "refresh_in_flight"
    | "refresh_throttled";
  retryAllowed: boolean;
  timeoutMs: typeof AI_COMMAND_CENTER_REFRESH_POLICY.requestTimeoutMs;
  requiresCancellation: true;
  pollingLoopAllowed: false;
};

export function decideAiCommandCenterRefresh(
  input: AiCommandCenterRefreshDecisionInput,
): AiCommandCenterRefreshDecision {
  if (input.inFlight === true) {
    return {
      allowed: false,
      reason: "refresh_in_flight",
      retryAllowed: false,
      timeoutMs: AI_COMMAND_CENTER_REFRESH_POLICY.requestTimeoutMs,
      requiresCancellation: true,
      pollingLoopAllowed: false,
    };
  }

  const lastRefreshAtMs = input.lastRefreshAtMs ?? null;
  if (
    lastRefreshAtMs !== null &&
    input.nowMs - lastRefreshAtMs < AI_COMMAND_CENTER_REFRESH_POLICY.minRefreshIntervalMs
  ) {
    return {
      allowed: false,
      reason: "refresh_throttled",
      retryAllowed: false,
      timeoutMs: AI_COMMAND_CENTER_REFRESH_POLICY.requestTimeoutMs,
      requiresCancellation: true,
      pollingLoopAllowed: false,
    };
  }

  return {
    allowed: true,
    reason: "refresh_allowed",
    retryAllowed: AI_COMMAND_CENTER_REFRESH_POLICY.maxRetries > 0,
    timeoutMs: AI_COMMAND_CENTER_REFRESH_POLICY.requestTimeoutMs,
    requiresCancellation: true,
    pollingLoopAllowed: false,
  };
}
