import { redactBffText } from "./bffSafety";

export type AbuseSignal =
  | "too_many_requests"
  | "burst_spike"
  | "expensive_job_spike"
  | "realtime_reconnect_storm"
  | "offline_replay_storm"
  | "external_side_effect_replay"
  | "invalid_payload_repeated"
  | "unknown";

export type AbuseGuardDecision = {
  action: "allow" | "observe" | "challenge" | "rate_limited";
  reason: AbuseSignal;
  safeMessage: string;
  rawPayloadLogged: false;
  piiLogged: false;
};

export const ABUSE_SIGNALS: readonly AbuseSignal[] = [
  "too_many_requests",
  "burst_spike",
  "expensive_job_spike",
  "realtime_reconnect_storm",
  "offline_replay_storm",
  "external_side_effect_replay",
  "invalid_payload_repeated",
  "unknown",
] as const;

const ABUSE_SIGNAL_MESSAGES: Record<AbuseSignal, string> = {
  too_many_requests: "Request volume pattern recorded for future rate limit review",
  burst_spike: "Burst pattern recorded for future abuse guard review",
  expensive_job_spike: "Expensive job pattern recorded for future abuse guard review",
  realtime_reconnect_storm: "Realtime reconnect pattern recorded for future abuse guard review",
  offline_replay_storm: "Offline replay pattern recorded for future abuse guard review",
  external_side_effect_replay: "External side effect replay pattern recorded for future abuse guard review",
  invalid_payload_repeated: "Repeated invalid payload pattern recorded for future abuse guard review",
  unknown: "Request pattern recorded for future abuse guard review",
};

export function isKnownAbuseSignal(value: unknown): value is AbuseSignal {
  return ABUSE_SIGNALS.includes(value as AbuseSignal);
}

export function buildDisabledAbuseGuardDecision(signal: unknown): AbuseGuardDecision {
  const reason = isKnownAbuseSignal(signal) ? signal : "unknown";

  return {
    action: "observe",
    reason,
    safeMessage: redactBffText(ABUSE_SIGNAL_MESSAGES[reason]),
    rawPayloadLogged: false,
    piiLogged: false,
  };
}

export function validateAbuseGuardDecision(decision: AbuseGuardDecision): boolean {
  return (
    decision.action === "observe" &&
    isKnownAbuseSignal(decision.reason) &&
    decision.safeMessage.length > 0 &&
    decision.safeMessage === redactBffText(decision.safeMessage) &&
    decision.rawPayloadLogged === false &&
    decision.piiLogged === false
  );
}
