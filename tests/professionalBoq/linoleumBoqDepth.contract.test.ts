import { estimateFor, expectRows, REQUEST_LINOLEUM_PROMPT } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

describe("linoleum professional BOQ", () => {
  it("has depth and linoleum-specific rows", () => {
    const estimate = estimateFor("/request", REQUEST_LINOLEUM_PROMPT);
    expect(estimate.sections.flatMap((section) => section.rows).length).toBeGreaterThanOrEqual(12);
    expectRows(estimate, ["обмер", "подготовка основания", "ремонт локальных дефектов", "грунтовка", "линолеум", "плинтус", "порожки", "раскрой", "укладка линолеума", "вывоз"], 8);
  });
});
