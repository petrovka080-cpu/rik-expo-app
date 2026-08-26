import { readFileSync } from "fs";
import { join } from "path";

import {
  normalizeDeveloperOverrideContext,
  DEVELOPER_OVERRIDE_ROLES,
  LOCAL_DEVELOPER_FULL_ACCESS_STORAGE_KEY,
  isLocalDeveloperFullAccessAllowed,
  isServerAuthorizedPlatformDeveloper,
  resolveLocalDeveloperOverrideContext,
} from "./developerOverride";

describe("developerOverride", () => {
  it("rejects legacy override payloads without an explicit server entitlement", () => {
    const legacy = normalizeDeveloperOverrideContext({
      actorUserId: "user-1",
      isEnabled: true,
      isActive: true,
      allowedRoles: ["Buyer", "director", "", null],
      activeEffectiveRole: "BUYER",
      canAccessAllOfficeRoutes: true,
      canImpersonateForMutations: true,
      expiresAt: "2026-05-16T00:00:00Z",
      reason: "runtime verification",
    });
    expect(legacy).toEqual({
      actorUserId: "user-1",
      actorRole: null,
      entitlement: null,
      authorizationSource: "none",
      isEnabled: true,
      isActive: true,
      allowedRoles: ["buyer", "director"],
      activeEffectiveRole: "buyer",
      canAccessAllOfficeRoutes: true,
      canImpersonateForMutations: true,
      expiresAt: "2026-05-16T00:00:00Z",
      reason: "runtime verification",
    });
    expect(isServerAuthorizedPlatformDeveloper(legacy)).toBe(false);
  });

  it("keeps the legacy office role list explicit while authorization stays server-owned", () => {
    expect(DEVELOPER_OVERRIDE_ROLES).toEqual([
      "foreman",
      "director",
      "buyer",
      "warehouse",
      "accountant",
      "contractor",
      "security",
      "engineer",
    ]);
  });

  it("never treats an env or localStorage flag as authorization", () => {
    for (const probe of [
      { envValue: "1", storageValue: null },
      { envValue: null, storageValue: "1" },
      { envValue: "1", storageValue: "1" },
    ]) {
      expect(
        isLocalDeveloperFullAccessAllowed({
          ...probe,
          host: "localhost",
          isDev: true,
          platformOS: "web",
          webdriver: false,
          serverVerified: false,
        }),
      ).toBe(false);
    }
    expect(LOCAL_DEVELOPER_FULL_ACCESS_STORAGE_KEY).toBe(
      "rik.office.localDeveloperFullAccess",
    );
  });

  it("requires server verification and still enforces local/non-production constraints", () => {
    expect(
      isLocalDeveloperFullAccessAllowed({
        envValue: "1",
        host: "localhost",
        isDev: true,
        platformOS: "web",
        serverVerified: true,
      }),
    ).toBe(true);
    expect(
      isLocalDeveloperFullAccessAllowed({
        envValue: "1",
        host: "app.example.com",
        isDev: true,
        platformOS: "web",
        serverVerified: true,
      }),
    ).toBe(false);
    expect(
      isLocalDeveloperFullAccessAllowed({
        envValue: "1",
        isDev: false,
        platformOS: "ios",
        releaseChannel: "production",
        serverVerified: true,
      }),
    ).toBe(false);
    expect(
      isLocalDeveloperFullAccessAllowed({
        envValue: "1",
        isDev: false,
        platformOS: "android",
        releaseChannel: "preview",
        serverVerified: true,
      }),
    ).toBe(true);
  });

  it("does not create a local UI override context even under every local flag", () => {
    expect(
      resolveLocalDeveloperOverrideContext({
        envValue: "1",
        host: "127.0.0.1",
        isDev: true,
        platformOS: "web",
        storageValue: "1",
        webdriver: false,
        serverVerified: true,
      }),
    ).toBeNull();
  });

  it("accepts only the server-entitled provider principal", () => {
    const server = normalizeDeveloperOverrideContext({
      actorUserId: "server-user",
      actorRole: "platform_developer",
      entitlement: "platform_developer",
      authorizationSource: "server_entitlement",
      isEnabled: true,
      isActive: true,
      allowedRoles: ["director"],
      activeEffectiveRole: "director",
      canAccessAllOfficeRoutes: true,
      canImpersonateForMutations: false,
      expiresAt: null,
      reason: "dedicated local test tenant",
    });
    expect(isServerAuthorizedPlatformDeveloper(server)).toBe(true);
  });

  it("keeps only capability lookup in RPC and switches roles through real principals", () => {
    const source = readFileSync(join(__dirname, "developerOverride.ts"), "utf8");
    const forbiddenAnyCast = [" as", " any"].join("");

    expect(source).toContain("runContainedRpc");
    expect(source).toContain("developer_override_context_v1");
    expect(source).toContain("switchLocalDeveloperPrincipal");
    expect(source).not.toContain('"developer_set_effective_role_v1"');
    expect(source).not.toContain('"developer_clear_effective_role_v1"');
    expect(source).not.toContain(forbiddenAnyCast);
    expect(source).not.toMatch(/supabase\s*\.\s*rpc/);
  });
});
