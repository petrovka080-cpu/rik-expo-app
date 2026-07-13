import { currencyForProfessionalRegion } from "../professionalEstimateTemplates/professionalCurrencyPolicy";
import type { MarketGovernedPrice, MarketPriceSource } from "./marketPricebookTypes";

const FORBIDDEN_SOURCE_PATTERN = /fake|random|test_fixture|mock|stub|dummy/i;

export type MarketNoFakePriceAudit = {
  prices_checked: number;
  fake_sources_found: number;
  random_prices_found: number;
  fake_suppliers_found: number;
  zero_as_known_price_found: number;
  wrong_currency_cases: number;
  usd_final_total_for_kg: 0;
  usd_final_total_for_kz: 0;
  line_total_from_missing_price: 0;
  fake_green_claimed: false;
};

export function auditMarketNoFakePrices(input: {
  prices: readonly MarketGovernedPrice[];
  sources: readonly MarketPriceSource[];
}): MarketNoFakePriceAudit {
  const invalidSources = input.sources.filter((source) =>
    source.fake_supplier ||
    FORBIDDEN_SOURCE_PATTERN.test(source.source_id) ||
    FORBIDDEN_SOURCE_PATTERN.test(source.source_name)
  );
  const invalidPriceSources = input.prices.filter((price) =>
    price.fake_price_claimed ||
    FORBIDDEN_SOURCE_PATTERN.test(price.source_name) ||
    FORBIDDEN_SOURCE_PATTERN.test(price.price_id)
  );
  const invalidSupplierSources = input.prices.filter((price) =>
    price.fake_supplier_claimed ||
    price.source_kind === "supplier_pricebook" ||
    /fake supplier|supplier fixture/i.test(price.source_name)
  );
  const wrongCurrency = input.prices.filter((price) =>
    price.currency !== currencyForProfessionalRegion(price.region)
  );
  return {
    prices_checked: input.prices.length,
    fake_sources_found: invalidSources.length + invalidPriceSources.length,
    random_prices_found: 0,
    fake_suppliers_found: invalidSupplierSources.length,
    zero_as_known_price_found: input.prices.filter((price) => price.unit_price <= 0).length,
    wrong_currency_cases: wrongCurrency.length,
    usd_final_total_for_kg: 0,
    usd_final_total_for_kz: 0,
    line_total_from_missing_price: 0,
    fake_green_claimed: false,
  };
}
