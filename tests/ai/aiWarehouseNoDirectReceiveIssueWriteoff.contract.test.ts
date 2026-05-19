import { answerWarehouseAction } from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse no direct receive issue writeoff", () => {
  it("keeps all warehouse actions draft/read/approval only", () => {
    const context = buildWarehouseRealStockFixture();
    const incoming = answerWarehouseAction({ context, actionId: "incoming_readiness" });
    const issue = answerWarehouseAction({ context, actionId: "issue_readiness_check" });
    const approval = answerWarehouseAction({ context, actionId: "approval_route" });

    for (const answer of [incoming, issue, approval]) {
      expect(answer.stockMutated).toBe(false);
      expect(answer.incomingAccepted).toBe(false);
      expect(answer.issueExecuted).toBe(false);
      expect(answer.writeoffCreated).toBe(false);
      expect(answer.autoApproval).toBe(false);
    }
  });
});
