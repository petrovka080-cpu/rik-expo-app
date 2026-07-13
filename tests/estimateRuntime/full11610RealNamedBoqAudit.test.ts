import { GREEN_AI_ESTIMATE_REAL_NAMED_PROFESSIONAL_BOQ_LINE_ITEMS_11610_SOURCE_READY } from "../../scripts/estimate/audit11610RealNamedProfessionalBoqLineItems";
import { runEstimateRuntimeAuditSummary } from "./estimateRuntimeAuditTestHelpers";

type RealNamedBoqSourceAuditSummary = {
  source_audit_status: string;
  templates_audited: number;
  templates_real_named_boq_ready: number;
  blocked_templates_count: number;
  rows_audited: number;
  generic_rows_count: number;
  template_only_rows_count: number;
  raw_formula_or_debug_rows_count: number;
  rows_without_real_nomenclature_count: number;
  rows_without_source_citation_count: number;
  rows_without_formula_count: number;
  rows_without_calculation_trace_count: number;
  wrong_unit_rows_count: number;
  duplicate_noise_rows_count: number;
  critical_cases_total: number;
  critical_cases_passed: number;
  blocking_reasons: string[];
};

describe("full 11610 real named BOQ source audit", () => {
  jest.setTimeout(360_000);

  it("passes every professional template without generic, raw, unsourced, or wrong-unit rows", () => {
    const summary = runEstimateRuntimeAuditSummary<RealNamedBoqSourceAuditSummary>("real-named-boq-source-audit");

    expect(summary.source_audit_status).toBe(GREEN_AI_ESTIMATE_REAL_NAMED_PROFESSIONAL_BOQ_LINE_ITEMS_11610_SOURCE_READY);
    expect(summary.templates_audited).toBe(11610);
    expect(summary.templates_real_named_boq_ready).toBe(11610);
    expect(summary.blocked_templates_count).toBe(0);
    expect(summary.rows_audited).toBeGreaterThan(600_000);
    expect(summary.generic_rows_count).toBe(0);
    expect(summary.template_only_rows_count).toBe(0);
    expect(summary.raw_formula_or_debug_rows_count).toBe(0);
    expect(summary.rows_without_real_nomenclature_count).toBe(0);
    expect(summary.rows_without_source_citation_count).toBe(0);
    expect(summary.rows_without_formula_count).toBe(0);
    expect(summary.rows_without_calculation_trace_count).toBe(0);
    expect(summary.wrong_unit_rows_count).toBe(0);
    expect(summary.duplicate_noise_rows_count).toBe(0);
    expect(summary.critical_cases_total).toBeGreaterThanOrEqual(10);
    expect(summary.critical_cases_passed).toBe(summary.critical_cases_total);
    expect(summary.blocking_reasons).toEqual([]);
  });
});
