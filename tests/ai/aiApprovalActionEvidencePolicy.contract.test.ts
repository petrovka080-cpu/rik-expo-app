import { buildAiApprovalActionEvidencePolicy } from "../../src/features/ai/approvalRouter/aiApprovalActionEvidencePolicy";
import { listAiApprovalActionRoutes } from "../../src/features/ai/approvalRouter/aiApprovalActionRouter";

describe("AI approval action evidence policy", () => {
  it("requires audit action, domain evidence, and approval route evidence for every routed action", () => {
    const routes = listAiApprovalActionRoutes();

    expect(routes).toHaveLength(28);
    expect(routes.every((route) => route.evidencePolicy.ok)).toBe(true);
    expect(routes.every((route) => route.evidencePolicy.evidenceRefs.length > 0)).toBe(true);
    expect(routes.every((route) => route.evidencePolicy.evidenceRefs.length <= route.evidencePolicy.maxEvidenceRefs)).toBe(true);
    expect(routes.every((route) => route.evidencePolicy.requiredEvidenceKinds.includes("approval_route"))).toBe(true);
  });

  it("blocks actions that have no evidence or approval route", () => {
    const incomplete = {
      screenId: "synthetic.screen",
      actionId: "synthetic.screen.approval",
      evidenceSources: [],
      existingBffRoutes: [],
    };

    expect(buildAiApprovalActionEvidencePolicy(incomplete)).toMatchObject({
      ok: false,
      missingEvidenceKinds: ["domain_evidence", "approval_route"],
      evidenceBacked: false,
    });
  });
});
