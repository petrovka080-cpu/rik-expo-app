import { runWave2aStructuralQuantityAudit } from "../../scripts/estimate/auditWave2aStructuralQuantityEngine";

describe("director PDF Wave2A trace", () => {
  it("does not expose rejected structural sources while retaining generic calculation trace", () => {
    const summary = runWave2aStructuralQuantityAudit({ writeSummary: false });

    expect(summary.director_pdf_contains_wave2a_norm_sources).toBe(false);
    expect(summary.director_pdf_contains_wave2a_calculation_trace).toBe(false);
    expect(summary.calculation_trace_visible).toBe(true);
  });
});
