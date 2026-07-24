import { GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_11610_SOURCE_READY } from "../../scripts/estimate/audit11610TrustedCostingPricebook";
import { runEstimateRuntimeAuditSummary } from "./estimateRuntimeAuditTestHelpers";

type TrustedCostingAuditSummary = {
  source_audit_status: string;
  templates_audited: number;
  templates_costing_ready: number;
  templates_price_input_required: number;
  templates_deterministic_costing_outcome_ready: number;
  distinct_professional_passports_audited: number;
  distinct_professional_passports_costing_ready: number;
  blocked_templates_count: number;
  priced_required_rows_percent_average: number;
  priority_critical_cases_priced_percent: number;
  fake_price_count: number;
  fake_subtotal_count: number;
  fake_final_total_count: number;
  price_state_present_for_all_rows: boolean;
  missing_price_visible_for_all_unpriced_rows: boolean;
  preliminary_cost_available_templates_count: number;
  contract_total_allowed_templates_count: number;
  priority_runtime_cases_audited: number;
  priority_runtime_cases_costing_ready: number;
  priority_runtime_cases_price_input_required: number;
  priority_runtime_cases_outcome_ready: number;
  diamond_drilling_costing_outcome_ready: boolean;
  profile_sheet_fence_costing_outcome_ready: boolean;
  ventilated_facade_costing_outcome_ready: boolean;
  water_supply_costing_outcome_ready: boolean;
  roadworks_costing_outcome_ready: boolean;
  hydraulic_structures_costing_outcome_ready: boolean;
  power_lines_costing_outcome_ready: boolean;
  high_rise_glazing_costing_outcome_ready: boolean;
  mansard_roof_costing_outcome_ready: boolean;
  bridge_tunnel_industrial_costing_outcome_ready: boolean;
  blocking_reasons: string[];
};

describe("full 11610 trusted costing source audit", () => {
  jest.setTimeout(360_000);

  it("routes every BOQ to a sourced preliminary cost or an exact required-price input without claiming contract totals", () => {
    const summary = runEstimateRuntimeAuditSummary<TrustedCostingAuditSummary>("trusted-costing-pricebook-source-audit");

    expect(summary.source_audit_status).toBe(GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_11610_SOURCE_READY);
    expect(summary.templates_audited).toBe(11610);
    expect(summary.templates_costing_ready).toBeGreaterThan(0);
    expect(summary.templates_price_input_required).toBeGreaterThan(0);
    expect(
      summary.templates_costing_ready + summary.templates_price_input_required,
    ).toBe(11610);
    expect(summary.templates_deterministic_costing_outcome_ready).toBe(11610);
    expect(summary.distinct_professional_passports_audited).toBe(12);
    expect(summary.distinct_professional_passports_costing_ready).toBe(12);
    expect(summary.blocked_templates_count).toBe(0);
    expect(summary.priced_required_rows_percent_average).toBeGreaterThanOrEqual(80);
    expect(summary.priority_critical_cases_priced_percent).toBeGreaterThan(0);
    expect(summary.priority_critical_cases_priced_percent).toBeLessThan(95);
    expect(summary.fake_price_count).toBe(0);
    expect(summary.fake_subtotal_count).toBe(0);
    expect(summary.fake_final_total_count).toBe(0);
    expect(summary.price_state_present_for_all_rows).toBe(true);
    expect(summary.missing_price_visible_for_all_unpriced_rows).toBe(true);
    expect(summary.preliminary_cost_available_templates_count).toBe(summary.templates_costing_ready);
    expect(summary.contract_total_allowed_templates_count).toBe(0);
    expect(summary.priority_runtime_cases_audited).toBe(100);
    expect(summary.priority_runtime_cases_costing_ready).toBeGreaterThan(0);
    expect(summary.priority_runtime_cases_price_input_required).toBeGreaterThan(0);
    expect(
      summary.priority_runtime_cases_costing_ready +
      summary.priority_runtime_cases_price_input_required,
    ).toBe(100);
    expect(summary.priority_runtime_cases_outcome_ready).toBe(100);
    expect(summary.diamond_drilling_costing_outcome_ready).toBe(true);
    expect(summary.profile_sheet_fence_costing_outcome_ready).toBe(true);
    expect(summary.ventilated_facade_costing_outcome_ready).toBe(true);
    expect(summary.water_supply_costing_outcome_ready).toBe(true);
    expect(summary.roadworks_costing_outcome_ready).toBe(true);
    expect(summary.hydraulic_structures_costing_outcome_ready).toBe(true);
    expect(summary.power_lines_costing_outcome_ready).toBe(true);
    expect(summary.high_rise_glazing_costing_outcome_ready).toBe(true);
    expect(summary.mansard_roof_costing_outcome_ready).toBe(true);
    expect(summary.bridge_tunnel_industrial_costing_outcome_ready).toBe(true);
    expect(summary.blocking_reasons).toEqual([]);
  });
});
