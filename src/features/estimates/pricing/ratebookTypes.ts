export type EstimateRatebookPriceSourceType =
  | "regional_ratebook"
  | "supplier_pricebook"
  | "supplier_quote"
  | "catalog_price"
  | "manual_override"
  | "historical_price_only"
  | "ai_estimated_price";

export type EstimateRatebookPriceStatus =
  | "PRICED"
  | "MISSING_PRICE"
  | "REJECTED_PRICE_SOURCE";

export type EstimateRatebookRowInput = {
  row_id: string;
  unit: string;
  quantity: number;
  currency: string;
  unit_price?: number | null;
  manual_override?: boolean;
};

export type EstimateRatebookSource = {
  price_source_id: string;
  price_source_type: EstimateRatebookPriceSourceType;
  price_source_version: string;
  region: string;
  currency: string;
  valid_from: string;
  valid_to: string | null;
  unit: string;
  unit_price: number;
  confidence: "high" | "medium" | "low";
};

export type EstimateResolvedPriceSource = {
  price_status: EstimateRatebookPriceStatus;
  price_source_id: string | null;
  price_source_type: EstimateRatebookPriceSourceType | null;
  price_source_version: string | null;
  region: string | null;
  currency: string;
  valid_from: string | null;
  valid_to: string | null;
  unit: string;
  unit_price: number | null;
  sum: number | null;
  unit_price_status: "OK" | "MISSING_PRICE" | "REJECTED";
  sum_status: "CALCULATED" | "NOT_CALCULATED" | "REJECTED";
  display: string;
  source_display: string;
  manual_override: boolean;
  confidence: "high" | "medium" | "low" | "missing";
  rejection_reason: string | null;
};
