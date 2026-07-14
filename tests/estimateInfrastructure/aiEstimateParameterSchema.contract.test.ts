import { buildAiEstimateParameterSchema } from "../../src/lib/estimate/aiEstimateParameterSchema";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { buildAiEstimateParameterCards } from "../../src/lib/estimate/buildAiEstimateParameterCards";
import { containsForbiddenAiEstimateVisibleToken } from "../../src/lib/estimate/aiEstimateRuParameterDictionary";

describe("AI estimate parameter schema", () => {
  it("builds editable Russian parameter cards from the existing estimate passport", () => {
    const revision = createEstimateDraftRevision({
      rawInput: "вентфасад под ключ 1500 кв метров",
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    const schema = buildAiEstimateParameterSchema(revision.selectedTemplateId);
    expect(schema?.catalogTotalTemplates).toBe(11610);
    expect(schema?.fields.length).toBeGreaterThan(5);
    expect(schema?.fields.some((field) => field.key === "height_m")).toBe(true);
    expect(schema?.fields.some((field) => field.key === "material_specification")).toBe(true);
    expect(schema?.fields.every((field) => field.editable)).toBe(true);
    expect(schema?.fields.every((field) => field.affectsRowIds.length > 0 || field.formulaRefs.length > 0)).toBe(true);

    const cards = buildAiEstimateParameterCards({ revision });
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.every((card) => card.clickAction === "open_parameter_editor")).toBe(true);
    expect(cards.every((card) => card.noStepperControls)).toBe(true);
    const visible = cards.map((card) => `${card.labelRu} ${card.displayValueRu} ${card.sourceLabelRu}`).join(" ");
    expect(visible).not.toMatch(/[a-z]+_[a-z0-9_]+/i);
    expect(containsForbiddenAiEstimateVisibleToken(visible)).toBe(false);
  });
});
