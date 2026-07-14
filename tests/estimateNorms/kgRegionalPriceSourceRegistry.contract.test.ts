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
  KgRegionalLaborPricingMethod,
  KgRegionalPriceKey,
  KgRegionalPriceRecord,
  KgRegionalPriceResourceType,
  KgRegionalPriceSourceMetadata,
  KgRegionalPriceSourcePriority,
  KgRegionalPriceSourceRegistry,
  KgRegionalPricingModel,
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

const PRICE_KEY_CACHE = new Map<KgRegionalPriceResourceType, KgRegionalPriceKey>();

function samplePriceKey(resourceType: KgRegionalPriceResourceType = "material"): KgRegionalPriceKey {
  const cached = PRICE_KEY_CACHE.get(resourceType);
  if (cached) return cached;
  for (const sampleId of listProfessionalWorkPassportV2TemplateIds()) {
    const passport = buildProfessionalWorkPassportV2(sampleId);
    if (!passport) continue;
    const resource = buildKgRegionalPriceableResourcesForPassport(passport)
      .find((candidate) => candidate.line_type === resourceType);
    if (!resource) continue;
    PRICE_KEY_CACHE.set(resourceType, resource.price_key);
    return resource.price_key;
  }
  throw new Error(`Expected resolved V2 ${resourceType} price key for KG regional source registry test`);
}

function defaultPricingModel(resourceType: KgRegionalPriceResourceType): KgRegionalPricingModel {
  if (resourceType === "material") return "MATERIAL_UNIT_PRICE";
  if (resourceType === "labor") return "LABOR_HOUR_RATE";
  if (resourceType === "service") return "SERVICE_UNIT_RATE";
  if (resourceType === "machine") return "MACHINE_HOUR_RATE";
  if (resourceType === "equipment") return "EQUIPMENT_UNIT_PRICE";
  return "MATERIAL_UNIT_PRICE";
}

function defaultLaborMethod(input: {
  resource_type: KgRegionalPriceResourceType;
  pricing_model: KgRegionalPricingModel;
}): KgRegionalLaborPricingMethod | null {
  if (input.resource_type !== "labor") return null;
  return input.pricing_model === "CONTRACTOR_UNIT_RATE"
    ? "CONTRACTOR_UNIT_RATE"
    : "NORMATIVE_LABOR_HOURS";
}

function record(input: {
  price_key: KgRegionalPriceKey;
  id: string;
  source_type: Exclude<KgRegionalPriceSourcePriority, "PRICE_MISSING">;
  base_price: number;
  pricing_model?: KgRegionalPricingModel;
  labor_pricing_method?: KgRegionalLaborPricingMethod | null;
  operator_included?: boolean | null;
  fuel_included?: boolean | null;
  minimum_shift_hours?: number | null;
  service_scope_id?: string | null;
  currency?: "KGS" | "USD" | "EUR";
  valid_until?: string | null;
  region?: string;
  city?: string;
}): KgRegionalPriceRecord {
  const pricingModel = input.pricing_model ?? defaultPricingModel(input.price_key.resource_type);
  const laborPricingMethod = input.labor_pricing_method === undefined
    ? defaultLaborMethod({ resource_type: input.price_key.resource_type, pricing_model: pricingModel })
    : input.labor_pricing_method;
  const operatorIncluded = input.operator_included === undefined
    ? input.price_key.resource_type === "machine" ? true : null
    : input.operator_included;
  const fuelIncluded = input.fuel_included === undefined
    ? input.price_key.resource_type === "machine" ? true : null
    : input.fuel_included;
  const minimumShiftHours = input.minimum_shift_hours === undefined
    ? pricingModel === "MACHINE_SHIFT_RATE" ? 8 : null
    : input.minimum_shift_hours;
  const serviceScopeId = input.service_scope_id === undefined
    ? input.price_key.resource_type === "service" ? `kg_test_scope_${input.price_key.price_key_id}` : null
    : input.service_scope_id;
  return Object.freeze({
    price_record_id: input.id,
    price_key: input.price_key,
    exact_name_ru: "Тестовый ресурс точной спецификации",
    specification: { fixture: "exact_price_key_source_registry" },
    unit: input.price_key.normalized_unit,
    package_quantity: null,
    pricing_model: pricingModel,
    labor_pricing_method: laborPricingMethod,
    operator_included: operatorIncluded,
    fuel_included: fuelIncluded,
    minimum_shift_hours: minimumShiftHours,
    service_scope_id: serviceScopeId,
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

function registryWith(records: readonly KgRegionalPriceRecord[]): KgRegionalPriceSourceRegistry {
  return {
    registry_version: "kg_test_registry_with_records_2026_07",
    country: "KG",
    runtime_network_required: false,
    records: [...records],
    sources: [SOURCE],
  };
}

describe("KG regional price source registry and resolver", () => {
  it("loads a versioned offline registry without runtime network dependency", () => {
    const validation = validateKgRegionalPriceSourceRegistry();

    expect(validation.versioned_price_source_registry_created).toBe(true);
    expect(validation.registry_version).toBe("kg_regional_price_source_registry_2026_07_14_v1");
    expect(validation.runtime_network_required).toBe(false);
    expect(validation.records_count).toBe(0);
    expect(validation.sources_count).toBe(0);
    expect(validation.price_model_incompatible_records_count).toBe(0);
    expect(validation.labor_pricing_method_conflict_records_count).toBe(0);
    expect(validation.machine_rate_scope_incomplete_records_count).toBe(0);
    expect(validation.service_scope_incomplete_records_count).toBe(0);
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

  it("rejects a material record that uses a labor pricing model", () => {
    const priceKey = samplePriceKey("material");
    const invalid = record({
      price_key: priceKey,
      id: "kg_test_material_with_labor_rate_model",
      source_type: "VERIFIED_SUPPLIER_QUOTE",
      base_price: 900,
      pricing_model: "LABOR_HOUR_RATE",
      labor_pricing_method: "NORMATIVE_LABOR_HOURS",
    });

    const validation = validateKgRegionalPriceSourceRegistry(registryWith([invalid]));
    expect(validation.price_model_incompatible_records_count).toBe(1);
    expect(validation.blocking_reasons).toContain("price_model_incompatible:1");

    const result = resolveKgRegionalPriceSnapshot({
      price_key: priceKey,
      records: [invalid],
      sources: [SOURCE],
    });

    expect(result.snapshot.trust_state).toBe("AMBIGUOUS");
    expect(result.snapshot.unit_price).toBeNull();
    expect(result.blockers[0]?.blocker_type).toBe("PRICE_MODEL_INCOMPATIBLE");
  });

  it("rejects labor records that mix normative hours and contractor unit rates", () => {
    const priceKey = samplePriceKey("labor");
    const invalid = record({
      price_key: priceKey,
      id: "kg_test_labor_mixed_rate_method",
      source_type: "VERIFIED_SUPPLIER_QUOTE",
      base_price: 1100,
      pricing_model: "LABOR_HOUR_RATE",
      labor_pricing_method: "CONTRACTOR_UNIT_RATE",
    });
    const valid = record({
      price_key: priceKey,
      id: "kg_test_labor_contractor_unit_rate",
      source_type: "VERIFIED_SUPPLIER_QUOTE",
      base_price: 1250,
      pricing_model: "CONTRACTOR_UNIT_RATE",
      labor_pricing_method: "CONTRACTOR_UNIT_RATE",
    });

    const validation = validateKgRegionalPriceSourceRegistry(registryWith([invalid]));
    expect(validation.labor_pricing_method_conflict_records_count).toBe(1);
    expect(validation.blocking_reasons).toContain("labor_pricing_method_conflict:1");

    const blocked = resolveKgRegionalPriceSnapshot({
      price_key: priceKey,
      records: [invalid],
      sources: [SOURCE],
    });
    expect(blocked.snapshot.unit_price).toBeNull();
    expect(blocked.blockers[0]?.blocker_type).toBe("LABOR_PRICING_METHOD_CONFLICT");

    const resolved = resolveKgRegionalPriceSnapshot({
      price_key: priceKey,
      records: [valid],
      sources: [SOURCE],
    });
    expect(resolved.blockers).toEqual([]);
    expect(resolved.snapshot.pricing_model).toBe("CONTRACTOR_UNIT_RATE");
    expect(resolved.snapshot.labor_pricing_method).toBe("CONTRACTOR_UNIT_RATE");
    expect(resolved.snapshot.normalized_unit_price).toBe(1250);
  });

  it("requires explicit operator fuel and shift scope for machine shift rates", () => {
    const priceKey = samplePriceKey("machine");
    const invalid = record({
      price_key: priceKey,
      id: "kg_test_machine_shift_scope_missing",
      source_type: "VERIFIED_SUPPLIER_QUOTE",
      base_price: 15_000,
      pricing_model: "MACHINE_SHIFT_RATE",
      operator_included: null,
      fuel_included: null,
      minimum_shift_hours: null,
    });

    const validation = validateKgRegionalPriceSourceRegistry(registryWith([invalid]));
    expect(validation.machine_rate_scope_incomplete_records_count).toBe(1);
    expect(validation.blocking_reasons).toContain("machine_rate_scope_incomplete:1");

    const result = resolveKgRegionalPriceSnapshot({
      price_key: priceKey,
      records: [invalid],
      sources: [SOURCE],
    });

    expect(result.snapshot.unit_price).toBeNull();
    expect(result.blockers[0]?.blocker_type).toBe("MACHINE_RATE_SCOPE_INCOMPLETE");
  });

  it("requires explicit service scope for service rates", () => {
    const priceKey = samplePriceKey("service");
    const invalid = record({
      price_key: priceKey,
      id: "kg_test_service_scope_missing",
      source_type: "VERIFIED_SUPPLIER_QUOTE",
      base_price: 4200,
      pricing_model: "SERVICE_FIXED_PRICE",
      service_scope_id: null,
    });

    const validation = validateKgRegionalPriceSourceRegistry(registryWith([invalid]));
    expect(validation.service_scope_incomplete_records_count).toBe(1);
    expect(validation.blocking_reasons).toContain("service_scope_incomplete:1");

    const result = resolveKgRegionalPriceSnapshot({
      price_key: priceKey,
      records: [invalid],
      sources: [SOURCE],
    });

    expect(result.snapshot.unit_price).toBeNull();
    expect(result.blockers[0]?.blocker_type).toBe("SERVICE_SCOPE_INCOMPLETE");
  });
});
