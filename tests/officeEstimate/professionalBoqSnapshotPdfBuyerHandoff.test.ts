import { runProfessionalBoqRuntimeContractCases } from "../../scripts/estimate/professionalBoqRuntimeContractCases";

describe("professional BOQ snapshot, PDF and buyer handoff", () => {
  it("binds every runtime estimate to approved snapshot, PDF rows and procurement-only handoff", () => {
    const proofs = runProfessionalBoqRuntimeContractCases();

    for (const proof of proofs) {
      expect(proof.passed).toBe(true);
      expect(proof.snapshot_created).toBe(true);
      expect(proof.snapshot_row_count).toBe(proof.row_count);
      expect(proof.pdf_generated_from_snapshot).toBe(true);
      expect(proof.pdf_rows_bound_to_snapshot).toBe(true);
      expect(proof.pdf_storage_object_exists).toBe(true);
      expect(proof.buyer_handoff_created).toBe(true);
      expect(proof.buyer_handoff_procurement_subset_valid).toBe(true);
      expect(proof.buyer_work_rows_count).toBe(0);
    }
  });
});
