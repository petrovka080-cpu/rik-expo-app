import registryJson from "../../../data/estimate/kg-regional-pricing/price-source-registry.json";
import { estimateDeterministicHash } from "./estimateDeterministicHash";
import type {
  KgRegionalCurrency,
  KgRegionalPriceKey,
  KgRegionalPriceRecord,
  KgRegionalPriceSnapshot,
  KgRegionalPriceSourceMetadata,
  KgRegionalPriceSourcePriority,
  KgRegionalPriceSourceRegistry,
  KgRegionalPriceTrustState,
  KgRegionalPricingBlockerType,
  PricingBlockerLedgerEntry,
} from "./kgRegionalPricingContract";

const KG_REGIONAL_PRICE_RESOLUTION_AT = "2026-07-14T00:00:00.000Z";

export type KgRegionalExchangeRate = {
  source_currency: KgRegionalCurrency;
  target_currency: KgRegionalCurrency;
  exchange_rate: number;
  exchange_rate_source: string;
  rate_date: string;
};

export type KgRegionalPriceSourceRegistryValidation = {
  registry_version: string;
  versioned_price_source_registry_created: boolean;
  runtime_network_required: false;
  records_count: number;
  sources_count: number;
  duplicate_price_record_id_count: number;
  duplicate_source_id_count: number;
  price_without_source_metadata_count: number;
  source_metadata_incomplete_count: number;
  unverified_price_source_records_count: number;
  zero_or_negative_price_count: number;
  generic_price_record_count: number;
  blocking_reasons: string[];
};

export type KgRegionalResolvedPriceSource = {
  snapshot: KgRegionalPriceSnapshot;
  blockers: PricingBlockerLedgerEntry[];
  selected_record: KgRegionalPriceRecord | null;
  candidate_records: KgRegionalPriceRecord[];
};

const SOURCE_PRIORITY_RANK: Record<KgRegionalPriceSourcePriority, number> = Object.freeze({
  CONTRACT_PRICE: 1,
  VERIFIED_SUPPLIER_QUOTE: 2,
  OFFICIAL_PUBLISHED_PRICE: 3,
  MANUFACTURER_PRICE_LIST: 4,
  PUBLIC_PROCUREMENT_REFERENCE: 5,
  VERIFIED_MARKET_REFERENCE: 6,
  USER_CONFIRMED_PRICE: 7,
  PRICE_MISSING: 8,
});

const TRUST_STATE_BY_SOURCE: Record<Exclude<KgRegionalPriceSourcePriority, "PRICE_MISSING">, KgRegionalPriceTrustState> = Object.freeze({
  CONTRACT_PRICE: "CONTRACTUAL",
  VERIFIED_SUPPLIER_QUOTE: "SUPPLIER_VERIFIED",
  OFFICIAL_PUBLISHED_PRICE: "OFFICIAL_REFERENCE",
  MANUFACTURER_PRICE_LIST: "OFFICIAL_REFERENCE",
  PUBLIC_PROCUREMENT_REFERENCE: "OFFICIAL_REFERENCE",
  VERIFIED_MARKET_REFERENCE: "MARKET_REFERENCE",
  USER_CONFIRMED_PRICE: "USER_CONFIRMED",
});

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? roundMoney((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

function duplicateCount(values: readonly string[]): number {
  const seen = new Set<string>();
  let duplicates = 0;
  for (const value of values) {
    if (seen.has(value)) duplicates += 1;
    seen.add(value);
  }
  return duplicates;
}

function dateValue(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function isExpired(record: KgRegionalPriceRecord, validAt: string): boolean {
  const until = dateValue(record.valid_until);
  const at = dateValue(validAt);
  return until !== null && at !== null && until < at;
}

function priceKeyMatches(left: KgRegionalPriceKey, right: KgRegionalPriceKey): boolean {
  return left.price_key_id === right.price_key_id &&
    left.resource_code === right.resource_code &&
    left.resource_type === right.resource_type &&
    left.specification_hash === right.specification_hash &&
    left.normalized_unit === right.normalized_unit &&
    left.region_code === right.region_code &&
    left.currency === right.currency &&
    left.vat_mode === right.vat_mode &&
    left.delivery_scope === right.delivery_scope;
}

function regionalFallbackMatches(record: KgRegionalPriceRecord, priceKey: KgRegionalPriceKey): boolean {
  return record.price_key.resource_code === priceKey.resource_code &&
    record.price_key.resource_type === priceKey.resource_type &&
    record.price_key.specification_hash === priceKey.specification_hash &&
    record.price_key.normalized_unit === priceKey.normalized_unit &&
    record.price_key.currency === priceKey.currency &&
    record.price_key.vat_mode === priceKey.vat_mode &&
    record.price_key.delivery_scope === priceKey.delivery_scope &&
    record.price_key.region_code !== priceKey.region_code;
}

function priceRecordSort(left: KgRegionalPriceRecord, right: KgRegionalPriceRecord): number {
  const source = SOURCE_PRIORITY_RANK[left.source_type] - SOURCE_PRIORITY_RANK[right.source_type];
  if (source !== 0) return source;
  return (dateValue(right.valid_from) ?? 0) - (dateValue(left.valid_from) ?? 0) ||
    (dateValue(right.created_at) ?? 0) - (dateValue(left.created_at) ?? 0) ||
    left.price_record_id.localeCompare(right.price_record_id);
}

function blocker(input: {
  price_key: KgRegionalPriceKey;
  blocker_type: KgRegionalPricingBlockerType;
  reason_ru: string;
  source_evidence: Record<string, string | number | boolean | null>;
  owner: string;
  required_action: string;
}): PricingBlockerLedgerEntry {
  const evidenceHash = estimateDeterministicHash(input.source_evidence);
  return Object.freeze({
    blocker_id: `kg_pricing_blocker_${estimateDeterministicHash({
      price_key_id: input.price_key.price_key_id,
      blocker_type: input.blocker_type,
      evidence_hash: evidenceHash,
    }).replace(/^eh_/, "").slice(0, 20)}`,
    work_ids: [],
    resource_code: input.price_key.resource_code,
    price_key_id: input.price_key.price_key_id,
    blocker_type: input.blocker_type,
    severity: "required" as const,
    reason_ru: input.reason_ru,
    source_evidence: Object.freeze({ ...input.source_evidence }),
    owner: input.owner,
    required_action: input.required_action,
    created_at: KG_REGIONAL_PRICE_RESOLUTION_AT,
    resolved_at: null,
    resolution: null,
  });
}

function missingSnapshot(input: {
  price_key: KgRegionalPriceKey;
  trust_state?: KgRegionalPriceTrustState;
  blockers: readonly PricingBlockerLedgerEntry[];
}): KgRegionalPriceSnapshot {
  return Object.freeze({
    snapshot_id: `kg_price_snapshot_missing_${estimateDeterministicHash({
      price_key_id: input.price_key.price_key_id,
      blocker_ids: input.blockers.map((entry) => entry.blocker_id).sort(),
      created_at: KG_REGIONAL_PRICE_RESOLUTION_AT,
    }).replace(/^eh_/, "").slice(0, 20)}`,
    price_key: input.price_key,
    price_source_priority: "PRICE_MISSING",
    trust_state: input.trust_state ?? "MISSING",
    selected_price_record_id: null,
    supplier: null,
    source_url: null,
    source_region: null,
    source_city: null,
    valid_until: null,
    package_quantity: null,
    price_range_min: null,
    price_range_median: null,
    price_range_max: null,
    unit_price: null,
    normalized_unit_price: null,
    total: null,
    currency: input.price_key.currency,
    exchange_rate: null,
    exchange_rate_source: null,
    rate_date: null,
    source_currency: null,
    target_currency: input.price_key.currency,
    valid_at: null,
    created_at: KG_REGIONAL_PRICE_RESOLUTION_AT,
    blocker_ids: Object.freeze(input.blockers.map((entry) => entry.blocker_id).sort()),
    immutable: true,
  });
}

function sourceIds(sources: readonly KgRegionalPriceSourceMetadata[]): Set<string> {
  return new Set(sources.map((source) => source.source_id));
}

function sourceMetadataIncomplete(source: KgRegionalPriceSourceMetadata): boolean {
  return !source.source_id.trim() ||
    !source.source_url.trim() ||
    !source.publisher.trim() ||
    !source.jurisdiction.trim() ||
    !source.accessed_at.trim() ||
    !source.valid_at.trim() ||
    !source.license_state.trim() ||
    !source.document_hash.trim() ||
    source.verification_status !== "VERIFIED";
}

function isGenericPriceRecord(record: KgRegionalPriceRecord): boolean {
  return /generic|assumption|estimated|placeholder/i.test([
    record.price_record_id,
    record.exact_name_ru,
    record.supplier,
    record.source_url,
    record.document_number,
  ].filter(Boolean).join(" "));
}

export function loadKgRegionalPriceSourceRegistry(): KgRegionalPriceSourceRegistry {
  return registryJson as KgRegionalPriceSourceRegistry;
}

export function validateKgRegionalPriceSourceRegistry(
  registry: KgRegionalPriceSourceRegistry = loadKgRegionalPriceSourceRegistry(),
): KgRegionalPriceSourceRegistryValidation {
  const sourceIdSet = sourceIds(registry.sources);
  const priceWithoutSource = registry.records.filter((record) => !sourceIdSet.has(record.source_id));
  const sourceMetadataIncompleteCount = registry.sources.filter(sourceMetadataIncomplete).length;
  const unverifiedRecords = registry.records.filter((record) => record.verification_status !== "VERIFIED");
  const zeroOrNegative = registry.records.filter((record) => !Number.isFinite(record.base_price) || record.base_price <= 0);
  const genericRecords = registry.records.filter(isGenericPriceRecord);
  const duplicatePriceRecordIdCount = duplicateCount(registry.records.map((record) => record.price_record_id));
  const duplicateSourceIdCount = duplicateCount(registry.sources.map((source) => source.source_id));
  const blockingReasons = [
    registry.runtime_network_required === false ? "" : "runtime_network_required",
    priceWithoutSource.length === 0 ? "" : `price_without_source_metadata:${priceWithoutSource.length}`,
    sourceMetadataIncompleteCount === 0 ? "" : `source_metadata_incomplete:${sourceMetadataIncompleteCount}`,
    unverifiedRecords.length === 0 ? "" : `unverified_price_source_records:${unverifiedRecords.length}`,
    zeroOrNegative.length === 0 ? "" : `zero_or_negative_price:${zeroOrNegative.length}`,
    genericRecords.length === 0 ? "" : `generic_price_records:${genericRecords.length}`,
    duplicatePriceRecordIdCount === 0 ? "" : `duplicate_price_record_id:${duplicatePriceRecordIdCount}`,
    duplicateSourceIdCount === 0 ? "" : `duplicate_source_id:${duplicateSourceIdCount}`,
  ].filter(Boolean);
  return {
    registry_version: registry.registry_version,
    versioned_price_source_registry_created: Boolean(registry.registry_version),
    runtime_network_required: false,
    records_count: registry.records.length,
    sources_count: registry.sources.length,
    duplicate_price_record_id_count: duplicatePriceRecordIdCount,
    duplicate_source_id_count: duplicateSourceIdCount,
    price_without_source_metadata_count: priceWithoutSource.length,
    source_metadata_incomplete_count: sourceMetadataIncompleteCount,
    unverified_price_source_records_count: unverifiedRecords.length,
    zero_or_negative_price_count: zeroOrNegative.length,
    generic_price_record_count: genericRecords.length,
    blocking_reasons: blockingReasons,
  };
}

function exchangeRateFor(input: {
  source_currency: KgRegionalCurrency;
  target_currency: KgRegionalCurrency;
  exchange_rates?: readonly KgRegionalExchangeRate[];
}): KgRegionalExchangeRate | null {
  return (input.exchange_rates ?? []).find((rate) =>
    rate.source_currency === input.source_currency &&
    rate.target_currency === input.target_currency &&
    Number.isFinite(rate.exchange_rate) &&
    rate.exchange_rate > 0 &&
    Boolean(rate.exchange_rate_source.trim()) &&
    Boolean(rate.rate_date.trim())
  ) ?? null;
}

function sourcePriceRange(records: readonly KgRegionalPriceRecord[], normalizedPrices: readonly number[]): {
  min: number | null;
  median: number | null;
  max: number | null;
} {
  if (records.length === 0 || normalizedPrices.length === 0) return { min: null, median: null, max: null };
  return {
    min: Math.min(...normalizedPrices),
    median: median(normalizedPrices),
    max: Math.max(...normalizedPrices),
  };
}

export function resolveKgRegionalPriceSnapshot(input: {
  price_key: KgRegionalPriceKey;
  quantity?: number | null;
  records?: readonly KgRegionalPriceRecord[];
  sources?: readonly KgRegionalPriceSourceMetadata[];
  exchange_rates?: readonly KgRegionalExchangeRate[];
  valid_at?: string;
}): KgRegionalResolvedPriceSource {
  const validAt = input.valid_at ?? KG_REGIONAL_PRICE_RESOLUTION_AT;
  const records = [...(input.records ?? loadKgRegionalPriceSourceRegistry().records)];
  const exactCandidates = records
    .filter((record) => priceKeyMatches(record.price_key, input.price_key))
    .sort(priceRecordSort);
  const regionalFallbackCandidates = records
    .filter((record) => regionalFallbackMatches(record, input.price_key))
    .sort(priceRecordSort);

  if (exactCandidates.length === 0) {
    const blockerType: KgRegionalPricingBlockerType = regionalFallbackCandidates.length > 0
      ? "REGION_PRICE_MISSING"
      : "PRICE_SOURCE_MISSING";
    const entry = blocker({
      price_key: input.price_key,
      blocker_type: blockerType,
      reason_ru: regionalFallbackCandidates.length > 0
        ? "Exact KG regional price is missing; fallback from another region requires confirmation."
        : "Verified price source is not bound to this exact PriceKey.",
      source_evidence: {
        price_key_id: input.price_key.price_key_id,
        region_code: input.price_key.region_code,
        fallback_candidates: regionalFallbackCandidates.length,
      },
      owner: "pricing_ingestion",
      required_action: regionalFallbackCandidates.length > 0
        ? "Confirm regional fallback explicitly or ingest an exact regional source."
        : "Bind verified source to this exact PriceKey.",
    });
    return {
      snapshot: missingSnapshot({
        price_key: input.price_key,
        trust_state: regionalFallbackCandidates.length > 0 ? "REGIONAL_FALLBACK" : "MISSING",
        blockers: [entry],
      }),
      blockers: [entry],
      selected_record: null,
      candidate_records: regionalFallbackCandidates,
    };
  }

  const currentCandidates = exactCandidates.filter((record) =>
    record.verification_status === "VERIFIED" &&
    record.base_price > 0 &&
    !isExpired(record, validAt)
  );
  if (currentCandidates.length === 0) {
    const expired = exactCandidates.some((record) => isExpired(record, validAt));
    const entry = blocker({
      price_key: input.price_key,
      blocker_type: expired ? "PRICE_EXPIRED" : "SUPPLIER_CONFIRMATION_REQUIRED",
      reason_ru: expired
        ? "Only expired exact price sources are available for this PriceKey."
        : "Exact price source exists but is not verified for current use.",
      source_evidence: {
        price_key_id: input.price_key.price_key_id,
        exact_candidates: exactCandidates.length,
        expired_candidates: exactCandidates.filter((record) => isExpired(record, validAt)).length,
      },
      owner: "pricing_ingestion",
      required_action: expired
        ? "Refresh source validity or ingest a current verified source."
        : "Verify source metadata and supplier confirmation before using price.",
    });
    return {
      snapshot: missingSnapshot({
        price_key: input.price_key,
        trust_state: expired ? "EXPIRED" : "MISSING",
        blockers: [entry],
      }),
      blockers: [entry],
      selected_record: null,
      candidate_records: exactCandidates,
    };
  }

  const selected = currentCandidates[0];
  const rate = selected.currency === input.price_key.currency
    ? null
    : exchangeRateFor({
        source_currency: selected.currency,
        target_currency: input.price_key.currency,
        exchange_rates: input.exchange_rates,
      });
  if (selected.currency !== input.price_key.currency && !rate) {
    const entry = blocker({
      price_key: input.price_key,
      blocker_type: "CURRENCY_RATE_MISSING",
      reason_ru: "Exact price source currency differs from target currency and no traced exchange rate is available.",
      source_evidence: {
        price_key_id: input.price_key.price_key_id,
        price_record_id: selected.price_record_id,
        source_currency: selected.currency,
        target_currency: input.price_key.currency,
      },
      owner: "pricing_currency_policy",
      required_action: "Attach immutable exchange rate source and rate date before using converted price.",
    });
    return {
      snapshot: missingSnapshot({ price_key: input.price_key, blockers: [entry] }),
      blockers: [entry],
      selected_record: null,
      candidate_records: currentCandidates,
    };
  }

  const normalizedPrice = roundMoney(selected.base_price * (rate?.exchange_rate ?? 1));
  const normalizedCandidatePrices = currentCandidates
    .map((record) => record.currency === input.price_key.currency
      ? record.base_price
      : input.exchange_rates?.find((rateCandidate) =>
          rateCandidate.source_currency === record.currency &&
          rateCandidate.target_currency === input.price_key.currency
        )?.exchange_rate
          ? record.base_price * input.exchange_rates.find((rateCandidate) =>
              rateCandidate.source_currency === record.currency &&
              rateCandidate.target_currency === input.price_key.currency
            )!.exchange_rate
          : null
    )
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    .map(roundMoney);
  const range = sourcePriceRange(currentCandidates, normalizedCandidatePrices);
  const quantity = input.quantity != null && Number.isFinite(input.quantity) && input.quantity > 0
    ? input.quantity
    : null;
  const snapshot: KgRegionalPriceSnapshot = Object.freeze({
    snapshot_id: `kg_price_snapshot_${estimateDeterministicHash({
      price_key_id: input.price_key.price_key_id,
      selected_price_record_id: selected.price_record_id,
      normalized_price: normalizedPrice,
      valid_at: validAt,
      exchange_rate: rate,
    }).replace(/^eh_/, "").slice(0, 20)}`,
    price_key: input.price_key,
    price_source_priority: selected.source_type,
    trust_state: TRUST_STATE_BY_SOURCE[selected.source_type],
    selected_price_record_id: selected.price_record_id,
    supplier: selected.supplier,
    source_url: selected.source_url,
    source_region: selected.region,
    source_city: selected.city,
    valid_until: selected.valid_until,
    package_quantity: selected.package_quantity,
    price_range_min: range.min,
    price_range_median: range.median,
    price_range_max: range.max,
    unit_price: selected.base_price,
    normalized_unit_price: normalizedPrice,
    total: quantity == null ? null : roundMoney(quantity * normalizedPrice),
    currency: input.price_key.currency,
    exchange_rate: rate?.exchange_rate ?? null,
    exchange_rate_source: rate?.exchange_rate_source ?? null,
    rate_date: rate?.rate_date ?? null,
    source_currency: selected.currency,
    target_currency: input.price_key.currency,
    valid_at: validAt,
    created_at: KG_REGIONAL_PRICE_RESOLUTION_AT,
    blocker_ids: Object.freeze([]),
    immutable: true,
  });
  return {
    snapshot,
    blockers: [],
    selected_record: selected,
    candidate_records: currentCandidates,
  };
}
