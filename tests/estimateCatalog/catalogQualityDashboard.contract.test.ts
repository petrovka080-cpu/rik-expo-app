import { readFileSync } from "node:fs";
import path from "node:path";

import { STOP_AI_ESTIMATE_CATALOG_QUALITY_DASHBOARD_FAILED } from "../../scripts/estimate/auditCatalogQualityDashboard";
import type { CatalogQualityDashboard } from "../../scripts/estimate/auditCatalogQualityDashboard";

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(process.cwd(), relativePath), "utf8")) as T;
}

describe("catalog quality dashboard artifact", () => {
  it("records mapped catalog coverage without claiming missing professional norms", () => {
    const dashboard = readJson<CatalogQualityDashboard>("data/estimate-catalog/catalog-quality-dashboard.json");

    expect(dashboard.final_status).toBe(STOP_AI_ESTIMATE_CATALOG_QUALITY_DASHBOARD_FAILED);
    expect(dashboard.coverage.manifest_total_templates).toBe(10000);
    expect(dashboard.coverage.ready_professional_count).toBe(0);
    expect(dashboard.coverage.not_ready_count).toBe(10000);
    expect(dashboard.p0.required_case_count).toBe(14);
    expect(dashboard.p0.ready_professional_count).toBeLessThan(14);
    expect(dashboard.p0.generic_fallback_count).toBe(0);
    expect(dashboard.p0.blind_quantity_copy_count).toBe(0);
    expect(dashboard.p0.blind_copy_without_formula_trace).toBe(0);
    expect(dashboard.p0.identity_formula_without_verified_coefficient).toBeGreaterThan(0);
    expect(dashboard.p0.unit_dimension_mismatch).toBeGreaterThan(0);
    expect(dashboard.p0.mechanically_compilable).toBeGreaterThan(0);
    expect(dashboard.p0.formula_runtime_valid).toBeGreaterThan(0);
    expect(dashboard.p0.formula_semantic_unverified).toBeGreaterThan(0);
    expect(dashboard.p0.norm_source_unregistered).toBeGreaterThan(0);
    expect(dashboard.p0.norm_source_verified).toBeGreaterThan(0);
    expect(dashboard.p0.procurement_applicable).toBeGreaterThan(0);
    expect(dashboard.p0.price_covered).toBeLessThan(dashboard.p0.procurement_applicable);
    expect(dashboard.p0.professional_ready).toBe(0);
    expect(dashboard.p0.case_results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ready_professional: false,
          blocking_reasons: expect.arrayContaining([
            "p0_rows_not_all_source_backed",
            "p0_rows_not_professional_ready",
          ]),
        }),
      ]),
    );
    expect(dashboard.batches.p1_template_count).toBe(4127);
    expect(dashboard.batches.p1_ready_professional_template_count).toBe(0);
    expect(dashboard.batches.p1_generic_fallback_count).toBe(0);
    expect(dashboard.batches.p2_template_count).toBe(3964);
    expect(dashboard.batches.p2_ready_professional_template_count).toBe(0);
    expect(dashboard.batches.p2_generic_fallback_count).toBe(0);
    expect(dashboard.batches.p3_ready_professional_template_count).toBe(0);
    expect(dashboard.batches.p3_generic_fallback_count).toBe(0);
    expect(dashboard.full_10000_real_norm_green_claimed).toBe(false);
    expect(dashboard.marketplace_touched).toBe(false);
    expect(dashboard.blockers).toContain("catalog_backfill_batches_not_green");
  });
});
