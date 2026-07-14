import { deriveWorkPromptState } from "../../src/lib/ai/workPromptStateMachine";

describe("inline work prompt selected template state", () => {
  it("keeps selected template when user appends numeric params", () => {
    const selected = deriveWorkPromptState({
      rawInput: "Мосты, тоннели и инженерные сооружения: габион стена ",
      selectedTemplateId: "gabion_wall_preliminary_boq_expanded_complex_v1",
      selectedTemplateName: "Мосты, тоннели и инженерные сооружения: габион стена",
    });

    const appended = deriveWorkPromptState({
      rawInput: "Мосты, тоннели и инженерные сооружения: габион стена длина 150 метров высота 30 метров толщина 1 метр",
      previousState: selected,
    });

    expect(appended.selectedTemplateId).toBe("gabion_wall_preliminary_boq_expanded_complex_v1");
    expect(appended.parseResult.extractedParams.length_m?.value).toBe(150);
    expect(appended.parseResult.extractedParams.volume_m3?.value).toBe(4500);
    expect(appended.status).toBe("READY_TO_BUILD_PRELIMINARY");
  });

  it("does not leave a recognized full prompt in silent empty state", () => {
    const state = deriveWorkPromptState({
      rawInput: "вентфасад под ключ 1500 кв метров",
    });

    expect(state.selectedTemplateId).toBe("ventilated_facade_preliminary_boq_expanded_complex_v1");
    expect(state.parseResult.canBuildPreliminaryEstimate).toBe(true);
    expect(["AUTO_MATCHED_WITH_PARAMS", "READY_TO_BUILD_PRELIMINARY"]).toContain(state.status);
  });
});
