import { runProductionGradeCriticalCases } from "../../scripts/estimate/productionGradeLayerSealCore";

jest.setTimeout(120_000);

describe("production grade request estimate no-refusal policy", () => {
  it("does not refuse dangerous or complex work and does not require drawings as a stop condition", () => {
    const proofs = runProductionGradeCriticalCases();

    expect(proofs).toHaveLength(100);
    expect(proofs.every((proof) => proof.dangerous_work_not_refused)).toBe(true);
    expect(proofs.every((proof) => proof.drawings_not_required_for_preliminary_boq)).toBe(true);
    expect(proofs.every((proof) => proof.final_contract_status_blocked_until_review)).toBe(true);
    expect(proofs.every((proof) => proof.no_raw_dump)).toBe(true);
    expect(proofs.every((proof) => proof.no_fake_final_total_without_source)).toBe(true);
  });
});
