import { WATERPROOFING_DISAMBIGUATION_CASES, expectCaseResolves } from "./waterproofingDisambiguationTestHelpers";
import { findForbiddenWorkTypeMappings } from "../../src/lib/ai/globalEstimate/workTypeResolverNegativeRules";

describe("waterproofing bathroom disambiguation", () => {
  it("maps bathroom and shower waterproofing prompts away from roof work types", () => {
    const wetAreaCases = WATERPROOFING_DISAMBIGUATION_CASES.filter((testCase) => testCase.id === "bathroom" || testCase.id === "shower");

    expect(wetAreaCases).toHaveLength(2);

    for (const testCase of wetAreaCases) {
      const estimate = expectCaseResolves(testCase);
      expect(estimate.work.title.toLowerCase()).not.toContain("кровл");
      expect(estimate.work.title.toLowerCase()).not.toContain("кры");
      expect(findForbiddenWorkTypeMappings(testCase.prompt, estimate.work.workKey)).toEqual([]);
    }
  });
});
