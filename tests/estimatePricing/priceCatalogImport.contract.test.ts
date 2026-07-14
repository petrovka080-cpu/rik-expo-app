import {
  MARKET_GOVERNED_PRICEBOOK,
  MARKET_PRICEBOOK_UPDATED_AT,
  MARKET_PRICEBOOK_VERSION,
  MARKET_PRICE_SOURCE_REGISTRY,
} from "../../src/lib/ai/marketPricebook";
import { buildEstimatePriceCatalogBoqProof } from "../../src/lib/ai/estimatePricing/priceCatalogBoq";

describe("estimate price catalog import contract", () => {
  it("uses the governed backend price catalog with versioned regional KGS sources", () => {
    const proof = buildEstimatePriceCatalogBoqProof();

    expect(MARKET_GOVERNED_PRICEBOOK.length).toBeGreaterThan(0);
    expect(MARKET_PRICEBOOK_VERSION).toMatch(/^market-pricebook-v/);
    expect(MARKET_PRICEBOOK_UPDATED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(MARKET_PRICE_SOURCE_REGISTRY.some((source) => source.region === "KG_BISHKEK")).toBe(true);
    expect(proof.price_catalog_backend_exists).toBe(true);
    expect(proof.price_catalog_versioned).toBe(true);
    expect(proof.price_catalog_region_aware).toBe(true);
    expect(proof.price_catalog_currency_kgs).toBe(true);
    expect(proof.price_catalog_units_validated).toBe(true);
    expect(proof.no_fake_prices).toBe(true);
  });
});
