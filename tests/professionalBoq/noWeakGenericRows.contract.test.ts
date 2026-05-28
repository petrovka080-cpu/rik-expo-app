import {
  estimateFor,
  FOREMAN_CANOPY_PROMPT,
  FOREMAN_GABLE_PROMPT,
  FOREMAN_PAVING_PROMPT,
  REQUEST_LINOLEUM_PROMPT,
  rowText,
} from "../entrypoints/liveB2cEstimateRealityTestHelpers";

describe("professional BOQ weak generic rows", () => {
  it("does not use weak standalone generic rows for live P0 estimates", () => {
    const estimates = [
      estimateFor("/request", REQUEST_LINOLEUM_PROMPT),
      estimateFor("/ai?context=foreman", FOREMAN_PAVING_PROMPT),
      estimateFor("/ai?context=foreman", FOREMAN_CANOPY_PROMPT),
      estimateFor("/ai?context=foreman", FOREMAN_GABLE_PROMPT),
    ];
    const forbidden = /^(материал|кровля|монтаж|креп[её]ж|работы|прочее|дополнительные материалы|дополнительные работы|строительные работы|ремонт кровли)$/i;
    for (const estimate of estimates) {
      expect(rowText(estimate).split("\n").some((row) => forbidden.test(row.trim()))).toBe(false);
    }
  });
});
