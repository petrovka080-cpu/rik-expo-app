import { CONSUMER_REPAIR_CONTEXT, assertConsumerRepairScope } from "./consumerRequestAccessPolicy";
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
import { buildConsumerRepairCanonicalDraftPayload } from "./consumerRequestPayloadParity";
import type { ProjectExecutionDraft } from "../projectExecution";
import {
  cloneConsumerRepairValue,
  deleteConsumerRepairBundle,
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
  attachConsumerRepairPdfRevisionMetadata,
  buildEditableEstimateSnapshotFromConsumerRepairBundle,
  bindConsumerRepairEstimateRevisionPdf,
  ensureConsumerRepairBundleEstimateRevisionState,
  freezeConsumerRepairEstimateRevision,
  withConsumerRepairEditableEstimateAudit,
} from "./consumerRequestEditableEstimateSnapshot";
import { __resetConsumerRepairPdfStorageForTests, consumerRepairPdfStorageObjectExists } from "./consumerRequestPdfStorage";
import { validateConsumerRepairRequestForApprove } from "./consumerRequestValidationService";
import {
  countConsumerRepairApprovedHistoryRecordsFromLedger,
  listConsumerRepairApprovedHistoryRecordsFromLedger,
} from "./consumerRequestLedgerBridge";
import { recordEstimateTelemetryEvent } from "../../features/estimates/telemetry/estimateTelemetryRecorder";
import type { GlobalEstimateResult } from "../ai/globalEstimate/globalEstimateTypes";
import { buildConsumerRepairAiDraftFromGlobalEstimate } from "./consumerRequestGlobalEstimateIntegration";
import {
  commitEstimateCompileResult,
  createEstimateDraftSession,
  failEstimateCompile,
  prepareEstimateCompile,
  selectScope,
  selectEstimateDraftWork,
  type EstimateDraftSession,
  type EstimateDraftSessionParameterValue,
  type EstimateDraftScopeRequirement,
} from "../estimate/draftSession/estimateDraftSession";
import {
  ASPHALT_PROFESSIONAL_NAME_RU_V4,
  ASPHALT_WORK_ID_V4,
} from "../estimate/v4/asphalt/asphaltV4Constants";
import {
  isRoadScopeIdV4,
  type RoadScopeIdV4,
} from "../estimate/v4/asphalt/roadScopeTruthV4";
import type { CatalogItemForEstimate } from "../catalog/catalogItemTypes";
import type {
  ApprovedEstimateHistoryRecord,
  ConsumerRepairAiDraft,
  ConsumerRepairDraftBundle,
  ConsumerRepairPdfSupplement,
  ConsumerRepairCatalogCandidate,
  ConsumerRepairSelectedWork,
  ConsumerRepairRequestEvent,
  ConsumerRepairRequestItem,
  ConsumerRepairRequestMedia,
  ConsumerRepairPdfOpenResult,
  ConsumerRepairStatus,
  PendingRoadScopeSelectionV4,
} from "./consumerRequestTypes";
import type {
  EstimateDraftRevision,
  EstimateDraftRevisionState,
  ProfessionalBoqRow,
} from "../estimate/estimateDraftRevisionContract";
import type { UserParamPatchOperation } from "../estimate/validateUserParamPatch";
import {
  canonicalElectricalOverridesFromBundle,
  createCanonicalElectricalEstimateState,
  diffCanonicalElectricalRevisions,
} from "../estimate/v4/electrical/consumerRequestCanonicalElectricalEstimate";
import {
  ELECTRICAL_CANONICAL_PARAMETER_SCHEMA,
  ELECTRICAL_CANONICAL_WORK_KEY,
  type ElectricalCanonicalParameterKey,
  type ElectricalCanonicalParameterValue,
} from "../estimate/v4/electrical/electricalCanonicalV1";
import { buildCanonicalElectricalConsumerRepairAiDraft } from "../estimate/v4/electrical/buildCanonicalElectricalConsumerRepairAiDraft";
import {
  projectEstimateDraftRevisionToCanonicalSession,
  projectEstimateDraftSessionToCanonicalSession,
} from "../estimate/canonicalParameters";

const id = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

function loadAiEstimateRuntime() {
  const runtimeModule = require("../estimate/runtime/createAiEstimateRuntime") as
    typeof import("../estimate/runtime/createAiEstimateRuntime");
  return runtimeModule.createAiEstimateRuntime();
}

function loadConsumerRepairPdfService() {
  return require(
    "./consumerRequestPdfService"
  ) as typeof import("./consumerRequestPdfService");
}

function loadConsumerRepairDraftRevisionDependencies() {
  return {
    ...require(
      "../estimate/application/createInitialEstimateDraftRevision"
    ) as typeof import("../estimate/application/createInitialEstimateDraftRevision"),
    ...require(
      "../ai/extractWorkParamsFromInlinePrompt"
    ) as typeof import("../ai/extractWorkParamsFromInlinePrompt"),
    ...require(
      "../estimate/workProfiles/registeredEstimateWorkProfiles"
    ) as typeof import("../estimate/workProfiles/registeredEstimateWorkProfiles"),
  };
}

function hasRoadworksWaveARegistration(workId: string | null | undefined): boolean {
  if (!workId) return false;
  const roadworksModule = require("../estimate/v4/roadworks") as
    typeof import("../estimate/v4/roadworks");
  return Boolean(roadworksModule.getRoadworksWaveAProductionRegistration(workId));
}

export const CONSUMER_REPAIR_APPROVED_HISTORY_STATUSES: ConsumerRepairStatus[] = [
  "consumer_approved",
  "sent_to_marketplace",
];

export type ConsumerRepairApprovedHistoryPage = {
  items: ConsumerRepairDraftBundle[];
  records: ApprovedEstimateHistoryRecord[];
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
  const sourceRevisionId = latestPdf?.revisionId
    ?? bundle.estimateRevisionState?.current_revision_id
    ?? bundle.estimateDraftRevisionState?.currentRevisionId
    ?? bundle.durableHistorySummary?.sourceRevisionId
    ?? bundle.draft.id;
  const revision = bundle.estimateRevisionState?.revisions.find((candidate) =>
    candidate.revision_id === sourceRevisionId
  );
  const sourceSnapshotId = latestPdf?.snapshotId
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
    pdfArtifactId: latestPdf?.id ?? null,
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

function createEstimateDraftRevisionStateForConsumerBundle(input: {
  draftId: string;
  rawInput: string;
  selectedWork?: ConsumerRepairSelectedWork | null;
  city?: string | null;
  currency?: string | null;
  countryCode?: string | null;
  createdAt?: string;
}): EstimateDraftRevisionState | null {
  try {
    const runtime = loadAiEstimateRuntime();
    const { revision } = runtime.createDraft({
      estimateDraftId: input.draftId,
      rawInput: input.rawInput,
      selectedTemplateId: input.selectedWork?.selectedWorkKey,
      selectedTemplateName: input.selectedWork?.selectedWorkTitleRu,
      selectedWorkKey: input.selectedWork?.selectedWorkKey,
      city: input.city,
      currency: input.currency,
      countryCode: input.countryCode,
      createdAt: input.createdAt,
    });
    return {
      estimateDraftId: revision.estimateDraftId,
      currentRevisionId: revision.revisionId,
      revisions: [revision],
      diffs: [],
    };
  } catch {
    return null;
  }
}

function userEnteredDraftSessionParameters(
  rawInput: string,
  confirmedAt: string,
): Record<string, EstimateDraftSessionParameterValue> {
  return Object.fromEntries(
    Object.entries(
      loadConsumerRepairDraftRevisionDependencies()
        .extractWorkParamsFromInlinePrompt(rawInput),
    ).map(([key, parameter]) => [
      key,
      {
        value: parameter.value,
        ...(parameter.canonicalUnit ? { unit: parameter.canonicalUnit } : {}),
        origin: parameter.sourceText === "length_m * width_m"
          ? "PROJECT_DERIVED" as const
          : "USER_ENTERED" as const,
        confirmedAt: parameter.requiresConfirmation ? null : confirmedAt,
        sourceText: parameter.sourceText,
        ...(parameter.requiresConfirmation ? { requiresConfirmation: true } : {}),
        ...(parameter.sourceText === "length_m * width_m"
          ? { derivedFrom: ["length_m", "width_m"] }
          : {}),
      },
    ]),
  );
}

function createSelectedWorkDraftSession(input: {
  draftId: string;
  selectedWork: ConsumerRepairSelectedWork | null;
  fallbackCatalogWorkId?: string | null;
  rawInput: string;
  createdAt: string;
  scopeRequired: boolean;
  scopeRequirement?: EstimateDraftScopeRequirement | null;
}): EstimateDraftSession {
  const empty = createEstimateDraftSession({ draftId: input.draftId });
  const catalogWorkId = input.selectedWork?.selectedWorkKey ?? input.fallbackCatalogWorkId?.trim() ?? "";
  if (!catalogWorkId) return empty;
  return selectEstimateDraftWork(empty, {
    catalogWorkId,
    canonicalWorkKey: catalogWorkId,
    source: input.selectedWork ? "EXPLICIT_SELECTION" : "FREE_TEXT",
    scopeRequired: input.scopeRequired,
    scopeRequirement: input.scopeRequirement,
    parameters: userEnteredDraftSessionParameters(input.rawInput, input.createdAt),
  });
}

function pendingRoadScopeSelectionFromSession(
  session: EstimateDraftSession | null | undefined,
): PendingRoadScopeSelectionV4 | null {
  const requirement = session?.status === "SCOPE_REQUIRED"
    ? session.scopeRequirement
    : null;
  if (!session || !requirement) return null;
  return {
    pendingIntentId: `draft-session:${session.draftId}:${session.selectionEpoch}`,
    requestId: session.draftId,
    originalUserText: requirement.originalUserText,
    requestedCatalogWorkId: requirement.requestedCatalogWorkId,
    offeredScopes: [...requirement.offeredScopePresetIds] as RoadScopeIdV4[],
    resolverEvidence: [...requirement.resolverEvidence],
    resolverVersion: requirement.resolverVersion,
    createdAt: requirement.createdAt,
  };
}

function itemTypeFromBoqRow(row: ProfessionalBoqRow): ConsumerRepairRequestItem["itemType"] {
  if (row.rowType === "material") return "material";
  if (row.rowType === "work" || row.rowType === "labor") return "work";
  if (row.rowType === "document") return "document";
  if (row.rowType === "other") return "other";
  return "service";
}

function createConsumerRepairItemsFromDraftRevision(
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
  const createStartedAt = Date.now();
  const recordCanonicalElectricalCreateTiming = (stage: string): void => {
    if (
      typeof __DEV__ === "undefined" ||
      !__DEV__ ||
      (
        input.aiDraft?.structuredEstimatePayload?.workKey !==
          ELECTRICAL_CANONICAL_WORK_KEY &&
        input.selectedWork?.selectedWorkKey !== ELECTRICAL_CANONICAL_WORK_KEY &&
        input.aiDraft?.selectedWork?.selectedWorkKey !==
          ELECTRICAL_CANONICAL_WORK_KEY
      )
    ) {
      return;
    }
    console.info("[RikCanonicalElectricalBundleCreate]", JSON.stringify({
      stage,
      elapsedMs: Date.now() - createStartedAt,
    }));
  };
  assertConsumerRepairScope(CONSUMER_REPAIR_CONTEXT);
  assertConsumerRepairDraftActionAllowed({ currentStatus: "none", action: "create_draft" });
  const selectedWork = input.selectedWork ?? input.aiDraft?.selectedWork ?? null;
  const draft = createDraftRecord({ ...input, selectedWork });
  recordCanonicalElectricalCreateTiming("DRAFT_RECORD_READY");
  const items = (input.aiDraft?.items ?? []).map((item) =>
    createConsumerRepairRequestItem({
      requestDraftId: draft.id,
      ...item,
    }),
  );
  recordCanonicalElectricalCreateTiming("ITEMS_READY");
  const marketplaceLink = createConsumerMarketplaceLink(draft.id);
  const isAsphaltV4 = selectedWork?.selectedWorkKey === ASPHALT_WORK_ID_V4 ||
    input.aiDraft?.repairType === ASPHALT_WORK_ID_V4;
  const hasCanonicalStructuredEstimate = Boolean(input.aiDraft?.structuredEstimatePayload);
  const canonicalElectricalState =
    input.aiDraft?.structuredEstimatePayload?.workKey === ELECTRICAL_CANONICAL_WORK_KEY ||
      selectedWork?.selectedWorkKey === ELECTRICAL_CANONICAL_WORK_KEY
      ? createCanonicalElectricalEstimateState({
          draftId: draft.id,
          rawInput: draft.problemText ?? "",
          items,
          createdAt: draft.createdAt,
        })
      : null;
  recordCanonicalElectricalCreateTiming("CANONICAL_STATE_READY");
  // A structured estimate already owns the canonical BOQ and the editable
  // EstimateRevisionState is created from these exact request items below.
  // Re-running the legacy AI runtime here would compile the same estimate a
  // second time during synchronous Android persistence.
  const estimateDraftRevisionState = canonicalElectricalState?.estimateDraftRevisionState ??
    ((items.length > 0 || isAsphaltV4) &&
    !hasCanonicalStructuredEstimate
    ? createEstimateDraftRevisionStateForConsumerBundle({
        draftId: draft.id,
        rawInput: draft.problemText ?? "",
        selectedWork,
        city: draft.city,
        currency: items.find((item) => item.currency)?.currency ?? "KGS",
        countryCode: "KG",
        createdAt: draft.createdAt,
      })
    : null);
  recordCanonicalElectricalCreateTiming("REVISION_STATE_READY");
  const initialRevision = estimateDraftRevisionState?.revisions.find(
    (revision) => revision.revisionId === estimateDraftRevisionState.currentRevisionId,
  ) ?? null;
  const projectedCanonicalParameterSession = initialRevision
    ? projectEstimateDraftRevisionToCanonicalSession({
        revision: initialRevision,
        draftId: draft.id,
        createdAt: draft.createdAt,
      })
    : null;
  const estimateDraftSession = canonicalElectricalState?.estimateDraftSession ??
    createSelectedWorkDraftSession({
        draftId: draft.id,
        selectedWork,
        fallbackCatalogWorkId: input.pendingRoadScopeSelection?.requestedCatalogWorkId,
        rawInput: draft.problemText ?? "",
        createdAt: draft.createdAt,
        scopeRequired: Boolean(input.pendingRoadScopeSelection),
        scopeRequirement: input.pendingRoadScopeSelection
          ? {
              originalUserText: input.pendingRoadScopeSelection.originalUserText,
              requestedCatalogWorkId: input.pendingRoadScopeSelection.requestedCatalogWorkId,
              offeredScopePresetIds: [...input.pendingRoadScopeSelection.offeredScopes],
              resolverEvidence: [...input.pendingRoadScopeSelection.resolverEvidence],
              resolverVersion: input.pendingRoadScopeSelection.resolverVersion,
              createdAt: input.pendingRoadScopeSelection.createdAt,
            }
          : null,
      });
  recordCanonicalElectricalCreateTiming("SESSIONS_READY");
  const projectedDraftSessionCanonicalParameters = estimateDraftSession
    ? projectEstimateDraftSessionToCanonicalSession({
        session: estimateDraftSession,
        createdAt: draft.createdAt,
      })
    : null;
  const bundle: ConsumerRepairDraftBundle = {
    draft,
    items,
    media: [],
    pdfs: [],
    estimateDraftRevisionState,
    estimateDraftSession,
    canonicalParameterSession:
      canonicalElectricalState?.canonicalParameterSession ??
      projectedCanonicalParameterSession ??
      projectedDraftSessionCanonicalParameters,
    electricalCircuitSchedule:
      canonicalElectricalState?.electricalCircuitSchedule ??
      input.aiDraft?.electricalCircuitSchedule ??
      null,
    structuredEstimatePayload: input.aiDraft?.structuredEstimatePayload ?? null,
    projectExecutionDrafts: [],
    marketplaceLink,
    events: [
      createConsumerRepairEvent({
        requestDraftId: draft.id,
        eventType: "draft_created",
        actorType: "consumer",
        payload: {
          consumer_only: true,
          selectedWorkKey: selectedWork?.selectedWorkKey,
          selectedWorkSource: selectedWork?.selectedWorkSource,
        },
      }),
    ],
    // Compatibility view only. EstimateDraftSession owns this state.
    pendingRoadScopeSelection: pendingRoadScopeSelectionFromSession(estimateDraftSession),
  };
  recordCanonicalElectricalCreateTiming("BUNDLE_READY");
  const revisionReadyBundle =
    items.length > 0 || isAsphaltV4 || canonicalElectricalState
      ? ensureConsumerRepairBundleEstimateRevisionState(bundle)
      : bundle;
  recordCanonicalElectricalCreateTiming("REVISION_PROJECTION_READY");
  const saved = saveConsumerRepairBundle(revisionReadyBundle);
  recordCanonicalElectricalCreateTiming("DURABLE_SAVE_READY");
  return saved;
}

export function createConsumerRepairDraftFromGlobalEstimate(input: {
  consumerUserId: string;
  estimate: GlobalEstimateResult;
  originalText: string;
  city?: string | null;
  addressText?: string | null;
  contactPhone?: string | null;
  selectedWork?: ConsumerRepairSelectedWork | null;
}): ConsumerRepairDraftBundle {
  const aiDraft = buildConsumerRepairAiDraftFromGlobalEstimate(
    input.estimate,
    undefined,
    input.selectedWork ?? undefined,
  );
  return createConsumerRepairRequestDraft({
    consumerUserId: input.consumerUserId,
    problemText: input.originalText,
    repairType: input.estimate.work.category,
    city: input.city ?? input.estimate.locale.city ?? null,
    addressText: input.addressText ?? null,
    contactPhone: input.contactPhone ?? null,
    selectedWork: input.selectedWork ?? null,
    aiDraft,
  });
}

export function selectConsumerRepairRoadScopeV4(input: {
  requestDraftId: string;
  userId: string;
  selectedScope: string;
  createdAt?: string;
  expectedRevisionId?: string | null;
}): ConsumerRepairDraftBundle {
  const bundle = getConsumerRepairBundle(input.requestDraftId);
  if (!bundle) throw new Error(`CONSUMER_REPAIR_DRAFT_NOT_FOUND:${input.requestDraftId}`);
  if (bundle.draft.consumerUserId !== input.userId) throw new Error("CONSUMER_REPAIR_OWNER_MISMATCH");
  if (!isRoadScopeIdV4(input.selectedScope)) throw new Error("ROAD_SCOPE_ID_INVALID");
  const state = bundle.estimateDraftRevisionState ?? null;
  const current = state?.revisions.find((revision) => revision.revisionId === state.currentRevisionId) ?? null;
  const selectedScopeAlreadyBound =
    current?.roadScopeBinding?.selectedRoadScope === input.selectedScope;
  const replaceUnderexpandedImplicitFullRoad =
    selectedScopeAlreadyBound &&
    input.selectedScope === "FULL_ROAD_INFRASTRUCTURE" &&
    current.boq.rows.length < 500;
  if (selectedScopeAlreadyBound && !replaceUnderexpandedImplicitFullRoad) {
    if (bundle.items.length === current.boq.rows.length) return bundle;
    return saveConsumerRepairBundle({
      ...bundle,
      items: createConsumerRepairItemsFromDraftRevision(bundle.draft.id, current),
    });
  }
  if (
    !replaceUnderexpandedImplicitFullRoad &&
    Object.hasOwn(input, "expectedRevisionId") &&
    (current?.revisionId ?? null) !== input.expectedRevisionId
  ) {
    throw new Error("ROAD_SCOPE_CONCURRENT_CONFLICT");
  }
  const pending =
    pendingRoadScopeSelectionFromSession(bundle.estimateDraftSession) ??
    bundle.pendingRoadScopeSelection;
  if (!pending && !current?.roadScopeBinding) throw new Error("ROAD_SCOPE_PENDING_INTENT_MISSING");
  const createdAt = input.createdAt ?? new Date().toISOString();
  let compilingSession: EstimateDraftSession | null = null;
  if (pending) {
    const sourceSession = bundle.estimateDraftSession ?? createSelectedWorkDraftSession({
      draftId: bundle.draft.id,
      selectedWork: bundle.draft.selectedWorkKey
        ? {
          selectedWorkKey: bundle.draft.selectedWorkKey,
          selectedWorkTitleRu:
            bundle.draft.selectedWorkTitleRu ??
            bundle.draft.title ??
            ASPHALT_PROFESSIONAL_NAME_RU_V4,
          selectedWorkCategoryKey: bundle.draft.selectedWorkCategoryKey ?? "roadworks",
          selectedWorkCategoryTitleRu: bundle.draft.selectedWorkCategoryTitleRu ?? "Дорожные работы",
          selectedWorkRawInput: pending.originalUserText,
          selectedWorkSource: "user_selected",
          selectedWorkResolverReGuessed: false,
        }
        : null,
      fallbackCatalogWorkId: pending.requestedCatalogWorkId,
      rawInput: pending.originalUserText,
      createdAt: pending.createdAt,
      scopeRequired: true,
      scopeRequirement: {
        originalUserText: pending.originalUserText,
        requestedCatalogWorkId: pending.requestedCatalogWorkId,
        offeredScopePresetIds: [...pending.offeredScopes],
        resolverEvidence: [...pending.resolverEvidence],
        resolverVersion: pending.resolverVersion,
        createdAt: pending.createdAt,
      },
    });
    const registeredProfile =
      loadConsumerRepairDraftRevisionDependencies().getRegisteredEstimateWorkProfile(
      sourceSession.workIntent?.canonicalWorkKey ?? pending.requestedCatalogWorkId,
    );
    const registeredScope = registeredProfile?.scopePresets.find(
      (scope) => scope.scopePresetId === input.selectedScope,
    );
    if (!registeredScope) {
      throw new Error("ESTIMATE_SCOPE_PROFILE_NOT_REGISTERED");
    }
    const scopedSession = selectScope(sourceSession, {
      scopePresetId: registeredScope.scopePresetId,
      calculationStrategyId: registeredScope.calculationStrategyId,
      parameterSchemaVersion: registeredScope.parameterSchemaVersion,
      engineVersion: registeredScope.engineVersion,
      requiredParameterAlternatives: registeredScope.requiredParameterAlternatives.map((alternative) => ({
        alternativeId: alternative.alternativeId,
        parameterKeys: [...alternative.parameterKeys],
      })),
    });
    if (scopedSession.status !== "READY_TO_COMPILE") {
      return saveConsumerRepairBundle(withEvent({
        ...bundle,
        estimateDraftSession: scopedSession,
        canonicalParameterSession:
          projectEstimateDraftSessionToCanonicalSession({
            session: scopedSession,
            createdAt,
            previousSession: bundle.canonicalParameterSession,
          }),
        pendingRoadScopeSelection: pendingRoadScopeSelectionFromSession(scopedSession),
        draft: updateDraftRecord(bundle.draft, {
          missingData: ["Укажите площадь либо подтверждённые длину и ширину."],
        }),
      }, createConsumerRepairEvent({
        requestDraftId: bundle.draft.id,
        eventType: "estimate_parameters_required",
        actorType: "system",
        actorUserId: input.userId,
        payload: {
          selectedScope: input.selectedScope,
          selectionEpoch: scopedSession.selectionEpoch,
        },
      })));
    }
    compilingSession = prepareEstimateCompile(scopedSession).session;
  }
  let revision: EstimateDraftRevision;
  try {
    revision =
      loadConsumerRepairDraftRevisionDependencies().createInitialEstimateDraftRevision({
      estimateDraftId: bundle.draft.id,
      previousRevisionId: replaceUnderexpandedImplicitFullRoad ? null : current?.revisionId ?? null,
      rawInput: pending?.originalUserText ?? current?.roadScopeBinding?.originalUserText ?? bundle.draft.problemText ?? "",
      selectedWorkKey: pending?.requestedCatalogWorkId || ASPHALT_WORK_ID_V4,
      selectedTemplateId: ASPHALT_WORK_ID_V4,
      source: current && !replaceUnderexpandedImplicitFullRoad ? "template_change" : "initial_prompt",
      revisionIndex: replaceUnderexpandedImplicitFullRoad ? 1 : (state?.revisions.length ?? 0) + 1,
      createdAt,
      paramOverrides: {
        selectedRoadScope: { value: input.selectedScope, source: "user_input", lastChangedAt: createdAt },
      },
    });
  } catch (error) {
    if (compilingSession) {
      saveConsumerRepairBundle({
        ...bundle,
        estimateDraftSession: failEstimateCompile(
          compilingSession,
          error instanceof Error ? error.message : "estimate_compile_failed",
        ),
      });
    }
    throw error;
  }
  const pricedRevision = preserveConsumerManualPricesInDraftRevision(bundle, revision);
  const committedSession = compilingSession?.contextHash
    ? commitEstimateCompileResult(compilingSession, {
      draftId: bundle.draft.id,
      selectionEpoch: compilingSession.selectionEpoch,
      contextHash: compilingSession.contextHash,
      revisionId: pricedRevision.revisionId,
      scopePresetId: compilingSession.scopePresetId!,
      parameterSchemaVersion: compilingSession.parameterSchemaVersion!,
      calculationStrategyId: compilingSession.calculationStrategyId!,
    })
    : bundle.estimateDraftSession ?? null;
  const nextState: EstimateDraftRevisionState = {
    estimateDraftId: bundle.draft.id,
    currentRevisionId: pricedRevision.revisionId,
    revisions: replaceUnderexpandedImplicitFullRoad
      ? [pricedRevision]
      : [...(state?.revisions ?? []), pricedRevision],
    diffs: replaceUnderexpandedImplicitFullRoad ? [] : [...(state?.diffs ?? [])],
  };
  const next: ConsumerRepairDraftBundle = {
    ...bundle,
    draft: updateDraftRecord(bundle.draft, {
      problemText: revision.rawInput,
      title: ASPHALT_PROFESSIONAL_NAME_RU_V4,
      repairType: ASPHALT_WORK_ID_V4,
      selectedWorkKey: ASPHALT_WORK_ID_V4,
      selectedWorkTitleRu: ASPHALT_PROFESSIONAL_NAME_RU_V4,
      selectedWorkCategoryKey: "road_construction",
      selectedWorkCategoryTitleRu: "Дорожные работы",
      selectedWorkRawInput: revision.rawInput,
      selectedWorkSource: "user_selected",
      selectedWorkResolverReGuessed: false,
      aiSummaryRu: `${ASPHALT_PROFESSIONAL_NAME_RU_V4}: ${revision.quantityBasis?.area_m2.toLocaleString("ru-RU") ?? "—"} м²; строк BOQ ${revision.boq.rows.length}.`,
      missingData: revision.missingInputs.map((item) => item.label),
    }),
    items: createConsumerRepairItemsFromDraftRevision(bundle.draft.id, pricedRevision),
    estimateDraftRevisionState: nextState,
    estimateDraftSession: committedSession,
    canonicalParameterSession:
      projectEstimateDraftRevisionToCanonicalSession({
        revision: pricedRevision,
        draftId: bundle.draft.id,
        createdAt,
        previousSession: bundle.canonicalParameterSession,
      }),
    pendingRoadScopeSelection: null,
  };
  return saveConsumerRepairBundle(withEvent(next, createConsumerRepairEvent({
    requestDraftId: bundle.draft.id,
    eventType: "road_scope_selected",
    actorType: "consumer",
    actorUserId: input.userId,
    payload: {
      selectedScope: input.selectedScope,
      selectionEpoch: committedSession?.selectionEpoch ?? null,
      contextHash: committedSession?.contextHash ?? null,
      pendingIntentId: pending?.pendingIntentId ?? null,
      sourceRevisionId: current?.revisionId ?? null,
      revisionId: revision.revisionId,
    },
  })));
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

function parseCanonicalElectricalPatchValue(input: {
  paramKey: string;
  rawValue: string;
}): ElectricalCanonicalParameterValue {
  const definition = ELECTRICAL_CANONICAL_PARAMETER_SCHEMA.definitions.find(
    (candidate) => candidate.parameterId === input.paramKey,
  );
  if (!definition) {
    throw new Error(`CANONICAL_ELECTRICAL_PARAMETER_NOT_REGISTERED:${input.paramKey}`);
  }
  const raw = input.rawValue.trim();
  if (definition.valueType === "number") {
    const value = Number(raw.replace(/\s+/g, "").replace(",", "."));
    if (!Number.isFinite(value)) {
      throw new Error(`CANONICAL_ELECTRICAL_PARAMETER_NUMBER_INVALID:${input.paramKey}`);
    }
    if (definition.validation.min != null && value < definition.validation.min) {
      throw new Error(`CANONICAL_ELECTRICAL_PARAMETER_BELOW_MIN:${input.paramKey}`);
    }
    if (definition.validation.max != null && value > definition.validation.max) {
      throw new Error(`CANONICAL_ELECTRICAL_PARAMETER_ABOVE_MAX:${input.paramKey}`);
    }
    if (definition.validation.integer && !Number.isInteger(value)) {
      throw new Error(`CANONICAL_ELECTRICAL_PARAMETER_INTEGER_REQUIRED:${input.paramKey}`);
    }
    return value;
  }
  if (definition.valueType === "boolean") {
    if (/^(?:true|1|yes|да)$/iu.test(raw)) return true;
    if (/^(?:false|0|no|нет)$/iu.test(raw)) return false;
    throw new Error(`CANONICAL_ELECTRICAL_PARAMETER_BOOLEAN_INVALID:${input.paramKey}`);
  }
  if (!raw) throw new Error(`CANONICAL_ELECTRICAL_PARAMETER_TEXT_REQUIRED:${input.paramKey}`);
  return raw;
}

function applyCanonicalElectricalParameterPatches(input: {
  bundle: ConsumerRepairDraftBundle;
  patches: ConsumerRepairDraftRevisionParamBatchPatch[];
  userId: string;
  createdAt: string;
  eventType: "estimate_params_recalculated" | "estimate_params_batch_recalculated";
}): ConsumerRepairDraftBundle {
  const state = input.bundle.estimateDraftRevisionState;
  const currentRevision = state?.revisions.find(
    (revision) => revision.revisionId === state.currentRevisionId,
  );
  if (!state || !currentRevision || !input.bundle.canonicalParameterSession) {
    throw new Error("CANONICAL_ELECTRICAL_REVISION_STATE_MISSING");
  }
  const overrides = canonicalElectricalOverridesFromBundle(input.bundle);
  for (const patch of input.patches) {
    const key = patch.paramKey as ElectricalCanonicalParameterKey;
    if (patch.operation === "remove_param") {
      delete overrides[key];
      continue;
    }
    overrides[key] = parseCanonicalElectricalPatchValue({
      paramKey: patch.paramKey,
      rawValue: patch.rawValue,
    });
  }
  const selectedWork = input.bundle.draft.selectedWorkKey &&
      input.bundle.draft.selectedWorkTitleRu
    ? {
        selectedWorkKey: input.bundle.draft.selectedWorkKey,
        selectedWorkTitleRu: input.bundle.draft.selectedWorkTitleRu,
        selectedWorkCategoryKey:
          input.bundle.draft.selectedWorkCategoryKey ?? "electrical",
        selectedWorkCategoryTitleRu:
          input.bundle.draft.selectedWorkCategoryTitleRu ?? "Электромонтажные работы",
        selectedWorkRawInput:
          input.bundle.draft.selectedWorkRawInput ??
          input.bundle.draft.problemText ??
          "",
        selectedWorkSource: "user_selected" as const,
        selectedWorkResolverReGuessed: false as const,
      }
    : null;
  const compiledDraft = buildCanonicalElectricalConsumerRepairAiDraft({
    text: input.bundle.draft.problemText ?? "",
    countryCode: "KG",
    city: input.bundle.draft.city ?? "Bishkek",
    currency: input.bundle.items.find((item) => item.currency)?.currency ?? "KGS",
    selectedWork,
    parameterOverrides: overrides,
  });
  const provisionalItems = compiledDraft.items.map((item) =>
    createConsumerRepairRequestItem({
      requestDraftId: input.bundle.draft.id,
      ...item,
    }),
  );
  const compiledState = createCanonicalElectricalEstimateState({
    draftId: input.bundle.draft.id,
    rawInput: input.bundle.draft.problemText ?? "",
    items: provisionalItems,
    createdAt: input.createdAt,
    revisionIndex: state.revisions.length + 1,
    previousRevisionId: currentRevision.revisionId,
    overrides,
    previousCanonicalSession: input.bundle.canonicalParameterSession,
  });
  const recalculatedRevision = preserveConsumerManualPricesInDraftRevision(
    input.bundle,
    compiledState.revision,
  );
  const diff = diffCanonicalElectricalRevisions(
    currentRevision,
    recalculatedRevision,
  );
  const nextState: EstimateDraftRevisionState = {
    estimateDraftId: state.estimateDraftId,
    currentRevisionId: recalculatedRevision.revisionId,
    revisions: [...state.revisions, recalculatedRevision],
    diffs: [...state.diffs, diff],
  };
  const items = createConsumerRepairItemsFromDraftRevision(
    input.bundle.draft.id,
    recalculatedRevision,
  );
  const nextBundleBase: ConsumerRepairDraftBundle = {
    ...input.bundle,
    draft: updateDraftRecord(input.bundle.draft, {
      aiSummaryRu:
        `${input.bundle.draft.selectedWorkTitleRu ?? "Электромонтаж"}: ` +
        `пересчитано по canonical revision ${nextState.revisions.length}; ` +
        `изменено строк ${diff.changedRowsCount}.`,
      missingData: [
        ...recalculatedRevision.missingInputs.map((item) => item.label),
        ...recalculatedRevision.assumptions.map((assumption) => assumption.reason),
      ],
    }),
    items,
    pdfs: archivePdfsForStaleDraftRevision(
      input.bundle,
      recalculatedRevision.revisionId,
    ),
    structuredEstimatePayload: compiledDraft.structuredEstimatePayload ?? null,
    estimateDraftRevisionState: nextState,
    estimateDraftSession: compiledState.estimateDraftSession,
    canonicalParameterSession: compiledState.canonicalParameterSession,
    electricalCircuitSchedule: compiledState.electricalCircuitSchedule,
  };
  const nextBundleWithSnapshot = {
    ...nextBundleBase,
    editableEstimateSnapshot:
      buildEditableEstimateSnapshotFromConsumerRepairBundle(nextBundleBase),
  };
  const withSnapshot = appendConsumerRepairEstimateRevisionFromSnapshot({
    previousBundle: input.bundle,
    nextBundle: nextBundleWithSnapshot,
    event_type: "AI_RECALCULATED",
    source: "AI_RECALCULATED",
    actor_id: input.userId,
    before_value: currentRevision.revisionId,
    after_value: recalculatedRevision.revisionId,
    reason_ru:
      "Canonical electrical parameters изменены пользователем; BOQ и итоги пересчитаны одной ревизией.",
  });
  const reopened = reopenApprovedEstimateForContentEdit({
    bundle: withSnapshot,
    actorUserId: input.userId,
    sourceEventType: input.eventType,
  });
  return saveConsumerRepairBundle(withEvent(
    reopened,
    createConsumerRepairEvent({
      requestDraftId: input.bundle.draft.id,
      eventType: input.eventType,
      actorType: "consumer",
      actorUserId: input.userId,
      payload: {
        changedParamKeys: input.patches.map((patch) => patch.paramKey),
        patchCount: input.patches.length,
        revisionId: recalculatedRevision.revisionId,
        previousRevisionId: currentRevision.revisionId,
        changedRows: diff.changedRowsCount,
        canonicalParameterFingerprint:
          compiledState.canonicalParameterSession.fingerprint,
        calculationVersion:
          compiledState.canonicalParameterSession.calculationVersion,
        pdfStatus: "stale",
      },
    }),
  ));
}

export function applyConsumerRepairDraftRevisionParamPatch(input: {
  requestDraftId: string;
  operation: UserParamPatchOperation;
  paramKey: string;
  rawValue: string;
  userId?: string;
  createdAt?: string;
}): ConsumerRepairDraftBundle {
  const bundle = getConsumerRepairBundle(input.requestDraftId);
  assertConsumerRepairDraftActionAllowed({ currentStatus: bundle.draft.status, action: "update_draft_fields" });
  const userId = input.userId ?? bundle.draft.consumerUserId;
  if (userId !== bundle.draft.consumerUserId) {
    throw new ConsumerRepairValidationError([
      {
        code: "OWNER_MISMATCH",
        messageRu: "Изменить параметры сметы может только владелец заявки.",
        field: "userId",
      },
    ]);
  }
  if (
    bundle.canonicalParameterSession?.canonicalWorkKey ===
      ELECTRICAL_CANONICAL_WORK_KEY
  ) {
    return applyCanonicalElectricalParameterPatches({
      bundle,
      patches: [{
        operation: input.operation,
        paramKey: input.paramKey.trim(),
        rawValue: input.rawValue.trim(),
      }],
      userId,
      createdAt: input.createdAt ?? new Date().toISOString(),
      eventType: "estimate_params_recalculated",
    });
  }

  const selectedWork = bundle.draft.selectedWorkKey && bundle.draft.selectedWorkTitleRu
    ? {
        selectedWorkKey: bundle.draft.selectedWorkKey,
        selectedWorkTitleRu: bundle.draft.selectedWorkTitleRu,
        selectedWorkCategoryKey: bundle.draft.selectedWorkCategoryKey ?? bundle.draft.repairType,
        selectedWorkCategoryTitleRu: bundle.draft.selectedWorkCategoryTitleRu ?? bundle.draft.repairType,
        selectedWorkRawInput: bundle.draft.selectedWorkRawInput ?? bundle.draft.problemText ?? "",
        selectedWorkSource: "user_selected" as const,
        selectedWorkResolverReGuessed: false as const,
      }
    : null;
  const state = bundle.estimateDraftRevisionState
    ?? createEstimateDraftRevisionStateForConsumerBundle({
      draftId: bundle.draft.id,
      rawInput: bundle.draft.problemText ?? "",
      selectedWork,
      city: bundle.draft.city,
      currency: bundle.items.find((item) => item.currency)?.currency ?? "KGS",
      countryCode: "KG",
      createdAt: bundle.draft.createdAt,
    });
  if (!state) throw new Error("CONSUMER_REPAIR_ESTIMATE_DRAFT_REVISION_STATE_MISSING");
  const currentRevision = state.revisions.find((revision) => revision.revisionId === state.currentRevisionId);
  if (!currentRevision) throw new Error(`CONSUMER_REPAIR_ESTIMATE_DRAFT_REVISION_MISSING:${state.currentRevisionId}`);
  const runtime = loadAiEstimateRuntime();
  const result = runtime.applyParameterOverride({
    revision: currentRevision,
    operation: input.operation,
    paramKey: input.paramKey,
    rawValue: input.rawValue,
    createdAt: input.createdAt,
    revisionIndex: state.revisions.length + 1,
  });
  const recalculatedRevision = preserveConsumerManualPricesInDraftRevision(bundle, result.revision);
  const nextState: EstimateDraftRevisionState = {
    estimateDraftId: state.estimateDraftId,
    currentRevisionId: recalculatedRevision.revisionId,
    revisions: [...state.revisions, recalculatedRevision],
    diffs: [...state.diffs, result.diff],
  };
  const nextRevision = nextState.revisions.find((revision) => revision.revisionId === nextState.currentRevisionId);
  if (!nextRevision) throw new Error(`CONSUMER_REPAIR_ESTIMATE_DRAFT_REVISION_MISSING:${nextState.currentRevisionId}`);
  const items = createConsumerRepairItemsFromDraftRevision(bundle.draft.id, nextRevision);
  const nextBundleBase: ConsumerRepairDraftBundle = {
    ...bundle,
    draft: updateDraftRecord(bundle.draft, {
      problemText: nextRevision.rawInput,
      title: bundle.draft.selectedWorkTitleRu ?? bundle.draft.title,
      repairType: bundle.draft.repairType,
      aiSummaryRu: `${bundle.draft.selectedWorkTitleRu ?? nextRevision.matchedFamily}: пересчитано по ревизии ${nextState.revisions.length}; строк BOQ ${nextRevision.boq.rows.length}.`,
      missingData: [
        ...nextRevision.missingInputs.map((item) => item.label),
        ...nextRevision.assumptions
          .filter((assumption) => !assumption.replacedByUserInput)
          .map((assumption) => assumption.reason),
      ],
      selectedWorkKey: nextRevision.matchedFamily === ASPHALT_WORK_ID_V4 ||
        hasRoadworksWaveARegistration(nextRevision.matchedFamily)
        ? nextRevision.matchedFamily
        : nextRevision.selectedTemplateId,
      selectedWorkTitleRu: bundle.draft.selectedWorkTitleRu,
      selectedWorkCategoryKey: bundle.draft.selectedWorkCategoryKey,
      selectedWorkCategoryTitleRu: bundle.draft.selectedWorkCategoryTitleRu,
      selectedWorkRawInput: nextRevision.rawInput,
      selectedWorkSource: bundle.draft.selectedWorkSource,
      selectedWorkResolverReGuessed: bundle.draft.selectedWorkResolverReGuessed,
    }),
    items,
    pdfs: archivePdfsForStaleDraftRevision(bundle, nextRevision.revisionId),
    estimateDraftRevisionState: nextState,
    canonicalParameterSession:
      projectEstimateDraftRevisionToCanonicalSession({
        revision: nextRevision,
        draftId: bundle.draft.id,
        createdAt: input.createdAt ?? new Date().toISOString(),
        previousSession: bundle.canonicalParameterSession,
      }) ?? bundle.canonicalParameterSession,
  };
  const nextBundleWithSnapshot = {
    ...nextBundleBase,
    editableEstimateSnapshot: buildEditableEstimateSnapshotFromConsumerRepairBundle(nextBundleBase),
  };
  const withSnapshot = appendConsumerRepairEstimateRevisionFromSnapshot({
    previousBundle: bundle,
    nextBundle: nextBundleWithSnapshot,
    event_type: "AI_RECALCULATED",
    source: "AI_RECALCULATED",
    actor_id: userId,
    before_value: currentRevision.revisionId,
    after_value: nextRevision.revisionId,
    reason_ru: "Параметры сметы изменены пользователем, BOQ пересчитан.",
  });
  const reopened = reopenApprovedEstimateForContentEdit({
    bundle: withSnapshot,
    actorUserId: userId,
    sourceEventType: "estimate_params_recalculated",
  });
  return saveConsumerRepairBundle(withEvent(
    reopened,
    createConsumerRepairEvent({
      requestDraftId: input.requestDraftId,
      eventType: "estimate_params_recalculated",
      actorType: "consumer",
      actorUserId: userId,
      payload: {
        operation: input.operation,
        paramKey: input.paramKey,
        revisionId: nextRevision.revisionId,
        previousRevisionId: currentRevision.revisionId,
        changedRows: nextState.diffs[nextState.diffs.length - 1]?.changedRowsCount ?? 0,
      },
    }),
  ));
}

export type ConsumerRepairDraftRevisionParamBatchPatch = {
  operation: UserParamPatchOperation;
  paramKey: string;
  rawValue: string;
};

function assertSafeDraftRevisionBatchResult(input: {
  previousRevision: EstimateDraftRevision;
  nextRevision: EstimateDraftRevision;
  patches: ConsumerRepairDraftRevisionParamBatchPatch[];
}): void {
  const failures = [
    input.nextRevision.selectedTemplateId === input.previousRevision.selectedTemplateId
      ? ""
      : "selected_template_changed",
    input.nextRevision.matchedFamily === input.previousRevision.matchedFamily
      ? ""
      : "matched_family_changed",
    input.previousRevision.boq.rows.length === 0 || input.nextRevision.boq.rows.length > 0
      ? ""
      : "boq_rows_empty_after_batch",
    ...input.nextRevision.boq.rows.map((row) =>
      Number.isFinite(row.quantity) && row.quantity >= 0 && row.unit.trim()
        ? ""
        : `invalid_row_quantity_or_unit:${row.rowId}`
    ),
    ...input.patches.map((patch) =>
      patch.operation === "remove_param" || input.nextRevision.params[patch.paramKey]
        ? ""
        : `patched_param_missing:${patch.paramKey}`
    ),
  ].filter(Boolean);

  if (failures.length === 0) return;
  throw new ConsumerRepairValidationError([
    {
      code: "ESTIMATE_REVISION_BATCH_REJECTED",
      messageRu: `Пересчет отклонен: новая ревизия не прошла проверку. Старая смета сохранена без изменений. Причина: ${failures.join(", ")}`,
      field: "estimateDraftRevisionState",
    },
  ]);
}

export function applyConsumerRepairDraftRevisionParamBatchPatch(input: {
  requestDraftId: string;
  patches: ConsumerRepairDraftRevisionParamBatchPatch[];
  userId?: string;
  createdAt?: string;
}): ConsumerRepairDraftBundle {
  const cleanPatches = input.patches
    .map((patch) => ({
      ...patch,
      paramKey: patch.paramKey.trim(),
      rawValue: patch.rawValue.trim(),
    }))
    .filter((patch) => patch.paramKey.length > 0);
  if (cleanPatches.length === 0) {
    throw new ConsumerRepairValidationError([
      {
        code: "ESTIMATE_PARAM_BATCH_EMPTY",
        messageRu: "Нет изменений параметров для применения.",
        field: "params",
      },
    ]);
  }

  const bundle = getConsumerRepairBundle(input.requestDraftId);
  assertConsumerRepairDraftActionAllowed({ currentStatus: bundle.draft.status, action: "update_draft_fields" });
  const userId = input.userId ?? bundle.draft.consumerUserId;
  if (userId !== bundle.draft.consumerUserId) {
    throw new ConsumerRepairValidationError([
      {
        code: "OWNER_MISMATCH",
        messageRu: "Изменить параметры сметы может только владелец заявки.",
        field: "userId",
      },
    ]);
  }
  if (
    bundle.canonicalParameterSession?.canonicalWorkKey ===
      ELECTRICAL_CANONICAL_WORK_KEY
  ) {
    return applyCanonicalElectricalParameterPatches({
      bundle,
      patches: cleanPatches,
      userId,
      createdAt: input.createdAt ?? new Date().toISOString(),
      eventType: "estimate_params_batch_recalculated",
    });
  }

  const selectedWork = bundle.draft.selectedWorkKey && bundle.draft.selectedWorkTitleRu
    ? {
        selectedWorkKey: bundle.draft.selectedWorkKey,
        selectedWorkTitleRu: bundle.draft.selectedWorkTitleRu,
        selectedWorkCategoryKey: bundle.draft.selectedWorkCategoryKey ?? bundle.draft.repairType,
        selectedWorkCategoryTitleRu: bundle.draft.selectedWorkCategoryTitleRu ?? bundle.draft.repairType,
        selectedWorkRawInput: bundle.draft.selectedWorkRawInput ?? bundle.draft.problemText ?? "",
        selectedWorkSource: "user_selected" as const,
        selectedWorkResolverReGuessed: false as const,
      }
    : null;
  const state = bundle.estimateDraftRevisionState
    ?? createEstimateDraftRevisionStateForConsumerBundle({
      draftId: bundle.draft.id,
      rawInput: bundle.draft.problemText ?? "",
      selectedWork,
      city: bundle.draft.city,
      currency: bundle.items.find((item) => item.currency)?.currency ?? "KGS",
      countryCode: "KG",
      createdAt: bundle.draft.createdAt,
    });
  if (!state) throw new Error("CONSUMER_REPAIR_ESTIMATE_DRAFT_REVISION_STATE_MISSING");
  const currentRevision = state.revisions.find((revision) => revision.revisionId === state.currentRevisionId);
  if (!currentRevision) throw new Error(`CONSUMER_REPAIR_ESTIMATE_DRAFT_REVISION_MISSING:${state.currentRevisionId}`);

  const runtime = loadAiEstimateRuntime();
  const result = runtime.applyParameterBatchOverride({
    revision: currentRevision,
    patches: cleanPatches,
    createdAt: input.createdAt,
    revisionIndex: state.revisions.length + 1,
  });
  assertSafeDraftRevisionBatchResult({
    previousRevision: currentRevision,
    nextRevision: result.revision,
    patches: cleanPatches,
  });

  const recalculatedRevision = preserveConsumerManualPricesInDraftRevision(bundle, result.revision);
  const nextState: EstimateDraftRevisionState = {
    estimateDraftId: state.estimateDraftId,
    currentRevisionId: recalculatedRevision.revisionId,
    revisions: [...state.revisions, recalculatedRevision],
    diffs: [...state.diffs, result.diff],
  };
  const nextRevision = nextState.revisions.find((revision) => revision.revisionId === nextState.currentRevisionId);
  if (!nextRevision) throw new Error(`CONSUMER_REPAIR_ESTIMATE_DRAFT_REVISION_MISSING:${nextState.currentRevisionId}`);
  const items = createConsumerRepairItemsFromDraftRevision(bundle.draft.id, nextRevision);
  const manualPriceCountBefore = bundle.items.filter((item) =>
    item.unitPrice != null && (
      item.priceEditedByConsumer === true ||
      item.priceSource === "user" ||
      item.priceStatus === "USER_PRICE_OVERRIDE" ||
      item.priceStatus === "USER_ENTERED_PRICE"
    )
  ).length;
  const manualPriceCountAfter = items.filter((item) => item.unitPrice != null).length;
  if (manualPriceCountAfter < manualPriceCountBefore) {
    throw new Error(
      `CONSUMER_REPAIR_MANUAL_PRICE_LOSS_BLOCKED:${manualPriceCountBefore}:${manualPriceCountAfter}` +
      `:${currentRevision.boq.rows.length}:${result.revision.boq.rows.length}`,
    );
  }
  const changedParamKeys = result.diff.changedParams.map((param) => param.key);
  const nextBundleBase: ConsumerRepairDraftBundle = {
    ...bundle,
    draft: updateDraftRecord(bundle.draft, {
      problemText: nextRevision.rawInput,
      title: bundle.draft.selectedWorkTitleRu ?? bundle.draft.title,
      repairType: bundle.draft.repairType,
      aiSummaryRu: `${bundle.draft.selectedWorkTitleRu ?? nextRevision.matchedFamily}: пересчитано по ревизии ${nextState.revisions.length}; изменено параметров ${changedParamKeys.length}; строк BOQ ${nextRevision.boq.rows.length}.`,
      missingData: [
        ...nextRevision.missingInputs.map((item) => item.label),
        ...nextRevision.assumptions
          .filter((assumption) => !assumption.replacedByUserInput)
          .map((assumption) => assumption.reason),
      ],
      selectedWorkKey: nextRevision.matchedFamily === ASPHALT_WORK_ID_V4 ||
        hasRoadworksWaveARegistration(nextRevision.matchedFamily)
        ? nextRevision.matchedFamily
        : nextRevision.selectedTemplateId,
      selectedWorkTitleRu: bundle.draft.selectedWorkTitleRu,
      selectedWorkCategoryKey: bundle.draft.selectedWorkCategoryKey,
      selectedWorkCategoryTitleRu: bundle.draft.selectedWorkCategoryTitleRu,
      selectedWorkRawInput: nextRevision.rawInput,
      selectedWorkSource: bundle.draft.selectedWorkSource,
      selectedWorkResolverReGuessed: bundle.draft.selectedWorkResolverReGuessed,
    }),
    items,
    pdfs: archivePdfsForStaleDraftRevision(bundle, nextRevision.revisionId),
    estimateDraftRevisionState: nextState,
    canonicalParameterSession:
      projectEstimateDraftRevisionToCanonicalSession({
        revision: nextRevision,
        draftId: bundle.draft.id,
        createdAt: input.createdAt ?? new Date().toISOString(),
        previousSession: bundle.canonicalParameterSession,
      }) ?? bundle.canonicalParameterSession,
  };
  const nextBundleWithSnapshot = {
    ...nextBundleBase,
    editableEstimateSnapshot: buildEditableEstimateSnapshotFromConsumerRepairBundle(nextBundleBase),
  };
  const withSnapshot = appendConsumerRepairEstimateRevisionFromSnapshot({
    previousBundle: bundle,
    nextBundle: nextBundleWithSnapshot,
    event_type: "AI_RECALCULATED",
    source: "AI_RECALCULATED",
    actor_id: userId,
    before_value: currentRevision.revisionId,
    after_value: nextRevision.revisionId,
    reason_ru: "Параметры сметы пакетно изменены пользователем, BOQ пересчитан одной ревизией.",
  });
  const reopened = reopenApprovedEstimateForContentEdit({
    bundle: withSnapshot,
    actorUserId: userId,
    sourceEventType: "estimate_params_batch_recalculated",
  });
  return saveConsumerRepairBundle(withEvent(
    reopened,
    createConsumerRepairEvent({
      requestDraftId: input.requestDraftId,
      eventType: "estimate_params_batch_recalculated",
      actorType: "consumer",
      actorUserId: userId,
      payload: {
        changedParamKeys,
        patchCount: cleanPatches.length,
        revisionId: nextRevision.revisionId,
        previousRevisionId: currentRevision.revisionId,
        rowsBefore: currentRevision.boq.rows.length,
        rowsAfter: nextRevision.boq.rows.length,
        changedRows: result.diff.changedRowsCount,
        pdfStatus: "stale",
      },
    }),
  ));
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

export function approveConsumerRepairRequestDraft(input: {
  requestDraftId: string;
  userId?: string;
  generatedAt?: string;
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

  const existingPdf = bundle.pdfs.find((pdf) =>
    pdf.pdfStatus === "generated" && consumerRepairPdfStorageObjectExists(pdf.storageBucket, pdf.storageKey),
  );
  const existingPdfIsFresh = existingPdf
    && (!bundle.draft.updatedAt || existingPdf.createdAt >= bundle.draft.updatedAt);
  if (bundle.draft.status === "consumer_approved" && existingPdfIsFresh) {
    return cloneConsumerRepairValue(bundle);
  }

  assertConsumerRepairDraftActionAllowed({ currentStatus: bundle.draft.status, action: "approve" });
  const draft = approveDraftRecord(bundle.draft);
  const frozen = freezeConsumerRepairEstimateRevision({
    bundle: { ...bundle, draft },
    actor_id: userId,
    created_at: draft.approvedAt ?? input.generatedAt,
  });
  const canonicalPdfBundle = { ...frozen, draft };
  const pdf = loadConsumerRepairPdfService().generateConsumerRepairRequestPdf({
    draft,
    items: frozen.items,
    media: frozen.media,
    supplement: canonicalParameterPdfSupplement(canonicalPdfBundle),
    canonicalPayload: buildConsumerRepairCanonicalDraftPayload(canonicalPdfBundle, "pdf_generation"),
    generatedAt: input.generatedAt,
  });
  const bound = bindConsumerRepairEstimateRevisionPdf({
    bundle: frozen,
    pdf_id: pdf.id,
    actor_id: userId,
    created_at: pdf.createdAt,
  });
  const revisionPdf = attachConsumerRepairPdfRevisionMetadata(pdf, bound.binding);
  recordEstimateTelemetryEvent({
    event_name: "estimate_approved",
    route: "/request",
    platform: "unknown",
    request_id: input.requestDraftId,
    estimate_id: draft.repairType,
    payload: {
      pdf_id: revisionPdf.id,
      revision_id: revisionPdf.revisionId,
      item_count: frozen.items.length,
    },
  });
  return saveConsumerRepairBundle(withEvent(
    {
      ...bound.bundle,
      draft,
      pdfs: [revisionPdf, ...bound.bundle.pdfs],
    },
    createConsumerRepairEvent({
      requestDraftId: input.requestDraftId,
      eventType: "consumer_approved_pdf_generated",
      actorType: "consumer",
      payload: { pdfId: revisionPdf.id, revisionId: revisionPdf.revisionId },
    }),
  ));
}

export function ensureConsumerRepairRequestPdfAvailable(input: {
  requestDraftId: string;
  userId?: string;
  pdfId?: string;
  generatedAt?: string;
}): ConsumerRepairDraftBundle {
  const bundle = getConsumerRepairBundle(input.requestDraftId);
  assertConsumerRepairDraftActionAllowed({ currentStatus: bundle.draft.status, action: "open_pdf" });
  const pdf = input.pdfId
    ? bundle.pdfs.find((candidate) => candidate.id === input.pdfId && candidate.pdfStatus === "generated")
    : bundle.pdfs.find((candidate) => candidate.pdfStatus === "generated");
  if (pdf && consumerRepairPdfStorageObjectExists(pdf.storageBucket, pdf.storageKey)) {
    return bundle;
  }
  if (bundle.items.length < 1) {
    throw new Error("PDF недоступен: нет snapshot для восстановления.");
  }
  const userId = input.userId ?? bundle.draft.consumerUserId;
  const regeneratedPdf =
    loadConsumerRepairPdfService().generateConsumerRepairRequestPdf({
    draft: bundle.draft,
    items: bundle.items,
    media: bundle.media,
    supplement: canonicalParameterPdfSupplement(bundle),
    canonicalPayload: buildConsumerRepairCanonicalDraftPayload(bundle, "pdf_generation"),
    generatedAt: input.generatedAt,
  });
  const bound = bindConsumerRepairEstimateRevisionPdf({
    bundle,
    pdf_id: regeneratedPdf.id,
    actor_id: userId,
    created_at: regeneratedPdf.createdAt,
  });
  const revisionPdf = attachConsumerRepairPdfRevisionMetadata(regeneratedPdf, bound.binding);
  return saveConsumerRepairBundle(withEvent(
    {
      ...bound.bundle,
      pdfs: [revisionPdf, ...bound.bundle.pdfs.filter((candidate) => candidate.id !== revisionPdf.id)],
    },
    createConsumerRepairEvent({
      requestDraftId: input.requestDraftId,
      eventType: "consumer_history_pdf_regenerated_from_snapshot",
      actorType: "consumer",
      actorUserId: userId,
      payload: { pdfId: revisionPdf.id, revisionId: revisionPdf.revisionId },
    }),
  ));
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
  }).map(migrateLegacyElectrical42RowDraft);
}

function isLegacyElectrical42RowDraft(
  bundle: ConsumerRepairDraftBundle,
): boolean {
  if (
    bundle.draft.status !== "draft" ||
    bundle.items.length !== 42
  ) {
    return false;
  }
  const electricalIdentity = [
    bundle.draft.problemText,
    bundle.draft.selectedWorkKey,
    bundle.draft.selectedWorkTitleRu,
    bundle.draft.repairType,
  ].some((value) =>
    /(?:электр|кабел|розет|выключ|electrical|wiring|cable)/iu.test(
      String(value ?? ""),
    )
  );
  if (!electricalIdentity) return false;
  const normalizedTitles = new Set(
    bundle.items.map((item) => item.titleRu.trim().toLocaleLowerCase("ru-RU")),
  );
  return (
    normalizedTitles.has("кабель") &&
    normalizedTitles.has("кабельные линии") &&
    normalizedTitles.has("кабель силовой")
  );
}

function migrateLegacyElectrical42RowDraft(
  bundle: ConsumerRepairDraftBundle,
): ConsumerRepairDraftBundle {
  if (!isLegacyElectrical42RowDraft(bundle)) return bundle;
  const rawInput = bundle.draft.problemText?.trim() ?? "";
  const selectedWork: ConsumerRepairSelectedWork = {
    selectedCatalogWorkId:
      bundle.draft.selectedCatalogWorkId ??
      bundle.draft.selectedWorkKey ??
      ELECTRICAL_CANONICAL_WORK_KEY,
    selectedWorkKey: ELECTRICAL_CANONICAL_WORK_KEY,
    selectedWorkTitleRu: "Электромонтаж",
    selectedWorkCategoryKey: "electrical",
    selectedWorkCategoryTitleRu: "Электромонтажные работы",
    selectedWorkRawInput: rawInput,
    selectedWorkSource: bundle.draft.selectedWorkSource ?? "user_selected",
    selectedWorkResolverReGuessed: false,
  };
  const aiDraft = buildCanonicalElectricalConsumerRepairAiDraft({
    text: rawInput,
    countryCode: "KG",
    city: bundle.draft.city ?? "Bishkek",
    currency: bundle.items.find((item) => item.currency)?.currency ?? "KGS",
    selectedWork,
  });
  const items = aiDraft.items.map((item) =>
    createConsumerRepairRequestItem({
      requestDraftId: bundle.draft.id,
      ...item,
    }),
  );
  const canonicalState = createCanonicalElectricalEstimateState({
    draftId: bundle.draft.id,
    rawInput,
    items,
    createdAt: new Date().toISOString(),
  });
  const migrated: ConsumerRepairDraftBundle = {
    ...bundle,
    draft: {
      ...updateDraftRecord(bundle.draft, {
        title: aiDraft.titleRu,
        selectedCatalogWorkId: selectedWork.selectedCatalogWorkId,
        selectedWorkKey: ELECTRICAL_CANONICAL_WORK_KEY,
        selectedWorkTitleRu: selectedWork.selectedWorkTitleRu,
        selectedWorkCategoryKey: selectedWork.selectedWorkCategoryKey,
        selectedWorkCategoryTitleRu: selectedWork.selectedWorkCategoryTitleRu,
        selectedWorkRawInput: rawInput,
        selectedWorkSource: selectedWork.selectedWorkSource,
        selectedWorkResolverReGuessed: false,
        aiSummaryRu: aiDraft.summaryRu,
        missingData: aiDraft.missingData,
      }),
      repairType: aiDraft.repairType,
    },
    items,
    pdfs: bundle.pdfs.map((pdf) => ({
      ...pdf,
      pdfStatus: "archived" as const,
    })),
    durableHistorySummary: null,
    editableEstimateSnapshot: null,
    estimateRevisionState: null,
    estimateDraftRevisionState:
      canonicalState.estimateDraftRevisionState,
    estimateDraftSession: canonicalState.estimateDraftSession,
    canonicalParameterSession: canonicalState.canonicalParameterSession,
    electricalCircuitSchedule: canonicalState.electricalCircuitSchedule,
    structuredEstimatePayload: aiDraft.structuredEstimatePayload ?? null,
    projectExecutionDrafts: [],
    pendingRoadScopeSelection: null,
    events: [
      ...bundle.events,
      createConsumerRepairEvent({
        requestDraftId: bundle.draft.id,
        eventType: "legacy_electrical_42_row_draft_invalidated",
        actorType: "system",
        payload: {
          previousRowCount: 42,
          canonicalWorkKey: ELECTRICAL_CANONICAL_WORK_KEY,
          reason: "legacy_hidden_quantities_and_unverified_prices",
        },
      }),
    ],
  };
  return saveConsumerRepairBundle(
    ensureConsumerRepairBundleEstimateRevisionState(migrated),
  );
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
  const items = ledgerPage.records.map((record) => {
    const bundle = getConsumerRepairBundle(record.approvedEstimateId);
    if (bundle.draft.consumerUserId !== consumerUserId) throw new Error("CONSUMER_REPAIR_LEDGER_OWNER_MISMATCH");
    return bundle;
  });
  return {
    items,
    records: ledgerPage.records,
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

function canonicalParameterPdfSupplement(
  bundle: ConsumerRepairDraftBundle,
  supplement?: ConsumerRepairPdfSupplement,
): ConsumerRepairPdfSupplement | undefined {
  const session = bundle.canonicalParameterSession;
  if (!session) return supplement;
  const currentRevisionId =
    bundle.estimateDraftRevisionState?.currentRevisionId ?? session.revisionId;
  const parameterLines = session.parameters.map((parameter) => {
    const value = parameter.value == null
      ? "не указано"
      : typeof parameter.value === "boolean"
        ? parameter.value ? "Да" : "Нет"
        : String(parameter.value);
    return [
      `${parameter.label}: ${value}${parameter.unit ? ` ${parameter.unit}` : ""}`,
      `источник ${parameter.source}`,
    ].join("; ");
  });
  const missingQuestions = session.parameters
    .filter((parameter) => parameter.source === "MISSING")
    .map((parameter) => `Уточните параметр «${parameter.label}».`);
  return {
    ...supplement,
    estimateAssumptions: [
      ...(supplement?.estimateAssumptions ?? []),
      `Версия расчёта: ${session.calculationVersion}`,
      `Ревизия расчёта: ${currentRevisionId}`,
      `Статус параметров: ${session.status}`,
      ...parameterLines,
    ],
    clarifyingQuestions: [
      ...(supplement?.clarifyingQuestions ?? []),
      ...missingQuestions,
    ],
    sourceLabels: [
      ...(supplement?.sourceLabels ?? []),
      `Схема параметров: ${session.schemaId} ${session.schemaVersion}`,
      `Отпечаток параметров: ${session.fingerprint}`,
    ],
  };
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

export function getConsumerRepairRequestPdf(input: {
  requestDraftId: string;
  pdfId?: string;
}): ConsumerRepairPdfOpenResult {
  const bundle = ensureConsumerRepairRequestPdfAvailable(input);
  assertConsumerRepairDraftActionAllowed({ currentStatus: bundle.draft.status, action: "open_pdf" });
  const pdf = input.pdfId
    ? bundle.pdfs.find((candidate) => candidate.id === input.pdfId && candidate.pdfStatus === "generated")
    : bundle.pdfs.find((candidate) => candidate.pdfStatus === "generated");
  if (!pdf) throw new Error("Consumer repair request PDF not found.");
  return loadConsumerRepairPdfService().openConsumerRepairRequestPdf({
    requestId: input.requestDraftId,
    pdf,
    ownerUserId: bundle.draft.consumerUserId,
    companyId: bundle.draft.orgId,
    currency: bundle.items.find((item) => item.currency)?.currency ?? "KGS",
  });
}

export function generateConsumerRepairRequestPdfForDraft(input: {
  requestDraftId: string;
  userId?: string;
  supplement?: ConsumerRepairPdfSupplement;
  generatedAt?: string;
}): ConsumerRepairDraftBundle {
  const bundle = getConsumerRepairBundle(input.requestDraftId);
  assertConsumerRepairDraftActionAllowed({ currentStatus: bundle.draft.status, action: "generate_pdf" });
  const userId = input.userId ?? bundle.draft.consumerUserId;
  if (userId !== bundle.draft.consumerUserId) {
    throw new ConsumerRepairValidationError([
      {
        code: "OWNER_MISMATCH",
        messageRu: "PDF доступен только владельцу заявки.",
        field: "userId",
      },
    ]);
  }
  const pdf = loadConsumerRepairPdfService().generateConsumerRepairRequestPdf({
    draft: bundle.draft,
    items: bundle.items,
    media: bundle.media,
    supplement: canonicalParameterPdfSupplement(bundle, input.supplement),
    canonicalPayload: buildConsumerRepairCanonicalDraftPayload(bundle, "pdf_generation"),
    generatedAt: input.generatedAt,
  });
  const bound = bindConsumerRepairEstimateRevisionPdf({
    bundle,
    pdf_id: pdf.id,
    actor_id: userId,
    created_at: pdf.createdAt,
  });
  const revisionPdf = attachConsumerRepairPdfRevisionMetadata(pdf, bound.binding);
  return saveConsumerRepairBundle(withEvent(
    {
      ...bound.bundle,
      pdfs: [revisionPdf, ...bound.bundle.pdfs],
    },
    createConsumerRepairEvent({
      requestDraftId: input.requestDraftId,
      eventType: "consumer_pdf_generated_without_marketplace_send",
      actorType: "consumer",
      actorUserId: userId,
      payload: { pdfId: revisionPdf.id, revisionId: revisionPdf.revisionId, marketplaceSend: false },
    }),
  ));
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
