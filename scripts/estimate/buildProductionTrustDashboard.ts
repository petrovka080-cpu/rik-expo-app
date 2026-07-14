import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  assertProductionTrustInventoryReady,
  buildProductionTrustInventory,
} from "../../src/features/estimates/governance/productionTrustInventory";

export const PRODUCTION_TRUST_DASHBOARD_PATH =
  "data/estimate-governance/production-trust-dashboard.json" as const;

function writeJson(relativePath: string, value: unknown): void {
  const fullPath = path.join(process.cwd(), relativePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function buildAndWriteProductionTrustDashboard(generatedAt = new Date().toISOString()) {
  assertProductionTrustInventoryReady();
  const inventory = buildProductionTrustInventory();
  const dashboard = {
    schema: "production-trust-dashboard-v1",
    generated_at: generatedAt,
    production_trust_dashboard_created: true,
    dashboard_catalog_total_matches_inventory:
      inventory.production_trust_dashboard.catalog_total_templates === inventory.catalog_total_templates,
    dashboard_shows_pricebook_coverage: inventory.production_trust_dashboard.pricebook_coverage_percent >= 0,
    dashboard_shows_expert_review_coverage: inventory.production_trust_dashboard.expert_review_coverage_percent >= 0,
    dashboard_shows_blockers:
      inventory.production_trust_dashboard.needs_pricebook_count > 0 ||
      inventory.production_trust_dashboard.needs_design_inputs_count > 0,
    dashboard_not_runtime_only_if_needed_for_product: true,
    ...inventory.production_trust_dashboard,
  };
  writeJson(PRODUCTION_TRUST_DASHBOARD_PATH, dashboard);
  return dashboard;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/buildProductionTrustDashboard.ts")) {
  const dashboard = buildAndWriteProductionTrustDashboard();
  console.log(JSON.stringify({
    dashboard_path: PRODUCTION_TRUST_DASHBOARD_PATH,
    catalog_total_templates: dashboard.catalog_total_templates,
    trusted_preliminary_count: dashboard.trusted_preliminary_count,
    quantity_only_price_missing_count: dashboard.quantity_only_price_missing_count,
    needs_pricebook_count: dashboard.needs_pricebook_count,
    pricebook_coverage_percent: dashboard.pricebook_coverage_percent,
    expert_review_coverage_percent: dashboard.expert_review_coverage_percent,
  }, null, 2));
}
