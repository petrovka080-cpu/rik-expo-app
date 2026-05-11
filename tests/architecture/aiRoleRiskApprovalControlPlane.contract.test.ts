import { evaluateAiRoleRiskApprovalControlPlaneGuardrail } from "../../scripts/architecture_anti_regression_suite";

describe("AI role risk approval control plane architecture", () => {
  it("passes the project scanner ratchet", () => {
    const result = evaluateAiRoleRiskApprovalControlPlaneGuardrail({ projectRoot: process.cwd() });
    expect(result.check).toEqual({
      name: "ai_role_risk_approval_control_plane",
      status: "pass",
      errors: [],
    });
    expect(result.summary).toMatchObject({
      rolePolicyPresent: true,
      riskPolicyPresent: true,
      screenCapabilityRegistryPresent: true,
      approvalGatePresent: true,
      professionalResponsePolicyPresent: true,
      assistantActionsDirectSubmitBlocked: true,
      directorFullAccessPolicyPresent: true,
      nonDirectorScopePresent: true,
      forbiddenActionsBlocked: true,
      approvalRequiredCannotExecuteDirectly: true,
      screenContextRedactionPresent: true,
      auditEventsPresent: true,
      screenGatewayImports: 0,
    });
  });
});
