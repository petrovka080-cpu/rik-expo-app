import { normalizeCanonicalProfessionalBoqUnit } from "./canonicalUnits";
import { estimateDeterministicHash } from "./estimateDeterministicHash";
import type {
  KgRegionalCurrency,
  KgRegionalDeliveryScope,
  KgRegionalPriceKey,
  KgRegionalPriceResourceType,
  KgRegionalPriceSnapshot,
  KgRegionalPriceableResourceSpecification,
  KgRegionalVatMode,
  PricingBlockerLedgerEntry,
} from "./kgRegionalPricingContract";
import type {
  ProfessionalWorkPassportV2,
  ProfessionalWorkPassportV2Equipment,
  ProfessionalWorkPassportV2Material,
  ProfessionalWorkPassportV2Operation,
  ProfessionalWorkPassportV2Service,
} from "./professionalWorkPassportV2Contract";

const KG_REGIONAL_PRICE_RESOLVED_AT = "2026-07-14T00:00:00.000Z";
const DEFAULT_REGION_CODE = "KG-BISHKEK";
const DEFAULT_CURRENCY: KgRegionalCurrency = "KGS";
const DEFAULT_VAT_MODE: KgRegionalVatMode = "VAT_POLICY_REQUIRED";
const DEFAULT_DELIVERY_SCOPE: KgRegionalDeliveryScope = "DELIVERY_SCOPE_REQUIRED";

export type KgRegionalPriceKeyBuildOptions = {
  region_code?: string | null;
  currency?: KgRegionalCurrency | null;
  vat_mode?: KgRegionalVatMode | null;
  delivery_scope?: KgRegionalDeliveryScope | null;
};

function compactText(value: string | null | undefined): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\s_:-]+/g, " ")
    .trim();
}

function codeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function hashSuffix(value: unknown, length = 16): string {
  return estimateDeterministicHash(value).replace(/^eh_/, "").slice(0, length);
}

function cleanSpecification(
  specification: Record<string, string | string[] | null>,
): Record<string, string | string[] | null> {
  const result: Record<string, string | string[] | null> = {};
  for (const key of Object.keys(specification).sort()) {
    const value = specification[key];
    if (Array.isArray(value)) {
      result[key] = value.map((item) => String(item ?? "").trim()).filter(Boolean).sort();
      continue;
    }
    const text = String(value ?? "").trim();
    result[key] = text ? text : null;
  }
  return result;
}

export function normalizeKgRegionalPricingUnit(unit: string | null | undefined): string {
  const canonical = normalizeCanonicalProfessionalBoqUnit(unit);
  if (canonical) return canonical;
  return String(unit ?? "").trim().toLowerCase().replace(/\s+/g, "_") || "unit_missing";
}

function stableResourceCode(input: {
  resource_type: KgRegionalPriceResourceType;
  normalized_unit: string;
  specification_hash: string;
}): string {
  const readable = codeToken(`${input.resource_type}_${input.normalized_unit}`);
  return `kg_resource_${readable}_${input.specification_hash.replace(/^eh_/, "").slice(0, 18)}`;
}

function buildPriceKey(input: {
  resource_code: string;
  resource_type: KgRegionalPriceResourceType;
  specification_hash: string;
  normalized_unit: string;
  options?: KgRegionalPriceKeyBuildOptions;
}): KgRegionalPriceKey {
  const body = {
    resource_code: input.resource_code,
    resource_type: input.resource_type,
    specification_hash: input.specification_hash,
    normalized_unit: input.normalized_unit,
    region_code: input.options?.region_code?.trim() || DEFAULT_REGION_CODE,
    currency: input.options?.currency ?? DEFAULT_CURRENCY,
    vat_mode: input.options?.vat_mode ?? DEFAULT_VAT_MODE,
    delivery_scope: input.options?.delivery_scope ?? DEFAULT_DELIVERY_SCOPE,
  };
  return Object.freeze({
    price_key_id: `kg_price_key_${hashSuffix(body, 20)}`,
    ...body,
  });
}

function makeResource(input: {
  passport: ProfessionalWorkPassportV2;
  source_resource_code: string;
  exact_name_ru: string;
  line_type: KgRegionalPriceResourceType;
  unit: string;
  norm_source_id: string;
  quantity_formula: string;
  formula_trace: string;
  specification: Record<string, string | string[] | null>;
  options?: KgRegionalPriceKeyBuildOptions;
}): KgRegionalPriceableResourceSpecification {
  const specification = cleanSpecification({
    exact_name_ru: input.exact_name_ru,
    line_type: input.line_type,
    normalized_unit: normalizeKgRegionalPricingUnit(input.unit),
    ...input.specification,
  });
  const normalizedUnit = normalizeKgRegionalPricingUnit(input.unit);
  const specificationHash = estimateDeterministicHash({
    resource_type: input.line_type,
    exact_name_ru: compactText(input.exact_name_ru),
    normalized_unit: normalizedUnit,
    specification,
  });
  const resourceCode = stableResourceCode({
    resource_type: input.line_type,
    normalized_unit: normalizedUnit,
    specification_hash: specificationHash,
  });
  const priceKey = buildPriceKey({
    resource_code: resourceCode,
    resource_type: input.line_type,
    specification_hash: specificationHash,
    normalized_unit: normalizedUnit,
    options: input.options,
  });
  return Object.freeze({
    resource_code: resourceCode,
    source_resource_code: input.source_resource_code,
    work_id: input.passport.identity.work_id,
    exact_name_ru: input.exact_name_ru,
    line_type: input.line_type,
    specification: Object.freeze(specification),
    specification_hash: specificationHash,
    quantity: null,
    quantity_formula: input.quantity_formula,
    unit: input.unit,
    normalized_unit: normalizedUnit,
    region: priceKey.region_code,
    norm_source_id: input.norm_source_id,
    formula_trace: input.formula_trace,
    quantity_revision_id: input.passport.lineage.compiled_resolved_passport_id,
    price_key: priceKey,
  });
}

function materialResource(
  passport: ProfessionalWorkPassportV2,
  material: ProfessionalWorkPassportV2Material,
  options?: KgRegionalPriceKeyBuildOptions,
): KgRegionalPriceableResourceSpecification {
  return makeResource({
    passport,
    source_resource_code: material.material_code,
    exact_name_ru: material.exact_name_ru,
    line_type: "material",
    unit: material.unit,
    norm_source_id: material.norm_source_id,
    quantity_formula: material.consumption_formula,
    formula_trace: material.consumption_formula,
    specification: {
      material_class: material.material_class,
      grade: material.grade,
      strength: material.strength,
      size: material.size,
      thickness: material.thickness,
      diameter: material.diameter,
      density: material.density,
      standard: material.standard,
      waste_factor_from_quantity_engine: material.waste_factor,
      technical_source_id: material.technical_source_id,
      commercial_scope: "material_supply_only_no_delivery_no_tax",
    },
    options,
  });
}

function laborResource(
  passport: ProfessionalWorkPassportV2,
  operation: ProfessionalWorkPassportV2Operation,
  options?: KgRegionalPriceKeyBuildOptions,
): KgRegionalPriceableResourceSpecification {
  return makeResource({
    passport,
    source_resource_code: operation.operation_code,
    exact_name_ru: operation.exact_name_ru,
    line_type: "labor",
    unit: operation.unit,
    norm_source_id: operation.norm_source_id,
    quantity_formula: operation.quantity_formula,
    formula_trace: operation.quantity_formula,
    specification: {
      scope_ru: operation.scope_ru,
      labor_norm: operation.labor_norm,
      crew: operation.crew,
      quality_control: operation.quality_control,
      commercial_scope: "labor_or_unit_work_rate_no_double_labor",
    },
    options,
  });
}

function serviceResource(
  passport: ProfessionalWorkPassportV2,
  service: ProfessionalWorkPassportV2Service,
  options?: KgRegionalPriceKeyBuildOptions,
): KgRegionalPriceableResourceSpecification {
  return makeResource({
    passport,
    source_resource_code: service.service_code,
    exact_name_ru: service.exact_name_ru,
    line_type: "service",
    unit: service.unit,
    norm_source_id: service.source_id,
    quantity_formula: service.quantity_formula,
    formula_trace: service.quantity_formula,
    specification: {
      scope_ru: service.scope_ru,
      provider_requirements: service.provider_requirements,
      commercial_scope: "service_scope_separate_from_material_labor_equipment",
    },
    options,
  });
}

function equipmentResource(
  passport: ProfessionalWorkPassportV2,
  equipment: ProfessionalWorkPassportV2Equipment,
  lineType: "machine" | "equipment",
  options?: KgRegionalPriceKeyBuildOptions,
): KgRegionalPriceableResourceSpecification {
  return makeResource({
    passport,
    source_resource_code: equipment.equipment_code,
    exact_name_ru: equipment.exact_name_ru,
    line_type: lineType,
    unit: equipment.unit,
    norm_source_id: equipment.norm_source_id,
    quantity_formula: equipment.machine_time_formula,
    formula_trace: equipment.machine_time_formula,
    specification: {
      equipment_class: equipment.equipment_class,
      capacity: equipment.capacity,
      technical_characteristics: equipment.technical_characteristics,
      commercial_scope: lineType === "machine"
        ? "machine_hour_or_shift_rate_operator_fuel_delivery_explicit"
        : "equipment_rental_or_consumable_equipment_scope_explicit",
    },
    options,
  });
}

export function buildKgRegionalPriceableResourcesForPassport(
  passport: ProfessionalWorkPassportV2,
  options: KgRegionalPriceKeyBuildOptions = {},
): readonly KgRegionalPriceableResourceSpecification[] {
  const machineCodes = new Set(passport.machines.map((machine) => machine.equipment_code));
  return Object.freeze([
    ...passport.material_assemblies.map((material) => materialResource(passport, material, options)),
    ...passport.work_operations.map((operation) => laborResource(passport, operation, options)),
    ...passport.services.map((service) => serviceResource(passport, service, options)),
    ...passport.equipment.map((equipment) =>
      equipmentResource(passport, equipment, machineCodes.has(equipment.equipment_code) ? "machine" : "equipment", options)
    ),
  ]);
}

export function buildMissingKgRegionalPriceSnapshot(input: {
  price_key: KgRegionalPriceKey;
  blockers: readonly Pick<PricingBlockerLedgerEntry, "blocker_id">[];
}): KgRegionalPriceSnapshot {
  const snapshot = {
    snapshot_id: `kg_price_snapshot_missing_${hashSuffix({
      price_key_id: input.price_key.price_key_id,
      blocker_ids: input.blockers.map((blocker) => blocker.blocker_id).sort(),
      created_at: KG_REGIONAL_PRICE_RESOLVED_AT,
    }, 20)}`,
    price_key: input.price_key,
    price_source_priority: "PRICE_MISSING" as const,
    trust_state: "MISSING" as const,
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
    created_at: KG_REGIONAL_PRICE_RESOLVED_AT,
    blocker_ids: input.blockers.map((blocker) => blocker.blocker_id).sort(),
    immutable: true as const,
  };
  return Object.freeze({
    ...snapshot,
    price_key: input.price_key,
    blocker_ids: Object.freeze([...snapshot.blocker_ids]),
  });
}
