import {
  auditCatalogBackfillProgress,
  GREEN_AI_ESTIMATE_CATALOG_BACKFILL_PROGRESS_READY_NO_BUILDS,
} from "../../scripts/estimate/auditCatalogBackfillProgress";

jest.setTimeout(90000);

describe("readiness counts improve from P0 to P1/P2", () => {
  it("increases ready count and decreases generic fallback without full 10k green", () => {
    const progress = auditCatalogBackfillProgress();

    expect(progress.final_status).toBe(GREEN_AI_ESTIMATE_CATALOG_BACKFILL_PROGRESS_READY_NO_BUILDS);
    expect(progress.after.ready_professional_count).toBeGreaterThan(progress.before.ready_professional_count);
    expect(progress.after.not_ready_count).toBeLessThan(progress.before.not_ready_count);
    expect(progress.after.generic_fallback_count).toBeLessThan(progress.before.generic_fallback_count);
    expect(progress.after.templates_with_real_norm_sources_count).toBe(8998);
    expect(progress.full_10000_real_norm_green_claimed).toBe(false);
  });
});
