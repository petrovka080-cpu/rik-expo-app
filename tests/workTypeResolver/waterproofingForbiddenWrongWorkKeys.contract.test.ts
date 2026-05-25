import { WATERPROOFING_DISAMBIGUATION_CASES, expectCaseResolves } from "./waterproofingDisambiguationTestHelpers";
import { findForbiddenWorkTypeMappings } from "../../src/lib/ai/globalEstimate/workTypeResolverNegativeRules";

describe("waterproofing forbidden wrong work keys", () => {
  it("has explicit negative rules for roof, bathroom, and foundation waterproofing collisions", () => {
    expect(findForbiddenWorkTypeMappings("гидроизоляция крыши 100 м²", "bathroom_waterproofing")).toContain("roof_waterproofing_must_not_map_to_bathroom");
    expect(findForbiddenWorkTypeMappings("гидроизоляция ванной 30 м²", "roof_waterproofing")).toContain("bathroom_waterproofing_must_not_map_to_roof");
    expect(findForbiddenWorkTypeMappings("гидроизоляция фундамента 80 м²", "bathroom_waterproofing")).toContain("foundation_waterproofing_must_not_map_to_bathroom");
  });

  it("does not trigger forbidden mapping rules for resolved regression cases", () => {
    for (const testCase of WATERPROOFING_DISAMBIGUATION_CASES) {
      const estimate = expectCaseResolves(testCase);

      expect(testCase.forbiddenWorkKeys).not.toContain(estimate.work.workKey);
      expect(findForbiddenWorkTypeMappings(testCase.prompt, estimate.work.workKey)).toEqual([]);
    }
  });
});
