import type {
  MarketplaceActorRole,
  MarketplaceIntakeActionQuestion,
  MarketplaceIntakeContext,
  MarketplacePermissionSet,
} from "./marketplaceIntakeTypes";

const denyMutations = {
  directPublishAllowed: false,
  directOrderAllowed: false,
  autoApprovalAllowed: false,
} as const;

export const MARKETPLACE_INTAKE_ROLE_POLICY: Record<MarketplaceActorRole, MarketplacePermissionSet> = {
  supplier: {
    canAddMarketplaceProduct: true,
    canAddMarketplaceService: true,
    canSubmitModeration: true,
    canSeeApprovedMarketplaceSources: true,
    canSeeOwnPrivateOffers: true,
    canSeeOtherSupplierPrivateOffers: false,
    ...denyMutations,
  },
  contractor: {
    canAddMarketplaceProduct: false,
    canAddMarketplaceService: false,
    canSubmitModeration: false,
    canSeeApprovedMarketplaceSources: false,
    canSeeOwnPrivateOffers: true,
    canSeeOtherSupplierPrivateOffers: false,
    ...denyMutations,
  },
  buyer: {
    canAddMarketplaceProduct: false,
    canAddMarketplaceService: false,
    canSubmitModeration: false,
    canSeeApprovedMarketplaceSources: true,
    canSeeOwnPrivateOffers: false,
    canSeeOtherSupplierPrivateOffers: false,
    ...denyMutations,
  },
  foreman: {
    canAddMarketplaceProduct: false,
    canAddMarketplaceService: false,
    canSubmitModeration: false,
    canSeeApprovedMarketplaceSources: true,
    canSeeOwnPrivateOffers: false,
    canSeeOtherSupplierPrivateOffers: false,
    ...denyMutations,
  },
  documents: {
    canAddMarketplaceProduct: false,
    canAddMarketplaceService: false,
    canSubmitModeration: false,
    canSeeApprovedMarketplaceSources: true,
    canSeeOwnPrivateOffers: false,
    canSeeOtherSupplierPrivateOffers: false,
    ...denyMutations,
  },
};

export function resolveMarketplacePermissions(context: MarketplaceIntakeContext): MarketplacePermissionSet {
  return {
    ...MARKETPLACE_INTAKE_ROLE_POLICY[context.role],
    ...context.permissions,
    ...denyMutations,
  };
}

export function canUseMarketplaceAction(
  context: MarketplaceIntakeContext,
  action: MarketplaceIntakeActionQuestion,
): boolean {
  const permissions = resolveMarketplacePermissions(context);
  if (!action.allowedRoles.includes(context.role)) return false;
  if (action.actionId === "add_product_draft") return permissions.canAddMarketplaceProduct;
  if (action.actionId === "add_service_draft") return permissions.canAddMarketplaceService;
  if (action.actionId === "send_to_moderation") return permissions.canSubmitModeration;
  if (context.role === "buyer") return permissions.canSeeApprovedMarketplaceSources;
  return true;
}
