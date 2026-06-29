import { readFileSync } from "fs";
import { join } from "path";

import {
  normalizeDeveloperOverrideContext,
  DEVELOPER_OVERRIDE_ROLES,
  LOCAL_DEVELOPER_FULL_ACCESS_STORAGE_KEY,
  isLocalDeveloperFullAccessAllowed,
  resolveLocalDeveloperOverrideContext,
} from "./developerOverride";

describe("developerOverride", () => {
  it("normalizes active override context from server payload", () => {
    expect(
      normalizeDeveloperOverrideContext({
        actorUserId: "user-1",
        isEnabled: true,
        isActive: true,
        allowedRoles: ["Buyer", "director", "", null],
        activeEffectiveRole: "BUYER",
        canAccessAllOfficeRoutes: true,
        canImpersonateForMutations: true,
        expiresAt: "2026-05-16T00:00:00Z",
        reason: "runtime verification",
      }),
    ).toEqual({
      actorUserId: "user-1",
      isEnabled: true,
      isActive: true,
      allowedRoles: ["buyer", "director"],
      activeEffectiveRole: "buyer",
      canAccessAllOfficeRoutes: true,
      canImpersonateForMutations: true,
      expiresAt: "2026-05-16T00:00:00Z",
      reason: "runtime verification",
    });
  });

  it("keeps the break-glass role list explicit and narrow", () => {
    expect(DEVELOPER_OVERRIDE_ROLES).toEqual([
      "buyer",
      "director",
      "warehouse",
      "accountant",
      "foreman",
      "contractor",
      "security",
      "engineer",
    ]);
  });

  it("allows local developer full access on localhost web and native dev", () => {
    expect(
      isLocalDeveloperFullAccessAllowed({
        envValue: null,
        host: "localhost",
        isDev: true,
        platformOS: "web",
        storageValue: null,
        webdriver: false,
      }),
    ).toBe(true);
    expect(
      isLocalDeveloperFullAccessAllowed({
        envValue: null,
        host: "localhost",
        isDev: false,
        platformOS: "web",
        storageValue: null,
        webdriver: false,
      }),
    ).toBe(true);
    expect(
      isLocalDeveloperFullAccessAllowed({
        envValue: null,
        host: "app.example.com",
        isDev: true,
        platformOS: "web",
        storageValue: null,
        webdriver: false,
      }),
    ).toBe(false);
    expect(
      isLocalDeveloperFullAccessAllowed({
        envValue: null,
        host: "localhost",
        isDev: true,
        platformOS: "ios",
        storageValue: null,
        webdriver: false,
      }),
    ).toBe(true);
    expect(
      isLocalDeveloperFullAccessAllowed({
        envValue: "1",
        host: null,
        isDev: false,
        platformOS: "ios",
        storageValue: null,
        webdriver: false,
      }),
    ).toBe(true);
    expect(
      isLocalDeveloperFullAccessAllowed({
        envValue: null,
        host: null,
        isDev: false,
        platformOS: "ios",
        releaseChannel: "testflight-internal",
        storageValue: null,
        webdriver: false,
      }),
    ).toBe(true);
    expect(
      isLocalDeveloperFullAccessAllowed({
        envValue: null,
        host: null,
        isDev: false,
        platformOS: "ios",
        releaseChannel: "ios-testflight-internal",
        storageValue: null,
        webdriver: false,
      }),
    ).toBe(true);
    expect(
      isLocalDeveloperFullAccessAllowed({
        envValue: null,
        host: null,
        isDev: false,
        platformOS: "android",
        releaseChannel: "production-emulator",
        storageValue: null,
        webdriver: false,
      }),
    ).toBe(true);
    expect(
      isLocalDeveloperFullAccessAllowed({
        envValue: null,
        host: null,
        isDev: false,
        platformOS: "android",
        releaseChannel: "preview",
        storageValue: null,
        webdriver: false,
      }),
    ).toBe(true);
    expect(
      isLocalDeveloperFullAccessAllowed({
        envValue: null,
        host: null,
        isDev: false,
        platformOS: "ios",
        releaseChannel: "internal-ios",
        storageValue: null,
        webdriver: false,
      }),
    ).toBe(true);
    expect(
      isLocalDeveloperFullAccessAllowed({
        envValue: null,
        host: null,
        isDev: false,
        platformOS: "android",
        releaseChannel: "dev-client",
        storageValue: null,
        webdriver: false,
      }),
    ).toBe(true);
    expect(
      isLocalDeveloperFullAccessAllowed({
        envValue: null,
        host: null,
        isDev: false,
        platformOS: "ios",
        releaseChannel: "production",
        storageValue: null,
        webdriver: false,
      }),
    ).toBe(false);
  });

  it("keeps automated browsers blocked unless the developer explicitly opts in", () => {
    expect(
      isLocalDeveloperFullAccessAllowed({
        envValue: null,
        host: "localhost",
        isDev: true,
        platformOS: "web",
        storageValue: null,
        webdriver: true,
      }),
    ).toBe(false);
    expect(
      isLocalDeveloperFullAccessAllowed({
        envValue: null,
        host: "localhost",
        isDev: true,
        platformOS: "web",
        storageValue: "1",
        webdriver: true,
      }),
    ).toBe(true);
    expect(
      isLocalDeveloperFullAccessAllowed({
        envValue: "0",
        host: "localhost",
        isDev: true,
        platformOS: "web",
        storageValue: "1",
        webdriver: false,
      }),
    ).toBe(false);
    expect(LOCAL_DEVELOPER_FULL_ACCESS_STORAGE_KEY).toBe(
      "rik.office.localDeveloperFullAccess",
    );
  });

  it("builds a non-mutating local developer override context for office routes", () => {
    expect(
      resolveLocalDeveloperOverrideContext({
        envValue: null,
        host: "127.0.0.1",
        isDev: true,
        platformOS: "web",
        storageValue: null,
        webdriver: false,
      }),
    ).toEqual({
      actorUserId: "local-developer",
      isEnabled: true,
      isActive: true,
      allowedRoles: DEVELOPER_OVERRIDE_ROLES,
      activeEffectiveRole: "director",
      canAccessAllOfficeRoutes: true,
      canImpersonateForMutations: false,
      expiresAt: null,
      reason: "local_dev_full_access",
    });
  });

  it("keeps deployed developer RPC calls inside the contained boundary", () => {
    const source = readFileSync(join(__dirname, "developerOverride.ts"), "utf8");
    const forbiddenAnyCast = [" as", " any"].join("");

    expect(source).toContain("runContainedRpc");
    expect(source).toContain("developer_override_context_v1");
    expect(source).toContain("developer_set_effective_role_v1");
    expect(source).toContain("developer_clear_effective_role_v1");
    expect(source).not.toContain(forbiddenAnyCast);
    expect(source).not.toMatch(/supabase\s*\.\s*rpc/);
  });
});
