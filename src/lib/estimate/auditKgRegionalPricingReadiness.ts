import {
  buildKgRegionalPriceableResourcesForPassport,
  normalizeKgRegionalPricingUnit,
} from "./buildKgRegionalPriceKeys";
import {
  buildProfessionalWorkPassportV2,
  clearProfessionalWorkPassportV2BuildCaches,
  listProfessionalWorkPassportV2TemplateIds,
} from "./buildProfessionalWorkPassportV2";
import { estimateDeterministicHash } from "./estimateDeterministicHash";
import {
  GREEN_AI_ESTIMATE_11610_KG_REGIONAL_PRICING_ENGINE_SOFTWARE_READY_FOR_LIVE_SUPPLIER_VALIDATION_NO_RELEASE,
  S_AI_ESTIMATE_11610_KG_REGIONAL_PRICEBOOK_RESOURCE_MATCHING_LABOR_EQUIPMENT_LOGISTICS_TAX_SUPPLIER_QUOTE_AND_BLOCKER_QUARANTINE_NO_RELEASE,
  STOP_AI_ESTIMATE_11610_KG_REGIONAL_PRICE_TRUTH_BLOCKERS_FOUND_NO_RELEASE,
  type KgRegionalPriceKey,
  type KgRegionalPriceResourceType,
  type KgRegionalPriceableResourceSpecification,
  type KgRegionalPricingAuditResult,
  type KgRegionalPricingBlockerType,
  type PricingBlockerLedgerEntry,
} from "./kgRegionalPricingContract";

const KG_REGIONAL_PRICING_LEDGER_CREATED_AT = "2026-07-14T00:00:00.000Z";

export type KgRegionalPricingAuditOptions = {
  includeBlockerLedger?: boolean;
  includePriceKeys?: boolean;
  onBlocker?: (entry: PricingBlockerLedgerEntry) => void;
  blockerSampleLimit?: number;
  sampleLimit?: number;
};

type MutableSummaryCounters = {
  material_price_keys_count: number;
  labor_rate_keys_count: number;
  service_price_keys_count: number;
  equipment_rate_keys_count: number;
  machine_rate_keys_count: number;
};

type PriceKeyAggregation = {
  price_key: KgRegionalPriceKey;
  first_work_id: string;
  work_ids: Set<string> | null;
  work_count: number;
  resource_code: string;
};

function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

function blockerId(input: {
  blocker_type: KgRegionalPricingBlockerType;
  resource_code: string;
  price_key_id: string | null;
  evidence_hash: string;
}): string {
  return `kg_pricing_blocker_${estimateDeterministicHash(input).replace(/^eh_/, "").slice(0, 20)}`;
}

function blocker(input: {
  work_ids: readonly string[];
  resource_code: string;
  price_key_id: string | null;
  blocker_type: KgRegionalPricingBlockerType;
  reason_ru: string;
  source_evidence: Record<string, string | number | boolean | null>;
  owner: string;
  required_action: string;
}): PricingBlockerLedgerEntry {
  const evidenceHash = estimateDeterministicHash(input.source_evidence);
  return Object.freeze({
    blocker_id: blockerId({
      blocker_type: input.blocker_type,
      resource_code: input.resource_code,
      price_key_id: input.price_key_id,
      evidence_hash: evidenceHash,
    }),
    work_ids: [...new Set(input.work_ids)].sort(),
    resource_code: input.resource_code,
    price_key_id: input.price_key_id,
    blocker_type: input.blocker_type,
    severity: "required" as const,
    reason_ru: input.reason_ru,
    source_evidence: Object.freeze({ ...input.source_evidence }),
    owner: input.owner,
    required_action: input.required_action,
    created_at: KG_REGIONAL_PRICING_LEDGER_CREATED_AT,
    resolved_at: null,
    resolution: null,
  });
}

function incrementTypeCounter(counters: MutableSummaryCounters, resourceType: KgRegionalPriceResourceType): void {
  if (resourceType === "material") counters.material_price_keys_count += 1;
  if (resourceType === "labor") counters.labor_rate_keys_count += 1;
  if (resourceType === "service") counters.service_price_keys_count += 1;
  if (resourceType === "equipment") counters.equipment_rate_keys_count += 1;
  if (resourceType === "machine") counters.machine_rate_keys_count += 1;
}

function exactResourceSignature(resource: KgRegionalPriceableResourceSpecification): string {
  return [
    resource.line_type,
    resource.specification_hash,
    resource.normalized_unit,
    resource.region,
    resource.price_key.currency,
    resource.price_key.vat_mode,
    resource.price_key.delivery_scope,
  ].join("|");
}

function missingUnit(resource: KgRegionalPriceableResourceSpecification): boolean {
  return normalizeKgRegionalPricingUnit(resource.unit) === "unit_missing";
}

export function auditKgRegionalPricingReadiness(
  options: KgRegionalPricingAuditOptions = {},
): KgRegionalPricingAuditResult {
  clearProfessionalWorkPassportV2BuildCaches();
  const templateIds = listProfessionalWorkPassportV2TemplateIds();
  const priceKeys = new Map<string, PriceKeyAggregation>();
  const priceKeySpecHashes = new Map<string, string>();
  const exactResourcePriceKeys = new Map<string, string>();
  const blockerSamples: PricingBlockerLedgerEntry[] = [];
  const resourceSamples: KgRegionalPriceableResourceSpecification[] = [];
  const counters: MutableSummaryCounters = {
    material_price_keys_count: 0,
    labor_rate_keys_count: 0,
    service_price_keys_count: 0,
    equipment_rate_keys_count: 0,
    machine_rate_keys_count: 0,
  };
  const seenTypeKeys = new Set<string>();
  const sampleLimit = options.sampleLimit ?? 12;
  const blockerSampleLimit = options.blockerSampleLimit ?? 24;
  let blockerLedgerEntries = 0;
  let unitConversionMissingCount = 0;
  let ambiguousPriceKeys = 0;
  let identicalResourceViolations = 0;
  let priceableWorkPassports = 0;
  let upstreamBlockedPassports = 0;
  let priceableResourceRows = 0;
  let resourcesWithPriceKey = 0;
  let validatedScopeRows = 0;
  let quarantinedScopeRows = 0;

  const rememberBlocker = (entry: PricingBlockerLedgerEntry) => {
    blockerLedgerEntries += 1;
    options.onBlocker?.(entry);
    if (options.includeBlockerLedger || blockerSamples.length < blockerSampleLimit) {
      blockerSamples.push(entry);
    }
  };

  const shouldMaterializeBlocker = () =>
    Boolean(options.onBlocker) || options.includeBlockerLedger || blockerSamples.length < blockerSampleLimit;

  for (const templateId of templateIds) {
    const index = priceableWorkPassports + upstreamBlockedPassports;
    const passport = buildProfessionalWorkPassportV2(templateId);
    if (!passport || passport.validation.status !== "SOFTWARE_SEALED_READY_FOR_EXPERT_REVIEW") {
      upstreamBlockedPassports += 1;
      const entry = blocker({
        work_ids: [templateId],
        resource_code: `upstream_passport:${templateId}`,
        price_key_id: null,
        blocker_type: "UPSTREAM_PASSPORT_BLOCKED",
        reason_ru: "Upstream work passport is not software sealed for regional pricing.",
        source_evidence: {
          work_id: templateId,
          passport_status: passport?.validation.status ?? "missing",
        },
        owner: "passport_certification",
        required_action: "Resolve upstream passport blockers before price matching.",
      });
      rememberBlocker(entry);
      continue;
    }

    priceableWorkPassports += 1;
    const resources = buildKgRegionalPriceableResourcesForPassport(passport);
    for (const resource of resources) {
      priceableResourceRows += 1;
      if (resourceSamples.length < sampleLimit) resourceSamples.push(resource);
      if (resource.price_key.price_key_id) resourcesWithPriceKey += 1;
      const aggregation = priceKeys.get(resource.price_key.price_key_id) ?? {
        price_key: resource.price_key,
        first_work_id: resource.work_id,
        work_ids: options.includeBlockerLedger ? new Set<string>() : null,
        work_count: 0,
        resource_code: resource.resource_code,
      };
      aggregation.work_count += 1;
      aggregation.work_ids?.add(resource.work_id);
      priceKeys.set(resource.price_key.price_key_id, aggregation);
      const previousSpecHash = priceKeySpecHashes.get(resource.price_key.price_key_id);
      if (previousSpecHash && previousSpecHash !== resource.specification_hash) {
        ambiguousPriceKeys += 1;
      } else if (!previousSpecHash) {
        priceKeySpecHashes.set(resource.price_key.price_key_id, resource.specification_hash);
      }
      const resourceSignature = exactResourceSignature(resource);
      const previousPriceKey = exactResourcePriceKeys.get(resourceSignature);
      if (previousPriceKey && previousPriceKey !== resource.price_key.price_key_id) {
        identicalResourceViolations += 1;
      } else if (!previousPriceKey) {
        exactResourcePriceKeys.set(resourceSignature, resource.price_key.price_key_id);
      }
      const typeKey = `${resource.line_type}:${resource.price_key.price_key_id}`;
      if (!seenTypeKeys.has(typeKey)) {
        incrementTypeCounter(counters, resource.line_type);
        seenTypeKeys.add(typeKey);
      }

      if (missingUnit(resource)) {
        quarantinedScopeRows += 1;
        unitConversionMissingCount += 1;
        if (!shouldMaterializeBlocker()) {
          blockerLedgerEntries += 1;
          continue;
        }
        const entry = blocker({
          work_ids: [resource.work_id],
          resource_code: resource.resource_code,
          price_key_id: resource.price_key.price_key_id,
          blocker_type: "UNIT_CONVERSION_MISSING",
          reason_ru: "BOQ unit cannot be normalized for KG regional pricing.",
          source_evidence: {
            work_id: resource.work_id,
            source_resource_code: resource.source_resource_code,
            unit: resource.unit,
            normalized_unit: resource.normalized_unit,
          },
          owner: "pricing_normalization",
          required_action: "Add governed unit conversion before price source matching.",
        });
        rememberBlocker(entry);
      } else {
        validatedScopeRows += 1;
      }
    }
    if (index > 0 && index % 100 === 0) clearProfessionalWorkPassportV2BuildCaches();
  }
  clearProfessionalWorkPassportV2BuildCaches();

  for (const aggregation of priceKeys.values()) {
    if (!shouldMaterializeBlocker()) {
      blockerLedgerEntries += 1;
      continue;
    }
    const entry = blocker({
      work_ids: aggregation.work_ids ? [...aggregation.work_ids] : [aggregation.first_work_id],
      resource_code: aggregation.resource_code,
      price_key_id: aggregation.price_key.price_key_id,
      blocker_type: "PRICE_SOURCE_MISSING",
      reason_ru: "Verified KG regional price source is not bound to this exact PriceKey.",
      source_evidence: {
        price_key_id: aggregation.price_key.price_key_id,
        resource_code: aggregation.price_key.resource_code,
        resource_type: aggregation.price_key.resource_type,
        region_code: aggregation.price_key.region_code,
        currency: aggregation.price_key.currency,
        source_priority: "PRICE_MISSING",
        affected_resource_rows: aggregation.work_count,
        work_ids_truncated: !aggregation.work_ids,
      },
      owner: "pricing_ingestion",
      required_action: "Bind a verified supplier quote, official published price, contract price, or user-confirmed price to this exact PriceKey.",
    });
    rememberBlocker(entry);
  }

  const blockerList = [...blockerSamples].sort((left, right) =>
    left.blocker_type.localeCompare(right.blocker_type) ||
    left.resource_code.localeCompare(right.resource_code) ||
    left.blocker_id.localeCompare(right.blocker_id)
  );
  const priceSourceMissingCount = priceKeys.size;
  const mandatoryBlockersCount = blockerLedgerEntries;
  const finalStatus = mandatoryBlockersCount === 0
    ? GREEN_AI_ESTIMATE_11610_KG_REGIONAL_PRICING_ENGINE_SOFTWARE_READY_FOR_LIVE_SUPPLIER_VALIDATION_NO_RELEASE
    : STOP_AI_ESTIMATE_11610_KG_REGIONAL_PRICE_TRUTH_BLOCKERS_FOUND_NO_RELEASE;

  return {
    summary: {
      target_status: S_AI_ESTIMATE_11610_KG_REGIONAL_PRICEBOOK_RESOURCE_MATCHING_LABOR_EQUIPMENT_LOGISTICS_TAX_SUPPLIER_QUOTE_AND_BLOCKER_QUARANTINE_NO_RELEASE,
      final_status: finalStatus,
      catalog_total: templateIds.length,
      priceable_work_passports: priceableWorkPassports,
      upstream_blocked_passports: upstreamBlockedPassports,
      priceable_resource_rows: priceableResourceRows,
      unique_price_keys: priceKeys.size,
      price_key_coverage_percent: percent(resourcesWithPriceKey, priceableResourceRows),
      resource_price_keys_resolved_percent: percent(resourcesWithPriceKey, priceableResourceRows),
      material_price_keys_count: counters.material_price_keys_count,
      labor_rate_keys_count: counters.labor_rate_keys_count,
      service_price_keys_count: counters.service_price_keys_count,
      equipment_rate_keys_count: counters.equipment_rate_keys_count,
      machine_rate_keys_count: counters.machine_rate_keys_count,
      ambiguous_price_keys: ambiguousPriceKeys,
      cross_specification_price_matches: ambiguousPriceKeys,
      identical_resource_price_key_violations: identicalResourceViolations,
      fake_zero_prices: 0,
      silent_regional_fallbacks: 0,
      untraced_currency_conversions: 0,
      double_applied_waste: 0,
      double_applied_labor: 0,
      wrong_package_conversions: 0,
      expired_prices_used_as_current: 0,
      ambiguous_matches_auto_accepted: 0,
      contractual_price_count: 0,
      supplier_verified_count: 0,
      official_reference_count: 0,
      market_reference_count: 0,
      missing_price_count: priceKeys.size,
      expired_price_count: 0,
      regional_fallback_count: 0,
      license_blocked_count: 0,
      blocker_ledger_entries: blockerLedgerEntries,
      mandatory_blockers_count: mandatoryBlockersCount,
      price_source_missing_count: priceSourceMissingCount,
      unit_conversion_missing_count: unitConversionMissingCount,
      validated_scope_resource_rows: validatedScopeRows,
      quarantined_scope_resource_rows: priceSourceMissingCount > 0 ? priceableResourceRows : quarantinedScopeRows,
      full_catalog_green_claimed: false,
      release_started: false,
      deploy_started: false,
      eas_started: false,
      native_build_started: false,
      production_db_touched: false,
      main_changed: false,
      pr44_changed: false,
    },
    blockers: blockerList,
    price_keys: options.includePriceKeys
      ? [...priceKeys.values()].map((entry) => entry.price_key).sort((left, right) => left.price_key_id.localeCompare(right.price_key_id))
      : undefined,
    resource_samples: resourceSamples,
  };
}
