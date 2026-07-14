import type {
  ProfessionalCurrency,
  ProfessionalEstimateUnit,
  ProfessionalGroupKey,
  ProfessionalRegion,
} from "../professionalEstimateTemplates/professionalEstimateTypes";

export const MARKET_PRICEBOOK_WAVE =
  "S_REAL_MARKET_MATERIAL_PRICEBOOK_COVERAGE_CORE_CLOSEOUT_POINT_OF_NO_RETURN" as const;

export const GREEN_MARKET_PRICEBOOK =
  "GREEN_REAL_MARKET_MATERIAL_PRICEBOOK_COVERAGE_CORE_READY" as const;

export const MARKET_PRICEBOOK_VERSION = "market-pricebook-v1" as const;
export const MARKET_PRICEBOOK_UPDATED_AT = "2026-06-13" as const;
export const MARKET_PRICEBOOK_AUDIT_DATE = "2026-06-15" as const;

export type MarketMaterialCategory =
  | "flooring"
  | "tile"
  | "masonry"
  | "concrete"
  | "reinforcement"
  | "waterproofing"
  | "roofing"
  | "electrical"
  | "low_voltage"
  | "plumbing"
  | "heating"
  | "ventilation"
  | "paint"
  | "drywall"
  | "facade"
  | "earthworks"
  | "paving"
  | "equipment"
  | "labor"
  | "delivery";

export type MarketPriceSourceKind =
  | "catalog_item"
  | "regional_pricebook"
  | "supplier_pricebook"
  | "admin_imported_csv"
  | "manual_verified_ratebook";

export type MarketFreshnessStatus = "FRESH" | "STALE" | "EXPIRED" | "UNKNOWN";

export type MarketMaterialMasterItem = {
  material_key: string;
  visible_name_ru: string;
  category: MarketMaterialCategory;
  base_unit: ProfessionalEstimateUnit;
  aliases_ru: string[];
  compatible_work_groups: ProfessionalGroupKey[];
  forbidden_work_groups: ProfessionalGroupKey[];
  active: boolean;
  source: "professional_template" | "mandatory_family";
  fake_green_claimed: false;
};

export type MarketMaterialAlias = {
  alias_ru: string;
  material_key: string;
  normalized_alias: string;
};

export type MarketUnitConversion = {
  conversion_key: string;
  from_unit: ProfessionalEstimateUnit;
  to_unit: ProfessionalEstimateUnit;
  factor: number;
  policy: "exact" | "manual_verified";
  fake_green_claimed: false;
};

export type MarketPriceSource = {
  source_id: string;
  region: ProfessionalRegion;
  currency: ProfessionalCurrency;
  source_kind: MarketPriceSourceKind;
  source_name: string;
  allowed_for_production: boolean;
  used_for_test_only: boolean;
  production_price_claimed: boolean;
  freshness_days: number;
  fake_supplier: false;
  fake_green_claimed: false;
};

export type MarketGovernedPrice = {
  price_id: string;
  material_key: string;
  visible_name_ru: string;
  region: ProfessionalRegion;
  currency: ProfessionalCurrency;
  unit: ProfessionalEstimateUnit;
  unit_price: number;
  source_kind: MarketPriceSourceKind;
  source_name: string;
  source_url_or_document_id?: string;
  source_updated_at: string;
  confidence: number;
  freshness_status: MarketFreshnessStatus;
  snapshot_id: string;
  fake_price_claimed: false;
  fake_supplier_claimed: false;
};

export type MarketMissingMaterialQueueItem = {
  queue_id: string;
  selected_work_key: string;
  row_key: string;
  expected_material_key: string;
  visible_name_ru: string;
  row_domain: ProfessionalGroupKey;
  reason: "MATERIAL_MISSING";
  fake_green_claimed: false;
};

export type MarketMissingPriceQueueItem = {
  queue_id: string;
  selected_work_key: string;
  row_key: string;
  material_key: string;
  visible_name_ru: string;
  region: ProfessionalRegion;
  currency: ProfessionalCurrency;
  unit: ProfessionalEstimateUnit;
  reason: "PRICE_MISSING";
  fake_green_claimed: false;
};

export type MarketPricebookSnapshot = {
  snapshot_id: string;
  region: ProfessionalRegion;
  currency: ProfessionalCurrency;
  prices_count: number;
  rows_hash: string;
  created_at: string;
  immutable: true;
  fake_green_claimed: false;
};
