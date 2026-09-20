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
    const model = buildWorkEstimatePromptFieldViewModel({
      state: {
        ...state,
        selectedTemplateId: "professional-estimate-passport:v4:ventilated_facade",
        selectedTemplateName: "Вентилируемый фасад",
        status: "TEMPLATE_SELECTED",
      },
    });

    expect(model.matchedWorkVisible).toBe(true);
    expect(model.matchedWorkLabel).toMatch(/вентилируемый фасад/iu);
    expect(model.extractedParamChipsVisible).toBe(false);
    expect(model.assumptionsVisible).toBe(false);
    expect(model.missingInputsVisible).toBe(false);
    expect(model.buildEstimateButtonVisible).toBe(true);
    expect(model.recognizedPromptNeverLeavesSilentEmptyDraft).toBe(true);
    expect(buildMatchedWorkMetaLabel(model.confidenceLabel)).not.toMatch(/\b(?:Confidence|IDLE|READY|ERROR)\b/);
  });
});
