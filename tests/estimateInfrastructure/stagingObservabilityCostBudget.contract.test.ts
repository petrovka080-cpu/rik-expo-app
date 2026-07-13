import { auditStagingAiEstimateObservability } from "../../scripts/estimate/auditStagingAiEstimateObservability";

describe("staging observability and cost budget", () => {
  it("requires telemetry events redaction cost budget latency SLO and alerts", () => {
    const { summary } = auditStagingAiEstimateObservability({ writeSummary: false });

    expect(summary.staging_observability_created).toBe(true);
    expect(summary.staging_ai_run_events_emitted).toBe(true);
    expect(summary.staging_estimate_events_emitted).toBe(true);
    expect(summary.staging_pdf_buyer_events_emitted).toBe(true);
    expect(summary.staging_kill_switch_events_emitted).toBe(true);
    expect(summary.staging_rollback_events_emitted).toBe(true);
    expect(summary.staging_cost_budget_enforced).toBe(true);
    expect(summary.staging_latency_slo_enforced).toBe(true);
    expect(summary.staging_alert_rules_created).toBe(true);
    expect(summary.pii_redaction_passed).toBe(true);
    expect(summary.full_prompt_not_logged_unredacted).toBe(true);
    expect(summary.tokens_not_logged).toBe(true);
  });
});
