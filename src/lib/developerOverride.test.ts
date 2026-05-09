import { readFileSync } from "fs";
import { join } from "path";

import {
  normalizeDeveloperOverrideContext,
  DEVELOPER_OVERRIDE_ROLES,
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
    ]);
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
