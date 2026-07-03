import {
  buildCatalogBackfillBatches,
  GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_READY_NO_BUILDS,
  type CatalogBackfillBatches,
} from "./buildCatalogBackfillBatches";
import {
  batchDefinitionById,
  type CatalogBackfillBatchId,
} from "./catalogBackfillConveyor";

export const GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCH_READY_NO_BUILDS =
  "GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCH_READY_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_CATALOG_BACKFILL_BATCH_FAILED =
  "STOP_AI_ESTIMATE_CATALOG_BACKFILL_BATCH_FAILED" as const;

const BATCH_ALIASES: Record<string, CatalogBackfillBatchId> = {
  "p0-critical": "p0-critical",
  "p1-high-volume-repair": "p1-high-volume-repair",
  "p2-structural-exterior": "p2-structural-exterior",
  "p3-long-tail": "p3-long-tail",
};

export function parseCatalogBackfillBatchArg(): CatalogBackfillBatchId {
  const inline = process.argv.find((arg) => arg.startsWith("--batch="));
  const raw = inline?.slice("--batch=".length) ?? process.argv[process.argv.indexOf("--batch") + 1];
  const normalized = String(raw ?? "").trim();
  const batchId = BATCH_ALIASES[normalized];
  if (!batchId) throw new Error(`CATALOG_BACKFILL_BATCH_ARG_REQUIRED_OR_UNSUPPORTED:${normalized || "missing"}`);
  return batchId;
}

function summaryForBatch(artifact: CatalogBackfillBatches, batchId: CatalogBackfillBatchId) {
  return artifact.batches[batchDefinitionById(batchId).legacy_priority];
}

export function validateCatalogBackfillBatch(batchId: CatalogBackfillBatchId) {
  const artifact = buildCatalogBackfillBatches({ writeFiles: false });
  const batch = summaryForBatch(artifact, batchId);
  const blockers = [
    artifact.final_status === GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_READY_NO_BUILDS
      ? ""
      : `catalog_backfill_batches_status:${artifact.final_status}`,
    batch.template_count > 0 ? "" : `batch_empty:${batchId}`,
    batchId === "p3-long-tail" || batch.ready_professional_count === batch.template_count
      ? ""
      : `batch_ready_professional_count:${batch.ready_professional_count}/${batch.template_count}`,
    batchId === "p3-long-tail" || batch.generic_fallback_count === 0
      ? ""
      : `batch_generic_fallback_count:${batch.generic_fallback_count}`,
    batchId === "p3-long-tail" || batch.synthetic_family_default_count === 0
      ? ""
      : `batch_synthetic_family_default_count:${batch.synthetic_family_default_count}`,
  ].filter(Boolean);

  return {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCH_READY_NO_BUILDS
      : STOP_AI_ESTIMATE_CATALOG_BACKFILL_BATCH_FAILED,
    batch_id: batchId,
    template_count: batch.template_count,
    ready_professional_count: batch.ready_professional_count,
    generic_fallback_count: batch.generic_fallback_count,
    synthetic_family_default_count: batch.synthetic_family_default_count,
    batch_runner_does_not_generate_fake_sources: batchId === "p3-long-tail" || batch.generic_fallback_count === 0,
    ready_count_increases_only_with_source_backed_norms: batchId === "p3-long-tail" || batch.ready_professional_count === batch.template_count,
    full_10000_real_norm_green_claimed: false,
    fake_green_claimed: false,
    marketplace_touched: false,
    blockers,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/validateCatalogBackfillBatch.ts")) {
  try {
    const result = validateCatalogBackfillBatch(parseCatalogBackfillBatchArg());
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.final_status === GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCH_READY_NO_BUILDS ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
