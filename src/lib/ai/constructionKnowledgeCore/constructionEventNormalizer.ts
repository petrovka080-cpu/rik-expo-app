import type {
  ConstructionDiscipline,
  ConstructionEvent,
  ConstructionKnowledgeSource,
  ConstructionProjectType,
} from "./constructionKnowledgeTypes";

export type ConstructionWorkRecord = {
  id: string;
  nameRu: string;
  objectId?: string;
  objectNameRu?: string;
  zoneId?: string;
  zoneNameRu?: string;
  discipline?: ConstructionDiscipline;
  projectType?: ConstructionProjectType;
  plannedQty?: number;
  actualQty?: number;
  unit?: string;
  status?: ConstructionEvent["status"];
  estimateLineId?: string;
  materialIds?: string[];
  sourceRefs?: string[];
  missingPhoto?: boolean;
  missingDocument?: boolean;
  materialBlocked?: boolean;
  approvalMissing?: boolean;
};

function eventDiscipline(record: ConstructionWorkRecord): ConstructionEvent["discipline"] {
  const discipline = record.discipline ?? "civil";
  if (discipline === "as_built" || discipline === "safety") return "quality_control";
  return discipline;
}

export function normalizeConstructionEventFromWork(
  record: ConstructionWorkRecord,
): ConstructionEvent {
  const blockers: ConstructionEvent["blockers"] = [];
  if (record.missingPhoto) blockers.push({ kind: "photo_missing", textRu: "Не хватает фотофиксации." });
  if (record.missingDocument) blockers.push({ kind: "document_missing", textRu: "Не хватает документа-основания." });
  if (record.materialBlocked) blockers.push({ kind: "material_missing", textRu: "Работа заблокирована материалом." });
  if (record.approvalMissing) blockers.push({ kind: "approval_missing", textRu: "Не хватает согласования." });

  return {
    id: `event:work:${record.id}`,
    projectType: record.projectType,
    discipline: eventDiscipline(record),
    objectId: record.objectId,
    objectNameRu: record.objectNameRu,
    zoneId: record.zoneId,
    zoneNameRu: record.zoneNameRu,
    workId: record.id,
    workNameRu: record.nameRu,
    plannedQty: record.plannedQty,
    actualQty: record.actualQty,
    unit: record.unit,
    estimateLineId: record.estimateLineId,
    materialIds: record.materialIds,
    status: record.status ?? (blockers.length > 0 ? "blocked" : "not_confirmed"),
    blockers,
    sourceRefs: record.sourceRefs ?? [`work:${record.id}`],
  };
}

export function normalizeConstructionEvents(params: {
  works?: ConstructionWorkRecord[];
  sources?: ConstructionKnowledgeSource[];
}): ConstructionEvent[] {
  const fromWorks = (params.works ?? []).map(normalizeConstructionEventFromWork);
  const fromSources = (params.sources ?? [])
    .filter((source) => source.type === "work")
    .map((source) => normalizeConstructionEventFromWork({
      id: source.linkedWorkId ?? source.id,
      nameRu: source.labelRu,
      objectId: source.linkedObjectId,
      estimateLineId: source.linkedEstimateLineId,
      materialIds: source.linkedMaterialId ? [source.linkedMaterialId] : undefined,
      sourceRefs: [source.id],
      status: "not_confirmed",
    }));
  return [...fromWorks, ...fromSources];
}

export const constructionEventNormalizer = normalizeConstructionEvents;
