import { runProductionGradeCriticalCases } from "../../scripts/estimate/productionGradeLayerSealCore";

jest.setTimeout(120_000);

describe("production grade grouped request estimate UI model", () => {
  it("builds grouped sections and editable rows for every critical case", () => {
    const proofs = runProductionGradeCriticalCases();
    const estimateReady = proofs.filter((proof) => proof.expected_outcome === "estimate_ready");
    const needsInput = proofs.filter((proof) => proof.expected_outcome === "needs_input");

    expect(estimateReady).toHaveLength(99);
    expect(estimateReady.every((proof) => proof.grouped_sections_count > 0)).toBe(true);
    expect(estimateReady.every((proof) => proof.assumption_rows_count > 0)).toBe(true);
    expect(estimateReady.every((proof) => proof.work_rows_count > 0)).toBe(true);
    expect(estimateReady.every((proof) => proof.material_rows_count > 0)).toBe(true);
    expect(estimateReady.every((proof) => proof.required_row_types_present)).toBe(true);
    expect(estimateReady.every((proof) => proof.expected_units_present)).toBe(true);
    expect(estimateReady.every((proof) => proof.forbidden_units_absent)).toBe(true);
    expect(needsInput).toHaveLength(1);
    expect(needsInput[0]).toMatchObject({
      actual_outcome: "needs_input",
      row_count: 0,
      snapshot_created: false,
      pdf_storage_object_exists: false,
      buyer_handoff_created: false,
    });
    expect(needsInput[0].missing_inputs_count).toBeGreaterThan(0);
  });
});
