import { runWave2aStructuralQuantityAudit } from "../../scripts/estimate/auditWave2aStructuralQuantityEngine";

describe("director PDF Wave2A trace", () => {
  it("exposes Wave2A norm sources and calculation trace in the director handoff path", () => {
    const summary = runWave2aStructuralQuantityAudit({ writeSummary: false });

    expect(summary.director_pdf_contains_wave2a_norm_sources).toBe(true);
    expect(summary.director_pdf_contains_wave2a_calculation_trace).toBe(true);
    expect(summary.calculation_trace_visible).toBe(true);
  });
});
