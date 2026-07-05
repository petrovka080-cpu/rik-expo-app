import {
  runProductionGradeCriticalCases,
  summarizeProductionGradeCaseProofs,
  validateProductionGradeCriticalCases,
} from "../../scripts/estimate/productionGradeLayerSealCore";

jest.setTimeout(120_000);

describe("production grade /request runtime contract", () => {
  it("passes all 100 critical cases without empty, raw, refusal, PDF or buyer blockers", () => {
    const fixtureBlockers = validateProductionGradeCriticalCases();
    const proofs = runProductionGradeCriticalCases();
    const summary = summarizeProductionGradeCaseProofs(proofs);

    expect(fixtureBlockers).toEqual([]);
    expect(summary.critical_cases_passed).toBe(100);
    expect(summary.empty_estimate_count).toBe(0);
    expect(summary.refusal_count).toBe(0);
    expect(summary.drawings_required_stop_count).toBe(0);
    expect(summary.raw_dump_ui_count).toBe(0);
    expect(summary.pdf_missing_count).toBe(0);
    expect(summary.buyer_handoff_missing_count).toBe(0);
    expect(summary.wrong_units_count).toBe(0);
    expect(summary.blockers).toEqual([]);
  });
});
