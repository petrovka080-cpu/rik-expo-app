import type { ProtectedIdentity } from "../../lib/auth/protectedIdentity";
import { buildProviderVerifiedProfileScreenData } from "./profile.canonicalIdentity";

const identity: ProtectedIdentity = {
  userId: "11111111-1111-4111-8111-111111111111",
  email: "user@example.invalid",
  organizationId: "22222222-2222-4222-8222-222222222222",
  membershipId: "33333333-3333-4333-8333-333333333333",
  role: "ordinary_user",
  profileEnsured: true,
  source: "provider_verified_claims",
};

describe("provider-verified profile projection", () => {
  it("uses only canonical verified identity facts", () => {
    expect(buildProviderVerifiedProfileScreenData(identity)).toMatchObject({
      profile: {
        user_id: identity.userId,
        full_name: identity.email,
      },
      company: null,
      profileRole: identity.role,
      profileEmail: identity.email,
      accessSourceSnapshot: {
        userId: identity.userId,
        authRole: identity.role,
        resolvedRole: identity.role,
        ownedCompanyId: null,
        companyMemberships: [
          {
            companyId: identity.organizationId,
            role: identity.role,
          },
        ],
        listingsCount: 0,
      },
    });
  });

  it("does not invent a legacy company owner or editable profile row", () => {
    const result = buildProviderVerifiedProfileScreenData(identity);
    expect(result.profile.id).toBe("");
    expect(result.company).toBeNull();
  });
});
