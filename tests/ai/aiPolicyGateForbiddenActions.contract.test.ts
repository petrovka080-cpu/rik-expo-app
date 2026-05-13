import { AI_DOMAINS } from "../../src/features/ai/policy/aiRolePolicy";
import { AI_FORBIDDEN_ACTIONS, assertAiActionAllowed } from "../../src/features/ai/policy/aiRiskPolicy";
import { AI_POLICY_GATE_SCALE_ROLES, runAiPolicyGateScaleProof } from "../../scripts/ai/aiPolicyGateScaleProof";

describe("ai policy gate forbidden actions", () => {
  it("denies every forbidden action for every scale-proof role and domain", () => {
    for (const role of AI_POLICY_GATE_SCALE_ROLES) {
      for (const domain of AI_DOMAINS) {
        for (const actionType of AI_FORBIDDEN_ACTIONS) {
          expect(
            assertAiActionAllowed({
              actionType,
              role,
              domain,
              capability: "execute_approved_action",
            }),
          ).toMatchObject({
            allowed: false,
            riskLevel: "forbidden",
            requiresApproval: false,
          });
        }
      }
    }
  });

  it("keeps approval-required actions out of direct execution in the scale matrix", () => {
    const result = runAiPolicyGateScaleProof();
    const approvalRequiredDecisions = result.decisions.filter(
      (decision) => decision.riskLevel === "approval_required",
    );

    expect(approvalRequiredDecisions.length).toBeGreaterThan(0);
    expect(approvalRequiredDecisions.every((decision) => decision.requiresApproval)).toBe(true);
    expect(approvalRequiredDecisions.every((decision) => decision.directExecutionAllowed === false)).toBe(true);
    expect(approvalRequiredDecisions.every((decision) => decision.finalMutationAllowed === false)).toBe(true);
  });
});
