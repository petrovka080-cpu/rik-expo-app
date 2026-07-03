import {
  auditCatalogBackfillProgress,
  GREEN_AI_ESTIMATE_CATALOG_BACKFILL_PROGRESS_READY_NO_BUILDS,
} from "./auditCatalogBackfillProgress";
import {
  buildCatalogSourceRegistry,
  GREEN_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_READY_NO_BUILDS,
} from "./validateCatalogSourceRegistry";

export const GREEN_AI_ESTIMATE_10000_PROFESSIONAL_SOURCE_COVERAGE_P1_P2_NO_BUILDS =
  "GREEN_AI_ESTIMATE_10000_PROFESSIONAL_SOURCE_COVERAGE_P1_P2_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_10000_PROFESSIONAL_SOURCE_COVERAGE_FAILED =
  "STOP_AI_ESTIMATE_10000_PROFESSIONAL_SOURCE_COVERAGE_FAILED" as const;

export function validateProfessionalSourceCoverage10000() {
  const progress = auditCatalogBackfillProgress();
  const registry = buildCatalogSourceRegistry({ writeFiles: false });
  const blockers = [
    progress.final_status === GREEN_AI_ESTIMATE_CATALOG_BACKFILL_PROGRESS_READY_NO_BUILDS ? "" : "backfill_progress_not_green",
    registry.final_status === GREEN_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_READY_NO_BUILDS ? "" : "source_registry_not_green",
    progress.after.ready_professional_count >= progress.after.manifest_total_templates
      ? "full_10000_real_norm_green_claimed"
      : "",
    progress.p1_generic_fallback_count === 0 ? "" : `p1_generic_fallback_count:${progress.p1_generic_fallback_count}`,
    progress.p2_generic_fallback_count === 0 ? "" : `p2_generic_fallback_count:${progress.p2_generic_fallback_count}`,
    ...progress.blockers.map((reason) => `progress:${reason}`),
    ...registry.blockers.map((reason) => `source:${reason}`),
  ].filter(Boolean);
  return {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_10000_PROFESSIONAL_SOURCE_COVERAGE_P1_P2_NO_BUILDS
      : STOP_AI_ESTIMATE_10000_PROFESSIONAL_SOURCE_COVERAGE_FAILED,
    manifest_total_templates: progress.after.manifest_total_templates,
    ready_professional_count: progress.after.ready_professional_count,
    not_ready_count: progress.after.not_ready_count,
    generic_fallback_count: progress.after.generic_fallback_count,
    templates_with_real_norm_sources_count: progress.after.templates_with_real_norm_sources_count,
    p1_total_templates: progress.p1_total_templates,
    p1_ready_professional_count: progress.p1_ready_professional_count,
    p2_total_templates: progress.p2_total_templates,
    p2_ready_professional_count: progress.p2_ready_professional_count,
    source_registry_validated: registry.final_status === GREEN_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_READY_NO_BUILDS,
    full_10000_real_norm_green_claimed: false,
    fake_green_claimed: false,
    blockers,
  };
}

function requireAllFlag(): void {
  if (!process.argv.includes("--all")) {
    throw new Error("VALIDATE_PROFESSIONAL_SOURCE_COVERAGE_10000_REQUIRES_--all");
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/validateProfessionalSourceCoverage10000.ts")) {
  try {
    requireAllFlag();
    const result = validateProfessionalSourceCoverage10000();
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.final_status === GREEN_AI_ESTIMATE_10000_PROFESSIONAL_SOURCE_COVERAGE_P1_P2_NO_BUILDS ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
