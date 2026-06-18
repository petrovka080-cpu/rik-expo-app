import {
  buildOfficeRuntimeContext,
  canUseOfficeRoute,
  resolveOfficeRuntimeRoleFromSources,
} from "../../src/lib/officeRuntime/officeRuntimePolicy";

describe("office role guards", () => {
  it("allows only the matching office role or admin on each guarded route", () => {
    const foreman = buildOfficeRuntimeContext({ userId: "u1", role: "foreman" });
    const director = buildOfficeRuntimeContext({ userId: "u2", role: "director" });
    const buyer = buildOfficeRuntimeContext({ userId: "u3", role: "buyer" });
    const admin = buildOfficeRuntimeContext({ userId: "u4", role: "admin" });

    expect(canUseOfficeRoute({ context: foreman, requiredRole: "foreman" })).toBe(true);
    expect(canUseOfficeRoute({ context: director, requiredRole: "director" })).toBe(true);
    expect(canUseOfficeRoute({ context: buyer, requiredRole: "buyer" })).toBe(true);
    expect(canUseOfficeRoute({ context: admin, requiredRole: "director" })).toBe(true);

    expect(canUseOfficeRoute({ context: foreman, requiredRole: "director" })).toBe(false);
    expect(canUseOfficeRoute({ context: buyer, requiredRole: "director" })).toBe(false);
    expect(canUseOfficeRoute({ context: director, requiredRole: "buyer" })).toBe(false);
  });

  it("uses server-backed developer override to unlock allowed office routes", () => {
    expect(
      resolveOfficeRuntimeRoleFromSources({
        requiredRole: "director",
        sessionRole: "buyer",
        developerOverride: {
          actorUserId: "developer",
          isEnabled: true,
          isActive: true,
          allowedRoles: ["director", "buyer", "foreman"],
          activeEffectiveRole: "director",
          canAccessAllOfficeRoutes: true,
          canImpersonateForMutations: false,
          expiresAt: null,
          reason: "test",
        },
      }),
    ).toBe("director");

    expect(
      resolveOfficeRuntimeRoleFromSources({
        requiredRole: "director",
        sessionRole: "buyer",
        developerOverride: {
          actorUserId: "developer",
          isEnabled: true,
          isActive: true,
          allowedRoles: ["director", "buyer", "foreman"],
          activeEffectiveRole: "buyer",
          canAccessAllOfficeRoutes: true,
          canImpersonateForMutations: false,
          expiresAt: null,
          reason: "test",
        },
      }),
    ).toBe("director");

    expect(
      resolveOfficeRuntimeRoleFromSources({
        requiredRole: "director",
        sessionRole: "buyer",
        developerOverride: {
          actorUserId: "developer",
          isEnabled: true,
          isActive: false,
          allowedRoles: ["director", "buyer", "foreman"],
          activeEffectiveRole: null,
          canAccessAllOfficeRoutes: true,
          canImpersonateForMutations: false,
          expiresAt: "2026-01-01T00:00:00.000Z",
          reason: "expired",
        },
      }),
    ).toBe("buyer");
  });
});
