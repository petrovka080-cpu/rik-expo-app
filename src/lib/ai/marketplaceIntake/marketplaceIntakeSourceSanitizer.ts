import type { ConstructionKnowledgeSource } from "../constructionKnowledgeCore";
import type { MarketplaceIntakeContext, MarketplaceOfferDraft } from "./marketplaceIntakeTypes";
import { resolveMarketplacePermissions } from "./marketplaceIntakeRolePolicy";

const ALLOWED_SOURCE_TYPES: readonly ConstructionKnowledgeSource["type"][] = [
  "company_standard",
  "project_pdf",
  "architecture_pdf",
  "engineering_pdf",
  "estimate_pdf",
  "boq",
  "specification",
  "act",
  "report",
  "photo",
  "work",
  "object",
  "zone",
  "material",
  "warehouse_stock",
  "procurement_request",
  "supplier_offer",
  "approval",
  "chat_message",
];

function canSeeOffer(context: MarketplaceIntakeContext, offer: MarketplaceOfferDraft): boolean {
  const permissions = resolveMarketplacePermissions(context);
  if (offer.moderationStatus === "approved" && permissions.canSeeApprovedMarketplaceSources) return true;
  if (permissions.canSeeOwnPrivateOffers && offer.ownerId === context.actorId) return true;
  return permissions.canSeeOtherSupplierPrivateOffers;
}

export function sanitizeMarketplaceIntakeContext(context: MarketplaceIntakeContext): MarketplaceIntakeContext {
  const safeOffers = context.offerDrafts.filter((offer) => canSeeOffer(context, offer));
  const safeSources = context.sources.filter((source) => ALLOWED_SOURCE_TYPES.includes(source.type));
  return {
    ...context,
    permissions: {
      ...resolveMarketplacePermissions(context),
      directPublishAllowed: false,
      directOrderAllowed: false,
      autoApprovalAllowed: false,
    },
    offerDrafts: safeOffers,
    sources: safeSources,
  };
}

export function hasCrossSupplierPrivateLeak(context: MarketplaceIntakeContext): boolean {
  const permissions = resolveMarketplacePermissions(context);
  if (permissions.canSeeOtherSupplierPrivateOffers) return false;
  return context.offerDrafts.some((offer) =>
    offer.ownerId !== context.actorId && offer.moderationStatus !== "approved",
  );
}
