import {
  buildMatchedWorkMetaLabel,
  buildWorkEstimatePromptFieldState,
  buildWorkEstimatePromptFieldViewModel,
} from "../../src/features/requests/components/WorkEstimatePromptField";

describe("inline work prompt field contract", () => {
  it("shows matched work, params, assumptions, missing inputs and build action", () => {
    const state = buildWorkEstimatePromptFieldState({
      value: "вентфасад под ключ 1500 кв метров",
    });
    const model = buildWorkEstimatePromptFieldViewModel({ state });

    expect(model.matchedWorkVisible).toBe(true);
    expect(model.matchedWorkLabel).toContain("вентилируемый фасад");
    expect(model.extractedParamChipsVisible).toBe(true);
    expect(model.assumptionsVisible).toBe(true);
    expect(model.missingInputsVisible).toBe(true);
    expect(model.buildEstimateButtonVisible).toBe(true);
    expect(model.recognizedPromptNeverLeavesSilentEmptyDraft).toBe(true);
    expect(buildMatchedWorkMetaLabel(model.confidenceLabel)).not.toMatch(/\b(?:Confidence|IDLE|READY|ERROR)\b/);
  });
});
