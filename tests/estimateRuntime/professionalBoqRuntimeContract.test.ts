import {
  PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASES,
  PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASE_SET,
  runProfessionalBoqRuntimeContractCases,
  type ProfessionalBoqRuntimeContractCaseProof,
} from "../../scripts/estimate/professionalBoqRuntimeContractCases";

describe("professional BOQ runtime contract", () => {
  let proofs: ProfessionalBoqRuntimeContractCaseProof[];

  beforeAll(() => {
    proofs = runProfessionalBoqRuntimeContractCases();
  });

  it("passes the 18-case runtime contract set", () => {
    const failed = proofs.filter((proof) => !proof.passed);

    expect(PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASE_SET).toBe("professional-boq-runtime-contract-18");
    expect(proofs).toHaveLength(PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASES.length);
    expect(failed).toEqual([]);
  });

  it("seals every runtime row with type, unit, norm provenance, trace and contract marker", () => {
    for (const proof of proofs) {
      expect(proof.row_count).toBeGreaterThan(0);
      expect(proof.all_rows_have_row_type).toBe(true);
      expect(proof.all_rows_have_canonical_unit).toBe(true);
      expect(proof.all_rows_have_norm_source).toBe(true);
      expect(proof.all_rows_have_calculation_trace).toBe(true);
      expect(proof.all_rows_have_runtime_contract_marker).toBe(true);
      expect(proof.no_fake_final_total_without_source).toBe(true);
    }
  });
});
