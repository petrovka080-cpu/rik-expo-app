import { redactBffText } from "./bffSafety";
import type { RateLimitDecisionState } from "./rateLimitAdapters";
import {
  ABUSE_OBSERVABILITY_METADATA,
  type AbuseObservabilityMetadata,
} from "./scaleObservabilityEvents";

export type AbuseEnforcementReasonCode =
  | "too_many_requests"
  | "burst_exceeded"
  | "duplicate_mutation_attempt"
  | "missing_idempotency_key"
  | "payload_too_large"
  | "invalid_actor_scope"
  | "suspicious_fanout"
  | "disabled";

export type AbuseEnforcementInput = {
  enforcementEnabled?: boolean;
  rateLimitState?: RateLimitDecisionState | null;
  duplicateMutationAttempt?: boolean | null;
  missingIdempotencyKey?: boolean | null;
  payloadBytes?: number | null;
  payloadMaxBytes?: number | null;
  actorScopeValid?: boolean | null;
  fanoutCount?: number | null;
  fanoutMax?: number | null;
};

export type AbuseEnforcementDecision = {
  action: "observe";
  reasonCode: AbuseEnforcementReasonCode;
  safeMessage: string;
  enforcementEnabled: false;
  realUsersBlocked: false;
  rawPayloadLogged: false;
  piiLogged: false;
  observability: AbuseObservabilityMetadata;
};

export const ABUSE_ENFORCEMENT_REASON_CODES: readonly AbuseEnforcementReasonCode[] = Object.freeze([
  "too_many_requests",
  "burst_exceeded",
  "duplicate_mutation_attempt",
  "missing_idempotency_key",
  "payload_too_large",
  "invalid_actor_scope",
  "suspicious_fanout",
  "disabled",
] as const);

const REASON_MESSAGES: Record<AbuseEnforcementReasonCode, string> = {
  too_many_requests: "Request volume would be rate limited by future server enforcement",
  burst_exceeded: "Request burst would be cooled down by future server enforcement",
  duplicate_mutation_attempt: "Duplicate mutation attempt would require idempotency review",
  missing_idempotency_key: "Mutation request is missing idempotency metadata",
  payload_too_large: "Request payload exceeds the configured safety boundary",
  invalid_actor_scope: "Request actor scope does not match the enforcement policy",
  suspicious_fanout: "Fanout request exceeds the configured safety boundary",
  disabled: "Rate enforcement is disabled by default",
};

export function classifyAbusePattern(input: AbuseEnforcementInput): AbuseEnforcementReasonCode {
  if (input.actorScopeValid === false) return "invalid_actor_scope";
  if (input.missingIdempotencyKey === true) return "missing_idempotency_key";
  if (input.duplicateMutationAttempt === true) return "duplicate_mutation_attempt";
  if (
    typeof input.payloadBytes === "number" &&
    typeof input.payloadMaxBytes === "number" &&
    input.payloadBytes > input.payloadMaxBytes
  ) {
    return "payload_too_large";
  }
  if (
    typeof input.fanoutCount === "number" &&
    typeof input.fanoutMax === "number" &&
    input.fanoutCount > input.fanoutMax
  ) {
    return "suspicious_fanout";
  }
  if (input.rateLimitState === "hard_limited") return "too_many_requests";
  if (input.rateLimitState === "soft_limited") return "burst_exceeded";
  return "disabled";
}

export function buildAbuseEnforcementDecision(input: AbuseEnforcementInput): AbuseEnforcementDecision {
  const reasonCode = classifyAbusePattern(input);
  return {
    action: "observe",
    reasonCode,
    safeMessage: redactBffText(REASON_MESSAGES[reasonCode]),
    enforcementEnabled: false,
    realUsersBlocked: false,
    rawPayloadLogged: false,
    piiLogged: false,
    observability: ABUSE_OBSERVABILITY_METADATA,
  };
}

export function validateAbuseEnforcementDecision(decision: AbuseEnforcementDecision): boolean {
  return (
    decision.action === "observe" &&
    ABUSE_ENFORCEMENT_REASON_CODES.includes(decision.reasonCode) &&
    decision.safeMessage.length > 0 &&
    decision.safeMessage === redactBffText(decision.safeMessage) &&
    decision.enforcementEnabled === false &&
    decision.realUsersBlocked === false &&
    decision.rawPayloadLogged === false &&
    decision.piiLogged === false &&
    decision.observability.externalExportEnabledByDefault === false
  );
}
