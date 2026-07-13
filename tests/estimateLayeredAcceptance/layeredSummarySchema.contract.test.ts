import {
  LAYER_ORDER,
  type RawLayerEvaluation,
} from "../../scripts/estimate/assertEstimateLayerDependencies";
import {
  GREEN_AI_ESTIMATE_LAYERED_ACCEPTANCE_MATRIX_COMMITTED_NO_BUILDS,
  buildEstimateLayeredAcceptanceReport,
} from "../../scripts/estimate/buildEstimateLayeredAcceptanceReport";

function syntheticGreenLayers(): RawLayerEvaluation[] {
  return LAYER_ORDER.map((layerId) => ({
    layer_id: layerId,
    passed: true,
    blockers: [],
    evidence: {
      ...(layerId === "L5_NPLUS_UNIFIED_CATALOG"
        ? {
          catalog_total_templates: 11610,
          ready_professional_count: 11610,
          not_ready_count: 0,
          generic_fallback_count: 0,
          names_only_template_count: 0,
        }
        : {}),
      ...(layerId === "L9_WEB_ANDROID_CONTROLLED_PILOT"
        ? {
          actual_web_browser_controlled_pilot_smoke_passed: true,
          actual_android_emulator_controlled_pilot_smoke_passed: true,
          route_equivalent_not_reported_as_real_browser: true,
          metrics: {
            web_cases_total: 50,
            web_cases_passed: 50,
            android_cases_total: 50,
            android_cases_passed: 50,
            console_error_count: 0,
            android_console_error_count: 0,
          },
        }
        : {}),
    },
  }));
}

describe("estimate layered summary schema", () => {
  it("writes the required green summary shape when every layer and source gate passes", () => {
    const report = buildEstimateLayeredAcceptanceReport({
      requireGitClean: false,
      requireRuntimeEvidence: false,
      requireSourceGates: true,
      rawLayerEvaluations: syntheticGreenLayers(),
      sourceGates: {
        layered_acceptance_tests_passed: true,
        typecheck_passed: true,
        lint_passed: true,
        diff_check_passed: true,
        no_test_weakening_passed: true,
        web_public_smoke_passed: true,
        ci_office_market_passed: true,
        secret_scan_passed: true,
      },
      writeRuntime: false,
    });

    expect(report.final_status).toBe(GREEN_AI_ESTIMATE_LAYERED_ACCEPTANCE_MATRIX_COMMITTED_NO_BUILDS);
    expect(report.all_layers_passed).toBe(true);
    expect(report.upper_layers_not_green_without_dependencies).toBe(true);
    expect(report.catalog_total_templates).toBe(11610);
    expect(report.ready_professional_count).toBe(11610);
    expect(report.actual_web_browser_controlled_pilot_smoke_passed).toBe(true);
    expect(report.actual_android_emulator_controlled_pilot_smoke_passed).toBe(true);
    expect(report.fake_green_claimed).toBe(false);
    expect(report.native_build_started).toBe(false);
    expect(report.full_jest_started).toBe(false);
  });
});
