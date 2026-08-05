import fs from "node:fs";
import path from "node:path";

import {
  isServerAuthorizedPlatformDeveloper,
  normalizeDeveloperOverrideContext,
  resolveLocalDeveloperOverrideContext,
} from "../../src/lib/developerOverride";
import {
  ORDINARY_ROLE_NEGATIVE_ACCESS_MATRIX,
  PLATFORM_DEVELOPER_ACCESS_MATRIX,
  PLATFORM_DEVELOPER_ADMIN_ROUTES,
  PLATFORM_DEVELOPER_ENTITLEMENT_NAME,
  PLATFORM_DEVELOPER_OFFICE_ROUTES,
} from "../../src/lib/platformDeveloper/platformDeveloperAccessMatrix";
import {
  buildOfficeRuntimeContext,
  canUseOfficeRoute,
} from "../../src/lib/officeRuntime/officeRuntimePolicy";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260728100000_platform_developer_entitlement_v1.sql",
);

describe("platform_developer server entitlement", () => {
  it("is protected-table authorized, authenticated, effective-role audited, and identity agnostic", () => {
    const sql = fs.readFileSync(migrationPath, "utf8");

    expect(PLATFORM_DEVELOPER_ENTITLEMENT_NAME).toBe("platform_developer");
    expect(sql).toContain("entitlement = 'platform_developer'");
    expect(sql).toContain("auth.uid() is not null");
    expect(sql).toContain("platform_developer_entitled_v1");
    expect(sql).toContain("'actor_role', 'platform_developer'");
    expect(sql).toContain("'effective_role', v_override_role");
    expect(sql).toContain("developer_override_rpc_action");
    expect(sql).toContain("revoke insert, update, delete, truncate");
    expect(sql).toContain(
      "Legacy identity-bound developer seed revoked by platform entitlement migration",
    );
    expect(sql).toContain(
      "where reason like 'H1.8 developer verification break-glass for %'",
    );
    expect(sql).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i);
    expect(sql).not.toMatch(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
    );
    expect(sql).not.toContain("service_role key");
  });

  it("does not promote a client flag or forged ordinary context", () => {
    const local = resolveLocalDeveloperOverrideContext({
      envValue: "1",
      host: "localhost",
      isDev: true,
      platformOS: "web",
      storageValue: null,
      webdriver: false,
    });
    expect(local?.authorizationSource).toBe("local_ui_only");
    expect(isServerAuthorizedPlatformDeveloper(local)).toBe(false);

    const forged = normalizeDeveloperOverrideContext({
      actorUserId: null,
      actorRole: "platform_developer",
      entitlement: "platform_developer",
      authorizationSource: "server_entitlement",
      isEnabled: true,
      isActive: true,
      allowedRoles: ["director"],
      activeEffectiveRole: "director",
      canAccessAllOfficeRoutes: true,
      canImpersonateForMutations: true,
    });
    expect(isServerAuthorizedPlatformDeveloper(forged)).toBe(false);
  });

  it("covers every declared role and administration route with real modules", () => {
    expect(PLATFORM_DEVELOPER_OFFICE_ROUTES.map((entry) => entry.effectiveRole)).toEqual([
      "foreman",
      "director",
      "buyer",
      "warehouse",
      "accountant",
      "contractor",
      "security",
    ]);
    expect(PLATFORM_DEVELOPER_ADMIN_ROUTES).toHaveLength(11);
    expect(PLATFORM_DEVELOPER_ACCESS_MATRIX.length).toBe(
      PLATFORM_DEVELOPER_OFFICE_ROUTES.length +
        PLATFORM_DEVELOPER_ADMIN_ROUTES.length +
        5,
    );
    for (const entry of PLATFORM_DEVELOPER_ACCESS_MATRIX) {
      expect(
        fs.existsSync(path.resolve(process.cwd(), entry.routeModule)),
      ).toBe(true);
    }
    expect(
      fs.readFileSync(path.resolve(process.cwd(), "app/admin/_layout.tsx"), "utf8"),
    ).toContain("PlatformDeveloperRouteGate");
  });

  it("preserves ordinary-role negative isolation", () => {
    for (const entry of ORDINARY_ROLE_NEGATIVE_ACCESS_MATRIX) {
      const context = buildOfficeRuntimeContext({
        userId: `ordinary-${entry.actorRole}`,
        role: entry.actorRole,
      });
      expect(
        canUseOfficeRoute({
          context,
          requiredRole: entry.forbiddenEffectiveRole,
        }),
      ).toBe(false);
    }
  });
});
