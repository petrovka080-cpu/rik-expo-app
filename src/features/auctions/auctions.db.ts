import type { Database } from "../../lib/database.types";

export type TenderRowDb = Database["public"]["Tables"]["tenders"]["Row"];
export type TenderItemRowDb = Database["public"]["Tables"]["tender_items"]["Row"];
export type AuctionRowDb = Database["public"]["Tables"]["auctions"]["Row"];
