import type { Database } from "../../lib/database.types";

export type MarketListingRowDb = Database["public"]["Tables"]["market_listings"]["Row"];
export type MarketListingItemsJsonDb = MarketListingRowDb["items_json"];
