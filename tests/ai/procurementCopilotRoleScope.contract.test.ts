import { buildProcurementCopilotPlan } from "../../src/features/ai/procurementCopilot/procurementCopilotPlanEngine";
import { resolveProcurementCopilotRoleDecision } from "../../src/features/ai/procurementCopilot/procurementCopilotActionPolicy";

const snapshot = {
  requestId: "request-role",
  projectId: "project-role",
  items: [{ materialLabel: "Cement M400", quantity: 1, unit: "bag" }],
};

describe("procurement copilot role scope", () => {
  it("allows buyer, director, and control", () => {
    for (const role of ["buyer", "director", "control"] as const) {
      expect(resolveProcurementCopilotRoleDecision({ userId: `${role}-user`, role })).toMatchObject({
        allowed: true,
        role,
        approvalRequired: true,
        finalMutationAllowed: false,
      });
    }
  });

  it("denies contractor and accountant unless the role is director or control", async () => {
    for (const role of ["contractor", "accountant"] as const) {
      const result = await buildProcurementCopilotPlan({
        auth: { userId: `${role}-user`, role },
        input: {
          requestId: "request-role",
          screenId: "buyer.procurement",
          requestSnapshot: snapshot,
        },
      });
      expect(result.plan).toMatchObject({
        status: "blocked",
        recommendedNextAction: "blocked",
        requiresApproval: true,
      });
      expect(result.plan.supplierCards).toEqual([]);
    }
  });
});
