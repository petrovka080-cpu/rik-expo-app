import type { ProfessionalDomainParameterDefinitionV1 } from "../../src/lib/estimate/v4/domainFactory";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import {
  DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3 as BATCH001_DRYWALL_BULKHEAD_CATALOG_IDS_V3,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  buildDrywallCeilingBulkheadProfessionalPackagePartsV3 as buildBatch001DrywallBulkheadExactPackagePartsV3,
  buildInteriorFinishesProductionDraftV1,
  interiorFinishesDomainFactory,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";

export const BATCH001_CAPTURED_AT = "2026-08-13T06:00:00.000Z";

function numericFixture(parameter: ProfessionalDomainParameterDefinitionV1): number {
  const id = parameter.parameter_id;
  if (id === "area_m2") return 120;
  if (id === "length_m") return 12;
  if (id === "width_m") return 10;
  if (id === "perimeter_length_m") return 52;
  if (id === "bulkhead_drop_height_m") return 0.65;
  if (id === "board_layer_count") return id.includes("high_load") ? 3 : 2;
  if (id === "board_thickness_mm") return 12.5;
  if (id.includes("spacing_m")) return 0.6;
  if (id.includes("waste_percent")) return 7;
  if (id.includes("distance_km")) return 18;
  if (id.includes("documentation_record_count")) return 4;
  if (id.includes("unit_price_") || id.startsWith("unit_price_")) return 250;
  if (id.includes("mass_kg")) return 0.45;
  if (id.includes("productivity")) return 8;
  if (id.includes("interval")) return 25;
  if (id.includes("count")) return 6;
  if (id.includes("rate_")) return 1.15;
  if (id.includes("length_m")) return 24;
  if (id.includes("height_m")) return 0.65;
  if (id.includes("percent")) return 5;
  if (id.includes("load_kn")) return 1.5;
  if (id.includes("capacity_kn")) return 30;
  const minimum = Math.max(parameter.minimum ?? 0.000001, 1);
  return parameter.maximum != null && minimum > parameter.maximum ? parameter.maximum : minimum;
}

function rawFixture(
  parameter: ProfessionalDomainParameterDefinitionV1,
  scopeCapability: string,
  scopeMode: "MINIMAL_EXPLICIT_SCOPE" | "FULL_APPLICABLE_SCOPE",
): string | number | boolean {
  if (parameter.parameter_id === "work_included") return true;
  if (parameter.parameter_id === "estimate_scope_mode") return scopeMode;
  if (parameter.parameter_id === "scope_capability") return scopeCapability;
  if (parameter.parameter_id === "funding_source") return "PRIVATE_RECOMMENDED";
  if (parameter.parameter_id === "project_type") return "RESIDENTIAL_INTERIOR";
  if (parameter.parameter_id === "product_profile_id") return "PROJECT-SYSTEM-PASSPORT-BULKHEAD-2026";
  if (parameter.parameter_id === "normative_rate_code") return "Е10-05-011-02";
  if (parameter.parameter_id === "price_basis_reference") return "SUPPLIER-QUOTATION-BISHKEK-2026-08-13";
  if (parameter.parameter_id === "price_basis_date") return "2026-08-13";
  if (parameter.parameter_id === "accepted_frame_revision_id") return "FRAME-REVISION-ACCEPTED-001";
  if (parameter.parameter_id === "accepted_alignment_revision_id") return "ALIGN-REVISION-ACCEPTED-001";
  if (parameter.parameter_id === "board_type") return "ГКЛ 12,5 мм по проекту";
  if (parameter.parameter_id === "moisture_class") return "NORMAL_DRY";
  if (parameter.parameter_id === "fire_rating_class") return "PROJECT_FIRE_CLASS";
  if (parameter.parameter_id === "acoustic_class") return "PROJECT_ACOUSTIC_CLASS";
  if (parameter.parameter_id === "design_load_class") return "PROJECT_LOAD_CLASS";
  if (parameter.parameter_id === "project_system_compatibility_reference") return "SYSTEM-COMPATIBILITY-CHECK-001";
  if (parameter.input_type === "boolean") return true;
  if (parameter.input_type === "choice") return parameter.choices?.[0]?.value ?? "PROJECT_SPECIFIED";
  if (parameter.input_type === "text") return `PROJECT:${parameter.parameter_id}`;
  return numericFixture(parameter);
}

function sourceType(parameterId: string): ProfessionalParameterValueV4["source_type"] {
  if (parameterId.startsWith("unit_price_")) return "USER_EXPLICIT";
  if (parameterId.includes("productivity") || parameterId.includes("interval")) return "VERIFIED_RATEBOOK";
  if (parameterId.includes("mass") || parameterId.includes("board_") || parameterId.includes("consumable")) {
    return "MATERIAL_PASSPORT";
  }
  if (parameterId.includes("reference") || parameterId.includes("revision") || parameterId.includes("class") ||
    ["funding_source", "project_type", "normative_rate_code", "price_basis_date"].includes(parameterId)) {
    return "PROJECT_DOCUMENT";
  }
  return "USER_EXPLICIT";
}

export function batch001ParameterValues(
  catalogId: string,
  scopeMode: "MINIMAL_EXPLICIT_SCOPE" | "FULL_APPLICABLE_SCOPE" = "FULL_APPLICABLE_SCOPE",
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  const binding = interiorFinishesDomainFactory.binding_by_catalog_id.get(catalogId);
  if (!binding) throw new Error(`BATCH001_TEST_BINDING_MISSING:${catalogId}`);
  const technology = interiorFinishesDomainFactory.technology_by_id.get(binding.canonical_technology_id);
  const schema = interiorFinishesDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
  if (!technology || !schema) throw new Error(`BATCH001_TEST_SCHEMA_MISSING:${catalogId}`);
  return Object.fromEntries(schema.parameters.flatMap((parameter) => {
    if (scopeMode === "MINIMAL_EXPLICIT_SCOPE" && parameter.priority === "P1") return [];
    if (["length_m", "width_m"].includes(parameter.parameter_id)) return [];
    const raw = rawFixture(parameter, binding.scope_capability, scopeMode);
    return [[parameter.parameter_id, {
      value: raw,
      unit_id: parameter.unit_id,
      source_type: sourceType(parameter.parameter_id),
      source_id: `batch001-fixture:${catalogId}:${parameter.parameter_id}`,
      captured_at: BATCH001_CAPTURED_AT,
      confidence: "high" as const,
      applicability: `Exact bounded BATCH001 fixture for ${catalogId}`,
    } satisfies ProfessionalParameterValueV4]];
  }));
}

export function batch001ParamOverrides(catalogId: string) {
  return Object.fromEntries(Object.entries(batch001ParameterValues(catalogId)).map(([key, parameter]) => [
    key,
    {
      value: parameter.value,
      source: "user_input" as const,
      sourceText: parameter.source_id,
      lastChangedAt: BATCH001_CAPTURED_AT,
    },
  ]));
}

export function compileBatch001Work(catalogId: string) {
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((item) => item.catalog_id === catalogId);
  if (!inventory) throw new Error(`BATCH001_TEST_INVENTORY_MISSING:${catalogId}`);
  return buildInteriorFinishesProductionDraftV1({
    catalog_id: inventory.catalog_id,
    work_key: inventory.work_key,
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parent_revision_id: null,
    parameter_values: batch001ParameterValues(catalogId),
    normative_request: {
      country: "KG",
      region: "Bishkek",
      funding_source: "PRIVATE_RECOMMENDED",
      project_type: "RESIDENTIAL_INTERIOR",
      construction_state: "NEW",
      contract_basis: [],
      effective_date: "2026-08-13",
      material_system: "BULKHEAD",
      operation_class: inventory.work_type.toUpperCase(),
      rate_code_by_source_id: {
        KG_SP_KR_65_101_2025: "Е10-05-011-02",
        KG_KRER_10_05_011: "Е10-05-011-02",
      },
    },
    raw_input: inventory.localized_name_ru,
    currency: "KGS",
  });
}

export function compileAllBatch001Works() {
  return BATCH001_DRYWALL_BULKHEAD_CATALOG_IDS_V3.map((catalogId) => compileBatch001Work(catalogId));
}

export function batch001ExactParts(catalogId: string) {
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((item) => item.catalog_id === catalogId);
  if (!inventory) throw new Error(`BATCH001_TEST_INVENTORY_MISSING:${catalogId}`);
  const parts = buildBatch001DrywallBulkheadExactPackagePartsV3(inventory);
  if (!parts) throw new Error(`BATCH001_TEST_EXACT_PARTS_MISSING:${catalogId}`);
  return parts;
}

export function allBatch001ExactParts() {
  return BATCH001_DRYWALL_BULKHEAD_CATALOG_IDS_V3.map(batch001ExactParts);
}
