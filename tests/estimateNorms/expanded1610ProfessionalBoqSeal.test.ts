import { runWave2CExpanded1610Summary } from "../../scripts/estimate/auditWave2CExpanded1610";

jest.setTimeout(180_000);

describe("Wave2C expanded 1610 professional BOQ seal", () => {
  it("seals expanded templates through real BOQ rows before final green gates are claimed", () => {
    const { summary } = runWave2CExpanded1610Summary();

    expect(summary.final_status).toBe("STOP_AI_ESTIMATE_WAVE2C_EXPANDED_1610_REAL_PROFESSIONAL_BOQ_INCOMPLETE_NO_GREEN");
    expect(summary.catalog_total_templates).toBe(11610);
    expect(summary.templates_audited).toBe(11610);
    expect(summary.ready_professional_boq_count).toBe(11610);
    expect(summary.blocked_templates_count).toBe(0);
    expect(summary.expanded_blocked_templates_before).toBe(1610);
    expect(summary.expanded_blocked_templates_after).toBe(0);
    expect(summary.template_only_generic_rows_before).toBe(1610);
    expect(summary.template_only_generic_rows_after).toBe(0);
    expect(summary.wrong_unit_rows_count).toBe(0);
    expect(summary.unknown_unit_rows_count).toBe(0);
    expect(summary.missing_norm_pack_count).toBe(0);
    expect(summary.missing_backend_compiled_rows_count).toBe(0);
    expect(summary.missing_material_rows_count).toBe(0);
    expect(summary.missing_pdf_mapping_count).toBe(0);
    expect(summary.missing_buyer_handoff_mapping_count).toBe(0);
    expect(summary.fake_price_count).toBe(0);
    expect(summary.fake_final_total_count).toBe(0);
    expect(summary.expanded_engine_used_by_truth_audit).toBe(true);
    expect(summary.expanded_templates_have_real_boq_rows).toBe(true);
    expect(summary.expanded_rows_have_norm_source).toBe(true);
    expect(summary.expanded_rows_have_formula_trace).toBe(true);
    expect(summary.expanded_pdf_mapping_valid).toBe(true);
    expect(summary.expanded_buyer_mapping_valid).toBe(true);
    expect(summary.full_10000_professional_boq_green_claimed).toBe(false);
    expect(summary.water_supply_expanded_templates_sealed).toBe(true);
    expect(summary.roadworks_expanded_templates_sealed).toBe(true);
    expect(summary.hydraulic_structures_expanded_templates_sealed).toBe(true);
    expect(summary.power_line_expanded_templates_sealed).toBe(true);
    expect(summary.high_rise_glazing_expanded_templates_sealed).toBe(true);
    expect(summary.mansard_roof_expanded_templates_sealed).toBe(true);
    expect(summary.bridge_tunnel_industrial_expanded_templates_sealed).toBe(true);
    expect(summary.expanded_grouped_ui_valid).toBe(true);
    expect(summary.pdf_rows_equal_snapshot_rows).toBe(true);
    expect(summary.buyer_handoff_procurement_subset_valid).toBe(true);
    expect(summary.buyer_work_rows_count).toBe(0);
    expect(summary.blocking_reasons).toEqual(expect.arrayContaining([
      "expanded_1610_tests_not_passed",
      "expanded_complex_tests_not_passed",
      "web_smoke_not_passed",
      "android_smoke_not_passed",
      "web_android_parity_not_passed",
    ]));
  });
});
