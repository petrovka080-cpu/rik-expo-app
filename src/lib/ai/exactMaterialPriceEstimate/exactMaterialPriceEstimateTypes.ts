import type { EstimatePdfViewModel } from "../../../lib/estimatePdf/estimatePdfTypes";
import type { GlobalEstimateResult, GlobalUnitInput } from "../globalEstimate/globalEstimateTypes";

export type ExactMaterialCurrency = "KGS" | "USD" | "RUB" | "EUR";

export type ExactMaterialRateUnit =
  | GlobalUnitInput["normalizedUnit"]
  | "m2"
  | "m"
  | "bag"
  | "piece"
  | "liter";

export type PricebookMaterialRateStatus = "VERIFIED" | "MISSING" | "STALE" | "CONFLICTING";

export type ExactMaterialPriceStatus = "VERIFIED" | "PRICE_MISSING" | "STALE" | "CONFLICTING";

export type ExactEstimateTotalStatus = "COMPLETE" | "PARTIAL_PRICE_MISSING";

export type ExactPricebookSourceType =
  | "seeded_ratebook"
  | "supplier_catalog"
  | "manual_verified"
  | "imported_csv";

export type PricebookMaterialRate = {
  material_id: string;
  material_visible_name_ru: string;
  category: string;
  unit: ExactMaterialRateUnit;
  visible_unit_ru: string;
  price_value: number | null;
  currency: ExactMaterialCurrency;
  price_status: PricebookMaterialRateStatus;
  supplier_id: string | null;
  supplier_visible_name: string | null;
  region: string;
  captured_at: string;
  valid_from: string | null;
  valid_to: string | null;
  source_type: ExactPricebookSourceType;
  source_reference: string | null;
  confidence: number;
  tax_included: boolean;
  delivery_included: boolean;
  fake_price_claimed: false;
  rate_key_aliases?: readonly string[];
};

export type ExactPriceGovernanceStatus =
  | "VERIFIED_PRICE_SELECTED"
  | "PRICE_MISSING"
  | "STALE_PRICE_BLOCKED"
  | "CONFLICTING_PRICE_BLOCKED";

export type ExactPriceSourceAuditTrail = {
  selected_rate_id: string | null;
  material_id: string;
  requested_rate_key: string | null;
  unit: string;
  region: string;
  currency: ExactMaterialCurrency;
  price_date: string;
  price_status: ExactMaterialPriceStatus;
  source_type: ExactPricebookSourceType | null;
  source_reference: string | null;
  supplier_id: string | null;
  supplier_visible_name: string | null;
  captured_at: string | null;
  valid_from: string | null;
  valid_to: string | null;
  confidence: number;
  alternatives_count: number;
  validation_failures: string[];
};

export type ExactPriceResolution = {
  material_id: string;
  requested_rate_key: string | null;
  requested_unit: string;
  region: string;
  price_date: string;
  currency: ExactMaterialCurrency;
  price_status: ExactMaterialPriceStatus;
  rate: PricebookMaterialRate | null;
  price_value: number | null;
  supplier_id: string | null;
  supplier_visible_name: string | null;
  captured_at: string | null;
  valid_from: string | null;
  valid_to: string | null;
  source_type: ExactPricebookSourceType | null;
  source_reference: string | null;
  confidence: number;
  alternatives_count: number;
  fake_price_claimed: false;
  fake_supplier_claimed: false;
  governance_status?: ExactPriceGovernanceStatus;
  price_source_audit?: ExactPriceSourceAuditTrail;
  validation_failures?: string[];
};

export type WorkMaterialRecipe = {
  work_key: string;
  work_visible_name_ru: string;
  category: string;
  base_unit: GlobalUnitInput["normalizedUnit"];
  material_rows: ExactRecipeMaterialRow[];
  labor_rows: ExactRecipeLaborRow[];
  control_rows: ExactRecipeControlRow[];
};

export type ExactRecipeMaterialRow = {
  material_id: string;
  material_visible_name_ru: string;
  consumption_per_unit: number;
  consumption_unit: string;
  waste_percent: number;
  formula: string;
  required: boolean;
  price_required: boolean;
  source_row_code: string;
  source_rate_key: string | null;
};

export type ExactRecipeLaborRow = {
  labor_key: string;
  labor_visible_name_ru: string;
  norm_per_unit: number;
  unit: string;
};

export type ExactRecipeControlRow = {
  label_ru: string;
  is_paid: false;
};

export type ExactMaterialPriceLine = ExactRecipeMaterialRow & {
  row_number: string;
  quantity: number;
  unit: string;
  visible_quantity: string;
  price_status: ExactMaterialPriceStatus;
  price_value: number | null;
  visible_unit_price: string;
  line_total: number | null;
  visible_line_total: string;
  currency: ExactMaterialCurrency;
  supplier_id: string | null;
  supplier_visible_name: string | null;
  region: string;
  price_captured_at: string | null;
  valid_from: string | null;
  valid_to: string | null;
  source_type: ExactPricebookSourceType | null;
  source_reference: string | null;
  confidence: number;
  alternatives_count: number;
  governance_status: ExactPriceGovernanceStatus;
  price_source_audit: ExactPriceSourceAuditTrail;
  validation_failures: string[];
  fake_price_claimed: false;
  fake_supplier_claimed: false;
};

export type ExactEstimateVisibleRow = {
  row_number: string;
  material_name: string;
  quantity: string;
  unit_price: string;
  line_total: string;
  price_status: ExactMaterialPriceStatus;
  source_label: string;
};

export type ExactEstimateCatalogBindingRow = {
  visible_material_name: string;
  search_query: string;
  price_status: ExactMaterialPriceStatus;
  source_label: string;
};

export type ExactMaterialPriceEstimateInput = {
  text: string;
  selectedWorkKey?: string;
  volume?: number;
  unit?: string;
  countryCode?: string;
  city?: string;
  region?: string;
  priceDate?: string;
  currency?: ExactMaterialCurrency;
  language?: string;
};

export type ExactMaterialPriceEstimate = {
  estimate_id: string;
  source_global_estimate_id: string;
  source_global_estimate: GlobalEstimateResult;
  work: {
    work_key: string;
    visible_name_ru: string;
    category: string;
  };
  input: {
    original_text: string;
    quantity: number;
    unit: string;
    visible_quantity: string;
    selected_work_key: string | null;
  };
  recipe: WorkMaterialRecipe;
  material_lines: ExactMaterialPriceLine[];
  catalog_binding: ExactEstimateCatalogBindingRow[];
  totals: {
    currency: ExactMaterialCurrency;
    materials_known_total: number;
    labor_known_total: number | null;
    grand_known_total: number | null;
    missing_price_rows_count: number;
    total_status: ExactEstimateTotalStatus;
    visible_materials_known_total: string;
    visible_grand_total: string;
  };
  ui_model: {
    title: string;
    work_label: string;
    quantity_label: string;
    rows: ExactEstimateVisibleRow[];
    totals_label: string;
    visible_text_lines: string[];
  };
  pdf_model: EstimatePdfViewModel;
  policy: {
    random_prices_allowed: false;
    hidden_fallback_prices_allowed: false;
    fake_suppliers_allowed: false;
    fake_price_claimed: false;
    fake_supplier_claimed: false;
  };
};
