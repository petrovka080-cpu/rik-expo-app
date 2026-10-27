import type { DbJson } from "../../lib/dbContract.types";
import type { AuctionRowDb, TenderItemRowDb, TenderRowDb } from "./auctions.db";

export type TenderRow = TenderRowDb;
export type TenderItemRow = TenderItemRowDb;
export type AuctionRow = AuctionRowDb;

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

export type AuctionItemsJson = DbJson;
