import { createWarehouseDiscrepancyDraftAction } from "../../../src/lib/ai/safeActions";
import { expectDraftIsSafe } from "./safeActionsTestFixtures";

describe("warehouse discrepancy draft action", () => {
  it("prepares a discrepancy draft without receiving or issuing stock", () => {
    const draft = createWarehouseDiscrepancyDraftAction();
    expect(draft.actionKind).toBe("warehouse_discrepancy_draft");
    expect(draft.impactDiff.businessMutationBlocked).toBe(true);
    expect(draft.approvalRoute?.approvalType).toBe("warehouse_manager_review");
    expectDraftIsSafe(draft);
  });
});
