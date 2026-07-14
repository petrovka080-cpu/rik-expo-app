import {
  PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASES,
  runProfessionalBoqRuntimeContractCases,
} from "../../scripts/estimate/professionalBoqRuntimeContractCases";

describe("professional BOQ dangerous work policy", () => {
  it("keeps high-risk work estimable with visible risk and specialist notes", () => {
    const highRiskIds = new Set(
      PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASES
        .filter((testCase) => testCase.high_risk)
        .map((testCase) => testCase.case_id),
    );
    const highRiskProofs = runProfessionalBoqRuntimeContractCases()
      .filter((proof) => highRiskIds.has(proof.case_id));

    expect(highRiskProofs.length).toBeGreaterThan(0);
    for (const proof of highRiskProofs) {
      expect(proof.passed).toBe(true);
      expect(proof.dangerous_work_not_refused).toBe(true);
      expect(proof.risk_level).not.toBe("standard");
      expect(proof.risk_notes_visible).toBe(true);
      expect(proof.specialist_review_note_visible).toBe(true);
      expect(proof.pdf_generated_from_snapshot).toBe(true);
      expect(proof.buyer_handoff_procurement_subset_valid).toBe(true);
      expect(proof.final_contract_status_blocked_until_review).toBe(true);
    }
  });
});
