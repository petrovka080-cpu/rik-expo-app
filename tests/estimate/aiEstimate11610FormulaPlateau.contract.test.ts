import { runProfessionalBoq11610FormulaInvariantMatrixShard } from "../../scripts/estimate/professionalBoq11610RegressionSealCore";

describe("AI estimate 11610 discrete formula plateau audit", () => {
  it("crosses a real ceil/min boundary before declaring a dependency broken", () => {
    const result = runProfessionalBoq11610FormulaInvariantMatrixShard(11540, 5);

    expect(result).toMatchObject({
      cases: 5,
      passed: 5,
      reasonedNonEditable: 0,
      unreasonedNonEditable: 0,
      invalidPostEditRows: 0,
      traceUpdated: true,
      pdfStale: true,
      buyerStale: true,
      plateauBoundaryProbes: 5,
      plateauBoundaryProbePasses: 5,
      failedEditableCases: [],
    });
  });
});
