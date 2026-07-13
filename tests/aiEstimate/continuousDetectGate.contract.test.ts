import {
  buildContinuousAiEstimateHeadlessSummary,
  GREEN_AI_ESTIMATE_CONTINUOUS_DETECT_GATE,
} from "../../src/lib/ai/estimateContinuousDetection";

jest.setTimeout(60_000);

describe("continuous AI estimate detect gate", () => {
  it("requires before/after fake detection, starter matrix, history, PDF, buyer, and 10000 template validation", () => {
    const summary = buildContinuousAiEstimateHeadlessSummary({
      phase: "post-fix",
      changedFiles: [
        "src/lib/ai/estimateCompiler/expandedEstimateCompiler.ts",
        "src/lib/ai/estimateContinuousDetection/continuousAiEstimateDetector.ts",
        "scripts/e2e/runAiEstimateContinuousDetectGate.ts",
      ],
    });

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_CONTINUOUS_DETECT_GATE);
    expect(summary.continuous_detect_loop_exists).toBe(true);
    expect(summary.detect_before_fix_done).toBe(true);
    expect(summary.detect_after_fix_done).toBe(true);
    expect(summary.before_fake_rows_detected).toBe(true);
    expect(summary.after_fake_rows_absent).toBe(true);
    expect(summary.before_detector.failure_ids).toEqual(expect.arrayContaining([
      "all_rows_quantity_equal_input_area",
      "all_rows_unit_m2",
      "default_price_980",
      "calculated_row_without_formula_id",
      "calculated_row_without_calculation_trace",
      "calculated_row_without_template_version",
    ]));
    expect(summary.remaining_failure_ids).toEqual([]);

    expect(summary.starter_detector_matrix_passed).toBe(true);
    expect(summary.prompt_results.every((result) => result.failures.length === 0)).toBe(true);
    expect(summary.apartment_54_real_quantities_detected).toBe(true);
    expect(summary.apartment_54_units_correct).toBe(true);
    expect(summary.apartment_54_trace_correct).toBe(true);
    expect(summary.all_10000_templates_boq_validation_passed).toBe(true);
    expect(summary.templates_validated_count).toBeGreaterThanOrEqual(10_000);
    expect(summary.templates_failed_count).toBe(0);

    expect(summary.legacy_fake_revisions_not_marked_professional).toBe(true);
    expect(summary.director_pdf_no_fake_rows).toBe(true);
    expect(summary.director_pdf_no_raw_ai_json).toBe(true);
    expect(summary.buyer_receives_material_rows_only).toBe(true);
    expect(summary.buyer_fake_rows_excluded).toBe(true);
    expect(summary.changed_files.changed_estimate_files).toEqual(expect.arrayContaining([
      "src/lib/ai/estimateCompiler/expandedEstimateCompiler.ts",
      "scripts/e2e/runAiEstimateContinuousDetectGate.ts",
    ]));
  });
});
