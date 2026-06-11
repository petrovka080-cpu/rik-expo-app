import { SELECTED_WORK_ENTERPRISE_1000_CASES } from "../../scripts/e2e/selectedWorkEnterprise1000Cases";
import { materialRows, selectedWorkPayload } from "./aiEstimateCoreReal10000HardeningTestHelpers";

describe("AI estimate core real 1000 selected-work acceptance contract", () => {
  it("keeps the 1000-case dataset estimate-only and selected-work preserving", () => {
    expect(SELECTED_WORK_ENTERPRISE_1000_CASES).toHaveLength(1000);
    expect(new Set(SELECTED_WORK_ENTERPRISE_1000_CASES.map((item) => item.kind))).toEqual(new Set(["estimate"]));

    for (const testCase of SELECTED_WORK_ENTERPRISE_1000_CASES.slice(0, 40)) {
      const { estimate, payload } = selectedWorkPayload({
        selectedWorkKey: testCase.selectedWorkKey,
        rawInput: testCase.rawEstimateInput,
        volume: testCase.volume,
        unit: testCase.unit,
      });
      expect(estimate.work.workKey).toBe(testCase.selectedWorkKey);
      expect(payload.selectedWork?.selectedWorkKey).toBe(testCase.selectedWorkKey);
      expect(payload.quantity.quantity).toBe(testCase.volume);
      expect(payload.rows.length).toBeGreaterThan(0);
      expect(materialRows(payload).length).toBeGreaterThan(0);
    }
  });
});
