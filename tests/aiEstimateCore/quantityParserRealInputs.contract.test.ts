import {
  displayMetricUnit,
  estimateForText,
  parsedQuantity,
  QUANTITY_EDGE_CASES,
  REAL_WORK_READING_SMOKE_CASES,
} from "./aiEstimateCoreReal10000HardeningTestHelpers";

describe("AI estimate core real quantity parser", () => {
  it("parses real Russian quantity spellings and normalizes metric unit labels", () => {
    const expectedLabels: Record<string, string> = {
      sq_m: "\u043c\u00b2",
      m3: "\u043c\u00b3",
      linear_m: "\u043f\u043e\u0433. \u043c",
      set: "\u043a\u043e\u043c\u043f\u043b.",
      pcs: "\u0448\u0442",
      ton: "\u0442",
    };

    for (const testCase of QUANTITY_EDGE_CASES) {
      const parsed = parsedQuantity(testCase.text);
      expect(parsed.primaryQuantity).toBe(testCase.quantity);
      expect(parsed.primaryUnit).toBe(testCase.unit);
      expect(displayMetricUnit(testCase.unit)).toBe(expectedLabels[testCase.unit]);
    }
  });

  it("passes parsed quantity and unit into the estimate result", () => {
    for (const testCase of REAL_WORK_READING_SMOKE_CASES) {
      const estimate = estimateForText(testCase.text);
      expect(estimate.input.volume).toBe(testCase.expectedQuantity);
      expect(estimate.input.unit).toBe(testCase.expectedUnit);
      expect(estimate.work.workKey).not.toBe(testCase.forbiddenWorkKey);
    }
  });
});
