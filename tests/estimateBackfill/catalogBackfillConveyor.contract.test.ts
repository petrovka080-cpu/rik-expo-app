import {
  runCatalogBackfillBatch,
  STOP_AI_ESTIMATE_CATALOG_BACKFILL_BATCH_RUNNER_FAILED,
} from "../../scripts/estimate/runCatalogBackfillBatch";
import {
  validateCatalogBackfillBatch,
  STOP_AI_ESTIMATE_CATALOG_BACKFILL_BATCH_FAILED,
} from "../../scripts/estimate/validateCatalogBackfillBatch";

jest.setTimeout(120000);

describe("catalog backfill conveyor", () => {
  it("runs P1 idempotently without promoting generic evidence to professional norms", () => {
    const run = runCatalogBackfillBatch("p1-high-volume-repair", { verify: true, writeFiles: false });
    const validation = validateCatalogBackfillBatch("p1-high-volume-repair");

    expect(run.final_status).toBe(STOP_AI_ESTIMATE_CATALOG_BACKFILL_BATCH_RUNNER_FAILED);
    expect(run.batch_runner_idempotent).toBe(true);
    expect(run.batch_runner_does_not_touch_marketplace).toBe(true);
    expect(run.batch_runner_does_not_generate_fake_sources).toBe(true);
    expect(run.full_10000_real_norm_green_claimed).toBe(false);
    expect(validation.final_status).toBe(STOP_AI_ESTIMATE_CATALOG_BACKFILL_BATCH_FAILED);
    expect(validation.template_count).toBe(4127);
    expect(validation.ready_professional_count).toBe(0);
    expect(validation.generic_fallback_count).toBe(0);
    expect(validation.full_10000_real_norm_green_claimed).toBe(false);
    expect(validation.blockers).toContain("batch_ready_professional_count:0/4127");
  });
});
