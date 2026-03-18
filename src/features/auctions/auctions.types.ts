import type { Database, Json } from "../../lib/database.types";

export type TenderRow = Database["public"]["Tables"]["tenders"]["Row"];
export type TenderItemRow = Database["public"]["Tables"]["tender_items"]["Row"];
export type AuctionRow = Database["public"]["Tables"]["auctions"]["Row"];

export type UnifiedAuctionItem = {
  id: string;
  rikCode: string | null;
  name: string | null;
  qty: number | null;
  uom: string | null;
};

export type UnifiedAuctionSummary = {
  id: string;
  source: "tender" | "auction";
  title: string;
  subtitle: string;
  city: string | null;
  status: string | null;
  deadlineAt: string | null;
  createdAt: string | null;
  note: string | null;
  contactPhone: string | null;
  contactWhatsApp: string | null;
  contactEmail: string | null;
  itemsCount: number;
  itemsPreview: string[];
};

export type UnifiedAuctionDetail = UnifiedAuctionSummary & {
  items: UnifiedAuctionItem[];
};

export type AuctionListTab = "active" | "closed";

export type AuctionJsonItem = {
  rik_code?: string | null;
  name?: string | null;
  name_human?: string | null;
  qty?: number | string | null;
  uom?: string | null;
};

export type AuctionItemsJson = Json;
