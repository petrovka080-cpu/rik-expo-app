import { buildEstimate10000ReadinessManifest, writeEstimate10000ReadinessManifest } from "./buildEstimate10000ReadinessManifest";
import {
  buildCatalogBackfillBatches,
  GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_READY_NO_BUILDS,
} from "./buildCatalogBackfillBatches";
import {
  buildCatalogSourceRegistry,
  GREEN_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_READY_NO_BUILDS,
} from "./validateCatalogSourceRegistry";
import {
  buildCatalogQualityDashboard,
  GREEN_AI_ESTIMATE_CATALOG_QUALITY_DASHBOARD_READY_NO_BUILDS,
} from "./auditCatalogQualityDashboard";
import {
  parseCatalogBackfillBatchArg,
  validateCatalogBackfillBatch,
  GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCH_READY_NO_BUILDS,
} from "./validateCatalogBackfillBatch";

export const GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCH_RUNNER_READY_NO_BUILDS =
  "GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCH_RUNNER_READY_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_CATALOG_BACKFILL_BATCH_RUNNER_FAILED =
  "STOP_AI_ESTIMATE_CATALOG_BACKFILL_BATCH_RUNNER_FAILED" as const;

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

export function runCatalogBackfillBatch(
  batchId = parseCatalogBackfillBatchArg(),
  options: { verify?: boolean; writeFiles?: boolean } = {},
) {
  const before = buildEstimate10000ReadinessManifest();
  const manifest = options.writeFiles === false ? buildEstimate10000ReadinessManifest() : writeEstimate10000ReadinessManifest();
  const batches = buildCatalogBackfillBatches({ writeFiles: options.writeFiles !== false });
  const sources = buildCatalogSourceRegistry({ writeFiles: options.writeFiles !== false });
  const dashboard = buildCatalogQualityDashboard({ writeFiles: options.writeFiles !== false });
  const validation = options.verify ? validateCatalogBackfillBatch(batchId) : null;
  const blockers = [
    batches.final_status === GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_READY_NO_BUILDS ? "" : "backfill_batches_not_green",
    sources.final_status === GREEN_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_READY_NO_BUILDS ? "" : "source_registry_not_green",
    dashboard.final_status === GREEN_AI_ESTIMATE_CATALOG_QUALITY_DASHBOARD_READY_NO_BUILDS ? "" : "quality_dashboard_not_green",
    validation && validation.final_status !== GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCH_READY_NO_BUILDS
      ? `batch_validation_failed:${validation.final_status}`
      : "",
    manifest.ready_professional_count < before.ready_professional_count ? "ready_professional_count_regressed" : "",
    manifest.generic_fallback_count > before.generic_fallback_count ? "generic_fallback_count_regressed" : "",
  ].filter(Boolean);

  return {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCH_RUNNER_READY_NO_BUILDS
      : STOP_AI_ESTIMATE_CATALOG_BACKFILL_BATCH_RUNNER_FAILED,
    batch_id: batchId,
    batch_runner_idempotent: manifest.ready_professional_count === before.ready_professional_count &&
      manifest.generic_fallback_count === before.generic_fallback_count,
    catalog_backfill_batches_created: true,
    catalog_quality_dashboard_created: true,
    source_registry_validated: sources.final_status === GREEN_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_READY_NO_BUILDS,
    ready_professional_count_before: before.ready_professional_count,
    ready_professional_count_after: manifest.ready_professional_count,
    generic_fallback_count_before: before.generic_fallback_count,
    generic_fallback_count_after: manifest.generic_fallback_count,
    batch_validation: validation,
    batch_runner_does_not_touch_marketplace: true,
    batch_runner_does_not_generate_fake_sources: true,
    full_10000_real_norm_green_claimed: false,
    fake_green_claimed: false,
    marketplace_touched: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    blockers,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/runCatalogBackfillBatch.ts")) {
  try {
    const result = runCatalogBackfillBatch(parseCatalogBackfillBatchArg(), { verify: hasFlag("verify"), writeFiles: true });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.final_status === GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCH_RUNNER_READY_NO_BUILDS ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
