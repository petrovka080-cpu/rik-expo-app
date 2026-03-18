import type { ImageSourcePropType } from "react-native";

import type { Database } from "../../lib/database.types";

export type MarketListingRow = Database["public"]["Tables"]["market_listings"]["Row"];

export type MarketSide = "offer" | "demand";
export type MarketKind = "material" | "work" | "service" | "rent";
export type MarketMapKind = Exclude<MarketKind, "rent">;

export type MarketHomeCategoryKey =
  | "materials"
  | "works"
  | "services"
  | "delivery"
  | "transport"
  | "tools"
  | "misc";

export type MarketHomeFilters = {
  query: string;
  side: "all" | MarketSide;
  kind: "all" | MarketKind;
  category: "all" | MarketHomeCategoryKey;
};

export type MarketMapParams = {
  side?: MarketSide;
  kind?: MarketMapKind;
  city?: string;
  focusId?: string;
};

export type MarketListingItem = {
  rik_code: string | null;
  name: string | null;
  uom: string | null;
  qty: number | null;
  price: number | null;
  city: string | null;
  kind: string | null;
};

export type MarketHomeListingCard = {
  id: string;
  title: string;
  sellerUserId: string;
  sellerCompanyId: string | null;
  subtitle: string;
  city: string | null;
  price: number | null;
  kind: string | null;
  kindLabel: string;
  side: MarketSide;
  sideLabel: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  uom: string | null;
  status: string | null;
  created_at: string | null;
  statusLabel: string;
  presentationCategory: MarketHomeCategoryKey;
  imageSource: ImageSourcePropType;
  items: MarketListingItem[];
  itemsPreview: string[];
  searchText: string;
  isDemand: boolean;
};

export type MarketHomeBanner = {
  id: string;
  imageUri: string;
  title: string;
  description: string;
  ctaLabel: string;
  action: "scroll_feed" | "open_map" | "open_offer_map";
};

export type MarketHomeCategoryCard = {
  key: MarketHomeCategoryKey;
  label: string;
  imageSource: ImageSourcePropType;
  accent: string;
};

export type MarketHomePayload = {
  listings: MarketHomeListingCard[];
  activeDemandCount: number;
};
