import type {
  ConstructionDataGraphEvent,
  ConstructionObjectReportSection,
} from "./constructionDataGraphTypes";

function eventQuantity(event: ConstructionDataGraphEvent): string {
  if (typeof event.actualQty === "number" && event.unit) return `${event.actualQty} ${event.unit}`;
  if (typeof event.plannedQty === "number" && event.unit) return `план ${event.plannedQty} ${event.unit}`;
  return "объём не подтверждён";
}

function doneLine(event: ConstructionDataGraphEvent): string {
  return `${event.workNameRu ?? "Работа без названия"} - ${event.status}, ${eventQuantity(event)}, ${event.date}`;
}

function missingLines(event: ConstructionDataGraphEvent): string[] {
  return event.blockers.map((blocker) => blocker.textRu);
}

export function composeConstructionObjectReportSections(
  events: ConstructionDataGraphEvent[],
): ConstructionObjectReportSection[] {
  const byObject = new Map<string, ConstructionObjectReportSection>();
  for (const event of events) {
    const section = byObject.get(event.objectId) ?? {
      objectId: event.objectId,
      objectNameRu: event.objectNameRu,
      done: [],
      notDone: [],
      missing: [],
      sources: [],
    };
    if (event.status === "done" || event.status === "ready_for_act") {
      section.done.push(doneLine(event));
    } else {
      section.notDone.push(doneLine(event));
    }
    section.missing.push(...missingLines(event));
    section.sources.push(...event.sourceRefs);
    byObject.set(event.objectId, section);
  }

  return Array.from(byObject.values()).map((section) => ({
    ...section,
    missing: [...new Set(section.missing)],
    sources: [...new Set(section.sources)],
  }));
}

export const constructionReportComposer = composeConstructionObjectReportSections;
