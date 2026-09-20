import type { ConsumerRepairRequestItem } from "./consumerRequestTypes";

export function consumerRepairRequestItemTypeLabel(item: ConsumerRepairRequestItem): string {
  if (item.itemType === "work") return "Работа";
  if (item.itemType === "material") return "Материал";
  if (item.itemType === "service") return "Оборудование / доставка";
  return "Позиция";
}

export {
  CONSUMER_REPAIR_CONTEXT,
  CONSUMER_REPAIR_FORBIDDEN_OFFICE_ROUTES,
  assertConsumerRepairScope,
} from "./consumerRequestAccessPolicy";
export {
  auditConsumerRepairRequestEvent,
  buildConsumerRequestEstimateRuntimeTrace,
  CONSUMER_REQUEST_ESTIMATE_RUNTIME_TRACE_SCHEMA_VERSION,
  createConsumerRepairEvent,
  type ConsumerRequestEstimateRuntimeTrace,
} from "./consumerRequestAuditTrail";
export {
  assertConsumerRepairDraftActionAllowed,
  resolveConsumerRepairDraftTransition,
  type ConsumerRepairDraftAction,
  type ConsumerRepairDraftTransition,
} from "./consumerRequestDraftStateMachine";
export {
  buildConsumerRepairCanonicalDraftPayload,
  compareConsumerRepairPayloadParity,
  validateConsumerRepairPayloadSourceGovernance,
  type ConsumerRepairCanonicalDraftPayload,
  type ConsumerRepairPayloadKind,
  type ConsumerRepairPayloadParityResult,
  type ConsumerRepairPayloadSourceGovernanceResult,
} from "./consumerRequestPayloadParity";
export { ConsumerRepairValidationError, sendConsumerRepairRequestToMarketplace } from "./consumerRequestMarketplaceService";
export {
  APPROVED_HISTORY_SCALE_MATRIX,
  evaluateApprovedHistoryScaleMatrix,
  type ApprovedHistoryScaleMatrix,
} from "./approvedHistoryScaleMatrix";
export {
  detectConsumerRepairLegacyFakeEstimateRevision,
  type ConsumerRepairLegacyEstimateDetection,
} from "./consumerRequestLegacyEstimateGuard";
export {
  __deleteConsumerRepairPdfStorageObjectForTests,
  consumerRepairPdfStorageObjectExists,
  getConsumerRepairPdfStorageObject,
} from "./consumerRequestPdfStorage";
export {
  archiveConsumerRepairApprovedHistoryRecord,
  buildApprovedEstimateHistoryRecord,
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  addConsumerRepairRequestCatalogItem,
  addConsumerRepairRequestItem,
  applyConsumerRepairDraftRevisionParamBatchPatch,
  applyConsumerRepairDraftRevisionParamPatch,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  attachConsumerRepairEstimateRowPhoto,
  beginConsumerRepairCanonicalRoadScopeSelection,
  bindConsumerRepairCanonicalRoadScopeChoice,
  commitPreparedConsumerRepairRequestBundle,
  CONSUMER_REPAIR_APPROVED_HISTORY_STATUSES,
  createConsumerRepairDraftFromHistorySnapshot,
  createConsumerRepairRequestDraft,
  deleteConsumerRepairRequestDraft,
  getConsumerRepairRequest,
  initializeConsumerRepairTransactionalDurableStorage,
  listApprovedEstimateHistoryRecords,
  listConsumerRepairApprovedHistory,
  listConsumerRepairRequestHistory,
  prepareConsumerRepairRequestItemQuantityUpdate,
  removeConsumerRepairRequestItem,
  saveConsumerRepairCanonicalParameterCollection,
  saveConsumerRepairProjectExecutionDraft,
  selectConsumerRepairRequestItemCatalogCandidate,
  selectConsumerRepairRequestItemCatalogItem,
  selectConsumerRepairRoadScopeV4,
  synchronizeConsumerRepairAuthoritativePhotoAttachments,
  updateConsumerRepairRequestDraft,
  updateConsumerRepairRequestItemQuantity,
  updateConsumerRepairRequestItemUnitPrice,
  upsertConsumerRepairCanonicalBackendDraft,
  type ConsumerRepairApprovedHistoryPage,
  type ConsumerRepairDraftRevisionParamBatchPatch,
} from "./consumerRequestService";
export {
  ensureConsumerRepairRequestPdfAvailable,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairRequestPdf,
} from "./consumerRequestLegacyPdfMigrationReader";
export type {
  ApprovedEstimateHistoryRecord,
  ConsumerMarketplaceLink,
  ConsumerRepairCatalogBindingStatus,
  ConsumerRepairCatalogCandidate,
  ConsumerRepairAiDraft,
  ConsumerRepairContext,
  ConsumerRepairContextKind,
  ConsumerRepairDataScope,
  ConsumerRepairDraftBundle,
  ConsumerRepairItemSource,
  ConsumerRepairItemType,
  ConsumerRepairRequestDraft,
  ConsumerRepairRequestEvent,
  ConsumerRepairRequestItem,
  ConsumerRepairRequestMedia,
  ConsumerRepairEstimateComment,
  ConsumerRepairEstimateAttachment,
  ConsumerRepairSelectedWork,
  ConsumerRepairRequestPdf,
  ConsumerRepairPdfSupplement,
  ConsumerRepairPdfOpenResult,
  ConsumerRepairRole,
  ConsumerRepairStatus,
  PendingRoadScopeSelectionV4,
  ConsumerRequestValidationErrorCode,
  ConsumerRequestValidationErrorItem,
  ConsumerRequestValidationResult,
} from "./consumerRequestTypes";
