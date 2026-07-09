import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { buildAiEstimateParameterCards } from "../../src/lib/estimate/buildAiEstimateParameterCards";
import { applyAiEstimateParameterOverride } from "../../src/lib/estimate/applyAiEstimateParameterOverrides";

describe("request estimate editable parameter cards", () => {
  it("offers active cards and missing construction parameters for professional completeness", () => {
    const revision = createEstimateDraftRevision({
      rawInput: "вентфасад под ключ 1500 кв метров",
      createdAt: "2026-07-09T00:00:00.000Z",
    });

    const cards = buildAiEstimateParameterCards({ revision, includeMissing: true });
    expect(cards.some((card) => card.key === "area_m2" && !card.missing)).toBe(true);
    expect(cards.some((card) => card.key === "height_m" && card.missing)).toBe(true);
    expect(cards.some((card) => card.key === "material_specification" && card.missing)).toBe(true);
    expect(cards.every((card) => card.editable && card.clickAction === "open_parameter_editor")).toBe(true);
    expect(cards.every((card) => card.noStepperControls)).toBe(true);
    expect(cards.map((card) => card.labelRu).join(" ")).not.toMatch(/[a-z]+_[a-z0-9_]+/i);

    const result = applyAiEstimateParameterOverride({
      revision,
      operation: "add_param",
      paramKey: "height_m",
      rawValue: "3 m",
      createdAt: "2026-07-09T00:01:00.000Z",
      revisionIndex: 2,
    });
    expect(result.revision.previousRevisionId).toBe(revision.revisionId);
    expect(result.revision.params.height_m.value).toBe(3);
    expect(result.revision.missingInputs.some((input) => input.key === "height_m")).toBe(false);
  });
});
