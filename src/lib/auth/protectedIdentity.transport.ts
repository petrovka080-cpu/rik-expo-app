import type { User } from "@supabase/supabase-js";

import { callEnsureMyProfileRpc, callGetMyRoleRpc } from "../api/profile.transport";
import {
  getSessionSafe,
  supabase,
  supabaseClientAvailability,
} from "../supabaseClient";
import {
  classifyProtectedIdentity,
  readableUnknownError,
  type ProtectedIdentityFailureStatus,
  type ProtectedIdentityResolution,
} from "./protectedIdentity";

type MembershipRow = { company_id?: unknown; role?: unknown };

const text = (value: unknown): string | null => {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
};

function invalidSessionStatus(
  error: unknown,
  expiresAtSeconds: number | undefined,
): ProtectedIdentityFailureStatus {
  const message = readableUnknownError(error)?.toLowerCase() ?? "";
  if (message.includes("revok") || message.includes("refresh_token_not_found")) {
    return "revoked_session";
  }
  if (
    message.includes("expir") ||
    (typeof expiresAtSeconds === "number" && expiresAtSeconds * 1_000 <= Date.now())
  ) {
    return "expired_session";
  }
  return "invalid_session";
}

function metadata(user: User): {
  organizationId: string | null;
  membershipId: string | null;
  role: string | null;
} {
  const appMetadata = user.app_metadata ?? {};
  return {
    organizationId: text(appMetadata.tenant_id ?? appMetadata.organization_id),
    membershipId: text(appMetadata.membership_id),
    role: text(appMetadata.role)?.toLowerCase() ?? null,
  };
}

function rpcFailureStatus(
  error: unknown,
  claims: ReturnType<typeof metadata>,
): ProtectedIdentityFailureStatus {
  const message = readableUnknownError(error)?.toLowerCase() ?? "";
  if (!claims.organizationId) return "missing_organization";
  if (!claims.membershipId || message.includes("membership")) {
    return "missing_membership";
  }
  if (!claims.role || message.includes("role")) return "missing_role";
  if (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("abort")
  ) {
    return "provider_unavailable";
  }
  return "missing_profile";
}

async function loadLegacyMembership(userId: string): Promise<{
  organizationId: string | null;
  membershipId: string | null;
  role: string | null;
  error: unknown | null;
}> {
  const result = await supabase
    .from("company_members")
    .select("company_id,role")
    .eq("user_id", userId)
    .limit(2);
  if (result.error) {
    return { organizationId: null, membershipId: null, role: null, error: result.error };
  }
  const row = (Array.isArray(result.data) ? result.data[0] : null) as MembershipRow | null;
  const organizationId = text(row?.company_id);
  const role = text(row?.role)?.toLowerCase() ?? null;
  return {
    organizationId,
    membershipId: organizationId && role ? `company:${organizationId}:${role}` : null,
    role,
    error: null,
  };
}

export async function loadProtectedIdentity(
  targetOrganizationId?: string | null,
): Promise<ProtectedIdentityResolution> {
  if (supabaseClientAvailability.status === "unavailable") {
    return {
      status: "configuration_unavailable",
      reason: supabaseClientAvailability.reason,
      diagnostic: supabaseClientAvailability.diagnostic,
    };
  }

  const sessionResult = await getSessionSafe({ caller: "protected_identity_boundary" });
  const session = sessionResult.session;
  if (!session?.user) {
    return { status: sessionResult.degraded ? "provider_unavailable" : "no_session" };
  }

  const verifiedUserResult = await supabase.auth.getUser();
  if (verifiedUserResult.error || !verifiedUserResult.data.user) {
    return {
      status: invalidSessionStatus(verifiedUserResult.error, session.expires_at),
    };
  }
  const user = verifiedUserResult.data.user;
  const claims = metadata(user);

  const ensured = await callEnsureMyProfileRpc();
  if (ensured.error) return { status: rpcFailureStatus(ensured.error, claims) };

  const roleResult = await callGetMyRoleRpc();
  if (roleResult.error) return { status: rpcFailureStatus(roleResult.error, claims) };
  const resolvedRole = text(roleResult.data)?.toLowerCase() ?? null;
  if (!resolvedRole) return { status: "missing_role" };

  if (claims.organizationId && claims.membershipId) {
    return classifyProtectedIdentity({
      session: "valid",
      profileReady: true,
      userId: user.id,
      email: user.email ?? null,
      organizationId: claims.organizationId,
      membershipId: claims.membershipId,
      claimedRole: claims.role,
      resolvedRole,
      source: "provider_verified_claims",
      targetOrganizationId,
    });
  }

  const membership = await loadLegacyMembership(user.id);
  if (membership.error) return { status: "provider_unavailable" };
  return classifyProtectedIdentity({
    session: "valid",
    profileReady: true,
    userId: user.id,
    email: user.email ?? null,
    organizationId: membership.organizationId,
    membershipId: membership.membershipId,
    claimedRole: membership.role,
    resolvedRole,
    source: "verified_company_membership",
    targetOrganizationId,
  });
}
