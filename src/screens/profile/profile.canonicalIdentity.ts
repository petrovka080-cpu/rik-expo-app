import type { ProtectedIdentity } from "../../lib/auth/protectedIdentity";
import type { ProfileScreenLoadResult } from "./profile.types";
import { loadProfileScreenData } from "./profile.services";

export function buildProviderVerifiedProfileScreenData(
  identity: ProtectedIdentity,
): ProfileScreenLoadResult {
  return {
    profile: {
      id: "",
      user_id: identity.userId,
      full_name: identity.email ?? "\u041f\u0440\u043e\u0444\u0438\u043b\u044c GOX",
      phone: null,
      city: null,
      usage_market: true,
      usage_build: false,
      bio: null,
      telegram: null,
      whatsapp: null,
      position: null,
    },
    company: null,
    profileRole: identity.role,
    profileEmail: identity.email,
    profileAvatarUrl: null,
    accessSourceSnapshot: {
      userId: identity.userId,
      authRole: identity.role,
      resolvedRole: identity.role,
      usageMarket: true,
      usageBuild: false,
      ownedCompanyId: null,
      companyMemberships: [
        {
          companyId: identity.organizationId,
          role: identity.role,
        },
      ],
      listingsCount: 0,
    },
  };
}

export async function loadProfileScreenDataForIdentity(
  identity: ProtectedIdentity,
): Promise<ProfileScreenLoadResult> {
  return identity.source === "provider_verified_claims"
    ? buildProviderVerifiedProfileScreenData(identity)
    : loadProfileScreenData();
}
