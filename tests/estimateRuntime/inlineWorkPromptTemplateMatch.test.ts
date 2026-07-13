import { parseInlineWorkEstimatePrompt } from "../../src/lib/ai/parseInlineWorkEstimatePrompt";

describe("inline work prompt template match", () => {
  it("auto-matches gabion wall from full work-plus-params prompt", () => {
    const result = parseInlineWorkEstimatePrompt("Мосты, тоннели и инженерные сооружения: габион стена длина 150 метров высота 30 метров толщина 1 метр");

    expect(result.matchedTemplate?.templateId).toBe("gabion_wall_preliminary_boq_expanded_complex_v1");
    expect(result.matchedTemplate?.family).toBe("gabion_wall");
    expect(result.mustAskUserToSelectTemplate).toBe(false);
    expect(result.canBuildPreliminaryEstimate).toBe(true);
  });

  it("auto-matches ventfasad and preserves turnkey mode", () => {
    const result = parseInlineWorkEstimatePrompt("вентфасад под ключ 1500 кв метров");

    expect(result.matchedTemplate?.templateId).toBe("ventilated_facade_preliminary_boq_expanded_complex_v1");
    expect(result.extractedParams.area_m2?.value).toBe(1500);
    expect(result.extractedParams.package_mode?.value).toBe("turnkey");
    expect(result.mustAskUserToSelectTemplate).toBe(false);
  });
});
