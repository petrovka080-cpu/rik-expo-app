import { WAREHOUSE_ROLE_POLICY, answerWarehouseAction } from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse no direct stock mutation", () => {
  it("keeps receive issue writeoff transfer as human-only actions", () => {
    const issueDraft = answerWarehouseAction({
      context: buildWarehouseRealStockFixture(),
      actionId: "draft_issue_document",
    });
    const approval = answerWarehouseAction({
      context: buildWarehouseRealStockFixture(),
      actionId: "warehouse_approval_handoff",
    });

    expect(WAREHOUSE_ROLE_POLICY.directReceiveAllowed).toBe(false);
    expect(WAREHOUSE_ROLE_POLICY.directIssueAllowed).toBe(false);
    expect(WAREHOUSE_ROLE_POLICY.directWriteoffAllowed).toBe(false);
    expect(WAREHOUSE_ROLE_POLICY.directTransferAllowed).toBe(false);
    expect(issueDraft.issueCompleted).toBe(false);
    expect(issueDraft.stockMutated).toBe(false);
    expect(approval.autoApproval).toBe(false);
  });
});
