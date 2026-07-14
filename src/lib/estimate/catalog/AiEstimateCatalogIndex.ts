import type { AiEstimateNormativeWorkFamily } from "../aiEstimateNormativeParameterFamilies";

export type AiEstimateCatalogRuntimeReadiness = "ready" | "blocked";

export type AiEstimateCatalogComplexityClass = "simple" | "standard" | "large" | "complex";

export type AiEstimateCatalogIndexEntry = {
  templateId: string;
  workFamily: AiEstimateNormativeWorkFamily;
  localizedNameRu: string;
  aliasesRu: string[];
  normalizedSearchTokens: string[];
  parameterPassportKeys: string[];
  requiredParameterKeys: string[];
  quantityFormulaRefs: string[];
  materialFamilies: string[];
  unitFamilies: string[];
  complexityClass: AiEstimateCatalogComplexityClass;
  runtimeReadiness: AiEstimateCatalogRuntimeReadiness;
};

export type AiEstimateCatalogIndex = {
  schema: "ai-estimate-catalog-index-v1";
  catalogTotalTemplates: number;
  entries: AiEstimateCatalogIndexEntry[];
  byTemplateId: Map<string, AiEstimateCatalogIndexEntry>;
  tokenToTemplateIds: Map<string, string[]>;
  buildFingerprint: string;
};

export type AiEstimateCatalogSearchHit = {
  entry: AiEstimateCatalogIndexEntry;
  score: number;
  matchedTokens: string[];
};
