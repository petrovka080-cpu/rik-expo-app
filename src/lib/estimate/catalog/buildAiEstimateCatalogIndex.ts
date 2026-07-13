import { estimateDeterministicHash } from "../estimateDeterministicHash";
import {
  buildAiEstimateNormativeWorkParameterPassport,
  listAiEstimateNormativeWorkParameterPassportTemplateIds,
} from "../aiEstimateNormativeWorkParameterPassport";
import { buildProfessionalWorkPassport, clearProfessionalWorkPassportBuildCaches } from "../buildProfessionalWorkPassport";
import type {
  AiEstimateCatalogComplexityClass,
  AiEstimateCatalogIndex,
  AiEstimateCatalogIndexEntry,
} from "./AiEstimateCatalogIndex";
import { normalizeAiEstimateCatalogSearchTokens } from "./normalizeAiEstimateCatalogSearchTokens";

let catalogIndexCache: AiEstimateCatalogIndex | null = null;

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function complexityClass(rowCount: number, requirementCount: number): AiEstimateCatalogComplexityClass {
  const size = rowCount + requirementCount;
  if (size <= 16) return "simple";
  if (size <= 64) return "standard";
  if (size <= 180) return "large";
  return "complex";
}

function entryForTemplate(templateId: string): AiEstimateCatalogIndexEntry {
  const passport = buildProfessionalWorkPassport(templateId);
  const normative = buildAiEstimateNormativeWorkParameterPassport(templateId);
  if (!passport || !normative) {
    throw new Error(`AI_ESTIMATE_CATALOG_INDEX_TEMPLATE_UNREADY:${templateId}`);
  }
  const rows = passport.boqRecipe.allRows;
  const parameterPassportKeys = normative.requirements.map((item) => item.key);
  const requiredParameterKeys = normative.requirements
    .filter((item) => item.role === "required_for_quantity" || item.role === "required_for_professional_accuracy")
    .map((item) => item.key);
  const quantityFormulaRefs = uniqueSorted([
    ...rows.map((row) => row.quantityFormula),
    ...normative.requirements.flatMap((item) => item.formulaRefs),
  ]);
  return {
    templateId: passport.templateId,
    workFamily: normative.workFamily,
    localizedNameRu: passport.localizedNameRu,
    aliasesRu: uniqueSorted(passport.aliases),
    normalizedSearchTokens: normalizeAiEstimateCatalogSearchTokens([
      passport.templateId,
      passport.workKey,
      passport.familyId,
      passport.category,
      passport.localizedNameRu,
      ...passport.aliases,
      ...parameterPassportKeys,
    ].join(" ")),
    parameterPassportKeys: uniqueSorted(parameterPassportKeys),
    requiredParameterKeys: uniqueSorted(requiredParameterKeys),
    quantityFormulaRefs,
    materialFamilies: uniqueSorted(rows.map((row) => row.normFamilyId ?? row.rowType)),
    unitFamilies: uniqueSorted(rows.map((row) => row.canonicalUnit)),
    complexityClass: complexityClass(rows.length, normative.requirements.length),
    runtimeReadiness: rows.length > 0 && normative.requirements.length > 0 ? "ready" : "blocked",
  };
}

function buildTokenIndex(entries: readonly AiEstimateCatalogIndexEntry[]): Map<string, string[]> {
  const tokenMap = new Map<string, string[]>();
  for (const entry of entries) {
    for (const token of entry.normalizedSearchTokens) {
      const values = tokenMap.get(token) ?? [];
      values.push(entry.templateId);
      tokenMap.set(token, values);
    }
  }
  for (const [token, values] of tokenMap) tokenMap.set(token, uniqueSorted(values));
  return tokenMap;
}

export function buildAiEstimateCatalogIndex(input: { forceRebuild?: boolean } = {}): AiEstimateCatalogIndex {
  if (catalogIndexCache && !input.forceRebuild) return catalogIndexCache;
  const ids = listAiEstimateNormativeWorkParameterPassportTemplateIds().slice().sort();
  const entries = ids.map((templateId, index) => {
    const entry = entryForTemplate(templateId);
    if (index > 0 && index % 500 === 0) clearProfessionalWorkPassportBuildCaches();
    return entry;
  });
  clearProfessionalWorkPassportBuildCaches();
  const byTemplateId = new Map(entries.map((entry) => [entry.templateId, entry]));
  const tokenToTemplateIds = buildTokenIndex(entries);
  catalogIndexCache = {
    schema: "ai-estimate-catalog-index-v1",
    catalogTotalTemplates: entries.length,
    entries,
    byTemplateId,
    tokenToTemplateIds,
    buildFingerprint: estimateDeterministicHash(entries.map((entry) => ({
      templateId: entry.templateId,
      workFamily: entry.workFamily,
      parameterPassportKeys: entry.parameterPassportKeys,
      requiredParameterKeys: entry.requiredParameterKeys,
      quantityFormulaRefs: entry.quantityFormulaRefs,
      runtimeReadiness: entry.runtimeReadiness,
    }))),
  };
  return catalogIndexCache;
}

export function clearAiEstimateCatalogIndexCache(): void {
  catalogIndexCache = null;
}
