import type {
  ConstructionEntityExtraction,
  ConstructionKnowledgeSource,
} from "./constructionKnowledgeTypes";

export type ConstructionLinkCandidate = {
  objectId?: string;
  objectNameRu?: string;
  workId?: string;
  workNameRu?: string;
  materialId?: string;
  materialNameRu?: string;
  estimateLineId?: string;
};

function includesText(value: string | undefined, needle: string | undefined): boolean {
  if (!value || !needle) return false;
  return value.toLowerCase().includes(needle.toLowerCase()) ||
    needle.toLowerCase().includes(value.toLowerCase());
}

export function linkConstructionSourceToEntities(params: {
  extraction: ConstructionEntityExtraction;
  candidates: ConstructionLinkCandidate[];
}): ConstructionKnowledgeSource {
  const source = { ...params.extraction.source };
  for (const candidate of params.candidates) {
    if (!source.linkedObjectId && includesText(source.labelRu, candidate.objectNameRu)) {
      source.linkedObjectId = candidate.objectId;
    }
    if (!source.linkedWorkId && includesText(source.labelRu, candidate.workNameRu)) {
      source.linkedWorkId = candidate.workId;
    }
    if (!source.linkedMaterialId && params.extraction.materials.some((item) => includesText(item.labelRu, candidate.materialNameRu))) {
      source.linkedMaterialId = candidate.materialId;
    }
    if (!source.linkedEstimateLineId && params.extraction.estimateLineIds.some((item) => item.id === candidate.estimateLineId)) {
      source.linkedEstimateLineId = candidate.estimateLineId;
    }
  }
  return source;
}

export const constructionSourceLinker = linkConstructionSourceToEntities;
