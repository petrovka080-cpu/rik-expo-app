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
  updateConsumerRepairRequestItemQuantity as updateItemQuantityRecord,
} from "./consumerRequestItemService";
import { createConsumerMarketplaceLink, ConsumerRepairValidationError } from "./consumerRequestMarketplaceService";
import { generateConsumerRepairRequestPdf, openConsumerRepairRequestPdf } from "./consumerRequestPdfService";
import type { ProjectExecutionDraft } from "../projectExecution";
import {
  cloneConsumerRepairValue,
  deleteConsumerRepairBundle,
  getConsumerRepairBundle,
  listConsumerRepairBundlesForUser,
  resetConsumerRepairRequestStoreForTests,
  saveConsumerRepairBundle,
  type ConsumerRepairHistoryPageOptions,
} from "./consumerRequestRepository";
import { __resetConsumerRepairPdfStorageForTests, consumerRepairPdfStorageObjectExists } from "./consumerRequestPdfStorage";
import { validateConsumerRepairRequestForApprove } from "./consumerRequestValidationService";
import type { CatalogItemForEstimate } from "../catalog/catalogItemTypes";
import type {
  ConsumerRepairAiDraft,
  ConsumerRepairDraftBundle,
  ConsumerRepairPdfSupplement,
  ConsumerRepairCatalogCandidate,
  ConsumerRepairSelectedWork,
  ConsumerRepairRequestEvent,
  ConsumerRepairRequestItem,
  ConsumerRepairRequestMedia,
  ConsumerRepairPdfOpenResult,
} from "./consumerRequestTypes";

const id = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

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
}): ConsumerRepairDraftBundle {
  assertConsumerRepairScope(CONSUMER_REPAIR_CONTEXT);
  assertConsumerRepairDraftActionAllowed({ currentStatus: "none", action: "create_draft" });
  const selectedWork = input.selectedWork ?? input.aiDraft?.selectedWork ?? null;
  const draft = createDraftRecord({ ...input, selectedWork });
  const items = (input.aiDraft?.items ?? []).map((item) =>
    createConsumerRepairRequestItem({
      requestDraftId: draft.id,
      ...item,
    }),
  );
  const marketplaceLink = createConsumerMarketplaceLink(draft.id);
  const bundle: ConsumerRepairDraftBundle = {
    draft,
    items,
    media: [],
    pdfs: [],
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
  };
  return saveConsumerRepairBundle(bundle);
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
  patch: Parameters<typeof updateDraftRecord>[1];
}): ConsumerRepairDraftBundle {
  const bundle = getConsumerRepairBundle(input.requestDraftId);
  assertConsumerRepairDraftActionAllowed({ currentStatus: bundle.draft.status, action: "update_draft_fields" });
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
    confidence: input.confidence,
    addedBy: input.addedBy,
  });
  return saveConsumerRepairBundle(withEvent(
    { ...bundle, items: [...bundle.items, item] },
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
  return saveConsumerRepairBundle(withEvent(
    { ...bundle, items },
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

export function updateConsumerRepairRequestItemQuantity(input: {
  requestDraftId: string;
  itemId: string;
  quantity: number;
}): ConsumerRepairDraftBundle {
  const bundle = getConsumerRepairBundle(input.requestDraftId);
  assertConsumerRepairDraftActionAllowed({ currentStatus: bundle.draft.status, action: "update_item_quantity" });
  const items = bundle.items.map((item) =>
    item.id === input.itemId ? updateItemQuantityRecord(item, input.quantity) : item,
  );
  return saveConsumerRepairBundle(withEvent(
    { ...bundle, items },
    createConsumerRepairEvent({ requestDraftId: input.requestDraftId, eventType: "item_quantity_updated", actorType: "consumer" }),
  ));
}

export function removeConsumerRepairRequestItem(input: {
  requestDraftId: string;
  itemId: string;
}): ConsumerRepairDraftBundle {
  const bundle = getConsumerRepairBundle(input.requestDraftId);
  assertConsumerRepairDraftActionAllowed({ currentStatus: bundle.draft.status, action: "remove_item" });
  return saveConsumerRepairBundle(withEvent(
    { ...bundle, items: bundle.items.filter((item) => item.id !== input.itemId) },
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
  const pdf = generateConsumerRepairRequestPdf({ draft, items: bundle.items, media: bundle.media, generatedAt: input.generatedAt });
  return saveConsumerRepairBundle(withEvent(
    {
      ...bundle,
      draft,
      pdfs: [pdf, ...bundle.pdfs],
    },
    createConsumerRepairEvent({
      requestDraftId: input.requestDraftId,
      eventType: "consumer_approved_pdf_generated",
      actorType: "consumer",
      payload: { pdfId: pdf.id },
    }),
  ));
}

export function listConsumerRepairRequestHistory(
  consumerUserId: string,
  options: ConsumerRepairHistoryPageOptions = {},
): ConsumerRepairDraftBundle[] {
  return listConsumerRepairBundlesForUser(consumerUserId, { ...options, limit: options.limit ?? 20 });
}

export function getConsumerRepairRequest(requestDraftId: string): ConsumerRepairDraftBundle {
  return getConsumerRepairBundle(requestDraftId);
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
  const bundle = getConsumerRepairBundle(input.requestDraftId);
  assertConsumerRepairDraftActionAllowed({ currentStatus: bundle.draft.status, action: "open_pdf" });
  const pdf = input.pdfId
    ? bundle.pdfs.find((candidate) => candidate.id === input.pdfId && candidate.pdfStatus === "generated")
    : bundle.pdfs.find((candidate) => candidate.pdfStatus === "generated");
  if (!pdf) throw new Error("Consumer repair request PDF not found.");
  return openConsumerRepairRequestPdf({ requestId: input.requestDraftId, pdf });
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
  const pdf = generateConsumerRepairRequestPdf({
    draft: bundle.draft,
    items: bundle.items,
    media: bundle.media,
    supplement: input.supplement,
    generatedAt: input.generatedAt,
  });
  return saveConsumerRepairBundle(withEvent(
    {
      ...bundle,
      pdfs: [pdf, ...bundle.pdfs],
    },
    createConsumerRepairEvent({
      requestDraftId: input.requestDraftId,
      eventType: "consumer_pdf_generated_without_marketplace_send",
      actorType: "consumer",
      actorUserId: userId,
      payload: { pdfId: pdf.id, marketplaceSend: false },
    }),
  ));
}

export function __resetConsumerRepairRequestStoreForTests(): void {
  resetConsumerRepairRequestStoreForTests();
  __resetConsumerRepairPdfStorageForTests();
}

export type { ConsumerRepairHistoryPageOptions };
