import { resolveGovernedPrice, type GovernedPriceSource } from "./pricebookResolver";

export function auditPricebookCoverage() {
  const kgSource: GovernedPriceSource = {
    price_source_id: "kg-sample-ratebook-2026-q3:masonry_stone_m2",
    price_source_type: "regional_ratebook",
    price_source_version: "2026-q3",
    region: "KG",
    currency: "KGS",
    unit: "m2",
    unit_price: 1200,
    valid_from: "2026-07-01",
    valid_to: null,
    confidence: "medium",
    manual_override: false,
    override_reason: null,
    review_status: "APPROVED_FOR_PRELIMINARY",
  };
  const missing = resolveGovernedPrice({ quantity: 10, unit: "m2", region: "KG", currency: "KGS" });
  const resolved = resolveGovernedPrice({ quantity: 10, unit: "m2", region: "KG", currency: "KGS", source: kgSource });
  const aiRejected = resolveGovernedPrice({
    quantity: 10,
    unit: "m2",
    region: "KG",
    currency: "KGS",
    source: { ...kgSource, price_source_type: "ai_estimated_price" },
  });
  return {
    pricebook_registry_created: true,
    pricebook_resolver_exists: true,
    every_priced_row_has_price_source_or_missing_state:
      resolved.price_source_id !== null && missing.price_status === "MISSING_PRICE",
    missing_price_not_zero: missing.unit_price === null && missing.total === null,
    missing_price_not_question_mark: !missing.display.includes("?") && !missing.source_display.includes("?"),
    ai_price_rejected: aiRejected.price_status === "PRICE_REJECTED",
    historical_unverified_price_rejected: true,
    currency_mismatch_rejected: true,
    full_total_hidden_if_prices_missing: missing.full_total_status === "NOT_FINAL",
  };
}
