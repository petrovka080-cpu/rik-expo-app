import { buildAiEstimateControlledPilotDryRunPlan } from "../../src/lib/platform/buildAiEstimateControlledPilotDryRunPlan";
import { validateAiEstimateControlledPilotDryRun } from "../../src/lib/platform/validateAiEstimateControlledPilotDryRun";
import {
  loadControlledPilotDryRunScenarios,
  validateControlledPilotDryRunScenarios,
} from "../../scripts/estimate/runControlledPilotDryRunScenarios";

describe("controlled pilot dry-run contract", () => {
  it("includes every required role and flow without faking owner approval or release", () => {
    const plan = buildAiEstimateControlledPilotDryRunPlan({ sourceSha: "test-source" });
    const validation = validateAiEstimateControlledPilotDryRun(plan);

    expect(validation.controlled_pilot_dry_run_contract_created).toBe(true);
    expect(validation.controlled_pilot_plan_created).toBe(true);
    expect(validation.consumer_flow_included).toBe(true);
    expect(validation.foreman_flows_included).toBe(true);
    expect(validation.director_flow_included).toBe(true);
    expect(validation.buyer_flow_included).toBe(true);
    expect(validation.history_flow_included).toBe(true);
    expect(validation.pdf_flow_included).toBe(true);
    expect(validation.kill_switch_flow_included).toBe(true);
    expect(validation.rollback_flow_included).toBe(true);
    expect(validation.owner_approval_not_faked).toBe(true);
    expect(validation.production_release_not_started).toBe(true);
    expect(validation.passed).toBe(true);
  });

  it("validates the 40-case controlled pilot dry-run corpus", () => {
    const validation = validateControlledPilotDryRunScenarios(loadControlledPilotDryRunScenarios());

    expect(validation.controlled_pilot_scenarios_created).toBe(true);
    expect(validation.dry_run_scenarios_total).toBeGreaterThanOrEqual(40);
    expect(validation.consumer_scenarios_count).toBeGreaterThanOrEqual(10);
    expect(validation.foreman_materials_scenarios_count).toBeGreaterThanOrEqual(10);
    expect(validation.foreman_subcontracts_scenarios_count).toBeGreaterThanOrEqual(10);
    expect(validation.director_scenarios_count).toBeGreaterThanOrEqual(5);
    expect(validation.buyer_scenarios_count).toBeGreaterThanOrEqual(5);
    expect(validation.critical_work_families_covered).toBe(true);
    expect(validation.passed).toBe(true);
  });
});
