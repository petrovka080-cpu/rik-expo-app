import {
  type CatalogSearchItem,
  type ListingCartItem,
  type ListingKind,
  UI_COPY,
} from "./profile.types";

export function buildListingCatalogItem(
  params: {
    item: CatalogSearchItem;
    city: string;
    profileCity: string | null | undefined;
    companyCity: string | null | undefined;
    listingKind: ListingKind;
  },
  createId: () => string = () =>
    `${Date.now()}-${Math.random().toString(16).slice(2)}`,
): ListingCartItem {
  return {
    id: createId(),
    rik_code: params.item.rik_code,
    name: params.item.name_human_ru || UI_COPY.catalogFallback,
    uom: params.item.uom_code || "",
    qty: "",
    price: "",
    city: params.city || params.profileCity || params.companyCity || null,
    kind: params.listingKind,
  };
}
