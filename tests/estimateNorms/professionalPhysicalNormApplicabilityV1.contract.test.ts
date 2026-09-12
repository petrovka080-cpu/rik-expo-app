import {
  CERESIT_CN69_GLOBAL_25KG_NORM_ID,
  CERESIT_CN69_GLOBAL_25KG_PRODUCT_PROFILE_ID,
  CERESIT_CN69_GLOBAL_25KG_SOURCE_ID,
  CERESIT_CN69_GLOBAL_25KG_SOURCE_METADATA,
  CERESIT_CN87_50MM_SCREED_PRODUCT_PROFILE_ID,
  CERESIT_CT17_FLOORING_PRIMER_NORM_ID,
  CERESIT_CT17_FLOORING_PRIMER_SOURCE_ID,
  CERESIT_CT17_FLOORING_PRIMER_SOURCE_METADATA,
  CERESIT_CT17_PAINT_PRIMER_NORM_ID,
  CERESIT_CT17_PAINT_PRIMER_SOURCE_ID,
  CERESIT_CT17_PAINT_PRIMER_SOURCE_METADATA,
  CERESIT_CT17_TILE_PRIMER_NORM_ID,
  CERESIT_CT17_TILE_PRIMER_SOURCE_ID,
  CERESIT_CT17_TILE_PRIMER_SOURCE_METADATA,
  CERESIT_CM11_SMALL_CERAMIC_INDOOR_NORM_ID,
  CERESIT_CM11_SMALL_CERAMIC_INDOOR_PRODUCT_PROFILE_ID,
  CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_ID,
  CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA,
  CERESIT_CT54_CT17_INTERIOR_WALL_PRODUCT_PROFILE_ID,
  CERESIT_CT54_INTERIOR_WALL_NORM_ID,
  CERESIT_CT54_INTERIOR_WALL_SOURCE_ID,
  CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA,
  DAIKIN_3MXS_K_NORM_ID,
  DAIKIN_3MXS_K_PRODUCT_PROFILE_ID,
  DAIKIN_3MXS_K_SOURCE_ID,
  DAIKIN_3MXS_K_SOURCE_METADATA,
  FORBO_232_MOUNTING_ADHESIVE_NORM_ID,
  FORBO_232_MOUNTING_ADHESIVE_PRODUCT_PROFILE_ID,
  FORBO_232_MOUNTING_ADHESIVE_SOURCE_ID,
  FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA,
  GERFLOR_6086_SKIRTING_NORM_ID,
  GERFLOR_6086_SKIRTING_PRODUCT_PROFILE_ID,
  GERFLOR_6086_SKIRTING_SOURCE_ID,
  GERFLOR_6086_SKIRTING_SOURCE_METADATA,
  KNAUF_D112_BOARD_NORM_ID,
  KNAUF_D112_BOARD_SOURCE_ID,
  KNAUF_D112_BOARD_SOURCE_METADATA,
  KNAUF_D112_JOINT_TAPE_NORM_ID,
  KNAUF_D112_JOINT_TAPE_SOURCE_ID,
  KNAUF_D112_JOINT_TAPE_SOURCE_METADATA,
  KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID,
  KNAUF_D112_SUBSTRUCTURE_ANCHOR_NORM_ID,
  KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_ID,
  KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_METADATA,
  KNAUF_D112_TN25_SCREW_NORM_ID,
  KNAUF_D112_TN25_SCREW_SOURCE_ID,
  KNAUF_D112_TN25_SCREW_SOURCE_METADATA,
  KNAUF_D112_UNIFLOTT_NORM_ID,
  KNAUF_D112_UNIFLOTT_SOURCE_ID,
  KNAUF_D112_UNIFLOTT_SOURCE_METADATA,
  KNAUF_D112_UD_RUNNER_NORM_ID,
  KNAUF_D112_UD_RUNNER_SOURCE_ID,
  KNAUF_D112_UD_RUNNER_SOURCE_METADATA,
  KNAUF_D112_WALL_FASTENER_NORM_ID,
  KNAUF_D112_WALL_FASTENER_SOURCE_ID,
  KNAUF_D112_WALL_FASTENER_SOURCE_METADATA,
  KNAUF_FUGENFUELLER_JOINTING_NORM_ID,
  KNAUF_FUGENFUELLER_JOINTING_PRODUCT_PROFILE_ID,
  KNAUF_FUGENFUELLER_JOINTING_SOURCE_ID,
  KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA,
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
const FLAT_CEILING_CLAD_WORK_KEY = "drywall_ceiling_interior_drywall_ceiling_clad_standard";
const FLAT_CEILING_FINISH_JOINT_WORK_KEY = "drywall_ceiling_interior_drywall_ceiling_finish_joint_standard";
const CABLE_CHANNEL_INSTALL_WORK_KEY = "electrical_interior_cable_channel_install_standard";
const BASEBOARD_GLUE_WORK_KEY = "flooring_interior_baseboard_glue_standard";
const BASEBOARD_INSTALL_WORK_KEY = "flooring_interior_baseboard_install_standard";
const SUBFLOOR_PREPARE_WORK_KEY = "flooring_interior_subfloor_prepare_standard";
const CERAMIC_TILE_LAY_STANDARD_WORK_KEY = "tile_stone_interior_ceramic_tile_lay_standard";
const WALL_PAINT_STANDARD_WORK_KEY = "plaster_paint_interior_paint_wall_paint_standard";

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
    perimeter_m: explicit(40, "m"),
    ceiling_primary_profile_spacing_m: explicit(1, "m"),
    ceiling_secondary_profile_spacing_m: explicit(0.5, "m"),
    ceiling_hanger_spacing_m: explicit(0.95, "m"),
    load_class_kn_m2: explicit(0.15, "kn_per_m2"),
    substructure_anchor_reference: explicit("Анкер подвеса по паспорту проекта КР-18"),
    substructure_anchor_approved: explicit(true),
    d112_substructure_manufacturer_excludes_loss_and_waste_confirmed: explicit(true),
    selected_profile_piece_length_m: explicit(3, "m"),
    current_regional_system_approval: explicit("KG-D112-SYSTEM-APPROVAL-2026-01"),
    d112_ud_runner_manufacturer_excludes_loss_and_waste_confirmed: explicit(true),
    material_certificate_reference: explicit("PROJECT-KNAUF-D112-BATCH-CERT-001"),
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

function exactKnaufD112Tn25Inputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID),
    system_passport_reference: explicit("Knauf D11, D112 variant 1, page 28"),
    area_m2: explicit(100, "m2"),
    length_m: explicit(10, "m"),
    width_m: explicit(10, "m"),
    system_variant: explicit("standard_12_5_mm_single_layer"),
    board_layer_count: explicit(1, "item"),
    board_thickness_mm: explicit(12.5, "mm"),
    board_type: explicit("GKB"),
    selected_board_length_mm: explicit(2500, "mm"),
    selected_board_width_mm: explicit(1200, "mm"),
    selected_board_layout_piece_count: explicit(34, "item"),
    d112_board_layout_reference: explicit("АР-17, лист 12, раскладка потолка D112 rev.2"),
    d112_board_manufacturer_excludes_loss_and_waste_confirmed: explicit(true),
    material_certificate_reference: explicit("PROJECT-KNAUF-D112-GKB-BATCH-CERT-001"),
    ...changes,
  };
}

function resolveKnaufD112Tn25(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "FLAT_CEILING",
    operation_class: "CLAD",
    material_system: "FLAT_CEILING",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values,
  });
}

function exactKnaufD112UniflottInputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID),
    area_m2: explicit(53, "m2"),
    system_variant: explicit("standard_12_5_mm_single_layer"),
    joint_filling_method: explicit("hand"),
    d112_uniflott_selected_bag_size_kg: explicit(5, "kg"),
    d112_manufacturer_excludes_loss_and_waste_confirmed: explicit(true),
    cut_edge_jointing_required: explicit(true),
    selected_joint_tape_roll_length_m: explicit(75, "m"),
    selected_joint_tape_reference: explicit("Knauf joint tape, 75 m roll, batch KT-001"),
    d112_cut_edge_joint_layout_reference: explicit("АР-17, лист 13, карта резаных кромок rev.2"),
    d112_joint_tape_manufacturer_excludes_loss_and_waste_confirmed: explicit(true),
    system_passport_reference: explicit("Knauf D11, D112 variant 1, page 28, Uniflott"),
    material_certificate_reference: explicit("PROJECT-KNAUF-UNIFLOTT-BATCH-CERT-001"),
    ...changes,
  };
}

function resolveKnaufD112Uniflott(
  values: Readonly<Record<string, ProfessionalParameterValueV4>>,
) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "FLAT_CEILING",
    operation_class: "FINISH_JOINT",
    material_system: "FLAT_CEILING",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values,
  });
}

function exactKnaufFugenfuellerJointingInputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(KNAUF_FUGENFUELLER_JOINTING_PRODUCT_PROFILE_ID),
    area_m2: explicit(53, "m2"),
    board_product_type: explicit("Knauf HRAK board"),
    board_thickness_mm: explicit(12.5, "mm"),
    board_layer_configuration: explicit("single_layer"),
    long_edge_type: explicit("HRAK"),
    construction_application: explicit("ceiling"),
    jointing_without_perimeter_confirmed: explicit(true),
    reinforcement_tape_confirmed: explicit(true),
    selected_consumption_kg_m2: explicit(0.3, "kg_per_m2"),
    substrate_and_application_conditions_confirmed: explicit(true),
    selected_bag_size_kg: explicit(5, "kg"),
    system_passport_reference: explicit("Knauf K462.de/eng/07.11/0/TB, exact ceiling table cell"),
    material_certificate_reference: explicit("PROJECT-KNAUF-FUGENFUELLER-BATCH-CERT-002"),
    ...changes,
  };
}

function resolveKnaufFugenfuellerJointing(
  values: Readonly<Record<string, ProfessionalParameterValueV4>>,
) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "FLAT_CEILING",
    operation_class: "FINISH_JOINT",
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

function exactCeresitCn69Inputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(CERESIT_CN69_GLOBAL_25KG_PRODUCT_PROFILE_ID),
    area_m2: explicit(100, "m2"),
    layer_thickness_mm: explicit(5, "mm"),
    cn69_substrate_type: explicit("cement_sand_screed"),
    dry_indoor_use_confirmed: explicit(true),
    moisture_ingress_prevented: explicit(true),
    substrate_preparation_confirmed: explicit(true),
    installation_conditions_confirmed: explicit(true),
    cn69_global_25kg_tds_variant_confirmed: explicit(true),
    selected_bag_size_kg: explicit(25, "kg"),
    ct17_substrate_evenness: explicit("even"),
    ct17_substrate_absorbency: explicit("absorbent"),
    ct17_selected_consumption_l_m2: explicit(0.18, "l_per_m2"),
    ct17_coat_count: explicit(1, "item"),
    ct17_substrate_dry_load_bearing_clean_confirmed: explicit(true),
    ct17_selected_container_size_l: explicit(10, "l"),
    ct17_still_absorbent_after_drying: explicit(false),
    ct17_repeat_rule_confirmed: explicit(true),
    ct17_additional_waste_not_published_confirmed: explicit(true),
    ct17_flooring_tds_confirmed: explicit(true),
    system_passport_reference: explicit("CERESIT-CN69-CT17-FLOOR-SYSTEM-PASSPORT-001"),
    material_certificate_reference: explicit("PROJECT-CERESIT-CT17-BATCH-CERT-001"),
    ...changes,
  };
}

function resolveCeresitCn69(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "SUBFLOOR",
    operation_class: "PREPARE",
    material_system: "SUBFLOOR",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values,
  });
}

function exactCeresitCm11Inputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(CERESIT_CM11_SMALL_CERAMIC_INDOOR_PRODUCT_PROFILE_ID),
    area_m2: explicit(45, "m2"),
    tile_type: explicit("ceramic"),
    tile_size_category: explicit("up_to_10_cm"),
    trowel_notch_mm: explicit(4, "mm"),
    substrate_type: explicit("cement_screed"),
    substrate_even_load_bearing_compact_confirmed: explicit(true),
    substrate_dry_clean_confirmed: explicit(true),
    installation_location: explicit("indoor"),
    installation_orientation: explicit("horizontal"),
    floating_buttering_requirement_confirmed: explicit(false),
    application_temperature_confirmed: explicit(true),
    cm11_global_tds_variant_confirmed: explicit(true),
    selected_package_size_kg: explicit(25, "kg"),
    minimum_tile_back_contact_percent: explicit(65, "percent"),
    manufacturer_tds_reference: explicit("CERESIT_CM11_TDS_04_2026, exact consumption table"),
    material_certificate_reference: explicit("PROJECT-CERESIT-CM11-BATCH-CERT-001"),
    ct17_tile_substrate_evenness: explicit("even"),
    ct17_tile_substrate_absorbency: explicit("absorbent"),
    ct17_tile_selected_consumption_l_m2: explicit(0.18, "l_per_m2"),
    ct17_tile_coat_count: explicit(1, "item"),
    ct17_tile_drying_rule_confirmed: explicit(true),
    ct17_tile_cement_wait_minutes: explicit(15, "minute"),
    ct17_tile_application_conditions_confirmed: explicit(true),
    ct17_tile_relative_humidity_percent: explicit(60, "percent"),
    ct17_tile_selected_container_size_l: explicit(10, "l"),
    ct17_tile_tds_confirmed: explicit(true),
    ct17_tile_additional_waste_not_published_confirmed: explicit(true),
    ct17_tile_tds_reference: explicit("TDS No CT17 Profi 03.24, pages 1-2"),
    ct17_tile_material_certificate_reference: explicit("PROJECT-CERESIT-CT17-TILE-BATCH-CERT-001"),
    ...changes,
  };
}

function resolveCeresitCm11(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "CERAMIC_TILE",
    operation_class: "LAY",
    material_system: "CERAMIC_TILE",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: values,
  });
}

function exactCeresitCt54Ct17WallInputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(CERESIT_CT54_CT17_INTERIOR_WALL_PRODUCT_PROFILE_ID),
    area_m2: explicit(40, "m2"),
    selected_primer_product: explicit("Ceresit CT 17 Profi"),
    ct17_paint_substrate_type: explicit("plaster"),
    ct17_paint_substrate_evenness: explicit("even"),
    ct17_paint_substrate_absorbency: explicit("absorbent"),
    ct17_paint_selected_consumption_l_m2: explicit(0.18, "l_per_m2"),
    ct17_paint_dilution_ratio: explicit("water_1_to_1"),
    ct17_paint_coat_count: explicit(1, "item"),
    ct17_paint_substrate_dry_load_bearing_clean_confirmed: explicit(true),
    ct17_paint_complete_drying_confirmed: explicit(true),
    ct17_paint_application_conditions_confirmed: explicit(true),
    ct17_paint_application_temperature_c: explicit(20, "celsius"),
    ct17_paint_relative_humidity_percent: explicit(60, "percent"),
    ct17_paint_selected_container_size_l: explicit(5, "l"),
    ct17_paint_additional_waste_not_published_confirmed: explicit(true),
    ct17_paint_tds_confirmed: explicit(true),
    ct17_paint_tds_reference: explicit("TDS No CT17 Profi 03.24, pages 1-2"),
    ct17_paint_material_certificate_reference: explicit("PROJECT-CERESIT-CT17-PAINT-BATCH-CERT-001"),
    selected_paint_product: explicit("Ceresit CT 54 Silicate Aero"),
    ct54_coat_count: explicit(2, "item"),
    ct54_substrate_type: explicit("cement_plaster"),
    ct54_substrate_absorption: explicit("normal"),
    ct54_substrate_smoothness: explicit("smooth"),
    ct54_substrate_carrying_smooth_dry_clean_confirmed: explicit(true),
    ct54_installation_location: explicit("indoor"),
    ct54_intercoat_break_hours: explicit(12, "hour"),
    ct54_application_conditions_confirmed: explicit(true),
    ct54_application_temperature_c: explicit(20, "celsius"),
    ct54_relative_humidity_percent: explicit(60, "percent"),
    ct54_facade_rain_protection_confirmed: explicit(false),
    ct54_tds_variant_confirmed: explicit(true),
    ct54_project_average_rate_confirmed: explicit(true),
    ct54_selected_container_size_l: explicit(3.5, "l"),
    ct54_additional_waste_not_published_confirmed: explicit(true),
    ct54_tds_reference: explicit("C_CT54_TDS_1_0819, pages 1-2"),
    ct54_material_certificate_reference: explicit("PROJECT-CERESIT-CT54-BATCH-CERT-001"),
    ...changes,
  };
}

function resolveCeresitCt54Ct17Wall(
  values: Readonly<Record<string, ProfessionalParameterValueV4>>,
) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "PAINT",
    operation_class: "PAINT",
    material_system: "PAINT",
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

function exactGerflor6086Inputs(
  changes: Readonly<Record<string, ProfessionalParameterValueV4>> = {},
): Readonly<Record<string, ProfessionalParameterValueV4>> {
  return {
    product_profile_id: explicit(GERFLOR_6086_SKIRTING_PRODUCT_PROFILE_ID),
    finished_perimeter_linear_m: explicit(55, "linear_m"),
    inside_corner_count: explicit(4, "item"),
    outside_corner_count: explicit(2, "item"),
    selected_skirting_product: explicit("Gerflor Design Skirting 6086"),
    gerflor_piece_length_m: explicit(2, "m"),
    gerflor_packaging_confirmed: explicit(true),
    gerflor_corner_cutting_method_reference: explicit("GERFLOR-6086-CORNER-CUTTING-LAYOUT-001"),
    gerflor_corner_allowance_not_assumed_confirmed: explicit(true),
    gerflor_installation_surface_prepared_plane_confirmed: explicit(true),
    gerflor_manufacturer_instruction_reference: explicit("Gerflor PMO [516V1], sections 2-3"),
    material_certificate_reference: explicit("PROJECT-GERFLOR-6086-BATCH-CERT-001"),
    ...changes,
  };
}

function resolveGerflor6086(values: Readonly<Record<string, ProfessionalParameterValueV4>>) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "BASEBOARD",
    operation_class: "INSTALL",
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
      source_document_version: "2026.09-uponor-ufh-pipe-spacing-r2",
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
    expect(resolve(exactUponorInputs({
      zone_area_m2: explicit(10.25, "m2"),
      feed_tail_length_linear_m: explicit(0.1, "m"),
    }))).toMatchObject({
      status: "APPLIED",
      calculated_pipe_length_m: 68.775,
      parameter_values: {
        circuit_length_m: { value: 68.775, unit_id: "m" },
      },
    });
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
    expect(resolveLindab(exactLindabInputs({ duct_diameter_mm: explicit(300, "mm") }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      source_id: LINDAB_VSR_SOURCE_ID,
      blockers: [`PHYSICAL_NORM_NOT_APPLICABLE:${LINDAB_VSR_NORM_ID}:duct_diameter_mm=300`],
    });
    expect(resolveLindab(exactLindabInputs({ cooled_supply_air_confirmed: explicit(false) }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      source_id: LINDAB_VSR_SOURCE_ID,
      blockers: [`PHYSICAL_NORM_NOT_APPLICABLE:${LINDAB_VSR_NORM_ID}:cooled_supply_air_confirmed=false`],
    });
    expect(resolveLindab(exactLindabInputs({ route_length_m: explicit(0.5, "m") }))).toMatchObject({
      status: "APPLIED",
      calculated_resource_quantity_m: 0.5,
      parameter_values: { procurement_factor: { value: 1 } },
    });
  });

  test("preserves the exact Lindab route quantity without treating maximum section length as packaging", () => {
    const input = exactLindabInputs();
    const result = resolveLindab(input);

    expect(result).toMatchObject({
      status: "APPLIED",
      source_id: LINDAB_VSR_SOURCE_ID,
      source_document_version: "2026.09-lindab-vsr-exact-sizes-r2",
      source_definition_hash: LINDAB_VSR_SOURCE_METADATA.definition_hash,
      calculated_resource_quantity_m: 10,
      produced_parameter_ids: ["primary_resource_units_per_output", "procurement_factor"],
    });
    expect(result.parameter_values.route_length_m).toBe(input.route_length_m);
    expect(result.parameter_values.primary_resource_units_per_output).toMatchObject({
      value: 1,
      source_type: "APPLICABLE_NORM",
      source_id: LINDAB_VSR_SOURCE_ID,
    });
    expect(result.parameter_values.procurement_factor).toMatchObject({
      value: 1,
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
    expect(resourceRow).toMatchObject({ quantity: 10, unit: "m" });
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
      calculated_resource_quantity_m: 10,
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
      source_document_version: "2026.09-daikin-3mxs-k-additional-charge-r2",
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
    expect(resolveDaikin(exactDaikinInputs({
      total_refrigerant_piping_length_m: explicit(45.25, "m"),
    }))).toMatchObject({
      status: "APPLIED",
      calculated_additional_refrigerant_kg: 0.305,
      parameter_values: {
        manufacturer_charge_kg: { value: 0.305, unit_id: "kg" },
      },
    });
    expect(DAIKIN_3MXS_K_SOURCE_METADATA).toMatchObject({
      maximum_total_piping_length_m: 50,
      maximum_piping_to_each_indoor_unit_m: 25,
      maximum_outdoor_to_indoor_height_difference_m: 15,
      maximum_indoor_to_indoor_height_difference_m: 7.5,
    });
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
    expect(resolveKnaufD112(exactKnaufD112Inputs({ load_class_kn_m2: explicit(0.2, "kn_per_m2") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        source_id: KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_ID,
        blockers: [
          `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_SUBSTRUCTURE_ANCHOR_NORM_ID}:load_class_kn_m2=0.2`,
        ],
      });
    expect(resolveKnaufD112(exactKnaufD112Inputs({ ceiling_hanger_spacing_m: explicit(0.96, "m") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: [
          `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_SUBSTRUCTURE_ANCHOR_NORM_ID}:ceiling_hanger_spacing_m=0.96`,
        ],
      });
    expect(resolveKnaufD112(exactKnaufD112Inputs({ substructure_anchor_approved: explicit(false) })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        blockers: [
          `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_SUBSTRUCTURE_ANCHOR_NORM_ID}:substructure_anchor_approved=false`,
        ],
      });
    expect(resolveKnaufD112(exactKnaufD112Inputs({
      quantity_slab_hanger_anchors: explicit(119, "item"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        "PHYSICAL_NORM_VALUE_CONFLICT:quantity_slab_hanger_anchors=119:norm_value=120",
      ],
    });
    expect(resolveKnaufD112(exactKnaufD112Inputs({ perimeter_m: explicit(39, "m") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        source_id: KNAUF_D112_UD_RUNNER_SOURCE_ID,
        blockers: [
          "PHYSICAL_NORM_PROJECT_PERIMETER_CONFLICT:perimeter_m=39:geometry_perimeter_m=40",
          "PHYSICAL_NORM_REFERENCE_RATE_PERIMETER_CONFLICT:perimeter_m=39:norm_value=40",
        ],
      });
    expect(resolveKnaufD112(exactKnaufD112Inputs({
      selected_profile_piece_length_m: explicit(4, "m"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_PACKAGE_NOT_APPLICABLE:selected_profile_piece_length_m=4"],
    });
    expect(resolveKnaufD112(exactKnaufD112Inputs({
      quantity_perimeter_track: explicit(40, "m"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_VALUE_CONFLICT:quantity_perimeter_track=40:norm_value=42"],
    });
  });

  test("binds all three Knauf FRAME quantities only to the exact 10 m by 10 m reference ceiling", () => {
    const input = exactKnaufD112Inputs();
    const first = resolveKnaufD112(input);
    const second = resolveKnaufD112(input);

    expect(first).toMatchObject({
      status: "APPLIED",
      source_id: KNAUF_D112_WALL_FASTENER_SOURCE_ID,
      norm_id: KNAUF_D112_WALL_FASTENER_NORM_ID,
      source_document_version: "2026.09-knauf-d11-d112-primary-review-r2",
      source_definition_hash: KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.definition_hash,
      source_ids: [
        KNAUF_D112_WALL_FASTENER_SOURCE_ID,
        KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_ID,
        KNAUF_D112_UD_RUNNER_SOURCE_ID,
      ],
      norm_ids: [
        KNAUF_D112_WALL_FASTENER_NORM_ID,
        KNAUF_D112_SUBSTRUCTURE_ANCHOR_NORM_ID,
        KNAUF_D112_UD_RUNNER_NORM_ID,
      ],
      calculated_wall_fastener_quantity_piece: 40,
      calculated_substructure_anchor_quantity_piece: 120,
      calculated_d112_ud_runner_net_quantity_m: 40,
      calculated_d112_ud_runner_procurement_quantity_m: 42,
      calculated_d112_ud_runner_piece_count: 14,
      produced_parameter_ids: [
        "quantity_perimeter_track_anchors",
        "quantity_slab_hanger_anchors",
        "quantity_perimeter_track",
      ],
      blockers: [],
    });
    expect(first.parameter_values.quantity_perimeter_track_anchors).toMatchObject({
      value: 40,
      unit_id: "item",
      source_type: "APPLICABLE_NORM",
      source_id: KNAUF_D112_WALL_FASTENER_SOURCE_ID,
    });
    expect(first.parameter_values.quantity_slab_hanger_anchors).toMatchObject({
      value: 120,
      unit_id: "item",
      source_type: "APPLICABLE_NORM",
      source_id: KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_ID,
    });
    expect(first.parameter_values.quantity_perimeter_track).toMatchObject({
      value: 42,
      unit_id: "m",
      source_type: "APPLICABLE_NORM",
      source_id: KNAUF_D112_UD_RUNNER_SOURCE_ID,
    });
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
    expect(input.quantity_perimeter_track_anchors).toBeUndefined();
    expect(input.quantity_slab_hanger_anchors).toBeUndefined();
    expect(input.quantity_perimeter_track).toBeUndefined();
  });

  test("routes all three Knauf FRAME norms only to their canonical BOQ rows", () => {
    const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) =>
      row.work_key === FLAT_CEILING_FRAME_WORK_KEY);
    if (!inventory) throw new Error("KNAUF_D112_RUNTIME_FRAME_WORK_MISSING");
    const technology = interiorFinishesDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
    const schema = interiorFinishesDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
    if (!technology || !schema) throw new Error("KNAUF_D112_RUNTIME_SCHEMA_MISSING");
    const knaufValue = (parameter: Parameters<typeof validOverrideValue>[0]) => {
      if (parameter.parameter_id === "product_profile_id") return KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID;
      if (parameter.parameter_id === "system_passport_reference") return "Knauf D11, D112 variant 1, page 28";
      if (parameter.parameter_id === "material_certificate_reference") return "PROJECT-KNAUF-D112-BATCH-CERT-001";
      if (parameter.parameter_id === "area_m2") return 100;
      if (parameter.parameter_id === "length_m" || parameter.parameter_id === "width_m") return 10;
      if (parameter.parameter_id === "perimeter_m") return 40;
      if (parameter.parameter_id === "system_variant") return "standard_12_5_mm_single_layer";
      if (parameter.parameter_id === "substrate_type") return "Железобетон C25/30";
      if (parameter.parameter_id === "substrate_fastener_reference") return "Анкер по паспорту проекта КР-17";
      if (parameter.parameter_id === "substrate_fastener_approved") return true;
      if (parameter.parameter_id === "ceiling_perimeter_anchor_spacing_m") return 1;
      if (parameter.parameter_id === "ceiling_primary_profile_spacing_m") return 1;
      if (parameter.parameter_id === "ceiling_secondary_profile_spacing_m") return 0.5;
      if (parameter.parameter_id === "ceiling_hanger_spacing_m") return 0.95;
      if (parameter.parameter_id === "load_class_kn_m2") return 0.15;
      if (parameter.parameter_id === "substructure_anchor_reference") return "Анкер подвеса по паспорту проекта КР-18";
      if (parameter.parameter_id === "substructure_anchor_approved") return true;
      if (parameter.parameter_id === "d112_substructure_manufacturer_excludes_loss_and_waste_confirmed") return true;
      if (parameter.parameter_id === "selected_profile_piece_length_m") return 3;
      if (parameter.parameter_id === "current_regional_system_approval") return "KG-D112-SYSTEM-APPROVAL-2026-01";
      if (parameter.parameter_id === "d112_ud_runner_manufacturer_excludes_loss_and_waste_confirmed") return true;
      return validOverrideValue(parameter);
    };
    const paramOverrides = Object.fromEntries(schema.parameters
      .filter((parameter) => ![
        "quantity_perimeter_track_anchors",
        "quantity_slab_hanger_anchors",
        "quantity_perimeter_track",
      ].includes(parameter.parameter_id))
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
    expect(result.production?.compile_result.normative_resolution.applicable_sources.map((source) => source.source_id))
      .toContain(KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_ID);
    expect(result.production?.compile_result.normative_resolution.applicable_sources.map((source) => source.source_id))
      .toContain(KNAUF_D112_UD_RUNNER_SOURCE_ID);
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
    const substructureAnchorRow = result.production?.draft?.items.find((row) =>
      row.sourceParameters?.rowCode === `${inventory.catalog_id}:drywall-flat-ceiling-v6:row:slab_hanger_anchors`);
    expect(substructureAnchorRow).toMatchObject({ quantity: 120, unit: "item" });
    expect(substructureAnchorRow?.sourceParameters?.normativeSourceIds)
      .toContain(KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_ID);
    expect(substructureAnchorRow?.sourceParameters?.parameterSourceIds)
      .toContain(KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_ID);
    expect(substructureAnchorRow?.sourceParameters?.professionalPhysicalNormApplicabilityV1)
      .toMatchObject({
        source_ids: [
          KNAUF_D112_WALL_FASTENER_SOURCE_ID,
          KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_ID,
          KNAUF_D112_UD_RUNNER_SOURCE_ID,
        ],
        calculated_substructure_anchor_quantity_piece: 120,
      });
    const udRunnerRow = result.production?.draft?.items.find((row) =>
      row.sourceParameters?.rowCode ===
        `${inventory.catalog_id}:drywall-flat-ceiling-v6:row:perimeter_track`);
    expect(udRunnerRow).toMatchObject({ quantity: 42, unit: "m" });
    expect(udRunnerRow?.sourceParameters?.normativeSourceIds).toContain(KNAUF_D112_UD_RUNNER_SOURCE_ID);
    expect(udRunnerRow?.sourceParameters?.parameterSourceIds).toContain(KNAUF_D112_UD_RUNNER_SOURCE_ID);
    expect(udRunnerRow?.sourceParameters?.professionalPhysicalNormApplicabilityV1).toMatchObject({
      source_ids: [
        KNAUF_D112_WALL_FASTENER_SOURCE_ID,
        KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_ID,
        KNAUF_D112_UD_RUNNER_SOURCE_ID,
      ],
      calculated_d112_ud_runner_net_quantity_m: 40,
      calculated_d112_ud_runner_procurement_quantity_m: 42,
      calculated_d112_ud_runner_piece_count: 14,
    });
    expect(result.production?.draft?.items
      .filter((row) => (row.sourceParameters?.normativeSourceIds as readonly string[] | undefined)
        ?.includes(KNAUF_D112_WALL_FASTENER_SOURCE_ID)))
      .toHaveLength(1);
    expect(result.production?.draft?.items
      .filter((row) => (row.sourceParameters?.normativeSourceIds as readonly string[] | undefined)
        ?.includes(KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_ID)))
      .toHaveLength(1);
    expect(result.production?.draft?.items
      .filter((row) => (row.sourceParameters?.normativeSourceIds as readonly string[] | undefined)
        ?.includes(KNAUF_D112_UD_RUNNER_SOURCE_ID)))
      .toHaveLength(1);
    expect(constructionNormativeRegistryV1.get(KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_ID))
      .toMatchObject({
        document_code: KNAUF_D112_SUBSTRUCTURE_ANCHOR_NORM_ID,
        version: KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_METADATA.source_document_version,
        operation_class_applicability: ["FRAME"],
      });
    expect(constructionNormativeRegistryV1.get(KNAUF_D112_UD_RUNNER_SOURCE_ID))
      .toMatchObject({
        document_code: KNAUF_D112_UD_RUNNER_NORM_ID,
        version: KNAUF_D112_UD_RUNNER_SOURCE_METADATA.source_document_version,
        operation_class_applicability: ["FRAME"],
      });
  });

  test("keeps the D112 TN25 rate closed outside the exact single-layer 12.5 mm system", () => {
    const { board_thickness_mm: _omitted, ...withoutThickness } = exactKnaufD112Tn25Inputs();
    expect(resolveKnaufD112Tn25(withoutThickness)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      source_id: KNAUF_D112_TN25_SCREW_SOURCE_ID,
      blockers: ["PROJECT_VALUE_REQUIRED_EXPLICIT:board_thickness_mm"],
    });
    expect(resolveKnaufD112Tn25(exactKnaufD112Tn25Inputs({
      board_layer_count: explicit(2, "item"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_TN25_SCREW_NORM_ID}:board_layer_count=2`,
      ],
    });
    expect(resolveKnaufD112Tn25(exactKnaufD112Tn25Inputs({
      board_thickness_mm: explicit(9.5, "mm"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_TN25_SCREW_NORM_ID}:board_thickness_mm=9.5`,
      ],
    });
    expect(resolveKnaufD112Tn25(exactKnaufD112Tn25Inputs({
      quantity_first_layer_screws: explicit(500, "item"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        "PHYSICAL_NORM_VALUE_CONFLICT:quantity_first_layer_screws=500:norm_value=1700",
      ],
    });
    expect(resolveKnaufD112Tn25(exactKnaufD112Tn25Inputs({
      length_m: explicit(12, "m"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        "PHYSICAL_NORM_REFERENCE_GEOMETRY_NOT_APPLICABLE:length_m=12:width_m=10:area_m2=100",
      ],
    });
    expect(resolveKnaufD112Tn25(exactKnaufD112Tn25Inputs({ board_type: explicit("GKF") })))
      .toMatchObject({
        status: "BLOCKED_NOT_APPLICABLE",
        source_id: KNAUF_D112_BOARD_SOURCE_ID,
        blockers: [
          `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_BOARD_NORM_ID}:board_type=GKF`,
        ],
      });
    expect(resolveKnaufD112Tn25(exactKnaufD112Tn25Inputs({
      selected_board_layout_piece_count: explicit(33, "item"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        "PHYSICAL_NORM_BOARD_LAYOUT_UNDERSIZED:selected_board_layout_piece_count=33:minimum_piece_count=34",
      ],
    });
    expect(resolveKnaufD112Tn25(exactKnaufD112Tn25Inputs({
      d112_board_manufacturer_excludes_loss_and_waste_confirmed: explicit(false),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_BOARD_NORM_ID}:d112_board_manufacturer_excludes_loss_and_waste_confirmed=false`,
      ],
    });
    expect(resolveKnaufD112Tn25(exactKnaufD112Tn25Inputs({
      quantity_first_layer_gypsum_board: explicit(100, "m2"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        "PHYSICAL_NORM_VALUE_CONFLICT:quantity_first_layer_gypsum_board=100:norm_value=102",
      ],
    });
  });

  test("derives deterministic D112 TN25 screws and board layout only for the explicit reference ceiling", () => {
    const input = exactKnaufD112Tn25Inputs();
    const first = resolveKnaufD112Tn25(input);
    const second = resolveKnaufD112Tn25(input);

    expect(first).toMatchObject({
      status: "APPLIED",
      source_id: KNAUF_D112_TN25_SCREW_SOURCE_ID,
      norm_id: KNAUF_D112_TN25_SCREW_NORM_ID,
      source_document_version: "2026.09-knauf-d11-d112-primary-review-r2",
      source_definition_hash: KNAUF_D112_TN25_SCREW_SOURCE_METADATA.definition_hash,
      source_ids: [KNAUF_D112_TN25_SCREW_SOURCE_ID, KNAUF_D112_BOARD_SOURCE_ID],
      norm_ids: [KNAUF_D112_TN25_SCREW_NORM_ID, KNAUF_D112_BOARD_NORM_ID],
      calculated_tn25_screw_quantity_piece: 1700,
      calculated_d112_board_net_quantity_m2: 100,
      calculated_d112_board_procurement_quantity_m2: 102,
      calculated_d112_board_piece_count: 34,
      produced_parameter_ids: [
        "quantity_first_layer_screws",
        "quantity_first_layer_gypsum_board",
      ],
      blockers: [],
    });
    expect(first.parameter_values.quantity_first_layer_screws).toMatchObject({
      value: 1700,
      unit_id: "item",
      source_type: "APPLICABLE_NORM",
      source_id: KNAUF_D112_TN25_SCREW_SOURCE_ID,
    });
    expect(first.parameter_values.quantity_first_layer_gypsum_board).toMatchObject({
      value: 102,
      unit_id: "m2",
      source_type: "APPLICABLE_NORM",
      source_id: KNAUF_D112_BOARD_SOURCE_ID,
    });
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
    expect(input.quantity_first_layer_screws).toBeUndefined();
    expect(input.quantity_first_layer_gypsum_board).toBeUndefined();
    expect(constructionNormativeRegistryV1.get(KNAUF_D112_TN25_SCREW_SOURCE_ID)).toMatchObject({
      authority: "Knauf",
      product_profile_applicability: [KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID],
      material_system_applicability: ["FLAT_CEILING"],
      operation_class_applicability: ["CLAD"],
    });
    expect(constructionNormativeRegistryV1.get(KNAUF_D112_BOARD_SOURCE_ID)).toMatchObject({
      authority: "Knauf",
      document_code: KNAUF_D112_BOARD_NORM_ID,
      version: KNAUF_D112_BOARD_SOURCE_METADATA.source_document_version,
      operation_class_applicability: ["CLAD"],
    });
  });

  test("routes D112 TN25 and board norms only to their canonical CLAD BOQ rows", () => {
    const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) =>
      row.work_key === FLAT_CEILING_CLAD_WORK_KEY);
    if (!inventory) throw new Error("KNAUF_D112_RUNTIME_CLAD_WORK_MISSING");
    const technology = interiorFinishesDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
    const schema = interiorFinishesDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
    if (!technology || !schema) throw new Error("KNAUF_D112_RUNTIME_CLAD_SCHEMA_MISSING");
    expect(schema.parameters.filter((parameter) =>
      [
        "system_variant",
        "board_thickness_mm",
        "board_type",
        "selected_board_length_mm",
        "selected_board_width_mm",
        "selected_board_layout_piece_count",
        "d112_board_layout_reference",
        "d112_board_manufacturer_excludes_loss_and_waste_confirmed",
      ].includes(parameter.parameter_id))
      .every((parameter) => parameter.required_when.kind === "EQUALS" &&
        parameter.required_when.parameter_id === "product_profile_id" &&
        parameter.required_when.value === KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID)).toBe(true);

    const knaufValue = (parameter: Parameters<typeof validOverrideValue>[0]) => {
      if (parameter.parameter_id === "product_profile_id") return KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID;
      if (parameter.parameter_id === "system_passport_reference") return "Knauf D11, D112 variant 1, page 28";
      if (parameter.parameter_id === "material_certificate_reference") return "PROJECT-KNAUF-D112-GKB-BATCH-CERT-001";
      if (parameter.parameter_id === "normative_rate_code") return "PROJECT-VERIFIED-D112-CLAD-RATE";
      if (parameter.parameter_id === "project_type") return "INTERIOR-FLAT-CEILING-D112";
      if (parameter.parameter_id === "area_m2") return 100;
      if (parameter.parameter_id === "length_m" || parameter.parameter_id === "width_m") return 10;
      if (parameter.parameter_id === "perimeter_m") return 40;
      if (parameter.parameter_id === "system_variant") return "standard_12_5_mm_single_layer";
      if (parameter.parameter_id === "board_layer_count") return 1;
      if (parameter.parameter_id === "board_thickness_mm") return 12.5;
      if (parameter.parameter_id === "board_type") return "GKB";
      if (parameter.parameter_id === "selected_board_length_mm") return 2500;
      if (parameter.parameter_id === "selected_board_width_mm") return 1200;
      if (parameter.parameter_id === "selected_board_layout_piece_count") return 34;
      if (parameter.parameter_id === "d112_board_layout_reference") return "АР-17, лист 12, раскладка потолка D112 rev.2";
      if (parameter.parameter_id === "d112_board_manufacturer_excludes_loss_and_waste_confirmed") return true;
      return validOverrideValue(parameter);
    };
    const paramOverrides = Object.fromEntries(schema.parameters
      .filter((parameter) => ![
        "quantity_first_layer_screws",
        "quantity_first_layer_gypsum_board",
      ].includes(parameter.parameter_id))
      .map((parameter) => [parameter.parameter_id, { value: knaufValue(parameter), source: "user" }]));

    const result = buildInteriorFinishesFromInlineInputV1({
      rawInput: "Обшивка плоского потолка Knauf D112 10 × 10 м, один слой 12,5 мм, TN 25",
      selectedWorkKey: FLAT_CEILING_CLAD_WORK_KEY,
      city: "Bishkek",
      currency: "KGS",
      paramOverrides,
    });

    expect(result.exact_match).toBe(true);
    expect(result.missing_parameter_ids).toEqual([]);
    expect(result.production?.compile_result.status).toBe("COMPILED");
    expect(result.production?.compile_result.normative_resolution.applicable_sources.map((source) => source.source_id))
      .toContain(KNAUF_D112_TN25_SCREW_SOURCE_ID);
    expect(result.production?.compile_result.normative_resolution.applicable_sources.map((source) => source.source_id))
      .toContain(KNAUF_D112_BOARD_SOURCE_ID);
    const screwRow = result.production?.draft?.items.find((row) =>
      row.sourceParameters?.rowCode === `${inventory.catalog_id}:drywall-flat-ceiling-v6:row:first_layer_screws`);
    expect(screwRow).toMatchObject({ quantity: 1700, unit: "item" });
    expect(screwRow?.sourceParameters?.normativeSourceIds).toContain(KNAUF_D112_TN25_SCREW_SOURCE_ID);
    expect(screwRow?.sourceParameters?.parameterSourceIds).toContain(KNAUF_D112_TN25_SCREW_SOURCE_ID);
    expect(screwRow?.sourceParameters?.professionalPhysicalNormApplicabilityV1).toMatchObject({
      source_id: KNAUF_D112_TN25_SCREW_SOURCE_ID,
      source_definition_hash: KNAUF_D112_TN25_SCREW_SOURCE_METADATA.definition_hash,
      calculated_tn25_screw_quantity_piece: 1700,
    });
    const boardRow = result.production?.draft?.items.find((row) =>
      row.sourceParameters?.rowCode ===
        `${inventory.catalog_id}:drywall-flat-ceiling-v6:row:first_layer_gypsum_board`);
    expect(boardRow).toMatchObject({ quantity: 102, unit: "m2" });
    expect(boardRow?.sourceParameters?.normativeSourceIds).toContain(KNAUF_D112_BOARD_SOURCE_ID);
    expect(boardRow?.sourceParameters?.parameterSourceIds).toContain(KNAUF_D112_BOARD_SOURCE_ID);
    expect(boardRow?.sourceParameters?.professionalPhysicalNormApplicabilityV1).toMatchObject({
      source_ids: [KNAUF_D112_TN25_SCREW_SOURCE_ID, KNAUF_D112_BOARD_SOURCE_ID],
      calculated_d112_board_net_quantity_m2: 100,
      calculated_d112_board_procurement_quantity_m2: 102,
      calculated_d112_board_piece_count: 34,
    });
    expect(result.production?.draft?.items.filter((row) =>
      (row.sourceParameters?.normativeSourceIds as readonly string[] | undefined)
        ?.includes(KNAUF_D112_TN25_SCREW_SOURCE_ID))).toHaveLength(1);
    expect(result.production?.draft?.items.filter((row) =>
      (row.sourceParameters?.normativeSourceIds as readonly string[] | undefined)
        ?.includes(KNAUF_D112_BOARD_SOURCE_ID))).toHaveLength(1);
  });

  test("keeps D112 Uniflott closed outside hand filling and a documented bag", () => {
    const { joint_filling_method: _omitted, ...withoutMethod } = exactKnaufD112UniflottInputs();
    expect(resolveKnaufD112Uniflott(withoutMethod)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      source_id: KNAUF_D112_UNIFLOTT_SOURCE_ID,
      blockers: ["PROJECT_VALUE_REQUIRED_EXPLICIT:joint_filling_method"],
    });
    expect(resolveKnaufD112Uniflott(exactKnaufD112UniflottInputs({
      system_variant: explicit("double_layer"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_UNIFLOTT_NORM_ID}:system_variant=double_layer`,
      ],
    });
    expect(resolveKnaufD112Uniflott(exactKnaufD112UniflottInputs({
      joint_filling_method: explicit("machine"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_UNIFLOTT_NORM_ID}:joint_filling_method=machine`,
      ],
    });
    expect(resolveKnaufD112Uniflott(exactKnaufD112UniflottInputs({
      d112_uniflott_selected_bag_size_kg: explicit(10, "kg"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_PACKAGE_NOT_APPLICABLE:d112_uniflott_selected_bag_size_kg=10"],
    });
    expect(resolveKnaufD112Uniflott(exactKnaufD112UniflottInputs({
      d112_manufacturer_excludes_loss_and_waste_confirmed: explicit(false),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_UNIFLOTT_NORM_ID}:d112_manufacturer_excludes_loss_and_waste_confirmed=false`,
      ],
    });
    expect(resolveKnaufD112Uniflott(exactKnaufD112UniflottInputs({
      quantity_base_joint_compound: explicit(15.9, "kg"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_VALUE_CONFLICT:quantity_base_joint_compound=15.9:norm_value=20"],
    });
    expect(resolveKnaufD112Uniflott(exactKnaufD112UniflottInputs({
      cut_edge_jointing_required: explicit(false),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      source_id: KNAUF_D112_JOINT_TAPE_SOURCE_ID,
      blockers: [
        `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_JOINT_TAPE_NORM_ID}:cut_edge_jointing_required=false`,
      ],
    });
    expect(resolveKnaufD112Uniflott(exactKnaufD112UniflottInputs({
      selected_joint_tape_roll_length_m: explicit(0, "m"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PROJECT_VALUE_INVALID:selected_joint_tape_roll_length_m"],
    });
    expect(resolveKnaufD112Uniflott(exactKnaufD112UniflottInputs({
      d112_joint_tape_manufacturer_excludes_loss_and_waste_confirmed: explicit(false),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_JOINT_TAPE_NORM_ID}:d112_joint_tape_manufacturer_excludes_loss_and_waste_confirmed=false`,
      ],
    });
    expect(resolveKnaufD112Uniflott(exactKnaufD112UniflottInputs({
      quantity_paper_joint_tape: explicit(23.85, "m"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_VALUE_CONFLICT:quantity_paper_joint_tape=23.85:norm_value=75"],
    });
  });

  test("derives deterministic D112 Uniflott and cut-edge tape procurement", () => {
    const input = exactKnaufD112UniflottInputs();
    const first = resolveKnaufD112Uniflott(input);
    const second = resolveKnaufD112Uniflott(input);

    expect(first).toMatchObject({
      status: "APPLIED",
      source_id: KNAUF_D112_UNIFLOTT_SOURCE_ID,
      norm_id: KNAUF_D112_UNIFLOTT_NORM_ID,
      source_document_version: "2026.09-knauf-d11-d112-primary-review-r2",
      source_definition_hash: KNAUF_D112_UNIFLOTT_SOURCE_METADATA.definition_hash,
      source_ids: [KNAUF_D112_UNIFLOTT_SOURCE_ID, KNAUF_D112_JOINT_TAPE_SOURCE_ID],
      norm_ids: [KNAUF_D112_UNIFLOTT_NORM_ID, KNAUF_D112_JOINT_TAPE_NORM_ID],
      calculated_uniflott_net_quantity_kg: 15.9,
      calculated_uniflott_procurement_quantity_kg: 20,
      calculated_d112_joint_tape_net_quantity_m: 23.85,
      calculated_d112_joint_tape_procurement_quantity_m: 75,
      calculated_d112_joint_tape_roll_count: 1,
      produced_parameter_ids: ["quantity_base_joint_compound", "quantity_paper_joint_tape"],
      blockers: [],
    });
    expect(first.parameter_values.quantity_base_joint_compound).toMatchObject({
      value: 20,
      unit_id: "kg",
      source_type: "APPLICABLE_NORM",
      source_id: KNAUF_D112_UNIFLOTT_SOURCE_ID,
    });
    expect(first.parameter_values.quantity_paper_joint_tape).toMatchObject({
      value: 75,
      unit_id: "m",
      source_type: "APPLICABLE_NORM",
      source_id: KNAUF_D112_JOINT_TAPE_SOURCE_ID,
    });
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
    expect(input.quantity_base_joint_compound).toBeUndefined();
    expect(input.quantity_paper_joint_tape).toBeUndefined();
    expect(constructionNormativeRegistryV1.get(KNAUF_D112_UNIFLOTT_SOURCE_ID)).toMatchObject({
      authority: "Knauf",
      product_profile_applicability: [KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID],
      material_system_applicability: ["FLAT_CEILING"],
      operation_class_applicability: ["FINISH_JOINT"],
    });
    expect(constructionNormativeRegistryV1.get(KNAUF_D112_JOINT_TAPE_SOURCE_ID)).toMatchObject({
      authority: "Knauf",
      document_code: KNAUF_D112_JOINT_TAPE_NORM_ID,
      version: KNAUF_D112_JOINT_TAPE_SOURCE_METADATA.source_document_version,
      operation_class_applicability: ["FINISH_JOINT"],
    });
  });

  test("routes D112 Uniflott and cut-edge tape only to their canonical BOQ rows", () => {
    const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) =>
      row.work_key === FLAT_CEILING_FINISH_JOINT_WORK_KEY);
    if (!inventory) throw new Error("KNAUF_D112_UNIFLOTT_RUNTIME_WORK_MISSING");
    const technology = interiorFinishesDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
    const schema = interiorFinishesDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
    if (!technology || !schema) throw new Error("KNAUF_D112_UNIFLOTT_RUNTIME_SCHEMA_MISSING");
    const uniflottParameterIds = [
      "system_variant",
      "joint_filling_method",
      "d112_uniflott_selected_bag_size_kg",
      "d112_manufacturer_excludes_loss_and_waste_confirmed",
      "cut_edge_jointing_required",
      "selected_joint_tape_roll_length_m",
      "selected_joint_tape_reference",
      "d112_cut_edge_joint_layout_reference",
      "d112_joint_tape_manufacturer_excludes_loss_and_waste_confirmed",
    ];
    expect(schema.parameters.filter((parameter) => uniflottParameterIds.includes(parameter.parameter_id)))
      .toHaveLength(uniflottParameterIds.length);
    expect(schema.parameters.filter((parameter) => uniflottParameterIds.includes(parameter.parameter_id))
      .every((parameter) => parameter.required_when.kind === "EQUALS" &&
        parameter.required_when.parameter_id === "product_profile_id" &&
        parameter.required_when.value === KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID)).toBe(true);

    const uniflottValue = (parameter: Parameters<typeof validOverrideValue>[0]) => {
      if (parameter.parameter_id === "product_profile_id") return KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID;
      if (parameter.parameter_id === "area_m2") return 53;
      if (parameter.parameter_id === "length_m") return 53;
      if (parameter.parameter_id === "width_m") return 1;
      if (parameter.parameter_id === "perimeter_m") return 108;
      if (parameter.parameter_id === "system_variant") return "standard_12_5_mm_single_layer";
      if (parameter.parameter_id === "joint_filling_method") return "hand";
      if (parameter.parameter_id === "d112_uniflott_selected_bag_size_kg") return "5";
      if (parameter.parameter_id === "d112_manufacturer_excludes_loss_and_waste_confirmed") return true;
      if (parameter.parameter_id === "cut_edge_jointing_required") return true;
      if (parameter.parameter_id === "selected_joint_tape_roll_length_m") return 75;
      if (parameter.parameter_id === "selected_joint_tape_reference") {
        return "Knauf joint tape, 75 m roll, batch KT-001";
      }
      if (parameter.parameter_id === "d112_cut_edge_joint_layout_reference") {
        return "АР-17, лист 13, карта резаных кромок rev.2";
      }
      if (parameter.parameter_id === "d112_joint_tape_manufacturer_excludes_loss_and_waste_confirmed") {
        return true;
      }
      if (parameter.parameter_id === "system_passport_reference") {
        return "Knauf D11, D112 variant 1, page 28, Uniflott";
      }
      if (parameter.parameter_id === "material_certificate_reference") {
        return "PROJECT-KNAUF-UNIFLOTT-BATCH-CERT-001";
      }
      if (parameter.parameter_id === "normative_rate_code") return "PROJECT-VERIFIED-D112-UNIFLOTT-RATE";
      return validOverrideValue(parameter);
    };
    const paramOverrides = Object.fromEntries(schema.parameters
      .filter((parameter) => ![
        "quantity_base_joint_compound",
        "quantity_paper_joint_tape",
      ].includes(parameter.parameter_id))
      .map((parameter) => [parameter.parameter_id, {
        value: uniflottValue(parameter),
        source: "user",
      }]));

    const result = buildInteriorFinishesFromInlineInputV1({
      rawInput: "Заделка швов потолка Knauf D112 составом Uniflott вручную, площадь 53 м²",
      selectedWorkKey: FLAT_CEILING_FINISH_JOINT_WORK_KEY,
      city: "Bishkek",
      currency: "KGS",
      paramOverrides,
    });

    expect(result.exact_match).toBe(true);
    expect(result.missing_parameter_ids).toEqual([]);
    expect(result.production?.compile_result.status).toBe("COMPILED");
    expect(result.production?.compile_result.normative_resolution.applicable_sources.map((source) => source.source_id))
      .toContain(KNAUF_D112_UNIFLOTT_SOURCE_ID);
    expect(result.production?.compile_result.normative_resolution.applicable_sources.map((source) => source.source_id))
      .toContain(KNAUF_D112_JOINT_TAPE_SOURCE_ID);
    const compoundRow = result.production?.draft?.items.find((row) =>
      row.sourceParameters?.rowCode === `${inventory.catalog_id}:drywall-flat-ceiling-v6:row:base_joint_compound`);
    expect(compoundRow).toMatchObject({ quantity: 20, unit: "kg" });
    expect(compoundRow?.sourceParameters?.normativeSourceIds).toContain(KNAUF_D112_UNIFLOTT_SOURCE_ID);
    expect(compoundRow?.sourceParameters?.parameterSourceIds).toContain(KNAUF_D112_UNIFLOTT_SOURCE_ID);
    expect(compoundRow?.sourceParameters?.professionalPhysicalNormApplicabilityV1).toMatchObject({
      source_id: KNAUF_D112_UNIFLOTT_SOURCE_ID,
      source_definition_hash: KNAUF_D112_UNIFLOTT_SOURCE_METADATA.definition_hash,
      calculated_uniflott_net_quantity_kg: 15.9,
      calculated_uniflott_procurement_quantity_kg: 20,
    });
    const jointTapeRow = result.production?.draft?.items.find((row) =>
      row.sourceParameters?.rowCode ===
        `${inventory.catalog_id}:drywall-flat-ceiling-v6:row:paper_joint_tape`);
    expect(jointTapeRow).toMatchObject({ quantity: 75, unit: "m" });
    expect(jointTapeRow?.sourceParameters?.normativeSourceIds).toContain(KNAUF_D112_JOINT_TAPE_SOURCE_ID);
    expect(jointTapeRow?.sourceParameters?.parameterSourceIds).toContain(KNAUF_D112_JOINT_TAPE_SOURCE_ID);
    expect(jointTapeRow?.sourceParameters?.professionalPhysicalNormApplicabilityV1).toMatchObject({
      source_ids: [KNAUF_D112_UNIFLOTT_SOURCE_ID, KNAUF_D112_JOINT_TAPE_SOURCE_ID],
      calculated_d112_joint_tape_net_quantity_m: 23.85,
      calculated_d112_joint_tape_procurement_quantity_m: 75,
      calculated_d112_joint_tape_roll_count: 1,
    });
    expect(result.production?.draft?.items.filter((row) =>
      (row.sourceParameters?.normativeSourceIds as readonly string[] | undefined)
        ?.includes(KNAUF_D112_UNIFLOTT_SOURCE_ID))).toHaveLength(1);
    expect(result.production?.draft?.items.filter((row) =>
      (row.sourceParameters?.normativeSourceIds as readonly string[] | undefined)
        ?.includes(KNAUF_D112_JOINT_TAPE_SOURCE_ID))).toHaveLength(1);
  });

  test("keeps the Knauf Fugenfueller jointing cell closed unless every exact TDS fact is explicit", () => {
    const { selected_consumption_kg_m2: _omitted, ...withoutExactCell } =
      exactKnaufFugenfuellerJointingInputs();
    expect(resolveKnaufFugenfuellerJointing(withoutExactCell)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      source_id: KNAUF_FUGENFUELLER_JOINTING_SOURCE_ID,
      blockers: ["PROJECT_VALUE_REQUIRED_EXPLICIT:selected_consumption_kg_m2"],
    });
    expect(resolveKnaufFugenfuellerJointing(exactKnaufFugenfuellerJointingInputs({
      construction_application: explicit("wall"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_FUGENFUELLER_JOINTING_NORM_ID}:construction_application=wall`,
      ],
    });
    expect(resolveKnaufFugenfuellerJointing(exactKnaufFugenfuellerJointingInputs({
      board_thickness_mm: explicit(15, "mm"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_FUGENFUELLER_JOINTING_NORM_ID}:board_thickness_mm=15`,
      ],
    });
    expect(resolveKnaufFugenfuellerJointing(exactKnaufFugenfuellerJointingInputs({
      jointing_without_perimeter_confirmed: explicit(false),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_FUGENFUELLER_JOINTING_NORM_ID}:jointing_without_perimeter_confirmed=false`,
      ],
    });
    expect(resolveKnaufFugenfuellerJointing(exactKnaufFugenfuellerJointingInputs({
      reinforcement_tape_confirmed: explicit(false),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_FUGENFUELLER_JOINTING_NORM_ID}:reinforcement_tape_confirmed=false`,
      ],
    });
    expect(resolveKnaufFugenfuellerJointing(exactKnaufFugenfuellerJointingInputs({
      selected_bag_size_kg: explicit(20, "kg"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_PACKAGE_NOT_APPLICABLE:selected_bag_size_kg=20"],
    });
    expect(resolveKnaufFugenfuellerJointing(exactKnaufFugenfuellerJointingInputs({
      quantity_base_joint_compound: explicit(15.9, "kg"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        "PHYSICAL_NORM_VALUE_CONFLICT:quantity_base_joint_compound=15.9:norm_value=20",
      ],
    });
  });

  test("derives deterministic Knauf Fugenfueller jointing procurement from the exact ceiling table cell", () => {
    const input = exactKnaufFugenfuellerJointingInputs();
    const first = resolveKnaufFugenfuellerJointing(input);
    const second = resolveKnaufFugenfuellerJointing(input);

    expect(first).toMatchObject({
      status: "APPLIED",
      source_id: KNAUF_FUGENFUELLER_JOINTING_SOURCE_ID,
      norm_id: KNAUF_FUGENFUELLER_JOINTING_NORM_ID,
      source_document_version: "2026.09-knauf-k462-primary-review-r2",
      source_definition_hash: KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA.definition_hash,
      calculated_fugenfueller_jointing_net_quantity_kg: 15.9,
      calculated_fugenfueller_jointing_procurement_quantity_kg: 20,
      produced_parameter_ids: ["quantity_base_joint_compound"],
      blockers: [],
    });
    expect(first.parameter_values.quantity_base_joint_compound?.applicability)
      .toContain("exact_table_cell=single_12_5_mm_knauf_hrak__ceiling");
    expect(first.parameter_values.quantity_base_joint_compound).toMatchObject({
      value: 20,
      unit_id: "kg",
      source_type: "APPLICABLE_NORM",
      source_id: KNAUF_FUGENFUELLER_JOINTING_SOURCE_ID,
    });
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
    expect(input.quantity_base_joint_compound).toBeUndefined();
    expect(constructionNormativeRegistryV1.get(KNAUF_FUGENFUELLER_JOINTING_SOURCE_ID)).toMatchObject({
      authority: "Knauf",
      product_profile_applicability: [KNAUF_FUGENFUELLER_JOINTING_PRODUCT_PROFILE_ID],
      material_system_applicability: ["FLAT_CEILING"],
      operation_class_applicability: ["FINISH_JOINT"],
    });
  });

  test("routes Knauf Fugenfueller jointing only to the canonical base-compound BOQ row", () => {
    const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) =>
      row.work_key === FLAT_CEILING_FINISH_JOINT_WORK_KEY);
    if (!inventory) throw new Error("KNAUF_FUGENFUELLER_JOINTING_RUNTIME_WORK_MISSING");
    const technology = interiorFinishesDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
    const schema = interiorFinishesDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
    if (!technology || !schema) throw new Error("KNAUF_FUGENFUELLER_JOINTING_RUNTIME_SCHEMA_MISSING");
    const profileParameterIds = [
      "board_product_type",
      "board_thickness_mm",
      "board_layer_configuration",
      "long_edge_type",
      "construction_application",
      "jointing_without_perimeter_confirmed",
      "reinforcement_tape_confirmed",
      "selected_consumption_kg_m2",
      "substrate_and_application_conditions_confirmed",
      "selected_bag_size_kg",
    ];
    expect(schema.parameters.filter((parameter) => profileParameterIds.includes(parameter.parameter_id)))
      .toHaveLength(profileParameterIds.length);
    expect(schema.parameters.filter((parameter) => profileParameterIds.includes(parameter.parameter_id))
      .every((parameter) => parameter.required_when.kind === "EQUALS" &&
        parameter.required_when.parameter_id === "product_profile_id" &&
        parameter.required_when.value === KNAUF_FUGENFUELLER_JOINTING_PRODUCT_PROFILE_ID)).toBe(true);

    const fugenfuellerValue = (parameter: Parameters<typeof validOverrideValue>[0]) => {
      if (parameter.parameter_id === "product_profile_id") return KNAUF_FUGENFUELLER_JOINTING_PRODUCT_PROFILE_ID;
      if (parameter.parameter_id === "area_m2") return 53;
      if (parameter.parameter_id === "length_m") return 53;
      if (parameter.parameter_id === "width_m") return 1;
      if (parameter.parameter_id === "perimeter_m") return 108;
      if (parameter.parameter_id === "board_product_type") return "Knauf HRAK board";
      if (parameter.parameter_id === "board_thickness_mm") return 12.5;
      if (parameter.parameter_id === "board_layer_configuration") return "single_layer";
      if (parameter.parameter_id === "long_edge_type") return "HRAK";
      if (parameter.parameter_id === "construction_application") return "ceiling";
      if (parameter.parameter_id === "selected_consumption_kg_m2") return 0.3;
      if (parameter.parameter_id === "selected_bag_size_kg") return "5";
      if (parameter.parameter_id === "system_passport_reference") {
        return "Knauf K462.de/eng/07.11/0/TB, exact ceiling table cell";
      }
      if (parameter.parameter_id === "material_certificate_reference") {
        return "PROJECT-KNAUF-FUGENFUELLER-BATCH-CERT-002";
      }
      if (parameter.parameter_id === "normative_rate_code") return "PROJECT-VERIFIED-FUGENFUELLER-JOINTING-RATE";
      return validOverrideValue(parameter);
    };
    const paramOverrides = Object.fromEntries(schema.parameters
      .filter((parameter) => parameter.parameter_id !== "quantity_base_joint_compound")
      .map((parameter) => [parameter.parameter_id, {
        value: fugenfuellerValue(parameter),
        source: "user",
      }]));

    const result = buildInteriorFinishesFromInlineInputV1({
      rawInput: "Заделка швов потолка Knauf HRAK 12,5 мм в один слой, площадь 53 м²",
      selectedWorkKey: FLAT_CEILING_FINISH_JOINT_WORK_KEY,
      city: "Bishkek",
      currency: "KGS",
      paramOverrides,
    });

    expect(result.exact_match).toBe(true);
    expect(result.missing_parameter_ids).toEqual([]);
    expect(result.production?.compile_result.status).toBe("COMPILED");
    expect(result.production?.compile_result.normative_resolution.applicable_sources.map((source) => source.source_id))
      .toContain(KNAUF_FUGENFUELLER_JOINTING_SOURCE_ID);
    const compoundRow = result.production?.draft?.items.find((row) =>
      row.sourceParameters?.rowCode === `${inventory.catalog_id}:drywall-flat-ceiling-v6:row:base_joint_compound`);
    expect(compoundRow).toMatchObject({ quantity: 20, unit: "kg" });
    expect(compoundRow?.sourceParameters?.normativeSourceIds).toContain(KNAUF_FUGENFUELLER_JOINTING_SOURCE_ID);
    expect(compoundRow?.sourceParameters?.parameterSourceIds).toContain(KNAUF_FUGENFUELLER_JOINTING_SOURCE_ID);
    expect(compoundRow?.sourceParameters?.professionalPhysicalNormApplicabilityV1).toMatchObject({
      source_id: KNAUF_FUGENFUELLER_JOINTING_SOURCE_ID,
      source_definition_hash: KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA.definition_hash,
      calculated_fugenfueller_jointing_net_quantity_kg: 15.9,
      calculated_fugenfueller_jointing_procurement_quantity_kg: 20,
    });
    expect(result.production?.draft?.items
      .filter((row) => (row.sourceParameters?.normativeSourceIds as readonly string[] | undefined)
        ?.includes(KNAUF_FUGENFUELLER_JOINTING_SOURCE_ID)))
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
      source_document_version: "2026.09-knauf-k462-primary-review-r2",
      source_definition_hash: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA.definition_hash,
      calculated_perimeter_joint_compound_quantity_kg: 25,
      produced_parameter_ids: ["perimeter_joint_compound_quantity_kg"],
      blockers: [],
    });
    expect(first.parameter_values.perimeter_joint_compound_quantity_kg?.applicability)
      .toContain("additional_waste_excluded=true");
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

  test("keeps Ceresit CN 69 closed until every global 25 kg TDS applicability fact is explicit", () => {
    const { layer_thickness_mm: _omitted, ...withoutThickness } = exactCeresitCn69Inputs();
    expect(resolveCeresitCn69(withoutThickness)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      source_id: CERESIT_CN69_GLOBAL_25KG_SOURCE_ID,
      blockers: ["PROJECT_VALUE_REQUIRED_EXPLICIT:layer_thickness_mm"],
    });
    expect(resolveCeresitCn69(exactCeresitCn69Inputs({
      layer_thickness_mm: explicit(12, "mm"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CN69_GLOBAL_25KG_NORM_ID}:layer_thickness_mm=12`,
      ],
    });
    expect(resolveCeresitCn69(exactCeresitCn69Inputs({
      selected_bag_size_kg: explicit(23, "kg"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_VARIANT_CONFLICT:selected_bag_size_kg=23:tds_bag_size_kg=25"],
    });
    expect(resolveCeresitCn69(exactCeresitCn69Inputs({
      cn69_global_25kg_tds_variant_confirmed: explicit(false),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [`PHYSICAL_NORM_VARIANT_NOT_CONFIRMED:${CERESIT_CN69_GLOBAL_25KG_NORM_ID}`],
    });
    expect(resolveProfessionalPhysicalNormParameterValuesV1({
      technology_class: "SUBFLOOR",
      operation_class: "FINISH",
      material_system: "SUBFLOOR",
      scope_mode: "FULL_APPLICABLE_SCOPE",
      parameter_values: exactCeresitCn69Inputs(),
    }).status).toBe("NOT_REQUESTED");
  });

  test("keeps the CT 17 primer row closed until the project rate, repeat rule, and package are exact", () => {
    expect(resolveCeresitCn69(exactCeresitCn69Inputs({
      ct17_selected_consumption_l_m2: explicit(0.09, "l_per_m2"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      source_id: CERESIT_CT17_FLOORING_PRIMER_SOURCE_ID,
      blockers: [
        `PHYSICAL_NORM_RATE_NOT_APPLICABLE:${CERESIT_CT17_FLOORING_PRIMER_NORM_ID}:ct17_selected_consumption_l_m2=0.09`,
      ],
    });
    expect(resolveCeresitCn69(exactCeresitCn69Inputs({
      cn69_substrate_type: explicit("other_mineral_base"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      source_id: CERESIT_CT17_FLOORING_PRIMER_SOURCE_ID,
      blockers: [
        `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT17_FLOORING_PRIMER_NORM_ID}:cn69_substrate_type=other_mineral_base`,
      ],
    });
    expect(resolveCeresitCn69(exactCeresitCn69Inputs({
      ct17_substrate_evenness: explicit("unknown"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT17_FLOORING_PRIMER_NORM_ID}:ct17_substrate_evenness=unknown`,
      ],
    });
    expect(resolveCeresitCn69(exactCeresitCn69Inputs({
      ct17_still_absorbent_after_drying: explicit(true),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        "PHYSICAL_NORM_COAT_COUNT_CONFLICT:ct17_coat_count=1:still_absorbent_after_drying=true",
      ],
    });
    expect(resolveCeresitCn69(exactCeresitCn69Inputs({
      ct17_selected_container_size_l: explicit(3, "l"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_PACKAGE_NOT_APPLICABLE:ct17_selected_container_size_l=3"],
    });
    expect(resolveCeresitCn69(exactCeresitCn69Inputs({
      ct17_additional_waste_not_published_confirmed: explicit(false),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [`PHYSICAL_NORM_WASTE_POLICY_NOT_CONFIRMED:${CERESIT_CT17_FLOORING_PRIMER_NORM_ID}`],
    });
    expect(resolveCeresitCn69(exactCeresitCn69Inputs({
      ct17_primer_procurement_quantity_l: explicit(18, "l"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        "PHYSICAL_NORM_VALUE_CONFLICT:ct17_primer_procurement_quantity_l=18:norm_value=20",
      ],
    });
  });

  test("derives the exact CN 69 layer and CT 17 primer quantities as one floor-system profile", () => {
    const input = exactCeresitCn69Inputs();
    const first = resolveCeresitCn69(input);
    const second = resolveCeresitCn69(input);

    expect(first).toMatchObject({
      status: "APPLIED",
      source_id: CERESIT_CN69_GLOBAL_25KG_SOURCE_ID,
      norm_id: CERESIT_CN69_GLOBAL_25KG_NORM_ID,
      source_document_version: "2026.09-ceresit-cn69-ct17-global-primary-review-r2",
      source_definition_hash: CERESIT_CN69_GLOBAL_25KG_SOURCE_METADATA.definition_hash,
      source_ids: [CERESIT_CN69_GLOBAL_25KG_SOURCE_ID, CERESIT_CT17_FLOORING_PRIMER_SOURCE_ID],
      norm_ids: [CERESIT_CN69_GLOBAL_25KG_NORM_ID, CERESIT_CT17_FLOORING_PRIMER_NORM_ID],
      applied_norms: expect.arrayContaining([expect.objectContaining({
        source_id: CERESIT_CT17_FLOORING_PRIMER_SOURCE_ID,
        source_definition_hash: CERESIT_CT17_FLOORING_PRIMER_SOURCE_METADATA.definition_hash,
      })]),
      calculated_cn69_net_quantity_kg: 650,
      calculated_cn69_bag_count: 26,
      calculated_ct17_primer_net_quantity_l: 18,
      calculated_ct17_primer_procurement_quantity_l: 20,
      calculated_ct17_primer_container_count: 2,
      produced_parameter_ids: [
        "material_consumption_kg_m2_mm",
        "ct17_primer_procurement_quantity_l",
      ],
      blockers: [],
    });
    expect(first.parameter_values.material_consumption_kg_m2_mm).toMatchObject({
      value: 1.3,
      unit_id: "kg_per_m2_mm",
      source_type: "APPLICABLE_NORM",
      source_id: CERESIT_CN69_GLOBAL_25KG_SOURCE_ID,
    });
    expect(first.parameter_values.ct17_primer_procurement_quantity_l).toMatchObject({
      value: 20,
      unit_id: "l",
      source_type: "APPLICABLE_NORM",
      source_id: CERESIT_CT17_FLOORING_PRIMER_SOURCE_ID,
    });
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
    expect(input.material_consumption_kg_m2_mm).toBeUndefined();
    expect(input.ct17_primer_procurement_quantity_l).toBeUndefined();
    expect(constructionNormativeRegistryV1.get(CERESIT_CN69_GLOBAL_25KG_SOURCE_ID)).toMatchObject({
      authority: "Ceresit / Henkel",
      product_profile_applicability: [CERESIT_CN69_GLOBAL_25KG_PRODUCT_PROFILE_ID],
      material_system_applicability: ["SUBFLOOR"],
      operation_class_applicability: ["PREPARE"],
    });
    expect(constructionNormativeRegistryV1.get(CERESIT_CT17_FLOORING_PRIMER_SOURCE_ID)).toMatchObject({
      authority: "Ceresit / Henkel",
      product_profile_applicability: [CERESIT_CN69_GLOBAL_25KG_PRODUCT_PROFILE_ID],
      material_system_applicability: ["SUBFLOOR"],
      operation_class_applicability: ["PREPARE"],
    });
  });

  test("asks the CN 69 and CT 17 applicability questions and routes separate material rows", () => {
    const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) => row.work_key === SUBFLOOR_PREPARE_WORK_KEY);
    if (!inventory) throw new Error("CERESIT_CN69_RUNTIME_SUBFLOOR_PREPARE_WORK_MISSING");
    const technology = interiorFinishesDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
    const schema = interiorFinishesDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
    if (!technology || !schema) throw new Error("CERESIT_CN69_RUNTIME_SUBFLOOR_PREPARE_SCHEMA_MISSING");
    const cn69QuestionIds = [
      "cn69_substrate_type",
      "dry_indoor_use_confirmed",
      "moisture_ingress_prevented",
      "substrate_preparation_confirmed",
      "installation_conditions_confirmed",
      "cn69_global_25kg_tds_variant_confirmed",
      "selected_bag_size_kg",
      "ct17_substrate_evenness",
      "ct17_substrate_absorbency",
      "ct17_selected_consumption_l_m2",
      "ct17_coat_count",
      "ct17_substrate_dry_load_bearing_clean_confirmed",
      "ct17_selected_container_size_l",
      "ct17_still_absorbent_after_drying",
      "ct17_repeat_rule_confirmed",
      "ct17_additional_waste_not_published_confirmed",
      "ct17_flooring_tds_confirmed",
      "system_passport_reference",
      "material_certificate_reference",
    ];
    expect(schema.parameters.filter((parameter) => cn69QuestionIds.includes(parameter.parameter_id))
      .map((parameter) => parameter.parameter_id)).toEqual(cn69QuestionIds);
    expect(schema.parameters.filter((parameter) =>
      cn69QuestionIds.includes(parameter.parameter_id) && parameter.parameter_id !== "selected_bag_size_kg")
      .every((parameter) => parameter.required_when.kind === "EQUALS" &&
        parameter.required_when.parameter_id === "product_profile_id" &&
        parameter.required_when.value === CERESIT_CN69_GLOBAL_25KG_PRODUCT_PROFILE_ID)).toBe(true);
    expect(schema.parameters.find((parameter) => parameter.parameter_id === "selected_bag_size_kg")?.required_when)
      .toEqual({
        kind: "ANY_OF",
        conditions: [
          { parameter_id: "product_profile_id", value: CERESIT_CN69_GLOBAL_25KG_PRODUCT_PROFILE_ID },
          { parameter_id: "product_profile_id", value: CERESIT_CN87_50MM_SCREED_PRODUCT_PROFILE_ID },
        ],
      });
    expect(schema.parameters.find((parameter) => parameter.parameter_id === "layer_thickness_mm")?.label_ru)
      .toContain("Толщина");

    const cn69Value = (parameter: Parameters<typeof validOverrideValue>[0]) => {
      if (parameter.parameter_id === "product_profile_id") return CERESIT_CN69_GLOBAL_25KG_PRODUCT_PROFILE_ID;
      if (parameter.parameter_id === "normative_rate_code") return "PROJECT-VERIFIED-SUBFLOOR-PREPARE-RATE";
      if (parameter.parameter_id === "project_type") return "INTERIOR_FLOORING_PROJECT";
      if (parameter.parameter_id === "area_m2") return 100;
      if (parameter.parameter_id === "layer_thickness_mm") return 5;
      if (parameter.parameter_id === "cn69_substrate_type") return "cement_sand_screed";
      if ([
        "dry_indoor_use_confirmed",
        "moisture_ingress_prevented",
        "substrate_preparation_confirmed",
        "installation_conditions_confirmed",
        "cn69_global_25kg_tds_variant_confirmed",
      ].includes(parameter.parameter_id)) return true;
      if (parameter.parameter_id === "selected_bag_size_kg") return 25;
      if (parameter.parameter_id === "ct17_substrate_evenness") return "even";
      if (parameter.parameter_id === "ct17_substrate_absorbency") return "absorbent";
      if (parameter.parameter_id === "ct17_selected_consumption_l_m2") return 0.18;
      if (parameter.parameter_id === "ct17_coat_count") return 1;
      if (parameter.parameter_id === "ct17_selected_container_size_l") return "10";
      if (parameter.parameter_id === "ct17_still_absorbent_after_drying") return false;
      if (parameter.parameter_id === "system_passport_reference") {
        return "CERESIT-CN69-CT17-FLOOR-SYSTEM-PASSPORT-001";
      }
      if (parameter.parameter_id === "material_certificate_reference") {
        return "PROJECT-CERESIT-CT17-BATCH-CERT-001";
      }
      if ([
        "ct17_substrate_dry_load_bearing_clean_confirmed",
        "ct17_repeat_rule_confirmed",
        "ct17_additional_waste_not_published_confirmed",
        "ct17_flooring_tds_confirmed",
      ].includes(parameter.parameter_id)) return true;
      return validOverrideValue(parameter);
    };
    const paramOverrides = Object.fromEntries(schema.parameters
      .filter((parameter) => ![
        "material_consumption_kg_m2_mm",
        "ct17_primer_procurement_quantity_l",
      ].includes(parameter.parameter_id))
      .map((parameter) => [parameter.parameter_id, { value: cn69Value(parameter), source: "user" }]));

    const result = buildInteriorFinishesFromInlineInputV1({
      rawInput: "Выравнивание 100 м² сухого внутреннего пола Ceresit CN 69 слоем 5 мм",
      selectedWorkKey: SUBFLOOR_PREPARE_WORK_KEY,
      city: "Bishkek",
      currency: "KGS",
      paramOverrides,
    });

    expect(result.exact_match).toBe(true);
    expect(result.missing_parameter_ids).toEqual([]);
    expect(result.production?.compile_result.status).toBe("COMPILED");
    expect(result.production?.compile_result.normative_resolution.applicable_sources.map((source) => source.source_id))
      .toContain(CERESIT_CN69_GLOBAL_25KG_SOURCE_ID);
    expect(result.production?.compile_result.normative_resolution.applicable_sources.map((source) => source.source_id))
      .toContain(CERESIT_CT17_FLOORING_PRIMER_SOURCE_ID);
    const materialRow = result.production?.draft?.items.find((row) =>
      row.sourceParameters?.rowCode === `${inventory.canonical_technology_id}:row:primary_material`);
    expect(materialRow).toMatchObject({ quantity: 650, unit: "kg" });
    expect(materialRow?.sourceParameters?.normativeSourceIds).toContain(CERESIT_CN69_GLOBAL_25KG_SOURCE_ID);
    expect(materialRow?.sourceParameters?.parameterSourceIds).toContain(CERESIT_CN69_GLOBAL_25KG_SOURCE_ID);
    expect(materialRow?.sourceParameters?.professionalPhysicalNormApplicabilityV1).toMatchObject({
      source_id: CERESIT_CN69_GLOBAL_25KG_SOURCE_ID,
      source_definition_hash: CERESIT_CN69_GLOBAL_25KG_SOURCE_METADATA.definition_hash,
      calculated_cn69_net_quantity_kg: 650,
      calculated_cn69_bag_count: 26,
    });
    expect(result.production?.draft?.items.filter((row) =>
      (row.sourceParameters?.normativeSourceIds as readonly string[] | undefined)
        ?.includes(CERESIT_CN69_GLOBAL_25KG_SOURCE_ID))).toHaveLength(1);
    const primerRowId = `${inventory.canonical_technology_id}:ct17-primer-v1:row:ct17_primer`;
    const primerRow = result.production?.draft?.items.find(
      (row) => row.sourceParameters?.rowCode === primerRowId,
    );
    expect(primerRow).toMatchObject({ quantity: 20, unit: "l" });
    expect(primerRow?.sourceParameters?.normativeSourceIds)
      .toContain(CERESIT_CT17_FLOORING_PRIMER_SOURCE_ID);
    expect(primerRow?.sourceParameters?.parameterSourceIds)
      .toContain(CERESIT_CT17_FLOORING_PRIMER_SOURCE_ID);
    expect(primerRow?.sourceParameters?.professionalPhysicalNormApplicabilityV1).toMatchObject({
      source_ids: [CERESIT_CN69_GLOBAL_25KG_SOURCE_ID, CERESIT_CT17_FLOORING_PRIMER_SOURCE_ID],
      calculated_ct17_primer_net_quantity_l: 18,
      calculated_ct17_primer_procurement_quantity_l: 20,
      calculated_ct17_primer_container_count: 2,
    });
    expect(result.production?.draft?.items.filter((row) =>
      (row.sourceParameters?.normativeSourceIds as readonly string[] | undefined)
        ?.includes(CERESIT_CT17_FLOORING_PRIMER_SOURCE_ID))).toHaveLength(1);
  });

  test("keeps CM 11 closed until the exact small-ceramic indoor table pair is explicit", () => {
    const { trowel_notch_mm: _omitted, ...withoutNotch } = exactCeresitCm11Inputs();
    expect(resolveCeresitCm11(withoutNotch)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      source_id: CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_ID,
      blockers: ["PROJECT_VALUE_REQUIRED_EXPLICIT:trowel_notch_mm"],
    });
    expect(resolveCeresitCm11(exactCeresitCm11Inputs({
      tile_size_category: explicit("up_to_15_cm"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_TABLE_PAIR_NOT_APPLICABLE:tile_size_category=up_to_15_cm"],
    });
    expect(resolveCeresitCm11(exactCeresitCm11Inputs({
      installation_location: explicit("outdoor"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CM11_SMALL_CERAMIC_INDOOR_NORM_ID}:installation_location=outdoor`,
      ],
    });
    expect(resolveCeresitCm11(exactCeresitCm11Inputs({
      floating_buttering_requirement_confirmed: explicit(true),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_TABLE_PAIR_NOT_APPLICABLE:floating_buttering_requirement_confirmed=true"],
    });
    expect(resolveCeresitCm11(exactCeresitCm11Inputs({
      selected_package_size_kg: explicit(20, "kg"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_VARIANT_CONFLICT:selected_package_size_kg=20:tds_package_size_kg=25"],
    });
    expect(resolveCeresitCm11(exactCeresitCm11Inputs({
      cm11_adhesive_procurement_quantity_kg: explicit(90, "kg"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        "PHYSICAL_NORM_VALUE_CONFLICT:cm11_adhesive_procurement_quantity_kg=90:norm_value=100",
      ],
    });
    expect(resolveProfessionalPhysicalNormParameterValuesV1({
      technology_class: "CERAMIC_TILE",
      operation_class: "GROUT",
      material_system: "CERAMIC_TILE",
      scope_mode: "FULL_APPLICABLE_SCOPE",
      parameter_values: exactCeresitCm11Inputs(),
    }).status).toBe("NOT_REQUESTED");
  });

  test("keeps the tile CT 17 primer closed until rate, drying, conditions, and package are explicit", () => {
    expect(resolveCeresitCm11(exactCeresitCm11Inputs({
      ct17_tile_selected_consumption_l_m2: explicit(0.09, "l_per_m2"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      source_id: CERESIT_CT17_TILE_PRIMER_SOURCE_ID,
      blockers: [
        `PHYSICAL_NORM_RATE_NOT_APPLICABLE:${CERESIT_CT17_TILE_PRIMER_NORM_ID}:ct17_tile_selected_consumption_l_m2=0.09`,
      ],
    });
    expect(resolveCeresitCm11(exactCeresitCm11Inputs({
      ct17_tile_cement_wait_minutes: explicit(30, "minute"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_DRYING_TIME_NOT_APPLICABLE:ct17_tile_cement_wait_minutes=30"],
    });
    expect(resolveCeresitCm11(exactCeresitCm11Inputs({
      ct17_tile_relative_humidity_percent: explicit(81, "percent"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT17_TILE_PRIMER_NORM_ID}:ct17_tile_relative_humidity_percent=81`,
      ],
    });
    expect(resolveCeresitCm11(exactCeresitCm11Inputs({
      ct17_tile_selected_container_size_l: explicit(3, "l"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_PACKAGE_NOT_APPLICABLE:ct17_tile_selected_container_size_l=3"],
    });
    expect(resolveCeresitCm11(exactCeresitCm11Inputs({
      ct17_tile_tds_confirmed: explicit(false),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [`PHYSICAL_NORM_VARIANT_NOT_CONFIRMED:${CERESIT_CT17_TILE_PRIMER_NORM_ID}`],
    });
    expect(resolveCeresitCm11(exactCeresitCm11Inputs({
      ct17_tile_primer_procurement_quantity_l: explicit(8, "l"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        "PHYSICAL_NORM_VALUE_CONFLICT:ct17_tile_primer_procurement_quantity_l=8:norm_value=10",
      ],
    });
  });

  test("derives deterministic CM 11 adhesive and CT 17 primer procurement", () => {
    const input = exactCeresitCm11Inputs();
    const first = resolveCeresitCm11(input);
    const second = resolveCeresitCm11(input);

    expect(first).toMatchObject({
      status: "APPLIED",
      source_id: CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_ID,
      norm_id: CERESIT_CM11_SMALL_CERAMIC_INDOOR_NORM_ID,
      source_definition_hash: CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA.definition_hash,
      source_ids: [CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_ID, CERESIT_CT17_TILE_PRIMER_SOURCE_ID],
      norm_ids: [CERESIT_CM11_SMALL_CERAMIC_INDOOR_NORM_ID, CERESIT_CT17_TILE_PRIMER_NORM_ID],
      applied_norms: expect.arrayContaining([expect.objectContaining({
        source_id: CERESIT_CT17_TILE_PRIMER_SOURCE_ID,
        source_definition_hash: CERESIT_CT17_TILE_PRIMER_SOURCE_METADATA.definition_hash,
      })]),
      calculated_cm11_adhesive_net_quantity_kg: 90,
      calculated_cm11_adhesive_procurement_quantity_kg: 100,
      calculated_ct17_tile_primer_net_quantity_l: 8.1,
      calculated_ct17_tile_primer_procurement_quantity_l: 10,
      calculated_ct17_tile_primer_container_count: 1,
      produced_parameter_ids: [
        "cm11_adhesive_procurement_quantity_kg",
        "ct17_tile_primer_procurement_quantity_l",
      ],
      blockers: [],
    });
    expect(first.parameter_values.cm11_adhesive_procurement_quantity_kg).toMatchObject({
      value: 100,
      unit_id: "kg",
      source_type: "APPLICABLE_NORM",
      source_id: CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_ID,
    });
    expect(first.parameter_values.ct17_tile_primer_procurement_quantity_l).toMatchObject({
      value: 10,
      unit_id: "l",
      source_type: "APPLICABLE_NORM",
      source_id: CERESIT_CT17_TILE_PRIMER_SOURCE_ID,
    });
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
    expect(input.cm11_adhesive_procurement_quantity_kg).toBeUndefined();
    expect(input.ct17_tile_primer_procurement_quantity_l).toBeUndefined();
    expect(constructionNormativeRegistryV1.get(CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_ID))
      .toMatchObject({
        authority: "Ceresit / Henkel",
        product_profile_applicability: [CERESIT_CM11_SMALL_CERAMIC_INDOOR_PRODUCT_PROFILE_ID],
        material_system_applicability: ["CERAMIC_TILE"],
        operation_class_applicability: ["LAY"],
      });
    expect(constructionNormativeRegistryV1.get(CERESIT_CT17_TILE_PRIMER_SOURCE_ID))
      .toMatchObject({
        authority: "Ceresit / Henkel",
        product_profile_applicability: [CERESIT_CM11_SMALL_CERAMIC_INDOOR_PRODUCT_PROFILE_ID],
        material_system_applicability: ["CERAMIC_TILE"],
        operation_class_applicability: ["LAY"],
      });
  });

  test("asks the CM 11 and CT 17 questions and adds separate adhesive and primer rows", () => {
    const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find(
      (row) => row.work_key === CERAMIC_TILE_LAY_STANDARD_WORK_KEY,
    );
    if (!inventory) throw new Error("CERESIT_CM11_RUNTIME_CERAMIC_TILE_LAY_WORK_MISSING");
    const technology = interiorFinishesDomainFactory.technology_by_id.get(
      inventory.canonical_technology_id,
    );
    const schema = interiorFinishesDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
    if (!technology || !schema) throw new Error("CERESIT_CM11_RUNTIME_CERAMIC_TILE_LAY_SCHEMA_MISSING");
    const cm11ParameterIds = [
      "tile_type",
      "tile_size_category",
      "trowel_notch_mm",
      "substrate_type",
      "substrate_even_load_bearing_compact_confirmed",
      "substrate_dry_clean_confirmed",
      "installation_location",
      "installation_orientation",
      "floating_buttering_requirement_confirmed",
      "application_temperature_confirmed",
      "cm11_global_tds_variant_confirmed",
      "selected_package_size_kg",
      "minimum_tile_back_contact_percent",
      "manufacturer_tds_reference",
      "material_certificate_reference",
      "ct17_tile_substrate_evenness",
      "ct17_tile_substrate_absorbency",
      "ct17_tile_selected_consumption_l_m2",
      "ct17_tile_coat_count",
      "ct17_tile_drying_rule_confirmed",
      "ct17_tile_cement_wait_minutes",
      "ct17_tile_application_conditions_confirmed",
      "ct17_tile_relative_humidity_percent",
      "ct17_tile_selected_container_size_l",
      "ct17_tile_tds_confirmed",
      "ct17_tile_additional_waste_not_published_confirmed",
      "ct17_tile_tds_reference",
      "ct17_tile_material_certificate_reference",
      "cm11_adhesive_procurement_quantity_kg",
      "ct17_tile_primer_procurement_quantity_l",
    ];
    expect(schema.parameters.filter((parameter) => cm11ParameterIds.includes(parameter.parameter_id))
      .map((parameter) => parameter.parameter_id)).toEqual(cm11ParameterIds);
    expect(schema.parameters.filter((parameter) => cm11ParameterIds.includes(parameter.parameter_id))
      .every((parameter) => parameter.required_when.kind === "EQUALS" &&
        parameter.required_when.parameter_id === "product_profile_id" &&
        parameter.required_when.value === CERESIT_CM11_SMALL_CERAMIC_INDOOR_PRODUCT_PROFILE_ID))
      .toBe(true);

    const cm11Value = (parameter: Parameters<typeof validOverrideValue>[0]) => {
      if (parameter.parameter_id === "product_profile_id") {
        return CERESIT_CM11_SMALL_CERAMIC_INDOOR_PRODUCT_PROFILE_ID;
      }
      if (parameter.parameter_id === "normative_rate_code") {
        return "PROJECT-VERIFIED-CERAMIC-TILE-LAY-RATE";
      }
      if (parameter.parameter_id === "project_type") return "INTERIOR_CERAMIC_TILE_PROJECT";
      if (parameter.parameter_id === "area_m2") return 45;
      if (parameter.parameter_id === "length_m") return 9;
      if (parameter.parameter_id === "width_m") return 5;
      if (parameter.parameter_id === "material_consumption_m2_m2") return 1;
      if (parameter.parameter_id === "tile_type") return "ceramic";
      if (parameter.parameter_id === "tile_size_category") return "up_to_10_cm";
      if (parameter.parameter_id === "trowel_notch_mm") return 4;
      if (parameter.parameter_id === "substrate_type") return "cement_screed";
      if (parameter.parameter_id === "installation_location") return "indoor";
      if (parameter.parameter_id === "installation_orientation") return "horizontal";
      if (parameter.parameter_id === "floating_buttering_requirement_confirmed") return false;
      if (parameter.parameter_id === "selected_package_size_kg") return 25;
      if (parameter.parameter_id === "minimum_tile_back_contact_percent") return 65;
      if (parameter.parameter_id === "manufacturer_tds_reference") {
        return "CERESIT_CM11_TDS_04_2026, exact consumption table";
      }
      if (parameter.parameter_id === "material_certificate_reference") {
        return "PROJECT-CERESIT-CM11-BATCH-CERT-001";
      }
      if (parameter.parameter_id === "ct17_tile_substrate_evenness") return "even";
      if (parameter.parameter_id === "ct17_tile_substrate_absorbency") return "absorbent";
      if (parameter.parameter_id === "ct17_tile_selected_consumption_l_m2") return 0.18;
      if (parameter.parameter_id === "ct17_tile_coat_count") return 1;
      if (parameter.parameter_id === "ct17_tile_cement_wait_minutes") return 15;
      if (parameter.parameter_id === "ct17_tile_relative_humidity_percent") return 60;
      if (parameter.parameter_id === "ct17_tile_selected_container_size_l") return "10";
      if (parameter.parameter_id === "ct17_tile_tds_reference") {
        return "TDS No CT17 Profi 03.24, pages 1-2";
      }
      if (parameter.parameter_id === "ct17_tile_material_certificate_reference") {
        return "PROJECT-CERESIT-CT17-TILE-BATCH-CERT-001";
      }
      if ([
        "ct17_tile_drying_rule_confirmed",
        "ct17_tile_application_conditions_confirmed",
        "ct17_tile_tds_confirmed",
        "ct17_tile_additional_waste_not_published_confirmed",
      ].includes(parameter.parameter_id)) return true;
      return validOverrideValue(parameter);
    };
    const paramOverrides = Object.fromEntries(schema.parameters
      .filter((parameter) => ![
        "cm11_adhesive_procurement_quantity_kg",
        "ct17_tile_primer_procurement_quantity_l",
      ].includes(parameter.parameter_id))
      .map((parameter) => [parameter.parameter_id, {
        value: cm11Value(parameter),
        source: "user",
      }]));

    const result = buildInteriorFinishesFromInlineInputV1({
      rawInput: "Укладка 45 м² керамической плитки до 10 см на Ceresit CM 11 PLUS",
      selectedWorkKey: CERAMIC_TILE_LAY_STANDARD_WORK_KEY,
      city: "Bishkek",
      currency: "KGS",
      paramOverrides,
    });

    expect(result.exact_match).toBe(true);
    expect(result.missing_parameter_ids).toEqual([]);
    expect(result.production?.compile_result.status).toBe("COMPILED");
    expect(result.production?.compile_result.normative_resolution.applicable_sources
      .map((source) => source.source_id)).toContain(CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_ID);
    expect(result.production?.compile_result.normative_resolution.applicable_sources
      .map((source) => source.source_id)).toContain(CERESIT_CT17_TILE_PRIMER_SOURCE_ID);
    const adhesiveRowId = `${inventory.canonical_technology_id}:cm11-adhesive-v1:row:cm11_adhesive`;
    const adhesiveRow = result.production?.draft?.items.find(
      (row) => row.sourceParameters?.rowCode === adhesiveRowId,
    );
    expect(adhesiveRow).toMatchObject({ quantity: 100, unit: "kg" });
    expect(adhesiveRow?.sourceParameters?.normativeSourceIds)
      .toContain(CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_ID);
    expect(adhesiveRow?.sourceParameters?.parameterSourceIds)
      .toContain(CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_ID);
    expect(adhesiveRow?.sourceParameters?.professionalPhysicalNormApplicabilityV1).toMatchObject({
      source_id: CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_ID,
      source_definition_hash: CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA.definition_hash,
      calculated_cm11_adhesive_net_quantity_kg: 90,
      calculated_cm11_adhesive_procurement_quantity_kg: 100,
    });
    expect(result.production?.draft?.items.filter((row) =>
      (row.sourceParameters?.normativeSourceIds as readonly string[] | undefined)
        ?.includes(CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_ID))).toHaveLength(1);
    const primerRowId = `${inventory.canonical_technology_id}:ct17-tile-primer-v1:row:ct17_tile_primer`;
    const primerRow = result.production?.draft?.items.find(
      (row) => row.sourceParameters?.rowCode === primerRowId,
    );
    expect(primerRow).toMatchObject({ quantity: 10, unit: "l" });
    expect(primerRow?.sourceParameters?.normativeSourceIds)
      .toContain(CERESIT_CT17_TILE_PRIMER_SOURCE_ID);
    expect(primerRow?.sourceParameters?.parameterSourceIds)
      .toContain(CERESIT_CT17_TILE_PRIMER_SOURCE_ID);
    expect(primerRow?.sourceParameters?.professionalPhysicalNormApplicabilityV1).toMatchObject({
      source_ids: [CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_ID, CERESIT_CT17_TILE_PRIMER_SOURCE_ID],
      calculated_ct17_tile_primer_net_quantity_l: 8.1,
      calculated_ct17_tile_primer_procurement_quantity_l: 10,
      calculated_ct17_tile_primer_container_count: 1,
    });
    expect(result.production?.draft?.items.filter((row) =>
      (row.sourceParameters?.normativeSourceIds as readonly string[] | undefined)
        ?.includes(CERESIT_CT17_TILE_PRIMER_SOURCE_ID))).toHaveLength(1);
    const primaryTileRow = result.production?.draft?.items.find((row) =>
      row.sourceParameters?.rowCode === `${inventory.canonical_technology_id}:row:primary_material`);
    expect(primaryTileRow).toMatchObject({ quantity: 45, unit: "m2" });
    expect(primaryTileRow?.sourceParameters?.normativeSourceIds)
      .not.toContain(CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_ID);
  });

  test("keeps the CT 17 / CT 54 wall system closed until both exact TDS profiles are explicit", () => {
    const { ct17_paint_selected_consumption_l_m2: _omitted, ...withoutPrimerRate } =
      exactCeresitCt54Ct17WallInputs();
    expect(resolveCeresitCt54Ct17Wall(withoutPrimerRate)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      source_id: CERESIT_CT17_PAINT_PRIMER_SOURCE_ID,
      blockers: ["PROJECT_VALUE_REQUIRED_EXPLICIT:ct17_paint_selected_consumption_l_m2"],
    });
    expect(resolveCeresitCt54Ct17Wall(exactCeresitCt54Ct17WallInputs({
      ct17_paint_relative_humidity_percent: explicit(80, "percent"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_HUMIDITY_NOT_APPLICABLE:ct17_paint_relative_humidity_percent=80"],
    });
    expect(resolveCeresitCt54Ct17Wall(exactCeresitCt54Ct17WallInputs({
      ct54_coat_count: explicit(1, "item"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      source_id: CERESIT_CT54_INTERIOR_WALL_SOURCE_ID,
      blockers: [`PHYSICAL_NORM_COAT_COUNT_CONFLICT:ct54_coat_count=1:source_coat_count=2`],
    });
    expect(resolveCeresitCt54Ct17Wall(exactCeresitCt54Ct17WallInputs({
      ct54_facade_rain_protection_confirmed: explicit(true),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_LOCATION_CONFLICT:ct54_facade_rain_protection_confirmed=true:installation_location=indoor"],
    });
    expect(resolveProfessionalPhysicalNormParameterValuesV1({
      technology_class: "PAINT_CEILING",
      operation_class: "PAINT",
      material_system: "PAINT_CEILING",
      scope_mode: "FULL_APPLICABLE_SCOPE",
      parameter_values: exactCeresitCt54Ct17WallInputs(),
    })).toMatchObject({ status: "NOT_REQUESTED" });
  });

  test("derives separate packaged CT 17 primer and CT 54 paint quantities", () => {
    const input = exactCeresitCt54Ct17WallInputs();
    const first = resolveCeresitCt54Ct17Wall(input);
    const second = resolveCeresitCt54Ct17Wall(input);
    expect(first).toMatchObject({
      status: "APPLIED",
      source_id: CERESIT_CT54_INTERIOR_WALL_SOURCE_ID,
      norm_id: CERESIT_CT54_INTERIOR_WALL_NORM_ID,
      source_ids: [CERESIT_CT54_INTERIOR_WALL_SOURCE_ID, CERESIT_CT17_PAINT_PRIMER_SOURCE_ID],
      norm_ids: [CERESIT_CT54_INTERIOR_WALL_NORM_ID, CERESIT_CT17_PAINT_PRIMER_NORM_ID],
      calculated_ct17_paint_primer_net_quantity_l: 7.2,
      calculated_ct17_paint_primer_procurement_quantity_l: 10,
      calculated_ct17_paint_primer_container_count: 2,
      calculated_ct54_paint_net_quantity_l: 12,
      calculated_ct54_paint_procurement_quantity_l: 14,
      calculated_ct54_paint_container_count: 4,
      blockers: [],
    });
    expect(first.parameter_values.ct17_paint_primer_procurement_quantity_l).toMatchObject({
      value: 10,
      source_id: CERESIT_CT17_PAINT_PRIMER_SOURCE_ID,
    });
    expect(first.parameter_values.ct54_paint_procurement_quantity_l).toMatchObject({
      value: 14,
      source_id: CERESIT_CT54_INTERIOR_WALL_SOURCE_ID,
    });
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
    expect(constructionNormativeRegistryV1.get(CERESIT_CT17_PAINT_PRIMER_SOURCE_ID)).toMatchObject({
      product_profile_applicability: [CERESIT_CT54_CT17_INTERIOR_WALL_PRODUCT_PROFILE_ID],
      material_system_applicability: ["PAINT"],
      operation_class_applicability: ["PAINT"],
    });
    expect(constructionNormativeRegistryV1.get(CERESIT_CT54_INTERIOR_WALL_SOURCE_ID)).toMatchObject({
      product_profile_applicability: [CERESIT_CT54_CT17_INTERIOR_WALL_PRODUCT_PROFILE_ID],
      material_system_applicability: ["PAINT"],
      operation_class_applicability: ["PAINT"],
    });
    expect(CERESIT_CT17_PAINT_PRIMER_SOURCE_METADATA.definition_hash).not.toBe(
      CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA.definition_hash,
    );
  });

  test("routes CT 17 and CT 54 to two source-owned wall-paint rows without a generic duplicate", () => {
    const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find(
      (row) => row.work_key === WALL_PAINT_STANDARD_WORK_KEY,
    );
    if (!inventory) throw new Error("CERESIT_CT54_CT17_RUNTIME_WALL_PAINT_WORK_MISSING");
    const technology = interiorFinishesDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
    const schema = interiorFinishesDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
    if (!technology || !schema) throw new Error("CERESIT_CT54_CT17_RUNTIME_WALL_PAINT_SCHEMA_MISSING");
    expect(technology.material_system).toBe("PAINT");
    expect(technology.output).toEqual({ dimension: "AREA", unit_id: "m2" });
    const exactInputs = exactCeresitCt54Ct17WallInputs();
    const outputIds = new Set([
      "ct17_paint_primer_procurement_quantity_l",
      "ct54_paint_procurement_quantity_l",
    ]);
    const paramOverrides = Object.fromEntries(schema.parameters
      .filter((parameter) => !outputIds.has(parameter.parameter_id))
      .map((parameter) => [parameter.parameter_id, {
        value: ["ct17_paint_selected_container_size_l", "ct54_selected_container_size_l"]
          .includes(parameter.parameter_id)
          ? String(exactInputs[parameter.parameter_id]?.value)
          : exactInputs[parameter.parameter_id]?.value ??
          (parameter.parameter_id === "normative_rate_code"
            ? "PROJECT-VERIFIED-CERESIT-CT54-CT17-WALL-RATE"
            : parameter.parameter_id === "project_type"
              ? "INTERIOR-WALL-PAINT-PROJECT"
              : validOverrideValue(parameter)),
        source: "user",
      }]));
    const result = buildInteriorFinishesFromInlineInputV1({
      rawInput: "Окраска 40 м² внутренних стен системой Ceresit CT 17 и CT 54",
      selectedWorkKey: WALL_PAINT_STANDARD_WORK_KEY,
      city: "Bishkek",
      currency: "KGS",
      paramOverrides,
    });

    expect(result.exact_match).toBe(true);
    expect(result.missing_parameter_ids).toEqual([]);
    expect(result.production?.compile_result.status).toBe("COMPILED");
    const primerRowId = `${inventory.canonical_technology_id}:ceresit-ct54-ct17-v1:row:ct17_paint_primer`;
    const paintRowId = `${inventory.canonical_technology_id}:ceresit-ct54-ct17-v1:row:ct54_paint`;
    const primerRow = result.production?.draft?.items.find((row) => row.sourceParameters?.rowCode === primerRowId);
    const paintRow = result.production?.draft?.items.find((row) => row.sourceParameters?.rowCode === paintRowId);
    expect(primerRow).toMatchObject({ quantity: 10, unit: "l" });
    expect(paintRow).toMatchObject({ quantity: 14, unit: "l" });
    expect(primerRow?.sourceParameters?.normativeSourceIds).toEqual([CERESIT_CT17_PAINT_PRIMER_SOURCE_ID]);
    expect(paintRow?.sourceParameters?.normativeSourceIds).toEqual([CERESIT_CT54_INTERIOR_WALL_SOURCE_ID]);
    expect(result.production?.draft?.items.filter((row) =>
      (row.sourceParameters?.normativeSourceIds as readonly string[] | undefined)
        ?.includes(CERESIT_CT17_PAINT_PRIMER_SOURCE_ID))).toHaveLength(1);
    expect(result.production?.draft?.items.filter((row) =>
      (row.sourceParameters?.normativeSourceIds as readonly string[] | undefined)
        ?.includes(CERESIT_CT54_INTERIOR_WALL_SOURCE_ID))).toHaveLength(1);
    expect(result.production?.draft?.items.some((row) =>
      row.sourceParameters?.rowCode === `${inventory.canonical_technology_id}:row:primary_material`))
      .toBe(false);
  });

  test("keeps Gerflor 6086 closed without measured corners, exact pieces, and a cutting method", () => {
    const { inside_corner_count: _omitted, ...withoutInsideCorners } = exactGerflor6086Inputs();
    expect(resolveGerflor6086(withoutInsideCorners)).toMatchObject({
      status: "BLOCKED_REQUIRED_INPUTS",
      source_id: GERFLOR_6086_SKIRTING_SOURCE_ID,
      blockers: ["PROJECT_VALUE_REQUIRED_EXPLICIT:inside_corner_count"],
    });
    expect(resolveGerflor6086(exactGerflor6086Inputs({
      selected_skirting_product: explicit("Gerflor unknown"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        `PHYSICAL_NORM_NOT_APPLICABLE:${GERFLOR_6086_SKIRTING_NORM_ID}:selected_skirting_product=Gerflor unknown`,
      ],
    });
    expect(resolveGerflor6086(exactGerflor6086Inputs({
      gerflor_piece_length_m: explicit(2.5, "m"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: ["PHYSICAL_NORM_VARIANT_CONFLICT:gerflor_piece_length_m=2.5:source_piece_length_m=2"],
    });
    expect(resolveGerflor6086(exactGerflor6086Inputs({
      gerflor_corner_allowance_not_assumed_confirmed: explicit(false),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [`PHYSICAL_NORM_CORNER_ALLOWANCE_POLICY_NOT_CONFIRMED:${GERFLOR_6086_SKIRTING_NORM_ID}`],
    });
    expect(resolveGerflor6086(exactGerflor6086Inputs({
      gerflor_skirting_procurement_quantity_linear_m: explicit(54, "linear_m"),
    }))).toMatchObject({
      status: "BLOCKED_NOT_APPLICABLE",
      blockers: [
        "PHYSICAL_NORM_VALUE_CONFLICT:gerflor_skirting_procurement_quantity_linear_m=54:norm_value=56",
      ],
    });
  });

  test("rounds the measured Gerflor 6086 perimeter only to exact 2 m pieces", () => {
    const input = exactGerflor6086Inputs();
    const first = resolveGerflor6086(input);
    const second = resolveGerflor6086(input);

    expect(first).toMatchObject({
      status: "APPLIED",
      source_id: GERFLOR_6086_SKIRTING_SOURCE_ID,
      norm_id: GERFLOR_6086_SKIRTING_NORM_ID,
      source_document_version: "2026.09-gerflor-forbo-source-review-r2",
      source_definition_hash: GERFLOR_6086_SKIRTING_SOURCE_METADATA.definition_hash,
      calculated_gerflor_skirting_net_quantity_linear_m: 55,
      calculated_gerflor_skirting_procurement_quantity_linear_m: 56,
      calculated_gerflor_skirting_piece_count: 28,
      produced_parameter_ids: ["gerflor_skirting_procurement_quantity_linear_m"],
      blockers: [],
    });
    expect(first.parameter_values.gerflor_skirting_procurement_quantity_linear_m).toMatchObject({
      value: 56,
      unit_id: "linear_m",
      source_type: "APPLICABLE_NORM",
      source_id: GERFLOR_6086_SKIRTING_SOURCE_ID,
    });
    expect(first.parameter_values.gerflor_skirting_procurement_quantity_linear_m.applicability)
      .toContain("corner_allowance_linear_m=0:not_automatically_assumed");
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
    expect(input.gerflor_skirting_procurement_quantity_linear_m).toBeUndefined();
    expect(constructionNormativeRegistryV1.get(GERFLOR_6086_SKIRTING_SOURCE_ID)).toMatchObject({
      authority: "Gerflor",
      product_profile_applicability: [GERFLOR_6086_SKIRTING_PRODUCT_PROFILE_ID],
      material_system_applicability: ["BASEBOARD"],
      operation_class_applicability: ["INSTALL"],
    });
  });

  test("routes Gerflor 6086 through one linear material row without a generic duplicate", () => {
    const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find(
      (row) => row.work_key === BASEBOARD_INSTALL_WORK_KEY,
    );
    if (!inventory) throw new Error("GERFLOR_6086_RUNTIME_BASEBOARD_INSTALL_WORK_MISSING");
    const technology = interiorFinishesDomainFactory.technology_by_id.get(
      inventory.canonical_technology_id,
    );
    const schema = interiorFinishesDomainFactory.schema_by_id.get(technology?.parameter_schema_id ?? "");
    if (!technology || !schema) throw new Error("GERFLOR_6086_RUNTIME_BASEBOARD_INSTALL_SCHEMA_MISSING");
    expect(technology.output).toEqual({ dimension: "LINEAR", unit_id: "linear_m" });
    const gerflorQuestionIds = [
      "finished_perimeter_linear_m",
      "inside_corner_count",
      "outside_corner_count",
      "selected_skirting_product",
      "gerflor_piece_length_m",
      "gerflor_packaging_confirmed",
      "gerflor_corner_cutting_method_reference",
      "gerflor_corner_allowance_not_assumed_confirmed",
      "gerflor_installation_surface_prepared_plane_confirmed",
      "gerflor_manufacturer_instruction_reference",
      "material_certificate_reference",
    ];
    expect(schema.parameters.filter((parameter) => gerflorQuestionIds.includes(parameter.parameter_id))
      .map((parameter) => parameter.parameter_id)).toEqual(gerflorQuestionIds);

    const gerflorValue = (parameter: Parameters<typeof validOverrideValue>[0]) => {
      if (parameter.parameter_id === "product_profile_id") return GERFLOR_6086_SKIRTING_PRODUCT_PROFILE_ID;
      if (parameter.parameter_id === "normative_rate_code") return "PROJECT-VERIFIED-GERFLOR-6086-INSTALL";
      if (parameter.parameter_id === "project_type") return "INTERIOR-BASEBOARD-PROJECT";
      if (parameter.parameter_id === "finished_perimeter_linear_m") return 55;
      if (parameter.parameter_id === "inside_corner_count") return 4;
      if (parameter.parameter_id === "outside_corner_count") return 2;
      if (parameter.parameter_id === "selected_skirting_product") return "Gerflor Design Skirting 6086";
      if (parameter.parameter_id === "gerflor_piece_length_m") return 2;
      if (parameter.parameter_id === "gerflor_corner_cutting_method_reference") {
        return "GERFLOR-6086-CORNER-CUTTING-LAYOUT-001";
      }
      if (parameter.parameter_id === "gerflor_manufacturer_instruction_reference") {
        return "Gerflor PMO [516V1], sections 2-3";
      }
      if (parameter.parameter_id === "material_certificate_reference") {
        return "PROJECT-GERFLOR-6086-BATCH-CERT-001";
      }
      return validOverrideValue(parameter);
    };
    const paramOverrides = Object.fromEntries(schema.parameters
      .filter((parameter) => parameter.parameter_id !== "gerflor_skirting_procurement_quantity_linear_m")
      .map((parameter) => [parameter.parameter_id, {
        value: gerflorValue(parameter),
        source: "user",
      }]));

    const { normative_rate_code: _omittedRateCode, ...withoutExplicitNormativeRateCode } = paramOverrides;
    const blockedWithoutExplicitRateCode = buildInteriorFinishesFromInlineInputV1({
      rawInput: "Монтаж 55 пог. м плинтуса Gerflor Design Skirting 6086",
      selectedWorkKey: BASEBOARD_INSTALL_WORK_KEY,
      city: "Bishkek",
      currency: "KGS",
      paramOverrides: withoutExplicitNormativeRateCode,
    });
    expect(blockedWithoutExplicitRateCode.production?.draft).toBeNull();
    expect(blockedWithoutExplicitRateCode.production?.compile_result.status).toBe("NEEDS_REQUIRED_INPUTS");
    expect(blockedWithoutExplicitRateCode.missing_parameter_ids)
      .toContain("PROJECT_VALUE_REQUIRED:normative_rate_code");

    const result = buildInteriorFinishesFromInlineInputV1({
      rawInput: "Монтаж 55 пог. м плинтуса Gerflor Design Skirting 6086",
      selectedWorkKey: BASEBOARD_INSTALL_WORK_KEY,
      city: "Bishkek",
      currency: "KGS",
      paramOverrides,
    });

    expect(result.exact_match).toBe(true);
    expect(result.missing_parameter_ids).toEqual([]);
    expect(result.production?.compile_result.status).toBe("COMPILED");
    expect(result.production?.compile_result.normative_resolution.applicable_sources
      .map((source) => source.source_id)).toContain(GERFLOR_6086_SKIRTING_SOURCE_ID);
    const materialRowId = `${inventory.canonical_technology_id}:gerflor-6086-v1:row:gerflor_6086_skirting`;
    const materialRow = result.production?.draft?.items.find(
      (row) => row.sourceParameters?.rowCode === materialRowId,
    );
    expect(materialRow).toMatchObject({ quantity: 56, unit: "linear_m" });
    expect(materialRow?.sourceParameters?.normativeSourceIds).toEqual([GERFLOR_6086_SKIRTING_SOURCE_ID]);
    expect(materialRow?.sourceParameters?.parameterSourceIds).toContain(GERFLOR_6086_SKIRTING_SOURCE_ID);
    expect(materialRow?.sourceParameters?.professionalPhysicalNormApplicabilityV1).toMatchObject({
      source_id: GERFLOR_6086_SKIRTING_SOURCE_ID,
      source_definition_hash: GERFLOR_6086_SKIRTING_SOURCE_METADATA.definition_hash,
      calculated_gerflor_skirting_net_quantity_linear_m: 55,
      calculated_gerflor_skirting_procurement_quantity_linear_m: 56,
      calculated_gerflor_skirting_piece_count: 28,
    });
    expect(result.production?.draft?.items.filter((row) =>
      (row.sourceParameters?.normativeSourceIds as readonly string[] | undefined)
        ?.includes(GERFLOR_6086_SKIRTING_SOURCE_ID))).toHaveLength(1);
    expect(result.production?.draft?.items.some((row) =>
      row.sourceParameters?.rowCode === `${inventory.canonical_technology_id}:row:primary_material`))
      .toBe(false);
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
      source_document_version: "2026.09-gerflor-forbo-source-review-r2",
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
      source_document_version: "2026.09-legrand-p31-primary-review-r2",
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
      source_document_version: "2026.09-wavin-hep2o-primary-review-r2",
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
