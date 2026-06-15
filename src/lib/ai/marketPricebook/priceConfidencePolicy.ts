import type { MarketGovernedPrice, MarketPriceSource } from "./marketPricebookTypes";

export const MARKET_MIN_PRODUCTION_PRICE_CONFIDENCE = 0.85;

export function marketPriceConfidenceForSource(source: MarketPriceSource): number {
  if (source.source_kind === "manual_verified_ratebook") return 0.9;
  if (source.source_kind === "regional_pricebook") return 0.92;
  if (source.source_kind === "catalog_item") return 0.95;
  if (source.source_kind === "admin_imported_csv") return 0.88;
  return 0.86;
}

export function marketPricePassesConfidencePolicy(price: MarketGovernedPrice): boolean {
  return price.confidence >= MARKET_MIN_PRODUCTION_PRICE_CONFIDENCE &&
    price.freshness_status === "FRESH" &&
    price.unit_price > 0 &&
    price.fake_price_claimed === false &&
    price.fake_supplier_claimed === false;
}
