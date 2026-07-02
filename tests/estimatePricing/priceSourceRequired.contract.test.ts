import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { validateResolvedEstimatePricing } from "../../src/features/estimates/pricing/priceResolutionEngine";

const PROMPT = "Капитальный ремонт квартиры 54 кв метра";

describe("estimate pricing source required contract", () => {
  it("rejects priced rows without an accepted price source", () => {
    const invalid = validateResolvedEstimatePricing([
      {
        rowId: "bad-row",
        quantity: 10,
        unitPrice: 100,
        total: 1000,
        priceTrace: null,
      },
    ]);

    expect(invalid.passed).toBe(false);
    expect(invalid.failures).toEqual(expect.arrayContaining([
      "PRICE_WITHOUT_SOURCE:bad-row",
      "AMOUNT_WITHOUT_PRICE_SOURCE:bad-row",
    ]));
  });

  it("keeps all priced apartment rows source-backed", () => {
    const payload = buildConsumerRepairAiDraft(PROMPT).structuredEstimatePayload;
    expect(payload).toBeTruthy();

    const validation = validateResolvedEstimatePricing(payload!.rows);
    expect(validation).toEqual({ passed: true, failures: [] });
    expect(payload!.boq.totals.allPricedRowsHaveSource).toBe(true);
  });
});
