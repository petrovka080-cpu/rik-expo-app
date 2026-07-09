import {
  auditConsumerRepairDurableSaveFallback,
  GREEN_CONSUMER_REPAIR_DURABLE_SAVE_FALLBACK_READY,
} from "../../scripts/estimate/auditConsumerRepairDurableSaveFallback";

describe("consumer repair durable save fallback", () => {
  it("keeps current draft and approved history under storage pressure", () => {
    const { summary } = auditConsumerRepairDurableSaveFallback();

    expect(summary.final_status).toBe(GREEN_CONSUMER_REPAIR_DURABLE_SAVE_FALLBACK_READY);
    expect(summary.CONSUMER_REPAIR_DURABLE_SAVE_FAILED_no_longer_crashes_request).toBe(true);
    expect(summary.approved_history_preserved_under_storage_pressure).toBe(true);
    expect(summary.current_draft_preserved_under_storage_pressure).toBe(true);
    expect(summary.fallback_emits_redacted_diagnostic_event).toBe(true);
    expect(summary.approved_history_deleted_by_fallback).toBe(false);
  });
});
