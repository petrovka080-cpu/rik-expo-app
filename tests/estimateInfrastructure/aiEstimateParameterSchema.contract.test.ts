import { buildAiEstimateParameterSchema } from "../../src/lib/estimate/aiEstimateParameterSchema";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { buildAiEstimateParameterCards } from "../../src/lib/estimate/buildAiEstimateParameterCards";
import { containsForbiddenAiEstimateVisibleToken } from "../../src/lib/estimate/aiEstimateRuParameterDictionary";
import { buildAiEstimateNormativeWorkParameterPassport } from "../../src/lib/estimate/aiEstimateNormativeWorkParameterPassport";

describe("AI estimate parameter schema", () => {
  it("builds editable Russian parameter cards from the existing estimate passport", () => {
    const revision = createEstimateDraftRevision({
      rawInput: "вентфасад под ключ 1500 кв метров",
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    const schema = buildAiEstimateParameterSchema(revision.selectedTemplateId);
    const normativePassport = buildAiEstimateNormativeWorkParameterPassport(revision.selectedTemplateId);
    expect(schema?.catalogTotalTemplates).toBe(11610);
    expect(schema?.fields.some((field) => field.key === "facade_area_m2")).toBe(true);
    expect(schema?.fields.every((field) => field.editable)).toBe(true);
    expect(schema?.fields.every((field) => field.affectsRowIds.length > 0 || field.formulaRefs.length > 0)).toBe(true);
    expect(normativePassport?.workFamily).toBe("facade");
    const normativeKeys = new Set(normativePassport?.requirements.map((field) => field.key));
    for (const key of ["facade_area_m2", "height_m", "insulation_thickness_mm", "material_specification", "site_access"]) {
      expect(normativeKeys.has(key)).toBe(true);
    }
    expect(normativePassport?.requirements.every((field) => field.affectsRowIds.length > 0 || field.formulaRefs.length > 0)).toBe(true);

    const cards = buildAiEstimateParameterCards({ revision, includeMissing: true });
    expect(cards.length).toBeGreaterThan(0);
    const cardKeys = new Set(cards.map((card) => card.key));
    for (const key of ["facade_area_m2", "height_m", "insulation_thickness_mm", "material_specification", "site_access"]) {
      expect(cardKeys.has(key)).toBe(true);
    }
    expect(cards.every((card) => card.clickAction === "open_parameter_editor")).toBe(true);
    expect(cards.every((card) => card.noStepperControls)).toBe(true);
    const visible = cards.map((card) => `${card.labelRu} ${card.displayValueRu} ${card.sourceLabelRu}`).join(" ");
    expect(visible).not.toMatch(/[a-z]+_[a-z0-9_]+/i);
    expect(containsForbiddenAiEstimateVisibleToken(visible)).toBe(false);
  });
});
