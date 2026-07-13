import { buildEstimate10000ReadinessManifest } from "./buildEstimate10000ReadinessManifest";

export const GREEN_AI_ESTIMATE_READY_PROFESSIONAL_NO_REGRESSION_NO_BUILDS =
  "GREEN_AI_ESTIMATE_READY_PROFESSIONAL_NO_REGRESSION_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_READY_PROFESSIONAL_REGRESSION_FOUND =
  "STOP_AI_ESTIMATE_READY_PROFESSIONAL_REGRESSION_FOUND" as const;

export function validateNoRegressionForReadyProfessional() {
  const manifest = buildEstimate10000ReadinessManifest();
  const ready = manifest.templates.filter((item) => item.readiness_status === "READY_PROFESSIONAL");
  const regressions = ready.flatMap((item) => {
    const reasons = [
      item.generic_family_default_row_count !== 0 ? "generic_family_default_rows_present" : "",
      item.source_backed_row_count !== item.row_count ? "source_backed_row_count_mismatch" : "",
      item.formula_status !== "PRESENT" ? "formula_missing" : "",
      item.material_recipe_status !== "PRESENT" ? "material_recipe_missing" : "",
      item.labor_recipe_status !== "PRESENT" ? "labor_recipe_missing" : "",
      item.norm_source_status !== "READY_SOURCE_BACKED" ? `norm_source_status:${item.norm_source_status}` : "",
    ].filter(Boolean);
    return reasons.map((reason) => `${item.template_id}:${reason}`);
  });

  return {
    final_status: regressions.length === 0
      ? GREEN_AI_ESTIMATE_READY_PROFESSIONAL_NO_REGRESSION_NO_BUILDS
      : STOP_AI_ESTIMATE_READY_PROFESSIONAL_REGRESSION_FOUND,
    manifest_total_templates: manifest.manifest_total_templates,
    ready_professional_count: ready.length,
    regression_count: regressions.length,
    full_10000_real_norm_green_claimed: false,
    fake_green_claimed: false,
    marketplace_touched: false,
    blockers: regressions.slice(0, 50),
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/validateNoRegressionForReadyProfessional.ts")) {
  const result = validateNoRegressionForReadyProfessional();
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.final_status === GREEN_AI_ESTIMATE_READY_PROFESSIONAL_NO_REGRESSION_NO_BUILDS ? 0 : 1;
}
