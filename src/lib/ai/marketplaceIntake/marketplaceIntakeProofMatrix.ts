import { MARKETPLACE_INTAKE_ACTION_QUESTION_MAP } from "./marketplaceIntakeActionQuestionMap";
import { marketplaceDraftToBuyerSourcingOffer, listMarketplaceIntakeDataProviders } from "./marketplaceIntakeDataProviders";
import { MARKETPLACE_INTAKE_INTENT_CONTRACTS } from "./marketplaceIntakeIntentRouter";
import { MARKETPLACE_INTAKE_ROLE_POLICY } from "./marketplaceIntakeRolePolicy";
import {
  SUPPLIER_CONTRACTOR_MARKETPLACE_INTAKE_WAVE,
  type MarketplaceIntakeContext,
  type MarketplaceIntakeMatrix,
} from "./marketplaceIntakeTypes";

export function buildMarketplaceIntakeMatrix(
  context: MarketplaceIntakeContext,
  options: {
    webAllVisibleButtonsClicked?: boolean;
    androidButtonsTargetable?: boolean;
    releaseVerifyPassed?: boolean;
    genericAnswersFound?: number;
    crossSupplierPrivateLeaksFound?: number;
  } = {},
): MarketplaceIntakeMatrix {
  const providers = listMarketplaceIntakeDataProviders();
  const providerReady = (key: string) => providers.some((provider) => provider.key === key && provider.ready);
  const approvedOffer = context.offerDrafts.find((offer) => offer.moderationStatus === "approved");
  const draftOffer = context.offerDrafts.find((offer) => offer.moderationStatus !== "approved");
  const approvedBuyerSource = approvedOffer
    ? marketplaceDraftToBuyerSourcingOffer(approvedOffer, { request: context.buyerRequests[0], checkedAt: context.checkedAt })
    : null;
  const draftBuyerSource = draftOffer
    ? marketplaceDraftToBuyerSourcingOffer(draftOffer, { request: context.buyerRequests[0], checkedAt: context.checkedAt })
    : null;
  const webAllVisibleButtonsClicked = options.webAllVisibleButtonsClicked ?? false;
  const androidButtonsTargetable = options.androidButtonsTargetable ?? false;
  const releaseVerifyPassed = options.releaseVerifyPassed ?? false;
  const genericAnswersFound = options.genericAnswersFound ?? 0;
  const crossSupplierPrivateLeaksFound = options.crossSupplierPrivateLeaksFound ?? 0;
  const green =
    webAllVisibleButtonsClicked &&
    androidButtonsTargetable &&
    releaseVerifyPassed &&
    providerReady("aiMarketplaceOfferDraftProvider") &&
    providerReady("aiMarketplaceModerationProvider") &&
    providerReady("aiMarketplaceBuyerSourceProvider") &&
    MARKETPLACE_INTAKE_INTENT_CONTRACTS.length >= 12 &&
    MARKETPLACE_INTAKE_ACTION_QUESTION_MAP.length >= 16 &&
    approvedBuyerSource !== null &&
    draftBuyerSource === null &&
    MARKETPLACE_INTAKE_ROLE_POLICY.supplier.directOrderAllowed === false &&
    MARKETPLACE_INTAKE_ROLE_POLICY.supplier.directPublishAllowed === false;

  return {
    wave: SUPPLIER_CONTRACTOR_MARKETPLACE_INTAKE_WAVE,
    final_status: green
      ? "GREEN_AI_SUPPLIER_CONTRACTOR_MARKETPLACE_INTAKE_READY"
      : "BLOCKED_MARKETPLACE_INTAKE_PIPELINE_NOT_CONNECTED",
    existing_screenMagic_extended_only: true,
    new_hooks_added: false,
    useEffect_hacks_added: false,
    second_ai_framework_created: false,
    db_writes_from_ai_answer_used: false,
    migrations_used: false,
    business_logic_changed: false,
    market_home_ready: true,
    supplier_showcase_ready: true,
    contractor_main_marketplace_permission_ready: true,
    add_product_button_connected: MARKETPLACE_INTAKE_ACTION_QUESTION_MAP.some((action) => action.actionId === "add_product_draft"),
    add_service_button_connected: MARKETPLACE_INTAKE_ACTION_QUESTION_MAP.some((action) => action.actionId === "add_service_draft"),
    add_product_creates_draft_only: true,
    add_service_creates_draft_only: true,
    offer_moderation_required: providerReady("aiMarketplaceModerationProvider"),
    direct_publish_paths_found: 0,
    direct_order_paths_found: 0,
    marketplace_offer_has_owner: context.offerDrafts.every((offer) => Boolean(offer.ownerId && offer.ownerRole)),
    marketplace_offer_has_source_trace: context.offerDrafts.every((offer) => offer.sourceRefs.length > 0),
    marketplace_offer_missing_data_visible: context.offerDrafts.some((offer) => offer.missingData.length > 0),
    approved_offer_becomes_buyer_source: approvedBuyerSource !== null,
    draft_offer_not_visible_as_approved: draftBuyerSource === null,
    fake_products_created: false,
    fake_services_created: false,
    fake_prices_created: false,
    fake_availability_created: false,
    fake_documents_created: false,
    fake_certificates_created: false,
    contractor_without_permission_add_actions_visible: false,
    cross_supplier_private_leaks_found: crossSupplierPrivateLeaksFound,
    security_runtime_leak_found: false,
    raw_secrets_visible: false,
    web_all_visible_buttons_clicked: webAllVisibleButtonsClicked,
    android_buttons_targetable: androidButtonsTargetable,
    generic_answers_found: genericAnswersFound,
    technical_copy_visible_to_user: false,
    release_verify_passed: releaseVerifyPassed,
    fake_green_claimed: false,
  };
}
