import { runProductionGradeCriticalCases } from "../../scripts/estimate/productionGradeLayerSealCore";

jest.setTimeout(120_000);

describe("production grade PDF and buyer handoff", () => {
  it("generates PDF from snapshot and buyer procurement subset for every critical case", () => {
    const proofs = runProductionGradeCriticalCases();

    expect(proofs.every((proof) => proof.snapshot_created)).toBe(true);
    expect(proofs.every((proof) => proof.snapshot_row_count === proof.row_count)).toBe(true);
    expect(proofs.every((proof) => proof.pdf_generated_from_snapshot)).toBe(true);
    expect(proofs.every((proof) => proof.pdf_rows_bound_to_snapshot)).toBe(true);
    expect(proofs.every((proof) => proof.pdf_storage_object_exists)).toBe(true);
    expect(proofs.every((proof) => proof.buyer_handoff_created)).toBe(true);
    expect(proofs.every((proof) => proof.buyer_handoff_procurement_subset_valid)).toBe(true);
    expect(proofs.every((proof) => proof.buyer_work_rows_count === 0)).toBe(true);
  });
});
