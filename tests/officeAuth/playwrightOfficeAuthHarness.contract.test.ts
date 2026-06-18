import fs from "node:fs";
import path from "node:path";

import {
  createBuyerTestAuthContext,
  createDirectorTestAuthContext,
  createForemanTestAuthContext,
  resolveOfficeRoleCredentials,
  type OfficeAuthEnv,
} from "../../src/lib/officeAuthTest/officeRoleTestHarness";

const baseEnv: OfficeAuthEnv = {
  EXPO_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
  EXPO_PUBLIC_SUPABASE_ANON_KEY: "anon",
  E2E_ROLE_MODE: "",
  E2E_FOREMAN_EMAIL: "foreman@example.test",
  E2E_FOREMAN_PASSWORD: "foreman-secret",
  E2E_DIRECTOR_EMAIL: "director@example.test",
  E2E_DIRECTOR_PASSWORD: "director-secret",
  E2E_BUYER_EMAIL: "buyer@example.test",
  E2E_BUYER_PASSWORD: "buyer-secret",
  E2E_CONTROL_EMAIL: "",
  E2E_CONTROL_PASSWORD: "",
  E2E_DEVELOPER_EMAIL: "",
  E2E_DEVELOPER_PASSWORD: "",
};

describe("Playwright office auth harness", () => {
  it("creates shared role contexts with production permission names", () => {
    expect(createForemanTestAuthContext()).toMatchObject({
      role: "foreman",
      permissions: expect.arrayContaining(["office:request:submit"]),
    });
    expect(createDirectorTestAuthContext()).toMatchObject({
      role: "director",
      permissions: expect.arrayContaining(["office:request:approve"]),
    });
    expect(createBuyerTestAuthContext()).toMatchObject({
      role: "buyer",
      permissions: expect.arrayContaining(["office:procurement:create"]),
    });
  });

  it("resolves separate-role and developer-control credentials without embedding secrets", () => {
    expect(resolveOfficeRoleCredentials("director", baseEnv)).toMatchObject({
      email: "director@example.test",
      source: "separate_role",
    });
    expect(
      resolveOfficeRoleCredentials("buyer", {
        ...baseEnv,
        E2E_ROLE_MODE: "developer_control_full_access",
        E2E_CONTROL_EMAIL: "control@example.test",
        E2E_CONTROL_PASSWORD: "control-secret",
      }),
    ).toMatchObject({
      email: "control@example.test",
      source: "developer_control",
    });
  });

  it("does not add an app-side browser bypass hook", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/officeAuthTest/officeRoleTestHarness.ts"),
      "utf8",
    );

    expect(source).toContain("signInWithPassword");
    expect(source).toContain("developer_set_effective_role_v1");
    expect(source).not.toMatch(/window\.__OFFICE_TEST|directorOnlyFakeAuth|buyerOnlyFakeAuth|foremanOnlyBypass/);
  });
});
