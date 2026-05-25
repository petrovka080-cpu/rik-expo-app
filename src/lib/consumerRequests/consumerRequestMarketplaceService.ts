import { auditConsumerRepairRequestEvent } from "./consumerRequestAuditTrail";
import { assertConsumerRepairDraftActionAllowed } from "./consumerRequestDraftStateMachine";
import { getConsumerRepairBundle, saveConsumerRepairBundle } from "./consumerRequestRepository";
import { validateConsumerRepairRequestForMarketplace } from "./consumerRequestValidationService";
import type {
  ConsumerMarketplaceLink,
  ConsumerRequestValidationErrorItem,
  ConsumerRepairDraftBundle,
} from "./consumerRequestTypes";

const id = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

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

export function sendConsumerRepairRequestToMarketplace(input: {
  requestDraftId: string;
  userId: string;
  idempotencyKey?: string | null;
}): ConsumerRepairDraftBundle {
  const validation = validateConsumerRepairRequestForMarketplace(input.requestDraftId, input.userId);
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
  if (alreadySent) {
    assertConsumerRepairDraftActionAllowed({ currentStatus: bundle.draft.status, action: "idempotent_marketplace_replay" });
    return saveConsumerRepairBundle({
      ...bundle,
      events: [
        ...bundle.events,
        auditConsumerRepairRequestEvent({
          requestId: input.requestDraftId,
          actorUserId: input.userId,
          eventType: "marketplace_send_idempotent_replay",
          payload: {
            marketplaceDemandId: bundle.marketplaceLink.marketplaceDemandId,
            idempotencyKey: input.idempotencyKey ?? bundle.marketplaceLink.idempotencyKey ?? null,
          },
        }),
      ],
    });
  }

  assertConsumerRepairDraftActionAllowed({ currentStatus: bundle.draft.status, action: "send_to_marketplace" });
  const marketplaceLink: ConsumerMarketplaceLink = {
    ...bundle.marketplaceLink,
    marketplaceDemandId: id("marketplace_demand"),
    status: "sent",
    idempotencyKey: input.idempotencyKey ?? `consumer_marketplace:${input.requestDraftId}`,
    sentAt: now,
  };

  return saveConsumerRepairBundle({
    ...bundle,
    draft: {
      ...bundle.draft,
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
        },
      }),
    ],
  });
}
