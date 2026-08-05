import {
  auditCatalogBackfillProgress,
  STOP_AI_ESTIMATE_CATALOG_BACKFILL_PROGRESS_FAILED,
} from "../../scripts/estimate/auditCatalogBackfillProgress";
import {
  buildCatalogQualityDashboard,
  STOP_AI_ESTIMATE_CATALOG_QUALITY_DASHBOARD_FAILED,
} from "../../scripts/estimate/auditCatalogQualityDashboard";

jest.setTimeout(120000);

describe("catalog backfill progress dashboard", () => {
  it("keeps catalog mapping separate from unproven professional norms", () => {
    const progress = auditCatalogBackfillProgress();
    const dashboard = buildCatalogQualityDashboard({ writeFiles: false });

    expect(progress.final_status).toBe(STOP_AI_ESTIMATE_CATALOG_BACKFILL_PROGRESS_FAILED);
    expect(progress.before.ready_professional_count).toBe(0);
    expect(progress.after.ready_professional_count).toBe(0);
    expect(progress.after.not_ready_count).toBe(10000);
    expect(progress.after.synthetic_family_default_count).toBeLessThan(
      progress.before.synthetic_family_default_count,
    );
    expect(progress.full_10000_real_norm_green_claimed).toBe(false);
    expect(progress.blockers).toContain("full_10000_real_norm_green_not_reached");
    expect(dashboard.final_status).toBe(STOP_AI_ESTIMATE_CATALOG_QUALITY_DASHBOARD_FAILED);
    expect(dashboard.coverage.ready_professional_count).toBe(0);
    expect(dashboard.batches.p3_generic_fallback_count).toBe(0);
    expect(dashboard.full_10000_real_norm_green_claimed).toBe(false);
    expect(dashboard.blockers).toContain("catalog_backfill_batches_not_green");
  });
});
