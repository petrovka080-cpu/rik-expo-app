import {
  classifyProtectedIdentity,
  readableUnknownError,
  type ProtectedIdentityFacts,
} from "./protectedIdentity";

const readyFacts = (overrides: Partial<ProtectedIdentityFacts> = {}): ProtectedIdentityFacts => ({
  session: "valid",
  profileReady: true,
  userId: "11111111-1111-4111-8111-111111111111",
  email: "user@example.invalid",
  organizationId: "22222222-2222-4222-8222-222222222222",
  membershipId: "33333333-3333-4333-8333-333333333333",
  claimedRole: "engineer",
  resolvedRole: "engineer",
  source: "provider_verified_claims",
  ...overrides,
});

describe("protected identity fail-closed matrix", () => {
  it.each([
    ["missing session", { session: "missing" }, "no_session"],
    ["expired session", { session: "expired" }, "expired_session"],
    ["revoked session", { session: "revoked" }, "revoked_session"],
    ["missing profile", { profileReady: false }, "missing_profile"],
    ["missing membership", { membershipId: null }, "missing_membership"],
    ["missing role", { claimedRole: null, resolvedRole: null }, "missing_role"],
    [
      "cross tenant",
      { targetOrganizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
      "cross_tenant",
    ],
  ] as const)("denies %s", (_label, overrides, expected) => {
    expect(classifyProtectedIdentity(readyFacts(overrides))).toEqual({ status: expected });
  });

  it("accepts only the complete provider-verified identity", () => {
    expect(classifyProtectedIdentity(readyFacts())).toEqual({
      status: "ready",
      identity: {
        userId: "11111111-1111-4111-8111-111111111111",
        email: "user@example.invalid",
        organizationId: "22222222-2222-4222-8222-222222222222",
        membershipId: "33333333-3333-4333-8333-333333333333",
        role: "engineer",
        profileEnsured: true,
        source: "provider_verified_claims",
      },
    });
  });

  it("never stringifies an opaque error object into customer text", () => {
    expect(readableUnknownError({ message: "membership missing" })).toBe("membership missing");
    expect(readableUnknownError({ opaque: true })).toBeNull();
  });
});
