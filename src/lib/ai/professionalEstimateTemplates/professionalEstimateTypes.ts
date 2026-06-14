export const PROFESSIONAL_ESTIMATE_TEMPLATE_WAVE =
  "S_PROFESSIONAL_EXPANDED_ESTIMATE_ROW_ISOLATION_1500_CLOSEOUT_POINT_OF_NO_RETURN" as const;

export const GREEN_PROFESSIONAL_ESTIMATE_TEMPLATE_ENGINE =
  "GREEN_PROFESSIONAL_EXPANDED_ESTIMATE_ROW_ISOLATION_1500_READY" as const;

export type ProfessionalGroupKey =
  | "demolition"
  | "earthworks"
  | "foundation_concrete"
  | "reinforcement_formwork"
  | "masonry"
  | "waterproofing"
  | "roofing"
  | "insulation"
  | "facade"
  | "plaster_putty_paint"
  | "drywall_ceiling"
  | "tile_stone"
  | "flooring"
  | "doors_windows"
  | "electrical_power"
  | "low_voltage_security"
  | "plumbing_sewerage"
  | "heating_hvac"
  | "ventilation_ac"
  | "paving_landscape"
  | "special_repair";

export type ProfessionalRegion =
  | "KG_BISHKEK"
  | "KG_OSH"
  | "KZ_ALMATY"
  | "KZ_ASTANA"
  | "RU_DEFAULT"
  | "UZ_TASHKENT";

export type ProfessionalCurrency = "KGS" | "KZT" | "RUB" | "UZS";

export type ProfessionalEstimateUnit =
  | "m2"
  | "m3"
  | "linear_m"
  | "piece"
  | "set"
  | "kg"
  | "ton"
  | "bag"
  | "roll"
  | "bucket"
  | "hour"
  | "shift"
  | "trip";

export type ProfessionalEstimateCaseUnit =
  | "m2"
  | "m3"
  | "linear_m"
  | "piece"
  | "set"
  | "kg"
  | "ton";

export type ProfessionalEstimateRowKind =
  | "material"
  | "labor"
  | "equipment"
  | "delivery"
  | "overhead"
  | "waste";

export type ProfessionalParameterDefinition = {
  parameter_key: string;
  visible_name_ru: string;
  value_type: "number" | "boolean" | "enum" | "text";
  required: boolean;
  unit?: ProfessionalEstimateUnit;
  allowed_values?: string[];
  default_value?: string | number | boolean;
};

export type ProfessionalWorkGroupTemplate = {
  group_key: ProfessionalGroupKey;
  category: string;
  visible_name_ru: string;
  allowed_row_domains: ProfessionalGroupKey[];
  forbidden_row_domains: ProfessionalGroupKey[];
  default_units: ProfessionalEstimateUnit[];
  common_parameter_schema: ProfessionalParameterDefinition[];
  common_row_kinds: ProfessionalEstimateRowKind[];
  forbidden_generic_rows: string[];
  required_snapshot_fields: string[];
  required_work_specific_template: true;
};

export type ProfessionalPriceSourcePolicy =
  | "catalog_price"
  | "regional_pricebook"
  | "supplier_pricebook"
  | "manual_verified"
  | "missing_allowed";

export type ProfessionalEstimateRowSourcePolicy =
  | "work_specific_template"
  | "group_template_addon"
  | "calculated_required_addon";

export type ProfessionalEstimateRecipeRow = {
  row_key: string;
  row_kind: ProfessionalEstimateRowKind;
  row_domain: ProfessionalGroupKey;
  visible_name_ru: string;
  material_key: string | null;
  catalog_item_id: string | null;
  unit: ProfessionalEstimateUnit;
  quantity_formula: string;
  waste_percent: number;
  is_required: boolean;
  price_required: boolean;
  price_source_policy: ProfessionalPriceSourcePolicy;
  allowed_work_keys: string[];
  forbidden_work_keys: string[];
  source_policy: ProfessionalEstimateRowSourcePolicy;
  paid_control_row: false;
  forbidden_as_paid_control_row: boolean;
};

export type ProfessionalTemplateStatus =
  | "SUPPORTED"
  | "PARTIAL_TEMPLATE"
  | "MATERIAL_RECIPE_MISSING"
  | "PRICEBOOK_SCOPE_MISSING"
  | "UNSUPPORTED";

export type ProfessionalWorkSpecificTemplate = {
  canonical_work_key: string;
  group_key: ProfessionalGroupKey;
  visible_work_name_ru: string;
  supported: boolean;
  parameter_schema: ProfessionalParameterDefinition[];
  material_recipe_rows: ProfessionalEstimateRecipeRow[];
  labor_rows: ProfessionalEstimateRecipeRow[];
  equipment_rows: ProfessionalEstimateRecipeRow[];
  delivery_rows: ProfessionalEstimateRecipeRow[];
  overhead_rows: ProfessionalEstimateRecipeRow[];
  required_material_keys: string[];
  optional_material_keys: string[];
  catalog_binding_required: boolean;
  pricebook_scope_required: boolean;
  region_pricebook_scopes: Partial<Record<ProfessionalRegion, string>>;
  template_status: ProfessionalTemplateStatus;
  version: string;
  material_recipe_version: string;
  ontology_entry_key: string | null;
};

export type ProfessionalEstimateStatus =
  | "ESTIMATE_READY"
  | "PARTIAL_PRICE_MISSING"
  | "MATERIAL_RECIPE_MISSING"
  | "PRICEBOOK_SCOPE_MISSING"
  | "AMBIGUOUS_WORK_INPUT"
  | "WORK_NOT_SUPPORTED";

export type ProfessionalEstimate1500Case = {
  id: string;
  user_input_ru: string;
  expected_status: ProfessionalEstimateStatus;
  expected_canonical_work_key?: string;
  acceptable_canonical_work_keys?: string[];
  must_not_match?: string[];
  expected_group_key: ProfessionalGroupKey;
  region: ProfessionalRegion;
  expected_currency: ProfessionalCurrency;
  quantity: number;
  unit: ProfessionalEstimateCaseUnit;
  required_material_names_ru_min: string[];
  forbidden_material_names_ru: string[];
  expected_row_kinds_min: Exclude<ProfessionalEstimateRowKind, "waste">[];
  price_required: boolean;
  allow_price_missing: boolean;
  snapshot_required: true;
};

export type ProfessionalDeepGoldenCase = {
  id: string;
  input: string;
  selected_work_key: string;
  quantity: number;
  unit: ProfessionalEstimateCaseUnit;
  region: ProfessionalRegion;
  must_include_materials: string[];
  must_not_include: string[];
  must_include_row_kinds: Exclude<ProfessionalEstimateRowKind, "waste">[];
  currency: ProfessionalCurrency;
};

export type ProfessionalPriceSourceKind =
  | "catalog_price"
  | "supplier_pricebook"
  | "admin_imported_pricebook"
  | "manual_verified_pricebook";

export type ProfessionalGovernedPrice = {
  material_key: string;
  region: ProfessionalRegion;
  currency: ProfessionalCurrency;
  unit: ProfessionalEstimateUnit;
  unit_price: number;
  source_kind: ProfessionalPriceSourceKind;
  source_name: string;
  source_updated_at: string;
  confidence: number;
  snapshot_id: string;
};

export type ProfessionalPriceStatus = "PRICE_VERIFIED" | "PRICE_MISSING";

export type ProfessionalPriceResolution = {
  material_key: string | null;
  region: ProfessionalRegion;
  currency: ProfessionalCurrency;
  unit: ProfessionalEstimateUnit;
  price_status: ProfessionalPriceStatus;
  unit_price: number | null;
  line_total: number | null;
  source_kind: ProfessionalPriceSourceKind | null;
  source_name: string | null;
  source_updated_at: string | null;
  confidence: number | null;
  snapshot_id: string | null;
  fake_price_claimed: false;
  fake_supplier_claimed: false;
};

export type ProfessionalEstimateLine = {
  row_key: string;
  row_kind: ProfessionalEstimateRowKind;
  row_domain: ProfessionalGroupKey;
  visible_name_ru: string;
  material_key: string | null;
  unit: ProfessionalEstimateUnit;
  quantity: number;
  waste_percent: number;
  price_required: boolean;
  price: ProfessionalPriceResolution;
  source_policy: ProfessionalEstimateRowSourcePolicy;
  paid_control_row: false;
  forbidden_as_paid_control_row: boolean;
};

export type ProfessionalEstimateVisibleLine = {
  row_kind: ProfessionalEstimateRowKind;
  row_domain: ProfessionalGroupKey;
  visible_name_ru: string;
  quantity: number;
  unit: ProfessionalEstimateUnit;
  price_status: ProfessionalPriceStatus;
  unit_price: number | null;
  line_total: number | null;
  currency: ProfessionalCurrency;
};

export type ProfessionalEstimateSnapshot = {
  snapshot_id: string;
  selected_work_key: string;
  group_key: ProfessionalGroupKey;
  template_version: string;
  material_recipe_version: string;
  pricebook_snapshot_id: string;
  region: ProfessionalRegion;
  currency: ProfessionalCurrency;
  quantity: number;
  unit: ProfessionalEstimateCaseUnit;
  lines: ProfessionalEstimateLine[];
  visible_rows: ProfessionalEstimateVisibleLine[];
  totals: {
    estimate_total_status: "COMPLETE" | "PARTIAL_PRICE_MISSING";
    known_total: number | null;
    missing_price_rows_count: number;
    currency: ProfessionalCurrency;
  };
  ui_payload_hash: string;
  pdf_payload_hash: string;
  request_payload_hash: string;
  history_payload_hash: string;
  all_hashes_match: boolean;
  ui_repriced_after_snapshot: false;
  pdf_repriced_after_snapshot: false;
  history_repriced_after_snapshot: false;
  fake_green_claimed: false;
};
