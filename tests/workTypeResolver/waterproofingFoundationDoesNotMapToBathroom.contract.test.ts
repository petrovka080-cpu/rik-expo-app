import { WATERPROOFING_DISAMBIGUATION_CASES, expectCaseResolves } from "./waterproofingDisambiguationTestHelpers";
import { findForbiddenWorkTypeMappings } from "../../src/lib/ai/globalEstimate/workTypeResolverNegativeRules";

describe("waterproofing foundation disambiguation", () => {
  it("maps foundation waterproofing prompts away from bathroom work types", () => {
    const foundationCase = WATERPROOFING_DISAMBIGUATION_CASES.find((testCase) => testCase.id === "foundation");

    expect(foundationCase).toBeDefined();
    const estimate = expectCaseResolves(foundationCase!);

    expect(estimate.work.workKey).toBe("foundation_waterproofing");
    expect(estimate.work.title.toLowerCase()).toContain("фундамент");
    expect(estimate.work.title.toLowerCase()).not.toContain("ванн");
    expect(findForbiddenWorkTypeMappings(foundationCase!.prompt, estimate.work.workKey)).toEqual([]);
  });
});
