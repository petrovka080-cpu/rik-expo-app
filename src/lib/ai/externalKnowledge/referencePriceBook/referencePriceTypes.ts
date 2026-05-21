export type ReferencePriceCategory =
  | "flooring"
  | "drywall"
  | "plastering"
  | "painting"
  | "concrete"
  | "asphalt"
  | "doors"
  | "windows"
  | "electrical"
  | "plumbing"
  | "waterproofing"
  | "tiles"
  | "roofing"
  | "facade";

export type ReferencePriceUnit = "m2" | "m" | "pcs" | "set" | "kg" | "m3";

export type ReferencePriceItem = {
  id: string;
  countryCode?: string;
  cityOrRegion?: string;
  currency: string;
  category: ReferencePriceCategory;
  itemRu: string;
  unit: ReferencePriceUnit;
  priceMin: number;
  priceMax: number;
  sourceType:
    | "internal_marketplace"
    | "external_marketplace"
    | "public_web"
    | "configured_reference";
  checkedAt: string;
  requiresReview: true;
};
