import {
  CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1,
  CERESIT_CN87_50MM_SCREED_NORM_ID,
  CERESIT_CN87_50MM_SCREED_PRODUCT_PROFILE_ID,
  CERESIT_CN87_50MM_SCREED_SOURCE_ID,
  CERESIT_CN87_50MM_SCREED_SOURCE_METADATA,
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
const SUBFLOOR_PREPARE_WORK_KEY = "flooring_interior_subfloor_prepare_standard";

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
    applicability: "Exact Ceresit CN 87 project fixture",
  };
}

function exactInputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(CERESIT_CN87_50MM_SCREED_PRODUCT_PROFILE_ID),
    area_m2: explicit(10.1, "m2"),
    layer_thickness_mm: explicit(50, "mm"),
    screed_construction_type: explicit("bonded"),
    underfloor_heating: explicit(false),
    heating_pipe_outer_diameter_mm: explicit(0, "mm"),
    substrate_condition_confirmed: explicit(true),
    joint_layout_confirmed: explicit(true),
    selected_bag_size_kg: explicit(25, "kg"),
    ...changes,
  };
}

function resolve(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "SUBFLOOR",
    operation_class: "PREPARE",
    material_system: "SUBFLOOR",
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
  if (parameter.parameter_id === "scope_capability") return "standard";
  if (parameter.parameter_id === "funding_source") return "PRIVATE_RECOMMENDED";
  if (parameter.parameter_id === "project_type") return "INTERIOR_CN87_SCREED_PROJECT";
  if (parameter.parameter_id === "product_profile_id") return CERESIT_CN87_50MM_SCREED_PRODUCT_PROFILE_ID;
  if (parameter.parameter_id === "normative_rate_code") return "PROJECT-VERIFIED-CN87-SCREED-RATE";
  if (parameter.parameter_id === "area_m2") return 100;
  if (parameter.parameter_id === "layer_thickness_mm") return 50;
  if (parameter.parameter_id === "screed_construction_type") return "bonded";
  if (parameter.parameter_id === "underfloor_heating") return false;
  if (parameter.parameter_id === "heating_pipe_outer_diameter_mm") return 0;
  if (parameter.parameter_id === "selected_bag_size_kg") return 25;
  if (parameter.parameter_id === "waste_percent") return 1;
  if (parameter.input_type === "boolean") return true;
  if (parameter.input_type === "choice") return parameter.choices?.[0]?.value ?? "PROJECT_SPECIFIED";
  if (parameter.input_type === "text") return `PROJECT:${parameter.parameter_id}`;
  const candidate = Math.max(parameter.minimum ?? 0.001, 1);
  return parameter.maximum == null ? candidate : Math.min(candidate, parameter.maximum);
}

describe("Ceresit CN 87 exact 50 mm screed physical norm", () => {
  test("registers the reviewed TDS scalar only for the exact 50 mm production profile", () => {
    expect(CERESIT_CN87_50MM_SCREED_SOURCE_METADATA).toMatchObject({
      norm_id: CERESIT_CN87_50MM_SCREED_NORM_ID,
      tds_identifier: "CN_87_KT_10.21",
      product: "Ceresit CN 87",
      layer_thickness_mm: 50,
      rate_value: 2,
      rate_kg_m2_at_50mm: 100,
      package_size_kg: 25,
      waste_percent_default: 0,
    });
    expect(constructionNormativeRegistryV1.get(CERESIT_CN87_50MM_SCREED_SOURCE_ID))
      .toMatchObject({
        source_type: "MANUFACTURER_PASSPORT",
        authority: "Ceresit / Henkel",
        operation_class_applicability: ["PREPARE"],
        material_system_applicability: ["SUBFLOOR"],
        product_profile_applicability: [CERESIT_CN87_50MM_SCREED_PRODUCT_PROFILE_ID],
      });
    expect(CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1.filter(
      (binding) => binding.norm_id === CERESIT_CN87_50MM_SCREED_NORM_ID,
    )).toEqual([expect.objectContaining({
      binding_route: "CANONICAL_V4_APPLICABILITY",
      technology_class: "SUBFLOOR",
      operation_class: "PREPARE",
      source_definition_hash: CERESIT_CN87_50MM_SCREED_SOURCE_METADATA.definition_hash,
      produced_parameter_ids: ["material_consumption_kg_m2_mm"],
    })]);
  });

  test("fails closed for non-50 mm or inconsistent heated-screed geometry", () => {
    const { joint_layout_confirmed: _omitted, ...withoutJointLayout } = exactInputs();
    expect(resolve(withoutJointLayout)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      blockers: ["PROJECT_VALUE_REQUIRED_EXPLICIT:joint_layout_confirmed"],
    });
    expect(resolve(exactInputs({ layer_thickness_mm: explicit(49, "mm") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: expect.arrayContaining([
        `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CN87_50MM_SCREED_NORM_ID}:layer_thickness_mm=49:exact_required=50`,
      ]),
    });
    expect(resolve(exactInputs({
      screed_construction_type: explicit("heated_floating"),
      underfloor_heating: explicit(true),
      heating_pipe_outer_diameter_mm: explicit(16, "mm"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: expect.arrayContaining([
        `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CN87_50MM_SCREED_NORM_ID}:screed_construction_type=heated_floating:underfloor_heating=true:heating_pipe_outer_diameter_mm=16`,
      ]),
    });
  });

  test("derives the 2.0 kg/m2/mm rate and 25 kg procurement trace without mutation", () => {
    const input = exactInputs();
    const first = resolve(input);
    const second = resolve(input);
    expect(first).toMatchObject({
      status: "APPLIED",
      source_id: CERESIT_CN87_50MM_SCREED_SOURCE_ID,
      norm_id: CERESIT_CN87_50MM_SCREED_NORM_ID,
      source_definition_hash: CERESIT_CN87_50MM_SCREED_SOURCE_METADATA.definition_hash,
      produced_parameter_ids: ["material_consumption_kg_m2_mm"],
      calculated_cn87_net_quantity_kg: 1010,
      calculated_cn87_procurement_quantity_kg: 1025,
      calculated_cn87_bag_count: 41,
    });
    expect(first.parameter_values.material_consumption_kg_m2_mm).toMatchObject({
      value: 2,
      unit_id: "kg_per_m2_mm",
      source_type: "APPLICABLE_NORM",
      source_id: CERESIT_CN87_50MM_SCREED_SOURCE_ID,
    });
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
    expect(input.material_consumption_kg_m2_mm).toBeUndefined();
    expect(resolve(exactInputs({ material_consumption_kg_m2_mm: explicit(1.9, "kg_per_m2_mm") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: ["PHYSICAL_NORM_VALUE_CONFLICT:material_consumption_kg_m2_mm=1.9:norm_value=2"],
      });
  });

  test("routes CN 87 into the canonical subfloor material row without a second calculator", () => {
    const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find(
      (row) => row.work_key === SUBFLOOR_PREPARE_WORK_KEY,
    );
    if (!inventory) throw new Error("CERESIT_CN87_RUNTIME_SUBFLOOR_PREPARE_WORK_MISSING");
    const technology = interiorFinishesDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
    const schema = interiorFinishesDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
    if (!technology || !schema) throw new Error("CERESIT_CN87_RUNTIME_SUBFLOOR_PREPARE_SCHEMA_MISSING");
    expect(technology).toMatchObject({ operation_class: "PREPARE", material_system: "SUBFLOOR" });

    const exactQuestionIds = [
      "screed_construction_type",
      "underfloor_heating",
      "heating_pipe_outer_diameter_mm",
      "substrate_condition_confirmed",
      "joint_layout_confirmed",
    ];
    expect(schema.parameters.filter((parameter) => exactQuestionIds.includes(parameter.parameter_id))
      .map((parameter) => parameter.parameter_id)).toEqual(exactQuestionIds);
    expect(schema.parameters.filter((parameter) => exactQuestionIds.includes(parameter.parameter_id))
      .every((parameter) => parameter.required_when.kind === "EQUALS" &&
        parameter.required_when.parameter_id === "product_profile_id" &&
        parameter.required_when.value === CERESIT_CN87_50MM_SCREED_PRODUCT_PROFILE_ID))
      .toBe(true);

    const paramOverrides = Object.fromEntries(schema.parameters
      .filter((parameter) => ![
        "material_consumption_kg_m2_mm",
        "ct17_primer_procurement_quantity_l",
      ].includes(parameter.parameter_id))
      .map((parameter) => [parameter.parameter_id, {
        value: validOverrideValue(parameter),
        source: "user",
      }]));
    const result = buildInteriorFinishesFromInlineInputV1({
      rawInput: "Стяжка Ceresit CN 87, 100 м², ровно 50 мм, связанная с основанием",
      selectedWorkKey: SUBFLOOR_PREPARE_WORK_KEY,
      city: "Bishkek",
      currency: "KGS",
      paramOverrides,
    });

    expect(result.exact_match).toBe(true);
    expect(result.missing_parameter_ids).toEqual([]);
    expect(result.production?.compile_result.status).toBe("COMPILED");
    expect(result.production?.compile_result.normative_resolution.applicable_sources
      .map((source) => source.source_id)).toContain(CERESIT_CN87_50MM_SCREED_SOURCE_ID);
    const materialRow = result.production?.draft?.items.find((row) =>
      row.sourceParameters?.rowCode === `${inventory.canonical_technology_id}:row:primary_material`);
    expect(materialRow).toMatchObject({ quantity: 10_000, unit: "kg" });
    expect(materialRow?.sourceParameters?.normativeSourceIds).toContain(CERESIT_CN87_50MM_SCREED_SOURCE_ID);
    expect(materialRow?.sourceParameters?.parameterSourceIds).toContain(CERESIT_CN87_50MM_SCREED_SOURCE_ID);
    expect(materialRow?.sourceParameters?.professionalPhysicalNormApplicabilityV1).toMatchObject({
      source_id: CERESIT_CN87_50MM_SCREED_SOURCE_ID,
      source_definition_hash: CERESIT_CN87_50MM_SCREED_SOURCE_METADATA.definition_hash,
      calculated_cn87_net_quantity_kg: 10_000,
      calculated_cn87_procurement_quantity_kg: 10_000,
      calculated_cn87_bag_count: 400,
    });
    expect(result.production?.draft?.items.filter((row) =>
      (row.sourceParameters?.normativeSourceIds as readonly string[] | undefined)
        ?.includes(CERESIT_CN87_50MM_SCREED_SOURCE_ID))).toHaveLength(1);
  });
});
