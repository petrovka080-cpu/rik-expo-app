import type {
  ConstructionDataGraphEvent,
  ConstructionMissingDataSummary,
} from "./constructionDataGraphTypes";

const blockerLabels: Record<string, string> = {
  photo_missing: "фото",
  document_missing: "документ",
  signature_missing: "подпись",
  material_missing: "материал",
  approval_missing: "согласование",
  act_missing: "акт",
  remark_open: "закрытие замечания",
};

export function detectConstructionMissingData(
  events: ConstructionDataGraphEvent[],
): ConstructionMissingDataSummary[] {
  return events
    .map((event) => ({
      eventId: event.id,
      workNameRu: event.workNameRu,
      missing: event.blockers.map((blocker) => blocker.textRu || blockerLabels[blocker.kind] || blocker.kind),
    }))
    .filter((entry) => entry.missing.length > 0);
}

export const constructionMissingDataDetector = detectConstructionMissingData;
