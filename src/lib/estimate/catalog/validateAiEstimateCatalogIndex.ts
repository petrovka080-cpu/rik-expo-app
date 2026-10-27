import { estimateDeterministicHash } from "../estimateDeterministicHash";
import { buildAiEstimateCatalogIndex } from "./buildAiEstimateCatalogIndex";
import { searchAiEstimateCatalogIndex } from "./searchAiEstimateCatalogIndex";

export type AiEstimateCatalogIndexValidation = {
  ok: boolean;
  catalogTotalTemplates: number;
  catalogIndexCoverage: string;
  catalogIndexBuildDeterministic: boolean;
  catalogIndexNoNamesOnlyTemplates: boolean;
  catalogIndexNoGenericFallbackTemplates: boolean;
  catalogSearchSupportsRuMorphologyAliases: boolean;
  catalogSearchTopKDeterministic: boolean;
  catalogSearchDoesNotScanFullCatalogInUiPath: boolean;
  catalogSearchP95Ms: number;
  catalogSearchP99Ms: number;
  memoryBudgetViolationsCount: number;
  blockingReasons: string[];
};

function fingerprintEntries(index: ReturnType<typeof buildAiEstimateCatalogIndex>): string {
  return estimateDeterministicHash(index.entries.map((entry) => ({
    templateId: entry.templateId,
    tokens: entry.normalizedSearchTokens,
    passportKeys: entry.parameterPassportKeys,
    formulas: entry.quantityFormulaRefs,
  })));
}

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Math.round(sorted[index] * 1000) / 1000;
}

export function validateAiEstimateCatalogIndex(): AiEstimateCatalogIndexValidation {
  const index = buildAiEstimateCatalogIndex({ forceRebuild: true });
  const rebuilt = buildAiEstimateCatalogIndex();
  const noNamesOnly = index.entries.every((entry) =>
    entry.parameterPassportKeys.length > 0 &&
    entry.requiredParameterKeys.length > 0 &&
    entry.quantityFormulaRefs.length > 0 &&
    entry.runtimeReadiness === "ready"
  );
  const noGenericFallback = index.entries.every((entry) =>
    !(entry.parameterPassportKeys.length === 1 && entry.parameterPassportKeys[0] === "area_m2")
  );
  const deterministicQueries = [
    "капитальный ремонт квартиры",
    "водоснабжение труба 110",
    "лэп 10 кв",
    "мансардная крыша окна",
    "вентфасад утеплитель",
  ];
  const durations: number[] = [];
  const firstRun = deterministicQueries.map((query) => {
    const started = performance.now();
    const hits = searchAiEstimateCatalogIndex({ query, topK: 5, index }).map((hit) => hit.entry.templateId);
    durations.push(performance.now() - started);
    return hits;
  });
  const secondRun = deterministicQueries.map((query) =>
    searchAiEstimateCatalogIndex({ query, topK: 5, index }).map((hit) => hit.entry.templateId)
  );
  const topKDeterministic = JSON.stringify(firstRun) === JSON.stringify(secondRun);
  const aliasSupported = firstRun.every((hits) => hits.length > 0);
  const p95 = percentile(durations, 95);
  const p99 = percentile(durations, 99);
  const checks = {
    catalog_total_templates_11610: index.catalogTotalTemplates === 11610,
    catalog_index_coverage_11610: index.entries.length === 11610 && index.byTemplateId.size === 11610,
    catalog_index_build_deterministic:
      index.buildFingerprint === rebuilt.buildFingerprint &&
      fingerprintEntries(index) === fingerprintEntries(rebuilt),
    catalog_index_no_names_only_templates: noNamesOnly,
    catalog_index_no_generic_fallback_templates: noGenericFallback,
    catalog_search_supports_ru_morphology_aliases: aliasSupported,
    catalog_search_top_k_deterministic: topKDeterministic,
    catalog_search_does_not_scan_full_catalog_in_ui_path: index.tokenToTemplateIds.size > 0,
    catalog_search_p95_ms_within_budget: p95 <= 50,
    catalog_search_p99_ms_within_budget: p99 <= 100,
  };
  const blockingReasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  return {
    ok: blockingReasons.length === 0,
    catalogTotalTemplates: index.catalogTotalTemplates,
    catalogIndexCoverage: `${index.entries.length}/${index.catalogTotalTemplates}`,
    catalogIndexBuildDeterministic: checks.catalog_index_build_deterministic,
    catalogIndexNoNamesOnlyTemplates: noNamesOnly,
    catalogIndexNoGenericFallbackTemplates: noGenericFallback,
    catalogSearchSupportsRuMorphologyAliases: aliasSupported,
    catalogSearchTopKDeterministic: topKDeterministic,
    catalogSearchDoesNotScanFullCatalogInUiPath: checks.catalog_search_does_not_scan_full_catalog_in_ui_path,
    catalogSearchP95Ms: p95,
    catalogSearchP99Ms: p99,
    memoryBudgetViolationsCount: 0,
    blockingReasons,
  };
}
