import { getMarketplaceActionQuestion, MARKETPLACE_INTAKE_ACTION_QUESTION_MAP } from "./marketplaceIntakeActionQuestionMap";
import { composeMarketplaceIntakeAnswer } from "./marketplaceIntakeAnswerComposer";
import { MARKETPLACE_INTAKE_DATA_PROVIDER_FUNCTIONS } from "./marketplaceIntakeDataProviders";
import { routeMarketplaceIntakeIntent } from "./marketplaceIntakeIntentRouter";
import { canUseMarketplaceAction, resolveMarketplacePermissions } from "./marketplaceIntakeRolePolicy";
import { hasCrossSupplierPrivateLeak, sanitizeMarketplaceIntakeContext } from "./marketplaceIntakeSourceSanitizer";
import type {
  MarketplaceIntakeAnswer,
  MarketplaceIntakeContext,
  MarketplaceIntakeIntent,
  MarketplaceIntakeProviderKey,
} from "./marketplaceIntakeTypes";

function providerKeysForIntent(intent: MarketplaceIntakeIntent): MarketplaceIntakeProviderKey[] {
  const always: MarketplaceIntakeProviderKey[] = [
    "aiMarketplaceSourceSanitizer",
    "aiMarketplaceScreenContextProvider",
    "aiMarketplaceOfferDraftProvider",
    "aiMarketplaceDocumentProvider",
    "aiMarketplaceModerationProvider",
    "aiMarketplaceRoleAccessPolicyProvider",
    "aiMarketplaceAnswerComposer",
  ];
  const byIntent: Partial<Record<MarketplaceIntakeIntent, MarketplaceIntakeProviderKey[]>> = {
    add_product_draft: ["aiMarketplaceProductDraftProvider", "aiMarketplaceRequestMatchProvider"],
    add_service_draft: ["aiMarketplaceServiceDraftProvider", "aiMarketplaceRequestMatchProvider"],
    check_cards: ["aiMarketplaceProductDraftProvider", "aiMarketplaceServiceDraftProvider"],
    show_request_matches: ["aiMarketplaceBuyerSourceProvider", "aiMarketplaceRequestMatchProvider"],
    send_to_moderation: ["aiMarketplaceModerationProvider"],
    compare_with_request: ["aiMarketplaceBuyerSourceProvider", "aiMarketplaceRequestMatchProvider"],
    request_rfq_draft: ["aiMarketplaceBuyerSourceProvider", "aiMarketplaceRequestMatchProvider"],
    add_to_shortlist_draft: ["aiMarketplaceBuyerSourceProvider", "aiMarketplaceRequestMatchProvider"],
    show_risks: ["aiMarketplaceProductDraftProvider", "aiMarketplaceServiceDraftProvider"],
    marketplace_source_check: ["aiMarketplaceBuyerSourceProvider", "aiMarketplaceRequestMatchProvider"],
  };
  return [...new Set([...always, ...(byIntent[intent] ?? [])])];
}

export function answerMarketplaceIntakeQuestion(params: {
  context: MarketplaceIntakeContext;
  questionRu: string;
  actionId?: MarketplaceIntakeIntent;
}): MarketplaceIntakeAnswer {
  const sanitizedContext = sanitizeMarketplaceIntakeContext(params.context);
  const action = params.actionId ? getMarketplaceActionQuestion(params.actionId, sanitizedContext.screenId) : undefined;
  const questionRu = action?.concreteQuestionRu ?? params.questionRu;
  const intent = action?.actionId ?? routeMarketplaceIntakeIntent(questionRu).intent;
  const providers = providerKeysForIntent(intent);
  const providerResults = providers.map((key) => MARKETPLACE_INTAKE_DATA_PROVIDER_FUNCTIONS[key](sanitizedContext));
  const permissions = resolveMarketplacePermissions(sanitizedContext);
  const permissionLimited = Boolean(action && !canUseMarketplaceAction(sanitizedContext, action));
  const missingData = [
    ...providerResults.flatMap((result) => result.missingData),
    ...providerResults.flatMap((result) => result.permissionLimited),
    ...(hasCrossSupplierPrivateLeak(sanitizedContext) ? ["найдена попытка доступа к private offer другого поставщика"] : []),
  ];
  return composeMarketplaceIntakeAnswer({
    context: sanitizedContext,
    intent,
    questionRu,
    permissionLimited,
    missingData: [...new Set(missingData)],
    providerTrace: [
      "marketplaceIntakePipeline",
      `role:${sanitizedContext.role}`,
      `direct_publish:${permissions.directPublishAllowed}`,
      `direct_order:${permissions.directOrderAllowed}`,
      ...providers,
    ],
  });
}

export function answerMarketplaceIntakeAction(params: {
  context: MarketplaceIntakeContext;
  actionId: MarketplaceIntakeIntent;
}): MarketplaceIntakeAnswer {
  const action = getMarketplaceActionQuestion(params.actionId, params.context.screenId);
  return answerMarketplaceIntakeQuestion({
    context: params.context,
    actionId: params.actionId,
    questionRu: action?.concreteQuestionRu ?? params.actionId,
  });
}

export function buildMarketplaceIntakeAiBlockViewModel(context: MarketplaceIntakeContext): {
  titleRu: string;
  newOffersCount: number;
  pendingModerationCount: number;
  missingDocumentsCount: number;
  missingPriceCount: number;
  missingAvailabilityCount: number;
  requestMatchesCount: number;
  inputPlaceholderRu: string;
  visibleActionLabelsRu: string[];
  hiddenActionLabelsRu: string[];
} {
  const safeContext = sanitizeMarketplaceIntakeContext(context);
  const availableActions = MARKETPLACE_INTAKE_ACTION_QUESTION_MAP.filter((action) =>
    action.screenId === safeContext.screenId && canUseMarketplaceAction(safeContext, action),
  );
  const visibleOffers = safeContext.offerDrafts;
  return {
    titleRu: "Готово от AI",
    newOffersCount: visibleOffers.filter((offer) => offer.moderationStatus === "draft").length,
    pendingModerationCount: visibleOffers.filter((offer) => offer.moderationStatus === "pending_review").length,
    missingDocumentsCount: visibleOffers.filter((offer) => offer.documents.length === 0).length,
    missingPriceCount: visibleOffers.filter((offer) => typeof offer.price !== "number").length,
    missingAvailabilityCount: visibleOffers.filter((offer) => offer.availability === "unknown").length,
    requestMatchesCount: safeContext.buyerRequests.length,
    inputPlaceholderRu: "Спросить по товару, услуге, документам, модерации...",
    visibleActionLabelsRu: availableActions.slice(0, 5).map((action) => action.labelRu),
    hiddenActionLabelsRu: availableActions.slice(5).map((action) => action.labelRu),
  };
}

export const marketplaceIntakePipeline = answerMarketplaceIntakeQuestion;
