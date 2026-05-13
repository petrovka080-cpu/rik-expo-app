import { evaluateDeveloperControlE2eModeGuardrail } from "../../scripts/architecture_anti_regression_suite";

describe("developer/control E2E mode architecture", () => {
  it("passes the developer_control_e2e_mode scanner ratchet", () => {
    const result = evaluateDeveloperControlE2eModeGuardrail({ projectRoot: process.cwd() });

    expect(result.check).toEqual({
      name: "developer_control_e2e_mode",
      status: "pass",
      errors: [],
    });
    expect(result.summary).toMatchObject({
      resolverSupportsDeveloperControlMode: true,
      runnerPresent: true,
      existingRunnersModeAware: true,
      singleAccountRuntimeAllowed: true,
      roleIsolationNotClaimed: true,
      roleIsolationContractTestsPresent: true,
      separateUsersNotRequiredInDeveloperMode: true,
      noAuthAdminListUsersServiceRole: true,
      noSeedOrFakeUsers: true,
      artifactFieldsPresent: true,
    });
  });
});
