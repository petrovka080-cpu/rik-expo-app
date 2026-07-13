import {
  runCatalogBackfillBatch,
  GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCH_RUNNER_READY_NO_BUILDS,
} from "../../scripts/estimate/runCatalogBackfillBatch";
import {
  validateCatalogBackfillBatch,
  GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCH_READY_NO_BUILDS,
} from "../../scripts/estimate/validateCatalogBackfillBatch";

jest.setTimeout(120000);

describe("catalog backfill conveyor", () => {
  it("runs and validates the P1 high-volume repair batch idempotently", () => {
    const run = runCatalogBackfillBatch("p1-high-volume-repair", { verify: true, writeFiles: false });
    const validation = validateCatalogBackfillBatch("p1-high-volume-repair");

    expect(run.final_status).toBe(GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCH_RUNNER_READY_NO_BUILDS);
    expect(run.batch_runner_idempotent).toBe(true);
    expect(run.batch_runner_does_not_touch_marketplace).toBe(true);
    expect(run.batch_runner_does_not_generate_fake_sources).toBe(true);
    expect(validation.final_status).toBe(GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCH_READY_NO_BUILDS);
    expect(validation.template_count).toBe(4222);
    expect(validation.ready_professional_count).toBe(4222);
    expect(validation.generic_fallback_count).toBe(0);
  });
});
