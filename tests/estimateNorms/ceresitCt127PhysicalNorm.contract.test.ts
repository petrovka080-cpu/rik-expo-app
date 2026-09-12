import {
  CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1,
  CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_NORM_ID,
  CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID,
  CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_ID,
  CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA,
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
const WALL_PUTTY_APPLY_WORK_KEY = "plaster_paint_interior_wall_putty_apply_standard";

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
    applicability: "Exact CT 127 project fixture",
  };
}

function exactInputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID),
    area_m2: explicit(100, "m2"),
    layer_thickness_mm: explicit(2, "mm"),
    surface_type: explicit("CEMENT_PLASTER"),
    substrate_type: explicit("cement_plaster"),
    substrate_absorbency: explicit("absorbent"),
    substrate_load_bearing_dry_clean_confirmed: explicit(true),
    substrate_preparation_system: explicit("CERESIT_CT17"),
    selected_consumption_kg_m2: explicit(0.7, "kg_per_m2"),
    dry_interior_no_permanent_humidity_confirmed: explicit(true),
    application_temperature_confirmed: explicit(true),
    selected_bag_size_kg: explicit(20, "kg"),
    ...changes,
  };
}

function resolve(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "WALL_PUTTY",
    operation_class: "APPLY",
    material_system: "WALL_PUTTY",
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
  if (parameter.parameter_id === "project_type") return "INTERIOR_FINISH_PUTTY_PROJECT";
  if (parameter.parameter_id === "product_profile_id") {
    return CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID;
  }
  if (parameter.parameter_id === "normative_rate_code") return "PROJECT-VERIFIED-FINISH-PUTTY-RATE";
  if (parameter.parameter_id === "area_m2") return 100;
  if (parameter.parameter_id === "layer_thickness_mm") return 2;
  if (parameter.parameter_id === "surface_type") return "CEMENT_PLASTER";
  if (parameter.parameter_id === "substrate_type") return "cement_plaster";
  if (parameter.parameter_id === "substrate_absorbency") return "absorbent";
  if (parameter.parameter_id === "substrate_preparation_system") return "CERESIT_CT17";
  if (parameter.parameter_id === "selected_consumption_kg_m2") return 0.7;
  if (parameter.parameter_id === "selected_bag_size_kg") return "20";
  if (parameter.input_type === "boolean") return true;
  if (parameter.input_type === "choice") return parameter.choices?.[0]?.value ?? "PROJECT_SPECIFIED";
  if (parameter.input_type === "text") return `PROJECT:${parameter.parameter_id}`;
  const candidate = Math.max(parameter.minimum ?? 0.001, 1);
  return parameter.maximum == null ? candidate : Math.min(candidate, parameter.maximum);
}

describe("Ceresit CT 127 canonical physical norm", () => {
  test("registers the reviewed TDS as one exact executable binding", () => {
    expect(CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA).toMatchObject({
      norm_id: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_NORM_ID,
      rate_value: 0.4,
      rate_range_kg_m2: [0.4, 1.2],
      tds_identifier: "C_CT127_TDS_1_0120",
      layer_max_mm: 2,
      documented_bag_size_kg: 20,
      waste_percent_default: 0,
    });
    expect(constructionNormativeRegistryV1.get(CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_ID))
      .toMatchObject({
        source_type: "MANUFACTURER_PASSPORT",
        authority: "Ceresit / Henkel",
        operation_class_applicability: ["APPLY"],
        material_system_applicability: ["WALL_PUTTY"],
        product_profile_applicability: [CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID],
      });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1.filter(
      (binding) => binding.norm_id === CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_NORM_ID,
    )).toEqual([expect.objectContaining({
      binding_route: "CANONICAL_V4_APPLICABILITY",
      technology_class: "WALL_PUTTY",
      operation_class: "APPLY",
      source_definition_hash: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.definition_hash,
      produced_parameter_ids: ["putty_procurement_quantity_kg"],
    })]);
  });

  test("fails closed outside the exact rate, layer and preparation row", () => {
    const { selected_consumption_kg_m2: _omitted, ...withoutSelectedRate } = exactInputs();
    expect(resolve(withoutSelectedRate)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      blockers: ["PROJECT_VALUE_REQUIRED_EXPLICIT:selected_consumption_kg_m2"],
    });
    expect(resolve(exactInputs({ layer_thickness_mm: explicit(2.1, "mm") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_NORM_ID}:layer_thickness_mm=2.1`,
      ],
    });
    expect(resolve(exactInputs({ selected_consumption_kg_m2: explicit(0.3, "kg_per_m2") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: [
          "PHYSICAL_NORM_PROJECT_RATE_REQUIRED:selected_consumption_kg_m2=0.3:published_range=0.4-1.2",
        ],
      });
    expect(resolve(exactInputs({ substrate_preparation_system: explicit("CERESIT_CT19") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: [
          `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_NORM_ID}:substrate_type=cement_plaster:substrate_absorbency=absorbent:substrate_preparation_system=CERESIT_CT19`,
        ],
      });
  });

  test("uses the explicit total area rate and rounds only to 20 kg bags", () => {
    const input = exactInputs();
    const first = resolve(input);
    const second = resolve(input);

    expect(first).toMatchObject({
      status: "APPLIED",
      source_id: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_ID,
      norm_id: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_NORM_ID,
      source_definition_hash: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.definition_hash,
      produced_parameter_ids: ["putty_procurement_quantity_kg"],
      calculated_ct127_net_quantity_kg: 70,
      calculated_ct127_procurement_quantity_kg: 80,
      calculated_ct127_bag_count: 4,
    });
    expect(first.parameter_values.putty_procurement_quantity_kg).toMatchObject({
      value: 80,
      unit_id: "kg",
      source_type: "APPLICABLE_NORM",
      source_id: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_ID,
    });
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
    expect(input.putty_procurement_quantity_kg).toBeUndefined();
    expect(resolve(exactInputs({ putty_procurement_quantity_kg: explicit(60, "kg") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: ["PHYSICAL_NORM_VALUE_CONFLICT:putty_procurement_quantity_kg=60:norm_value=80"],
      });
  });

  test("routes CT 127 into the one canonical wall-putty material row without a per-mm rate", () => {
    const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find(
      (row) => row.work_key === WALL_PUTTY_APPLY_WORK_KEY,
    );
    if (!inventory) throw new Error("CERESIT_CT127_RUNTIME_WALL_PUTTY_WORK_MISSING");
    const technology = interiorFinishesDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
    const schema = interiorFinishesDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
    if (!technology || !schema) throw new Error("CERESIT_CT127_RUNTIME_WALL_PUTTY_SCHEMA_MISSING");
    expect(technology).toMatchObject({ operation_class: "APPLY", material_system: "WALL_PUTTY" });
    expect(schema.parameters.some((parameter) =>
      parameter.parameter_id === "material_consumption_kg_m2_mm")).toBe(false);

    const ct127QuestionIds = [
      "substrate_type",
      "substrate_absorbency",
      "substrate_load_bearing_dry_clean_confirmed",
      "substrate_preparation_system",
      "selected_consumption_kg_m2",
      "dry_interior_no_permanent_humidity_confirmed",
      "application_temperature_confirmed",
      "selected_bag_size_kg",
    ];
    expect(schema.parameters.filter((parameter) => ct127QuestionIds.includes(parameter.parameter_id))
      .every((parameter) => parameter.required_when.kind === "EQUALS"
        ? parameter.required_when.parameter_id === "product_profile_id" &&
          parameter.required_when.value === CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID
        : parameter.required_when.kind === "ANY_OF" &&
          parameter.required_when.conditions.some((condition) =>
            condition.parameter_id === "product_profile_id" &&
            condition.value === CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID)))
      .toBe(true);

    const paramOverrides = Object.fromEntries(schema.parameters
      .filter((parameter) => ![
        "putty_procurement_quantity_kg",
        "ct126_tds_variant_confirmed",
      ].includes(parameter.parameter_id))
      .map((parameter) => [parameter.parameter_id, {
        value: validOverrideValue(parameter),
        source: "user",
      }]));
    const result = buildInteriorFinishesFromInlineInputV1({
      rawInput: "Финишная шпаклёвка 100 м² Ceresit CT 127 слоем 2 мм",
      selectedWorkKey: WALL_PUTTY_APPLY_WORK_KEY,
      city: "Bishkek",
      currency: "KGS",
      paramOverrides,
    });

    expect(result.exact_match).toBe(true);
    expect(result.missing_parameter_ids).toEqual([]);
    expect(result.production?.compile_result.status).toBe("COMPILED");
    const materialRow = result.production?.draft?.items.find((row) =>
      row.sourceParameters?.rowCode === `${inventory.canonical_technology_id}:row:primary_material`);
    expect(materialRow).toMatchObject({ quantity: 80, unit: "kg" });
    expect(materialRow?.sourceParameters?.normativeSourceIds)
      .toContain(CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_ID);
    expect(materialRow?.sourceParameters?.parameterSourceIds)
      .toEqual([CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_ID]);
    expect(materialRow?.sourceParameters?.professionalPhysicalNormApplicabilityV1).toMatchObject({
      source_id: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_ID,
      source_definition_hash: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.definition_hash,
      calculated_ct127_net_quantity_kg: 70,
      calculated_ct127_procurement_quantity_kg: 80,
      calculated_ct127_bag_count: 4,
    });
    expect(result.production?.draft?.items.filter((row) =>
      (row.sourceParameters?.normativeSourceIds as readonly string[] | undefined)
        ?.includes(CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_ID))).toHaveLength(1);
  });
});
