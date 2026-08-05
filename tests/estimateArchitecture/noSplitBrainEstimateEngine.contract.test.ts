import {
  runEstimateEngineRoutingAudit,
  STOP_REAL_NORM_PACKS_NOT_COMPLETE_FOR_UNIFIED_ENGINE,
} from "../../scripts/estimate/auditEstimateEngineRouting";

describe("AI estimate engine routing architecture", () => {
  it("routes apartment through the 10000 project template group and still blocks green on norm coverage", () => {
    const summary = runEstimateEngineRoutingAudit({ writeSummary: false });

    expect(summary.final_status).toBe(STOP_REAL_NORM_PACKS_NOT_COMPLETE_FOR_UNIFIED_ENGINE);
    expect(summary.engine_routing_audit_exists).toBe(true);
    expect(summary.apartment_54_separate_path_detected).toBe(false);
    expect(summary.template10000_path_detected).toBe(true);
    expect(summary.split_brain_detected).toBe(false);
    expect(summary.green_blocked_until_unified).toBe(false);
    expect(summary.green_blocked_until_real_norm_packs).toBe(true);
    expect(summary.apartment_capital_renovation_known_by_10k_catalog).toBe(true);
    expect(summary.apartment_template_group_exists).toBe(true);
    expect(summary.apartment_template_group_has_child_templates).toBe(true);
    expect(summary.apartment_boq_represented_as_template_group).toBe(true);
    expect(summary.apartment_child_templates_bound_to_norms).toBe(true);
    expect(summary.apartment_uses_same_formula_engine_as_other_work_types).toBe(true);
    expect(summary.apartment_rows_have_same_trace_schema_as_10k).toBe(true);
    expect(summary.single_formula_engine_used).toBe(true);
    expect(summary.templates_with_separate_manual_path).toBe(0);
    expect(summary.cases_using_norm_packs_count).toBeGreaterThanOrEqual(5);
    expect(summary.cases_using_synthetic_family_default_count).toBe(0);
    expect(summary.real_standard_or_textbook_norms_required).toBe(true);
    expect(summary.generic_template_skeleton_not_accepted_as_real_estimate).toBe(true);
    expect(summary.every_work_type_requires_own_norm_pack).toBe(true);
    expect(summary.all_routing_cases_have_dedicated_norm_packs).toBe(false);
    expect(summary.all_routing_cases_use_standard_or_textbook_norms).toBe(false);
    expect(summary.paint_has_dedicated_template).toBe(true);
    expect(summary.screed_has_dedicated_template).toBe(true);
    expect(summary.fake_green_claimed).toBe(false);
  });

  it("records route evidence for apartment and core work types", () => {
    const summary = runEstimateEngineRoutingAudit({ writeSummary: false });
    const cases = new Map(summary.routing_cases.map((item) => [item.case_id, item]));

    expect(cases.get("apartment_54_capital")?.uses_apartment_domain_boq).toBe(false);
    expect(cases.get("apartment_54_capital")?.uses_10k_template_catalog).toBe(true);
    expect(cases.get("plaster_300_layer_20")?.uses_10k_template_catalog).toBe(true);
    expect(cases.get("masonry_400_gasblock_200")?.uses_10k_template_catalog).toBe(true);
    expect(cases.get("tile_45")?.uses_10k_template_catalog).toBe(true);
    expect(cases.get("drywall_partition_80")?.uses_10k_template_catalog).toBe(true);
    expect(cases.get("paint_200_two_coats")?.norm_group_mismatch).toBe(false);
    expect(cases.get("paint_200_two_coats")?.uses_norm_pack).toBe(true);
    expect(cases.get("screed_100_thickness_50")?.dedicated_work_type_match).toBe(true);
    expect(cases.get("screed_100_thickness_50")?.uses_norm_pack).toBe(true);
  });
});
