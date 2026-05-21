import { assertAiApprovalRequestIsLedgerReady } from "../../../src/lib/ai/approvalExecutionBoundary";
import { createPurchaseApprovalScenario } from "./approvalExecutionTestFixtures";

describe("ai approval request", () => {
  it("carries sourceRefs, diff, policy and draft snapshot", () => {
    const { request } = createPurchaseApprovalScenario();

    expect(assertAiApprovalRequestIsLedgerReady(request)).toBe(true);
    expect(request.actionKind).toBe("purchase_order_create");
    expect(request.sourceRefIds).toContain("golden:procurement_request:req_124");
    expect(request.impactDiff.willCreate.length).toBeGreaterThan(0);
    expect(request.approvalPolicy.canRequesterApproveOwnRequest).toBe(false);
    expect(request.approvalPolicy.canBypass).toBe(false);
  });
});
