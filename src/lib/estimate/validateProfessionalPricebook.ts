import {
  loadProfessionalPriceSources,
  loadProfessionalPricebookRecords,
} from "./professionalPricebookRegistry";
import type {
  ProfessionalPriceRecord,
  ProfessionalPriceSourceRecord,
} from "./professionalPricebookContract";

export type ProfessionalPricebookValidationSummary = {
  records_count: number;
  sources_count: number;
  material_pricebook_created: boolean;
  labor_rate_book_created: boolean;
  equipment_rate_book_created: boolean;
  service_rate_book_created: boolean;
  transport_rate_book_created: boolean;
  all_prices_have_source: boolean;
  all_prices_have_region: boolean;
  all_prices_have_retrieved_at: boolean;
  all_prices_have_currency: boolean;
  zero_or_negative_prices_count: number;
  trusted_contract_prices_require_source: boolean;
  price_without_source_count: number;
  price_without_region_count: number;
  price_without_retrieved_at_count: number;
  price_without_currency_count: number;
  trusted_contract_without_source_count: number;
  duplicate_price_id_count: number;
  duplicate_nomenclature_id_count: number;
  blocking_reasons: string[];
};

function duplicateCount(values: readonly string[]): number {
  const seen = new Set<string>();
  let duplicates = 0;
  for (const value of values) {
    if (seen.has(value)) duplicates += 1;
    seen.add(value);
  }
  return duplicates;
}

export function validateProfessionalPricebook(input: {
  records?: readonly ProfessionalPriceRecord[];
  sources?: readonly ProfessionalPriceSourceRecord[];
} = {}): ProfessionalPricebookValidationSummary {
  const records = [...(input.records ?? loadProfessionalPricebookRecords())];
  const sources = [...(input.sources ?? loadProfessionalPriceSources())];
  const sourceIds = new Set(sources.map((source) => source.sourceId));
  const priceWithoutSource = records.filter((record) => !record.sourceId || !sourceIds.has(record.sourceId));
  const priceWithoutRegion = records.filter((record) => !record.region?.trim());
  const priceWithoutRetrievedAt = records.filter((record) => !record.retrievedAt?.trim());
  const priceWithoutCurrency = records.filter((record) => !record.currency);
  const zeroOrNegative = records.filter((record) => !Number.isFinite(record.unitPrice) || record.unitPrice <= 0);
  const trustedContractWithoutSource = records.filter((record) =>
    record.trustLevel === "trusted_contract" && (!record.sourceId || !sourceIds.has(record.sourceId))
  );
  const duplicatePriceIdCount = duplicateCount(records.map((record) => record.priceId));
  const duplicateNomenclatureIdCount = duplicateCount(records.map((record) => record.nomenclatureId));
  const itemTypes = new Set(records.map((record) => record.itemType));
  const blockingReasons = [
    priceWithoutSource.length === 0 ? "" : `price_without_source:${priceWithoutSource.length}`,
    priceWithoutRegion.length === 0 ? "" : `price_without_region:${priceWithoutRegion.length}`,
    priceWithoutRetrievedAt.length === 0 ? "" : `price_without_retrieved_at:${priceWithoutRetrievedAt.length}`,
    priceWithoutCurrency.length === 0 ? "" : `price_without_currency:${priceWithoutCurrency.length}`,
    zeroOrNegative.length === 0 ? "" : `zero_or_negative_price:${zeroOrNegative.length}`,
    trustedContractWithoutSource.length === 0 ? "" : `trusted_contract_without_source:${trustedContractWithoutSource.length}`,
    duplicatePriceIdCount === 0 ? "" : `duplicate_price_id:${duplicatePriceIdCount}`,
    duplicateNomenclatureIdCount === 0 ? "" : `duplicate_nomenclature_id:${duplicateNomenclatureIdCount}`,
  ].filter(Boolean);
  return {
    records_count: records.length,
    sources_count: sources.length,
    material_pricebook_created: itemTypes.has("material"),
    labor_rate_book_created: itemTypes.has("labor"),
    equipment_rate_book_created: itemTypes.has("equipment"),
    service_rate_book_created: itemTypes.has("service"),
    transport_rate_book_created: itemTypes.has("transport"),
    all_prices_have_source: priceWithoutSource.length === 0,
    all_prices_have_region: priceWithoutRegion.length === 0,
    all_prices_have_retrieved_at: priceWithoutRetrievedAt.length === 0,
    all_prices_have_currency: priceWithoutCurrency.length === 0,
    zero_or_negative_prices_count: zeroOrNegative.length,
    trusted_contract_prices_require_source: trustedContractWithoutSource.length === 0,
    price_without_source_count: priceWithoutSource.length,
    price_without_region_count: priceWithoutRegion.length,
    price_without_retrieved_at_count: priceWithoutRetrievedAt.length,
    price_without_currency_count: priceWithoutCurrency.length,
    trusted_contract_without_source_count: trustedContractWithoutSource.length,
    duplicate_price_id_count: duplicatePriceIdCount,
    duplicate_nomenclature_id_count: duplicateNomenclatureIdCount,
    blocking_reasons: blockingReasons,
  };
}
