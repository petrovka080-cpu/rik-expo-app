import { estimateFor, pdfFor, FOREMAN_CANOPY_PROMPT } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

describe("live estimate PDF table", () => {
  it("contains professional table text and work rows", () => {
    const pdf = pdfFor(estimateFor("/ai?context=foreman", FOREMAN_CANOPY_PROMPT));
    expect(pdf.text).toContain("Таблица сметы");
    expect(pdf.text).toContain("Фермы / балки металлические");
    expect(pdf.text).toContain("Источник");
  });
});
