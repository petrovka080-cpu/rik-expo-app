import {
  buildWorkFamilyCoveragePlan,
  GREEN_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_COVERAGE_READY_NO_BUILDS,
} from "./buildWorkFamilyCoveragePlan";

export const GREEN_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_VALIDATED_NO_BUILDS =
  "GREEN_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_VALIDATED_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_VALIDATION_FAILED =
  "STOP_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_VALIDATION_FAILED" as const;

export function validateProfessionalCatalog10000() {
  const plan = buildWorkFamilyCoveragePlan({ writeFiles: false });
  const green =
    plan.final_status === GREEN_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_COVERAGE_READY_NO_BUILDS &&
    plan.manifest_total_templates === 10000 &&
    plan.ready_professional_count === 10000 &&
    plan.not_ready_count === 0 &&
    plan.generic_fallback_count === 0 &&
    plan.generic_norm_rows_count === 0 &&
    plan.synthetic_family_default_count === 0 &&
    plan.templates_only_generic_norms_count === 0 &&
    plan.templates_with_real_norm_sources_count === 10000 &&
    plan.work_catalog_items_count === 10000 &&
    plan.row_catalog_bindings_count > 0 &&
    plan.material_catalog_rows_count > 0 &&
    plan.buyer_material_handoff_rows_count > 0 &&
    plan.blockers.length === 0;

  return {
    ...plan,
    final_status: green
      ? GREEN_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_VALIDATED_NO_BUILDS
      : STOP_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_VALIDATION_FAILED,
    source_plan_status: plan.final_status,
  };
}

function requireAllFlag(): void {
  if (!process.argv.includes("--all")) {
    throw new Error("VALIDATE_PROFESSIONAL_CATALOG_10000_REQUIRES_--all");
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/validateProfessionalCatalog10000.ts")) {
  try {
    requireAllFlag();
    const result = validateProfessionalCatalog10000();
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.final_status === GREEN_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_VALIDATED_NO_BUILDS ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
