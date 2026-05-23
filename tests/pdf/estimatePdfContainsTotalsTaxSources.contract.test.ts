import { buildLiveEstimate, generateAndValidateLivePdf } from "../liveAcceptance/liveAiEstimatePdfRealityTestHelpers";

describe("estimate PDF totals, tax and sources", () => {
  it("contains totals, tax status and source evidence", () => {
    const estimate = buildLiveEstimate("сделай мне смету на асфальтирование на 1000 кв м");
    const { validation } = generateAndValidateLivePdf(estimate);

    expect(validation.text).toContain("Итого");
    expect(validation.text).toContain("Налоговый статус");
    expect(validation.text).toContain("Источники и точность");
    expect(validation.text).toContain(estimate.totals.displayGrandTotal);
    expect(validation.text).toContain(estimate.tax.taxLabel);
  });
});
