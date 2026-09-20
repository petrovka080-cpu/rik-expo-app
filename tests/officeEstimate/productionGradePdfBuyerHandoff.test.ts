import { runProductionGradeCriticalCases } from "../../scripts/estimate/productionGradeLayerSealCore";

jest.setTimeout(120_000);

describe("production grade PDF and buyer handoff", () => {
  it("generates PDF from snapshot and buyer procurement subset for every critical case", () => {
    const proofs = runProductionGradeCriticalCases();
    const estimateReady = proofs.filter((proof) => proof.expected_outcome === "estimate_ready");
    const needsInput = proofs.filter((proof) => proof.expected_outcome === "needs_input");

    expect(proofs).toHaveLength(100);
    expect(proofs.every((proof) => proof.passed)).toBe(true);
    expect(estimateReady).toHaveLength(99);
    expect(estimateReady.every((proof) => proof.snapshot_created)).toBe(true);
    expect(estimateReady.every((proof) => proof.snapshot_row_count === proof.row_count)).toBe(true);
    expect(estimateReady.every((proof) => proof.pdf_generated_from_snapshot)).toBe(true);
    expect(estimateReady.every((proof) => proof.pdf_rows_bound_to_snapshot)).toBe(true);
    expect(estimateReady.every((proof) => proof.pdf_storage_object_exists)).toBe(true);
    expect(estimateReady.every((proof) => proof.buyer_handoff_created)).toBe(true);
    expect(estimateReady.every((proof) => proof.buyer_handoff_procurement_subset_valid)).toBe(true);
    expect(estimateReady.every((proof) => proof.buyer_work_rows_count === 0)).toBe(true);
    expect(needsInput).toHaveLength(1);
    expect(needsInput[0]).toMatchObject({
      actual_outcome: "needs_input",
      row_count: 0,
      snapshot_created: false,
      pdf_storage_object_exists: false,
      buyer_handoff_created: false,
    });
  });
});
