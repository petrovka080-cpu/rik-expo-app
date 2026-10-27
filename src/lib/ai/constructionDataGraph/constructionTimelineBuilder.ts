import type {
  ConstructionDataGraphEvent,
  ConstructionTimeline,
  ConstructionTimelineObjectGroup,
} from "./constructionDataGraphTypes";

function sortByDate(a: ConstructionDataGraphEvent, b: ConstructionDataGraphEvent): number {
  return a.date.localeCompare(b.date) || a.objectNameRu.localeCompare(b.objectNameRu);
}

function periodLabel(from: string, to: string): string {
  if (!from && !to) return "Период не выбран";
  if (from === to) return from;
  return `${from} - ${to}`;
}

export function buildConstructionTimeline(events: ConstructionDataGraphEvent[]): ConstructionTimeline {
  const sorted = [...events].sort(sortByDate);
  const first = sorted[0]?.date ?? "";
  const last = sorted[sorted.length - 1]?.date ?? first;
  const groups = new Map<string, ConstructionTimelineObjectGroup>();

  for (const event of sorted) {
    const key = event.objectId;
    const current = groups.get(key) ?? {
      objectId: event.objectId,
      objectNameRu: event.objectNameRu,
      events: [],
    };
    current.events.push(event);
    groups.set(key, current);
  }

  return {
    periodRu: periodLabel(first, last),
    from: first,
    to: last,
    objects: Array.from(groups.values()),
  };
}

export const constructionTimelineBuilder = buildConstructionTimeline;
