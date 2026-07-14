import { runWave2aStructuralQuantityAudit } from "../../scripts/estimate/auditWave2aStructuralQuantityEngine";

describe("buyer receives Wave2A materials", () => {
  it("hands only procurement material rows and keeps quantities equal to the estimate", () => {
    const summary = runWave2aStructuralQuantityAudit({ writeSummary: false });

    expect(summary.buyer_receives_wave2a_material_rows_only).toBe(true);
    expect(summary.buyer_material_qty_matches_estimate).toBe(true);
  });
});
