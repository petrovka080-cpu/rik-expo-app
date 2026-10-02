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

const serverDeveloperOverride = {
  actorUserId: "11111111-1111-4111-8111-111111111111",
  actorRole: "platform_developer" as const,
  entitlement: "platform_developer" as const,
  authorizationSource: "server_entitlement" as const,
  isEnabled: true,
  isActive: true,
  allowedRoles: ["director", "buyer", "accountant"],
  activeEffectiveRole: "buyer",
  canAccessAllOfficeRoutes: true,
  canImpersonateForMutations: true,
  expiresAt: null,
  reason: "local acceptance owner",
};

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

  it("accepts a server-authorized platform developer effective role", () => {
    expect(classifyProtectedIdentity(readyFacts({
      claimedRole: "platform_developer",
      resolvedRole: "buyer",
      developerOverride: serverDeveloperOverride,
    }))).toMatchObject({
      status: "ready",
      identity: { role: "buyer" },
    });
  });

  it("prefers the active server-authorized role over the legacy contractor resolver", () => {
    expect(classifyProtectedIdentity(readyFacts({
      claimedRole: "director",
      resolvedRole: "contractor",
      developerOverride: {
        ...serverDeveloperOverride,
        activeEffectiveRole: "director",
      },
    }))).toMatchObject({
      status: "ready",
      identity: { role: "director" },
    });
  });

  it.each([
    ["revoked", "revoked_session"],
    ["cross_tenant", "cross_tenant"],
  ] as const)("never overrides a denied %s principal", (resolvedRole, status) => {
    expect(classifyProtectedIdentity(readyFacts({
      claimedRole: "director",
      resolvedRole,
      developerOverride: {
        ...serverDeveloperOverride,
        activeEffectiveRole: "director",
      },
    }))).toEqual({ status });
  });

  it.each([
    ["different actor", { actorUserId: "99999999-9999-4999-8999-999999999999" }],
    ["inactive override", { isActive: false }],
    ["role outside allowlist", { allowedRoles: ["director", "accountant"] }],
    ["client-only source", { authorizationSource: "local_ui_only" as const }],
    ["disabled entitlement", { isEnabled: false }],
  ])("rejects a role mismatch for %s", (_label, override) => {
    expect(classifyProtectedIdentity(readyFacts({
      claimedRole: "platform_developer",
      resolvedRole: "buyer",
      developerOverride: { ...serverDeveloperOverride, ...override },
    }))).toEqual({ status: "identity_mismatch" });
  });

  it("never stringifies an opaque error object into customer text", () => {
    expect(readableUnknownError({ message: "membership missing" })).toBe("membership missing");
    expect(readableUnknownError({ opaque: true })).toBeNull();
  });
});
