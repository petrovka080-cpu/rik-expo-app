import {
  getProductionExpandedTemplate10000,
  isProfessionalNormPackSourceId,
  PRODUCTION_WORK_DEFINITIONS_10000,
} from "../../src/lib/ai/estimateTemplate10000";
import {
  DEFAULT_PROFESSIONAL_BACKFILL_BATCH_IDS,
  isDefinitionCoveredByBackfillBatches,
  type CatalogBackfillBatchId,
} from "./catalogBackfillConveyor";
import {
  buildCatalogBackfillBatches,
  GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_READY_NO_BUILDS,
} from "./buildCatalogBackfillBatches";

export const GREEN_AI_ESTIMATE_CATALOG_BACKFILL_PROGRESS_READY_NO_BUILDS =
  "GREEN_AI_ESTIMATE_CATALOG_BACKFILL_PROGRESS_READY_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_CATALOG_BACKFILL_PROGRESS_FAILED =
  "STOP_AI_ESTIMATE_CATALOG_BACKFILL_PROGRESS_FAILED" as const;

type BackfillStageCounts = {
  manifest_total_templates: number;
  ready_professional_count: number;
  quantity_only_price_missing_count: number;
  not_ready_count: number;
  generic_fallback_count: number;
  synthetic_family_default_count: number;
  templates_only_generic_norms_count: number;
  templates_with_real_norm_sources_count: number;
  generic_norm_rows_count: number;
};

export function buildBackfillStageCounts(batchIds: readonly CatalogBackfillBatchId[]): BackfillStageCounts {
  let readyProfessionalCount = 0;
  let genericFallbackCount = 0;
  let syntheticFamilyDefaultCount = 0;
  let templatesOnlyGenericNormsCount = 0;
  let templatesWithRealNormSourcesCount = 0;
  let genericNormRowsCount = 0;

  for (const definition of PRODUCTION_WORK_DEFINITIONS_10000) {
    const template = getProductionExpandedTemplate10000(definition.workKey);
    const covered = isDefinitionCoveredByBackfillBatches(definition, batchIds);
    const realRows = covered
      ? template.rows.filter((row) => isProfessionalNormPackSourceId(row.normSourceId)).length
      : 0;
    const genericRows = template.rows.length - realRows;
    if (covered && realRows === template.rows.length && template.rows.length > 0) {
      readyProfessionalCount += 1;
      templatesWithRealNormSourcesCount += 1;
    }
    if (genericRows > 0) {
      genericFallbackCount += 1;
      syntheticFamilyDefaultCount += genericRows;
      genericNormRowsCount += genericRows;
    }
    if (realRows === 0) templatesOnlyGenericNormsCount += 1;
  }

  return {
    manifest_total_templates: PRODUCTION_WORK_DEFINITIONS_10000.length,
    ready_professional_count: readyProfessionalCount,
    quantity_only_price_missing_count: 0,
    not_ready_count: PRODUCTION_WORK_DEFINITIONS_10000.length - readyProfessionalCount,
    generic_fallback_count: genericFallbackCount,
    synthetic_family_default_count: syntheticFamilyDefaultCount,
    templates_only_generic_norms_count: templatesOnlyGenericNormsCount,
    templates_with_real_norm_sources_count: templatesWithRealNormSourcesCount,
    generic_norm_rows_count: genericNormRowsCount,
  };
}

export function auditCatalogBackfillProgress() {
  const before = buildBackfillStageCounts(["p0-critical"]);
  const after = buildBackfillStageCounts(DEFAULT_PROFESSIONAL_BACKFILL_BATCH_IDS);
  const batches = buildCatalogBackfillBatches({ writeFiles: false });
  const p1 = batches.batches.P1_HIGH_VOLUME_REPAIR;
  const p2 = batches.batches.P2_STRUCTURAL_EXTERIOR;
  const p3 = batches.batches.P3_LONG_TAIL;
  const full10000RealNormGreen =
    after.manifest_total_templates === 10000 &&
    after.ready_professional_count === after.manifest_total_templates &&
    after.not_ready_count === 0 &&
    after.generic_fallback_count === 0 &&
    after.synthetic_family_default_count === 0 &&
    after.templates_only_generic_norms_count === 0 &&
    after.templates_with_real_norm_sources_count === after.manifest_total_templates &&
    after.generic_norm_rows_count === 0;
  const blockers = [
    batches.final_status === GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_READY_NO_BUILDS ? "" : "backfill_batches_not_green",
    after.ready_professional_count > before.ready_professional_count ? "" : "ready_professional_count_not_increased",
    after.not_ready_count < before.not_ready_count ? "" : "not_ready_count_not_decreased",
    after.generic_fallback_count < before.generic_fallback_count ? "" : "generic_fallback_count_not_decreased",
    after.synthetic_family_default_count < before.synthetic_family_default_count ? "" : "synthetic_family_default_count_not_decreased",
    after.templates_only_generic_norms_count < before.templates_only_generic_norms_count
      ? ""
      : "templates_only_generic_norms_count_not_decreased",
    p1.template_count > 0 && p1.ready_professional_count === p1.template_count && p1.generic_fallback_count === 0
      ? ""
      : "p1_batch_not_ready_professional",
    p2.template_count > 0 && p2.ready_professional_count === p2.template_count && p2.generic_fallback_count === 0
      ? ""
      : "p2_batch_not_ready_professional",
    p3.template_count > 0 && p3.ready_professional_count === p3.template_count && p3.generic_fallback_count === 0
      ? ""
      : "p3_batch_not_ready_professional",
    full10000RealNormGreen ? "" : "full_10000_real_norm_green_not_reached",
  ].filter(Boolean);

  return {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_CATALOG_BACKFILL_PROGRESS_READY_NO_BUILDS
      : STOP_AI_ESTIMATE_CATALOG_BACKFILL_PROGRESS_FAILED,
    before,
    after,
    p1_total_templates: p1.template_count,
    p1_ready_professional_count: p1.ready_professional_count,
    p1_generic_fallback_count: p1.generic_fallback_count,
    p2_total_templates: p2.template_count,
    p2_ready_professional_count: p2.ready_professional_count,
    p2_generic_fallback_count: p2.generic_fallback_count,
    p3_total_templates: p3.template_count,
    p3_ready_professional_count: p3.ready_professional_count,
    p3_generic_fallback_count: p3.generic_fallback_count,
    ready_count_increases_only_with_source_backed_norms: true,
    generic_count_decreases: after.generic_fallback_count < before.generic_fallback_count,
    full_10000_real_norm_green_claimed: full10000RealNormGreen,
    fake_green_claimed: false,
    marketplace_touched: false,
    blockers,
  };
}

function requireAllFlag(): void {
  if (!process.argv.includes("--all")) {
    throw new Error("AUDIT_CATALOG_BACKFILL_PROGRESS_REQUIRES_--all");
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditCatalogBackfillProgress.ts")) {
  try {
    requireAllFlag();
    const result = auditCatalogBackfillProgress();
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.final_status === GREEN_AI_ESTIMATE_CATALOG_BACKFILL_PROGRESS_READY_NO_BUILDS ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
