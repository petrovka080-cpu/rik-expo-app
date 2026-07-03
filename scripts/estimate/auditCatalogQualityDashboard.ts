import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildWorkFamilyCoveragePlan,
  GREEN_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_COVERAGE_READY_NO_BUILDS,
} from "./buildWorkFamilyCoveragePlan";
import {
  buildCatalogBackfillBatches,
  GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_READY_NO_BUILDS,
} from "./buildCatalogBackfillBatches";
import {
  buildCatalogSourceRegistry,
  GREEN_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_READY_NO_BUILDS,
} from "./validateCatalogSourceRegistry";
import {
  validateProfessionalCatalogBatch,
  GREEN_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_BATCH_READY_NO_BUILDS,
} from "./validateProfessionalCatalogBatch";

export const CATALOG_QUALITY_DASHBOARD_PATH = "data/estimate-catalog/catalog-quality-dashboard.json" as const;
export const GREEN_AI_ESTIMATE_CATALOG_QUALITY_DASHBOARD_READY_NO_BUILDS =
  "GREEN_AI_ESTIMATE_CATALOG_QUALITY_DASHBOARD_READY_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_CATALOG_QUALITY_DASHBOARD_FAILED =
  "STOP_AI_ESTIMATE_CATALOG_QUALITY_DASHBOARD_FAILED" as const;

export type CatalogQualityDashboard = {
  schema: "catalog-quality-dashboard-v1";
  generated_at: string;
  final_status:
    | typeof GREEN_AI_ESTIMATE_CATALOG_QUALITY_DASHBOARD_READY_NO_BUILDS
    | typeof STOP_AI_ESTIMATE_CATALOG_QUALITY_DASHBOARD_FAILED;
  coverage: {
    manifest_total_templates: number;
    ready_professional_count: number;
    not_ready_count: number;
    generic_fallback_count: number;
    synthetic_family_default_count: number;
    work_families_count: number;
    coverage_plan_ready: boolean;
  };
  batches: {
    p0_template_count: number;
    p0_ready_professional_template_count: number;
    p1_template_count: number;
    p2_template_count: number;
    p3_template_count: number;
    backfill_batches_ready: boolean;
  };
  sources: {
    registry_source_count: number;
    row_source_count: number;
    p0_source_count: number;
    source_registry_ready: boolean;
  };
  p0: {
    required_case_count: number;
    ready_professional_count: number;
    generic_fallback_count: number;
    blind_quantity_copy_count: number;
    missing_formula_trace_count: number;
    required_calculator_modules_count: number;
    required_calculator_modules_present_count: number;
    professional_batch_ready: boolean;
    case_results: unknown[];
  };
  family_quality: Array<{
    work_family_id: string;
    template_count: number;
    templates_ready_professional_count: number;
    row_count: number;
    source_backed_row_count: number;
    generic_family_default_row_count: number;
    material_recipe_present: boolean;
    labor_recipe_present: boolean;
    buyer_material_handoff_present: boolean;
    all_formula_traces_saved: boolean;
    all_missing_prices_explicit: boolean;
  }>;
  blockers: string[];
  full_10000_real_norm_green_claimed: false;
  fake_green_claimed: false;
  marketplace_touched: false;
};

function writeJson(relativePath: string, value: unknown): void {
  const fullPath = path.join(process.cwd(), relativePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function buildCatalogQualityDashboard(options: { writeFiles?: boolean } = {}): CatalogQualityDashboard {
  const coverage = buildWorkFamilyCoveragePlan({ writeFiles: false });
  const batches = buildCatalogBackfillBatches({ writeFiles: false });
  const sources = buildCatalogSourceRegistry({ writeFiles: false });
  const p0 = validateProfessionalCatalogBatch();
  const blockers = [
    coverage.final_status === GREEN_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_COVERAGE_READY_NO_BUILDS ? "" : "coverage_plan_not_green",
    batches.final_status === GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_READY_NO_BUILDS ? "" : "catalog_backfill_batches_not_green",
    sources.final_status === GREEN_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_READY_NO_BUILDS ? "" : "catalog_source_registry_not_green",
    p0.final_status === GREEN_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_BATCH_READY_NO_BUILDS ? "" : "p0_professional_batch_not_green",
    ...coverage.blockers.map((reason) => `coverage:${reason}`),
    ...batches.blockers.map((reason) => `batch:${reason}`),
    ...sources.blockers.map((reason) => `source:${reason}`),
    ...p0.blockers.map((reason) => `p0:${reason}`),
  ].filter(Boolean);
  const dashboard: CatalogQualityDashboard = {
    schema: "catalog-quality-dashboard-v1",
    generated_at: new Date().toISOString(),
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_CATALOG_QUALITY_DASHBOARD_READY_NO_BUILDS
      : STOP_AI_ESTIMATE_CATALOG_QUALITY_DASHBOARD_FAILED,
    coverage: {
      manifest_total_templates: coverage.manifest_total_templates,
      ready_professional_count: coverage.ready_professional_count,
      not_ready_count: coverage.not_ready_count,
      generic_fallback_count: coverage.generic_fallback_count,
      synthetic_family_default_count: coverage.synthetic_family_default_count,
      work_families_count: coverage.work_families_count,
      coverage_plan_ready: coverage.final_status === GREEN_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_COVERAGE_READY_NO_BUILDS,
    },
    batches: {
      p0_template_count: batches.batches.P0_CRITICAL.template_count,
      p0_ready_professional_template_count: batches.batches.P0_CRITICAL.ready_professional_count,
      p1_template_count: batches.batches.P1_CORE.template_count,
      p2_template_count: batches.batches.P2_SYSTEMS.template_count,
      p3_template_count: batches.batches.P3_LONG_TAIL.template_count,
      backfill_batches_ready: batches.final_status === GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_READY_NO_BUILDS,
    },
    sources: {
      registry_source_count: sources.registry_source_count,
      row_source_count: sources.row_source_count,
      p0_source_count: sources.p0_source_count,
      source_registry_ready: sources.final_status === GREEN_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_READY_NO_BUILDS,
    },
    p0: {
      required_case_count: p0.p0_required_case_count,
      ready_professional_count: p0.p0_ready_professional_count,
      generic_fallback_count: p0.p0_generic_fallback_count,
      blind_quantity_copy_count: p0.p0_blind_quantity_copy_count,
      missing_formula_trace_count: p0.p0_missing_formula_trace_count,
      required_calculator_modules_count: p0.required_calculator_modules_count,
      required_calculator_modules_present_count: p0.required_calculator_modules_present_count,
      professional_batch_ready: p0.final_status === GREEN_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_BATCH_READY_NO_BUILDS,
      case_results: p0.case_results,
    },
    family_quality: coverage.work_families.map((family) => ({
      work_family_id: family.work_family_id,
      template_count: family.template_count,
      templates_ready_professional_count: family.templates_ready_professional_count,
      row_count: family.row_count,
      source_backed_row_count: family.source_backed_row_count,
      generic_family_default_row_count: family.generic_family_default_row_count,
      material_recipe_present: family.material_recipe_present,
      labor_recipe_present: family.labor_recipe_present,
      buyer_material_handoff_present: family.buyer_material_handoff_present,
      all_formula_traces_saved: family.all_formula_traces_saved,
      all_missing_prices_explicit: family.all_missing_prices_explicit,
    })),
    blockers,
    full_10000_real_norm_green_claimed: false,
    fake_green_claimed: false,
    marketplace_touched: false,
  };
  if (options.writeFiles) writeJson(CATALOG_QUALITY_DASHBOARD_PATH, dashboard);
  return dashboard;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditCatalogQualityDashboard.ts")) {
  const dashboard = buildCatalogQualityDashboard({ writeFiles: true });
  console.log(JSON.stringify({
    final_status: dashboard.final_status,
    ready_professional_count: dashboard.coverage.ready_professional_count,
    p0_ready_professional_count: dashboard.p0.ready_professional_count,
    p0_template_count: dashboard.batches.p0_template_count,
    source_registry_ready: dashboard.sources.source_registry_ready,
    blockers: dashboard.blockers,
  }, null, 2));
  process.exitCode = dashboard.final_status === GREEN_AI_ESTIMATE_CATALOG_QUALITY_DASHBOARD_READY_NO_BUILDS ? 0 : 1;
}
