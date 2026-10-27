import type { ConstructionKnowledgeSource } from "../constructionKnowledgeCore";

export type ConstructionDataGraphBlockerKind =
  | "photo_missing"
  | "document_missing"
  | "signature_missing"
  | "material_missing"
  | "approval_missing"
  | "act_missing"
  | "remark_open";

export type ConstructionDataGraphEventStatus =
  | "planned"
  | "in_progress"
  | "done"
  | "partially_done"
  | "blocked"
  | "ready_for_act"
  | "not_confirmed";

export type ConstructionDataGraphEvent = {
  id: string;
  date: string;
  objectId: string;
  objectNameRu: string;
  zoneId?: string;
  zoneNameRu?: string;
  workId?: string;
  workNameRu?: string;
  contractorId?: string;
  contractorNameRu?: string;
  plannedQty?: number;
  actualQty?: number;
  unit?: string;
  status: ConstructionDataGraphEventStatus;
  blockers: {
    kind: ConstructionDataGraphBlockerKind;
    textRu: string;
  }[];
  sourceRefs: string[];
};

export type ConstructionDataGraphEventInput = Omit<
  ConstructionDataGraphEvent,
  "id" | "date" | "objectId" | "objectNameRu" | "status" | "blockers" | "sourceRefs"
> & {
  id?: string;
  date?: string;
  objectId?: string;
  objectNameRu?: string;
  workId?: string;
  workNameRu?: string;
  status?: ConstructionDataGraphEventStatus;
  blockers?: ConstructionDataGraphEvent["blockers"];
  sourceRefs?: string[];
};

export type ConstructionLinkedSource = {
  eventId: string;
  eventWorkId?: string;
  source: ConstructionKnowledgeSource;
};

export type ConstructionTimelineObjectGroup = {
  objectId: string;
  objectNameRu: string;
  events: ConstructionDataGraphEvent[];
};

export type ConstructionTimeline = {
  periodRu: string;
  from: string;
  to: string;
  objects: ConstructionTimelineObjectGroup[];
};

export type ConstructionReadinessSummary = {
  total: number;
  done: number;
  notClosed: number;
  readyForAct: number;
  materialBlocked: number;
  missingEvidence: number;
  readinessScore: number;
};

export type ConstructionMissingDataSummary = {
  eventId: string;
  workNameRu?: string;
  missing: string[];
};

export type ConstructionObjectReportSection = {
  objectId: string;
  objectNameRu: string;
  done: string[];
  notDone: string[];
  missing: string[];
  sources: string[];
};
