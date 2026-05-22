export const ENTERPRISE_RELEASE_CANDIDATE_WAVE =
  "S_ENTERPRISE_PRODUCTION_RELEASE_CANDIDATE_CANARY_OBSERVABILITY_ROLLBACK_POINT_OF_NO_RETURN";

export const ENTERPRISE_RELEASE_CANDIDATE_GREEN_STATUS =
  "GREEN_ENTERPRISE_PRODUCTION_RELEASE_CANDIDATE_READY";

export const ENTERPRISE_RELEASE_CANDIDATE_FLAGS = [
  "GLOBAL_ESTIMATE_ENGINE_ENABLED",
  "GLOBAL_ESTIMATE_AI_TOOL_ENABLED",
  "AI_ESTIMATE_TO_PDF_ENABLED",
  "CONSUMER_SMETA_TAB_ENABLED",
  "CONSUMER_REPAIR_REQUEST_ENABLED",
  "CONSUMER_MARKETPLACE_SEND_ENABLED",
  "MARKETPLACE_ADD_PRODUCT_ENABLED",
  "PDF_VIEWER_ENABLED",
  "ROLE_AI_ENABLED",
  "DANGEROUS_WORK_SAFETY_ENABLED",
] as const;

export type EnterpriseReleaseCandidateFlag =
  (typeof ENTERPRISE_RELEASE_CANDIDATE_FLAGS)[number];

export type EnterpriseReleaseCandidateFlagPolicy = {
  flag: EnterpriseReleaseCandidateFlag;
  default: false;
  canary_supported: true;
  rollback_safe: true;
  internal_user_supported: true;
  role_scope_supported: true;
  environment_scope_supported: true;
};

export const ENTERPRISE_RELEASE_CANDIDATE_FLAG_MATRIX: Record<
  EnterpriseReleaseCandidateFlag,
  EnterpriseReleaseCandidateFlagPolicy
> = Object.fromEntries(
  ENTERPRISE_RELEASE_CANDIDATE_FLAGS.map((flag) => [
    flag,
    {
      flag,
      default: false,
      canary_supported: true,
      rollback_safe: true,
      internal_user_supported: true,
      role_scope_supported: true,
      environment_scope_supported: true,
    } satisfies EnterpriseReleaseCandidateFlagPolicy,
  ]),
) as Record<EnterpriseReleaseCandidateFlag, EnterpriseReleaseCandidateFlagPolicy>;

export const ENTERPRISE_RELEASE_CANDIDATE_OBSERVABILITY_EVENTS = [
  "app_started",
  "screen_opened",
  "bottom_nav_tapped",
  "estimate_requested",
  "estimate_backend_called",
  "estimate_backend_succeeded",
  "estimate_backend_failed",
  "estimate_pdf_requested",
  "estimate_pdf_generated",
  "estimate_pdf_opened",
  "consumer_draft_created",
  "consumer_request_approved",
  "marketplace_send_validated",
  "marketplace_send_blocked",
  "marketplace_send_succeeded",
  "dangerous_work_guard_triggered",
  "edge_function_error",
  "pdf_open_error",
  "storage_signed_url_error",
] as const;

export const ENTERPRISE_RELEASE_CANDIDATE_METRICS = [
  "screen_open_success_rate",
  "estimate_backend_p95_ms",
  "estimate_backend_error_rate",
  "ai_tool_call_success_rate",
  "pdf_generation_p95_ms",
  "pdf_open_success_rate",
  "marketplace_publish_success_rate",
  "marketplace_validation_block_rate",
  "bottom_nav_tap_success_rate",
  "web_console_fatal_count",
  "android_logcat_fatal_count",
  "anr_count",
  "release_verify_duration_ms",
] as const;

export const ENTERPRISE_RELEASE_CANDIDATE_REDACTION_FORBIDDEN_KEYS = [
  "privileged_db_secret",
  "database_connection_url",
  "password",
  "raw_provider_payload",
  "full_contact_phone",
  "private_storage_object_key",
  "signed_url_token",
  "private_document_content",
  "raw_personal_ai_prompt",
] as const;

export const ENTERPRISE_RELEASE_CANDIDATE_CANARY_PHASES = [
  { phase: "internal", percentage: 0, audience: "internal_user_only" },
  { phase: "phase_1", percentage: 5, audience: "eligible_users" },
  { phase: "phase_2", percentage: 25, audience: "eligible_users" },
  { phase: "phase_3", percentage: 100, audience: "eligible_users_after_metrics_green" },
] as const;

export const ENTERPRISE_RELEASE_CANDIDATE_ROLLBACK_STEPS = [
  "Disable AI_ESTIMATE_TO_PDF_ENABLED",
  "Disable GLOBAL_ESTIMATE_AI_TOOL_ENABLED",
  "Disable GLOBAL_ESTIMATE_ENGINE_ENABLED",
  "Disable CONSUMER_MARKETPLACE_SEND_ENABLED",
  "Keep existing PDFs/history readable",
  "Keep old marketplace and Office flows working",
  "Roll back compatible OTA update when applicable",
  "Roll back Edge Function version when needed",
  "Do not delete estimate snapshots",
  "Do not drop migrations",
] as const;

export function isEnterpriseReleaseCandidateFlag(value: string): value is EnterpriseReleaseCandidateFlag {
  return ENTERPRISE_RELEASE_CANDIDATE_FLAGS.includes(value as EnterpriseReleaseCandidateFlag);
}
