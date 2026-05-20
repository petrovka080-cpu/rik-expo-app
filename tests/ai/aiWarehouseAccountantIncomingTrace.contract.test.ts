import { answerWarehouseStockQuestion } from "../../src/lib/ai/warehouseStock";
import { buildWarehouseRealStockFixture } from "./aiWarehouseRealStock.fixture";

describe("warehouse accountant incoming trace", () => {
  it("exposes linked incoming waybill invoice context without full cashflow", () => {
    const answer = answerWarehouseStockQuestion({
      context: buildWarehouseRealStockFixture(),
      questionRu: "показать связанный приход для бухгалтерии",
    });

    expect(answer.providerTrace).toContain("aiInvoiceLinkedProvider");
    expect(answer.sources.some((source) => source.type === "waybill" && source.id === "WB-55")).toBe(true);
    expect(answer.sources.some((source) => source.type === "invoice" && source.id === "INV-55")).toBe(true);
    expect(answer.sources.some((source) => source.id === "src:payment:hidden")).toBe(false);
    expect(answer.answerRu).not.toMatch(/full cashflow|service_role|provider payload/i);
  });
});
