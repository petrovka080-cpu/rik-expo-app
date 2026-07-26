import { STOP_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_NO_TRUNCATION_11610_INCOMPLETE_NO_GREEN } from "../../scripts/estimate/audit11610MaterialCompletenessNoTruncation";
import { runEstimateRuntimeAuditSummary } from "./estimateRuntimeAuditTestHelpers";

type MaterialCompletenessSourceAuditSummary = {
  source_audit_status: string;
  templates_audited: number;
  templates_material_complete: number;
  blocked_templates_count: number;
  required_material_slots_total: number;
  missing_required_material_slots_count: number;
  backend_row_cap_detected: boolean;
  snapshot_truncation_detected: boolean;
  detail_drawer_truncation_detected: boolean;
  pdf_truncation_detected: boolean;
  buyer_handoff_truncation_detected: boolean;
  generic_material_bucket_count: number;
  fake_filler_material_count: number;
  duplicate_noise_rows_count: number;
  calculator_rows_equal_snapshot_rows: boolean;
  snapshot_rows_equal_detail_drawer_rows: boolean;
  snapshot_rows_equal_pdf_rows: boolean;
  buyer_handoff_procurement_subset_complete: boolean;
  critical_cases_total: number;
  critical_cases_passed: number;
  runtime_missing_required_material_slots_count: number;
  full_material_completeness_green_claimed: boolean;
  fake_green_claimed: boolean;
  blocking_reasons: string[];
};

describe("full 11610 material completeness source audit", () => {
  jest.setTimeout(900_000);

  it("proves every material row and projection while keeping the missing exact-SHA prerequisite as STOP", () => {
    const summary = runEstimateRuntimeAuditSummary<MaterialCompletenessSourceAuditSummary>("material-completeness-source-audit");

    expect(summary.source_audit_status).toBe(
      STOP_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_NO_TRUNCATION_11610_INCOMPLETE_NO_GREEN,
    );
    expect(summary.templates_audited).toBe(11610);
    expect(summary.templates_material_complete).toBe(11610);
    expect(summary.blocked_templates_count).toBe(0);
    expect(summary.required_material_slots_total).toBe(582_550);
    expect(summary.missing_required_material_slots_count).toBe(0);
    expect(summary.backend_row_cap_detected).toBe(false);
    expect(summary.snapshot_truncation_detected).toBe(false);
    expect(summary.detail_drawer_truncation_detected).toBe(false);
    expect(summary.pdf_truncation_detected).toBe(false);
    expect(summary.buyer_handoff_truncation_detected).toBe(false);
    expect(summary.generic_material_bucket_count).toBe(0);
    expect(summary.fake_filler_material_count).toBe(0);
    expect(summary.duplicate_noise_rows_count).toBe(0);
    expect(summary.calculator_rows_equal_snapshot_rows).toBe(true);
    expect(summary.snapshot_rows_equal_detail_drawer_rows).toBe(true);
    expect(summary.snapshot_rows_equal_pdf_rows).toBe(true);
    expect(summary.buyer_handoff_procurement_subset_complete).toBe(true);
    expect(summary.critical_cases_total).toBe(100);
    expect(summary.critical_cases_passed).toBe(100);
    expect(summary.runtime_missing_required_material_slots_count).toBe(0);
    expect(summary.full_material_completeness_green_claimed).toBe(false);
    expect(summary.fake_green_claimed).toBe(false);
    expect(summary.blocking_reasons).toEqual([
      "real_named_summary_missing",
      "real_named_final_status_not_green:missing",
      "real_named_source_sha_missing",
      "real_named_templates_ready_not_11610",
      "real_named_rows_audited_below_expected",
      "real_named_web_not_100",
      "real_named_android_not_100",
      "material_completeness_source_audit_not_green",
    ]);
  });
});
