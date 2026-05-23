import { validateGlobalEstimateResult } from "../../src/lib/ai/globalEstimate";
import { allRequiredEstimates } from "./globalEstimateTemplateRatebookTestHelpers";

describe("tax rule evidence for global estimates", () => {
  it("uses a tax source for known tax or a warning for unknown tax", () => {
    for (const result of allRequiredEstimates()) {
      const report = validateGlobalEstimateResult(result);
      expect(report.issues.filter((item) => item.code.startsWith("GLOBAL_ESTIMATE_TAX"))).toEqual([]);
    }
  });
});
