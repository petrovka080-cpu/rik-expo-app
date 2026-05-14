import { buildConstructionProfessionalSafetyBoundary } from "../../src/features/ai/constructionKnowhow/constructionProfessionalSafetyBoundary";

describe("Construction professional safety boundary", () => {
  it("separates safe read, draft, approval-required, and forbidden actions", () => {
    const boundary = buildConstructionProfessionalSafetyBoundary({
      roleId: "warehouse",
      domainId: "warehouse_material_flow",
      evidenceRefs: [],
      approvalRequired: true,
    });

    expect(boundary.highRiskRequiresApproval).toBe(true);
    expect(boundary.directExecution).toBe(false);
    expect(boundary.domainMutation).toBe(false);
    expect(boundary.mobileExternalFetch).toBe(false);
    expect(boundary.directSupabaseFromUi).toBe(false);
    expect(boundary.mutationCount).toBe(0);
    expect(boundary.dbWrites).toBe(0);
    expect(boundary.recommendedActions.safeRead.length).toBeGreaterThan(0);
    expect(boundary.recommendedActions.draftOnly.length).toBeGreaterThan(0);
    expect(boundary.recommendedActions.approvalRequired.length).toBeGreaterThan(0);
    expect(boundary.recommendedActions.forbidden.some((action) => action.blockedBy === "approval_boundary")).toBe(true);
  });
});
