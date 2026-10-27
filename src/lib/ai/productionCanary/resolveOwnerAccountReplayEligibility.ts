import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { safeJsonParseValue } from "../../format";
import type {
  AiEstimateOwnerAccountReplayEligibility,
  AiEstimateOwnerAccountReplayIdentity,
  AiEstimateOwnerAccountReplayIdentityRedacted,
  AiEstimateOwnerAccountReplayPolicy,
} from "./ownerAccountReplayTypes";
import {
  AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_DEFAULT_POLICY,
  validateOwnerAccountReplayPolicy,
} from "./validateOwnerAccountReplayPolicy";

const OWNER_CONFIG_PATHS = [
  "config/ai-estimate-owner-account-replay.json",
  "docs/release/ai-estimate-owner-account-replay.json",
];

function clean(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function hashOwnerAccountReplayValue(value: string): string {
  const hash = crypto.createHash("sha256");
  hash.write(value);
  hash.end();
  return `sha256:${hash.digest("hex")}`;
}

function hashOptional(value: string | null | undefined): string | undefined {
  return value ? hashOwnerAccountReplayValue(value) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readJson(relativePath: string): Record<string, unknown> | null {
  const absolutePath = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  const parsed = safeJsonParseValue<unknown>(
    fs.readFileSync(absolutePath, "utf8").replace(/^\uFEFF/, ""),
    null,
  );
  return isRecord(parsed) ? parsed : null;
}

function identityFromRecord(
  source: AiEstimateOwnerAccountReplayIdentity["source"],
  record: Record<string, unknown>,
): AiEstimateOwnerAccountReplayIdentity {
  const rawEmail = clean(record.ownerEmail) ?? clean(record.owner_email) ?? clean(process.env.AI_ESTIMATE_OWNER_EMAIL);
  return {
    source,
    ownerUserId: clean(record.ownerUserId) ?? clean(record.owner_user_id),
    ownerAccountId: clean(record.ownerAccountId) ?? clean(record.owner_account_id),
    ownerOrganizationId: clean(record.ownerOrganizationId) ?? clean(record.owner_organization_id),
    authenticatedSessionUserId: clean(record.authenticatedSessionUserId) ?? clean(record.authenticated_session_user_id),
    testOwnerEmailHash: clean(record.testOwnerEmailHash) ?? clean(record.test_owner_email_hash) ?? (rawEmail ? hashOwnerAccountReplayValue(rawEmail) : null),
  };
}

export function resolveOwnerAccountReplayIdentity(): AiEstimateOwnerAccountReplayIdentity {
  const envIdentity = identityFromRecord("env", {
    ownerUserId: process.env.AI_ESTIMATE_OWNER_ACCOUNT_USER_ID ?? process.env.OWNER_USER_ID,
    ownerAccountId: process.env.AI_ESTIMATE_OWNER_ACCOUNT_ID ?? process.env.OWNER_ACCOUNT_ID,
    ownerOrganizationId: process.env.AI_ESTIMATE_OWNER_ORGANIZATION_ID ?? process.env.OWNER_ORGANIZATION_ID,
    authenticatedSessionUserId: process.env.AI_ESTIMATE_AUTHENTICATED_SESSION_USER_ID,
    testOwnerEmailHash: process.env.AI_ESTIMATE_OWNER_EMAIL_HASH,
  });
  if (ownerAccountIdentityPresent(envIdentity)) return envIdentity;

  for (const relativePath of OWNER_CONFIG_PATHS) {
    const record = readJson(relativePath);
    if (!record) continue;
    const identity = identityFromRecord("repo_config", record);
    if (ownerAccountIdentityPresent(identity)) return identity;
  }

  return { source: "missing" };
}

export function ownerAccountIdentityPresent(identity: AiEstimateOwnerAccountReplayIdentity): boolean {
  return Boolean(
    identity.ownerUserId ||
    identity.ownerAccountId ||
    identity.ownerOrganizationId ||
    identity.authenticatedSessionUserId ||
    identity.testOwnerEmailHash,
  );
}

export function ownerAccountSessionPresent(identity: AiEstimateOwnerAccountReplayIdentity): boolean {
  return Boolean(
    identity.authenticatedSessionUserId ||
    process.env.AI_ESTIMATE_OWNER_ACCOUNT_SESSION_AVAILABLE === "1" ||
    process.env.AI_ESTIMATE_OWNER_ACCOUNT_SESSION_AVAILABLE === "true",
  );
}

export function redactOwnerAccountReplayIdentity(
  identity: AiEstimateOwnerAccountReplayIdentity,
): AiEstimateOwnerAccountReplayIdentityRedacted {
  return {
    source: identity.source,
    owner_account_identity_present: ownerAccountIdentityPresent(identity),
    owner_account_session_present: ownerAccountSessionPresent(identity),
    owner_account_identity_redacted: true,
    owner_user_id_hash: hashOptional(identity.ownerUserId ?? undefined),
    owner_account_id_hash: hashOptional(identity.ownerAccountId ?? undefined),
    owner_organization_id_hash: hashOptional(identity.ownerOrganizationId ?? undefined),
    authenticated_session_user_id_hash: hashOptional(identity.authenticatedSessionUserId ?? undefined),
    test_owner_email_hash: identity.testOwnerEmailHash ?? undefined,
    raw_email_stored: false,
    raw_phone_stored: false,
    fake_green_claimed: false,
  };
}

export function resolveOwnerAccountReplayEligibility(params: {
  identity?: AiEstimateOwnerAccountReplayIdentity;
  policy?: AiEstimateOwnerAccountReplayPolicy;
  requireAuthenticatedSession?: boolean;
} = {}): AiEstimateOwnerAccountReplayEligibility {
  const identity = params.identity ?? resolveOwnerAccountReplayIdentity();
  const policy = params.policy ?? AI_ESTIMATE_OWNER_ACCOUNT_REPLAY_DEFAULT_POLICY;
  const validation = validateOwnerAccountReplayPolicy(policy);
  if (!validation.valid) {
    return {
      owner_account_live_replay_allowed: false,
      status: "blocked_owner_account_policy_invalid",
      reason: validation.issues.join(";"),
      real_external_user_traffic_proven: false,
      public_beta_enabled: false,
      production_rollout_enabled: false,
    };
  }
  if (!ownerAccountIdentityPresent(identity)) {
    return {
      owner_account_live_replay_allowed: false,
      status: "blocked_owner_account_id_missing",
      reason: "BLOCKED_OWNER_ACCOUNT_ID_MISSING",
      real_external_user_traffic_proven: false,
      public_beta_enabled: false,
      production_rollout_enabled: false,
    };
  }
  if (params.requireAuthenticatedSession && !ownerAccountSessionPresent(identity)) {
    return {
      owner_account_live_replay_allowed: false,
      status: "blocked_owner_account_session_not_available",
      reason: "BLOCKED_OWNER_ACCOUNT_SESSION_NOT_AVAILABLE",
      real_external_user_traffic_proven: false,
      public_beta_enabled: false,
      production_rollout_enabled: false,
    };
  }
  return {
    owner_account_live_replay_allowed: true,
    status: "owner_account_live_replay_allowed",
    reason: "OWNER_ACCOUNT_LIVE_REPLAY_ALLOWED",
    real_external_user_traffic_proven: false,
    public_beta_enabled: false,
    production_rollout_enabled: false,
  };
}
