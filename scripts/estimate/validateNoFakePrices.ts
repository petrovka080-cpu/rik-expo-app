import {
  assertNoFakePrices,
  resolveGovernedPrice,
  type GovernedPriceSource,
} from "../../src/features/estimates/pricing/pricebookResolver";

function baseSource(): GovernedPriceSource {
  return {
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
}

export function validateNoFakePrices() {
  const source = baseSource();
  const missing = resolveGovernedPrice({ quantity: 10, unit: "m2", region: "KG", currency: "KGS" });
  const resolved = resolveGovernedPrice({ quantity: 10, unit: "m2", region: "KG", currency: "KGS", source });
  const ai = resolveGovernedPrice({
    quantity: 10,
    unit: "m2",
    region: "KG",
    currency: "KGS",
    source: { ...source, price_source_type: "ai_estimated_price" },
  });
  const historical = resolveGovernedPrice({
    quantity: 10,
    unit: "m2",
    region: "KG",
    currency: "KGS",
    source: { ...source, price_source_type: "historical_price_only" },
  });
  const currencyMismatch = resolveGovernedPrice({
    quantity: 10,
    unit: "m2",
    region: "KG",
    currency: "USD",
    source,
  });
  const zero = resolveGovernedPrice({
    quantity: 10,
    unit: "m2",
    region: "KG",
    currency: "KGS",
    source: { ...source, unit_price: 0 },
  });
  const blockers = [
    resolved.total === 12000 ? "" : `resolved_total:${resolved.total}`,
    assertNoFakePrices([missing]) ? "" : "missing_price_fake_value",
    missing.unit_price === null && missing.total === null ? "" : "missing_price_not_null",
    !missing.display.includes("?") && !missing.source_display.includes("?") ? "" : "missing_price_question_mark",
    missing.full_total_status === "NOT_FINAL" ? "" : "missing_price_final_total_allowed",
    ai.price_status === "PRICE_REJECTED" ? "" : "ai_price_not_rejected",
    historical.price_status === "PRICE_REJECTED" ? "" : "historical_price_not_rejected",
    currencyMismatch.price_status === "PRICE_REJECTED" ? "" : "currency_mismatch_not_rejected",
    zero.price_status === "PRICE_REJECTED" ? "" : "zero_price_not_rejected",
  ].filter(Boolean);

  return {
    no_fake_prices_validation_passed: blockers.length === 0,
    every_priced_row_has_price_source_or_missing_state: Boolean(resolved.price_source_id && missing.price_status === "MISSING_PRICE"),
    missing_price_not_zero: missing.unit_price === null && missing.total === null,
    missing_price_not_question_mark: !missing.display.includes("?") && !missing.source_display.includes("?"),
    ai_price_rejected: ai.price_status === "PRICE_REJECTED",
    historical_unverified_price_rejected: historical.price_status === "PRICE_REJECTED",
    currency_mismatch_rejected: currencyMismatch.price_status === "PRICE_REJECTED",
    zero_missing_price_rejected: zero.price_status === "PRICE_REJECTED",
    full_total_hidden_if_prices_missing: missing.full_total_status === "NOT_FINAL",
    blockers,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/validateNoFakePrices.ts")) {
  const result = validateNoFakePrices();
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.no_fake_prices_validation_passed ? 0 : 1;
}
