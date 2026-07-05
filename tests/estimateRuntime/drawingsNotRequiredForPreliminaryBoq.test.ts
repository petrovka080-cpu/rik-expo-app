import { runProfessionalBoqRuntimeContractCases } from "../../scripts/estimate/professionalBoqRuntimeContractCases";

describe("professional BOQ drawings and missing input policy", () => {
  it("builds preliminary BOQ from prompt and assumptions without a drawings stop", () => {
    const proofs = runProfessionalBoqRuntimeContractCases();

    for (const proof of proofs) {
      expect(proof.passed).toBe(true);
      expect(proof.drawings_not_required_for_preliminary_boq).toBe(true);
      expect(proof.professional_defaults_applied).toBe(true);
      expect(proof.assumptions_visible).toBe(true);
      expect(proof.missing_inputs_visible).toBe(true);
      expect(proof.missing_inputs_count).toBeGreaterThan(0);
      expect(proof.final_contract_status_blocked_until_review).toBe(true);
    }
  });
});
