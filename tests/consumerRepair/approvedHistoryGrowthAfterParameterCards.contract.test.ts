import {
  auditApprovedHistoryGrowthAfterParameterCards,
  GREEN_APPROVED_HISTORY_GROWTH_AFTER_PARAMETER_CARDS_READY,
} from "../../scripts/estimate/auditApprovedHistoryGrowthAfterParameterCards";

describe("approved history growth after parameter cards", () => {
  it("does not cap approved estimates at 13 and survives compaction", async () => {
    const { summary } = await auditApprovedHistoryGrowthAfterParameterCards();

    expect(summary.final_status).toBe(GREEN_APPROVED_HISTORY_GROWTH_AFTER_PARAMETER_CARDS_READY);
    expect(summary.history_count_reaches_14).toBe(true);
    expect(summary.history_count_reaches_25).toBe(true);
    expect(summary.history_count_reaches_100).toBe(true);
    expect(summary.history_persists_after_reload).toBe(true);
    expect(summary.history_persists_after_storage_compaction).toBe(true);
    expect(summary.history_count_stuck_at_13).toBe(false);
  });
});
