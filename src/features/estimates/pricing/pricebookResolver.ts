export type GovernedRegion = "KG" | "KZ" | "UZ" | "RU";
export type GovernedCurrency = "KGS" | "KZT" | "UZS" | "RUB" | "USD";

export type GovernedPriceSourceType =
  | "regional_ratebook"
  | "supplier_pricebook"
  | "supplier_quote"
  | "manual_override"
  | "ai_estimated_price"
  | "historical_price_only";

export type GovernedPriceSource = {
  price_source_id: string;
  price_source_type: GovernedPriceSourceType;
  price_source_version: string;
  region: GovernedRegion;
  currency: GovernedCurrency;
  unit: string;
  unit_price: number;
  valid_from: string;
  valid_to: string | null;
  confidence: "high" | "medium" | "low";
  manual_override: boolean;
  override_reason: string | null;
  review_status: "APPROVED_FOR_PRELIMINARY" | "APPROVED_FOR_PRODUCTION" | "NOT_REVIEWED" | "REJECTED";
  fx_source_id?: string | null;
};

export type GovernedPriceResolution = {
  price_status: "PRICE_VERIFIED" | "MISSING_PRICE" | "PRICE_REJECTED";
  unit_price_status: "READY" | "MISSING_PRICE" | "REJECTED";
  sum_status: "READY" | "NOT_CALCULATED";
  unit_price: number | null;
  total: number | null;
  display: string;
  source_display: string;
  full_total_status: "READY" | "NOT_FINAL";
  rejection_reason: string | null;
  price_source_id: string | null;
  price_source_type: GovernedPriceSourceType | null;
  price_source_version: string | null;
  region: GovernedRegion;
  currency: GovernedCurrency;
};

export function resolveGovernedPrice(input: {
  quantity: number;
  unit: string;
  region: GovernedRegion;
  currency: GovernedCurrency;
  source?: GovernedPriceSource | null;
}): GovernedPriceResolution {
  const source = input.source ?? null;
  if (!source) {
    return {
      price_status: "MISSING_PRICE",
      unit_price_status: "MISSING_PRICE",
      sum_status: "NOT_CALCULATED",
      unit_price: null,
      total: null,
      display: "Цена не заполнена",
      source_display: "Источник цены не выбран",
      full_total_status: "NOT_FINAL",
      rejection_reason: null,
      price_source_id: null,
      price_source_type: null,
      price_source_version: null,
      region: input.region,
      currency: input.currency,
    };
  }

  const rejection = [
    source.price_source_type === "ai_estimated_price" ? "AI_ESTIMATED_PRICE_REJECTED" : "",
    source.price_source_type === "historical_price_only" ? "HISTORICAL_UNVERIFIED_PRICE_REJECTED" : "",
    source.currency !== input.currency && !source.fx_source_id ? "CURRENCY_MISMATCH_WITHOUT_FX_SOURCE" : "",
    source.review_status === "REJECTED" ? "PRICE_SOURCE_REJECTED" : "",
    source.unit !== input.unit ? "UNIT_MISMATCH" : "",
    source.unit_price <= 0 ? "NON_POSITIVE_PRICE" : "",
  ].filter(Boolean)[0] ?? null;

  if (rejection) {
    return {
      price_status: "PRICE_REJECTED",
      unit_price_status: "REJECTED",
      sum_status: "NOT_CALCULATED",
      unit_price: null,
      total: null,
      display: "Цена не заполнена",
      source_display: "Источник цены отклонен",
      full_total_status: "NOT_FINAL",
      rejection_reason: rejection,
      price_source_id: source.price_source_id,
      price_source_type: source.price_source_type,
      price_source_version: source.price_source_version,
      region: input.region,
      currency: input.currency,
    };
  }

  const total = Number((input.quantity * source.unit_price).toFixed(2));
  return {
    price_status: "PRICE_VERIFIED",
    unit_price_status: "READY",
    sum_status: "READY",
    unit_price: source.unit_price,
    total,
    display: `${source.unit_price} ${source.currency}`,
    source_display: `${source.price_source_type}:${source.price_source_id}:${source.price_source_version}`,
    full_total_status: "READY",
    rejection_reason: null,
    price_source_id: source.price_source_id,
    price_source_type: source.price_source_type,
    price_source_version: source.price_source_version,
    region: input.region,
    currency: input.currency,
  };
}

export function assertNoFakePrices(rows: readonly GovernedPriceResolution[]): boolean {
  return rows.every((row) =>
    row.price_status !== "MISSING_PRICE" ||
    (row.unit_price === null && row.total === null && row.display === "Цена не заполнена" && row.source_display === "Источник цены не выбран")
  );
}
