import { WATERPROOFING_DISAMBIGUATION_CASES, expectCaseResolves } from "./waterproofingDisambiguationTestHelpers";
import { findForbiddenWorkTypeMappings } from "../../src/lib/ai/globalEstimate/workTypeResolverNegativeRules";

describe("waterproofing roof disambiguation", () => {
  it("maps roof and roof membrane waterproofing prompts away from bathroom work types", () => {
    const roofCases = WATERPROOFING_DISAMBIGUATION_CASES.filter((testCase) => testCase.id.startsWith("roof") || testCase.id === "flat_roof_membrane");

    expect(roofCases).toHaveLength(4);

    for (const testCase of roofCases) {
      const estimate = expectCaseResolves(testCase);
      expect(estimate.work.title.toLowerCase()).not.toContain("ванн");
      expect(findForbiddenWorkTypeMappings(testCase.prompt, estimate.work.workKey)).toEqual([]);
    }
  });
});
