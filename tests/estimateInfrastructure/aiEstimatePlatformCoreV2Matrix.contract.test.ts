import {
  GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX_HARNESS,
  runAiEstimatePlatformCoreV2MatrixHarness,
} from "../../scripts/estimate/runAiEstimatePlatformCoreV2MatrixHarness";

describe("AI estimate platform core v2 matrix", () => {
  it("separates client compatibility from backend-only routing and passes artifact, history and harness cases", async () => {
    const { summary, terminal } = await runAiEstimatePlatformCoreV2MatrixHarness();

    expect(terminal).toMatchObject({
      schema: "ai-estimate-platform-core-v2-matrix-harness-terminal/v1",
      status: "GREEN",
      exit_code: 0,
      close_observed: true,
      timed_out: false,
      within_technical_deadline: true,
      orphan_detected: false,
      termination_attempted: false,
      termination_succeeded: false,
    });
    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX_HARNESS);
    expect(summary.catalog_coverage).toBe("11610/11610");
    expect(summary.random_create_draft_cases_passed).toBe("1000/1000");
    expect(summary.random_client_compile_cases_passed).toBe("793/793");
    expect(summary.random_backend_only_honestly_blocked_cases_passed).toBe("207/207");
    expect(summary.random_client_needs_input_honestly_blocked_cases).toBe(2);
    expect(summary.random_client_needs_input_honestly_blocked_template_ids).toEqual([
      "bridge_asphalt_rom_concept_expanded_complex_v1",
      "pumping_station_as_built_estimate_expanded_complex_v1",
    ]);
    expect(summary.critical_client_compile_cases_passed).toBe("155/155");
    expect(summary.critical_backend_only_honestly_blocked_cases_passed).toBe("45/45");
    expect(summary.critical_client_needs_input_honestly_blocked_cases).toBe(0);
    expect(summary.critical_client_needs_input_honestly_blocked_template_ids).toEqual([]);
    expect(summary.transferred_backend_only_route_cases).toEqual([
      {
        source_template_id: "drywall_ceiling_interior_bulkhead_clad_large_area_professional_expanded_v1",
        expected_catalog_id: "drywall_ceiling_interior_bulkhead_clad_large_area",
        expected_domain_id: "interior_finishes",
        resolved_catalog_id: "drywall_ceiling_interior_bulkhead_clad_large_area",
        resolved_domain_id: "interior_finishes",
        critical_sampled: true,
        registered_backend_only: true,
        client_status: "failed",
        client_row_count: 0,
        client_alternate_compile_detected: false,
        outcome: "registered_backend_only_honestly_blocked",
        passed: true,
      },
      {
        source_template_id: "drywall_ceiling_interior_curve_clad_large_area_professional_expanded_v1",
        expected_catalog_id: "drywall_ceiling_interior_curve_clad_large_area",
        expected_domain_id: "interior_finishes",
        resolved_catalog_id: "drywall_ceiling_interior_curve_clad_large_area",
        resolved_domain_id: "interior_finishes",
        critical_sampled: true,
        registered_backend_only: true,
        client_status: "failed",
        client_row_count: 0,
        client_alternate_compile_detected: false,
        outcome: "registered_backend_only_honestly_blocked",
        passed: true,
      },
    ]);
    expect(summary.parameter_override_cases_passed).toBe("200/200");
    expect(summary.parameter_override_executed_cases_passed).toBe("154/154");
    expect(summary.parameter_override_backend_only_honestly_blocked_cases_passed).toBe("46/46");
    expect(summary.random_create_draft_failures).toEqual([]);
    expect(summary.parameter_override_failures).toEqual([]);
    expect(summary.artifact_ready_cases + summary.artifact_needs_input_honestly_blocked_cases).toBe(100);
    expect(summary.artifact_needs_input_honestly_blocked_template_ids).toEqual([]);
    expect(summary.pdf_snapshot_parity_cases_passed).toBe(
      `${summary.artifact_ready_cases}/${summary.artifact_ready_cases}`,
    );
    expect(summary.buyer_package_parity_cases_passed).toBe(
      `${summary.artifact_ready_cases}/${summary.artifact_ready_cases}`,
    );
    expect(summary.web_smoke_cases_passed).toBe("100/100");
    expect(summary.android_smoke_cases_passed).toBe("100/100");
  }, 600_000);
});
