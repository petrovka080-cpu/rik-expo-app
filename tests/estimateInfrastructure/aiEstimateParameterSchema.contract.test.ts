import { buildAiEstimateParameterSchema } from "../../src/lib/estimate/aiEstimateParameterSchema";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { buildAiEstimateParameterCards } from "../../src/lib/estimate/buildAiEstimateParameterCards";
import { aiEstimateRuLabelForParameter, containsForbiddenAiEstimateVisibleToken, hasHumanReadableAiEstimateParameterPassport } from "../../src/lib/estimate/aiEstimateRuParameterDictionary";
import { buildAiEstimateNormativeWorkParameterPassport } from "../../src/lib/estimate/aiEstimateNormativeWorkParameterPassport";

describe("AI estimate parameter schema", () => {
  it("keeps published manufacturer fields and distinct stock/reserve labels readable without opening technical passports", () => {
    const version = "CT127en_GL C_CT127_TDS_1_0120: конкретная выбранная версия; поставку подтвердить";
    const stock = "CT127en_GL: сухой порошок: предварительно0 пригодного наличия";
    const reserve = "CT127en_GL: сухой порошок: предварительно0 сохраняемого резерва";
    expect(aiEstimateRuLabelForParameter("ct127_delivered_version", version)).toContain("технический лист 01.2020");
    expect(aiEstimateRuLabelForParameter("ct17_rate_l_m2", "Для нового CT17PROFIen_GL03.24 предварительно0.2л/м² продукта"))
      .toContain("Ceresit CT 17 PROFI, версия en GL 03.24");
    expect(aiEstimateRuLabelForParameter("ct17_pack_l", "CT17PROFIen_GL03.24: предварительно5л"))
      .toContain("Ceresit CT 17 PROFI");
    const labels = [stock, reserve].map((title, i) => aiEstimateRuLabelForParameter(i ? "wall_putty_ct127_reserve" : "wall_putty_ct127_stock", title));
    expect(labels[0]).toContain("пригодного наличия");
    expect(labels[1]).toContain("сохраняемого резерва");
    expect(labels[0]).not.toEqual(labels[1]);
    expect(labels.join(" ")).not.toMatch(/\b[A-Za-z][A-Za-z0-9]*_[A-Za-z0-9_]+\b/u);
    expect(hasHumanReadableAiEstimateParameterPassport("ct127_delivered_version", version)).toBe(false);
    expect(aiEstimateRuLabelForParameter("unknown_parameter", "Источник SOME_UNKNOWN_CODE")).not.toContain("SOME_UNKNOWN_CODE");
  });
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
