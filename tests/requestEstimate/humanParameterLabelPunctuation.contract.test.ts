import { hasHumanReadableAiEstimateParameterPassport, aiEstimateRuLabelForParameter } from "../../src/lib/estimate/aiEstimateRuParameterDictionary";

describe("human parameter labels with ordinary punctuation", () => {
  it("keeps a project fact with a semicolon as readable prose", () => {
    const title = "Совместимый материал в наличии; выделен только этой операции";
    expect(hasHumanReadableAiEstimateParameterPassport("actual_project_material_stock", title)).toBe(true);
    expect(aiEstimateRuLabelForParameter("actual_project_material_stock", title)).toBe(title);
  });
  it.each(["Расход материала = 12", "Расход материала {formula}", "Расход материала [raw]", "Расход материала source_parameters", "Расход материала PRICE_MISSING"])("still rejects a technical label: %s", title => {
    expect(hasHumanReadableAiEstimateParameterPassport("actual_project_material_stock", title)).toBe(false);
  });
  it("does not expose a technical hidden key through a readable title", () => {
    expect(hasHumanReadableAiEstimateParameterPassport("formula_resource_output", "Выбранный материал; только этот этап")).toBe(false);
  });
});
