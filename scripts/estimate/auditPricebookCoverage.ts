import regions from "../../data/estimate-pricebooks/regions.json";
import currencies from "../../data/estimate-pricebooks/currencies.json";
import pricebookIndex from "../../data/estimate-pricebooks/pricebook-index.json";
import sampleRatebookKg from "../../data/estimate-pricebooks/sample-ratebook-kg.json";
import { auditPricebookCoverage as runPricebookCoverageAudit } from "../../src/features/estimates/pricing/pricebookCoverageAudit";
import { resolveGovernedPrice, type GovernedPriceSource } from "../../src/features/estimates/pricing/pricebookResolver";

export function auditGovernedPricebookCoverage() {
  const core = runPricebookCoverageAudit();
  const sampleRow = sampleRatebookKg.rows[0];
  const sampleSource: GovernedPriceSource = {
    price_source_id: sampleRow.price_source_id,
    price_source_type: sampleRow.price_source_type as GovernedPriceSource["price_source_type"],
    price_source_version: sampleRatebookKg.version,
    region: sampleRatebookKg.region as GovernedPriceSource["region"],
    currency: sampleRatebookKg.currency as GovernedPriceSource["currency"],
    unit: sampleRow.unit,
    unit_price: sampleRow.unit_price,
    valid_from: sampleRow.valid_from,
    valid_to: sampleRow.valid_to,
    confidence: sampleRow.confidence as GovernedPriceSource["confidence"],
    manual_override: false,
    override_reason: null,
    review_status: sampleRow.review_status as GovernedPriceSource["review_status"],
  };
  const resolved = resolveGovernedPrice({
    quantity: 10,
    unit: sampleRow.unit,
    region: "KG",
    currency: "KGS",
    source: sampleSource,
  });
  const usdWithoutFx = resolveGovernedPrice({
    quantity: 10,
    unit: sampleRow.unit,
    region: "KG",
    currency: "USD",
    source: sampleSource,
  });
  const supportedRegions = new Set(regions.regions.map((item) => item.region));
  const supportedCurrencies = new Set([...currencies.currencies, currencies.reference_currency]);
  const blockers = [
    core.pricebook_registry_created ? "" : "pricebook_registry_missing",
    core.pricebook_resolver_exists ? "" : "pricebook_resolver_missing",
    pricebookIndex.pricebooks.length > 0 ? "" : "pricebook_index_empty",
    sampleRatebookKg.rows.length > 0 ? "" : "sample_ratebook_empty",
    ["KG", "KZ", "UZ", "RU"].every((region) => supportedRegions.has(region)) ? "" : "required_regions_missing",
    ["KGS", "KZT", "UZS", "RUB", "USD"].every((currency) => supportedCurrencies.has(currency)) ? "" : "required_currencies_missing",
    resolved.total === 12000 ? "" : `sample_ratebook_total:${resolved.total}`,
    usdWithoutFx.price_status === "PRICE_REJECTED" ? "" : "usd_without_fx_not_rejected",
  ].filter(Boolean);

  return {
    ...core,
    estimate_region_required: true,
    estimate_currency_required: true,
    pricebook_version_visible: Boolean(pricebookIndex.pricebooks[0]?.version),
    fx_source_required_for_currency_conversion: usdWithoutFx.price_status === "PRICE_REJECTED",
    no_cross_currency_total_without_fx: usdWithoutFx.total === null,
    region_specific_pricebook_selected: pricebookIndex.pricebooks.some((book) => book.region === "KG" && book.currency === "KGS"),
    supported_regions_count: regions.regions.length,
    supported_currencies_count: currencies.currencies.length,
    sample_pricebook_total_correct: resolved.total === 12000,
    pricebook_coverage_audit_passed: blockers.length === 0 && Object.values(core).every((value) => value === true),
    blockers,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditPricebookCoverage.ts")) {
  const result = auditGovernedPricebookCoverage();
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.pricebook_coverage_audit_passed ? 0 : 1;
}
