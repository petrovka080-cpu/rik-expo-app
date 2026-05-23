import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("global estimate generic fallback row guard", () => {
  it("throws instead of falling back for protected known template work keys", () => {
    const templateService = readRepoFile("src/lib/ai/globalEstimate/globalEstimateTemplateService.ts");
    const validator = readRepoFile("src/lib/ai/globalEstimate/validateGlobalEstimateResult.ts");
    expect(templateService).toContain("GLOBAL_ESTIMATE_TEMPLATE_REQUIRED_FOR_KNOWN_WORK");
    expect(templateService).toContain("isGlobalEstimateTemplateRatebookRequiredWorkKey");
    expect(validator).toContain("GLOBAL_ESTIMATE_KNOWN_WORK_GENERIC_ROW");
  });
});
