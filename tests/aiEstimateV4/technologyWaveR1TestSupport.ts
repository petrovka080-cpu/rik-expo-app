import type { ProfessionalDomainParameterDefinitionV1 } from "../../src/lib/estimate/v4/domainFactory";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import {
  DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  buildDrywallArchitecturalElementProfessionalPackagePartsV4,
  buildInteriorFinishesProductionDraftV1,
  interiorFinishesDomainFactory,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";

export const TECHNOLOGY_WAVE_CAPTURED_AT = "2026-08-13T12:00:00.000Z";

function numericFixture(parameter: ProfessionalDomainParameterDefinitionV1): number {
  const id = parameter.parameter_id;
  if (id === "area_m2") return 96;
  if (id === "length_m") return 12;
  if (id === "width_m") return 8;
  if (id === "perimeter_m") return 40;
  if (id === "working_height_m") return 3.4;
  if (id === "curve_element_count") return 4;
  if (id === "curve_radius_m") return 2;
  if (id === "curve_angle_deg") return 90;
  if (id === "curve_element_width_m") return 0.6;
  if (id === "curve_drop_height_m") return 0.45;
  if (id === "curve_track_line_count") return 2;
  if (id === "curve_stud_spacing_m") return 0.4;
  if (id === "curve_cross_member_spacing_m") return 0.6;
  if (id === "curve_hanger_spacing_m") return 0.8;
  if (id === "curve_track_anchor_spacing_m") return 0.51;
  if (id === "curve_hanger_rod_length_m") return 0.63;
  if (id === "curve_access_hatch_count") return 2;
  if (id === "curve_mep_intersection_count") return 4;
  if (id === "curve_hatch_reinforcement_per_hatch_m") return 2.52;
  if (id === "curve_mep_reinforcement_per_intersection_m") return 1.26;
  if (id === "curve_reinforcement_connectors_per_opening") return 32 / 6;
  if (id === "curve_screws_per_connection") return 313 / 180;
  if (id === "curve_flexible_track_waste_fraction") return 0.1;
  if (id === "curve_profile_waste_fraction") return 0.05;
  if (id === "quantity_frame_profile_connectors") return 50;
  if (id === "defect_area_m2") return 18;
  if (id === "joint_length_m") return 210;
  if (id === "delivery_mass_kg") return 1_250;
  if (id.includes("distance_km")) return 18;
  if (id.startsWith("unit_price_")) return 275;
  if (id.includes("productivity")) return 8;
  if (id.includes("fraction")) return 0.08;
  if (id.includes("layer_count")) return 2;
  if (id.includes("count")) return 4;
  if (id.includes("rate_")) return 1.15;
  const value = Math.max(parameter.minimum ?? 0.000001, 1);
  return parameter.maximum != null && value > parameter.maximum ? parameter.maximum : value;
}

function rawFixture(parameter: ProfessionalDomainParameterDefinitionV1): string | number | boolean {
  if (parameter.parameter_id === "work_included") return true;
  if (parameter.parameter_id === "estimate_scope_mode") return "FULL_APPLICABLE_SCOPE";
  if (parameter.parameter_id === "funding_source") return "PRIVATE_RECOMMENDED";
  if (parameter.parameter_id === "project_type") return "RESIDENTIAL_INTERIOR";
  if (parameter.parameter_id === "normative_rate_code") return "PROJECT-VERIFIED-KRERr-CODE";
  if (parameter.parameter_id === "price_basis_reference") return "SUPPLIER-QUOTATION-BISHKEK-2026-08-13";
  if (parameter.parameter_id === "price_basis_date") return "2026-08-13";
  if (parameter.parameter_id === "product_profile_id") return "PROJECT-COMPATIBLE-DRYWALL-SYSTEM-001";
  if (parameter.parameter_id === "material_certificate_reference") return "KG-ACTIVE-PARTY-CERTIFICATE-001";
  if (parameter.parameter_id === "system_passport_reference") return "SYSTEM-PASSPORT-AND-TDS-001";
  if (parameter.input_type === "boolean") return true;
  if (parameter.input_type === "choice") return parameter.choices?.[0]?.value ?? "PROJECT_SPECIFIED";
  if (parameter.input_type === "text") return `PROJECT:${parameter.parameter_id}`;
  return numericFixture(parameter);
}

function sourceType(parameterId: string): ProfessionalParameterValueV4["source_type"] {
  if (parameterId.startsWith("unit_price_")) return "USER_EXPLICIT";
  if (parameterId.includes("productivity") || parameterId.includes("waste_rate")) return "VERIFIED_RATEBOOK";
  if (parameterId.includes("rate_") || parameterId.includes("fraction") || parameterId.includes("product_") || parameterId.includes("certificate") || parameterId.includes("passport")) return "MATERIAL_PASSPORT";
  if (parameterId.includes("reference") || parameterId.includes("revision") || parameterId.includes("record") || parameterId.includes("detail") || ["funding_source", "project_type", "normative_rate_code", "price_basis_date"].includes(parameterId)) return "PROJECT_DOCUMENT";
  return "USER_EXPLICIT";
}

export function technologyWaveParameterValues(catalogId: string): Readonly<Record<string, ProfessionalParameterValueV4>> {
  const binding = interiorFinishesDomainFactory.binding_by_catalog_id.get(catalogId);
  const technology = interiorFinishesDomainFactory.technology_by_id.get(binding?.canonical_technology_id ?? "");
  const schema = interiorFinishesDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
  if (!binding || !technology || !schema) throw new Error(`TECHNOLOGY_WAVE_SCHEMA_MISSING:${catalogId}`);
  return Object.fromEntries(schema.parameters.map((parameter) => {
    return [parameter.parameter_id, {
      value: rawFixture(parameter),
      unit_id: parameter.unit_id,
      source_type: sourceType(parameter.parameter_id),
      source_id: `technology-wave-fixture:${catalogId}:${parameter.parameter_id}`,
      captured_at: TECHNOLOGY_WAVE_CAPTURED_AT,
      confidence: "high" as const,
      applicability: `Exact bounded technology-wave fixture for ${catalogId}`,
    } satisfies ProfessionalParameterValueV4];
  }));
}

export function technologyWaveParamOverrides(catalogId: string) {
  return Object.fromEntries(Object.entries(technologyWaveParameterValues(catalogId)).map(([key, value]) => [
    key,
    { value: value.value, source: "user_input" as const, sourceText: value.source_id, lastChangedAt: TECHNOLOGY_WAVE_CAPTURED_AT },
  ]));
}

export function exactTechnologyWaveParts(catalogId: string) {
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) => row.catalog_id === catalogId);
  if (!inventory) throw new Error(`TECHNOLOGY_WAVE_INVENTORY_MISSING:${catalogId}`);
  const parts = buildDrywallArchitecturalElementProfessionalPackagePartsV4(inventory);
  if (!parts) throw new Error(`TECHNOLOGY_WAVE_PARTS_MISSING:${catalogId}`);
  return parts;
}

export function allTechnologyWaveParts() {
  return DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4.map(exactTechnologyWaveParts);
}

export function compileTechnologyWaveWork(catalogId: string) {
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) => row.catalog_id === catalogId);
  if (!inventory) throw new Error(`TECHNOLOGY_WAVE_INVENTORY_MISSING:${catalogId}`);
  const operation = inventory.work_type.toUpperCase();
  const repair = operation === "REPAIR";
  return buildInteriorFinishesProductionDraftV1({
    catalog_id: catalogId,
    work_key: inventory.work_key,
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parent_revision_id: null,
    parameter_values: technologyWaveParameterValues(catalogId),
    normative_request: {
      country: "KG",
      region: "Bishkek",
      funding_source: "PRIVATE_RECOMMENDED",
      project_type: "RESIDENTIAL_INTERIOR",
      construction_state: repair ? "REPAIR" : "NEW",
      contract_basis: [],
      effective_date: "2026-08-13",
      material_system: catalogId.includes("_bulkhead_") ? "BULKHEAD" : "CURVE",
      operation_class: operation,
      rate_code_by_source_id: {
        KG_KRER_10_05_011: "Е10-05-011-02",
        kg_krerr_2015_application_guidance: "PROJECT-VERIFIED-KRERr-CODE",
      },
    },
    raw_input: inventory.localized_name_ru,
    currency: "KGS",
  });
}

export function compileAllTechnologyWaveWorks() {
  return DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4.map(compileTechnologyWaveWork);
}
