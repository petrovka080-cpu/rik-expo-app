import path from "node:path";

import { validateAiEstimateCatalogIndex } from "../../src/lib/estimate/catalog/validateAiEstimateCatalogIndex";
import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";

export const GREEN_AI_ESTIMATE_CATALOG_INDEX_11610 =
  "GREEN_AI_ESTIMATE_CATALOG_INDEX_11610" as const;
export const STOP_AI_ESTIMATE_CATALOG_INDEX_11610_FAILED =
  "STOP_AI_ESTIMATE_CATALOG_INDEX_11610_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-platform-core-v2-semantic-scale-refactor", "catalog-index");

export function auditAiEstimateCatalogIndex11610(input: { writeSummary?: boolean } = {}) {
  const validation = validateAiEstimateCatalogIndex();
  const summary = {
    final_status: validation.ok ? GREEN_AI_ESTIMATE_CATALOG_INDEX_11610 : STOP_AI_ESTIMATE_CATALOG_INDEX_11610_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    catalog_index_created: true,
    catalog_total_templates: validation.catalogTotalTemplates,
    catalog_index_coverage: validation.catalogIndexCoverage,
    catalog_index_build_deterministic: validation.catalogIndexBuildDeterministic,
    catalog_index_no_names_only_templates: validation.catalogIndexNoNamesOnlyTemplates,
    catalog_index_no_generic_fallback_templates: validation.catalogIndexNoGenericFallbackTemplates,
    catalog_search_supports_ru_morphology_aliases: validation.catalogSearchSupportsRuMorphologyAliases,
    catalog_search_top_k_deterministic: validation.catalogSearchTopKDeterministic,
    catalog_search_does_not_scan_full_catalog_in_ui_path: validation.catalogSearchDoesNotScanFullCatalogInUiPath,
    catalog_search_p95_ms: validation.catalogSearchP95Ms,
    catalog_search_p99_ms: validation.catalogSearchP99Ms,
    memory_budget_violations_count: validation.memoryBudgetViolationsCount,
    blockers: validation.blockingReasons,
  };
  const summaryPath = path.join(ROOT, timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = auditAiEstimateCatalogIndex11610({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_CATALOG_INDEX_11610) process.exitCode = 1;
}
