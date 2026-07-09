export type AiEstimateLedgerEstimateKind =
  | "consumer_repair"
  | "request_estimate"
  | "office_estimate"
  | "ai_estimate";

export type AiEstimateLedgerStatus =
  | "draft"
  | "approved"
  | "sent_to_marketplace"
  | "archived"
  | "deleted";

export type AiEstimateLedgerSourceLayer =
  | "runtime"
  | "consumer_request"
  | "office_estimate"
  | "legacy_migration"
  | "offline_sync"
  | "server_api";

export type AiEstimateLedgerArtifactRefs = {
  snapshotId: string | null;
  pdfArtifactId: string | null;
  buyerHandoffId: string | null;
  artifactsValidForRevisionId: string | null;
};

export type AiEstimateLedgerRevision = {
  revisionId: string;
  previousRevisionId: string | null;
  source: string;
  createdAt: string;
  params: Record<string, unknown>;
  rowCount: number;
  materialRowsCount: number;
  workRowsCount: number;
  snapshotId: string | null;
  pdfArtifactId: string | null;
  buyerHandoffId: string | null;
  artifactsValidForRevisionId: string | null;
  immutable: true;
};

export type AiEstimateLedgerEventType =
  | "draft_upserted"
  | "revision_appended"
  | "artifacts_bound"
  | "revision_approved"
  | "status_changed"
  | "legacy_migrated"
  | "offline_operation_synced";

export type AiEstimateLedgerEvent = {
  eventId: string;
  eventType: AiEstimateLedgerEventType;
  idempotencyKey: string;
  actorUserId: string | null;
  sourceLayer: AiEstimateLedgerSourceLayer;
  revisionId: string | null;
  createdAt: string;
  immutable: true;
};

export type AiEstimateLedgerRecord = {
  schemaVersion: "ai-estimate-ledger-record-v1";
  estimateId: string;
  ownerUserId: string;
  orgId: string | null;
  kind: AiEstimateLedgerEstimateKind;
  sourceRoute: string;
  title: string;
  prompt: string;
  selectedTemplateId: string;
  family: string;
  status: AiEstimateLedgerStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  deletedAt: string | null;
  currentRevisionId: string;
  sourceDraftId: string;
  sourceSnapshotId: string;
  rowCount: number;
  materialRowsCount: number;
  workRowsCount: number;
  artifacts: AiEstimateLedgerArtifactRefs;
  revisions: AiEstimateLedgerRevision[];
  eventLog: AiEstimateLedgerEvent[];
  idempotencyKeys: string[];
  version: number;
};

export type AiEstimateLedgerOperationResult<T> = {
  record: T;
  operationId: string;
  idempotencyReused: boolean;
};

export type AiEstimateLedgerPage<T> = {
  records: T[];
  nextCursorCreatedAt: string | null;
  totalCount: number;
};

export type AiEstimateLedgerHistoryStatus = "approved" | "archived" | "deleted";

export type AiEstimateLedgerHistoryRecord = {
  approvedEstimateId: string;
  sourceDraftId: string;
  sourceRevisionId: string;
  sourceSnapshotId: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  prompt: string;
  selectedTemplateId: string;
  family: string;
  rowCount: number;
  materialRowsCount: number;
  workRowsCount: number;
  pdfArtifactId: string | null;
  buyerHandoffId: string | null;
  status: AiEstimateLedgerHistoryStatus;
};

export type AiEstimateLedgerUpsertDraftInput = {
  estimateId: string;
  ownerUserId: string;
  orgId?: string | null;
  kind: AiEstimateLedgerEstimateKind;
  sourceRoute: string;
  title: string;
  prompt: string;
  selectedTemplateId: string;
  family: string;
  createdAt: string;
  updatedAt: string;
  status?: AiEstimateLedgerStatus;
  sourceDraftId?: string;
  currentRevisionId?: string;
  sourceSnapshotId?: string;
  rowCount: number;
  materialRowsCount: number;
  workRowsCount: number;
  artifacts?: Partial<AiEstimateLedgerArtifactRefs>;
  actorUserId?: string | null;
  sourceLayer: AiEstimateLedgerSourceLayer;
  idempotencyKey: string;
};

export type AiEstimateLedgerAppendRevisionInput = {
  estimateId: string;
  revision: Omit<AiEstimateLedgerRevision, "immutable" | "previousRevisionId"> & {
    previousRevisionId?: string | null;
  };
  actorUserId?: string | null;
  sourceLayer: AiEstimateLedgerSourceLayer;
  idempotencyKey: string;
};

export type AiEstimateLedgerBindArtifactsInput = {
  estimateId: string;
  revisionId: string;
  snapshotId?: string | null;
  pdfArtifactId?: string | null;
  buyerHandoffId?: string | null;
  actorUserId?: string | null;
  sourceLayer: AiEstimateLedgerSourceLayer;
  idempotencyKey: string;
  boundAt: string;
};

export type AiEstimateLedgerApproveRevisionInput = {
  estimateId: string;
  revisionId: string;
  approvedAt: string;
  actorUserId?: string | null;
  sourceLayer: AiEstimateLedgerSourceLayer;
  idempotencyKey: string;
};

export type AiEstimateLedgerSetStatusInput = {
  estimateId: string;
  status: AiEstimateLedgerStatus;
  updatedAt: string;
  deletedAt?: string | null;
  actorUserId?: string | null;
  sourceLayer: AiEstimateLedgerSourceLayer;
  idempotencyKey: string;
};

export type AiEstimateLedgerHistoryQuery = {
  ownerUserId: string;
  statuses?: AiEstimateLedgerStatus[];
  cursorCreatedAt?: string | null;
  limit?: number;
};
