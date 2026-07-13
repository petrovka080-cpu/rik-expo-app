import { GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_NO_TRUNCATION_11610_SOURCE_READY } from "../../scripts/estimate/audit11610MaterialCompletenessNoTruncation";
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
  blocking_reasons: string[];
};

describe("full 11610 material completeness source audit", () => {
  jest.setTimeout(900_000);

  it("keeps every professional template material-complete without truncating BOQ rows", () => {
    const summary = runEstimateRuntimeAuditSummary<MaterialCompletenessSourceAuditSummary>("material-completeness-source-audit");

    expect(summary.source_audit_status).toBe(GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_NO_TRUNCATION_11610_SOURCE_READY);
    expect(summary.templates_audited).toBe(11610);
    expect(summary.templates_material_complete).toBe(11610);
    expect(summary.blocked_templates_count).toBe(0);
    expect(summary.required_material_slots_total).toBeGreaterThan(250_000);
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
    expect(summary.blocking_reasons).toEqual([]);
  });
});
