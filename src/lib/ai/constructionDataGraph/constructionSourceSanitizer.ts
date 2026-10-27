import {
  sanitizeConstructionSourcesForRole,
  type ConstructionAccessScope,
  type ConstructionKnowledgeSource,
} from "../constructionKnowledgeCore";

export function sanitizeConstructionSourcesForForeman(params: {
  sources: ConstructionKnowledgeSource[];
  allowedObjectIds?: string[];
  allowedWorkIds?: string[];
  allowedDocumentIds?: string[];
  allowedMaterialIds?: string[];
  allowedContractorIds?: string[];
}): ConstructionKnowledgeSource[] {
  const scope: ConstructionAccessScope = {
    role: "foreman",
    screenId: "foreman.main",
    allowedObjectIds: params.allowedObjectIds,
    allowedWorkIds: params.allowedWorkIds,
    allowedDocumentIds: params.allowedDocumentIds,
    allowedMaterialIds: params.allowedMaterialIds,
    allowedContractorIds: params.allowedContractorIds,
  };
  return sanitizeConstructionSourcesForRole({
    scope,
    sources: params.sources,
  });
}

export const constructionDataGraphSourceSanitizer = sanitizeConstructionSourcesForForeman;
