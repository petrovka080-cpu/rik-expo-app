import {
  buildAutonomousEstimatePriorityPlan,
  GREEN_AI_ESTIMATE_AUTONOMOUS_PRIORITY_PLAN_READY_NO_BUILDS,
} from "../../scripts/estimate/buildAutonomousEstimatePriorityPlan";

jest.setTimeout(180000);

describe("autonomous estimate priority plan", () => {
  it("selects full 10000 verification when no honest backfill counter remains", () => {
    const plan = buildAutonomousEstimatePriorityPlan({
      writeFiles: false,
      writeRuntime: false,
      runChildAudits: false,
      runBaselineAudits: false,
    });

    expect(plan.final_status).toBe(GREEN_AI_ESTIMATE_AUTONOMOUS_PRIORITY_PLAN_READY_NO_BUILDS);
    expect(plan.scoring_formula).toContain("priority_score = user_visible_broken_case_score*30");
    expect(plan.autonomous_priority_plan_created).toBe(true);
    expect(plan.next_batch_selected_by_score).toBe(true);
    expect(plan.priority_reasoning_written).toBe(true);
    expect(plan.selected_batch.batch_id).toBe("full-10000-verification");
    expect(plan.selected_batch.batch_type).toBe("infrastructure_blocker_batch");
    expect(plan.selected_batch.template_count).toBe(10000);
    expect(plan.selected_batch.expected_ready_delta).toBe(0);
    expect(plan.selected_batch.expected_generic_reduction).toBe(0);
    expect(plan.selected_batch_rendered_snapshot_count_target).toBe(10000);
    expect(plan.selected_batch_has_measurable_counter_delta).toBe(false);
    expect(plan.selected_batch_has_measurable_verification_delta).toBe(true);
    expect(plan.selected_batch_zero_delta_justified_by_full_green).toBe(true);
    expect(plan.full_10000_verification_selected_because_no_backfill_counter_remains).toBe(true);
    expect(plan.baseline_dashboard.manifest_total_templates).toBe(10000);
    expect(plan.baseline_dashboard.ready_professional_count).toBe(10000);
    expect(plan.baseline_dashboard.not_ready_count).toBe(0);
    expect(plan.baseline_dashboard.generic_norm_rows_count).toBe(0);
    expect(plan.baseline_dashboard.templates_with_real_norm_sources_count).toBe(10000);
    expect(plan.baseline_dashboard.grouped_by_work_family.length).toBeGreaterThanOrEqual(28);
    expect(plan.baseline_dashboard.grouped_by_category.length).toBeGreaterThan(0);
    expect(plan.baseline_dashboard.top_20_blocking_work_families).toEqual([]);
    expect(plan.baseline_dashboard.top_20_high_risk_generic_families).toEqual([]);
    expect(plan.baseline_dashboard.top_20_user_visible_broken_cases).toEqual([]);
    expect(plan.selected_batch_not_chosen_for_easy_fake_green).toBe(true);
    expect(plan.fake_green_claimed).toBe(false);
    expect(plan.marketplace_touched).toBe(false);
    expect(plan.blockers).toEqual([]);
  });
});
