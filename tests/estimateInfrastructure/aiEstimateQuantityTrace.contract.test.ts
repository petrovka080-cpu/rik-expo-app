import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { applyAiEstimateParameterOverride } from "../../src/lib/estimate/applyAiEstimateParameterOverrides";
import { buildAiEstimateQuantityExplanationTrace } from "../../src/lib/estimate/buildAiEstimateQuantityExplanationTrace";
import { validateAiEstimateQuantityTrace } from "../../src/lib/estimate/validateAiEstimateQuantityTrace";

describe("AI estimate quantity explanation trace", () => {
  it("uses current parameter values and updates after an edit", () => {
    const revision = createEstimateDraftRevision({
      estimateDraftId: "quantity-trace-road",
      rawInput: "Дорога длина 1000 м ширина 6 м толщина 0.08 м",
      paramOverrides: {
        selectedRoadScope: {
          value: "ROAD_SURFACING_ONLY",
          source: "user_input",
          lastChangedAt: "2026-07-09T00:00:00.000Z",
        },
      },
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    const before = buildAiEstimateQuantityExplanationTrace({ revision });
    const beforeValidation = validateAiEstimateQuantityTrace({ revision });

    const result = applyAiEstimateParameterOverride({
      revision,
      operation: revision.params.length_m ? "update_param" : "add_param",
      paramKey: "length_m",
      rawValue: "1500 м",
      createdAt: "2026-07-09T00:01:00.000Z",
      revisionIndex: 2,
    });
    const after = buildAiEstimateQuantityExplanationTrace({ revision: result.revision });
    const afterValidation = validateAiEstimateQuantityTrace({ revision: result.revision });

    expect(beforeValidation.ok).toBe(true);
    expect(afterValidation.ok).toBe(true);
    expect(after?.traceUsesCurrentParameterValues).toBe(true);
    expect(result.diff.changedRowsCount).toBeGreaterThan(0);
    expect(JSON.stringify(after?.rows.map((row) => row.currentValuesSignature))).not.toBe(
      JSON.stringify(before?.rows.map((row) => row.currentValuesSignature)),
    );
  });

  it("binds passport q formulas to the same ordered primary input used by the compiler", () => {
    const revision = createEstimateDraftRevision({
      estimateDraftId: "quantity-trace-passport-primary",
      rawInput: "gravel base backfill 100 m2 length 20 m",
      selectedTemplateId:
        "earthworks_interior_gravel_base_backfill_large_area_professional_expanded_v1",
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    const areaTrace = revision.trace.params.find((param) => param.key === "area_m2");

    const result = applyAiEstimateParameterOverride({
      revision,
      operation: "update_param",
      paramKey: "area_m2",
      rawValue: "150 m2",
      createdAt: "2026-07-09T00:01:00.000Z",
      revisionIndex: 2,
    });

    expect(areaTrace?.affectsRowIds.length).toBeGreaterThan(0);
    expect(result.diff.changedRowsCount).toBeGreaterThan(0);
    expect(validateAiEstimateQuantityTrace({ revision: result.revision }).ok).toBe(true);
  });
});
