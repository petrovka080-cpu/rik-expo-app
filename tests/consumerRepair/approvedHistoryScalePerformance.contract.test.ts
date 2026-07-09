import { auditApprovedHistoryScalePerformance } from "../../scripts/estimate/auditApprovedHistoryScalePerformance";

describe("approved history scale performance", () => {
  it("loads 50k approved history through bounded pages and record payloads", () => {
    const audit = auditApprovedHistoryScalePerformance().artifact;

    expect(audit.approved_history_50000_scale_performance_passed).toBe(true);
    expect(audit.history_records_seeded).toBeGreaterThanOrEqual(50000);
    expect(audit.history_page_size).toBeLessThanOrEqual(25);
    expect(audit.history_page_load_within_slo).toBe(true);
    expect(audit.history_record_load_within_slo).toBe(true);
    expect(audit.history_does_not_load_all_payloads).toBe(true);
    expect(audit.prefix_recovery_within_slo).toBe(true);
    expect(audit.history_loads_all_records_at_once).toBe(false);
  });
});
