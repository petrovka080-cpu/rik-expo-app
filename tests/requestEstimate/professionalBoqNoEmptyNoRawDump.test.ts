import { runProfessionalBoqRuntimeContractCases } from "../../scripts/estimate/professionalBoqRuntimeContractCases";

describe("/request professional BOQ no-empty/no-raw-dump contract", () => {
  it("does not expose empty estimates, refusals, drawings blockers or raw internal markers", () => {
    const proofs = runProfessionalBoqRuntimeContractCases();

    for (const proof of proofs) {
      expect(proof.passed).toBe(true);
      expect(proof.row_count).toBeGreaterThan(0);
      expect(proof.dangerous_work_not_refused).toBe(true);
      expect(proof.drawings_not_required_for_preliminary_boq).toBe(true);
      expect(proof.no_raw_dump).toBe(true);
      expect(proof.blocking_reasons).toEqual([]);
    }
  });
});
