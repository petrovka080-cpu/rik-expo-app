import {
  PRODUCTION_GRADE_CRITICAL_CASE_SET,
  loadProductionGradeCriticalCases,
  productionGradeCorpusFingerprint,
  validateProductionGradeCriticalCases,
} from "../../scripts/estimate/productionGradeLayerSealCore";

describe("production grade Web/Android contract corpus", () => {
  it("uses one stable 100-case corpus for Web and Android smoke runners", () => {
    const cases = loadProductionGradeCriticalCases();

    expect(validateProductionGradeCriticalCases()).toEqual([]);
    expect(PRODUCTION_GRADE_CRITICAL_CASE_SET).toBe("production-grade-critical");
    expect(cases).toHaveLength(100);
    expect(new Set(cases.map((testCase) => testCase.case_id)).size).toBe(100);
    expect(productionGradeCorpusFingerprint(cases)).toContain(cases[0].case_id);
    const estimateReady = cases.filter((testCase) => testCase.expected_outcome !== "needs_input");
    const needsInput = cases.filter((testCase) => testCase.expected_outcome === "needs_input");
    expect(estimateReady).toHaveLength(99);
    expect(estimateReady.every((testCase) => testCase.pdf_required && testCase.buyer_handoff_required)).toBe(true);
    expect(needsInput).toHaveLength(1);
    expect(needsInput[0]).toMatchObject({
      case_id: "pg-w2c-w2c-water-004",
      pdf_required: false,
      buyer_handoff_required: false,
    });
  });
});
