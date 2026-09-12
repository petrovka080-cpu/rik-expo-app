import {
  CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1,
  CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_NORM_ID,
  CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_PRODUCT_PROFILE_ID,
  CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_ID,
  CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA,
  constructionNormativeRegistryV1,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../../src/lib/estimate/v4/domainFactory";
import {
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  buildInteriorFinishesFromInlineInputV1,
  interiorFinishesDomainFactory,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";

const CAPTURED_AT = "2026-09-12T00:00:00.000Z";
const WATERPROOFING_WORK_KEY = "tile_stone_interior_ceramic_tile_waterproof_wet_zone";

function explicit(
  value: string | number | boolean,
  unitId: string | null = null,
): ProfessionalParameterValueV4 {
  return {
    value,
    unit_id: unitId,
    source_type: "USER_EXPLICIT",
    source_id: `test-project:${String(value)}`,
    captured_at: CAPTURED_AT,
    confidence: "high",
    applicability: "Exact Ceresit CL 51 project fixture",
  };
}

function exactInputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_PRODUCT_PROFILE_ID),
    area_m2: explicit(100, "m2"),
    coat_count: explicit(2, "item"),
    installation_location: explicit("indoor"),
    under_ceramic_covering: explicit(true),
    wet_zone_type: explicit("bathroom"),
    substrate_type: explicit("concrete"),
    substrate_preparation_confirmed: explicit(true),
    permanent_water_contact_excluded: explicit(true),
    rear_surface_moisture_excluded: explicit(true),
    chemical_exposure_excluded: explicit(true),
    selected_bucket_size_kg: explicit(15, "kg"),
    ...changes,
  };
}

function resolve(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "CERAMIC_TILE",
    operation_class: "WATERPROOF",
    material_system: "CERAMIC_TILE",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values,
  });
}

function validOverrideValue(parameter: {
  parameter_id: string;
  input_type: "number" | "boolean" | "choice" | "text";
  choices?: readonly { value: string }[];
  minimum?: number;
  maximum?: number;
}): string | number | boolean {
  if (parameter.parameter_id === "work_included") return true;
  if (parameter.parameter_id === "estimate_scope_mode") return "FULL_APPLICABLE_SCOPE";
  if (parameter.parameter_id === "scope_capability") return "wet_zone";
  if (parameter.parameter_id === "funding_source") return "PRIVATE_RECOMMENDED";
  if (parameter.parameter_id === "project_type") return "DOMESTIC_WET_ZONE_PROJECT";
  if (parameter.parameter_id === "product_profile_id") {
    return CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_PRODUCT_PROFILE_ID;
  }
  if (parameter.parameter_id === "normative_rate_code") return "PROJECT-VERIFIED-WATERPROOFING-RATE";
  if (parameter.parameter_id === "area_m2") return 100;
  if (parameter.parameter_id === "coat_count") return 2;
  if (parameter.parameter_id === "installation_location") return "indoor";
  if (parameter.parameter_id === "wet_zone_type") return "bathroom";
  if (parameter.parameter_id === "substrate_type") return "concrete";
  if (parameter.parameter_id === "selected_bucket_size_kg") return "15";
  if (parameter.parameter_id === "junction_tape_length_m") return 12;
  if (parameter.parameter_id === "penetration_collar_count") return 2;
  if (parameter.input_type === "boolean") return true;
  if (parameter.input_type === "choice") return parameter.choices?.[0]?.value ?? "PROJECT_SPECIFIED";
  if (parameter.input_type === "text") return `PROJECT:${parameter.parameter_id}`;
  const candidate = Math.max(parameter.minimum ?? 0.001, 1);
  return parameter.maximum == null ? candidate : Math.min(candidate, parameter.maximum);
}

describe("Ceresit CL 51 canonical physical norm", () => {
  test("registers the reviewed two-coat TDS as one exact executable binding", () => {
    expect(CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA).toMatchObject({
      norm_id: CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_NORM_ID,
      rate_value: 1.3,
      rate_unit: "minimum kg/m2 for two coats",
      coat_count: 2,
      dry_film_min_mm: 0.5,
      documented_bucket_sizes_kg: [5, 15],
      waste_percent_default: 0,
    });
    expect(constructionNormativeRegistryV1.get(CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_ID))
      .toMatchObject({
        source_type: "MANUFACTURER_PASSPORT",
        authority: "Ceresit / Henkel",
        operation_class_applicability: ["WATERPROOF"],
        material_system_applicability: ["CERAMIC_TILE"],
        product_profile_applicability: [CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_PRODUCT_PROFILE_ID],
      });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1.filter(
      (binding) => binding.norm_id === CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_NORM_ID,
    )).toEqual([expect.objectContaining({
      binding_route: "CANONICAL_V4_APPLICABILITY",
      technology_class: "CERAMIC_TILE",
      operation_class: "WATERPROOF",
      source_definition_hash: CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA.definition_hash,
      produced_parameter_ids: ["cl51_procurement_quantity_kg"],
    })]);
  });

  test("fails closed when the exact two-coat domestic wet-zone scope is incomplete or excluded", () => {
    const { substrate_preparation_confirmed: _omitted, ...withoutPreparation } = exactInputs();
    expect(resolve(withoutPreparation)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      blockers: ["PROJECT_VALUE_REQUIRED_EXPLICIT:substrate_preparation_confirmed"],
    });
    expect(resolve(exactInputs({ coat_count: explicit(1, "item") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_NORM_ID}:coat_count=1`,
      ],
    });
    expect(resolve(exactInputs({ permanent_water_contact_excluded: explicit(false) })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: [
          `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_NORM_ID}:permanent_water_contact_excluded=false`,
        ],
      });
  });

  test("calculates the total two-coat minimum and selected-bucket procurement without mutation", () => {
    const input = exactInputs();
    const first = resolve(input);
    const second = resolve(input);
    expect(first).toMatchObject({
      status: "APPLIED",
      source_id: CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_ID,
      norm_id: CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_NORM_ID,
      source_definition_hash: CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA.definition_hash,
      produced_parameter_ids: ["cl51_procurement_quantity_kg"],
      calculated_cl51_minimum_net_quantity_kg: 130,
      calculated_cl51_procurement_quantity_kg: 135,
      calculated_cl51_bucket_count: 9,
    });
    expect(first.parameter_values.cl51_procurement_quantity_kg).toMatchObject({
      value: 135,
      unit_id: "kg",
      source_type: "APPLICABLE_NORM",
      source_id: CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_ID,
    });
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
    expect(input.cl51_procurement_quantity_kg).toBeUndefined();
    expect(resolve(exactInputs({ cl51_procurement_quantity_kg: explicit(130, "kg") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: ["PHYSICAL_NORM_VALUE_CONFLICT:cl51_procurement_quantity_kg=130:norm_value=135"],
      });
  });

  test("routes CL 51 through the exact overlay into one source-owned material row", () => {
    const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find(
      (row) => row.work_key === WATERPROOFING_WORK_KEY,
    );
    if (!inventory) throw new Error("CERESIT_CL51_RUNTIME_WATERPROOFING_WORK_MISSING");
    const technology = interiorFinishesDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
    const schema = interiorFinishesDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
    if (!technology || !schema) throw new Error("CERESIT_CL51_RUNTIME_WATERPROOFING_SCHEMA_MISSING");
    expect(technology).toMatchObject({
      operation_class: "WATERPROOF",
      material_system: "CERAMIC_TILE",
      output: { dimension: "AREA", unit_id: "m2" },
    });

    const exactQuestionIds = [
      "coat_count",
      "installation_location",
      "under_ceramic_covering",
      "wet_zone_type",
      "substrate_type",
      "substrate_preparation_confirmed",
      "permanent_water_contact_excluded",
      "rear_surface_moisture_excluded",
      "chemical_exposure_excluded",
      "selected_bucket_size_kg",
    ];
    expect(schema.parameters.filter((parameter) => exactQuestionIds.includes(parameter.parameter_id))
      .map((parameter) => parameter.parameter_id)).toEqual(exactQuestionIds);
    expect(schema.parameters.filter((parameter) => exactQuestionIds.includes(parameter.parameter_id))
      .every((parameter) => parameter.required_when.kind === "EQUALS" &&
        parameter.required_when.parameter_id === "product_profile_id" &&
        parameter.required_when.value === CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_PRODUCT_PROFILE_ID))
      .toBe(true);

    const paramOverrides = Object.fromEntries(schema.parameters
      .filter((parameter) => parameter.parameter_id !== "cl51_procurement_quantity_kg")
      .map((parameter) => [parameter.parameter_id, {
        value: validOverrideValue(parameter),
        source: "user",
      }]));
    const result = buildInteriorFinishesFromInlineInputV1({
      rawInput: "Гидроизоляция Ceresit CL 51 под плитку в ванной, площадь 100 м², два слоя",
      selectedWorkKey: WATERPROOFING_WORK_KEY,
      city: "Bishkek",
      currency: "KGS",
      paramOverrides,
    });

    expect(result.exact_match).toBe(true);
    expect(result.missing_parameter_ids).toEqual([]);
    expect(result.production?.compile_result.status).toBe("COMPILED");
    expect(result.production?.compile_result.normative_resolution.applicable_sources
      .map((source) => source.source_id)).toContain(CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_ID);
    const materialRowId = `${inventory.canonical_technology_id}:ceresit-cl51-v1:row:cl51_material`;
    const materialRow = result.production?.draft?.items.find(
      (row) => row.sourceParameters?.rowCode === materialRowId,
    );
    expect(materialRow).toMatchObject({ quantity: 135, unit: "kg" });
    expect(materialRow?.sourceParameters?.normativeSourceIds)
      .toEqual([CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_ID]);
    expect(materialRow?.sourceParameters?.parameterSourceIds)
      .toContain(CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_ID);
    expect(materialRow?.sourceParameters?.professionalPhysicalNormApplicabilityV1).toMatchObject({
      source_id: CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_ID,
      source_definition_hash: CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA.definition_hash,
      calculated_cl51_minimum_net_quantity_kg: 130,
      calculated_cl51_procurement_quantity_kg: 135,
      calculated_cl51_bucket_count: 9,
    });
    expect(result.production?.draft?.items.filter((row) =>
      (row.sourceParameters?.normativeSourceIds as readonly string[] | undefined)
        ?.includes(CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_ID))).toHaveLength(1);
    expect(result.production?.draft?.items.some((row) =>
      row.sourceParameters?.rowCode === `${inventory.canonical_technology_id}:row:primary_material`))
      .toBe(false);
  });
});
