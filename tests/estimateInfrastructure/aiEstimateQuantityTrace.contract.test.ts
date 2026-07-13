import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { applyAiEstimateParameterOverride } from "../../src/lib/estimate/applyAiEstimateParameterOverrides";
import { buildAiEstimateQuantityExplanationTrace } from "../../src/lib/estimate/buildAiEstimateQuantityExplanationTrace";
import { validateAiEstimateQuantityTrace } from "../../src/lib/estimate/validateAiEstimateQuantityTrace";

describe("AI estimate quantity explanation trace", () => {
  it("uses current parameter values and updates after an edit", () => {
    const revision = createEstimateDraftRevision({
      estimateDraftId: "quantity-trace-road",
      rawInput: "Дорога длина 1000 м ширина 6 м толщина 0.08 м",
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
});
