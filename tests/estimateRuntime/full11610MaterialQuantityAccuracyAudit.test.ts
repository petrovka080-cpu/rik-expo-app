import { GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_NORMS_11610_SOURCE_READY } from "../../scripts/estimate/audit11610MaterialQuantityAccuracy";
import { runEstimateRuntimeAuditSummary } from "./estimateRuntimeAuditTestHelpers";

type MaterialQuantitySourceAuditSummary = {
  source_audit_status: string;
  templates_audited: number;
  templates_material_quantity_accurate: number;
  blocked_templates_count: number;
  material_quantity_norm_registry_valid: boolean;
  material_rows_audited: number;
  blocked_rows_count: number;
  critical_cases_total: number;
  critical_cases_passed: number;
  runtime_material_quantity_validation_failed_count: number;
  blocking_reasons: string[];
};

describe("full 11610 material quantity accuracy source audit", () => {
  jest.setTimeout(900_000);

  it("keeps every professional template material quantity formula-backed, waste-backed, and procurement-rounded", () => {
    const summary = runEstimateRuntimeAuditSummary<MaterialQuantitySourceAuditSummary>("material-quantity-accuracy-source-audit");

    expect(summary.source_audit_status).toBe(GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_NORMS_11610_SOURCE_READY);
    expect(summary.templates_audited).toBe(11610);
    expect(summary.templates_material_quantity_accurate).toBe(11610);
    expect(summary.blocked_templates_count).toBe(0);
    expect(summary.material_quantity_norm_registry_valid).toBe(true);
    expect(summary.material_rows_audited).toBeGreaterThan(100000);
    expect(summary.blocked_rows_count).toBe(0);
    expect(summary.critical_cases_total).toBe(100);
    expect(summary.critical_cases_passed).toBe(100);
    expect(summary.runtime_material_quantity_validation_failed_count).toBe(0);
    expect(summary.blocking_reasons).toEqual([]);
  });
});
