import { answerWarehouseAction } from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse approval route no bypass", () => {
  it("prepares approval route without auto approval or mutation", () => {
    const answer = answerWarehouseAction({
      context: buildWarehouseRealStockFixture(),
      actionId: "approval_route",
    });

    expect(answer.answerKind).toBe("approval_route");
    expect(answer.providerTrace).toContain("aiApprovalProvider");
    expect(answer.autoApproval).toBe(false);
    expect(answer.stockMutated).toBe(false);
    expect(answer.answerRu).toContain("automatic approval was not executed");
  });
});
