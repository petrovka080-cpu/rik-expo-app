import {
  buildOfficeRuntimeContext,
  canUseOfficeRoute,
  resolveOfficeRuntimeRoleFromSources,
} from "../../src/lib/officeRuntime/officeRuntimePolicy";
import {
  OFFICE_ACCESS_ROLES,
  OFFICE_ACCESS_ROUTE_MANIFEST,
  OFFICE_ACCESS_ROUTE_ROLES,
  OFFICE_DEVELOPER_FULL_ACCESS_MANIFEST,
} from "../../src/lib/officeRuntime/officeRuntimePolicy";

describe("office role guards", () => {
  it("keeps route-role access centralized in the office access manifest", () => {
    expect(OFFICE_ACCESS_ROUTE_ROLES).toEqual([
      "foreman",
      "director",
      "buyer",
      "warehouse",
      "accountant",
      "contractor",
      "security",
    ]);
    for (const role of OFFICE_ACCESS_ROUTE_ROLES) {
      expect(OFFICE_ACCESS_ROUTE_MANIFEST[role]).toEqual(
        expect.objectContaining({
          role,
          route: expect.stringMatching(new RegExp(`/office/${role}$`)),
          screenId: `office.${role}`,
        }),
      );
    }
    expect(OFFICE_DEVELOPER_FULL_ACCESS_MANIFEST).toEqual(
      expect.objectContaining({
        mode: "developer_control_full_access",
        canAccessAllOfficeRoutes: true,
        roles: OFFICE_ACCESS_ROLES,
        routeRoles: OFFICE_ACCESS_ROUTE_ROLES,
        roleIsolationClaimed: false,
        mutationImpersonationAllowed: false,
      }),
    );
  });

  it("allows only the matching office role or admin on each guarded route", () => {
    const routeRoles = OFFICE_ACCESS_ROUTE_ROLES;
    const contexts = Object.fromEntries(
      routeRoles.map((role, index) => [
        role,
        buildOfficeRuntimeContext({ userId: `u${index + 1}`, role }),
      ]),
    );
    const admin = buildOfficeRuntimeContext({ userId: "admin", role: "admin" });

    routeRoles.forEach((requiredRole) => {
      expect(
        canUseOfficeRoute({
          context: contexts[requiredRole],
          requiredRole,
        }),
      ).toBe(true);
      expect(canUseOfficeRoute({ context: admin, requiredRole })).toBe(true);
    });

    expect(canUseOfficeRoute({ context: contexts.foreman, requiredRole: "director" })).toBe(false);
    expect(canUseOfficeRoute({ context: contexts.buyer, requiredRole: "director" })).toBe(false);
    expect(canUseOfficeRoute({ context: contexts.director, requiredRole: "buyer" })).toBe(false);
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
          allowedRoles: [
            "director",
            "buyer",
            "foreman",
            "warehouse",
            "accountant",
            "contractor",
            "security",
            "engineer",
          ],
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
          isActive: false,
          allowedRoles: [
            "director",
            "buyer",
            "foreman",
            "warehouse",
            "accountant",
            "contractor",
            "security",
            "engineer",
          ],
          activeEffectiveRole: null,
          canAccessAllOfficeRoutes: true,
          canImpersonateForMutations: false,
          expiresAt: "2999-01-01T00:00:00.000Z",
          reason: "route-only developer access",
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
          allowedRoles: [
            "director",
            "buyer",
            "foreman",
            "warehouse",
            "accountant",
            "contractor",
            "security",
            "engineer",
          ],
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
          allowedRoles: [
            "director",
            "buyer",
            "foreman",
            "warehouse",
            "accountant",
            "contractor",
            "security",
            "engineer",
          ],
          activeEffectiveRole: null,
          canAccessAllOfficeRoutes: true,
          canImpersonateForMutations: false,
          expiresAt: "2026-01-01T00:00:00.000Z",
          reason: "expired",
        },
      }),
    ).toBe("buyer");

    expect(
      resolveOfficeRuntimeRoleFromSources({
        requiredRole: "warehouse",
        sessionRole: "foreman",
        developerOverride: {
          actorUserId: "developer",
          isEnabled: true,
          isActive: true,
          allowedRoles: [
            "director",
            "buyer",
            "foreman",
            "warehouse",
            "accountant",
            "contractor",
            "security",
            "engineer",
          ],
          activeEffectiveRole: "director",
          canAccessAllOfficeRoutes: true,
          canImpersonateForMutations: false,
          expiresAt: null,
          reason: "route-only developer access",
        },
      }),
    ).toBe("warehouse");
  });
});
