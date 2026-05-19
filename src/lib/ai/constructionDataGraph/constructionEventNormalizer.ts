import type {
  ConstructionDataGraphEvent,
  ConstructionDataGraphEventInput,
} from "./constructionDataGraphTypes";

function fallbackId(input: ConstructionDataGraphEventInput, index: number): string {
  return input.id ?? input.workId ?? `construction-event-${index + 1}`;
}

export function normalizeConstructionEvents(
  inputs: ConstructionDataGraphEventInput[],
  fallbackDate: string,
): ConstructionDataGraphEvent[] {
  return inputs.map((input, index) => ({
    id: fallbackId(input, index),
    date: input.date ?? fallbackDate,
    objectId: input.objectId ?? "object:unknown",
    objectNameRu: input.objectNameRu ?? "Объект не выбран",
    zoneId: input.zoneId,
    zoneNameRu: input.zoneNameRu,
    workId: input.workId,
    workNameRu: input.workNameRu,
    contractorId: input.contractorId,
    contractorNameRu: input.contractorNameRu,
    plannedQty: input.plannedQty,
    actualQty: input.actualQty,
    unit: input.unit,
    status: input.status ?? "not_confirmed",
    blockers: input.blockers ?? [],
    sourceRefs: input.sourceRefs ?? [],
  }));
}

export const constructionEventNormalizer = normalizeConstructionEvents;
