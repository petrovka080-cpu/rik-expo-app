import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildProjectExecutionDraftFromEstimate } from "../../src/lib/projectExecution";

const PROMPT = "Капитальный ремонт квартиры 54 кв метра";

describe("buyer receives price sources contract", () => {
  it("hands material rows only with candidates, selected source, amount, and missing state", () => {
    const payload = buildConsumerRepairAiDraft(PROMPT).structuredEstimatePayload;
    expect(payload).toBeTruthy();

    const buyer = buildProjectExecutionDraftFromEstimate(payload!, {
      source: "request_estimate",
      sourceRequestId: "request:test",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
      generatedAt: "2026-07-02T00:00:00.000Z",
    });
    const sourceRowsById = new Map(payload!.rows.map((row) => [row.rowId, row]));

    expect(buyer.procurementItems.length).toBeGreaterThan(0);
    expect(buyer.procurementItems.every((item) => sourceRowsById.get(item.sourceEstimateRowId)?.sectionType === "materials")).toBe(true);
    expect(buyer.procurementItems.every((item) => item.quantity === sourceRowsById.get(item.sourceEstimateRowId)?.quantity)).toBe(true);
    expect(buyer.procurementItems.every((item) => Array.isArray(item.priceCandidates))).toBe(true);
    expect(buyer.procurementItems.every((item) =>
      item.selectedPriceSource?.price_status === "priced"
        ? item.unitPrice != null && item.amount != null && Boolean(item.selectedPriceSource.price_source_id)
        : item.missingPrice === true && item.amount == null
    )).toBe(true);
  });
});
