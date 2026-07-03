import {
  auditCatalogBackfillProgress,
  GREEN_AI_ESTIMATE_CATALOG_BACKFILL_PROGRESS_READY_NO_BUILDS,
} from "../../scripts/estimate/auditCatalogBackfillProgress";
import {
  buildCatalogQualityDashboard,
  GREEN_AI_ESTIMATE_CATALOG_QUALITY_DASHBOARD_READY_NO_BUILDS,
} from "../../scripts/estimate/auditCatalogQualityDashboard";

jest.setTimeout(120000);

describe("catalog backfill progress dashboard", () => {
  it("shows P1/P2 progress without turning P3 into fake green", () => {
    const progress = auditCatalogBackfillProgress();
    const dashboard = buildCatalogQualityDashboard({ writeFiles: false });

    expect(progress.final_status).toBe(GREEN_AI_ESTIMATE_CATALOG_BACKFILL_PROGRESS_READY_NO_BUILDS);
    expect(progress.before.ready_professional_count).toBe(3430);
    expect(progress.after.ready_professional_count).toBe(8998);
    expect(progress.after.not_ready_count).toBe(1002);
    expect(progress.generic_count_decreases).toBe(true);
    expect(dashboard.final_status).toBe(GREEN_AI_ESTIMATE_CATALOG_QUALITY_DASHBOARD_READY_NO_BUILDS);
    expect(dashboard.coverage.ready_professional_count).toBe(8998);
    expect(dashboard.batches.p3_generic_fallback_count).toBe(1002);
    expect(dashboard.full_10000_real_norm_green_claimed).toBe(false);
  });
});
