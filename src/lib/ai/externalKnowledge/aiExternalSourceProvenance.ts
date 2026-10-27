import type {
  AiExternalKnowledgeSourceRef,
  AiExternalKnowledgeSourceType,
} from "./aiExternalKnowledgeSourceTypes";

export type AiExternalSourceProvenanceItem = {
  sourceRefId: string;
  titleRu: string;
  sourceType: AiExternalKnowledgeSourceType;
  origin: AiExternalKnowledgeSourceRef["origin"];
  url?: string;
  domain?: string;
  checkedAt: string;
  canBeUsedAsProjectFact: false;
  requiresReview: boolean;
};

export function buildAiExternalSourceProvenance(
  sources: AiExternalKnowledgeSourceRef[],
): AiExternalSourceProvenanceItem[] {
  return sources.map((source) => ({
    sourceRefId: source.id,
    titleRu: source.titleRu,
    sourceType: source.sourceType,
    origin: source.origin,
    url: source.url,
    domain: source.domain,
    checkedAt: source.checkedAt,
    canBeUsedAsProjectFact: false,
    requiresReview: source.requiresReview,
  }));
}

export function formatAiExternalSourceProvenanceRu(
  sources: AiExternalKnowledgeSourceRef[],
): string[] {
  return buildAiExternalSourceProvenance(sources).map((source) =>
    `${source.titleRu}; тип: ${source.sourceType}; дата проверки: ${source.checkedAt}; URL: ${source.url ?? "не применимо"}; требует проверки: ${source.requiresReview ? "да" : "нет"}`,
  );
}
