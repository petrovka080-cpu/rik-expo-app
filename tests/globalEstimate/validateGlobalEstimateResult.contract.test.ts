import { validateGlobalEstimateResult, type GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";
import { buildTemplateRatebookEstimate } from "./globalEstimateTemplateRatebookTestHelpers";

function cloneEstimate(result: GlobalEstimateResult): GlobalEstimateResult {
  return JSON.parse(JSON.stringify(result)) as GlobalEstimateResult;
}

describe("validateGlobalEstimateResult", () => {
  it("accepts a source-backed backend estimate", () => {
    const result = buildTemplateRatebookEstimate("asphalt_paving");
    expect(validateGlobalEstimateResult(result)).toMatchObject({ passed: true, checkedKnownWork: true });
  });

  it("rejects priced rows without sourceId", () => {
    const invalid = cloneEstimate(buildTemplateRatebookEstimate("asphalt_paving"));
    invalid.sections[0].rows[0].sourceId = "";
    const report = validateGlobalEstimateResult(invalid);
    expect(report.passed).toBe(false);
    expect(report.issues.map((item) => item.code)).toContain("GLOBAL_ESTIMATE_PRICE_WITHOUT_SOURCE");
  });

  it("rejects a language mismatch when an expected language is supplied", () => {
    const result = buildTemplateRatebookEstimate("brick_masonry");
    const report = validateGlobalEstimateResult(result, { expectedLanguage: "en" });
    expect(report.passed).toBe(false);
    expect(report.issues.map((item) => item.code)).toContain("GLOBAL_ESTIMATE_LANGUAGE_MISMATCH");
  });
});
