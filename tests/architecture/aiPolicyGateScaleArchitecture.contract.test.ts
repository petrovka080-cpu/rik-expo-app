import { evaluateAiPolicyGateScaleProofGuardrail } from "../../scripts/architecture_anti_regression_suite";

describe("ai policy gate scale proof architecture", () => {
  it("passes when the deterministic proof, tests, and artifacts are present", () => {
    const result = evaluateAiPolicyGateScaleProofGuardrail({
      projectRoot: process.cwd(),
    });

    expect(result.check).toEqual({
      name: "ai_policy_gate_scale_proof",
      status: "pass",
      errors: [],
    });
    expect(result.summary).toMatchObject({
      deterministic10kProof: true,
      allRolesCovered: true,
      allScreensCovered: true,
      allActionsCovered: true,
      noModelCalls: true,
      noDbCalls: true,
      noExternalFetches: true,
      noMutations: true,
      forbiddenAlwaysDenied: true,
      approvalRequiredNeverDirectExecutes: true,
      executeApprovedGateOnly: true,
    });
  });
});
