import {
  CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1,
  CERESIT_CT29_INTERIOR_WALL_PLASTER_NORM_ID,
  CERESIT_CT29_INTERIOR_WALL_PLASTER_PRODUCT_PROFILE_ID,
  CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_ID,
  CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_METADATA,
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
const WALL_PLASTER_APPLY_WORK_KEY = "plaster_paint_interior_wall_plaster_apply_standard";

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
    applicability: "Exact CT 29 project fixture",
  };
}

function exactInputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(CERESIT_CT29_INTERIOR_WALL_PLASTER_PRODUCT_PROFILE_ID),
    area_m2: explicit(100, "m2"),
    layer_thickness_mm: explicit(5, "mm"),
    ct29_application_mode: explicit("plaster_application_by_area_and_thickness"),
    surface_type: explicit("CONCRETE"),
    substrate_type: explicit("concrete"),
    substrate_rough_load_carrying_clean_confirmed: explicit(true),
    substrate_absorbency_class: explicit("normal_absorption"),
    substrate_absorbency_preparation_confirmed: explicit(true),
    installation_location: explicit("indoor"),
    application_conditions_confirmed: explicit(true),
    exterior_curing_protection_confirmed: explicit(false),
    ct29_global_tds_variant_confirmed: explicit(true),
    selected_bag_size_kg: explicit(25, "kg"),
    ...changes,
  };
}

function resolve(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "WALL_PLASTER",
    operation_class: "APPLY",
    material_system: "WALL_PLASTER",
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
  if (parameter.parameter_id === "funding_source") return "PRIVATE_RECOMMENDED";
  if (parameter.parameter_id === "project_type") return "INTERIOR_WALL_PLASTER_PROJECT";
  if (parameter.parameter_id === "product_profile_id") {
    return CERESIT_CT29_INTERIOR_WALL_PLASTER_PRODUCT_PROFILE_ID;
  }
  if (parameter.parameter_id === "normative_rate_code") return "PROJECT-VERIFIED-WALL-PLASTER-RATE";
  if (parameter.parameter_id === "area_m2") return 100;
  if (parameter.parameter_id === "layer_thickness_mm") return 5;
  if (parameter.parameter_id === "surface_type") return "CONCRETE";
  if (parameter.parameter_id === "ct29_application_mode") {
    return "plaster_application_by_area_and_thickness";
  }
  if (parameter.parameter_id === "substrate_type") return "concrete";
  if (parameter.parameter_id === "substrate_absorbency_class") return "normal_absorption";
  if (parameter.parameter_id === "installation_location") return "indoor";
  if (parameter.parameter_id === "selected_bag_size_kg") return "25";
  if (parameter.parameter_id === "exterior_curing_protection_confirmed") return false;
  if (parameter.input_type === "boolean") return true;
  if (parameter.input_type === "choice") return parameter.choices?.[0]?.value ?? "PROJECT_SPECIFIED";
  if (parameter.input_type === "text") return `PROJECT:${parameter.parameter_id}`;
  const candidate = Math.max(parameter.minimum ?? 0.001, 1);
  return parameter.maximum == null ? candidate : Math.min(candidate, parameter.maximum);
}

describe("Ceresit CT 29 canonical physical norm", () => {
  test("registers the reviewed source pack as one exact executable binding", () => {
    expect(CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_METADATA).toMatchObject({
      norm_id: CERESIT_CT29_INTERIOR_WALL_PLASTER_NORM_ID,
      rate_value: 1.8,
      tds_identifier: "C_CT29_TDS_1_0120",
      application_mode: "plaster_application_by_area_and_thickness",
      excluded_application_mode: "deep_loss_filling_by_volume",
      documented_bag_sizes_kg: [5, 25],
      waste_percent_default: 0,
    });
    expect(constructionNormativeRegistryV1.get(CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_ID))
      .toMatchObject({
        source_type: "MANUFACTURER_PASSPORT",
        authority: "Ceresit / Henkel",
        operation_class_applicability: ["APPLY"],
        material_system_applicability: ["WALL_PLASTER"],
        product_profile_applicability: [CERESIT_CT29_INTERIOR_WALL_PLASTER_PRODUCT_PROFILE_ID],
      });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1.filter(
      (binding) => binding.norm_id === CERESIT_CT29_INTERIOR_WALL_PLASTER_NORM_ID,
    )).toEqual([expect.objectContaining({
      binding_route: "CANONICAL_V4_APPLICABILITY",
      technology_class: "WALL_PLASTER",
      operation_class: "APPLY",
      source_definition_hash: CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_METADATA.definition_hash,
      produced_parameter_ids: ["material_consumption_kg_m2_mm"],
    })]);
  });

  test("fails closed for missing or incompatible project applicability", () => {
    const { layer_thickness_mm: _omitted, ...missingThickness } = exactInputs();
    expect(resolve(missingThickness)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      blockers: ["PROJECT_VALUE_REQUIRED_EXPLICIT:layer_thickness_mm"],
    });
    expect(resolve(exactInputs({ ct29_application_mode: explicit("deep_loss_filling_by_volume") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: [
          `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT29_INTERIOR_WALL_PLASTER_NORM_ID}:ct29_application_mode=deep_loss_filling_by_volume`,
        ],
      });
    expect(resolve(exactInputs({ surface_type: explicit("GYPSUM_BOARD") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_PROJECT_VALUE_CONFLICT:surface_type=GYPSUM_BOARD:substrate_type=concrete"],
    });
    expect(resolve(exactInputs({ installation_location: explicit("outdoor") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: expect.arrayContaining([
        `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT29_INTERIOR_WALL_PLASTER_NORM_ID}:installation_location=outdoor`,
      ]),
    });
  });

  test("derives the exact rate and package trace without mutating the input", () => {
    const input = exactInputs();
    const first = resolve(input);
    const second = resolve(input);

    expect(first).toMatchObject({
      status: "APPLIED",
      source_id: CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_ID,
      norm_id: CERESIT_CT29_INTERIOR_WALL_PLASTER_NORM_ID,
      source_definition_hash: CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_METADATA.definition_hash,
      produced_parameter_ids: ["material_consumption_kg_m2_mm"],
      calculated_ct29_net_quantity_kg: 900,
      calculated_ct29_procurement_quantity_kg: 900,
      calculated_ct29_bag_count: 36,
    });
    expect(first.parameter_values.material_consumption_kg_m2_mm).toMatchObject({
      value: 1.8,
      unit_id: "kg_per_m2_mm",
      source_type: "APPLICABLE_NORM",
      source_id: CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_ID,
    });
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
    expect(input.material_consumption_kg_m2_mm).toBeUndefined();

    expect(resolve(exactInputs({ material_consumption_kg_m2_mm: explicit(2, "kg_per_m2_mm") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: ["PHYSICAL_NORM_VALUE_CONFLICT:material_consumption_kg_m2_mm=2:norm_value=1.8"],
      });
  });

  test("routes the exact source into the canonical interior material row", () => {
    const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find(
      (row) => row.work_key === WALL_PLASTER_APPLY_WORK_KEY,
    );
    if (!inventory) throw new Error("CERESIT_CT29_RUNTIME_WALL_PLASTER_WORK_MISSING");
    const technology = interiorFinishesDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
    const schema = interiorFinishesDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
    if (!technology || !schema) throw new Error("CERESIT_CT29_RUNTIME_WALL_PLASTER_SCHEMA_MISSING");
    expect(technology).toMatchObject({ operation_class: "APPLY", material_system: "WALL_PLASTER" });

    const exactQuestionIds = [
      "ct29_application_mode",
      "substrate_type",
      "substrate_rough_load_carrying_clean_confirmed",
      "substrate_absorbency_class",
      "substrate_absorbency_preparation_confirmed",
      "installation_location",
      "application_conditions_confirmed",
      "exterior_curing_protection_confirmed",
      "ct29_global_tds_variant_confirmed",
      "selected_bag_size_kg",
    ];
    expect(schema.parameters.filter((parameter) => exactQuestionIds.includes(parameter.parameter_id))
      .map((parameter) => parameter.parameter_id)).toEqual(exactQuestionIds);
    expect(schema.parameters.filter((parameter) => exactQuestionIds.includes(parameter.parameter_id))
      .every((parameter) => parameter.required_when.kind === "EQUALS" &&
        parameter.required_when.parameter_id === "product_profile_id" &&
        parameter.required_when.value === CERESIT_CT29_INTERIOR_WALL_PLASTER_PRODUCT_PROFILE_ID))
      .toBe(true);

    const paramOverrides = Object.fromEntries(schema.parameters
      .filter((parameter) => parameter.parameter_id !== "material_consumption_kg_m2_mm")
      .map((parameter) => [parameter.parameter_id, {
        value: validOverrideValue(parameter),
        source: "user",
      }]));
    const result = buildInteriorFinishesFromInlineInputV1({
      rawInput: "Штукатурка 100 м² внутренних бетонных стен Ceresit CT 29 слоем 5 мм",
      selectedWorkKey: WALL_PLASTER_APPLY_WORK_KEY,
      city: "Bishkek",
      currency: "KGS",
      paramOverrides,
    });

    expect(result.exact_match).toBe(true);
    expect(result.missing_parameter_ids).toEqual([]);
    expect(result.production?.compile_result.status).toBe("COMPILED");
    expect(result.production?.compile_result.normative_resolution.applicable_sources
      .map((source) => source.source_id)).toContain(CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_ID);
    const materialRow = result.production?.draft?.items.find((row) =>
      row.sourceParameters?.rowCode === `${inventory.canonical_technology_id}:row:primary_material`);
    expect(materialRow).toMatchObject({ quantity: 900, unit: "kg" });
    expect(materialRow?.sourceParameters?.normativeSourceIds)
      .toContain(CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_ID);
    expect(materialRow?.sourceParameters?.parameterSourceIds)
      .toContain(CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_ID);
    expect(materialRow?.sourceParameters?.professionalPhysicalNormApplicabilityV1).toMatchObject({
      source_id: CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_ID,
      source_definition_hash: CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_METADATA.definition_hash,
      calculated_ct29_net_quantity_kg: 900,
      calculated_ct29_procurement_quantity_kg: 900,
      calculated_ct29_bag_count: 36,
    });
    expect(result.production?.draft?.items.filter((row) =>
      (row.sourceParameters?.normativeSourceIds as readonly string[] | undefined)
        ?.includes(CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_ID))).toHaveLength(1);
  });
});
