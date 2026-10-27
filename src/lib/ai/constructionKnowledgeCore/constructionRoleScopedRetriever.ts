import { sanitizeConstructionSourcesForRole } from "./constructionSourceSanitizer";
import type {
  ConstructionAccessScope,
  ConstructionEvent,
  ConstructionKnowledgeSource,
} from "./constructionKnowledgeTypes";

export type ConstructionRoleScopedRetrieval = {
  sources: ConstructionKnowledgeSource[];
  events: ConstructionEvent[];
  deniedSourceIds: string[];
  providerTrace: string[];
};

function eventAllowed(event: ConstructionEvent, sources: ConstructionKnowledgeSource[]): boolean {
  const sourceIds = new Set(sources.map((source) => source.id));
  return event.sourceRefs.length === 0 || event.sourceRefs.some((ref) => sourceIds.has(ref));
}

export function retrieveConstructionRoleScopedContext(params: {
  scope: ConstructionAccessScope;
  sources: ConstructionKnowledgeSource[];
  events?: ConstructionEvent[];
}): ConstructionRoleScopedRetrieval {
  const sources = sanitizeConstructionSourcesForRole({
    scope: params.scope,
    sources: params.sources,
  });
  const allowedIds = new Set(sources.map((source) => source.id));
  return {
    sources,
    events: (params.events ?? []).filter((event) => eventAllowed(event, sources)),
    deniedSourceIds: params.sources
      .filter((source) => !allowedIds.has(source.id))
      .map((source) => source.id),
    providerTrace: ["aiRoleAccessPolicyProvider", "constructionRoleScopedRetriever"],
  };
}

export const constructionRoleScopedRetriever = retrieveConstructionRoleScopedContext;
