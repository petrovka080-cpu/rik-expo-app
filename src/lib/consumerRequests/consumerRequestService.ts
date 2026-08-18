import { CONSUMER_REPAIR_CONTEXT, assertConsumerRepairScope } from "./consumerRequestAccessPolicy";
import { logger } from "../logger";
import { createConsumerRepairEvent } from "./consumerRequestAuditTrail";
import {
  approveConsumerRepairRequestDraft as approveDraftRecord,
  createConsumerRepairRequestDraft as createDraftRecord,
  updateConsumerRepairRequestDraft as updateDraftRecord,
} from "./consumerRequestDraftService";
import { assertConsumerRepairDraftActionAllowed } from "./consumerRequestDraftStateMachine";
import {
  createConsumerRepairRequestItem,
  selectConsumerRepairRequestItemCatalogCandidate as selectCatalogCandidateRecord,
} from "./consumerRequestItemService";
import { createConsumerMarketplaceLink, ConsumerRepairValidationError } from "./consumerRequestMarketplaceService";
import type { ProjectExecutionDraft } from "../projectExecution";
import {
  cloneConsumerRepairValue,
  deleteConsumerRepairBundle,
  findConsumerRepairBundle,
  getConsumerRepairBundle,
  hydrateConsumerRepairRequestStoreForLedger,
  hydrateTransactionalConsumerRepairRequestStore,
  listConsumerRepairBundlesForUser,
  resetConsumerRepairRequestStoreForTests,
  saveConsumerRepairBundle,
  savePreparedConsumerRepairBundle,
  simulateConsumerRepairRequestStoreReloadForTests,
  type ConsumerRepairHistoryPageOptions,
} from "./consumerRequestRepository";
import {
  appendConsumerRepairEstimateRevisionFromSnapshot,
  applyConsumerRepairEstimateRevisionQuantityEdit,
  applyConsumerRepairEstimateRevisionRowRemoval,
  applyConsumerRepairEstimateRevisionUnitPriceEdit,
  buildEditableEstimateSnapshotFromConsumerRepairBundle,
  ensureConsumerRepairBundleEstimateRevisionState,
  withConsumerRepairEditableEstimateAudit,
} from "./consumerRequestEditableEstimateSnapshot";
import { __resetConsumerRepairPdfStorageForTests } from "./consumerRequestPdfStorage";
import { validateConsumerRepairRequestForApprove } from "./consumerRequestValidationService";
import {
  countConsumerRepairApprovedHistoryRecordsFromLedger,
  listConsumerRepairApprovedHistoryRecordsFromLedger,
} from "./consumerRequestLedgerBridge";
import { recordEstimateTelemetryEvent } from "../../features/estimates/telemetry/estimateTelemetryRecorder";
import {
  commitEstimateCompileResult,
  bindEstimateDraftScope,
  createEstimateDraftSession,
  failEstimateCompile,
  prepareEstimateCompile,
  selectScope,
  selectEstimateDraftWork,
  setEstimateDraftParameters,
  type EstimateDraftSession,
  type EstimateDraftSessionParameterValue,
  type EstimateDraftScopeRequirement,
} from "../estimate/draftSession/estimateDraftSession";
import type { AsphaltScopeSelectionIdV5 } from "../estimate/v4/asphalt/roadScopeTruthV4";
import type { CatalogItemForEstimate } from "../catalog/catalogItemTypes";
import type {
  ApprovedEstimateHistoryRecord,
  ConsumerRepairAiDraft,
  ConsumerRepairDraftBundle,
  ConsumerRepairCatalogCandidate,
  ConsumerRepairSelectedWork,
  ConsumerRepairRequestEvent,
  ConsumerRepairRequestItem,
  ConsumerRepairRequestMedia,
  ConsumerRepairEstimateAttachment,
  ConsumerRepairStatus,
  PendingRoadScopeSelectionV4,
} from "./consumerRequestTypes";
import type {
  EstimateDraftRevision,
  EstimateDraftRevisionState,
  ProfessionalBoqRow,
} from "../estimate/estimateDraftRevisionContract";
import type { UserParamPatchOperation } from "../estimate/validateUserParamPatch";
import type {
  CanonicalParameter,
  CanonicalParameterDefinition,
} from "../estimate/canonicalParameters";
import { getBoundEstimateRevisionCalculationState } from "../ai/estimateRevisions";
import { ensureExactRoadworksCalculationStateBinding } from "./consumerRequestExactRoadworksCalculationStateMigration";
import { appendCanonicalBackendRevisionProjection } from "./consumerCanonicalBackendRevisionProjection";

const id = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const ASPHALT_WORK_ID_V4 = "asphalt_concrete_pavement" as const;
const ASPHALT_PROFESSIONAL_NAME_RU_V4 = "Устройство асфальтобетонного дорожного покрытия" as const;
const ELECTRICAL_CANONICAL_WORK_KEY = "electrical_area_installation" as const;

type ElectricalCanonicalParameterKey = string;
type ElectricalCanonicalParameterValue = string | number | boolean;

function canonicalBackendRequired(operation: string): never {
  throw new ConsumerRepairValidationError([{
    code: "CANONICAL_ESTIMATE_BACKEND_REQUIRED",
    messageRu:
      "Расчёт и изменение профессиональной сметы выполняются только canonical backend. Откройте backend-смету; сохранённая legacy revision не изменена.",
    field: operation,
  }]);
}

function canonicalBackendBindingForItems(
  items: readonly ConsumerRepairRequestItem[],
): { revisionId: string; releaseId: string } | null {
  const revisionIds = new Set(items.map((item) =>
    String(item.sourceParameters?.canonicalBackendRevisionId ?? "").trim()
  ));
  const releaseIds = new Set(items.map((item) =>
    String(item.sourceParameters?.canonicalBackendReleaseId ?? "").trim()
  ));
  revisionIds.delete("");
  releaseIds.delete("");
  if (revisionIds.size !== 1 || releaseIds.size !== 1 || items.length === 0) return null;
  return { revisionId: [...revisionIds][0], releaseId: [...releaseIds][0] };
}

function loadAiEstimateRuntime(): any {
  return canonicalBackendRequired("legacy_ai_estimate_runtime");
}

function loadEstimateDraftRevisionFactory(): any {
  return canonicalBackendRequired("legacy_estimate_revision_factory");
}

function estimateRevisionStateRecoveryValidationError(
  cause: string,
): ConsumerRepairValidationError {
  return new ConsumerRepairValidationError([{
    code: "ESTIMATE_REVISION_STATE_RECOVERY_REQUIRED",
    messageRu:
      "Сохранённое состояние ревизии сметы не удалось однозначно восстановить. " +
      "Исходная смета не изменена; откройте её заново или создайте из истории отдельный черновик.",
    field: `estimateDraftRevisionState:${cause.slice(0, 120)}`,
  }]);
}

function resolveConsumerRepairCalculationStateForMutation(
  bundle: ConsumerRepairDraftBundle,
): {
  canonicalBundle: ConsumerRepairDraftBundle;
  state: EstimateDraftRevisionState;
} {
  try {
    const canonicalBundle = ensureExactRoadworksCalculationStateBinding(
      ensureConsumerRepairBundleEstimateRevisionState(bundle),
    );
    const state = getBoundEstimateRevisionCalculationState(
      canonicalBundle.estimateRevisionState,
    );
    if (!state) {
      throw estimateRevisionStateRecoveryValidationError("state_missing");
    }
    return { canonicalBundle, state };
  } catch (error) {
    if (error instanceof ConsumerRepairValidationError) throw error;
    const cause = error instanceof Error ? error.message : "unknown_revision_state_failure";
    if (
      cause.startsWith("ESTIMATE_REVISION_") ||
      cause.startsWith("CONSUMER_REPAIR_ESTIMATE_REVISION_")
    ) {
      throw estimateRevisionStateRecoveryValidationError(cause);
    }
    throw error;
  }
}

function loadConsumerRepairDraftRevisionDependencies(): any {
  return canonicalBackendRequired("legacy_consumer_revision_dependencies");
}

function loadRegisteredProfessionalEstimateDomainsV1(): any {
  return canonicalBackendRequired("legacy_registered_professional_domains");
}

function hasRoadworksWaveARegistration(workId: string | null | undefined): boolean {
  void workId;
  return false;
}

function roadworksWaveARegistration(workId: string | null | undefined): any {
  void workId;
  return null;
}

function isRoadScopeIdV4(value: string): value is AsphaltScopeSelectionIdV5 {
  return ["FULL_ROAD_INFRASTRUCTURE", "PAVEMENT_ONLY", "REPAIR_PATCH"].includes(value);
}

const canonicalElectricalOverridesFromBundle = (..._args: unknown[]): any =>
  canonicalBackendRequired("legacy_electrical_overrides");
const createCanonicalElectricalEstimateState = (..._args: unknown[]): any =>
  canonicalBackendRequired("legacy_electrical_compile");
const diffCanonicalElectricalRevisions = (..._args: unknown[]): any =>
  canonicalBackendRequired("legacy_electrical_diff");
const buildCanonicalElectricalConsumerRepairAiDraft = (..._args: unknown[]): any =>
  canonicalBackendRequired("legacy_electrical_draft_compile");
const ELECTRICAL_CANONICAL_PARAMETER_SCHEMA = { definitions: [] as CanonicalParameterDefinition[] };
const ASPHALT_RESOURCE_LEVEL_CANONICAL_PARAMETER_SCHEMA = { definitions: [] as CanonicalParameterDefinition[] };
const REGISTERED_CANONICAL_PARAMETER_SCHEMAS = {
  getByCanonicalWorkKey: (..._args: unknown[]): any =>
    canonicalBackendRequired("legacy_registered_parameter_schema"),
};
const projectEstimateDraftRevisionToCanonicalSession = (..._args: unknown[]): any => null;
const projectEstimateDraftSessionToCanonicalSession = (..._args: unknown[]): any => null;
const asphaltRelatedParameterKeysForProfileV4 = (..._args: unknown[]): string[] => [];
const getAsphaltRelatedProfileByCatalogRecordIdV4 = (..._args: unknown[]): any => null;

export const CONSUMER_REPAIR_APPROVED_HISTORY_STATUSES: ConsumerRepairStatus[] = [
  "consumer_approved",
  "sent_to_marketplace",
];

export type ConsumerRepairApprovedHistoryPage = {
  items: ConsumerRepairDraftBundle[];
  records: ApprovedEstimateHistoryRecord[];
  /** Durable ledger rows whose local snapshot is absent and must be recovered from backend. */
  unresolvedRecords?: ApprovedEstimateHistoryRecord[];
  totalApprovedCount: number;
  archivedApprovedCount: number;
  nextCursorCreatedAt: string | null;
  pageSize: number;
  totalCountSource: "durable_store";
};

function consumerRepairApprovedHistoryRecordStatus(
  status: ConsumerRepairStatus,
): ApprovedEstimateHistoryRecord["status"] {
  if (status === "archived") return "archived";
  if (status === "deleted_by_user") return "deleted";
  return "approved";
}

function sourceDraftIdForApprovedHistoryRecord(bundle: ConsumerRepairDraftBundle): string {
  const sourceEvent = [...bundle.events].reverse().find((event) => {
    const sourceRequestDraftId = event.payload?.sourceRequestDraftId;
    return typeof sourceRequestDraftId === "string" && sourceRequestDraftId.trim().length > 0;
  });
  const sourceRequestDraftId = sourceEvent?.payload?.sourceRequestDraftId;
  return typeof sourceRequestDraftId === "string" ? sourceRequestDraftId : bundle.draft.id;
}

export function buildApprovedEstimateHistoryRecord(
  bundle: ConsumerRepairDraftBundle,
): ApprovedEstimateHistoryRecord {
  const latestPdf = bundle.pdfs.find((pdf) => pdf.pdfStatus === "generated") ?? null;
  const canonicalRevisionId = String(bundle.items[0]?.sourceParameters?.canonicalBackendRevisionId ?? "").trim();
  const canonicalReleaseId = String(bundle.items[0]?.sourceParameters?.canonicalBackendReleaseId ?? "").trim();
  const canonicalPdfEvent = canonicalRevisionId && canonicalReleaseId
    ? bundle.events.find((event) =>
      event.eventType === "consumer_approved_canonical_backend_pdf" &&
      event.payload.revisionId === canonicalRevisionId &&
      event.payload.releaseId === canonicalReleaseId,
    )
    : null;
  const sourceRevisionId = (canonicalRevisionId || latestPdf?.revisionId)
    ?? bundle.estimateRevisionState?.current_revision_id
    ?? bundle.estimateDraftRevisionState?.currentRevisionId
    ?? bundle.durableHistorySummary?.sourceRevisionId
    ?? bundle.draft.id;
  const revision = bundle.estimateRevisionState?.revisions.find((candidate) =>
    candidate.revision_id === sourceRevisionId
  );
  const sourceSnapshotId = canonicalRevisionId
    ? `canonical-backend:${canonicalRevisionId}`
    : latestPdf?.snapshotId
    ?? revision?.snapshot_id
    ?? bundle.editableEstimateSnapshot?.snapshotId
    ?? bundle.durableHistorySummary?.sourceSnapshotId
    ?? `editable_estimate:${bundle.draft.id}`;
  const selectedTemplateId = bundle.draft.selectedWorkKey
    ?? bundle.structuredEstimatePayload?.workKey
    ?? bundle.draft.repairType;
  const family = bundle.draft.selectedWorkCategoryKey
    ?? bundle.draft.selectedWorkKey
    ?? bundle.draft.repairType;
  const rowCount = bundle.items.length || bundle.durableHistorySummary?.rowCount || 0;
  const materialRowsCount = bundle.items.length
    ? bundle.items.filter((item) => item.itemType === "material").length
    : bundle.durableHistorySummary?.materialRowsCount ?? 0;
  const workRowsCount = bundle.items.length
    ? bundle.items.filter((item) => item.itemType === "work").length
    : bundle.durableHistorySummary?.workRowsCount ?? 0;

  return {
    approvedEstimateId: bundle.draft.id,
    sourceDraftId: sourceDraftIdForApprovedHistoryRecord(bundle),
    sourceRevisionId,
    sourceReleaseId: canonicalReleaseId || bundle.durableHistorySummary?.sourceReleaseId || null,
    sourceSnapshotId,
    createdAt: bundle.draft.approvedAt ?? bundle.draft.createdAt,
    updatedAt: bundle.draft.updatedAt ?? bundle.draft.approvedAt ?? bundle.draft.createdAt,
    title: bundle.draft.title ?? bundle.draft.repairType,
    prompt: bundle.draft.problemText ?? "",
    selectedTemplateId,
    family,
    rowCount,
    materialRowsCount,
    workRowsCount,
    pdfArtifactId: typeof canonicalPdfEvent?.payload.artifactId === "string"
      ? canonicalPdfEvent.payload.artifactId
      : latestPdf?.id ?? null,
    buyerHandoffId: bundle.marketplaceLink.marketplaceDemandId ?? null,
    status: consumerRepairApprovedHistoryRecordStatus(bundle.draft.status),
  };
}

function catalogItemToConsumerRepairCandidate(catalogItem: CatalogItemForEstimate): ConsumerRepairCatalogCandidate {
  return {
    catalogItemId: catalogItem.catalogItemId,
    name: catalogItem.name,
    unit: catalogItem.unit,
    unitLabel: catalogItem.unitLabel,
    unitPrice: catalogItem.unitPrice ?? null,
    currency: catalogItem.currency,
    sourceId: catalogItem.sourceId,
    sourceLabel: catalogItem.sourceLabel,
    confidence: catalogItem.confidence,
    availabilityStatus: catalogItem.availabilityStatus,
    stockStatus: catalogItem.stockStatus,
    matchReason: "user_selected_catalog_item",
  };
}

function withEvent(bundle: ConsumerRepairDraftBundle, event: ConsumerRepairRequestEvent): ConsumerRepairDraftBundle {
  return {
    ...bundle,
    events: [...bundle.events, event],
  };
}

type ConsumerRepairDraftPatch = Parameters<typeof updateDraftRecord>[1];

function consumerRepairDraftPatchChanges(
  draft: ConsumerRepairDraftBundle["draft"],
  patch: ConsumerRepairDraftPatch,
): boolean {
  return Object.entries(patch).some(([key, value]) =>
    draft[key as keyof ConsumerRepairDraftBundle["draft"]] !== value
  );
}

function itemTypeFromBoqRow(row: ProfessionalBoqRow): ConsumerRepairRequestItem["itemType"] {
  if (row.rowType === "material") return "material";
  if (row.rowType === "work" || row.rowType === "labor") return "work";
  if (row.rowType === "document") return "document";
  if (row.rowType === "other") return "other";
  return "service";
}

export function createConsumerRepairItemsFromDraftRevision(
  requestDraftId: string,
  revision: EstimateDraftRevision,
): ConsumerRepairRequestItem[] {
  return revision.boq.rows.map((row) =>
    createConsumerRepairRequestItem({
      requestDraftId,
      itemType: itemTypeFromBoqRow(row),
      titleRu: row.titleRu,
      quantity: row.quantity,
      unit: row.unit,
      unitPrice: row.unitPrice,
      currency: row.currency,
      source: "reference_price_book",
      materialKey: row.materialKey,
      rateKey: row.rateKey,
      category: row.category,
      unitLabel: row.unitLabel,
      sourceId: row.sourceId,
      sourceLabel: row.sourceLabel,
      formulaId: row.formulaId,
      quantityFormula: row.quantityFormula,
      calculationTrace: row.calculationTrace,
      sourceParameters: {
        ...(row.sourceParameters ?? {}),
        includedInProcurement: row.includedInProcurement,
        estimateDraftRevisionId: revision.revisionId,
        estimateDraftPreviousRevisionId: revision.previousRevisionId,
        estimateDraftSource: revision.source,
        estimateDraftSelectedTemplateId: revision.selectedTemplateId,
      },
      templateId: row.templateId ?? revision.selectedTemplateId,
      templateVersion: row.templateVersion,
      normId: row.normId,
      normFamilyId: row.normFamilyId,
      normSourceId: row.normSourceId,
      normSourceTitle: row.normSourceTitle,
      normVersion: row.normVersion,
      normReviewStatus: row.normReviewStatus,
      priceStatus: row.priceStatus as ConsumerRepairRequestItem["priceStatus"],
      priceSource: row.priceSource as ConsumerRepairRequestItem["priceSource"],
      priceSourceId: row.priceSourceId,
      priceSourceLabel: row.priceSourceLabel,
      confidence: "medium",
      addedBy: "ai",
    })
  );
}

function preserveConsumerManualPricesInDraftRevision(
  bundle: ConsumerRepairDraftBundle,
  revision: EstimateDraftRevision,
): EstimateDraftRevision {
  const itemByRowId = new Map<string, ConsumerRepairRequestItem>();
  const itemByRateKey = new Map<string, ConsumerRepairRequestItem>();
  const itemByFormulaId = new Map<string, ConsumerRepairRequestItem>();
  const itemByVisibleIdentity = new Map<string, ConsumerRepairRequestItem>();
  bundle.items.forEach((item, index) => {
    const sourceRowCode = item.sourceParameters?.rowCode;
    const rowId = typeof sourceRowCode === "string" && sourceRowCode.trim()
      ? sourceRowCode.trim()
      : item.rateKey?.trim()
        ? item.rateKey.trim()
        : item.formulaId?.trim()
          ? `${item.formulaId.trim()}_${index + 1}`
          : `boq_row_${index + 1}`;
    itemByRowId.set(rowId, item);
    if (item.rateKey?.trim()) itemByRateKey.set(item.rateKey.trim(), item);
    if (item.formulaId?.trim()) itemByFormulaId.set(item.formulaId.trim(), item);
    itemByVisibleIdentity.set(`${item.titleRu}\u0000${item.unit}`, item);
  });
  return {
    ...revision,
    boq: {
      ...revision.boq,
      rows: revision.boq.rows.map((row, index) => {
        const positionalItem = bundle.items[index];
        const item = itemByRowId.get(row.rowId) ??
          (row.rateKey ? itemByRateKey.get(row.rateKey) : undefined) ??
          (row.formulaId ? itemByFormulaId.get(row.formulaId) : undefined) ??
          itemByVisibleIdentity.get(`${row.titleRu}\u0000${row.unit}`) ??
          (
            positionalItem && (
              (positionalItem.titleRu === row.titleRu && positionalItem.unit === row.unit) ||
              bundle.items.length === revision.boq.rows.length
            )
              ? positionalItem
              : undefined
          );
        const userPrice = item?.priceEditedByConsumer === true ||
          item?.priceSource === "user" ||
          item?.priceStatus === "USER_PRICE_OVERRIDE" ||
          item?.priceStatus === "USER_ENTERED_PRICE";
        if (!item || !userPrice || item.unitPrice == null) return row;
        return {
          ...row,
          unitPrice: item.unitPrice,
          currency: item.currency,
          priceStatus: item.priceStatus ?? "USER_ENTERED_PRICE",
          priceSource: "user",
          priceSourceId: item.priceSourceId ?? null,
          priceSourceLabel: item.priceSourceLabel ?? "Цена введена пользователем",
        };
      }),
    },
  };
}

function archivePdfsForStaleDraftRevision(
  bundle: ConsumerRepairDraftBundle,
  nextRevisionId: string,
) {
  return bundle.pdfs.map((pdf) =>
    pdf.revisionId && pdf.revisionId !== nextRevisionId
      ? { ...pdf, pdfStatus: "archived" as const }
      : pdf
  );
}

function reopenApprovedEstimateForContentEdit(input: {
  bundle: ConsumerRepairDraftBundle;
  actorUserId?: string | null;
  sourceEventType: string;
  updatedAt?: string;
}): ConsumerRepairDraftBundle {
  const { bundle } = input;
  if (bundle.draft.status !== "consumer_approved" && bundle.draft.status !== "sent_to_marketplace") {
    return bundle;
  }
  const updatedAt = input.updatedAt ?? new Date().toISOString();
  return withEvent(
    {
      ...bundle,
      draft: {
        ...bundle.draft,
        status: "draft",
        approvedAt: null,
        marketplaceReadyAt: null,
        marketplaceValidationErrors: [],
        lastMarketplaceSubmitAttemptAt: null,
        updatedAt,
      },
      marketplaceLink: {
        ...bundle.marketplaceLink,
        marketplaceDemandId: null,
        status: "not_sent",
        idempotencyKey: null,
        sentAt: null,
      },
    },
    createConsumerRepairEvent({
      requestDraftId: bundle.draft.id,
      eventType: "approved_estimate_reopened_for_content_edit",
      actorType: "consumer",
      actorUserId: input.actorUserId ?? bundle.draft.consumerUserId,
      payload: {
        previousStatus: bundle.draft.status,
        sourceEventType: input.sourceEventType,
        currentRevisionId: bundle.estimateRevisionState?.current_revision_id ?? null,
      },
    }),
  );
}

export function createConsumerRepairRequestDraft(input: {
  consumerUserId: string;
  problemText?: string | null;
  repairType?: string | null;
  city?: string | null;
  addressText?: string | null;
  preferredTimeText?: string | null;
  contactPhone?: string | null;
  selectedWork?: ConsumerRepairSelectedWork | null;
  aiDraft?: ConsumerRepairAiDraft | null;
  pendingRoadScopeSelection?: Omit<PendingRoadScopeSelectionV4, "requestId"> | null;
}): ConsumerRepairDraftBundle {
  assertConsumerRepairScope(CONSUMER_REPAIR_CONTEXT);
  assertConsumerRepairDraftActionAllowed({ currentStatus: "none", action: "create_draft" });
  if (input.pendingRoadScopeSelection || input.aiDraft?.runtimeEstimateDraftRevision) {
    canonicalBackendRequired("legacy_consumer_request_compile");
  }
  const selectedWork = input.selectedWork ?? input.aiDraft?.selectedWork ?? null;
  const draft = createDraftRecord({ ...input, selectedWork });
  const items = (input.aiDraft?.items ?? []).map((item) =>
    createConsumerRepairRequestItem({ requestDraftId: draft.id, ...item }),
  );
  const bundle: ConsumerRepairDraftBundle = {
    draft,
    items,
    media: [],
    pdfs: [],
    estimateDraftRevisionState: null,
    estimateDraftSession: null,
    canonicalParameterSession: null,
    electricalCircuitSchedule: input.aiDraft?.electricalCircuitSchedule ?? null,
    structuredEstimatePayload: input.aiDraft?.structuredEstimatePayload ?? null,
    projectExecutionDrafts: [],
    marketplaceLink: createConsumerMarketplaceLink(draft.id),
    events: [
      createConsumerRepairEvent({
        requestDraftId: draft.id,
        eventType: "draft_created",
        actorType: "consumer",
        payload: {
          consumer_only: true,
          canonical_backend_revision_id:
            items[0]?.sourceParameters?.canonicalBackendRevisionId ?? null,
          canonical_backend_release_id:
            items[0]?.sourceParameters?.canonicalBackendReleaseId ?? null,
          selectedWorkKey: selectedWork?.selectedWorkKey,
          selectedWorkSource: selectedWork?.selectedWorkSource,
        },
      }),
    ],
    pendingRoadScopeSelection: null,
  };
  return saveConsumerRepairBundle(bundle);
}

export function upsertConsumerRepairCanonicalBackendDraft(input: {
  requestDraftId?: string | null;
  consumerUserId: string;
  problemText?: string | null;
  city?: string | null;
  aiDraft: ConsumerRepairAiDraft;
}): ConsumerRepairDraftBundle {
  const existing = input.requestDraftId
    ? findConsumerRepairBundle(input.requestDraftId)
    : null;
  if (!existing || existing.draft.status !== "draft") {
    const created = createConsumerRepairRequestDraft({
      consumerUserId: input.consumerUserId,
      problemText: input.problemText,
      city: input.city ?? existing?.draft.city,
      addressText: existing?.draft.addressText,
      preferredTimeText: existing?.draft.preferredTimeText,
      contactPhone: existing?.draft.contactPhone,
      selectedWork: input.aiDraft.selectedWork,
      aiDraft: input.aiDraft,
    });
    return saveConsumerRepairBundle(appendCanonicalBackendRevisionProjection({
      previousBundle: null,
      nextBundle: created,
      payload: input.aiDraft.structuredEstimatePayload,
    }));
  }
  if (existing.draft.consumerUserId !== input.consumerUserId) {
    throw new ConsumerRepairValidationError([{
      code: "OWNER_MISMATCH",
      messageRu: "Изменить backend-смету может только владелец заявки.",
      field: "consumerUserId",
    }]);
  }
  const selectedWork = input.aiDraft.selectedWork;
  const items = input.aiDraft.items.map((item) => createConsumerRepairRequestItem({
    requestDraftId: existing.draft.id,
    ...item,
  }));
  const previousBinding = items.length
    ? canonicalBackendBindingForItems(existing.items)
    : null;
  const nextBinding = canonicalBackendBindingForItems(items);
  if (!nextBinding) return canonicalBackendRequired("canonical_backend_revision_identity");
  const now = new Date().toISOString();
  const next = withEvent({
    ...existing,
    draft: {
      ...existing.draft,
      title: selectedWork?.selectedWorkTitleRu ?? existing.draft.title,
      problemText: input.problemText ?? existing.draft.problemText,
      repairType: selectedWork?.selectedWorkKey ?? existing.draft.repairType,
      selectedCatalogWorkId: selectedWork?.selectedCatalogWorkId ?? existing.draft.selectedCatalogWorkId,
      selectedWorkKey: selectedWork?.selectedWorkKey ?? existing.draft.selectedWorkKey,
      selectedWorkTitleRu: selectedWork?.selectedWorkTitleRu ?? existing.draft.selectedWorkTitleRu,
      selectedWorkCategoryKey: selectedWork?.selectedWorkCategoryKey ?? existing.draft.selectedWorkCategoryKey,
      selectedWorkCategoryTitleRu: selectedWork?.selectedWorkCategoryTitleRu ?? existing.draft.selectedWorkCategoryTitleRu,
      selectedWorkRawInput: selectedWork?.selectedWorkRawInput ?? existing.draft.selectedWorkRawInput,
      selectedWorkSource: selectedWork?.selectedWorkSource ?? existing.draft.selectedWorkSource,
      selectedWorkResolverReGuessed: selectedWork?.selectedWorkResolverReGuessed ?? existing.draft.selectedWorkResolverReGuessed,
      updatedAt: now,
      marketplaceReadyAt: null,
      marketplaceValidationErrors: [],
    },
    items,
    pdfs: [],
    estimateRevisionState: undefined,
    editableEstimateSnapshot: undefined,
    estimateDraftRevisionState: null,
    estimateDraftSession: null,
    canonicalParameterSession: null,
    structuredEstimatePayload: input.aiDraft.structuredEstimatePayload ?? null,
    electricalCircuitSchedule: input.aiDraft.electricalCircuitSchedule ?? null,
    projectExecutionDrafts: [],
    marketplaceLink: createConsumerMarketplaceLink(existing.draft.id),
  }, createConsumerRepairEvent({
    requestDraftId: existing.draft.id,
    eventType: "canonical_backend_revision_replaced_draft_snapshot",
    actorType: "consumer",
    actorUserId: input.consumerUserId,
    payload: {
      previousRevisionId: previousBinding?.revisionId ?? null,
      previousReleaseId: previousBinding?.releaseId ?? null,
      revisionId: nextBinding.revisionId,
      releaseId: nextBinding.releaseId,
    },
  }));
  return saveConsumerRepairBundle(appendCanonicalBackendRevisionProjection({
    previousBundle: existing,
    nextBundle: next,
    payload: input.aiDraft.structuredEstimatePayload,
  }));
}

export function selectConsumerRepairRoadScopeV4(input: {
  requestDraftId: string;
  userId: string;
  selectedScope: string;
  createdAt?: string;
  expectedRevisionId?: string | null;
}): ConsumerRepairDraftBundle {
  void input;
  return canonicalBackendRequired("legacy_road_scope_compile");
}
export function saveConsumerRepairProjectExecutionDraft(input: {
  requestDraftId: string;
  projectExecutionDraft: ProjectExecutionDraft;
  userId?: string;
}): ConsumerRepairDraftBundle {
  const bundle = getConsumerRepairBundle(input.requestDraftId);
  assertConsumerRepairDraftActionAllowed({ currentStatus: bundle.draft.status, action: "save_project_execution" });
  const userId = input.userId ?? bundle.draft.consumerUserId;
  if (userId !== bundle.draft.consumerUserId) {
    throw new ConsumerRepairValidationError([
      {
        code: "OWNER_MISMATCH",
        messageRu: "\u041f\u0440\u043e\u0435\u043a\u0442 \u043c\u043e\u0436\u0435\u0442 \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0442\u043e\u043b\u044c\u043a\u043e \u0432\u043b\u0430\u0434\u0435\u043b\u0435\u0446 \u0441\u043c\u0435\u0442\u044b.",
        field: "userId",
      },
    ]);
  }
  const projectExecutionDrafts = [
    input.projectExecutionDraft,
    ...bundle.projectExecutionDrafts.filter((draft) =>
      draft.sourcePayloadHash !== input.projectExecutionDraft.sourcePayloadHash
    ),
  ];
  return saveConsumerRepairBundle(withEvent(
    {
      ...bundle,
      projectExecutionDrafts,
    },
    createConsumerRepairEvent({
      requestDraftId: input.requestDraftId,
      eventType: "project_execution_draft_saved",
      actorType: "consumer",
      actorUserId: userId,
      payload: {
        sourcePayloadHash: input.projectExecutionDraft.sourcePayloadHash,
        projectId: input.projectExecutionDraft.projectId,
        workPackageCount: input.projectExecutionDraft.workPackages.length,
        taskCount: input.projectExecutionDraft.tasks.length,
        procurementItemCount: input.projectExecutionDraft.procurementItems.length,
      },
    }),
  ));
}

export function updateConsumerRepairRequestDraft(input: {
  requestDraftId: string;
  patch: ConsumerRepairDraftPatch;
}): ConsumerRepairDraftBundle {
  const bundle = getConsumerRepairBundle(input.requestDraftId);
  assertConsumerRepairDraftActionAllowed({ currentStatus: bundle.draft.status, action: "update_draft_fields" });
  if (!consumerRepairDraftPatchChanges(bundle.draft, input.patch)) return bundle;
  const next = withEvent(
    {
      ...bundle,
      draft: updateDraftRecord(bundle.draft, input.patch),
    },
    createConsumerRepairEvent({
      requestDraftId: input.requestDraftId,
      eventType: "draft_updated",
      actorType: "consumer",
      payload: {
        selectedWorkKey: input.patch.selectedWorkKey,
        selectedWorkSource: input.patch.selectedWorkSource,
      },
    }),
  );
  return saveConsumerRepairBundle(next);
}

export function applyConsumerRepairDraftRevisionParamPatch(input: {
  requestDraftId: string;
  operation: UserParamPatchOperation;
  paramKey: string;
  rawValue: string;
  userId?: string;
  createdAt?: string;
}): ConsumerRepairDraftBundle {
  void input;
  return canonicalBackendRequired("legacy_single_parameter_recalculate");
}

export type ConsumerRepairDraftRevisionParamBatchPatch = {
  operation: UserParamPatchOperation;
  paramKey: string;
  rawValue: string;
};

export function applyConsumerRepairDraftRevisionParamBatchPatch(input: {
  requestDraftId: string;
  patches: ConsumerRepairDraftRevisionParamBatchPatch[];
  userId?: string;
  createdAt?: string;
}): ConsumerRepairDraftBundle {
  void input;
  return canonicalBackendRequired("legacy_parameter_batch_recalculate");
}

export function addConsumerRepairRequestItem(input: {
  requestDraftId: string;
  titleRu: string;
  itemType?: ConsumerRepairRequestItem["itemType"];
  quantity?: number;
  unit?: string;
  unitPrice?: number | null;
  currency?: string;
  source?: ConsumerRepairRequestItem["source"];
  catalogItemId?: string | null;
  selectedCatalogItemId?: string | null;
  materialKey?: string | null;
  rateKey?: string | null;
  catalogBindingStatus?: ConsumerRepairRequestItem["catalogBindingStatus"];
  catalogCandidates?: ConsumerRepairCatalogCandidate[];
  category?: string | null;
  unitLabel?: string | null;
  sourceId?: string | null;
  sourceLabel?: string | null;
  formulaId?: string | null;
  quantityFormula?: string | null;
  calculationTrace?: string | null;
  sourceParameters?: Record<string, unknown> | null;
  templateId?: string | null;
  templateVersion?: string | null;
  normId?: string | null;
  normFamilyId?: string | null;
  normSourceId?: string | null;
  normSourceTitle?: string | null;
  normVersion?: string | null;
  normReviewStatus?: string | null;
  priceStatus?: ConsumerRepairRequestItem["priceStatus"];
  priceSource?: ConsumerRepairRequestItem["priceSource"];
  priceSourceId?: string | null;
  priceSourceLabel?: string | null;
  priceTrace?: ConsumerRepairRequestItem["priceTrace"];
  priceCandidates?: ConsumerRepairRequestItem["priceCandidates"];
  costConfidence?: ConsumerRepairRequestItem["costConfidence"];
  confidence?: "high" | "medium" | "low";
  addedBy?: "ai" | "user" | "system";
}): ConsumerRepairDraftBundle {
  const bundle = getConsumerRepairBundle(input.requestDraftId);
  assertConsumerRepairDraftActionAllowed({ currentStatus: bundle.draft.status, action: "add_item" });
  const item = createConsumerRepairRequestItem({
    requestDraftId: input.requestDraftId,
    itemType: input.itemType ?? "other",
    titleRu: input.titleRu,
    quantity: input.quantity ?? 1,
    unit: input.unit ?? "шт",
    unitPrice: input.unitPrice ?? null,
    currency: input.currency ?? "KGS",
    source: input.source ?? "user_added",
    catalogItemId: input.catalogItemId ?? null,
    selectedCatalogItemId: input.selectedCatalogItemId ?? input.catalogItemId ?? null,
    materialKey: input.materialKey ?? null,
    rateKey: input.rateKey ?? null,
    catalogBindingStatus: input.catalogBindingStatus ?? null,
    catalogCandidates: input.catalogCandidates ?? [],
    category: input.category ?? null,
    unitLabel: input.unitLabel ?? null,
    sourceId: input.sourceId ?? null,
    sourceLabel: input.sourceLabel ?? null,
    formulaId: input.formulaId ?? null,
    quantityFormula: input.quantityFormula ?? null,
    calculationTrace: input.calculationTrace ?? null,
    sourceParameters: input.sourceParameters ?? null,
    templateId: input.templateId ?? null,
    templateVersion: input.templateVersion ?? null,
    normId: input.normId ?? null,
    normFamilyId: input.normFamilyId ?? null,
    normSourceId: input.normSourceId ?? null,
    normSourceTitle: input.normSourceTitle ?? null,
    normVersion: input.normVersion ?? null,
    normReviewStatus: input.normReviewStatus ?? null,
    priceStatus: input.priceStatus,
    priceSource: input.priceSource,
    priceSourceId: input.priceSourceId,
    priceSourceLabel: input.priceSourceLabel,
    priceTrace: input.priceTrace,
    priceCandidates: input.priceCandidates,
    costConfidence: input.costConfidence,
    confidence: input.confidence,
    addedBy: input.addedBy,
  });
  const bundleWithItem = { ...bundle, items: [...bundle.items, item] };
  const nextSnapshot = buildEditableEstimateSnapshotFromConsumerRepairBundle(bundleWithItem);
  const next = withConsumerRepairEditableEstimateAudit(
    { ...bundleWithItem, editableEstimateSnapshot: nextSnapshot },
    {
      type: "row_added",
      rowId: item.id,
      actorUserId: null,
      reason: "consumer_request_item_added",
      before: null,
      after: { titleRu: item.titleRu, quantity: item.quantity, unitPrice: item.unitPrice },
    },
  );
  const revisioned = appendConsumerRepairEstimateRevisionFromSnapshot({
    previousBundle: bundle,
    nextBundle: next,
    event_type: "ROW_ADDED",
    source: "USER_EDITED",
    row_key: item.id,
    before_value: null,
    after_value: { titleRu: item.titleRu, quantity: item.quantity, unitPrice: item.unitPrice },
    actor_id: bundle.draft.consumerUserId,
    reason_ru: "\u0421\u0442\u0440\u043e\u043a\u0430 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430.",
  });
  if ((input.addedBy ?? "user") === "user") {
    recordEstimateTelemetryEvent({
      event_name: "manual_item_added",
      route: "/request",
      platform: "unknown",
      request_id: input.requestDraftId,
      estimate_id: bundle.draft.repairType,
      payload: {
        item_id: item.id,
        item_type: item.itemType,
        source: item.source,
        has_price: item.unitPrice != null,
      },
    });
  }
  const reopened = reopenApprovedEstimateForContentEdit({
    bundle: revisioned,
    actorUserId: bundle.draft.consumerUserId,
    sourceEventType: "item_added",
  });
  return saveConsumerRepairBundle(withEvent(
    reopened,
    createConsumerRepairEvent({ requestDraftId: input.requestDraftId, eventType: "item_added", actorType: "consumer" }),
  ));
}

export function addConsumerRepairRequestCatalogItem(input: {
  requestDraftId: string;
  catalogItem: CatalogItemForEstimate;
}): ConsumerRepairDraftBundle {
  return addConsumerRepairRequestItem({
    requestDraftId: input.requestDraftId,
    titleRu: input.catalogItem.name,
    itemType: "material",
    quantity: 1,
    unit: input.catalogItem.unit,
    unitLabel: input.catalogItem.unitLabel,
    unitPrice: input.catalogItem.unitPrice ?? null,
    currency: input.catalogItem.currency,
    source: "catalog_item",
    catalogItemId: input.catalogItem.catalogItemId,
    category: input.catalogItem.category ?? null,
    sourceId: input.catalogItem.sourceId,
    sourceLabel: input.catalogItem.sourceLabel,
    confidence: input.catalogItem.confidence,
    addedBy: "user",
  });
}

export function selectConsumerRepairRequestItemCatalogCandidate(input: {
  requestDraftId: string;
  itemId: string;
  candidate: ConsumerRepairCatalogCandidate;
}): ConsumerRepairDraftBundle {
  const bundle = getConsumerRepairBundle(input.requestDraftId);
  assertConsumerRepairDraftActionAllowed({ currentStatus: bundle.draft.status, action: "select_catalog_item" });
  const items = bundle.items.map((item) =>
    item.id === input.itemId
      ? selectCatalogCandidateRecord({ item, candidate: input.candidate })
      : item,
  );
  const before = bundle.items.find((item) => item.id === input.itemId) ?? null;
  const next = {
    ...bundle,
    items,
  };
  const revisioned = appendConsumerRepairEstimateRevisionFromSnapshot({
    previousBundle: bundle,
    nextBundle: {
      ...next,
      editableEstimateSnapshot: buildEditableEstimateSnapshotFromConsumerRepairBundle(next),
    },
    event_type: "CATALOG_ITEM_SELECTED",
    source: "CATALOG_SELECTED",
    row_key: input.itemId,
    before_value: before?.catalogItemId ?? before?.selectedCatalogItemId ?? null,
    after_value: input.candidate.catalogItemId,
    actor_id: bundle.draft.consumerUserId,
    reason_ru: "\u0412\u044b\u0431\u0440\u0430\u043d \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b \u0438\u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430.",
  });
  const reopened = reopenApprovedEstimateForContentEdit({
    bundle: revisioned,
    actorUserId: bundle.draft.consumerUserId,
    sourceEventType: "catalog_item_selected",
  });
  return saveConsumerRepairBundle(withEvent(
    reopened,
    createConsumerRepairEvent({
      requestDraftId: input.requestDraftId,
      eventType: "catalog_item_selected",
      actorType: "consumer",
      payload: {
        itemId: input.itemId,
        catalogItemId: input.candidate.catalogItemId,
      },
    }),
  ));
}

export function selectConsumerRepairRequestItemCatalogItem(input: {
  requestDraftId: string;
  itemId: string;
  catalogItem: CatalogItemForEstimate;
}): ConsumerRepairDraftBundle {
  return selectConsumerRepairRequestItemCatalogCandidate({
    requestDraftId: input.requestDraftId,
    itemId: input.itemId,
    candidate: catalogItemToConsumerRepairCandidate(input.catalogItem),
  });
}

export function prepareConsumerRepairRequestItemQuantityUpdate(input: {
  requestDraftId: string;
  itemId: string;
  quantity: number;
  operationId?: string;
  source?: "stepper" | "direct_input" | "programmatic" | string;
}): ConsumerRepairDraftBundle {
  const bundle = getConsumerRepairBundle(input.requestDraftId);
  assertConsumerRepairDraftActionAllowed({ currentStatus: bundle.draft.status, action: "update_item_quantity" });
  const before = bundle.items.find((item) => item.id === input.itemId);
  const operationId = input.operationId ?? [
    "quantity",
    input.requestDraftId,
    input.itemId,
    bundle.estimateRevisionState?.current_revision_id ?? "base",
    input.quantity,
  ].join(":");
  const duplicateOperation = bundle.events.some((event) =>
    event.eventType === "item_quantity_updated" &&
    event.payload?.operationId === operationId
  );
  if (duplicateOperation || before?.quantity === input.quantity) return bundle;
  const next = applyConsumerRepairEstimateRevisionQuantityEdit({
    bundle,
    row_key: input.itemId,
    quantity: input.quantity,
    actor_id: bundle.draft.consumerUserId,
  });
  const reopened = reopenApprovedEstimateForContentEdit({
    bundle: next,
    actorUserId: bundle.draft.consumerUserId,
    sourceEventType: "item_quantity_updated",
  });
  const after = reopened.items.find((item) => item.id === input.itemId);
  return withEvent(
    reopened,
    createConsumerRepairEvent({
      requestDraftId: input.requestDraftId,
      eventType: "item_quantity_updated",
      actorType: "consumer",
      payload: {
        itemId: input.itemId,
        previousQuantity: before?.quantity ?? null,
        nextQuantity: after?.quantity ?? input.quantity,
        operationId,
        source: input.source ?? "user",
      },
    }),
  );
}

export function commitPreparedConsumerRepairRequestBundle(bundle: ConsumerRepairDraftBundle): ConsumerRepairDraftBundle {
  return savePreparedConsumerRepairBundle(bundle);
}

export function updateConsumerRepairRequestItemQuantity(input: {
  requestDraftId: string;
  itemId: string;
  quantity: number;
}): ConsumerRepairDraftBundle {
  return commitPreparedConsumerRepairRequestBundle(prepareConsumerRepairRequestItemQuantityUpdate(input));
}

export function updateConsumerRepairRequestItemUnitPrice(input: {
  requestDraftId: string;
  itemId: string;
  unitPrice: number | null;
}): ConsumerRepairDraftBundle {
  const bundle = getConsumerRepairBundle(input.requestDraftId);
  assertConsumerRepairDraftActionAllowed({ currentStatus: bundle.draft.status, action: "update_item_price" });
  const next = applyConsumerRepairEstimateRevisionUnitPriceEdit({
    bundle,
    row_key: input.itemId,
    unit_price: input.unitPrice,
    actor_id: bundle.draft.consumerUserId,
  });
  const reopened = reopenApprovedEstimateForContentEdit({
    bundle: next,
    actorUserId: bundle.draft.consumerUserId,
    sourceEventType: input.unitPrice == null ? "item_price_cleared" : "item_price_updated",
  });
  return saveConsumerRepairBundle(withEvent(
    reopened,
    createConsumerRepairEvent({
      requestDraftId: input.requestDraftId,
      eventType: input.unitPrice == null ? "item_price_cleared" : "item_price_updated",
      actorType: "consumer",
      payload: { itemId: input.itemId, priceStatus: reopened.items.find((item) => item.id === input.itemId)?.priceStatus },
    }),
  ));
}

export function removeConsumerRepairRequestItem(input: {
  requestDraftId: string;
  itemId: string;
}): ConsumerRepairDraftBundle {
  const bundle = getConsumerRepairBundle(input.requestDraftId);
  assertConsumerRepairDraftActionAllowed({ currentStatus: bundle.draft.status, action: "remove_item" });
  const next = applyConsumerRepairEstimateRevisionRowRemoval({
    bundle,
    row_key: input.itemId,
    actor_id: bundle.draft.consumerUserId,
  });
  const reopened = reopenApprovedEstimateForContentEdit({
    bundle: next,
    actorUserId: bundle.draft.consumerUserId,
    sourceEventType: "item_removed",
  });
  return saveConsumerRepairBundle(withEvent(
    reopened,
    createConsumerRepairEvent({ requestDraftId: input.requestDraftId, eventType: "item_removed", actorType: "consumer" }),
  ));
}

export function attachConsumerRepairMedia(input: {
  requestDraftId: string;
  mediaKind: ConsumerRepairRequestMedia["mediaKind"];
}): ConsumerRepairDraftBundle {
  const bundle = getConsumerRepairBundle(input.requestDraftId);
  assertConsumerRepairDraftActionAllowed({ currentStatus: bundle.draft.status, action: "attach_media" });
  const media: ConsumerRepairRequestMedia = {
    id: id("consumer_media_link"),
    requestDraftId: input.requestDraftId,
    mediaAssetId: id(`consumer_${input.mediaKind}`),
    mediaKind: input.mediaKind,
    purpose: "request_evidence",
    createdAt: new Date().toISOString(),
  };
  return saveConsumerRepairBundle(withEvent(
    { ...bundle, media: [...bundle.media, media] },
    createConsumerRepairEvent({ requestDraftId: input.requestDraftId, eventType: "media_attached", actorType: "consumer", payload: { mediaKind: input.mediaKind } }),
  ));
}

export function attachConsumerRepairEstimateRowPhoto(input: {
  requestDraftId: string;
  ownerUserId: string;
  revisionId: string;
  releaseId: string;
  requestItemId: string;
  rowId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  contentHash: string;
  storageReference: string;
  thumbnailReference?: string | null;
}): ConsumerRepairDraftBundle {
  const bundle = getConsumerRepairBundle(input.requestDraftId);
  assertConsumerRepairDraftActionAllowed({ currentStatus: bundle.draft.status, action: "attach_media" });
  if (bundle.draft.consumerUserId !== input.ownerUserId) {
    throw new Error("CONSUMER_ESTIMATE_PHOTO_OWNER_MISMATCH");
  }
  const item = bundle.items.find((candidate) => candidate.id === input.requestItemId);
  const itemRowId = typeof item?.sourceParameters?.rowCode === "string"
    ? item.sourceParameters.rowCode.trim()
    : "";
  if (!item || (itemRowId && itemRowId !== input.rowId)) throw new Error("CONSUMER_ESTIMATE_PHOTO_ROW_MISMATCH");
  const itemRevisionId = String(
    item.sourceParameters?.canonicalBackendRevisionId ?? "",
  ).trim();
  const itemReleaseId = String(
    item.sourceParameters?.canonicalBackendReleaseId ?? "",
  ).trim();
  if (
    (itemRevisionId && itemRevisionId !== input.revisionId) ||
    (itemReleaseId && itemReleaseId !== input.releaseId)
  ) {
    throw new Error("CONSUMER_ESTIMATE_PHOTO_REVISION_MISMATCH");
  }
  const attachment: ConsumerRepairEstimateAttachment = {
    id: id("consumer_estimate_row_photo"),
    ownerScope: "row",
    estimateId: bundle.draft.id,
    revisionId: input.revisionId,
    rowId: input.rowId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    contentHash: input.contentHash,
    storageReference: input.storageReference,
    thumbnailReference: input.thumbnailReference ?? null,
    createdAt: new Date().toISOString(),
    deleted: false,
    privacy: bundle.draft.orgId ? "organization" : "private",
    redacted: false,
  };
  return saveConsumerRepairBundle(withEvent(
    {
      ...bundle,
      estimateAttachments: [...(bundle.estimateAttachments ?? []), attachment],
    },
    createConsumerRepairEvent({
      requestDraftId: bundle.draft.id,
      eventType: "estimate_row_photo_attached",
      actorType: "consumer",
      actorUserId: input.ownerUserId,
      payload: {
        revisionId: input.revisionId,
        rowId: input.rowId,
        contentHash: input.contentHash,
      },
    }),
  ));
}

export function approveConsumerRepairRequestDraft(input: {
  requestDraftId: string;
  userId?: string;
  generatedAt?: string;
  canonicalArtifact?: {
    artifactId: string;
    revisionId: string;
    releaseId: string;
    status: "ready";
    sha256: string | null;
  };
}): ConsumerRepairDraftBundle {
  let bundle = getConsumerRepairBundle(input.requestDraftId);
  const userId = input.userId ?? bundle.draft.consumerUserId;
  const validation = validateConsumerRepairRequestForApprove(input.requestDraftId, userId);
  if (!validation.ok) {
    bundle = saveConsumerRepairBundle(withEvent(
      {
        ...bundle,
        draft: {
          ...bundle.draft,
          marketplaceValidationErrors: validation.errors,
          updatedAt: new Date().toISOString(),
        },
      },
      createConsumerRepairEvent({
        requestDraftId: input.requestDraftId,
        eventType: "consumer_approve_blocked",
        actorType: "consumer",
        actorUserId: userId,
        payload: { errors: validation.errors },
      }),
    ));
    throw new ConsumerRepairValidationError(validation.errors);
  }

  const canonicalBinding = canonicalBackendBindingForItems(bundle.items);
  if (canonicalBinding) {
    const artifact = input.canonicalArtifact;
    if (
      !artifact || artifact.status !== "ready" || !artifact.artifactId.trim() ||
      artifact.revisionId !== canonicalBinding.revisionId ||
      artifact.releaseId !== canonicalBinding.releaseId
    ) {
      throw new ConsumerRepairValidationError([{
        code: "ESTIMATE_CURRENT_ITEMS_PARITY_REQUIRED",
        messageRu: "Перед утверждением нужен готовый backend PDF той же revision и release.",
        field: "canonicalArtifact",
      }]);
    }
    if (bundle.draft.status === "consumer_approved") return cloneConsumerRepairValue(bundle);
    assertConsumerRepairDraftActionAllowed({ currentStatus: bundle.draft.status, action: "approve" });
    const draft = approveDraftRecord(bundle.draft);
    recordEstimateTelemetryEvent({
      event_name: "estimate_approved",
      route: "/request",
      platform: "unknown",
      request_id: input.requestDraftId,
      estimate_id: canonicalBinding.revisionId,
      payload: {
        pdf_id: artifact.artifactId,
        revision_id: canonicalBinding.revisionId,
        release_id: canonicalBinding.releaseId,
        sha256: artifact.sha256,
        item_count: bundle.items.length,
      },
    });
    return saveConsumerRepairBundle(withEvent({ ...bundle, draft }, createConsumerRepairEvent({
      requestDraftId: input.requestDraftId,
      eventType: "consumer_approved_canonical_backend_pdf",
      actorType: "consumer",
      actorUserId: userId,
      payload: {
        artifactId: artifact.artifactId,
        revisionId: canonicalBinding.revisionId,
        releaseId: canonicalBinding.releaseId,
        sha256: artifact.sha256,
      },
    })));
  }

  throw new ConsumerRepairValidationError([{
    code: "ESTIMATE_CURRENT_ITEMS_PARITY_REQUIRED",
    messageRu:
      "Для утверждения legacy-сметы сначала создайте явную backend child revision и получите PDF той же revision и release. Исходная revision не изменена.",
    field: "canonicalArtifact",
  }]);
}

export function createConsumerRepairDraftFromHistorySnapshot(input: {
  sourceRequestDraftId: string;
  userId?: string;
  reason?: "edit_as_new_revision" | "duplicate_as_new_estimate";
}): ConsumerRepairDraftBundle {
  const source = getConsumerRepairBundle(input.sourceRequestDraftId);
  const userId = input.userId ?? source.draft.consumerUserId;
  if (userId !== source.draft.consumerUserId) {
    throw new ConsumerRepairValidationError([
      {
        code: "OWNER_MISMATCH",
        messageRu: "Создать черновик из истории может только владелец сметы.",
        field: "userId",
      },
    ]);
  }
  if (source.draft.status === "draft") return cloneConsumerRepairValue(source);
  if (source.items.length < 1) {
    throw new Error("CONSUMER_REPAIR_HISTORY_SNAPSHOT_MISSING");
  }
  const draft = createDraftRecord({
    consumerUserId: source.draft.consumerUserId,
    problemText: source.draft.problemText,
    repairType: source.draft.repairType,
    city: source.draft.city,
    addressText: source.draft.addressText,
    preferredTimeText: source.draft.preferredTimeText,
    contactPhone: source.draft.contactPhone,
    selectedWork: source.draft.selectedWorkKey && source.draft.selectedWorkTitleRu
      ? {
          selectedWorkKey: source.draft.selectedWorkKey,
          selectedWorkTitleRu: source.draft.selectedWorkTitleRu,
          selectedWorkCategoryKey: source.draft.selectedWorkCategoryKey ?? source.draft.repairType,
          selectedWorkCategoryTitleRu: source.draft.selectedWorkCategoryTitleRu ?? source.draft.repairType,
          selectedWorkRawInput: source.draft.selectedWorkRawInput ?? source.draft.problemText ?? "",
          selectedWorkSource: "user_selected",
          selectedWorkResolverReGuessed: false,
        }
      : null,
  });
  const now = new Date().toISOString();
  const items = source.items.map((item) => ({
    ...item,
    id: id("consumer_item"),
    requestDraftId: draft.id,
    editableByConsumer: true,
    createdAt: now,
  }));
  const media = source.media.map((item) => ({
    ...item,
    id: id("consumer_media_link"),
    requestDraftId: draft.id,
    createdAt: now,
  }));
  const bundle: ConsumerRepairDraftBundle = {
    draft: {
      ...draft,
      title: source.draft.title,
      aiSummaryRu: source.draft.aiSummaryRu,
      missingData: source.draft.missingData,
    },
    items,
    media,
    pdfs: [],
    structuredEstimatePayload: source.structuredEstimatePayload,
    projectExecutionDrafts: [],
    marketplaceLink: createConsumerMarketplaceLink(draft.id),
    events: [
      createConsumerRepairEvent({
        requestDraftId: draft.id,
        eventType: input.reason === "duplicate_as_new_estimate"
          ? "history_snapshot_duplicated_as_new_estimate"
          : "history_snapshot_edit_as_new_revision",
        actorType: "consumer",
        actorUserId: userId,
        payload: {
          sourceRequestDraftId: source.draft.id,
          sourceStatus: source.draft.status,
          sourceRevisionId: source.estimateRevisionState?.current_revision_id ?? null,
        },
      }),
    ],
  };
  return saveConsumerRepairBundle(bundle);
}

export function listConsumerRepairRequestHistory(
  consumerUserId: string,
  options: ConsumerRepairHistoryPageOptions = {},
): ConsumerRepairDraftBundle[] {
  return listConsumerRepairBundlesForUser(consumerUserId, {
    ...options,
    limit: options.limit ?? 20,
  });
}

export function listConsumerRepairApprovedHistory(
  consumerUserId: string,
  options: ConsumerRepairHistoryPageOptions = {},
): ConsumerRepairApprovedHistoryPage {
  const pageSize = Math.min(Math.max(options.limit ?? 20, 1), 20);
  hydrateConsumerRepairRequestStoreForLedger();
  const ledgerPage = listConsumerRepairApprovedHistoryRecordsFromLedger(consumerUserId, {
    ...options,
    limit: pageSize,
    statuses: CONSUMER_REPAIR_APPROVED_HISTORY_STATUSES,
  });
  const resolvedRecords = ledgerPage.records.flatMap((record) => {
    const bundle = findConsumerRepairBundle(record.approvedEstimateId);
    // A ledger pointer can outlive a locally cached bundle (for example after
    // a browser-storage migration). One stale record must not crash the whole
    // request screen or make the parameter-apply action unreachable.
    if (!bundle) return [];
    if (bundle.draft.consumerUserId !== consumerUserId) throw new Error("CONSUMER_REPAIR_LEDGER_OWNER_MISMATCH");
    return [{ record, bundle }];
  });
  const resolvedIds = new Set(resolvedRecords.map(({ record }) => record.approvedEstimateId));
  return {
    items: resolvedRecords.map(({ bundle }) => bundle),
    records: ledgerPage.records,
    unresolvedRecords: ledgerPage.records.filter((record) => !resolvedIds.has(record.approvedEstimateId)),
    totalApprovedCount: countConsumerRepairApprovedHistoryRecordsFromLedger(
      consumerUserId,
      CONSUMER_REPAIR_APPROVED_HISTORY_STATUSES,
    ),
    archivedApprovedCount: countConsumerRepairApprovedHistoryRecordsFromLedger(consumerUserId, ["archived"]),
    nextCursorCreatedAt: ledgerPage.nextCursorCreatedAt,
    pageSize,
    totalCountSource: "durable_store",
  };
}

export function listApprovedEstimateHistoryRecords(
  consumerUserId: string,
  options: ConsumerRepairHistoryPageOptions = {},
): ApprovedEstimateHistoryRecord[] {
  return listConsumerRepairApprovedHistory(consumerUserId, options).records;
}

export function getConsumerRepairRequest(requestDraftId: string): ConsumerRepairDraftBundle {
  return getConsumerRepairBundle(requestDraftId);
}

export function archiveConsumerRepairApprovedHistoryRecord(input: {
  requestDraftId: string;
  userId?: string;
}): ConsumerRepairDraftBundle {
  const bundle = getConsumerRepairBundle(input.requestDraftId);
  const userId = input.userId ?? bundle.draft.consumerUserId;
  if (userId !== bundle.draft.consumerUserId) {
    throw new ConsumerRepairValidationError([
      {
        code: "OWNER_MISMATCH",
        messageRu: "РђСЂС…РёРІРёСЂРѕРІР°С‚СЊ РіРѕС‚РѕРІСѓСЋ СЃРјРµС‚Сѓ РјРѕР¶РµС‚ С‚РѕР»СЊРєРѕ РµС‘ РІР»Р°РґРµР»РµС†.",
        field: "userId",
      },
    ]);
  }
  if (!CONSUMER_REPAIR_APPROVED_HISTORY_STATUSES.includes(bundle.draft.status)) {
    throw new ConsumerRepairValidationError([
      {
        code: "REQUEST_NOT_APPROVED",
        messageRu: "РђСЂС…РёРІРёСЂРѕРІР°С‚СЊ РјРѕР¶РЅРѕ С‚РѕР»СЊРєРѕ СѓС‚РІРµСЂР¶РґС‘РЅРЅСѓСЋ СЃРјРµС‚Сѓ РёР· РёСЃС‚РѕСЂРёРё.",
        field: "status",
      },
    ]);
  }

  const archivedAt = new Date().toISOString();
  return saveConsumerRepairBundle(withEvent(
    {
      ...bundle,
      draft: {
        ...bundle.draft,
        status: "archived",
        updatedAt: archivedAt,
      },
    },
    createConsumerRepairEvent({
      requestDraftId: input.requestDraftId,
      eventType: "approved_history_archived",
      actorType: "consumer",
      actorUserId: userId,
      payload: {
        sourceRevisionId: bundle.estimateRevisionState?.current_revision_id ?? null,
        sourceSnapshotId: bundle.pdfs.find((pdf) => pdf.pdfStatus === "generated")?.snapshotId ?? null,
      },
    }),
  ));
}

export function deleteConsumerRepairRequestDraft(input: {
  requestDraftId: string;
  userId?: string;
}): void {
  const bundle = getConsumerRepairBundle(input.requestDraftId);
  const userId = input.userId ?? bundle.draft.consumerUserId;
  if (userId !== bundle.draft.consumerUserId) {
    throw new ConsumerRepairValidationError([
      {
        code: "OWNER_MISMATCH",
        messageRu: "Удалить черновик может только владелец заявки.",
        field: "userId",
      },
    ]);
  }
  if (bundle.draft.status !== "draft") {
    throw new ConsumerRepairValidationError([
      {
        code: "REQUEST_NOT_APPROVED",
        messageRu: "Удалить можно только черновик. Утверждённая заявка остаётся в истории пользователя.",
        field: "status",
      },
    ]);
  }
  deleteConsumerRepairBundle(input.requestDraftId);
}

export function __resetConsumerRepairRequestStoreForTests(): void {
  resetConsumerRepairRequestStoreForTests();
  __resetConsumerRepairPdfStorageForTests();
}

export function __simulateConsumerRepairRequestStoreReloadForTests(): void {
  simulateConsumerRepairRequestStoreReloadForTests();
}

export async function initializeConsumerRepairTransactionalDurableStorage(): Promise<void> {
  await hydrateTransactionalConsumerRepairRequestStore();
}

export type { ConsumerRepairHistoryPageOptions };
