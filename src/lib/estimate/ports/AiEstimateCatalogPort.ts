import type { AiEstimateCatalogIndex, AiEstimateCatalogIndexEntry, AiEstimateCatalogSearchHit } from "../catalog/AiEstimateCatalogIndex";
import type { AiEstimateWorkClassification } from "../semantic/AiEstimateWorkClassifier";

export type AiEstimateCatalogPort = {
  readonly portKind: "estimate_catalog";
  buildIndex(): AiEstimateCatalogIndex;
  classifyWork(input: string | AiEstimateCatalogIndexEntry): AiEstimateWorkClassification;
  search(query: string, limit?: number): AiEstimateCatalogSearchHit[];
};
