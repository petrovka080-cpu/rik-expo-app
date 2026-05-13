import {
  resolveExplicitAiRoleAuthEnv,
} from "../../scripts/e2e/resolveExplicitAiRoleAuthEnv";

describe("role isolation is not claimed without separate users", () => {
  it("does not turn a developer/control account into a role-isolation E2E claim", () => {
    const result = resolveExplicitAiRoleAuthEnv({
      E2E_ROLE_MODE: "developer_control_full_access",
      E2E_CONTROL_EMAIL: "control@example.test",
      E2E_CONTROL_PASSWORD: "control-secret",
    });

    expect(result.full_access_runtime_claimed).toBe(true);
    expect(result.role_isolation_e2e_claimed).toBe(false);
    expect(result.separate_role_users_required).toBe(false);
    expect(result.rolesResolved).toEqual(["director", "foreman", "buyer", "accountant", "contractor"]);
  });

  it("allows role isolation only in separate_roles mode with all role credentials", () => {
    const result = resolveExplicitAiRoleAuthEnv({
      E2E_ROLE_MODE: "separate_roles",
      E2E_DIRECTOR_EMAIL: "director@example.test",
      E2E_DIRECTOR_PASSWORD: "director-secret",
      E2E_FOREMAN_EMAIL: "foreman@example.test",
      E2E_FOREMAN_PASSWORD: "foreman-secret",
      E2E_BUYER_EMAIL: "buyer@example.test",
      E2E_BUYER_PASSWORD: "buyer-secret",
      E2E_ACCOUNTANT_EMAIL: "accountant@example.test",
      E2E_ACCOUNTANT_PASSWORD: "accountant-secret",
      E2E_CONTRACTOR_EMAIL: "contractor@example.test",
      E2E_CONTRACTOR_PASSWORD: "contractor-secret",
    });

    expect(result.source).toBe("explicit_env");
    expect(result.role_isolation_e2e_claimed).toBe(true);
    expect(result.full_access_runtime_claimed).toBe(false);
    expect(result.separate_role_users_required).toBe(true);
  });
});
