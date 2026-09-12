import {
  DAIKIN_3MXS_K_NORM_ID,
  DAIKIN_3MXS_K_PRODUCT_PROFILE_ID,
  DAIKIN_3MXS_K_SOURCE_ID,
  DAIKIN_3MXS_K_SOURCE_METADATA,
  FORBO_232_MOUNTING_ADHESIVE_NORM_ID,
  FORBO_232_MOUNTING_ADHESIVE_PRODUCT_PROFILE_ID,
  FORBO_232_MOUNTING_ADHESIVE_SOURCE_ID,
  FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA,
  KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID,
  KNAUF_D112_WALL_FASTENER_NORM_ID,
  KNAUF_D112_WALL_FASTENER_SOURCE_ID,
  KNAUF_D112_WALL_FASTENER_SOURCE_METADATA,
  KNAUF_FUGENFUELLER_PERIMETER_NORM_ID,
  KNAUF_FUGENFUELLER_PERIMETER_PRODUCT_PROFILE_ID,
  KNAUF_FUGENFUELLER_PERIMETER_SOURCE_ID,
  KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA,
  LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID,
  LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_ID,
  LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA,
  LEGRAND_P31_TRAY_PRODUCT_PROFILE_ID,
  LINDAB_VSR_NORM_ID,
  LINDAB_VSR_PRODUCT_PROFILE_ID,
  LINDAB_VSR_SOURCE_ID,
  LINDAB_VSR_SOURCE_METADATA,
  UPONOR_UFH_150MM_NORM_ID,
  UPONOR_UFH_150MM_PRODUCT_PROFILE_ID,
  UPONOR_UFH_150MM_SOURCE_ID,
  UPONOR_UFH_150MM_SOURCE_METADATA,
  WAVIN_HEP2O_15MM_HORIZONTAL_CLIP_NORM_ID,
  WAVIN_HEP2O_15MM_HORIZONTAL_CLIP_SOURCE_ID,
  WAVIN_HEP2O_15MM_VERTICAL_CLIP_SOURCE_ID,
  WAVIN_HEP2O_22MM_HORIZONTAL_CLIP_SOURCE_ID,
  WAVIN_HEP2O_CLIP_SOURCE_METADATA,
  WAVIN_HEP2O_PUSH_FIT_PRODUCT_PROFILE_ID,
  WAVIN_HEP2O_SMARTSLEEVE_NORM_ID,
  WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID,
  WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA,
  constructionNormativeRegistryV1,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../../src/lib/estimate/v4/domainFactory";
import {
  HVAC_DOMAIN_INVENTORY,
  buildHvacFromInlineInputV1,
  hvacDomainFactory,
} from "../../src/lib/estimate/v4/domains/heatingVentilationComplete";
import {
  BASEBOARD_GLUE_FORBO_232_PROFILE_MODE,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  buildInteriorFinishesFromInlineInputV1,
  interiorFinishesDomainFactory,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import {
  ELECTRICAL_DOMAIN_INVENTORY,
  ELECTRICAL_KRERM_INDIVIDUAL_NORM_RESOLUTION_V1,
  ELECTRICAL_KRERP_INDIVIDUAL_RATE_RESOLUTION_V1,
  buildElectricalFromInlineInputV1,
  electricalCompleteDomainFactory,
} from "../../src/lib/estimate/v4/domains/electricalComplete";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";

const CAPTURED_AT = "2026-09-12T00:00:00.000Z";
const INSTALL_WORK_KEY = "heating_hvac_interior_warm_floor_install_standard";
const DUCT_INSTALL_WORK_KEY = "ventilation_interior_duct_install_standard";
const CONDITIONER_INSTALL_WORK_KEY = "heating_hvac_interior_conditioner_install_standard";
const HEATING_PIPE_INSTALL_WORK_KEY = "heating_hvac_interior_heating_pipe_install_standard";
const FLAT_CEILING_FRAME_WORK_KEY = "drywall_ceiling_interior_drywall_ceiling_frame_standard";
const FLAT_CEILING_FINISH_JOINT_WORK_KEY = "drywall_ceiling_interior_drywall_ceiling_finish_joint_standard";
const CABLE_CHANNEL_INSTALL_WORK_KEY = "electrical_interior_cable_channel_install_standard";
const BASEBOARD_GLUE_WORK_KEY = "flooring_interior_baseboard_glue_standard";

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

function exactLindabInputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(LINDAB_VSR_PRODUCT_PROFILE_ID),
    route_length_m: explicit(10, "m"),
    duct_diameter_mm: explicit(315, "mm"),
    nozzle_pattern: explicit("Схема VSR-NP-04"),
    air_distribution_design: explicit("ОВ-21, лист 14, расчёт воздухораспределения rev.2"),
    fitting_schedule: explicit("ОВ-21.S-2: отводы, переходы, опоры, уплотнения и резка"),
    cooled_supply_air_confirmed: explicit(true),
    ...changes,
  };
}

function resolveLindab(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "DUCT_NETWORK",
    operation_class: "INSTALL",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values,
  });
}

function exactDaikinInputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(DAIKIN_3MXS_K_PRODUCT_PROFILE_ID),
    equipment_model: explicit("Daikin 3MXS-K"),
    manufacturer_system_profile_id: explicit(DAIKIN_3MXS_K_PRODUCT_PROFILE_ID),
    refrigerant_type: explicit("R-410A"),
    total_refrigerant_piping_length_m: explicit(45, "m"),
    outdoor_unit_nameplate_reference: explicit("Шильдик 3MXS-K / инструкция rev. 2026-09"),
    maximum_piping_and_height_limits_confirmed: explicit(true),
    ...changes,
  };
}

function resolveDaikin(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "REFRIGERANT_SYSTEM",
    operation_class: "INSTALL",
    material_system: "CONDITIONER:COOLING_AIR_CONDITIONING:REFRIGERANT_PROJECT_DEFINED",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values,
  });
}

function exactKnaufD112Inputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID),
    system_passport_reference: explicit("Knauf D11, D112 variant 1, page 28"),
    area_m2: explicit(100, "m2"),
    length_m: explicit(10, "m"),
    width_m: explicit(10, "m"),
    system_variant: explicit("standard_12_5_mm_single_layer"),
    substrate_type: explicit("Железобетон C25/30"),
    substrate_fastener_reference: explicit("Анкер по паспорту проекта КР-17"),
    substrate_fastener_approved: explicit(true),
    ceiling_perimeter_anchor_spacing_m: explicit(1, "m"),
    ...changes,
  };
}

function resolveKnaufD112(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "FLAT_CEILING",
    operation_class: "FRAME",
    material_system: "FLAT_CEILING",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values,
  });
}

function exactKnaufFugenfuellerInputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(KNAUF_FUGENFUELLER_PERIMETER_PRODUCT_PROFILE_ID),
    perimeter_linear_m: explicit(100, "m"),
    cladding_thickness_mm: explicit(12.5, "mm"),
    perimeter_joint_consumption_kg_linear_m: explicit(0.15, "kg_per_m"),
    perimeter_connection_joint_method: explicit("KNAUF_TRENN_FIX"),
    system_passport_reference: explicit("Knauf K462.de/eng, perimeter connection jointing"),
    material_certificate_reference: explicit("PROJECT-KNAUF-FUGENFUELLER-BATCH-CERT-001"),
    ...changes,
  };
}

function resolveKnaufFugenfueller(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "FLAT_CEILING",
    operation_class: "FINISH_JOINT",
    material_system: "FLAT_CEILING",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values,
  });
}

function exactForbo232Inputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(FORBO_232_MOUNTING_ADHESIVE_PRODUCT_PROFILE_ID),
    adhesive_profile_mode: explicit(BASEBOARD_GLUE_FORBO_232_PROFILE_MODE),
    selected_adhesive_product: explicit("Forbo Eurocol 232 Eurosol Montage"),
    skirting_length_linear_m: explicit(100, "m"),
    skirting_material: explicit("wood"),
    substrate_type: explicit("concrete"),
    adhesive_consumption_ml_linear_m: explicit(30, "ml_per_m"),
    substrate_ready_confirmed: explicit(true),
    processing_conditions_confirmed: explicit(true),
    ventilation_fire_controls_confirmed: explicit(true),
    manufacturer_instruction_reference: explicit("Forbo 232 product specification, performances, application and working process"),
    ...changes,
  };
}

function resolveForbo232(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "BASEBOARD",
    operation_class: "GLUE",
    material_system: "BASEBOARD",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values,
  });
}

function exactLegrandP31Inputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(LEGRAND_P31_TRAY_PRODUCT_PROFILE_ID),
    product_specification_id: explicit("ЭОМ-17.S-04 / Legrand P31"),
    containment_type: explicit("TRAY"),
    containment_width_mm: explicit(150, "mm"),
    tray_joint_count: explicit(5, "item"),
    tray_width_mm: explicit(150, "mm"),
    coupler_reference: explicit("EP Coupler LG-341213"),
    manufacturer_system_profile_id: explicit(LEGRAND_P31_TRAY_PRODUCT_PROFILE_ID),
    installation_manual_reference: explicit("Legrand FT0955-02, page 11/13, section 3"),
    tightening_torque_nm: explicit(11, "N_m"),
    ...changes,
  };
}

function resolveLegrandP31(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "CABLE_CHANNEL",
    operation_class: "INSTALL",
    material_system: "CABLE_CHANNEL",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values,
  });
}

function exactWavinHep2OInputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(WAVIN_HEP2O_PUSH_FIT_PRODUCT_PROFILE_ID),
    exact_material_or_equipment: explicit("Wavin Hep2O Barrier pipe and Hep2O fittings"),
    pipe_material_and_class: explicit("Wavin Hep2O Barrier pipe"),
    jointing_method: explicit("Wavin Hep2O push-fit with SmartSleeve"),
    connection_count: explicit(6, "item"),
    prepared_pipe_end_count: explicit(10, "item"),
    hep2o_system_variant: explicit("WAVIN_HEP2O_PUSH_FIT"),
    hep2o_joint_topology_reference: explicit("ОВ-31.S-04, узлы H01-H06, 10 подготовленных концов"),
    route_length_m: explicit(1.2, "m"),
    nominal_diameter_mm: explicit(15, "mm"),
    hep2o_support_orientation: explicit("horizontal"),
    hep2o_support_span_lengths_m: explicit("0,6; 0,6", "m"),
    hep2o_support_anchor_node_count: explicit(3, "item"),
    hep2o_support_layout_reference: explicit("ОВ-31.S-04, участок H01-H03, обязательные точки A1-A3"),
    hep2o_support_anchor_positions_verified: explicit(true),
    ...changes,
  };
}

function resolveWavinHep2O(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "HEATING_PIPE_NETWORK",
    operation_class: "INSTALL",
    material_system: "HEATING_PIPE:SPACE_HEATING:HEATING_WATER",
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

  test("keeps Lindab VSR blocked outside the published diameter and cooled-air applicability", () => {
    expect(resolveLindab(exactLindabInputs({ duct_diameter_mm: explicit(501, "mm") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      source_id: LINDAB_VSR_SOURCE_ID,
      blockers: [`PHYSICAL_NORM_NOT_APPLICABLE:${LINDAB_VSR_NORM_ID}:duct_diameter_mm=501`],
    });
    expect(resolveLindab(exactLindabInputs({ cooled_supply_air_confirmed: explicit(false) }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      source_id: LINDAB_VSR_SOURCE_ID,
      blockers: [`PHYSICAL_NORM_NOT_APPLICABLE:${LINDAB_VSR_NORM_ID}:cooled_supply_air_confirmed=false`],
    });
    expect(resolveLindab(exactLindabInputs({ route_length_m: explicit(0.5, "m") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_RUNTIME_RANGE_EXCEEDED:procurement_factor=6:maximum=3"],
    });
  });

  test("rounds only the Lindab procurement quantity while preserving approved route length", () => {
    const input = exactLindabInputs();
    const result = resolveLindab(input);

    expect(result).toMatchObject({
      status: "APPLIED",
      source_id: LINDAB_VSR_SOURCE_ID,
      source_document_version: "2026.09-lindab-vsr-3m-duct-r1",
      source_definition_hash: LINDAB_VSR_SOURCE_METADATA.definition_hash,
      calculated_resource_quantity_m: 12,
      produced_parameter_ids: ["primary_resource_units_per_output", "procurement_factor"],
    });
    expect(result.parameter_values.route_length_m).toBe(input.route_length_m);
    expect(result.parameter_values.primary_resource_units_per_output).toMatchObject({
      value: 1,
      source_type: "APPLICABLE_NORM",
      source_id: LINDAB_VSR_SOURCE_ID,
    });
    expect(result.parameter_values.procurement_factor).toMatchObject({
      value: 1.2,
      source_type: "APPLICABLE_NORM",
      source_id: LINDAB_VSR_SOURCE_ID,
    });
  });

  test("routes Lindab through the same registry and real HVAC primary-resource row", () => {
    const inventory = HVAC_DOMAIN_INVENTORY.find((row) => row.work_key === DUCT_INSTALL_WORK_KEY);
    if (!inventory) throw new Error("LINDAB_RUNTIME_INSTALL_WORK_MISSING");
    const technology = hvacDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
    const schema = hvacDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
    if (!technology || !schema) throw new Error("LINDAB_RUNTIME_SCHEMA_MISSING");
    const lindabValue = (parameter: Parameters<typeof validOverrideValue>[0]) => {
      if (parameter.parameter_id === "product_profile_id") return LINDAB_VSR_PRODUCT_PROFILE_ID;
      if (parameter.parameter_id === "route_length_m") return 10;
      if (parameter.parameter_id === "duct_diameter_mm") return 315;
      if (parameter.parameter_id === "nozzle_pattern") return "Схема VSR-NP-04";
      if (parameter.parameter_id === "air_distribution_design") return "ОВ-21, лист 14, rev.2";
      if (parameter.parameter_id === "fitting_schedule") return "ОВ-21.S-2, полная ведомость фасонных частей";
      if (parameter.parameter_id === "cooled_supply_air_confirmed") return true;
      return validOverrideValue(parameter);
    };
    const paramOverrides = Object.fromEntries(schema.parameters
      .filter((parameter) => ![
        "primary_resource_units_per_output",
        "procurement_factor",
      ].includes(parameter.parameter_id))
      .map((parameter) => [parameter.parameter_id, {
        value: parameter.parameter_id === "scope_capability"
          ? inventory.scope_capability
          : lindabValue(parameter),
        source: "user",
      }]));

    const result = buildHvacFromInlineInputV1({
      rawInput: "Монтаж соплового воздуховода Lindab VSR, утверждённая трасса 10 м",
      selectedWorkKey: DUCT_INSTALL_WORK_KEY,
      city: "Bishkek",
      currency: "KGS",
      paramOverrides,
    });

    expect(result.missing_parameter_ids).toEqual([]);
    expect(result.production?.compile_result.status).toBe("COMPILED");
    const resourceRow = result.production?.draft?.items.find((row) =>
      row.sourceParameters?.rowCode === `${inventory.canonical_technology_id}:row:primary_resource`);
    expect(resourceRow).toMatchObject({ quantity: 12, unit: "m" });
    expect(resourceRow?.sourceParameters?.normativeSourceIds).toEqual([
      "kg_krer_2015_application_guidance",
      LINDAB_VSR_SOURCE_ID,
    ]);
    expect(resourceRow?.sourceParameters?.parameterSourceIds).toEqual([
      `inline-override:${inventory.catalog_id}:route_length_m:user`,
      LINDAB_VSR_SOURCE_ID,
      LINDAB_VSR_SOURCE_ID,
    ]);
    expect(resourceRow?.sourceParameters?.professionalPhysicalNormApplicabilityV1).toMatchObject({
      source_id: LINDAB_VSR_SOURCE_ID,
      source_definition_hash: LINDAB_VSR_SOURCE_METADATA.definition_hash,
      calculated_resource_quantity_m: 12,
    });
  });

  test("keeps the Daikin charge blocked for a different model, refrigerant, short route or unverified limits", () => {
    expect(resolveDaikin(exactDaikinInputs({ equipment_model: explicit("Daikin 4MXS-K") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      source_id: DAIKIN_3MXS_K_SOURCE_ID,
      blockers: [`PHYSICAL_NORM_NOT_APPLICABLE:${DAIKIN_3MXS_K_NORM_ID}:equipment_model=Daikin 4MXS-K`],
    });
    expect(resolveDaikin(exactDaikinInputs({ refrigerant_type: explicit("R-32") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [`PHYSICAL_NORM_NOT_APPLICABLE:${DAIKIN_3MXS_K_NORM_ID}:refrigerant_type=R-32`],
    });
    expect(resolveDaikin(exactDaikinInputs({ total_refrigerant_piping_length_m: explicit(30, "m") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_ADDITIONAL_CHARGE_NOT_REQUIRED_OR_LENGTH_INVALID:total_refrigerant_piping_length_m=30"],
    });
    expect(resolveDaikin(exactDaikinInputs({ maximum_piping_and_height_limits_confirmed: explicit(false) })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: [`PHYSICAL_NORM_NOT_APPLICABLE:${DAIKIN_3MXS_K_NORM_ID}:maximum_piping_and_height_limits_confirmed=false`],
      });
  });

  test("derives only the exact Daikin additional charge and preserves source lineage", () => {
    const input = exactDaikinInputs();
    const first = resolveDaikin(input);
    const second = resolveDaikin(input);

    expect(first).toMatchObject({
      status: "APPLIED",
      source_id: DAIKIN_3MXS_K_SOURCE_ID,
      norm_id: DAIKIN_3MXS_K_NORM_ID,
      source_document_version: "2026.09-daikin-3mxs-k-additional-charge-r1",
      source_definition_hash: DAIKIN_3MXS_K_SOURCE_METADATA.definition_hash,
      calculated_additional_refrigerant_kg: 0.3,
      produced_parameter_ids: ["factory_chargeless_length_m", "manufacturer_charge_kg"],
      blockers: [],
    });
    expect(first.parameter_values.factory_chargeless_length_m).toMatchObject({
      value: 30,
      unit_id: "m",
      source_type: "APPLICABLE_NORM",
      source_id: DAIKIN_3MXS_K_SOURCE_ID,
    });
    expect(first.parameter_values.manufacturer_charge_kg).toMatchObject({
      value: 0.3,
      unit_id: "kg",
      source_type: "APPLICABLE_NORM",
      source_id: DAIKIN_3MXS_K_SOURCE_ID,
    });
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
    expect(input.factory_chargeless_length_m).toBeUndefined();
    expect(input.manufacturer_charge_kg).toBeUndefined();
  });

  test("routes Daikin through the registry and the real HVAC refrigerant BOQ row", () => {
    const inventory = HVAC_DOMAIN_INVENTORY.find((row) => row.work_key === CONDITIONER_INSTALL_WORK_KEY);
    if (!inventory) throw new Error("DAIKIN_RUNTIME_INSTALL_WORK_MISSING");
    const technology = hvacDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
    const schema = hvacDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
    if (!technology || !schema) throw new Error("DAIKIN_RUNTIME_SCHEMA_MISSING");
    const daikinValue = (parameter: Parameters<typeof validOverrideValue>[0]) => {
      if (parameter.parameter_id === "product_profile_id") return DAIKIN_3MXS_K_PRODUCT_PROFILE_ID;
      if (parameter.parameter_id === "equipment_model") return "Daikin 3MXS-K";
      if (parameter.parameter_id === "manufacturer_system_profile_id") return DAIKIN_3MXS_K_PRODUCT_PROFILE_ID;
      if (parameter.parameter_id === "refrigerant_type") return "R-410A";
      if (parameter.parameter_id === "total_refrigerant_piping_length_m") return 45;
      if (parameter.parameter_id === "outdoor_unit_nameplate_reference") return "Шильдик 3MXS-K / инструкция rev. 2026-09";
      if (parameter.parameter_id === "maximum_piping_and_height_limits_confirmed") return true;
      return validOverrideValue(parameter);
    };
    const paramOverrides = Object.fromEntries(schema.parameters
      .filter((parameter) => ![
        "factory_chargeless_length_m",
        "manufacturer_charge_kg",
      ].includes(parameter.parameter_id))
      .map((parameter) => [parameter.parameter_id, {
        value: parameter.parameter_id === "scope_capability"
          ? inventory.scope_capability
          : daikinValue(parameter),
        source: "user",
      }]));

    const result = buildHvacFromInlineInputV1({
      rawInput: "Монтаж Daikin 3MXS-K R-410A, суммарная длина трубопроводов 45 м",
      selectedWorkKey: CONDITIONER_INSTALL_WORK_KEY,
      city: "Bishkek",
      currency: "KGS",
      paramOverrides,
    });

    expect(result.exact_match).toBe(true);
    expect(result.missing_parameter_ids).toEqual([]);
    expect(result.production?.compile_result.status).toBe("COMPILED");
    expect(result.production?.compile_result.normative_resolution.applicable_sources.map((source) => source.source_id))
      .toEqual(expect.arrayContaining(["kg_krer_2015_application_guidance", DAIKIN_3MXS_K_SOURCE_ID]));
    const chargeRow = result.production?.draft?.items.find((row) =>
      row.sourceParameters?.rowCode === `${inventory.canonical_technology_id}:row:manufacturer_charge`);
    expect(chargeRow).toMatchObject({ quantity: 0.3, unit: "kg" });
    expect(chargeRow?.sourceParameters?.normativeSourceIds).toEqual([
      "kg_krer_2015_application_guidance",
      DAIKIN_3MXS_K_SOURCE_ID,
    ]);
    expect(chargeRow?.sourceParameters?.parameterSourceIds).toContain(DAIKIN_3MXS_K_SOURCE_ID);
    expect(chargeRow?.sourceParameters?.professionalPhysicalNormApplicabilityV1).toMatchObject({
      source_id: DAIKIN_3MXS_K_SOURCE_ID,
      source_definition_hash: DAIKIN_3MXS_K_SOURCE_METADATA.definition_hash,
      calculated_additional_refrigerant_kg: 0.3,
    });
  });

  test("does not extrapolate the Knauf reference-ceiling fastener quantity", () => {
    expect(resolveKnaufD112(exactKnaufD112Inputs({ length_m: explicit(12, "m") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      source_id: KNAUF_D112_WALL_FASTENER_SOURCE_ID,
      blockers: ["PHYSICAL_NORM_REFERENCE_GEOMETRY_NOT_APPLICABLE:length_m=12:width_m=10:area_m2=100"],
    });
    expect(resolveKnaufD112(exactKnaufD112Inputs({ system_variant: explicit("double_layer") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [`PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_WALL_FASTENER_NORM_ID}:system_variant=double_layer`],
    });
    expect(resolveKnaufD112(exactKnaufD112Inputs({ substrate_fastener_approved: explicit(false) })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: [`PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_WALL_FASTENER_NORM_ID}:substrate_fastener_approved=false`],
      });
    expect(resolveKnaufD112(exactKnaufD112Inputs({ ceiling_perimeter_anchor_spacing_m: explicit(1.2, "m") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: ["PHYSICAL_NORM_PROJECT_LAYOUT_CONFLICT:perimeter_anchor_count=34:norm_value=40"],
      });
  });

  test("binds the Knauf quantity only to the exact 10 m by 10 m reference ceiling", () => {
    const input = exactKnaufD112Inputs();
    const first = resolveKnaufD112(input);
    const second = resolveKnaufD112(input);

    expect(first).toMatchObject({
      status: "APPLIED",
      source_id: KNAUF_D112_WALL_FASTENER_SOURCE_ID,
      norm_id: KNAUF_D112_WALL_FASTENER_NORM_ID,
      source_document_version: "2026.09-knauf-d11-d112-standard-r1",
      source_definition_hash: KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.definition_hash,
      calculated_wall_fastener_quantity_piece: 40,
      produced_parameter_ids: ["quantity_perimeter_track_anchors"],
      blockers: [],
    });
    expect(first.parameter_values.quantity_perimeter_track_anchors).toMatchObject({
      value: 40,
      unit_id: "item",
      source_type: "APPLICABLE_NORM",
      source_id: KNAUF_D112_WALL_FASTENER_SOURCE_ID,
    });
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
    expect(input.quantity_perimeter_track_anchors).toBeUndefined();
  });

  test("routes Knauf only to the canonical perimeter-track-anchor BOQ row", () => {
    const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) =>
      row.work_key === FLAT_CEILING_FRAME_WORK_KEY);
    if (!inventory) throw new Error("KNAUF_D112_RUNTIME_FRAME_WORK_MISSING");
    const technology = interiorFinishesDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
    const schema = interiorFinishesDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
    if (!technology || !schema) throw new Error("KNAUF_D112_RUNTIME_SCHEMA_MISSING");
    const knaufValue = (parameter: Parameters<typeof validOverrideValue>[0]) => {
      if (parameter.parameter_id === "product_profile_id") return KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID;
      if (parameter.parameter_id === "system_passport_reference") return "Knauf D11, D112 variant 1, page 28";
      if (parameter.parameter_id === "area_m2") return 100;
      if (parameter.parameter_id === "length_m" || parameter.parameter_id === "width_m") return 10;
      if (parameter.parameter_id === "system_variant") return "standard_12_5_mm_single_layer";
      if (parameter.parameter_id === "substrate_type") return "Железобетон C25/30";
      if (parameter.parameter_id === "substrate_fastener_reference") return "Анкер по паспорту проекта КР-17";
      if (parameter.parameter_id === "substrate_fastener_approved") return true;
      if (parameter.parameter_id === "ceiling_perimeter_anchor_spacing_m") return 1;
      return validOverrideValue(parameter);
    };
    const paramOverrides = Object.fromEntries(schema.parameters
      .filter((parameter) => parameter.parameter_id !== "quantity_perimeter_track_anchors")
      .map((parameter) => [parameter.parameter_id, {
        value: knaufValue(parameter),
        source: "user",
      }]));

    const result = buildInteriorFinishesFromInlineInputV1({
      rawInput: "Каркас потолка Knauf D112 10 × 10 м, вариант 1",
      selectedWorkKey: FLAT_CEILING_FRAME_WORK_KEY,
      city: "Bishkek",
      currency: "KGS",
      paramOverrides,
    });

    expect(result.exact_match).toBe(true);
    expect(result.missing_parameter_ids).toEqual([]);
    expect(result.production?.compile_result.status).toBe("COMPILED");
    expect(result.production?.compile_result.normative_resolution.applicable_sources.map((source) => source.source_id))
      .toContain(KNAUF_D112_WALL_FASTENER_SOURCE_ID);
    const anchorRow = result.production?.draft?.items.find((row) =>
      row.sourceParameters?.rowCode === `${inventory.catalog_id}:drywall-flat-ceiling-v6:row:perimeter_track_anchors`);
    expect(anchorRow).toMatchObject({ quantity: 40, unit: "item" });
    expect(anchorRow?.sourceParameters?.normativeSourceIds).toContain(KNAUF_D112_WALL_FASTENER_SOURCE_ID);
    expect(anchorRow?.sourceParameters?.parameterSourceIds).toContain(KNAUF_D112_WALL_FASTENER_SOURCE_ID);
    expect(anchorRow?.sourceParameters?.professionalPhysicalNormApplicabilityV1).toMatchObject({
      source_id: KNAUF_D112_WALL_FASTENER_SOURCE_ID,
      source_definition_hash: KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.definition_hash,
      calculated_wall_fastener_quantity_piece: 40,
    });
    expect(result.production?.draft?.items
      .filter((row) => (row.sourceParameters?.normativeSourceIds as readonly string[] | undefined)
        ?.includes(KNAUF_D112_WALL_FASTENER_SOURCE_ID)))
      .toHaveLength(1);
  });

  test("keeps the Knauf Fugenfueller perimeter norm fail-closed without an exact rate and method", () => {
    const { perimeter_joint_consumption_kg_linear_m: _omitted, ...withoutExactRate } =
      exactKnaufFugenfuellerInputs();
    expect(resolveKnaufFugenfueller(withoutExactRate)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      source_id: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_ID,
      blockers: ["PROJECT_VALUE_REQUIRED_EXPLICIT:perimeter_joint_consumption_kg_linear_m"],
    });
    expect(resolveKnaufFugenfueller(exactKnaufFugenfuellerInputs({
      perimeter_joint_consumption_kg_linear_m: explicit(0.3, "kg_per_m"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        `PHYSICAL_NORM_RATE_NOT_APPLICABLE:${KNAUF_FUGENFUELLER_PERIMETER_NORM_ID}:perimeter_joint_consumption_kg_linear_m=0.3`,
      ],
    });
    expect(resolveKnaufFugenfueller(exactKnaufFugenfuellerInputs({
      perimeter_connection_joint_method: explicit("GENERIC_PERIMETER_JOINT"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_FUGENFUELLER_PERIMETER_NORM_ID}:perimeter_connection_joint_method=GENERIC_PERIMETER_JOINT`,
      ],
    });
    expect(resolveProfessionalPhysicalNormParameterValuesV1({
      technology_class: "FLAT_CEILING",
      operation_class: "CLAD",
      material_system: "FLAT_CEILING",
      scope_mode: "FULL_APPLICABLE_SCOPE",
      parameter_values: exactKnaufFugenfuellerInputs(),
    }).status).toBe("NOT_REQUESTED");
  });

  test("derives a 25 kg Knauf Fugenfueller procurement quantity from the exact perimeter profile", () => {
    const input = exactKnaufFugenfuellerInputs();
    const first = resolveKnaufFugenfueller(input);
    const second = resolveKnaufFugenfueller(input);

    expect(first).toMatchObject({
      status: "APPLIED",
      source_id: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_ID,
      norm_id: KNAUF_FUGENFUELLER_PERIMETER_NORM_ID,
      source_document_version: "2026.07-wave1",
      source_definition_hash: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA.definition_hash,
      calculated_perimeter_joint_compound_quantity_kg: 25,
      produced_parameter_ids: ["perimeter_joint_compound_quantity_kg"],
      blockers: [],
    });
    expect(first.parameter_values.perimeter_joint_compound_quantity_kg).toMatchObject({
      value: 25,
      unit_id: "kg",
      source_type: "APPLICABLE_NORM",
      source_id: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_ID,
    });
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
    expect(input.perimeter_joint_compound_quantity_kg).toBeUndefined();
    expect(constructionNormativeRegistryV1.get(KNAUF_FUGENFUELLER_PERIMETER_SOURCE_ID)).toMatchObject({
      authority: "Knauf",
      product_profile_applicability: [KNAUF_FUGENFUELLER_PERIMETER_PRODUCT_PROFILE_ID],
      material_system_applicability: ["FLAT_CEILING"],
      operation_class_applicability: ["FINISH_JOINT"],
    });
  });

  test("routes Knauf Fugenfueller only to the profile-triggered perimeter BOQ row", () => {
    const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) =>
      row.work_key === FLAT_CEILING_FINISH_JOINT_WORK_KEY);
    if (!inventory) throw new Error("KNAUF_FUGENFUELLER_RUNTIME_FINISH_JOINT_WORK_MISSING");
    const technology = interiorFinishesDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
    const schema = interiorFinishesDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
    if (!technology || !schema) throw new Error("KNAUF_FUGENFUELLER_RUNTIME_SCHEMA_MISSING");
    const fugenfuellerValue = (parameter: Parameters<typeof validOverrideValue>[0]) => {
      if (parameter.parameter_id === "product_profile_id") return KNAUF_FUGENFUELLER_PERIMETER_PRODUCT_PROFILE_ID;
      if (parameter.parameter_id === "perimeter_linear_m") return 100;
      if (parameter.parameter_id === "cladding_thickness_mm") return 12.5;
      if (parameter.parameter_id === "perimeter_joint_consumption_kg_linear_m") return 0.15;
      if (parameter.parameter_id === "perimeter_connection_joint_method") return "KNAUF_TRENN_FIX";
      if (parameter.parameter_id === "system_passport_reference") return "Knauf K462.de/eng, perimeter connection jointing";
      if (parameter.parameter_id === "material_certificate_reference") return "PROJECT-KNAUF-FUGENFUELLER-BATCH-CERT-001";
      return validOverrideValue(parameter);
    };
    const paramOverrides = Object.fromEntries(schema.parameters
      .filter((parameter) => parameter.parameter_id !== "perimeter_joint_compound_quantity_kg")
      .map((parameter) => [parameter.parameter_id, {
        value: fugenfuellerValue(parameter),
        source: "user",
      }]));

    const result = buildInteriorFinishesFromInlineInputV1({
      rawInput: "Заделка 100 м периметральных примыканий Knauf Trenn-Fix составом Fugenfüller Leicht",
      selectedWorkKey: FLAT_CEILING_FINISH_JOINT_WORK_KEY,
      city: "Bishkek",
      currency: "KGS",
      paramOverrides,
    });

    expect(result.exact_match).toBe(true);
    expect(result.missing_parameter_ids).toEqual([]);
    expect(result.production?.compile_result.status).toBe("COMPILED");
    expect(result.production?.compile_result.normative_resolution.applicable_sources.map((source) => source.source_id))
      .toContain(KNAUF_FUGENFUELLER_PERIMETER_SOURCE_ID);
    const compoundRow = result.production?.draft?.items.find((row) =>
      row.sourceParameters?.rowCode === `${inventory.catalog_id}:drywall-flat-ceiling-v6:row:knauf_fugenfueller_perimeter_joint`);
    expect(compoundRow).toMatchObject({ quantity: 25, unit: "kg" });
    expect(compoundRow?.sourceParameters?.normativeSourceIds).toContain(KNAUF_FUGENFUELLER_PERIMETER_SOURCE_ID);
    expect(compoundRow?.sourceParameters?.parameterSourceIds).toContain(KNAUF_FUGENFUELLER_PERIMETER_SOURCE_ID);
    expect(compoundRow?.sourceParameters?.professionalPhysicalNormApplicabilityV1).toMatchObject({
      source_id: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_ID,
      source_definition_hash: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA.definition_hash,
      calculated_perimeter_joint_compound_quantity_kg: 25,
    });
    expect(result.production?.draft?.items
      .filter((row) => (row.sourceParameters?.normativeSourceIds as readonly string[] | undefined)
        ?.includes(KNAUF_FUGENFUELLER_PERIMETER_SOURCE_ID)))
      .toHaveLength(1);
  });

  test("keeps the Forbo 232 adhesive norm closed without an explicit rate and exact applicability", () => {
    const { adhesive_consumption_ml_linear_m: _omitted, ...withoutExactRate } = exactForbo232Inputs();
    expect(resolveForbo232(withoutExactRate)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      source_id: FORBO_232_MOUNTING_ADHESIVE_SOURCE_ID,
      blockers: ["PROJECT_VALUE_REQUIRED_EXPLICIT:adhesive_consumption_ml_linear_m"],
    });
    expect(resolveForbo232(exactForbo232Inputs({
      adhesive_consumption_ml_linear_m: explicit(45, "ml_per_m"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        `PHYSICAL_NORM_RATE_NOT_APPLICABLE:${FORBO_232_MOUNTING_ADHESIVE_NORM_ID}:adhesive_consumption_ml_linear_m=45`,
      ],
    });
    expect(resolveForbo232(exactForbo232Inputs({
      skirting_material: explicit("soft_pvc"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        `PHYSICAL_NORM_NOT_APPLICABLE:${FORBO_232_MOUNTING_ADHESIVE_NORM_ID}:skirting_material=soft_pvc`,
      ],
    });
    expect(resolveForbo232(exactForbo232Inputs({
      ventilation_fire_controls_confirmed: explicit(false),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        `PHYSICAL_NORM_NOT_APPLICABLE:${FORBO_232_MOUNTING_ADHESIVE_NORM_ID}:ventilation_fire_controls_confirmed=false`,
      ],
    });
    expect(resolveProfessionalPhysicalNormParameterValuesV1({
      technology_class: "BASEBOARD",
      operation_class: "INSTALL",
      material_system: "BASEBOARD",
      scope_mode: "FULL_APPLICABLE_SCOPE",
      parameter_values: exactForbo232Inputs(),
    }).status).toBe("NOT_REQUESTED");
  });

  test("derives deterministic 310 ml cartridge procurement for the exact Forbo 232 profile", () => {
    const input = exactForbo232Inputs();
    const first = resolveForbo232(input);
    const second = resolveForbo232(input);

    expect(first).toMatchObject({
      status: "APPLIED",
      source_id: FORBO_232_MOUNTING_ADHESIVE_SOURCE_ID,
      norm_id: FORBO_232_MOUNTING_ADHESIVE_NORM_ID,
      source_document_version: "2026.09-gerflor-forbo-source-review-r1",
      source_definition_hash: FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA.definition_hash,
      calculated_forbo_adhesive_procurement_quantity_ml: 3100,
      produced_parameter_ids: ["forbo_adhesive_procurement_quantity_ml"],
      blockers: [],
    });
    expect(first.parameter_values.forbo_adhesive_procurement_quantity_ml).toMatchObject({
      value: 3100,
      unit_id: "ml",
      source_type: "APPLICABLE_NORM",
      source_id: FORBO_232_MOUNTING_ADHESIVE_SOURCE_ID,
    });
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
    expect(input.forbo_adhesive_procurement_quantity_ml).toBeUndefined();
    expect(constructionNormativeRegistryV1.get(FORBO_232_MOUNTING_ADHESIVE_SOURCE_ID)).toMatchObject({
      authority: "Forbo Eurocol",
      product_profile_applicability: [FORBO_232_MOUNTING_ADHESIVE_PRODUCT_PROFILE_ID],
      material_system_applicability: ["BASEBOARD"],
      operation_class_applicability: ["GLUE"],
    });
  });

  test("routes Forbo 232 to one linear baseboard adhesive row without the generic adhesive row", () => {
    const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) => row.work_key === BASEBOARD_GLUE_WORK_KEY);
    if (!inventory) throw new Error("FORBO_232_RUNTIME_BASEBOARD_GLUE_WORK_MISSING");
    const technology = interiorFinishesDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
    const schema = interiorFinishesDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
    if (!technology || !schema) throw new Error("FORBO_232_RUNTIME_BASEBOARD_GLUE_SCHEMA_MISSING");
    const forboValue = (parameter: Parameters<typeof validOverrideValue>[0]) => {
      if (parameter.parameter_id === "product_profile_id") return FORBO_232_MOUNTING_ADHESIVE_PRODUCT_PROFILE_ID;
      if (parameter.parameter_id === "adhesive_profile_mode") return BASEBOARD_GLUE_FORBO_232_PROFILE_MODE;
      if (parameter.parameter_id === "selected_adhesive_product") return "Forbo Eurocol 232 Eurosol Montage";
      if (parameter.parameter_id === "skirting_length_linear_m") return 100;
      if (parameter.parameter_id === "skirting_material") return "wood";
      if (parameter.parameter_id === "substrate_type") return "concrete";
      if (parameter.parameter_id === "adhesive_consumption_ml_linear_m") return 30;
      if (["substrate_ready_confirmed", "processing_conditions_confirmed", "ventilation_fire_controls_confirmed"]
        .includes(parameter.parameter_id)) return true;
      if (parameter.parameter_id === "manufacturer_instruction_reference") {
        return "Forbo 232 product specification, performances, application and working process";
      }
      if (parameter.parameter_id === "normative_rate_code") return "PROJECT-VERIFIED-INTERIOR-RATE";
      return validOverrideValue(parameter);
    };
    const paramOverrides = Object.fromEntries(schema.parameters
      .filter((parameter) => parameter.parameter_id !== "forbo_adhesive_procurement_quantity_ml")
      .map((parameter) => [parameter.parameter_id, { value: forboValue(parameter), source: "user" }]));

    const result = buildInteriorFinishesFromInlineInputV1({
      rawInput: "Приклеивание 100 м деревянного плинтуса клеем Forbo Eurocol 232",
      selectedWorkKey: BASEBOARD_GLUE_WORK_KEY,
      city: "Bishkek",
      currency: "KGS",
      paramOverrides,
    });

    expect(result.exact_match).toBe(true);
    expect(result.missing_parameter_ids).toEqual([]);
    expect(result.production?.compile_result.status).toBe("COMPILED");
    expect(technology.output).toEqual({ dimension: "LINEAR", unit_id: "m" });
    expect(schema.quantity_alternatives).toEqual([["skirting_length_linear_m"]]);
    expect(result.production?.compile_result.normative_resolution.applicable_sources.map((source) => source.source_id))
      .toContain(FORBO_232_MOUNTING_ADHESIVE_SOURCE_ID);
    const adhesiveRow = result.production?.draft?.items.find((row) =>
      row.sourceParameters?.rowCode === `${inventory.canonical_technology_id}:baseboard-glue-v1:row:forbo_232_adhesive`);
    expect(adhesiveRow).toMatchObject({ quantity: 3100, unit: "ml" });
    expect(adhesiveRow?.sourceParameters?.normativeSourceIds).toContain(FORBO_232_MOUNTING_ADHESIVE_SOURCE_ID);
    expect(adhesiveRow?.sourceParameters?.parameterSourceIds).toContain(FORBO_232_MOUNTING_ADHESIVE_SOURCE_ID);
    expect(adhesiveRow?.sourceParameters?.professionalPhysicalNormApplicabilityV1).toMatchObject({
      source_id: FORBO_232_MOUNTING_ADHESIVE_SOURCE_ID,
      source_definition_hash: FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA.definition_hash,
      calculated_forbo_adhesive_procurement_quantity_ml: 3100,
    });
    expect(result.production?.draft?.items.some((row) =>
      row.sourceParameters?.rowCode === `${inventory.canonical_technology_id}:baseboard-glue-v1:row:project_specified_adhesive`))
      .toBe(false);
    expect(result.production?.draft?.items
      .filter((row) => (row.sourceParameters?.normativeSourceIds as readonly string[] | undefined)
        ?.includes(FORBO_232_MOUNTING_ADHESIVE_SOURCE_ID)))
      .toHaveLength(1);
  });

  test("keeps the Legrand P31 joint norm closed outside its exact width, coupler and torque", () => {
    expect(resolveLegrandP31(exactLegrandP31Inputs({ tray_width_mm: explicit(400, "mm") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      source_id: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_ID,
      blockers: [
        `PHYSICAL_NORM_NOT_APPLICABLE:${LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID}:tray_width_mm=400`,
        "PHYSICAL_NORM_PROJECT_VALUE_CONFLICT:containment_width_mm=150:tray_width_mm=400",
      ],
    });
    expect(resolveLegrandP31(exactLegrandP31Inputs({ coupler_reference: explicit("Unknown coupler") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: [`PHYSICAL_NORM_NOT_APPLICABLE:${LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID}:coupler_reference=Unknown coupler`],
      });
    expect(resolveLegrandP31(exactLegrandP31Inputs({ tightening_torque_nm: explicit(9, "N_m") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: [`PHYSICAL_NORM_NOT_APPLICABLE:${LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID}:tightening_torque_nm=9`],
      });
    expect(resolveProfessionalPhysicalNormParameterValuesV1({
      technology_class: "POWER_CABLE",
      operation_class: "INSTALL",
      material_system: "POWER_CABLE",
      scope_mode: "FULL_APPLICABLE_SCOPE",
      parameter_values: exactLegrandP31Inputs(),
    }).status).toBe("NOT_REQUESTED");
  });

  test("derives eight M6 fasteners per explicit Legrand P31 tray joint", () => {
    const input = exactLegrandP31Inputs();
    const first = resolveLegrandP31(input);
    const second = resolveLegrandP31(input);

    expect(first).toMatchObject({
      status: "APPLIED",
      source_id: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_ID,
      norm_id: LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID,
      source_document_version: "2026.09-legrand-product-and-installation-r1",
      source_definition_hash: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.definition_hash,
      calculated_tray_joint_fastener_quantity_piece: 40,
      produced_parameter_ids: ["quantity_containment_joint_bolt"],
      blockers: [],
    });
    expect(first.parameter_values.quantity_containment_joint_bolt).toMatchObject({
      value: 40,
      unit_id: "item",
      source_type: "APPLICABLE_NORM",
      source_id: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_ID,
    });
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
    expect(input.quantity_containment_joint_bolt).toBeUndefined();
    expect(constructionNormativeRegistryV1.get(LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_ID)).toMatchObject({
      authority: "Legrand",
      product_profile_applicability: [LEGRAND_P31_TRAY_PRODUCT_PROFILE_ID],
      material_system_applicability: ["CABLE_CHANNEL"],
    });
  });

  test("routes Legrand P31 only to the canonical tray-joint-bolt BOQ row", () => {
    const inventory = ELECTRICAL_DOMAIN_INVENTORY.find((row) => row.work_key === CABLE_CHANNEL_INSTALL_WORK_KEY);
    if (!inventory) throw new Error("LEGRAND_P31_RUNTIME_INSTALL_WORK_MISSING");
    const technology = electricalCompleteDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
    const schema = electricalCompleteDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
    if (!technology || !schema) throw new Error("LEGRAND_P31_RUNTIME_SCHEMA_MISSING");
    const p31Value = (parameter: Parameters<typeof validOverrideValue>[0]) => {
      if (parameter.parameter_id === "product_profile_id") return LEGRAND_P31_TRAY_PRODUCT_PROFILE_ID;
      if (parameter.parameter_id === "product_specification_id") return "ЭОМ-17.S-04 / Legrand P31";
      if (parameter.parameter_id === "containment_type") return "TRAY";
      if (parameter.parameter_id === "containment_width_mm" || parameter.parameter_id === "tray_width_mm") return 150;
      if (parameter.parameter_id === "tray_joint_count") return 5;
      if (parameter.parameter_id === "coupler_reference") return "EP Coupler LG-341213";
      if (parameter.parameter_id === "manufacturer_system_profile_id") return LEGRAND_P31_TRAY_PRODUCT_PROFILE_ID;
      if (parameter.parameter_id === "installation_manual_reference") return "Legrand FT0955-02, page 11/13, section 3";
      if (parameter.parameter_id === "tightening_torque_nm") return 11;
      if (parameter.parameter_id === "exact_krerm_rate_code") return ELECTRICAL_KRERM_INDIVIDUAL_NORM_RESOLUTION_V1;
      if (parameter.parameter_id === "exact_krerp_rate_code") return ELECTRICAL_KRERP_INDIVIDUAL_RATE_RESOLUTION_V1;
      return validOverrideValue(parameter);
    };
    const paramOverrides = Object.fromEntries(schema.parameters
      .filter((parameter) => parameter.parameter_id !== "quantity_containment_joint_bolt")
      .map((parameter) => [parameter.parameter_id, { value: p31Value(parameter), source: "user" }]));

    const result = buildElectricalFromInlineInputV1({
      rawInput: "Монтаж симметричного лотка Legrand P31 150 мм, 5 стыков",
      selectedWorkKey: CABLE_CHANNEL_INSTALL_WORK_KEY,
      city: "Bishkek",
      currency: "KGS",
      paramOverrides,
    });

    expect(result.exact_match).toBe(true);
    expect(result.missing_parameter_ids).toEqual([]);
    expect(result.production?.compile_result.status).toBe("COMPILED");
    expect(result.production?.compile_result.normative_resolution.applicable_sources.map((source) => source.source_id))
      .toContain(LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_ID);
    const fastenerRow = result.production?.draft?.items.find((row) =>
      row.sourceParameters?.rowCode === `${inventory.canonical_technology_id}:row:containment_joint_bolt`);
    expect(fastenerRow).toMatchObject({ quantity: 40, unit: "item" });
    expect(fastenerRow?.sourceParameters?.normativeSourceIds).toContain(LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_ID);
    expect(fastenerRow?.sourceParameters?.parameterSourceIds).toContain(LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_ID);
    expect(fastenerRow?.sourceParameters?.professionalPhysicalNormApplicabilityV1).toMatchObject({
      source_id: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_ID,
      source_definition_hash: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.definition_hash,
      calculated_tray_joint_fastener_quantity_piece: 40,
    });
    expect(result.production?.draft?.items
      .filter((row) => (row.sourceParameters?.normativeSourceIds as readonly string[] | undefined)
        ?.includes(LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_ID)))
      .toHaveLength(1);
  });

  test("keeps the Wavin Hep2O SmartSleeve norm closed for another system or inconsistent topology", () => {
    expect(resolveWavinHep2O(exactWavinHep2OInputs({
      jointing_method: explicit("generic push-fit"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      source_id: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID,
      blockers: [
        `PHYSICAL_NORM_NOT_APPLICABLE:${WAVIN_HEP2O_SMARTSLEEVE_NORM_ID}:jointing_method=generic push-fit`,
      ],
    });
    expect(resolveWavinHep2O(exactWavinHep2OInputs({
      prepared_pipe_end_count: explicit(5, "item"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_PROJECT_TOPOLOGY_CONFLICT:prepared_pipe_end_count=5:connection_count=6"],
    });
    expect(resolveProfessionalPhysicalNormParameterValuesV1({
      technology_class: "OUTDOOR_HEAT_NETWORK",
      operation_class: "INSTALL",
      material_system: "HEATING_PIPE:SPACE_HEATING:HEATING_WATER",
      scope_mode: "FULL_APPLICABLE_SCOPE",
      parameter_values: exactWavinHep2OInputs(),
    }).status).toBe("NOT_REQUESTED");
    expect(resolveWavinHep2O(exactWavinHep2OInputs({
      nominal_diameter_mm: explicit(22, "mm"),
      hep2o_support_orientation: explicit("vertical"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_NOT_APPLICABLE:WAVIN_HEP2O_CLIP_SPACING:nominal_diameter_mm=22:orientation=vertical"],
    });
    expect(resolveWavinHep2O(exactWavinHep2OInputs({
      route_length_m: explicit(1.3, "m"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_PROJECT_TOPOLOGY_CONFLICT:hep2o_support_span_length_sum_m=1.2:route_length_m=1.3"],
    });
    expect(resolveWavinHep2O(exactWavinHep2OInputs({
      hep2o_support_anchor_positions_verified: explicit(false),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_PROJECT_TOPOLOGY_NOT_VERIFIED:hep2o_support_anchor_positions_verified"],
    });
  });

  test("derives Wavin Hep2O SmartSleeves and clip count from exact joint and support topology", () => {
    const input = exactWavinHep2OInputs();
    const first = resolveWavinHep2O(input);
    const second = resolveWavinHep2O(input);

    expect(first).toMatchObject({
      status: "APPLIED",
      source_id: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID,
      norm_id: WAVIN_HEP2O_SMARTSLEEVE_NORM_ID,
      source_document_version: "2026.09-wavin-hep2o-installer-guide-r1",
      source_definition_hash: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.definition_hash,
      calculated_smart_sleeve_quantity_piece: 10,
      calculated_support_quantity_piece: 5,
      source_ids: [WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID, WAVIN_HEP2O_15MM_HORIZONTAL_CLIP_SOURCE_ID],
      norm_ids: [WAVIN_HEP2O_SMARTSLEEVE_NORM_ID, WAVIN_HEP2O_15MM_HORIZONTAL_CLIP_NORM_ID],
      applied_norms: [{
        source_id: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID,
        source_definition_hash: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.definition_hash,
        produced_parameter_ids: ["smart_sleeve_quantity_piece"],
      }, {
        source_id: WAVIN_HEP2O_15MM_HORIZONTAL_CLIP_SOURCE_ID,
        source_definition_hash: WAVIN_HEP2O_CLIP_SOURCE_METADATA[0].definition_hash,
        produced_parameter_ids: ["support_count"],
      }],
      produced_parameter_ids: ["smart_sleeve_quantity_piece", "support_count"],
      blockers: [],
    });
    expect(first.parameter_values.smart_sleeve_quantity_piece).toMatchObject({
      value: 10,
      unit_id: "item",
      source_type: "APPLICABLE_NORM",
      source_id: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID,
    });
    expect(first.parameter_values.support_count).toMatchObject({
      value: 5,
      unit_id: "item",
      source_type: "APPLICABLE_NORM",
      source_id: WAVIN_HEP2O_15MM_HORIZONTAL_CLIP_SOURCE_ID,
    });
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
    expect(input.smart_sleeve_quantity_piece).toBeUndefined();
    expect(constructionNormativeRegistryV1.get(WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID)).toMatchObject({
      authority: "Wavin",
      product_profile_applicability: [WAVIN_HEP2O_PUSH_FIT_PRODUCT_PROFILE_ID],
      material_system_applicability: ["HEATING_PIPE:SPACE_HEATING:HEATING_WATER"],
    });
    expect(constructionNormativeRegistryV1.get(WAVIN_HEP2O_15MM_HORIZONTAL_CLIP_SOURCE_ID)).toMatchObject({
      authority: "Wavin",
      document_code: WAVIN_HEP2O_15MM_HORIZONTAL_CLIP_NORM_ID,
      product_profile_applicability: [WAVIN_HEP2O_PUSH_FIT_PRODUCT_PROFILE_ID],
    });
    expect(WAVIN_HEP2O_CLIP_SOURCE_METADATA).toHaveLength(3);
    for (const variant of [{
      nominal_diameter_mm: 22,
      orientation: "horizontal",
      source_id: WAVIN_HEP2O_22MM_HORIZONTAL_CLIP_SOURCE_ID,
    }, {
      nominal_diameter_mm: 15,
      orientation: "vertical",
      source_id: WAVIN_HEP2O_15MM_VERTICAL_CLIP_SOURCE_ID,
    }] as const) {
      const resolution = resolveWavinHep2O(exactWavinHep2OInputs({
        route_length_m: explicit(1, "m"),
        nominal_diameter_mm: explicit(variant.nominal_diameter_mm, "mm"),
        hep2o_support_orientation: explicit(variant.orientation),
        hep2o_support_span_lengths_m: explicit("0.5;0.5", "m"),
      }));
      expect(resolution).toMatchObject({
        status: "APPLIED",
        calculated_support_quantity_piece: 3,
        source_ids: [WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID, variant.source_id],
      });
      expect(resolution.parameter_values.support_count).toMatchObject({
        value: 3,
        source_id: variant.source_id,
      });
    }
  });

  test("routes Wavin Hep2O SmartSleeve only to its canonical HVAC child row", () => {
    const inventory = HVAC_DOMAIN_INVENTORY.find((row) => row.work_key === HEATING_PIPE_INSTALL_WORK_KEY);
    if (!inventory) throw new Error("WAVIN_HEP2O_RUNTIME_INSTALL_WORK_MISSING");
    const technology = hvacDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
    const schema = hvacDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
    if (!technology || !schema) throw new Error("WAVIN_HEP2O_RUNTIME_SCHEMA_MISSING");
    const wavinValue = (parameter: Parameters<typeof validOverrideValue>[0]) => {
      if (parameter.parameter_id === "product_profile_id") return WAVIN_HEP2O_PUSH_FIT_PRODUCT_PROFILE_ID;
      if (parameter.parameter_id === "exact_material_or_equipment") return "Wavin Hep2O Barrier pipe and Hep2O fittings";
      if (parameter.parameter_id === "pipe_material_and_class") return "Wavin Hep2O Barrier pipe";
      if (parameter.parameter_id === "jointing_method") return "Wavin Hep2O push-fit with SmartSleeve";
      if (parameter.parameter_id === "connection_count") return 6;
      if (parameter.parameter_id === "prepared_pipe_end_count") return 10;
      if (parameter.parameter_id === "hep2o_system_variant") return "WAVIN_HEP2O_PUSH_FIT";
      if (parameter.parameter_id === "route_length_m") return 1.2;
      if (parameter.parameter_id === "nominal_diameter_mm") return 15;
      if (parameter.parameter_id === "hep2o_support_orientation") return "horizontal";
      if (parameter.parameter_id === "hep2o_support_span_lengths_m") return "0.6;0.6";
      if (parameter.parameter_id === "hep2o_support_anchor_node_count") return 3;
      if (parameter.parameter_id === "hep2o_support_layout_reference") return "ОВ-31.S-04, участок H01-H03";
      if (parameter.parameter_id === "hep2o_support_anchor_positions_verified") return true;
      if (parameter.parameter_id === "hep2o_joint_topology_reference") {
        return "ОВ-31.S-04, узлы H01-H06, 10 подготовленных концов";
      }
      return validOverrideValue(parameter);
    };
    const paramOverrides = Object.fromEntries(schema.parameters
      .filter((parameter) => !["smart_sleeve_quantity_piece", "support_count"].includes(parameter.parameter_id))
      .map((parameter) => [parameter.parameter_id, {
        value: parameter.parameter_id === "scope_capability"
          ? inventory.scope_capability
          : wavinValue(parameter),
        source: "user",
      }]));

    const result = buildHvacFromInlineInputV1({
      rawInput: "Монтаж внутреннего отопительного трубопровода Wavin Hep2O, 10 подготовленных концов",
      selectedWorkKey: HEATING_PIPE_INSTALL_WORK_KEY,
      city: "Bishkek",
      currency: "KGS",
      paramOverrides,
    });

    expect(result.exact_match).toBe(true);
    expect(result.missing_parameter_ids).toEqual([]);
    expect(result.production?.compile_result.status).toBe("COMPILED");
    expect(result.production?.compile_result.normative_resolution.applicable_sources.map((source) => source.source_id))
      .toContain(WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID);
    expect(result.production?.compile_result.normative_resolution.applicable_sources.map((source) => source.source_id))
      .toContain(WAVIN_HEP2O_15MM_HORIZONTAL_CLIP_SOURCE_ID);
    const sleeveRow = result.production?.draft?.items.find((row) =>
      row.sourceParameters?.rowCode === `${inventory.canonical_technology_id}:row:hep2o_smart_sleeves`);
    expect(sleeveRow).toMatchObject({ quantity: 10, unit: "item" });
    expect(sleeveRow?.sourceParameters?.normativeSourceIds).toEqual([
      "kg_krer_2015_application_guidance",
      WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID,
    ]);
    expect(sleeveRow?.sourceParameters?.parameterSourceIds).toEqual([WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID]);
    expect(sleeveRow?.sourceParameters?.professionalPhysicalNormApplicabilityV1).toMatchObject({
      source_id: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID,
      source_definition_hash: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.definition_hash,
      calculated_smart_sleeve_quantity_piece: 10,
      calculated_support_quantity_piece: 5,
    });
    const supportRow = result.production?.draft?.items.find((row) =>
      row.sourceParameters?.rowCode === `${inventory.canonical_technology_id}:row:supports`);
    expect(supportRow).toMatchObject({ quantity: 5, unit: "item" });
    expect(supportRow?.sourceParameters?.normativeSourceIds).toEqual([
      "kg_krer_2015_application_guidance",
      WAVIN_HEP2O_15MM_HORIZONTAL_CLIP_SOURCE_ID,
    ]);
    expect(supportRow?.sourceParameters?.parameterSourceIds).toEqual([
      WAVIN_HEP2O_15MM_HORIZONTAL_CLIP_SOURCE_ID,
    ]);
    expect(supportRow?.sourceParameters?.professionalPhysicalNormApplicabilityV1).toMatchObject({
      calculated_support_quantity_piece: 5,
      source_ids: [WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID, WAVIN_HEP2O_15MM_HORIZONTAL_CLIP_SOURCE_ID],
    });
    expect(result.production?.draft?.items
      .filter((row) => (row.sourceParameters?.normativeSourceIds as readonly string[] | undefined)
        ?.includes(WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID)))
      .toHaveLength(1);
    expect(result.production?.draft?.items
      .filter((row) => (row.sourceParameters?.normativeSourceIds as readonly string[] | undefined)
        ?.includes(WAVIN_HEP2O_15MM_HORIZONTAL_CLIP_SOURCE_ID)))
      .toHaveLength(1);
  });
});
