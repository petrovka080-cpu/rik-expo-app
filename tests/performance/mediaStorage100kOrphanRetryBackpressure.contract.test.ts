import {
  MEDIA_STORAGE_100K_GREEN_STATUS,
  buildMediaStorage100kReport,
} from "../../scripts/audit/mediaStorage100k.shared";

describe("media storage 100k orphan/retry/backpressure proof", () => {
  it("proves bounded indexed cleanup and retry paths for the 100k storage baseline", () => {
    const report = buildMediaStorage100kReport();

    expect(report.matrix.final_status).toBe(MEDIA_STORAGE_100K_GREEN_STATUS);
    expect(report.matrix.fixture_media_rows).toBe(100_000);
    expect(report.matrix.fixture_processing_jobs).toBe(200_000);
    expect(report.matrix.orphan_cleanup_queue_ready).toBe(true);
    expect(report.matrix.orphan_detection_bounded).toBe(true);
    expect(report.matrix.cleanup_claim_bounded).toBe(true);
    expect(report.matrix.processing_backpressure_ready).toBe(true);
    expect(report.matrix.retry_dead_letter_ready).toBe(true);
    expect(report.matrix.skip_locked_claims_present).toBe(true);
  });
});
