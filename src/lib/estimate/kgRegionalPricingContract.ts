export const S_AI_ESTIMATE_11610_KG_REGIONAL_PRICEBOOK_RESOURCE_MATCHING_LABOR_EQUIPMENT_LOGISTICS_TAX_SUPPLIER_QUOTE_AND_BLOCKER_QUARANTINE_NO_RELEASE =
  "S_AI_ESTIMATE_11610_KG_REGIONAL_PRICEBOOK_RESOURCE_MATCHING_LABOR_EQUIPMENT_LOGISTICS_TAX_SUPPLIER_QUOTE_AND_BLOCKER_QUARANTINE_NO_RELEASE" as const;

export const GREEN_AI_ESTIMATE_11610_KG_REGIONAL_PRICING_ENGINE_SOFTWARE_READY_FOR_LIVE_SUPPLIER_VALIDATION_NO_RELEASE =
  "GREEN_AI_ESTIMATE_11610_KG_REGIONAL_PRICING_ENGINE_SOFTWARE_READY_FOR_LIVE_SUPPLIER_VALIDATION_NO_RELEASE" as const;

export const STOP_AI_ESTIMATE_11610_KG_REGIONAL_PRICE_TRUTH_BLOCKERS_FOUND_NO_RELEASE =
  "STOP_AI_ESTIMATE_11610_KG_REGIONAL_PRICE_TRUTH_BLOCKERS_FOUND_NO_RELEASE" as const;

export type KgRegionalPricingFinalStatus =
  | typeof GREEN_AI_ESTIMATE_11610_KG_REGIONAL_PRICING_ENGINE_SOFTWARE_READY_FOR_LIVE_SUPPLIER_VALIDATION_NO_RELEASE
  | typeof STOP_AI_ESTIMATE_11610_KG_REGIONAL_PRICE_TRUTH_BLOCKERS_FOUND_NO_RELEASE;

export type KgRegionalPriceResourceType =
  | "material"
  | "labor"
  | "service"
  | "machine"
  | "equipment"
  | "logistics"
  | "tax"
  | "overhead"
  | "profit";

export type KgRegionalCurrency = "KGS" | "USD" | "EUR";

export type KgRegionalPricingModel =
  | "MATERIAL_UNIT_PRICE"
  | "LABOR_HOUR_RATE"
  | "CONTRACTOR_UNIT_RATE"
  | "SERVICE_UNIT_RATE"
  | "SERVICE_FIXED_PRICE"
  | "SERVICE_VISIT_RATE"
  | "SERVICE_TEST_RATE"
  | "SERVICE_DOCUMENT_RATE"
  | "MACHINE_HOUR_RATE"
  | "MACHINE_SHIFT_RATE"
  | "EQUIPMENT_RENTAL_RATE"
  | "EQUIPMENT_UNIT_PRICE";

export type KgRegionalLaborPricingMethod =
  | "NORMATIVE_LABOR_HOURS"
  | "CONTRACTOR_UNIT_RATE";

export type KgRegionalVatMode =
  | "VAT_INCLUDED"
  | "VAT_EXCLUDED"
  | "VAT_NOT_APPLICABLE"
  | "VAT_POLICY_REQUIRED";

export type KgRegionalDeliveryScope =
  | "EX_WORKS"
  | "DELIVERED_TO_SITE"
  | "DELIVERY_INCLUDED"
  | "DELIVERY_SCOPE_REQUIRED";

export type KgRegionalPriceSourcePriority =
  | "CONTRACT_PRICE"
  | "VERIFIED_SUPPLIER_QUOTE"
  | "OFFICIAL_PUBLISHED_PRICE"
  | "MANUFACTURER_PRICE_LIST"
  | "PUBLIC_PROCUREMENT_REFERENCE"
  | "VERIFIED_MARKET_REFERENCE"
  | "USER_CONFIRMED_PRICE"
  | "PRICE_MISSING";

export type KgRegionalPriceTrustState =
  | "CONTRACTUAL"
  | "SUPPLIER_VERIFIED"
  | "OFFICIAL_REFERENCE"
  | "MARKET_REFERENCE"
  | "USER_CONFIRMED"
  | "MISSING"
  | "EXPIRED"
  | "AMBIGUOUS"
  | "REGIONAL_FALLBACK";

export type KgRegionalPriceVerificationStatus =
  | "VERIFIED"
  | "UNVERIFIED"
  | "REJECTED"
  | "LICENSE_BLOCKED";

export type KgRegionalPriceAvailability =
  | "IN_STOCK"
  | "ORDER"
  | "UNKNOWN"
  | "UNAVAILABLE";

export type KgRegionalPriceKey = {
  price_key_id: string;
  resource_code: string;
  resource_type: KgRegionalPriceResourceType;
  specification_hash: string;
  normalized_unit: string;
  region_code: string;
  currency: KgRegionalCurrency;
  vat_mode: KgRegionalVatMode;
  delivery_scope: KgRegionalDeliveryScope;
};

export type KgRegionalPriceableResourceSpecification = {
  resource_code: string;
  source_resource_code: string;
  work_id: string;
  exact_name_ru: string;
  line_type: KgRegionalPriceResourceType;
  specification: Record<string, string | string[] | null>;
  specification_hash: string;
  quantity: number | null;
  quantity_formula: string;
  unit: string;
  normalized_unit: string;
  region: string;
  norm_source_id: string;
  formula_trace: string;
  quantity_revision_id: string;
  price_key: KgRegionalPriceKey;
};

export type KgRegionalPriceSnapshot = {
  snapshot_id: string;
  price_key: KgRegionalPriceKey;
  price_source_priority: KgRegionalPriceSourcePriority;
  trust_state: KgRegionalPriceTrustState;
  selected_price_record_id?: string | null;
  supplier?: string | null;
  source_url?: string | null;
  source_region?: string | null;
  source_city?: string | null;
  valid_until?: string | null;
  package_quantity?: number | null;
  pricing_model: KgRegionalPricingModel | null;
  labor_pricing_method: KgRegionalLaborPricingMethod | null;
  operator_included: boolean | null;
  fuel_included: boolean | null;
  minimum_shift_hours: number | null;
  service_scope_id: string | null;
  price_range_min?: number | null;
  price_range_median?: number | null;
  price_range_max?: number | null;
  unit_price: number | null;
  normalized_unit_price: number | null;
  total: number | null;
  currency: KgRegionalCurrency;
  exchange_rate: number | null;
  exchange_rate_source: string | null;
  rate_date: string | null;
  source_currency: KgRegionalCurrency | null;
  target_currency: KgRegionalCurrency;
  valid_at: string | null;
  created_at: string;
  blocker_ids: readonly string[];
  immutable: true;
};

export type KgRegionalPriceSourceMetadata = {
  source_id: string;
  source_url: string;
  publisher: string;
  jurisdiction: "KG" | string;
  accessed_at: string;
  valid_at: string;
  license_state: string;
  document_hash: string;
  verification_status: KgRegionalPriceVerificationStatus;
};

export type KgRegionalPriceRecord = {
  price_record_id: string;
  price_key: KgRegionalPriceKey;
  exact_name_ru: string;
  specification: Record<string, string | string[] | null>;
  unit: string;
  package_quantity: number | null;
  pricing_model: KgRegionalPricingModel;
  labor_pricing_method: KgRegionalLaborPricingMethod | null;
  operator_included: boolean | null;
  fuel_included: boolean | null;
  minimum_shift_hours: number | null;
  service_scope_id: string | null;
  base_price: number;
  currency: KgRegionalCurrency;
  vat_included: boolean;
  region: string;
  city: string;
  supplier: string;
  source_id: string;
  source_type: Exclude<KgRegionalPriceSourcePriority, "PRICE_MISSING">;
  source_url: string;
  document_number: string | null;
  valid_from: string;
  valid_until: string | null;
  availability: KgRegionalPriceAvailability;
  minimum_order: number | null;
  delivery_included: boolean;
  verification_status: KgRegionalPriceVerificationStatus;
  created_at: string;
  version: string;
};

export type KgRegionalPriceSourceRegistry = {
  registry_version: string;
  country: "KG";
  runtime_network_required: false;
  records: KgRegionalPriceRecord[];
  sources: KgRegionalPriceSourceMetadata[];
};

export type KgRegionalPricingBlockerType =
  | "UPSTREAM_PASSPORT_BLOCKED"
  | "RESOURCE_SPEC_INCOMPLETE"
  | "RESOURCE_MATCH_AMBIGUOUS"
  | "UNIT_CONVERSION_MISSING"
  | "PRICE_SOURCE_MISSING"
  | "PRICE_EXPIRED"
  | "REGION_PRICE_MISSING"
  | "CURRENCY_RATE_MISSING"
  | "PRICE_MODEL_INCOMPATIBLE"
  | "LABOR_PRICING_METHOD_CONFLICT"
  | "MACHINE_RATE_SCOPE_INCOMPLETE"
  | "SERVICE_SCOPE_INCOMPLETE"
  | "TAX_POLICY_MISSING"
  | "DELIVERY_CALCULATION_MISSING"
  | "LICENSE_REQUIRED"
  | "SUPPLIER_CONFIRMATION_REQUIRED";

export type KgRegionalPricingBlockerSeverity = "required" | "advisory";

export type KgRegionalPricingScope = "VALIDATED_SCOPE" | "QUARANTINED_SCOPE";

export type PricingBlockerLedgerEntry = {
  blocker_id: string;
  work_ids: string[];
  resource_code: string;
  price_key_id: string | null;
  blocker_type: KgRegionalPricingBlockerType;
  severity: KgRegionalPricingBlockerSeverity;
  reason_ru: string;
  source_evidence: Record<string, string | number | boolean | null>;
  owner: string;
  required_action: string;
  created_at: string;
  resolved_at: string | null;
  resolution: string | null;
};

export type KgRegionalPricingAuditSummary = {
  target_status: typeof S_AI_ESTIMATE_11610_KG_REGIONAL_PRICEBOOK_RESOURCE_MATCHING_LABOR_EQUIPMENT_LOGISTICS_TAX_SUPPLIER_QUOTE_AND_BLOCKER_QUARANTINE_NO_RELEASE;
  final_status: KgRegionalPricingFinalStatus;
  catalog_total: number;
  priceable_work_passports: number;
  upstream_blocked_passports: number;
  priceable_resource_rows: number;
  unique_price_keys: number;
  price_key_coverage_percent: number;
  resource_price_keys_resolved_percent: number;
  material_price_keys_count: number;
  labor_rate_keys_count: number;
  service_price_keys_count: number;
  equipment_rate_keys_count: number;
  machine_rate_keys_count: number;
  ambiguous_price_keys: number;
  cross_specification_price_matches: number;
  identical_resource_price_key_violations: number;
  fake_zero_prices: number;
  silent_regional_fallbacks: number;
  untraced_currency_conversions: number;
  double_applied_waste: number;
  double_applied_labor: number;
  wrong_package_conversions: number;
  expired_prices_used_as_current: number;
  ambiguous_matches_auto_accepted: number;
  contractual_price_count: number;
  supplier_verified_count: number;
  official_reference_count: number;
  market_reference_count: number;
  missing_price_count: number;
  expired_price_count: number;
  regional_fallback_count: number;
  license_blocked_count: number;
  versioned_price_source_registry_created: boolean;
  price_source_registry_version: string;
  price_source_records_count: number;
  price_source_metadata_count: number;
  runtime_network_required: false;
  unverified_price_source_records_count: number;
  price_model_incompatible_records_count: number;
  labor_pricing_method_conflict_records_count: number;
  machine_rate_scope_incomplete_records_count: number;
  service_scope_incomplete_records_count: number;
  blocker_ledger_entries: number;
  mandatory_blockers_count: number;
  price_source_missing_count: number;
  unit_conversion_missing_count: number;
  validated_scope_resource_rows: number;
  quarantined_scope_resource_rows: number;
  full_catalog_green_claimed: false;
  release_started: false;
  deploy_started: false;
  eas_started: false;
  native_build_started: false;
  production_db_touched: false;
  main_changed: false;
  pr44_changed: false;
};

export type KgRegionalPricingAuditResult = {
  summary: KgRegionalPricingAuditSummary;
  blockers: PricingBlockerLedgerEntry[];
  price_keys?: KgRegionalPriceKey[];
  resource_samples: KgRegionalPriceableResourceSpecification[];
};
