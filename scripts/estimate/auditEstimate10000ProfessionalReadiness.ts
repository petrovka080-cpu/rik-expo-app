import {
  buildEstimate10000ReadinessManifest,
  writeEstimate10000ReadinessManifest,
} from "./buildEstimate10000ReadinessManifest";
import {
  runEstimateFunctionalRealityAudit,
  GREEN_AI_ESTIMATE_10000_FUNCTIONAL_REALITY_AUDIT_READY_NO_BUILDS,
} from "./auditEstimateFunctionalReality10000";
import { runCertifyAllEstimateNormBindings } from "./certifyAllEstimateNormBindings";
import {
  buildWorkFamilyCoveragePlan,
  GREEN_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_COVERAGE_READY_NO_BUILDS,
} from "./buildWorkFamilyCoveragePlan";

export const GREEN_AI_ESTIMATE_10000_REAL_PROFESSIONAL_CATALOG_READY_NO_BUILDS =
  "GREEN_AI_ESTIMATE_10000_REAL_PROFESSIONAL_CATALOG_READY_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_10000_REAL_PROFESSIONAL_CATALOG_NOT_READY =
  "STOP_AI_ESTIMATE_10000_REAL_PROFESSIONAL_CATALOG_NOT_READY" as const;

export function auditEstimate10000ProfessionalReadiness(options: { writeManifest?: boolean; writeCatalogArtifacts?: boolean } = {}) {
  const manifest = options.writeManifest === false
    ? buildEstimate10000ReadinessManifest()
    : writeEstimate10000ReadinessManifest();
  const certification = runCertifyAllEstimateNormBindings({ writeSummary: false });
  const functional = runEstimateFunctionalRealityAudit({ writeSummary: false });
  const catalog = buildWorkFamilyCoveragePlan({ writeFiles: options.writeCatalogArtifacts === true });
  const blockers = [
    manifest.manifest_total_templates !== 10000 ? "manifest_total_templates_not_10000" : "",
    manifest.ready_professional_count !== 10000 ? `ready_professional_count:${manifest.ready_professional_count}` : "",
    manifest.not_ready_count !== 0 ? `not_ready_count:${manifest.not_ready_count}` : "",
    manifest.generic_fallback_count !== 0 ? `generic_fallback_count:${manifest.generic_fallback_count}` : "",
    manifest.full_10000_real_norm_green_claimed !== true ? "manifest_full_green_not_claimed" : "",
    certification.generic_norm_rows_count !== 0 ? `generic_norm_rows:${certification.generic_norm_rows_count}` : "",
    certification.templates_only_generic_norms_count !== 0
      ? `templates_only_generic_norms:${certification.templates_only_generic_norms_count}`
      : "",
    certification.templates_with_real_norm_pack_rows_count !== 10000
      ? `templates_with_real_norm_pack_rows:${certification.templates_with_real_norm_pack_rows_count}`
      : "",
    functional.final_status !== GREEN_AI_ESTIMATE_10000_FUNCTIONAL_REALITY_AUDIT_READY_NO_BUILDS
      ? `functional_status:${functional.final_status}`
      : "",
    catalog.final_status !== GREEN_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_COVERAGE_READY_NO_BUILDS
      ? `catalog_status:${catalog.final_status}`
      : "",
    ...functional.blockers.map((reason) => `functional:${reason}`),
    ...catalog.blockers.map((reason) => `catalog:${reason}`),
  ].filter(Boolean);

  return {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_10000_REAL_PROFESSIONAL_CATALOG_READY_NO_BUILDS
      : STOP_AI_ESTIMATE_10000_REAL_PROFESSIONAL_CATALOG_NOT_READY,
    manifest_total_templates: manifest.manifest_total_templates,
    ready_professional_count: manifest.ready_professional_count,
    not_ready_count: manifest.not_ready_count,
    generic_fallback_count: manifest.generic_fallback_count,
    generic_norm_rows_count: certification.generic_norm_rows_count,
    synthetic_family_default_count: catalog.synthetic_family_default_count,
    templates_only_generic_norms_count: certification.templates_only_generic_norms_count,
    templates_with_real_norm_sources_count: certification.templates_with_real_norm_pack_rows_count,
    work_catalog_items_count: catalog.work_catalog_items_count,
    row_catalog_bindings_count: catalog.row_catalog_bindings_count,
    material_catalog_rows_count: catalog.material_catalog_rows_count,
    service_catalog_rows_count: catalog.service_catalog_rows_count,
    equipment_catalog_rows_count: catalog.equipment_catalog_rows_count,
    buyer_material_handoff_rows_count: catalog.buyer_material_handoff_rows_count,
    diamond_drilling_professional: functional.diamond_drilling_professional,
    profile_sheet_fence_professional: functional.profile_sheet_fence_professional,
    mansard_roof_professional: functional.mansard_roof_professional,
    apartment_54_missing_params_visible: functional.apartment_54_missing_params_visible,
    apartment_54_not_auto_applied_from_area_only: functional.apartment_54_not_auto_applied_from_area_only,
    full_10000_real_norm_green_claimed: manifest.full_10000_real_norm_green_claimed,
    fake_green_claimed: false,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    production_db_touched: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    blockers,
  };
}

function requireAllFlag(): void {
  if (!process.argv.includes("--all")) {
    throw new Error("AUDIT_ESTIMATE_10000_PROFESSIONAL_READINESS_REQUIRES_--all");
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditEstimate10000ProfessionalReadiness.ts")) {
  try {
    requireAllFlag();
    const result = auditEstimate10000ProfessionalReadiness({
      writeManifest: true,
      writeCatalogArtifacts: true,
    });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.final_status === GREEN_AI_ESTIMATE_10000_REAL_PROFESSIONAL_CATALOG_READY_NO_BUILDS ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
