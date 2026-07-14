import {
  buildKgRegionalPriceableResourcesForPassport,
} from "../../src/lib/estimate/buildKgRegionalPriceKeys";
import {
  buildProfessionalWorkPassportV2,
  listProfessionalWorkPassportV2TemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassportV2";
import {
  resolveKgRegionalPriceSnapshot,
  validateKgRegionalPriceSourceRegistry,
  type KgRegionalExchangeRate,
} from "../../src/lib/estimate/kgRegionalPriceSourceRegistry";
import type {
  KgRegionalPriceKey,
  KgRegionalPriceRecord,
  KgRegionalPriceSourceMetadata,
  KgRegionalPriceSourcePriority,
} from "../../src/lib/estimate/kgRegionalPricingContract";

const SOURCE: KgRegionalPriceSourceMetadata = Object.freeze({
  source_id: "kg_test_verified_source_2026_07",
  source_url: "https://example.com/kg/verified-price-source.pdf",
  publisher: "KG test verified publisher",
  jurisdiction: "KG",
  accessed_at: "2026-07-14T00:00:00+06:00",
  valid_at: "2026-07-14",
  license_state: "public_test_fixture",
  document_hash: "eh_test_verified_source_hash",
  verification_status: "VERIFIED",
});

function samplePriceKey(): KgRegionalPriceKey {
  const sampleId = listProfessionalWorkPassportV2TemplateIds()[10000];
  const passport = buildProfessionalWorkPassportV2(sampleId);
  if (!passport) throw new Error("Expected resolved V2 passport for KG regional source registry test");
  const resource = buildKgRegionalPriceableResourcesForPassport(passport)[0];
  return resource.price_key;
}

function record(input: {
  price_key: KgRegionalPriceKey;
  id: string;
  source_type: Exclude<KgRegionalPriceSourcePriority, "PRICE_MISSING">;
  base_price: number;
  currency?: "KGS" | "USD" | "EUR";
  valid_until?: string | null;
  region?: string;
  city?: string;
}): KgRegionalPriceRecord {
  return Object.freeze({
    price_record_id: input.id,
    price_key: input.price_key,
    exact_name_ru: "Тестовый ресурс точной спецификации",
    specification: { fixture: "exact_price_key_source_registry" },
    unit: input.price_key.normalized_unit,
    package_quantity: null,
    base_price: input.base_price,
    currency: input.currency ?? "KGS",
    vat_included: false,
    region: input.region ?? input.price_key.region_code,
    city: input.city ?? "Bishkek",
    supplier: "KG verified test supplier",
    source_id: SOURCE.source_id,
    source_type: input.source_type,
    source_url: SOURCE.source_url,
    document_number: "KG-TEST-2026-07",
    valid_from: "2026-07-01",
    valid_until: input.valid_until ?? "2026-12-31",
    availability: "IN_STOCK",
    minimum_order: null,
    delivery_included: false,
    verification_status: "VERIFIED",
    created_at: "2026-07-14T00:00:00+06:00",
    version: "kg_test_registry_2026_07_v1",
  });
}

describe("KG regional price source registry and resolver", () => {
  it("loads a versioned offline registry without runtime network dependency", () => {
    const validation = validateKgRegionalPriceSourceRegistry();

    expect(validation.versioned_price_source_registry_created).toBe(true);
    expect(validation.registry_version).toBe("kg_regional_price_source_registry_2026_07_14_v1");
    expect(validation.runtime_network_required).toBe(false);
    expect(validation.records_count).toBe(0);
    expect(validation.sources_count).toBe(0);
    expect(validation.blocking_reasons).toEqual([]);
  });

  it("selects the strongest source priority instead of the cheapest weaker price", () => {
    const priceKey = samplePriceKey();
    const weaker = record({
      price_key: priceKey,
      id: "kg_test_user_confirmed_low_price",
      source_type: "USER_CONFIRMED_PRICE",
      base_price: 1000,
    });
    const stronger = record({
      price_key: priceKey,
      id: "kg_test_contract_higher_price",
      source_type: "CONTRACT_PRICE",
      base_price: 1500,
    });

    const result = resolveKgRegionalPriceSnapshot({
      price_key: priceKey,
      quantity: 2,
      records: [weaker, stronger],
      sources: [SOURCE],
    });

    expect(result.blockers).toEqual([]);
    expect(result.selected_record?.price_record_id).toBe(stronger.price_record_id);
    expect(result.snapshot.price_source_priority).toBe("CONTRACT_PRICE");
    expect(result.snapshot.trust_state).toBe("CONTRACTUAL");
    expect(result.snapshot.normalized_unit_price).toBe(1500);
    expect(result.snapshot.total).toBe(3000);
    expect(result.snapshot.price_range_min).toBe(1000);
    expect(result.snapshot.price_range_median).toBe(1250);
    expect(result.snapshot.price_range_max).toBe(1500);
    expect(Object.isFrozen(result.snapshot)).toBe(true);
    expect(Object.isFrozen(result.snapshot.blocker_ids)).toBe(true);
  });

  it("does not use expired exact prices as current prices", () => {
    const priceKey = samplePriceKey();
    const expired = record({
      price_key: priceKey,
      id: "kg_test_expired_supplier_quote",
      source_type: "VERIFIED_SUPPLIER_QUOTE",
      base_price: 1200,
      valid_until: "2026-01-01",
    });

    const result = resolveKgRegionalPriceSnapshot({
      price_key: priceKey,
      records: [expired],
      sources: [SOURCE],
      valid_at: "2026-07-14T00:00:00+06:00",
    });

    expect(result.snapshot.trust_state).toBe("EXPIRED");
    expect(result.snapshot.unit_price).toBeNull();
    expect(result.snapshot.total).toBeNull();
    expect(result.blockers[0]?.blocker_type).toBe("PRICE_EXPIRED");
  });

  it("quarantines regional fallback instead of silently accepting it", () => {
    const priceKey = samplePriceKey();
    const fallbackKey: KgRegionalPriceKey = {
      ...priceKey,
      price_key_id: "kg_price_key_test_fallback_osh",
      region_code: "KG-OSH",
    };
    const fallback = record({
      price_key: fallbackKey,
      id: "kg_test_osh_supplier_quote",
      source_type: "VERIFIED_SUPPLIER_QUOTE",
      base_price: 1300,
      region: "KG-OSH",
      city: "Osh",
    });

    const result = resolveKgRegionalPriceSnapshot({
      price_key: priceKey,
      records: [fallback],
      sources: [SOURCE],
    });

    expect(result.snapshot.trust_state).toBe("REGIONAL_FALLBACK");
    expect(result.snapshot.unit_price).toBeNull();
    expect(result.blockers[0]?.blocker_type).toBe("REGION_PRICE_MISSING");
  });

  it("requires traced exchange rate for currency conversion and seals converted snapshots", () => {
    const priceKey = samplePriceKey();
    const usd = record({
      price_key: priceKey,
      id: "kg_test_usd_supplier_quote",
      source_type: "VERIFIED_SUPPLIER_QUOTE",
      base_price: 10,
      currency: "USD",
    });
    const rate: KgRegionalExchangeRate = {
      source_currency: "USD",
      target_currency: "KGS",
      exchange_rate: 89.5,
      exchange_rate_source: "KG test bank fixing",
      rate_date: "2026-07-14",
    };

    const blocked = resolveKgRegionalPriceSnapshot({
      price_key: priceKey,
      records: [usd],
      sources: [SOURCE],
    });
    expect(blocked.snapshot.unit_price).toBeNull();
    expect(blocked.blockers[0]?.blocker_type).toBe("CURRENCY_RATE_MISSING");

    const converted = resolveKgRegionalPriceSnapshot({
      price_key: priceKey,
      quantity: 3,
      records: [usd],
      sources: [SOURCE],
      exchange_rates: [rate],
    });
    expect(converted.blockers).toEqual([]);
    expect(converted.snapshot.source_currency).toBe("USD");
    expect(converted.snapshot.target_currency).toBe("KGS");
    expect(converted.snapshot.exchange_rate).toBe(89.5);
    expect(converted.snapshot.exchange_rate_source).toBe(rate.exchange_rate_source);
    expect(converted.snapshot.normalized_unit_price).toBe(895);
    expect(converted.snapshot.total).toBe(2685);
  });
});
