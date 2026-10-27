export const AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_WAVE =
  "S_AI_ESTIMATE_OWNER_ACCOUNT_LIVE_USAGE_REPLAY_POINT_OF_NO_RETURN";

export const AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_GREEN_STATUS =
  "GREEN_AI_ESTIMATE_OWNER_ACCOUNT_LIVE_REPLAY_READY";

export const AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_ARTIFACT_DIR =
  "artifacts/S_AI_ESTIMATE_OWNER_ACCOUNT_LIVE_REPLAY";

export const AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_RELEASE_GUARD =
  "ai-estimate-owner-account-live-replay-proof";

export type AiEstimateOwnerAccountReplayIdentitySource =
  | "missing"
  | "env"
  | "repo_config";

export type AiEstimateOwnerAccountReplayIdentity = {
  source: AiEstimateOwnerAccountReplayIdentitySource;
  ownerUserId?: string | null;
  ownerAccountId?: string | null;
  ownerOrganizationId?: string | null;
  authenticatedSessionUserId?: string | null;
  testOwnerEmailHash?: string | null;
};

export type AiEstimateOwnerAccountReplayIdentityRedacted = {
  source: AiEstimateOwnerAccountReplayIdentitySource;
  owner_account_identity_present: boolean;
  owner_account_session_present: boolean;
  owner_account_identity_redacted: true;
  owner_user_id_hash?: string;
  owner_account_id_hash?: string;
  owner_organization_id_hash?: string;
  authenticated_session_user_id_hash?: string;
  test_owner_email_hash?: string;
  raw_email_stored: false;
  raw_phone_stored: false;
  fake_green_claimed: false;
};

export type AiEstimateOwnerAccountReplayPolicy = {
  owner_account_replay_enabled: boolean;
  owner_account_only: boolean;
  public_beta_enabled: boolean;
  production_rollout_enabled: boolean;
  external_users_included: boolean;
  regulated_high_risk_public_beta_enabled: boolean;
  kill_switch_required: boolean;
  rollback_required: boolean;
  telemetry_required: boolean;
  feedback_required: boolean;
};

export type AiEstimateOwnerAccountReplayEligibility = {
  owner_account_live_replay_allowed: boolean;
  status:
    | "owner_account_live_replay_allowed"
    | "blocked_owner_account_id_missing"
    | "blocked_owner_account_session_not_available"
    | "blocked_owner_account_policy_invalid";
  reason: string;
  real_external_user_traffic_proven: false;
  public_beta_enabled: false;
  production_rollout_enabled: false;
};

export type AiEstimateOwnerAccountReplayFailureClassification =
  | "OWNER_ACCOUNT_LIVE_REPLAY_OK"
  | "BLOCKED_OWNER_ACCOUNT_ID_MISSING"
  | "BLOCKED_OWNER_ACCOUNT_SESSION_NOT_AVAILABLE"
  | "BLOCKED_WEB_OWNER_REPLAY_FAILED"
  | "BLOCKED_ANDROID_API34_OWNER_REPLAY_FAILED"
  | "BLOCKED_PDF_EXTRACTION_FAILED"
  | "BLOCKED_TELEMETRY_PRIVACY_FAILED"
  | "BLOCKED_KILL_SWITCH_FAILED"
  | "UNKNOWN_NEEDS_TRACE";

