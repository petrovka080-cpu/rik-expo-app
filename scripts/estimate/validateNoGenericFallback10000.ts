import { buildWorkFamilyCoveragePlan } from "./buildWorkFamilyCoveragePlan";
import { runCertifyAllEstimateNormBindings } from "./certifyAllEstimateNormBindings";

export const GREEN_AI_ESTIMATE_10000_NO_GENERIC_FALLBACK_NO_BUILDS =
  "GREEN_AI_ESTIMATE_10000_NO_GENERIC_FALLBACK_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_10000_GENERIC_FALLBACK_FOUND =
  "STOP_AI_ESTIMATE_10000_GENERIC_FALLBACK_FOUND" as const;

export function validateNoGenericFallback10000() {
  const certification = runCertifyAllEstimateNormBindings({ writeSummary: false });
  const catalog = buildWorkFamilyCoveragePlan({ writeFiles: false });
  const blockers = [
    certification.generic_norm_rows_count !== 0 ? `generic_norm_rows:${certification.generic_norm_rows_count}` : "",
    certification.templates_only_generic_norms_count !== 0
      ? `templates_only_generic_norms:${certification.templates_only_generic_norms_count}`
      : "",
    catalog.generic_fallback_count !== 0 ? `generic_fallback_count:${catalog.generic_fallback_count}` : "",
    catalog.synthetic_family_default_count !== 0
      ? `synthetic_family_default_count:${catalog.synthetic_family_default_count}`
      : "",
  ].filter(Boolean);
  return {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_10000_NO_GENERIC_FALLBACK_NO_BUILDS
      : STOP_AI_ESTIMATE_10000_GENERIC_FALLBACK_FOUND,
    manifest_total_templates: catalog.manifest_total_templates,
    generic_fallback_count: catalog.generic_fallback_count,
    generic_norm_rows_count: certification.generic_norm_rows_count,
    synthetic_family_default_count: catalog.synthetic_family_default_count,
    templates_only_generic_norms_count: certification.templates_only_generic_norms_count,
    blockers,
  };
}

function requireAllFlag(): void {
  if (!process.argv.includes("--all")) {
    throw new Error("VALIDATE_NO_GENERIC_FALLBACK_10000_REQUIRES_--all");
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/validateNoGenericFallback10000.ts")) {
  try {
    requireAllFlag();
    const result = validateNoGenericFallback10000();
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.final_status === GREEN_AI_ESTIMATE_10000_NO_GENERIC_FALLBACK_NO_BUILDS ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
