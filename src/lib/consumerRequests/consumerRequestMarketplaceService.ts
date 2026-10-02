import { auditConsumerRepairRequestEvent } from "./consumerRequestAuditTrail";
import { assertConsumerRepairDraftActionAllowed } from "./consumerRequestDraftStateMachine";
import { bindConsumerRepairEstimateRevisionRequest } from "./consumerRequestEditableEstimateSnapshot";
import { getConsumerRepairBundle, saveConsumerRepairBundle } from "./consumerRequestRepository";
import { validateConsumerRepairRequestForMarketplace } from "./consumerRequestValidationService";
import { recordEstimateTelemetryEvent } from "../../features/estimates/telemetry/estimateTelemetryRecorder";
import {
  consumerEstimateMarketplaceTransport,
  type ConsumerEstimateMarketplaceListingRow,
  type ConsumerEstimateMarketplaceTransport,
} from "./consumerRequestMarketplace.transport";
import type {
  ConsumerMarketplaceLink,
  ConsumerRequestValidationErrorItem,
  ConsumerRepairDraftBundle,
} from "./consumerRequestTypes";
import type { Json } from "../database.types";

const id = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

type ConsumerMarketplaceCanonicalArtifact = {
  artifactId: string;
  kind: "procurement";
  revisionId: string;
  releaseId: string;
  status: "ready";
  sha256: string | null;
  revisionChecksumSha256: string;
};

export class ConsumerRepairValidationError extends Error {
  readonly statusCode = 422;
  readonly errors: ConsumerRequestValidationErrorItem[];

  constructor(errors: ConsumerRequestValidationErrorItem[]) {
    super(errors.map((error) => error.messageRu).join("\n") || "Consumer repair request validation failed.");
    this.name = "ConsumerRepairValidationError";
    this.errors = errors;
  }
}

export function createConsumerMarketplaceLink(requestDraftId: string): ConsumerMarketplaceLink {
  return {
    id: id("consumer_market_link"),
    requestDraftId,
    marketplaceDemandId: null,
    status: "not_sent",
    idempotencyKey: null,
    createdAt: new Date().toISOString(),
    sentAt: null,
  };
}

function marketplaceKind(category: string, itemType: string): string {
  const normalized = category.trim().toLocaleLowerCase("en-US");
  if (normalized === "material") return "material";
  if (["work", "construction_work", "labor"].includes(normalized)) return "work";
  if (["transport", "delivery"].includes(normalized)) return "delivery";
  if (["equipment", "rent"].includes(normalized)) return "rent";
  if (["service", "document", "other"].includes(normalized)) return "service";
  if (itemType === "material") return "material";
  if (itemType === "work") return "work";
  return "service";
}

export function canonicalConsumerRepairMarketplaceProjection(
  bundle: ConsumerRepairDraftBundle,
  artifact: ConsumerMarketplaceCanonicalArtifact,
): { canonicalCatalogId: string; title: string; items: Json[] } {
  const estimateItems = bundle.items.filter((item) =>
    item.sourceParameters?.canonicalPreliminaryNeed !== true
  );
  const rows = estimateItems.map((item): Json => {
    const source = item.sourceParameters ?? {};
    const rowId = String(source.rowCode ?? source.canonicalBackendRowId ?? "").trim();
    const revisionId = String(source.canonicalBackendRevisionId ?? "").trim();
    const releaseId = String(source.canonicalBackendReleaseId ?? "").trim();
    const rowSha256 = String(source.rowSha256 ?? "").trim();
    const smartProjection = source.smartEstimateProjectionV2;
    const canonicalSourceCategory = smartProjection
      && typeof smartProjection === "object"
      && !Array.isArray(smartProjection)
      ? String((smartProjection as Record<string, Json>).sourceCategory ?? "").trim()
      : "";
    const category = String(
      canonicalSourceCategory || source.category || source.rowKind || item.category || item.itemType,
    ).trim();
    const quantity = Number(item.quantity);
    if (
      !rowId ||
      revisionId !== artifact.revisionId ||
      releaseId !== artifact.releaseId ||
      !/^[0-9a-f]{64}$/u.test(rowSha256) ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !String(item.unit ?? "").trim()
    ) {
      throw new Error("CONSUMER_MARKETPLACE_CANONICAL_ROW_PROJECTION_INCOMPLETE");
    }
    const includedInProcurement = source.includedInProcurement === true;
    return {
      rik_code: rowId,
      name: item.titleRu,
      uom: String(item.unit),
      qty: quantity,
      price: item.unitPrice == null ? null : Number(item.unitPrice),
      kind: marketplaceKind(category, item.itemType),
      section: String(source.section ?? category),
      canonical_category: category,
      included_in_estimate: source.includedInEstimate !== false,
      included_in_procurement: includedInProcurement,
      procurement_eligible: source.procurementEligible === true || includedInProcurement,
      canonical_row_sha256: rowSha256,
      canonical_revision_id: artifact.revisionId,
      canonical_release_id: artifact.releaseId,
      canonical_artifact_id: artifact.artifactId,
    };
  });
  if (rows.length !== estimateItems.length || new Set(rows.map((row) =>
    String((row as Record<string, Json>).rik_code)
  )).size !== rows.length) {
    throw new Error("CONSUMER_MARKETPLACE_CANONICAL_ROW_PROJECTION_NOT_UNIQUE");
  }
  const catalogIds = new Set(estimateItems.map((item) =>
    String(item.sourceParameters?.canonicalBackendCatalogId ?? "").trim()
  ));
  catalogIds.delete("");
  if (catalogIds.size !== 1 || rows.length < 1) {
    throw new Error("CONSUMER_MARKETPLACE_CANONICAL_CATALOG_PROJECTION_INCOMPLETE");
  }
  return {
    canonicalCatalogId: [...catalogIds][0],
    title: String(
      bundle.draft.selectedWorkTitleRu ?? bundle.draft.title ?? bundle.draft.aiSummaryRu ?? "Смета",
    ).trim(),
    items: rows,
  };
}

function assertPublishedListingIdentity(input: {
  listing: ConsumerEstimateMarketplaceListingRow;
  userId: string;
  idempotencyKey: string;
  revisionId: string;
  releaseId: string;
  artifactId: string;
}): void {
  const { listing } = input;
  if (
    listing.user_id !== input.userId ||
    !["active", "published", "draft"].includes(listing.status) ||
    listing.client_mutation_id !== input.idempotencyKey
  ) {
    throw new Error("CONSUMER_MARKETPLACE_LISTING_READBACK_IDENTITY_MISMATCH");
  }
  if (!Array.isArray(listing.items_json) || listing.items_json.length < 1) {
    throw new Error("CONSUMER_MARKETPLACE_LISTING_ITEMS_MISSING");
  }
  const exactLineage = listing.items_json.every((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const row = item as Record<string, unknown>;
    return row.canonical_revision_id === input.revisionId &&
      row.canonical_release_id === input.releaseId &&
      row.canonical_artifact_id === input.artifactId &&
      typeof row.name === "string" && row.name.trim().length > 0 &&
      typeof row.qty === "number" && Number.isFinite(row.qty) && row.qty > 0;
  });
  if (!exactLineage) {
    throw new Error("CONSUMER_MARKETPLACE_LISTING_LINEAGE_MISMATCH");
  }
}

export async function sendConsumerRepairRequestToMarketplace(input: {
  requestDraftId: string;
  userId: string;
  idempotencyKey?: string | null;
  canonicalArtifact?: ConsumerMarketplaceCanonicalArtifact | null;
  transport?: ConsumerEstimateMarketplaceTransport;
}): Promise<ConsumerRepairDraftBundle> {
  const validation = validateConsumerRepairRequestForMarketplace(
    input.requestDraftId,
    input.userId,
    input.canonicalArtifact,
  );
  let bundle = getConsumerRepairBundle(input.requestDraftId);
  const now = new Date().toISOString();

  if (!validation.ok) {
    bundle = saveConsumerRepairBundle({
      ...bundle,
      draft: {
        ...bundle.draft,
        lastMarketplaceSubmitAttemptAt: now,
        marketplaceValidationErrors: validation.errors,
        updatedAt: now,
      },
      events: [
        ...bundle.events,
        auditConsumerRepairRequestEvent({
          requestId: input.requestDraftId,
          actorUserId: input.userId,
          eventType: "marketplace_send_blocked",
          payload: { errors: validation.errors },
        }),
      ],
    });
    throw new ConsumerRepairValidationError(validation.errors);
  }

  const alreadySent = bundle.marketplaceLink.status === "sent" && Boolean(bundle.marketplaceLink.marketplaceDemandId);
  const action = alreadySent ? "idempotent_marketplace_replay" : "send_to_marketplace";
  assertConsumerRepairDraftActionAllowed({ currentStatus: bundle.draft.status, action });
  const artifact = input.canonicalArtifact;
  if (!artifact || typeof artifact.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(artifact.sha256) ||
      !/^[0-9a-f]{64}$/.test(artifact.revisionChecksumSha256)) {
    throw new Error("CONSUMER_MARKETPLACE_CANONICAL_IDENTITY_INCOMPLETE");
  }
  const idempotencyKey = input.idempotencyKey ??
    bundle.marketplaceLink.idempotencyKey ??
    `consumer-marketplace:${input.requestDraftId}`;
  const transport = input.transport ?? consumerEstimateMarketplaceTransport;
  const projection = canonicalConsumerRepairMarketplaceProjection(bundle, artifact);
  const description = [
    bundle.draft.problemText,
    bundle.draft.aiSummaryRu,
    bundle.draft.selectedWorkTitleRu,
  ].map((value) => String(value ?? "").trim()).filter(Boolean).join(". ");
  let receipt: Awaited<ReturnType<ConsumerEstimateMarketplaceTransport["publish"]>>;
  let remoteStage: "publish" | "readback" = "publish";
  try {
    receipt = await transport.publish({
      localRequestId: input.requestDraftId,
      revisionId: artifact.revisionId,
      releaseId: artifact.releaseId,
      artifactId: artifact.artifactId,
      idempotencyKey,
      expectedRevisionChecksumSha256: artifact.revisionChecksumSha256,
      expectedArtifactSha256: artifact.sha256,
      canonicalCatalogId: projection.canonicalCatalogId,
      title: projection.title,
      description,
      city: String(bundle.draft.city ?? "").trim(),
      addressText: String(bundle.draft.addressText ?? "").trim(),
      contactPhone: String(bundle.draft.contactPhone ?? "").trim(),
      expectedRowCount: projection.items.length,
      items: projection.items,
    });
    if (
      !receipt.listing_id ||
      !["active", "published", "draft"].includes(receipt.server_status) ||
      receipt.revision_id !== artifact.revisionId ||
      receipt.release_id !== artifact.releaseId ||
      receipt.artifact_id !== artifact.artifactId
    ) {
      throw new Error("CONSUMER_MARKETPLACE_PUBLISH_RECEIPT_IDENTITY_MISMATCH");
    }
    remoteStage = "readback";
    const publishedListing = await transport.readPublishedListing(receipt.listing_id);
    assertPublishedListingIdentity({
      listing: publishedListing,
      userId: input.userId,
      idempotencyKey,
      revisionId: artifact.revisionId,
      releaseId: artifact.releaseId,
      artifactId: artifact.artifactId,
    });
  } catch (error) {
    const failedAt = new Date().toISOString();
    saveConsumerRepairBundle({
      ...bundle,
      draft: {
        ...bundle.draft,
        lastMarketplaceSubmitAttemptAt: failedAt,
        updatedAt: failedAt,
      },
      events: [
        ...bundle.events,
        auditConsumerRepairRequestEvent({
          requestId: input.requestDraftId,
          actorUserId: input.userId,
          eventType: "marketplace_send_failed",
          payload: {
            stage: remoteStage,
            idempotencyKey,
            canonicalRevisionId: artifact.revisionId,
            procurementArtifactId: artifact.artifactId,
            errorCode: error instanceof Error ? error.name : "UNKNOWN_ERROR",
          },
        }),
      ],
    });
    throw error;
  }

  if (alreadySent) {
    if (bundle.marketplaceLink.marketplaceDemandId !== receipt.listing_id) {
      throw new Error("CONSUMER_MARKETPLACE_IDEMPOTENT_LISTING_MISMATCH");
    }
    return saveConsumerRepairBundle({
      ...bundle,
      events: [
        ...bundle.events,
        auditConsumerRepairRequestEvent({
          requestId: input.requestDraftId,
          actorUserId: input.userId,
          eventType: "marketplace_send_idempotent_replay",
          payload: {
            marketplaceDemandId: receipt.listing_id,
            idempotencyKey,
          },
        }),
      ],
    });
  }

  const marketplaceLink: ConsumerMarketplaceLink = {
    ...bundle.marketplaceLink,
    marketplaceDemandId: receipt.listing_id,
    status: "sent",
    idempotencyKey,
    sentAt: now,
  };
  const marketplaceDemandId = marketplaceLink.marketplaceDemandId;
  if (!marketplaceDemandId) {
    throw new Error("CONSUMER_REPAIR_MARKETPLACE_DEMAND_ID_MISSING");
  }
  const canonicalRevisionId = String(bundle.items[0]?.sourceParameters?.canonicalBackendRevisionId ?? "").trim();
  const canonicalReleaseId = String(bundle.items[0]?.sourceParameters?.canonicalBackendReleaseId ?? "").trim();
  const revisionBound = canonicalRevisionId && canonicalReleaseId
    ? bundle
    : bindConsumerRepairEstimateRevisionRequest({
      bundle,
      request_payload_id: marketplaceDemandId,
      actor_id: input.userId,
      created_at: now,
    });
  recordEstimateTelemetryEvent({
    event_name: "marketplace_handoff_created",
    route: "marketplace",
    platform: "unknown",
    request_id: input.requestDraftId,
    estimate_id: bundle.draft.repairType,
    payload: {
      marketplace_demand_id: marketplaceDemandId,
      item_count: bundle.items.length,
      idempotency_key_present: Boolean(input.idempotencyKey),
      canonical_revision_id: canonicalRevisionId || null,
      canonical_release_id: canonicalReleaseId || null,
      procurement_artifact_id: artifact.artifactId,
    },
  });

  return saveConsumerRepairBundle({
    ...revisionBound,
    draft: {
      ...revisionBound.draft,
      status: "sent_to_marketplace",
      marketplaceReadyAt: now,
      marketplaceValidationErrors: [],
      lastMarketplaceSubmitAttemptAt: now,
      updatedAt: now,
    },
    marketplaceLink,
    events: [
      ...bundle.events,
      auditConsumerRepairRequestEvent({
        requestId: input.requestDraftId,
        actorUserId: input.userId,
        eventType: "sent_to_marketplace",
        payload: {
          marketplaceDemandId: marketplaceLink.marketplaceDemandId,
          idempotencyKey: marketplaceLink.idempotencyKey,
          canonicalRevisionId: canonicalRevisionId || null,
          canonicalReleaseId: canonicalReleaseId || null,
          procurementArtifactId: artifact.artifactId,
          procurementArtifactKind: artifact.kind,
          procurementArtifactSha256: artifact.sha256,
          canonicalRevisionChecksumSha256: artifact.revisionChecksumSha256,
          serverCreated: receipt.created,
        },
      }),
    ],
  });
}
