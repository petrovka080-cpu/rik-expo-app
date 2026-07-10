import { auditAiQualityDrift, GREEN_AI_QUALITY_DRIFT_AUDIT } from "../../scripts/aiPlatform/auditAiQualityDrift";

describe("AI EvalOps quality drift guard", () => {
  it("detects work, parameter, missing-input, BOQ, quantity, Russian UI, policy and cost drift", () => {
    const { summary } = auditAiQualityDrift({ writeSummary: false });

    expect(summary.final_status).toBe(GREEN_AI_QUALITY_DRIFT_AUDIT);
    expect(summary.ai_quality_drift_detector_created).toBe(true);
    expect(summary.eval_run_comparison_created).toBe(true);
    expect(summary.work_family_drift_detected).toBe(true);
    expect(summary.parameter_drift_detected).toBe(true);
    expect(summary.missing_question_drift_detected).toBe(true);
    expect(summary.boq_drift_detected).toBe(true);
    expect(summary.quantity_trace_drift_detected).toBe(true);
    expect(summary.russian_ui_drift_detected).toBe(true);
    expect(summary.policy_drift_detected).toBe(true);
    expect(summary.cost_latency_drift_detected).toBe(true);
    expect(summary.quality_score_drift_detected).toBe(true);
    expect(summary.drift_requires_explicit_acceptance_or_stop).toBe(true);
    expect(summary.blockers).toEqual([]);
  });
});
