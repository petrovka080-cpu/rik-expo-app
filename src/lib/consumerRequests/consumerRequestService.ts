import { CONSUMER_REPAIR_CONTEXT, assertConsumerRepairScope } from "./consumerRequestAccessPolicy";
import { createConsumerRepairEvent } from "./consumerRequestAuditTrail";
import {
  approveConsumerRepairRequestDraft as approveDraftRecord,
  createConsumerRepairRequestDraft as createDraftRecord,
  updateConsumerRepairRequestDraft as updateDraftRecord,
} from "./consumerRequestDraftService";
import {
  createConsumerRepairRequestItem,
  updateConsumerRepairRequestItemQuantity as updateItemQuantityRecord,
} from "./consumerRequestItemService";
import { createConsumerMarketplaceLink, ConsumerRepairValidationError } from "./consumerRequestMarketplaceService";
import { generateConsumerRepairRequestPdf, openConsumerRepairRequestPdf } from "./consumerRequestPdfService";
import {
  cloneConsumerRepairValue,
  getConsumerRepairBundle,
  listConsumerRepairBundlesForUser,
  resetConsumerRepairRequestStoreForTests,
  saveConsumerRepairBundle,
  type ConsumerRepairHistoryPageOptions,
} from "./consumerRequestRepository";
import { __resetConsumerRepairPdfStorageForTests, consumerRepairPdfStorageObjectExists } from "./consumerRequestPdfStorage";
import { validateConsumerRepairRequestForApprove } from "./consumerRequestValidationService";
import type {
  ConsumerRepairAiDraft,
  ConsumerRepairDraftBundle,
  ConsumerRepairPdfSupplement,
  ConsumerRepairRequestEvent,
  ConsumerRepairRequestItem,
  ConsumerRepairRequestMedia,
  ConsumerRepairPdfOpenResult,
} from "./consumerRequestTypes";

const id = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

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
  aiDraft?: ConsumerRepairAiDraft | null;
}): ConsumerRepairDraftBundle {
  assertConsumerRepairScope(CONSUMER_REPAIR_CONTEXT);
  const draft = createDraftRecord(input);
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
    marketplaceLink,
    events: [
      createConsumerRepairEvent({
        requestDraftId: draft.id,
        eventType: "draft_created",
        actorType: "consumer",
        payload: { consumer_only: true },
      }),
    ],
  };
  return saveConsumerRepairBundle(bundle);
}

export function updateConsumerRepairRequestDraft(input: {
  requestDraftId: string;
  patch: Parameters<typeof updateDraftRecord>[1];
}): ConsumerRepairDraftBundle {
  const bundle = getConsumerRepairBundle(input.requestDraftId);
  const next = withEvent(
    {
      ...bundle,
      draft: updateDraftRecord(bundle.draft, input.patch),
    },
    createConsumerRepairEvent({
      requestDraftId: input.requestDraftId,
      eventType: "draft_updated",
      actorType: "consumer",
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
}): ConsumerRepairDraftBundle {
  const bundle = getConsumerRepairBundle(input.requestDraftId);
  const item = createConsumerRepairRequestItem({
    requestDraftId: input.requestDraftId,
    itemType: input.itemType ?? "other",
    titleRu: input.titleRu,
    quantity: input.quantity ?? 1,
    unit: input.unit ?? "шт",
    source: "user_added",
  });
  return saveConsumerRepairBundle(withEvent(
    { ...bundle, items: [...bundle.items, item] },
    createConsumerRepairEvent({ requestDraftId: input.requestDraftId, eventType: "item_added", actorType: "consumer" }),
  ));
}

export function updateConsumerRepairRequestItemQuantity(input: {
  requestDraftId: string;
  itemId: string;
  quantity: number;
}): ConsumerRepairDraftBundle {
  const bundle = getConsumerRepairBundle(input.requestDraftId);
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

  const draft = approveDraftRecord(bundle.draft);
  const pdf = generateConsumerRepairRequestPdf({ draft, items: bundle.items, media: bundle.media });
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

export function getConsumerRepairRequestPdf(input: {
  requestDraftId: string;
  pdfId?: string;
}): ConsumerRepairPdfOpenResult {
  const bundle = getConsumerRepairBundle(input.requestDraftId);
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
}): ConsumerRepairDraftBundle {
  const bundle = getConsumerRepairBundle(input.requestDraftId);
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
