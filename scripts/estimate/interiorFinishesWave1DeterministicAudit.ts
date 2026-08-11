import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import {
  compileProfessionalEstimateDomainV1,
  constructionNormativeRegistryV1,
  type ProfessionalDomainCompileResultV1,
} from "../../src/lib/estimate/v4/domainFactory";
import {
  INTERIOR_FINISHES_WAVE_1_INVENTORY,
  interiorFinishesWave1DomainFactory,
  type InteriorFinishesWave1InventoryRow,
} from "../../src/lib/estimate/v4/domains/interiorFinishesWave1";

export const INTERIOR_WAVE1_AUDIT_FIXTURE_VERSION =
  "interior-wave1-explicit-audit-fixture:not-production-defaults:v1" as const;

export type InteriorWave1AuditRecord = {
  catalog_id: string;
  work_key: string;
  title_ru: string;
  canonical_technology_id: string;
  scope_capability: InteriorFinishesWave1InventoryRow["scope_capability"];
  scope_mode: "MINIMAL_EXPLICIT_SCOPE" | "FULL_APPLICABLE_SCOPE";
  exact_identity: ProfessionalDomainCompileResultV1["exact_identity"];
  status: ProfessionalDomainCompileResultV1["status"];
  blockers: ProfessionalDomainCompileResultV1["blockers"];
  normative_resolution: ProfessionalDomainCompileResultV1["normative_resolution"];
  compilation: ProfessionalDomainCompileResultV1["compilation"];
  deterministic_hash: string;
};

const CAPTURED_AT = "2026-08-11T00:00:00.000Z";

const EXPLICIT_AUDIT_NUMBERS: Readonly<Record<string, number>> = Object.freeze({
  area_m2: 120,
  junction_length_m: 48,
  layer_thickness_mm: 2,
  material_consumption_kg_m2_mm: 0.9,
  coat_count: 2,
  material_consumption_kg_m2_coat: 0.18,
  material_consumption_m2_m2: 1.1,
  material_consumption_m_m: 1.05,
  material_mass_kg_per_unit: 0.2,
  labor_productivity_output_per_man_hour: 8,
  equipment_productivity_output_per_machine_hour: 25,
  surface_preparation_productivity_output_per_man_hour: 15,
  auxiliary_material_rate_kg_per_output: 0.05,
  waste_percent: 3,
  delivery_distance_km: 12,
  truck_payload_t: 5,
  loading_productivity_kg_per_man_hour: 500,
  waste_handling_productivity_kg_per_man_hour: 300,
  qa_interval_output_per_test: 100,
  documentation_record_count: 3,
  small_area_detail_productivity_output_per_man_hour: 4,
  large_area_material_handling_productivity_kg_per_machine_hour: 750,
  wet_zone_protection_rate_kg_per_output: 0.35,
  wet_zone_moisture_control_interval_output_per_test: 40,
  technical_room_protective_material_rate_kg_per_output: 0.22,
  technical_room_detailing_productivity_output_per_man_hour: 5,
  high_load_reinforcement_rate_output_per_output: 1.08,
  high_load_reinforcement_productivity_output_per_man_hour: 6,
  repair_removal_quantity_output: 24,
  repair_removed_mass_kg_per_output: 8,
  repair_removal_productivity_output_per_man_hour: 3,
  repair_waste_haul_distance_km: 18,
});

function value(
  raw: string | number | boolean,
  unitId: string | null,
  sourceType: ProfessionalParameterValueV4["source_type"] = "USER_EXPLICIT",
): ProfessionalParameterValueV4 {
  return {
    value: raw,
    unit_id: unitId,
    source_type: sourceType,
    source_id: `${INTERIOR_WAVE1_AUDIT_FIXTURE_VERSION}:${sourceType}:${String(raw)}`,
    captured_at: CAPTURED_AT,
    confidence: "high",
    applicability: "Explicit deterministic acceptance value; never used as a production fallback or default",
  };
}

export function buildInteriorWave1ExplicitAuditValues(
  catalogId: string,
  scopeMode: "MINIMAL_EXPLICIT_SCOPE" | "FULL_APPLICABLE_SCOPE",
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  const binding = interiorFinishesWave1DomainFactory.binding_by_catalog_id.get(catalogId);
  if (!binding) throw new Error(`AUDIT_BINDING_NOT_FOUND:${catalogId}`);
  const technology = interiorFinishesWave1DomainFactory.technology_by_id.get(binding.canonical_technology_id);
  if (!technology) throw new Error(`AUDIT_TECHNOLOGY_NOT_FOUND:${binding.canonical_technology_id}`);
  const schema = interiorFinishesWave1DomainFactory.schema_by_id.get(technology.parameter_schema_id);
  if (!schema) throw new Error(`AUDIT_SCHEMA_NOT_FOUND:${technology.parameter_schema_id}`);
  return Object.fromEntries(schema.parameters
    .filter((parameter) => scopeMode === "FULL_APPLICABLE_SCOPE" || parameter.priority === "P0")
    .map((parameter) => {
      if (parameter.parameter_id === "work_included") return [parameter.parameter_id, value(true, null)];
      if (parameter.parameter_id === "estimate_scope_mode") return [parameter.parameter_id, value(scopeMode, null)];
      if (parameter.parameter_id === "scope_capability") return [parameter.parameter_id, value(binding.scope_capability, null)];
      if (parameter.parameter_id === "funding_source") return [parameter.parameter_id, value("PRIVATE_RECOMMENDED", null, "PROJECT_DOCUMENT")];
      if (parameter.parameter_id === "project_type") return [parameter.parameter_id, value("RESIDENTIAL_INTERIOR", null, "PROJECT_DOCUMENT")];
      if (parameter.parameter_id === "surface_type") return [parameter.parameter_id, value("PROJECT_SPECIFIED", null)];
      if (parameter.parameter_id === "existing_condition") return [parameter.parameter_id, value("ACCEPTED", null)];
      if (parameter.parameter_id === "application_method") return [parameter.parameter_id, value("MECHANIZED", null)];
      if (parameter.parameter_id === "product_profile_id") {
        return [parameter.parameter_id, value("AUDIT-PROJECT-MATERIAL-PASSPORT-IFW1", null, "MATERIAL_PASSPORT")];
      }
      if (parameter.parameter_id === "normative_rate_code") {
        return [parameter.parameter_id, value("AUDIT-PROJECT-VERIFIED-RATE-IFW1", null, "PROJECT_DOCUMENT")];
      }
      const numeric = EXPLICIT_AUDIT_NUMBERS[parameter.parameter_id];
      if (numeric == null) throw new Error(`AUDIT_EXPLICIT_VALUE_MISSING:${parameter.parameter_id}`);
      const normRate = parameter.parameter_id.includes("productivity");
      const materialRate = parameter.parameter_id.includes("material_consumption") ||
        parameter.parameter_id.includes("material_mass") ||
        parameter.parameter_id.includes("auxiliary_material_rate");
      return [parameter.parameter_id, value(
        numeric,
        parameter.unit_id,
        normRate ? "APPLICABLE_NORM" : materialRate ? "MATERIAL_PASSPORT" : "USER_EXPLICIT",
      )];
    }));
}

export function runInteriorFinishesWave1DeterministicAudit() {
  const minimal: InteriorWave1AuditRecord[] = [];
  const full: InteriorWave1AuditRecord[] = [];
  const failures: { catalog_id: string; scope_mode: string; blockers: readonly string[] }[] = [];
  for (const inventory of INTERIOR_FINISHES_WAVE_1_INVENTORY) {
    const technology = interiorFinishesWave1DomainFactory.technology_by_id.get(inventory.canonical_technology_id);
    if (!technology) throw new Error(`AUDIT_TECHNOLOGY_NOT_FOUND:${inventory.canonical_technology_id}`);
    for (const scopeMode of ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"] as const) {
      const isRepair = inventory.scope_capability === "repair";
      const parameterValues = buildInteriorWave1ExplicitAuditValues(inventory.catalog_id, scopeMode);
      const rateCode = String(parameterValues.normative_rate_code?.value ?? "");
      const result = compileProfessionalEstimateDomainV1(
        interiorFinishesWave1DomainFactory,
        constructionNormativeRegistryV1,
        {
          catalog_id: inventory.catalog_id,
          work_key: inventory.work_key,
          scope_mode: scopeMode,
          parent_revision_id: null,
          parameter_values: parameterValues,
          normative_request: {
            country: "KG",
            region: "Bishkek",
            funding_source: "PRIVATE_RECOMMENDED",
            project_type: "RESIDENTIAL_INTERIOR",
            construction_state: isRepair ? "REPAIR" : "NEW",
            contract_basis: [],
            effective_date: "2026-08-11",
            material_system: technology.material_system,
            operation_class: technology.operation_class,
            rate_code_by_source_id: {
              [isRepair ? "kg_krerr_2015_application_guidance" : "kg_krer_2015_application_guidance"]:
                rateCode,
            },
          },
        },
      );
      const record: InteriorWave1AuditRecord = {
        catalog_id: inventory.catalog_id,
        work_key: inventory.work_key,
        title_ru: inventory.localized_name_ru,
        canonical_technology_id: inventory.canonical_technology_id,
        scope_capability: inventory.scope_capability,
        scope_mode: scopeMode,
        exact_identity: result.exact_identity,
        status: result.status,
        blockers: result.blockers,
        normative_resolution: result.normative_resolution,
        compilation: result.compilation,
        deterministic_hash: result.deterministic_hash,
      };
      if (result.status !== "COMPILED" || !result.compilation || result.compilation.compiled_rows.length === 0) {
        failures.push({ catalog_id: inventory.catalog_id, scope_mode: scopeMode, blockers: result.blockers });
      }
      (scopeMode === "MINIMAL_EXPLICIT_SCOPE" ? minimal : full).push(record);
    }
  }
  return {
    fixture_version: INTERIOR_WAVE1_AUDIT_FIXTURE_VERSION,
    denominator: INTERIOR_FINISHES_WAVE_1_INVENTORY.length,
    minimal,
    full,
    failures,
  };
}
