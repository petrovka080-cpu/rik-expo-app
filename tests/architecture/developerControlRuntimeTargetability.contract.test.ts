import { evaluateDeveloperControlRuntimeTargetabilityGuardrail } from "../../scripts/architecture_anti_regression_suite";

describe("developer/control runtime targetability architecture", () => {
  it("passes the developer_control_runtime_targetability scanner ratchet", () => {
    const result = evaluateDeveloperControlRuntimeTargetabilityGuardrail({ projectRoot: process.cwd() });

    expect(result.check).toEqual({
      name: "developer_control_runtime_targetability",
      status: "pass",
      errors: [],
    });
    expect(result.summary).toMatchObject({
      runnerSeparatesTargetabilityFromRoleIsolation: true,
      loginOrShellSupported: true,
      commandCenterStableIdsChecked: true,
      procurementEmptyStateAllowed: true,
      approvalPersistenceNonBlocking: true,
      roleIsolationNotClaimed: true,
      noSeparateRoleRequirementInDeveloperMode: true,
      noAuthAdminListUsersServiceRole: true,
      noSeedOrFakeUsers: true,
      targetabilityArtifactsPresent: true,
    });
  });
});
