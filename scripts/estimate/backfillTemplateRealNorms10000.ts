import {
  buildEstimate10000ReadinessManifest,
  writeEstimate10000ReadinessManifest,
} from "./buildEstimate10000ReadinessManifest";
import {
  GREEN_ALL_ESTIMATE_NORM_BINDINGS_CERTIFIED_NO_BUILDS,
  runCertifyAllEstimateNormBindings,
} from "./certifyAllEstimateNormBindings";

export const GREEN_AI_ESTIMATE_10000_REAL_NORM_BACKFILL_VERIFIED_NO_BUILDS =
  "GREEN_AI_ESTIMATE_10000_REAL_NORM_BACKFILL_VERIFIED_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_10000_REAL_NORM_BACKFILL_NOT_VERIFIED =
  "STOP_AI_ESTIMATE_10000_REAL_NORM_BACKFILL_NOT_VERIFIED" as const;

export function backfillTemplateRealNorms10000(options: { writeManifest?: boolean } = {}) {
  const manifest = options.writeManifest === false
    ? buildEstimate10000ReadinessManifest()
    : writeEstimate10000ReadinessManifest();
  const certification = runCertifyAllEstimateNormBindings({ writeSummary: false });
  const blockers = [
    certification.final_status !== GREEN_ALL_ESTIMATE_NORM_BINDINGS_CERTIFIED_NO_BUILDS
      ? `certification_status:${certification.final_status}`
      : "",
    certification.template_count !== 10000 ? `template_count:${certification.template_count}` : "",
    certification.generic_norm_rows_count !== 0 ? `generic_norm_rows:${certification.generic_norm_rows_count}` : "",
    certification.templates_only_generic_norms_count !== 0
      ? `templates_only_generic_norms:${certification.templates_only_generic_norms_count}`
      : "",
    certification.templates_with_real_norm_pack_rows_count !== 10000
      ? `templates_with_real_norm_pack_rows:${certification.templates_with_real_norm_pack_rows_count}`
      : "",
    manifest.ready_professional_count !== 10000 ? `ready_professional_count:${manifest.ready_professional_count}` : "",
    manifest.not_ready_count !== 0 ? `not_ready_count:${manifest.not_ready_count}` : "",
    manifest.generic_fallback_count !== 0 ? `generic_fallback_count:${manifest.generic_fallback_count}` : "",
  ].filter(Boolean);

  return {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_10000_REAL_NORM_BACKFILL_VERIFIED_NO_BUILDS
      : STOP_AI_ESTIMATE_10000_REAL_NORM_BACKFILL_NOT_VERIFIED,
    manifest_total_templates: manifest.manifest_total_templates,
    ready_professional_count: manifest.ready_professional_count,
    not_ready_count: manifest.not_ready_count,
    generic_fallback_count: manifest.generic_fallback_count,
    template_count: certification.template_count,
    row_count: certification.row_count,
    real_norm_pack_rows_count: certification.real_norm_pack_rows_count,
    generic_norm_rows_count: certification.generic_norm_rows_count,
    templates_with_real_norm_pack_rows_count: certification.templates_with_real_norm_pack_rows_count,
    templates_only_generic_norms_count: certification.templates_only_generic_norms_count,
    fake_green_claimed: false,
    blockers,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/backfillTemplateRealNorms10000.ts")) {
  const result = backfillTemplateRealNorms10000({ writeManifest: true });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.final_status === GREEN_AI_ESTIMATE_10000_REAL_NORM_BACKFILL_VERIFIED_NO_BUILDS ? 0 : 1;
}
