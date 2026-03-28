import type { ImageSourcePropType } from "react-native";

import type { Database } from "../../lib/database.types";

export type MarketListingRow = Database["public"]["Tables"]["market_listings"]["Row"];
export type MarketMarketplaceScopeRow = {
  id: string;
  name: string | null;
  title: string | null;
  category: string | null;
  price: number | null;
  supplier_id: string | null;
  supplier_name: string | null;
  in_stock: boolean | null;
  unit: string | null;
  image_url: string | null;
  user_id: string | null;
  company_id: string | null;
  seller_display_name: string | null;
  city: string | null;
  kind: string | null;
  side: string | null;
  description: string | null;
  contacts_phone: string | null;
  contacts_whatsapp: string | null;
  contacts_email: string | null;
  items_json: Database["public"]["Tables"]["market_listings"]["Row"]["items_json"] | null;
  erp_items_json: Database["public"]["Tables"]["market_listings"]["Row"]["items_json"] | null;
  uom: string | null;
  uom_code: string | null;
  rik_code: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  primary_rik_code: string | null;
  stock_qty_available: number | null;
  stock_uom: string | null;
  total_available_count: number | null;
  stock_match_count: number | null;
  erp_item_count: number | null;
};

export type MarketMarketplaceScopePageRow = MarketMarketplaceScopeRow & {
  total_count: number | null;
  active_demand_count: number | null;
};

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

export type MarketListingErpItem = {
  rikCode: string;
  nameHuman: string;
  uom: string | null;
  qty: number;
  price: number | null;
  kind: string | null;
};

export type MarketHomeListingCard = {
  id: string;
  title: string;
  sellerUserId: string;
  sellerCompanyId: string | null;
  supplierId: string | null;
  sellerDisplayName: string;
  subtitle: string;
  city: string | null;
  price: number | null;
  priceKnown: boolean;
  kind: string | null;
  kindLabel: string;
  side: MarketSide;
  sideLabel: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  uom: string | null;
  unit: string | null;
  status: string | null;
  created_at: string | null;
  statusLabel: string;
  presentationCategory: MarketHomeCategoryKey;
  imageSource: ImageSourcePropType;
  imageUrl: string | null;
  items: MarketListingItem[];
  erpItems: MarketListingErpItem[];
  itemsPreview: string[];
  searchText: string;
  isDemand: boolean;
  inStock: boolean;
  stockLabel: string | null;
  stockQtyAvailable: number | null;
  stockUom: string | null;
  totalAvailableCount: number | null;
  primaryRikCode: string | null;
  source: "marketplace";
};

export type MarketHomeBanner = {
  id: string;
  imageSource: ImageSourcePropType;
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
  totalCount: number;
  pageOffset: number;
  pageSize: number;
  hasMore: boolean;
};

export type MarketRoleCapabilities = {
  role: string | null;
  canAddToRequest: boolean;
  canCreateProposal: boolean;
};
