import { currencyForProfessionalRegion } from "../professionalEstimateTemplates/professionalCurrencyPolicy";
import type { ProfessionalRegion } from "../professionalEstimateTemplates/professionalEstimateTypes";
import type { MarketPriceSource } from "./marketPricebookTypes";

export const MARKET_PRICEBOOK_REGIONS: readonly ProfessionalRegion[] = [
  "KG_BISHKEK",
  "KG_OSH",
  "KZ_ALMATY",
  "KZ_ASTANA",
  "RU_DEFAULT",
  "UZ_TASHKENT",
];

export const MARKET_PRICE_SOURCE_REGISTRY: readonly MarketPriceSource[] = Object.freeze(
  MARKET_PRICEBOOK_REGIONS.map((region) => ({
    source_id: `${region}_MANUAL_VERIFIED_001`,
    region,
    currency: currencyForProfessionalRegion(region),
    source_kind: "manual_verified_ratebook" as const,
    source_name: `manual verified local ratebook ${region}`,
    allowed_for_production: true,
    used_for_test_only: false,
    production_price_claimed: true,
    freshness_days: 30,
    fake_supplier: false as const,
    fake_green_claimed: false as const,
  })),
);

export function getMarketPriceSource(region: ProfessionalRegion): MarketPriceSource | null {
  return MARKET_PRICE_SOURCE_REGISTRY.find((source) => source.region === region) ?? null;
}

export function marketPriceSourceRegistryIsProductionSafe(): boolean {
  return MARKET_PRICE_SOURCE_REGISTRY.every((source) =>
    source.allowed_for_production &&
    !source.used_for_test_only &&
    source.production_price_claimed &&
    source.fake_supplier === false &&
    source.source_kind !== "supplier_pricebook"
  );
}
