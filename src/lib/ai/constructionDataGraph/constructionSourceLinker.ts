import type { ConstructionKnowledgeSource } from "../constructionKnowledgeCore";
import type {
  ConstructionDataGraphEvent,
  ConstructionLinkedSource,
} from "./constructionDataGraphTypes";

function linkedToEvent(
  source: ConstructionKnowledgeSource,
  event: ConstructionDataGraphEvent,
): boolean {
  if (event.sourceRefs.includes(source.id)) return true;
  if (source.linkedWorkId && event.workId && source.linkedWorkId === event.workId) return true;
  if (source.linkedObjectId && source.linkedObjectId === event.objectId) return true;
  if (source.linkedContractorId && event.contractorId && source.linkedContractorId === event.contractorId) return true;
  return false;
}

export function linkConstructionSourcesToEvents(params: {
  events: ConstructionDataGraphEvent[];
  sources: ConstructionKnowledgeSource[];
}): ConstructionLinkedSource[] {
  return params.events.flatMap((event) =>
    params.sources
      .filter((source) => linkedToEvent(source, event))
      .map((source) => ({
        eventId: event.id,
        eventWorkId: event.workId,
        source,
      })),
  );
}

export const constructionSourceLinker = linkConstructionSourcesToEvents;
