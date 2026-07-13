import {
  PRODUCTION_GRADE_COVERAGE_GROUPS,
  runProductionGradeCriticalCases,
} from "../../scripts/estimate/productionGradeLayerSealCore";

jest.setTimeout(120_000);

describe("production grade family calculator runtime coverage", () => {
  it("covers each production-grade work group with traceable calculator-backed rows", () => {
    const proofs = runProductionGradeCriticalCases();

    expect(proofs).toHaveLength(100);
    for (const group of PRODUCTION_GRADE_COVERAGE_GROUPS) {
      const groupProofs = proofs.filter((proof) => proof.coverage_group === group);
      expect(groupProofs).toHaveLength(10);
      expect(groupProofs.every((proof) => proof.passed)).toBe(true);
      expect(groupProofs.every((proof) => proof.actual_family === proof.expected_family)).toBe(true);
    }
    expect(proofs.some((proof) => proof.high_risk_contract_present && proof.risk_level !== "standard")).toBe(true);
  });
});
