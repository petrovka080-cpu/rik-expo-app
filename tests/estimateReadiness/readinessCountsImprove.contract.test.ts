import {
  auditCatalogBackfillProgress,
  STOP_AI_ESTIMATE_CATALOG_BACKFILL_PROGRESS_FAILED,
} from "../../scripts/estimate/auditCatalogBackfillProgress";

jest.setTimeout(90000);

describe("readiness counts improve from P0 to full P0-P3", () => {
  it("reports structural progress without promoting templates lacking verified norm sources", () => {
    const progress = auditCatalogBackfillProgress();

    expect(progress.final_status).toBe(STOP_AI_ESTIMATE_CATALOG_BACKFILL_PROGRESS_FAILED);
    expect(progress.before.ready_professional_count).toBe(0);
    expect(progress.after.ready_professional_count).toBe(0);
    expect(progress.after.not_ready_count).toBe(10000);
    expect(progress.after.synthetic_family_default_count).toBeLessThan(progress.before.synthetic_family_default_count);
    expect(progress.after.templates_with_real_norm_sources_count).toBe(0);
    expect(progress.full_10000_real_norm_green_claimed).toBe(false);
    expect(progress.fake_green_claimed).toBe(false);
    expect(progress.blockers).toEqual(expect.arrayContaining([
      "ready_professional_count_not_increased",
      "full_10000_real_norm_green_not_reached",
    ]));
  });
});
