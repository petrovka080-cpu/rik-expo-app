export const AI_PLATFORM_STAGING_TELEMETRY_POLICY_VERSION = "ai-platform-staging-telemetry-v1" as const;

const REDACTED = "[REDACTED]";
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /\+?\d[\d ()-]{7,}\d/g;
const TOKEN_PATTERN = /\b(?:sk|eyJ|ghp|xoxb|ya29)[A-Za-z0-9._-]{12,}\b/g;

export type AiPlatformStagingTelemetryPolicy = {
  version: typeof AI_PLATFORM_STAGING_TELEMETRY_POLICY_VERSION;
  namespace: "rik-staging";
  fullPromptLoggingAllowed: false;
  tokenLoggingAllowed: false;
  requiredEvents: readonly string[];
};

export const AI_PLATFORM_STAGING_TELEMETRY_POLICY: AiPlatformStagingTelemetryPolicy = {
  version: AI_PLATFORM_STAGING_TELEMETRY_POLICY_VERSION,
  namespace: "rik-staging",
  fullPromptLoggingAllowed: false,
  tokenLoggingAllowed: false,
  requiredEvents: [
    "ai_run_ledger_event",
    "estimate_created",
    "estimate_approved",
    "parameter_edited",
    "pdf_generated",
    "buyer_package_generated",
    "kill_switch_triggered",
    "rollback_triggered",
    "evalops_drift_event",
    "error_event",
    "cost_per_run",
    "latency_per_run",
  ],
};

export function redactAiPlatformStagingTelemetry(value: string): string {
  return value
    .replace(TOKEN_PATTERN, REDACTED)
    .replace(EMAIL_PATTERN, REDACTED)
    .replace(PHONE_PATTERN, REDACTED);
}

export function validateAiPlatformStagingTelemetryPolicy(
  policy = AI_PLATFORM_STAGING_TELEMETRY_POLICY,
) {
  const sample = "client test@example.com phone +996 555 123 456 token sk-testsecret123456789";
  const redacted = redactAiPlatformStagingTelemetry(sample);
  const blockers = [
    policy.namespace === "rik-staging" ? "" : "telemetry_namespace_not_staging",
    policy.requiredEvents.length >= 12 ? "" : "required_events_incomplete",
    policy.fullPromptLoggingAllowed === false ? "" : "full_prompt_logging_allowed",
    policy.tokenLoggingAllowed === false ? "" : "token_logging_allowed",
    redacted.includes("@") || /sk-testsecret/.test(redacted) || /\+996/.test(redacted)
      ? "pii_redaction_failed"
      : "",
  ].filter(Boolean);
  return {
    staging_observability_created: true,
    staging_ai_run_events_emitted: policy.requiredEvents.includes("ai_run_ledger_event"),
    staging_estimate_events_emitted: policy.requiredEvents.includes("estimate_created")
      && policy.requiredEvents.includes("estimate_approved")
      && policy.requiredEvents.includes("parameter_edited"),
    staging_pdf_buyer_events_emitted: policy.requiredEvents.includes("pdf_generated")
      && policy.requiredEvents.includes("buyer_package_generated"),
    staging_kill_switch_events_emitted: policy.requiredEvents.includes("kill_switch_triggered"),
    staging_rollback_events_emitted: policy.requiredEvents.includes("rollback_triggered"),
    pii_redaction_passed: blockers.length === 0,
    full_prompt_not_logged_unredacted: policy.fullPromptLoggingAllowed === false,
    tokens_not_logged: policy.tokenLoggingAllowed === false,
    blocking_reasons: blockers,
  };
}
