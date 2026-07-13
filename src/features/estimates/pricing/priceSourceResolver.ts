import type {
  EstimateRatebookRowInput,
  EstimateRatebookSource,
  EstimateResolvedPriceSource,
} from "./ratebookTypes";

const MISSING_PRICE_DISPLAY = "Цена не заполнена";
const MISSING_SOURCE_DISPLAY = "Источник цены не выбран";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizedUnit(value: string): string {
  const unit = value.trim().toLowerCase();
  if (unit === "m2" || unit === "sqm" || unit === "sq_m") return "m2";
  if (unit === "lm" || unit === "linear_m") return "linear_m";
  if (unit === "pcs" || unit === "piece" || unit === "pc") return "piece";
  return unit;
}

function missing(row: EstimateRatebookRowInput): EstimateResolvedPriceSource {
  return {
    price_status: "MISSING_PRICE",
    price_source_id: null,
    price_source_type: null,
    price_source_version: null,
    region: null,
    currency: row.currency,
    valid_from: null,
    valid_to: null,
    unit: row.unit,
    unit_price: null,
    sum: null,
    unit_price_status: "MISSING_PRICE",
    sum_status: "NOT_CALCULATED",
    display: MISSING_PRICE_DISPLAY,
    source_display: MISSING_SOURCE_DISPLAY,
    manual_override: false,
    confidence: "missing",
    rejection_reason: null,
  };
}

function rejected(
  row: EstimateRatebookRowInput,
  source: EstimateRatebookSource,
  reason: string,
): EstimateResolvedPriceSource {
  return {
    ...missing(row),
    price_status: "REJECTED_PRICE_SOURCE",
    price_source_id: source.price_source_id,
    price_source_type: source.price_source_type,
    price_source_version: source.price_source_version,
    region: source.region,
    valid_from: source.valid_from,
    valid_to: source.valid_to,
    unit_price_status: "REJECTED",
    sum_status: "REJECTED",
    source_display: reason,
    rejection_reason: reason,
  };
}

export function resolveEstimateRowPriceSource(input: {
  row: EstimateRatebookRowInput;
  source?: EstimateRatebookSource | null;
}): EstimateResolvedPriceSource {
  const { row, source } = input;
  if (!source) return missing(row);
  if (source.price_source_type === "historical_price_only") {
    return rejected(row, source, "historical_price_without_ratebook_rejected");
  }
  if (source.price_source_type === "ai_estimated_price") {
    return rejected(row, source, "ai_price_rejected");
  }
  if (source.currency !== row.currency) {
    return rejected(row, source, "currency_mismatch_rejected");
  }
  if (normalizedUnit(source.unit) !== normalizedUnit(row.unit)) {
    return rejected(row, source, "unit_mismatch_rejected");
  }
  if (!Number.isFinite(source.unit_price) || source.unit_price <= 0) {
    return rejected(row, source, "invalid_unit_price_rejected");
  }
  const sum = roundMoney(row.quantity * source.unit_price);
  return {
    price_status: "PRICED",
    price_source_id: source.price_source_id,
    price_source_type: source.price_source_type,
    price_source_version: source.price_source_version,
    region: source.region,
    currency: source.currency,
    valid_from: source.valid_from,
    valid_to: source.valid_to,
    unit: source.unit,
    unit_price: source.unit_price,
    sum,
    unit_price_status: "OK",
    sum_status: "CALCULATED",
    display: `${source.unit_price} ${source.currency}/${source.unit}`,
    source_display: `${source.price_source_type}:${source.price_source_id}@${source.price_source_version}`,
    manual_override: row.manual_override === true || source.price_source_type === "manual_override",
    confidence: source.confidence,
    rejection_reason: null,
  };
}
