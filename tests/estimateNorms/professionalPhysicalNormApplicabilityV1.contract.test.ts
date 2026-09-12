import {
  UPONOR_UFH_150MM_NORM_ID,
  UPONOR_UFH_150MM_PRODUCT_PROFILE_ID,
  UPONOR_UFH_150MM_SOURCE_ID,
  UPONOR_UFH_150MM_SOURCE_METADATA,
  constructionNormativeRegistryV1,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../../src/lib/estimate/v4/domainFactory";
import {
  HVAC_DOMAIN_INVENTORY,
  buildHvacFromInlineInputV1,
  hvacDomainFactory,
} from "../../src/lib/estimate/v4/domains/heatingVentilationComplete";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";

const CAPTURED_AT = "2026-09-12T00:00:00.000Z";
const INSTALL_WORK_KEY = "heating_hvac_interior_warm_floor_install_standard";

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
    applicability: "Exact project fixture for physical norm applicability",
  };
}

function exactUponorInputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(UPONOR_UFH_150MM_PRODUCT_PROFILE_ID),
    zone_area_m2: explicit(100, "m2"),
    designed_pipe_spacing_mm: explicit(150, "mm"),
    manifold_location: explicit("Коллекторный шкаф КШ-1"),
    feed_tail_length_linear_m: explicit(20, "m"),
    loop_length_limit: explicit(100, "m"),
    hydraulic_loop_design_reference: explicit("ОВ-12, лист 7, расчёт контуров rev.3"),
    circuit_count: explicit(8, "item"),
    manifold_outlet_count: explicit(8, "item"),
    longest_circuit_length_m: explicit(90, "m"),
    ...changes,
  };
}

function resolve(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "WARM_FLOOR_SYSTEM",
    operation_class: "INSTALL",
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
  if (parameter.parameter_id === "project_type") return "HVAC_PROJECT";
  if (parameter.parameter_id === "product_profile_id") return UPONOR_UFH_150MM_PRODUCT_PROFILE_ID;
  if (parameter.parameter_id === "normative_rate_code") return "PROJECT-VERIFIED-HVAC-RATE";
  if (parameter.parameter_id === "zone_area_m2") return 100;
  if (parameter.parameter_id === "designed_pipe_spacing_mm") return 150;
  if (parameter.parameter_id === "manifold_location") return "Коллекторный шкаф КШ-1";
  if (parameter.parameter_id === "feed_tail_length_linear_m") return 20;
  if (parameter.parameter_id === "loop_length_limit") return 100;
  if (parameter.parameter_id === "hydraulic_loop_design_reference") return "ОВ-12, лист 7, расчёт контуров rev.3";
  if (parameter.parameter_id === "circuit_count") return 8;
  if (parameter.parameter_id === "manifold_outlet_count") return 8;
  if (parameter.parameter_id === "longest_circuit_length_m") return 90;
  if (parameter.input_type === "boolean") return true;
  if (parameter.input_type === "choice") return parameter.choices?.[0]?.value ?? "PROJECT_SPECIFIED";
  if (parameter.input_type === "text") return `PROJECT:${parameter.parameter_id}`;
  const candidate = Math.max(parameter.minimum ?? 0.001, 1);
  return parameter.maximum != null ? Math.min(candidate, parameter.maximum) : candidate;
}

describe("professional physical norm applicability V1", () => {
  test("does not select a manufacturer source from a generic warm-floor work alone", () => {
    const result = resolve({
      product_profile_id: explicit("manufacturer-profile:another-system:v1"),
      zone_area_m2: explicit(100, "m2"),
    });

    expect(result.status).toBe("NOT_REQUESTED");
    expect(result.blockers).toEqual([]);
    expect(result.parameter_values.circuit_length_m).toBeUndefined();
  });

  test("requires every source applicability and hydraulic-design fact to be explicit", () => {
    const result = resolve({
      product_profile_id: explicit(UPONOR_UFH_150MM_PRODUCT_PROFILE_ID),
      zone_area_m2: {
        ...explicit(100, "m2"),
        source_type: "VISIBLE_BASELINE_ASSUMPTION",
      },
    });

    expect(result.status).toBe("BLOCKED_REQUIRED_INPUTS");
    expect(result.blockers).toEqual([
      "PROJECT_VALUE_REQUIRED_EXPLICIT:circuit_count",
      "PROJECT_VALUE_REQUIRED_EXPLICIT:designed_pipe_spacing_mm",
      "PROJECT_VALUE_REQUIRED_EXPLICIT:feed_tail_length_linear_m",
      "PROJECT_VALUE_REQUIRED_EXPLICIT:hydraulic_loop_design_reference",
      "PROJECT_VALUE_REQUIRED_EXPLICIT:longest_circuit_length_m",
      "PROJECT_VALUE_REQUIRED_EXPLICIT:loop_length_limit",
      "PROJECT_VALUE_REQUIRED_EXPLICIT:manifold_location",
      "PROJECT_VALUE_REQUIRED_EXPLICIT:manifold_outlet_count",
      "PROJECT_VALUE_REQUIRED_EXPLICIT:zone_area_m2",
    ]);
  });

  test("rejects another spacing and an unverified loop or manifold layout", () => {
    expect(resolve(exactUponorInputs({ designed_pipe_spacing_mm: explicit(200, "mm") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [`PHYSICAL_NORM_NOT_APPLICABLE:${UPONOR_UFH_150MM_NORM_ID}:designed_pipe_spacing_mm=200`],
    });
    expect(resolve(exactUponorInputs({ longest_circuit_length_m: explicit(101, "m") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_LAYOUT_LIMIT_EXCEEDED:longest_circuit_length_m=101:loop_length_limit=100"],
    });
    expect(resolve(exactUponorInputs({ manifold_outlet_count: explicit(7, "item") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_MANIFOLD_OUTLETS_INSUFFICIENT:circuit_count=8:manifold_outlet_count=7"],
    });
    expect(resolve(exactUponorInputs({ circuit_length_m: explicit(700, "m") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_VALUE_CONFLICT:circuit_length_m=700:calculated_pipe_length_m=690"],
    });
  });

  test("derives one pipe quantity from the pack and preserves exact source lineage", () => {
    const input = exactUponorInputs();
    const first = resolve(input);
    const second = resolve(input);

    expect(first.status).toBe("APPLIED");
    expect(first).toMatchObject({
      source_id: UPONOR_UFH_150MM_SOURCE_ID,
      norm_id: UPONOR_UFH_150MM_NORM_ID,
      source_document_version: "2026.09-uponor-ufh-pipe-spacing-r1",
      source_definition_hash: UPONOR_UFH_150MM_SOURCE_METADATA.definition_hash,
      calculated_pipe_length_m: 690,
      blockers: [],
    });
    expect(first.parameter_values.circuit_length_m).toMatchObject({
      value: 690,
      unit_id: "m",
      source_type: "APPLICABLE_NORM",
      source_id: UPONOR_UFH_150MM_SOURCE_ID,
    });
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
    expect(input.circuit_length_m).toBeUndefined();
  });

  test("routes the exact source through the canonical registry and the real HVAC BOQ row", () => {
    const inventory = HVAC_DOMAIN_INVENTORY.find((row) => row.work_key === INSTALL_WORK_KEY);
    if (!inventory) throw new Error("UPONOR_RUNTIME_INSTALL_WORK_MISSING");
    const technology = hvacDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
    const schema = hvacDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
    if (!technology || !schema) throw new Error("UPONOR_RUNTIME_SCHEMA_MISSING");
    const paramOverrides = Object.fromEntries(schema.parameters
      .filter((parameter) => parameter.parameter_id !== "circuit_length_m")
      .map((parameter) => [parameter.parameter_id, {
        value: parameter.parameter_id === "scope_capability"
          ? inventory.scope_capability
          : validOverrideValue(parameter),
        source: "user",
      }]));

    const result = buildHvacFromInlineInputV1({
      rawInput: "Монтаж тёплого пола Uponor по проекту ОВ-12, площадь 100 м²",
      selectedWorkKey: INSTALL_WORK_KEY,
      city: "Bishkek",
      currency: "KGS",
      paramOverrides,
    });

    expect(result.exact_match).toBe(true);
    expect(result.missing_parameter_ids).toEqual([]);
    expect(result.production?.compile_result.status).toBe("COMPILED");
    expect(result.production?.compile_result.normative_resolution.applicable_sources.map((source) => source.source_id))
      .toEqual(expect.arrayContaining(["kg_krer_2015_application_guidance", UPONOR_UFH_150MM_SOURCE_ID]));
    const pipeRow = result.production?.draft?.items.find((row) =>
      row.sourceParameters?.rowCode === `${inventory.canonical_technology_id}:row:warm_floor_pipe`);
    expect(pipeRow).toMatchObject({
      quantity: 690,
      unit: "m",
      normSourceId: "kg_krer_2015_application_guidance",
    });
    expect(pipeRow?.sourceParameters?.normativeSourceIds).toEqual([
      "kg_krer_2015_application_guidance",
      UPONOR_UFH_150MM_SOURCE_ID,
    ]);
    expect(pipeRow?.sourceParameters?.parameterSourceIds).toContain(UPONOR_UFH_150MM_SOURCE_ID);
    expect(pipeRow?.sourceParameters?.professionalPhysicalNormApplicabilityV1).toMatchObject({
      source_id: UPONOR_UFH_150MM_SOURCE_ID,
      source_definition_hash: UPONOR_UFH_150MM_SOURCE_METADATA.definition_hash,
      calculated_pipe_length_m: 690,
    });
  });

  test("the registry rejects the same manufacturer document for another product profile", () => {
    const resolution = constructionNormativeRegistryV1.resolve({
      country: "KG",
      region: "Bishkek",
      funding_source: "PRIVATE_RECOMMENDED",
      project_type: "HVAC_PROJECT",
      construction_state: "NEW",
      contract_basis: [],
      effective_date: "2026-09-12",
      material_system: "WARM_FLOOR:SPACE_HEATING:HEATING_WATER",
      operation_class: "INSTALL",
      product_profile_id: "manufacturer-profile:another-system:v1",
      requested_source_ids: [UPONOR_UFH_150MM_SOURCE_ID],
      requested_source_types: ["MANUFACTURER_PASSPORT"],
    });

    expect(resolution.status).toBe("BLOCKED_SOURCE_REQUIRED");
    expect(resolution.applicable_sources).toEqual([]);
    expect(resolution.rejected_sources_with_reason).toEqual([{
      source_id: UPONOR_UFH_150MM_SOURCE_ID,
      reasons: ["PRODUCT_PROFILE_NOT_APPLICABLE"],
    }]);
  });
});
