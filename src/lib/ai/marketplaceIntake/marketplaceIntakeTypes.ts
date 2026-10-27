import type { ConstructionKnowledgeSource } from "../constructionKnowledgeCore";
import type { BuyerSourcingOffer } from "../buyerSourcing";

export const SUPPLIER_CONTRACTOR_MARKETPLACE_INTAKE_WAVE =
  "S_AI_SUPPLIER_CONTRACTOR_MARKETPLACE_INTAKE_POINT_OF_NO_RETURN" as const;

export type MarketplaceIntakeScreenId =
  | "market.home"
  | "supplier.showcase"
  | "buyer.request.detail"
  | "procurement.copilot"
  | "contractor.main"
  | "foreman.subcontract"
  | "documents.main"
  | "agent.documents.knowledge"
  | "marketplace.add_item"
  | "marketplace.add_service"
  | "supplier.offer.create"
  | "contractor.offer.create";

export type MarketplaceActorRole = "supplier" | "contractor" | "buyer" | "foreman" | "documents";

export type MarketplaceOfferDraft = {
  id: string;
  ownerRole: "supplier" | "contractor";
  ownerId: string;
  ownerNameRu?: string;
  offerType: "product" | "service";
  titleRu: string;
  category: string;
  discipline?: string;
  specificationText?: string;
  unit: string;
  price?: number;
  currency?: string;
  priceValidUntil?: string;
  availability: "in_stock" | "limited" | "on_request" | "scheduled" | "unknown";
  quantityAvailable?: number;
  minOrderQty?: number;
  deliveryRegion?: string;
  deliveryDays?: number;
  documents: {
    documentId: string;
    fileName: string;
    documentType:
      | "certificate"
      | "price_list"
      | "specification"
      | "license"
      | "portfolio"
      | "contract"
      | "other";
  }[];
  sourceRefs: string[];
  moderationStatus: "draft" | "needs_data" | "pending_review" | "approved" | "rejected";
  missingData: string[];
  riskFlags: string[];
  published: false;
};

export type MarketplaceLinkedBuyerRequest = {
  requestId: string;
  requestLineId?: string;
  objectRu?: string;
  workRu?: string;
  itemRu: string;
  quantity: number;
  unit: string;
  requiredDate?: string;
  matchKind: "exact" | "analog" | "needs_review";
  sourceRefs: string[];
};

export type MarketplacePermissionSet = {
  canAddMarketplaceProduct: boolean;
  canAddMarketplaceService: boolean;
  canSubmitModeration: boolean;
  canSeeApprovedMarketplaceSources: boolean;
  canSeeOwnPrivateOffers: boolean;
  canSeeOtherSupplierPrivateOffers: boolean;
  directPublishAllowed: false;
  directOrderAllowed: false;
  autoApprovalAllowed: false;
};

export type MarketplaceIntakeContext = {
  screenId: MarketplaceIntakeScreenId;
  role: MarketplaceActorRole;
  actorId: string;
  actorNameRu?: string;
  questionRu?: string;
  selectedOfferId?: string;
  selectedRequestId?: string;
  permissions?: Partial<MarketplacePermissionSet>;
  offerDrafts: MarketplaceOfferDraft[];
  buyerRequests: MarketplaceLinkedBuyerRequest[];
  sources: ConstructionKnowledgeSource[];
  checkedAt: string;
};

export type MarketplaceIntakeIntent =
  | "add_product_draft"
  | "add_service_draft"
  | "check_cards"
  | "show_request_matches"
  | "send_to_moderation"
  | "compare_with_request"
  | "request_rfq_draft"
  | "add_to_shortlist_draft"
  | "show_risks"
  | "contractor_acceptance_blockers"
  | "contractor_response_draft"
  | "marketplace_source_check";

export type MarketplaceIntakeSourceType =
  | "supplier_profile"
  | "contractor_profile"
  | "marketplace_draft"
  | "approved_marketplace_offer"
  | "price_list"
  | "certificate"
  | "license"
  | "portfolio"
  | "specification"
  | "buyer_request"
  | "pdf_chunk"
  | "approval"
  | "work"
  | "document";

export type MarketplaceIntakeIntentContract = {
  intent: MarketplaceIntakeIntent;
  examplesRu: string[];
  requiredContext: "offer_draft" | "approved_offer" | "buyer_request" | "contractor_work" | "none";
  allowedSources: MarketplaceIntakeSourceType[];
  answerMode: "read" | "draft" | "approval_route" | "clarifying";
};

export type MarketplaceIntakeActionQuestion = {
  screenId: MarketplaceIntakeScreenId;
  actionId: MarketplaceIntakeIntent;
  labelRu: string;
  concreteQuestionRu: string;
  allowedRoles: MarketplaceActorRole[];
  requiredContext: MarketplaceIntakeIntentContract["requiredContext"][];
  allowedSources: MarketplaceIntakeSourceType[];
  answerMode: MarketplaceIntakeIntentContract["answerMode"];
};

export type MarketplaceIntakeProviderKey =
  | "aiMarketplaceScreenContextProvider"
  | "aiMarketplaceOfferDraftProvider"
  | "aiMarketplaceProductDraftProvider"
  | "aiMarketplaceServiceDraftProvider"
  | "aiMarketplaceDocumentProvider"
  | "aiMarketplaceModerationProvider"
  | "aiMarketplaceBuyerSourceProvider"
  | "aiMarketplaceRequestMatchProvider"
  | "aiMarketplaceRoleAccessPolicyProvider"
  | "aiMarketplaceSourceSanitizer"
  | "aiMarketplaceAnswerComposer";

export type MarketplaceIntakeProviderDescriptor = {
  key: MarketplaceIntakeProviderKey;
  pure: true;
  usesHooks: false;
  usesUseEffectHack: false;
  dbWrites: false;
  directMutation: false;
  createsFakeData: false;
  ready: boolean;
};

export type MarketplaceDataProviderResult = {
  facts: {
    id: string;
    textRu: string;
    sourceRefs: string[];
    confidence: "high" | "medium" | "low";
  }[];
  sources: ConstructionKnowledgeSource[];
  offers: MarketplaceOfferDraft[];
  buyerSources: BuyerSourcingOffer[];
  missingData: string[];
  permissionLimited: string[];
  exactNoDataReasonRu?: string;
};

export type MarketplaceIntakeAnswer = {
  screenId: MarketplaceIntakeScreenId;
  role: MarketplaceActorRole;
  questionRu: string;
  answerKind:
    | "offer_draft"
    | "service_draft"
    | "moderation_route"
    | "buyer_source_trace"
    | "request_match"
    | "shortlist_draft"
    | "exact_no_data_reason"
    | "permission_limited";
  titleRu: string;
  shortAnswerRu: string;
  answerRu: string;
  draft?: MarketplaceOfferDraft;
  visibleOffers: MarketplaceOfferDraft[];
  buyerSources: BuyerSourcingOffer[];
  matches: MarketplaceLinkedBuyerRequest[];
  missingData: string[];
  nextStepRu: string;
  changedData: false;
  published: false;
  orderCreated: false;
  paymentCreated: false;
  autoApproval: false;
  directPublishPathUsed: false;
  directOrderPathUsed: false;
  approvalBypassUsed: false;
  moderationRequired: true;
  providerTrace: string[];
  sourceTrace: string[];
  genericAnswerUsed: false;
  fakeProductCreated: false;
  fakeServiceCreated: false;
  fakePriceCreated: false;
  fakeAvailabilityCreated: false;
  fakeDocumentCreated: false;
  crossSupplierPrivateLeakFound: false;
};

export type MarketplaceIntakeMatrix = {
  wave: typeof SUPPLIER_CONTRACTOR_MARKETPLACE_INTAKE_WAVE;
  final_status:
    | "GREEN_AI_SUPPLIER_CONTRACTOR_MARKETPLACE_INTAKE_READY"
    | "BLOCKED_ANDROID_TARGETABILITY_MARKETPLACE"
    | "BLOCKED_MARKETPLACE_INTAKE_PIPELINE_NOT_CONNECTED";
  existing_screenMagic_extended_only: true;
  new_hooks_added: false;
  useEffect_hacks_added: false;
  second_ai_framework_created: false;
  db_writes_from_ai_answer_used: false;
  migrations_used: false;
  business_logic_changed: false;
  market_home_ready: boolean;
  supplier_showcase_ready: boolean;
  contractor_main_marketplace_permission_ready: boolean;
  add_product_button_connected: boolean;
  add_service_button_connected: boolean;
  add_product_creates_draft_only: boolean;
  add_service_creates_draft_only: boolean;
  offer_moderation_required: boolean;
  direct_publish_paths_found: number;
  direct_order_paths_found: number;
  marketplace_offer_has_owner: boolean;
  marketplace_offer_has_source_trace: boolean;
  marketplace_offer_missing_data_visible: boolean;
  approved_offer_becomes_buyer_source: boolean;
  draft_offer_not_visible_as_approved: boolean;
  fake_products_created: false;
  fake_services_created: false;
  fake_prices_created: false;
  fake_availability_created: false;
  fake_documents_created: false;
  fake_certificates_created: false;
  contractor_without_permission_add_actions_visible: false;
  cross_supplier_private_leaks_found: number;
  security_runtime_leak_found: false;
  raw_secrets_visible: false;
  web_all_visible_buttons_clicked: boolean;
  android_buttons_targetable: boolean;
  generic_answers_found: number;
  technical_copy_visible_to_user: false;
  release_verify_passed: boolean;
  fake_green_claimed: false;
};
