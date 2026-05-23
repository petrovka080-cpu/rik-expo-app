import {
  GLOBAL_ESTIMATE_TEMPLATE_RATEBOOK_REQUIRED_WORK_KEYS,
  validateGlobalEstimateResult,
} from "../../src/lib/ai/globalEstimate";
import { buildTemplateRatebookEstimate } from "./globalEstimateTemplateRatebookTestHelpers";

describe("known work generic row rejection", () => {
  it("does not produce generic construction rows for protected work keys", () => {
    for (const workKey of GLOBAL_ESTIMATE_TEMPLATE_RATEBOOK_REQUIRED_WORK_KEYS) {
      const result = buildTemplateRatebookEstimate(workKey);
      const report = validateGlobalEstimateResult(result);
      expect(report.issues.filter((item) => item.code === "GLOBAL_ESTIMATE_KNOWN_WORK_GENERIC_ROW")).toEqual([]);
    }
  });
});
