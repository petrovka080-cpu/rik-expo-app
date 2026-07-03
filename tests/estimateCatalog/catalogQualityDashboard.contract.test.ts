import { readFileSync } from "node:fs";
import path from "node:path";

import { GREEN_AI_ESTIMATE_CATALOG_QUALITY_DASHBOARD_READY_NO_BUILDS } from "../../scripts/estimate/auditCatalogQualityDashboard";
import type { CatalogQualityDashboard } from "../../scripts/estimate/auditCatalogQualityDashboard";

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(process.cwd(), relativePath), "utf8")) as T;
}

describe("catalog quality dashboard artifact", () => {
  it("summarizes P0 professional readiness without claiming full 10000 in this P0 gate", () => {
    const dashboard = readJson<CatalogQualityDashboard>("data/estimate-catalog/catalog-quality-dashboard.json");

    expect(dashboard.final_status).toBe(GREEN_AI_ESTIMATE_CATALOG_QUALITY_DASHBOARD_READY_NO_BUILDS);
    expect(dashboard.coverage.manifest_total_templates).toBe(10000);
    expect(dashboard.coverage.ready_professional_count).toBe(10000);
    expect(dashboard.p0.required_case_count).toBe(14);
    expect(dashboard.p0.ready_professional_count).toBe(14);
    expect(dashboard.p0.generic_fallback_count).toBe(0);
    expect(dashboard.p0.blind_quantity_copy_count).toBe(0);
    expect(dashboard.full_10000_real_norm_green_claimed).toBe(false);
    expect(dashboard.marketplace_touched).toBe(false);
    expect(dashboard.blockers).toEqual([]);
  });
});
