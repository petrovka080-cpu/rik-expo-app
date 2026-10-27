import { toMarketHomeListingCard } from "../../features/market/marketHome.data";
import type {
  MarketHomeListingCard,
  MarketListingRow,
} from "../../features/market/marketHome.types";
import type { AppContext } from "../../lib/appAccessModel";
import { MARKET_ADD_MEDIA_LIMITS } from "../../lib/media";
import { parsePositiveListingPrice } from "./addListingValidation";
import type {
  Company,
  ListingCartItem,
  ListingKind,
  UserProfile,
} from "./profile.types";

function buildInstantListingItemsJson(
  listingCartItems: readonly ListingCartItem[],
): MarketListingRow["items_json"] {
  return listingCartItems.map((item) => ({
    rik_code: item.rik_code,
    name: item.name,
    uom: item.uom,
    qty: Number(item.qty.replace(",", ".")) || 0,
    price: Number(item.price.replace(",", ".")) || 0,
    city: item.city,
    kind: item.kind,
  }));
}

export function buildInstantPublishedMarketListing(params: {
  listingId: string;
  clientMutationId: string;
  profile: UserProfile;
  company: Company | null;
  activeContext: AppContext;
  listingTitle: string;
  listingCity: string;
  listingPrice: string;
  listingUom: string;
  listingDescription: string;
  listingPhone: string;
  listingWhatsapp: string;
  listingEmail: string;
  listingKind: ListingKind;
  listingRikCode: string | null;
  listingCartItems: readonly ListingCartItem[];
  photoPublicUrls: readonly string[];
  videoPublicUrls: readonly string[];
}): MarketHomeListingCard {
  const companyId =
    params.activeContext === "office" && params.company
      ? params.company.id
      : null;
  const nowIso = new Date().toISOString();
  const photoPublicUrls = params.photoPublicUrls.slice(
    0,
    MARKET_ADD_MEDIA_LIMITS.maxPhotos,
  );
  const videoPublicUrls = params.videoPublicUrls.slice(0, 1);
  const row: MarketListingRow = {
    catalog_item_id: null,
    catalog_kind: null,
    city: params.listingCity.trim() || null,
    client_mutation_id: params.clientMutationId,
    company_id: companyId,
    contacts_email: params.listingEmail.trim() || null,
    contacts_phone: params.listingPhone.trim() || null,
    contacts_whatsapp: params.listingWhatsapp.trim() || null,
    created_at: nowIso,
    currency: "KGS",
    description: params.listingDescription.trim() || null,
    id: params.listingId,
    items_json: buildInstantListingItemsJson(params.listingCartItems),
    kind: params.listingKind,
    lat: null,
    lng: null,
    price: parsePositiveListingPrice(params.listingPrice),
    rik_code: params.listingRikCode?.trim() || null,
    side: "offer",
    status: "active",
    tender_id: null,
    title: params.listingTitle.trim(),
    uom: params.listingUom.trim() || null,
    uom_code: null,
    updated_at: nowIso,
    user_id: params.profile.user_id,
  };
  const listing = toMarketHomeListingCard(row);

  return {
    ...listing,
    sellerUserId: params.profile.user_id,
    sellerCompanyId: companyId,
    supplierId: companyId,
    sellerDisplayName:
      params.company?.name?.trim() ||
      params.profile.full_name?.trim() ||
      "Supplier",
    imageUrl: photoPublicUrls[0] ?? null,
    imageUrls: photoPublicUrls,
    videoUrl: videoPublicUrls[0] ?? null,
    videoUrls: videoPublicUrls,
  };
}
