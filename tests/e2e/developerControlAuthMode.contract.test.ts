import {
  resolveExplicitAiRoleAuthEnv,
} from "../../scripts/e2e/resolveExplicitAiRoleAuthEnv";

describe("developer/control E2E auth mode", () => {
  it("requires only one explicit control account and does not claim role isolation", () => {
    const result = resolveExplicitAiRoleAuthEnv({
      E2E_ROLE_MODE: "developer_control_full_access",
      E2E_CONTROL_EMAIL: "control@example.test",
      E2E_CONTROL_PASSWORD: "control-secret",
    });

    expect(result).toMatchObject({
      source: "developer_control_explicit_env",
      auth_source: "developer_control_explicit_env",
      roleMode: "developer_control_full_access",
      greenEligible: true,
      allRolesResolved: false,
      role_isolation_e2e_claimed: false,
      full_access_runtime_claimed: true,
      separate_role_users_required: false,
      auth_admin_used: false,
      list_users_used: false,
      serviceRoleUsed: false,
      seed_used: false,
      fake_users_created: false,
    });
    expect(result.env?.E2E_BUYER_EMAIL).toBe("control@example.test");
    expect(result.env?.E2E_CONTRACTOR_PASSWORD).toBe("control-secret");
  });

  it("falls back to explicit director credentials for developer/control mode", () => {
    const result = resolveExplicitAiRoleAuthEnv({
      E2E_ROLE_MODE: "developer_control_full_access",
      E2E_DIRECTOR_EMAIL: "director@example.test",
      E2E_DIRECTOR_PASSWORD: "director-secret",
    });

    expect(result.source).toBe("developer_control_explicit_env");
    expect(result.env?.E2E_CONTROL_EMAIL).toBe("director@example.test");
    expect(result.role_isolation_e2e_claimed).toBe(false);
  });

  it("keeps separate_roles strict when that mode is selected", () => {
    const result = resolveExplicitAiRoleAuthEnv({
      E2E_ROLE_MODE: "separate_roles",
      E2E_DIRECTOR_EMAIL: "director@example.test",
      E2E_DIRECTOR_PASSWORD: "director-secret",
    });

    expect(result.source).toBe("missing");
    expect(result.blockedStatus).toBe("BLOCKED_NO_E2E_ROLE_SECRETS");
    expect(result.separate_role_users_required).toBe(true);
    expect(result.missingKeys).toEqual([
      "E2E_FOREMAN_EMAIL",
      "E2E_FOREMAN_PASSWORD",
      "E2E_BUYER_EMAIL",
      "E2E_BUYER_PASSWORD",
      "E2E_ACCOUNTANT_EMAIL",
      "E2E_ACCOUNTANT_PASSWORD",
      "E2E_CONTRACTOR_EMAIL",
      "E2E_CONTRACTOR_PASSWORD",
    ]);
  });
});
