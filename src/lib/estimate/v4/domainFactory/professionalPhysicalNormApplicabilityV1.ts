import airConditioningNormPack from "../../../../../data/estimate-norms/professional/air_conditioning.json";
import baseboardsNormPack from "../../../../../data/estimate-norms/professional/baseboards.json";
import ceilingsNormPack from "../../../../../data/estimate-norms/professional/ceilings.json";
import concreteNormPack from "../../../../../data/estimate-norms/professional/concrete.json";
import drywallNormPack from "../../../../../data/estimate-norms/professional/drywall.json";
import electricalNormPack from "../../../../../data/estimate-norms/professional/electrical.json";
import flooringNormPack from "../../../../../data/estimate-norms/professional/flooring.json";
import heatingNormPack from "../../../../../data/estimate-norms/professional/heating.json";
import paintNormPack from "../../../../../data/estimate-norms/professional/paint.json";
import plasterNormPack from "../../../../../data/estimate-norms/professional/plaster.json";
import plumbingNormPack from "../../../../../data/estimate-norms/professional/plumbing.json";
import puttyNormPack from "../../../../../data/estimate-norms/professional/putty.json";
import roadworksNormPack from "../../../../../data/estimate-norms/professional/roadworks.json";
import screedNormPack from "../../../../../data/estimate-norms/professional/screed.json";
import tileNormPack from "../../../../../data/estimate-norms/professional/tile.json";
import ventilationNormPack from "../../../../../data/estimate-norms/professional/ventilation.json";
import waterproofingNormPack from "../../../../../data/estimate-norms/professional/waterproofing.json";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import {
  resolveSarnafilAt18Field80MmPhysicalNormV1,
  SARNAFIL_AT18_FIELD_80MM_PRODUCT_PROFILE_ID,
  SARNAFIL_AT18_FIELD_80MM_RUNTIME_BINDING_V1,
} from "./roofingSarnafilAt18PhysicalNormV1";
import {
  resolveRockwoolComfortboard80R6338MmPhysicalNormV1,
  ROCKWOOL_COMFORTBOARD80_R63_38MM_PRODUCT_PROFILE_ID,
  ROCKWOOL_COMFORTBOARD80_R63_38MM_RUNTIME_BINDING_V1,
} from "./insulationRockwoolComfortboard80PhysicalNormV1";
import {
  resolveSiemensSintesoFdb221PhysicalNormV1,
  SIEMENS_SINTESO_FDB221_PRODUCT_PROFILE_ID,
  SIEMENS_SINTESO_FDB221_RUNTIME_BINDING_V1,
} from "./fireSafetySiemensFdb221PhysicalNormV1";
import {
  LEGRAND_049272_BUS_SCS_PRODUCT_PROFILE_ID,
  LEGRAND_049272_BUS_SCS_RUNTIME_BINDING_V1,
  resolveLegrand049272BusScsPhysicalNormV1,
} from "./lowVoltageLegrand049272PhysicalNormV1";
import type {
  ProfessionalEstimateScopeModeV4,
  ProfessionalParameterValueV4,
} from "../professionalProjectAssemblyV4";

export const PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1 =
  "professional-physical-norm-applicability:v1" as const;

export const KRER27_06_020_HOT_ASPHALT_40MM_PRODUCT_PROFILE_ID =
  "normative-profile:kg-krer27-06-020:hot-asphalt-40mm-single-layer:v1" as const;

export const KRER27_06_020_HOT_ASPHALT_40MM_NORM_ID =
  "roadworks_krer27_06_020_norm_unit_per_m2_v1" as const;

export const KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_ID =
  `src_professional_norm_pack_${KRER27_06_020_HOT_ASPHALT_40MM_NORM_ID}` as const;

const KRER27_06_020_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "pavement_area_m2",
  "pavement_area_measurement_basis_m2",
  "mixture_kind",
  "mixture_type_and_density_class",
  "aggregate_size_mm",
  "layer_thickness_mm",
  "selected_krer27_table_code",
  "selected_table_variant",
  "selected_table_variant_work_composition",
  "selected_table_resource_rows",
  "selected_collection_edition_and_amendments",
  "pavement_design_and_compaction_specification",
  "current_price_level_and_regional_indices",
  "estimator_approval_reference",
] as const);

export const UPONOR_UFH_150MM_PRODUCT_PROFILE_ID =
  "manufacturer-profile:uponor-underfloor-heating:150mm:v1" as const;

export const UPONOR_UFH_150MM_NORM_ID =
  "heating_uponor_ufh_pipe_m_m2_150mm_spacing_v1" as const;

export const UPONOR_UFH_150MM_SOURCE_ID =
  `src_professional_norm_pack_${UPONOR_UFH_150MM_NORM_ID}` as const;

const UPONOR_UFH_150MM_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "zone_area_m2",
  "designed_pipe_spacing_mm",
  "manifold_location",
  "feed_tail_length_linear_m",
  "loop_length_limit",
  "hydraulic_loop_design_reference",
  "circuit_count",
  "manifold_outlet_count",
  "longest_circuit_length_m",
] as const);

export const LINDAB_VSR_PRODUCT_PROFILE_ID =
  "manufacturer-profile:lindab-vsr-ventiduct:v1" as const;

export const LINDAB_VSR_NORM_ID =
  "ventilation_lindab_vsr_duct_linear_m_route_v1" as const;

export const LINDAB_VSR_SOURCE_ID =
  `src_professional_norm_pack_${LINDAB_VSR_NORM_ID}` as const;

const LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "route_length_m",
  "duct_diameter_mm",
  "nozzle_pattern",
  "air_distribution_design",
  "fitting_schedule",
  "cooled_supply_air_confirmed",
] as const);

export const DAIKIN_3MXS_K_PRODUCT_PROFILE_ID =
  "manufacturer-profile:daikin-3mxs-k:r410a:v1" as const;

export const DAIKIN_3MXS_K_NORM_ID =
  "air_conditioning_daikin_3mxs_k_additional_refrigerant_kg_m_v1" as const;

export const DAIKIN_3MXS_K_SOURCE_ID =
  `src_professional_norm_pack_${DAIKIN_3MXS_K_NORM_ID}` as const;

const DAIKIN_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "equipment_model",
  "manufacturer_system_profile_id",
  "refrigerant_type",
  "total_refrigerant_piping_length_m",
  "outdoor_unit_nameplate_reference",
  "maximum_piping_and_height_limits_confirmed",
] as const);

const KNAUF_D112_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "area_m2",
  "length_m",
  "width_m",
  "system_passport_reference",
  "system_variant",
  "substrate_type",
  "substrate_fastener_reference",
  "substrate_fastener_approved",
  "ceiling_perimeter_anchor_spacing_m",
] as const);

export const KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID =
  "manufacturer-profile:knauf-d112:standard-12.5mm-single-layer:reference-10x10:v1" as const;

export const KNAUF_D112_WALL_FASTENER_NORM_ID =
  "ceilings_knauf_d112_standard_wall_fastener_piece_m2_v1" as const;

export const KNAUF_D112_WALL_FASTENER_SOURCE_ID =
  `src_professional_norm_pack_${KNAUF_D112_WALL_FASTENER_NORM_ID}` as const;

export const KNAUF_D112_SUBSTRUCTURE_ANCHOR_NORM_ID =
  "ceilings_knauf_d112_standard_substructure_anchor_piece_m2_v1" as const;

export const KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_ID =
  `src_professional_norm_pack_${KNAUF_D112_SUBSTRUCTURE_ANCHOR_NORM_ID}` as const;

const KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_PARAMETER_IDS = Object.freeze([
  "ceiling_area_m2",
  "system_variant",
  "substrate_type",
  "load_class_kn_m2",
] as const);

const KNAUF_D112_SUBSTRUCTURE_ANCHOR_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "area_m2",
  "system_variant",
  "substrate_type",
  "load_class_kn_m2",
  "ceiling_hanger_spacing_m",
  "ceiling_primary_profile_spacing_m",
  "ceiling_secondary_profile_spacing_m",
  "substructure_anchor_reference",
  "substructure_anchor_approved",
  "d112_substructure_manufacturer_excludes_loss_and_waste_confirmed",
  "system_passport_reference",
  "material_certificate_reference",
] as const);

export const KNAUF_D112_BOARD_NORM_ID =
  "ceilings_knauf_d112_standard_board_m2_m2_v1" as const;

export const KNAUF_D112_BOARD_SOURCE_ID =
  `src_professional_norm_pack_${KNAUF_D112_BOARD_NORM_ID}` as const;

const KNAUF_D112_BOARD_SOURCE_PARAMETER_IDS = Object.freeze([
  "ceiling_area_m2",
  "system_variant",
  "board_type",
  "board_thickness_mm",
] as const);

const KNAUF_D112_BOARD_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "area_m2",
  "system_variant",
  "board_type",
  "board_thickness_mm",
  "board_layer_count",
  "selected_board_length_mm",
  "selected_board_width_mm",
  "selected_board_layout_piece_count",
  "d112_board_layout_reference",
  "d112_board_manufacturer_excludes_loss_and_waste_confirmed",
  "system_passport_reference",
  "material_certificate_reference",
] as const);

export const KNAUF_D112_UD_RUNNER_NORM_ID =
  "ceilings_knauf_d112_standard_ud_runner_linear_m_m2_v1" as const;

export const KNAUF_D112_UD_RUNNER_SOURCE_ID =
  `src_professional_norm_pack_${KNAUF_D112_UD_RUNNER_NORM_ID}` as const;

const KNAUF_D112_UD_RUNNER_SOURCE_PARAMETER_IDS = Object.freeze([
  "ceiling_area_m2",
  "system_variant",
  "room_length_m",
  "room_width_m",
  "room_perimeter_m",
  "selected_profile_piece_length_m",
  "current_regional_system_approval",
] as const);

const KNAUF_D112_UD_RUNNER_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "area_m2",
  "length_m",
  "width_m",
  "perimeter_m",
  "system_variant",
  "selected_profile_piece_length_m",
  "current_regional_system_approval",
  "d112_ud_runner_manufacturer_excludes_loss_and_waste_confirmed",
  "system_passport_reference",
  "material_certificate_reference",
] as const);

export const KNAUF_D112_JOINT_TAPE_NORM_ID =
  "ceilings_knauf_d112_standard_joint_tape_linear_m_m2_v1" as const;

export const KNAUF_D112_JOINT_TAPE_SOURCE_ID =
  `src_professional_norm_pack_${KNAUF_D112_JOINT_TAPE_NORM_ID}` as const;

const KNAUF_D112_JOINT_TAPE_SOURCE_PARAMETER_IDS = Object.freeze([
  "ceiling_area_m2",
  "system_variant",
  "cut_edge_jointing_required",
] as const);

const KNAUF_D112_JOINT_TAPE_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "area_m2",
  "system_variant",
  "cut_edge_jointing_required",
  "selected_joint_tape_roll_length_m",
  "selected_joint_tape_reference",
  "d112_cut_edge_joint_layout_reference",
  "d112_joint_tape_manufacturer_excludes_loss_and_waste_confirmed",
  "system_passport_reference",
  "material_certificate_reference",
] as const);

export const KNAUF_D112_TN25_SCREW_NORM_ID =
  "ceilings_knauf_d112_standard_tn25_screw_piece_m2_v1" as const;

export const KNAUF_D112_TN25_SCREW_SOURCE_ID =
  `src_professional_norm_pack_${KNAUF_D112_TN25_SCREW_NORM_ID}` as const;

const KNAUF_D112_TN25_SOURCE_PARAMETER_IDS = Object.freeze([
  "ceiling_area_m2",
  "system_variant",
  "board_layer_count",
  "board_thickness_mm",
] as const);

const KNAUF_D112_TN25_BOARD_THICKNESS_MM = 12.5 as const;

const KNAUF_D112_TN25_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "area_m2",
  "length_m",
  "width_m",
  "system_passport_reference",
  "system_variant",
  "board_layer_count",
  "board_thickness_mm",
] as const);

export const KNAUF_D112_UNIFLOTT_NORM_ID =
  "ceilings_knauf_d112_standard_uniflott_kg_m2_v1" as const;

export const KNAUF_D112_UNIFLOTT_SOURCE_ID =
  `src_professional_norm_pack_${KNAUF_D112_UNIFLOTT_NORM_ID}` as const;

const KNAUF_D112_UNIFLOTT_SOURCE_PARAMETER_IDS = Object.freeze([
  "ceiling_area_m2",
  "system_variant",
  "joint_filling_method",
] as const);

const KNAUF_D112_UNIFLOTT_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "area_m2",
  "system_variant",
  "joint_filling_method",
  "d112_uniflott_selected_bag_size_kg",
  "d112_manufacturer_excludes_loss_and_waste_confirmed",
  "system_passport_reference",
  "material_certificate_reference",
] as const);

export const KNAUF_FUGENFUELLER_PERIMETER_PRODUCT_PROFILE_ID =
  "manufacturer-profile:knauf-fugenfueller-leicht:perimeter-joint:25kg:v1" as const;

export const KNAUF_FUGENFUELLER_PERIMETER_NORM_ID =
  "drywall_knauf_fugenfueller_perimeter_joint_kg_linear_m_v1" as const;

export const KNAUF_FUGENFUELLER_PERIMETER_SOURCE_ID =
  `src_professional_norm_pack_${KNAUF_FUGENFUELLER_PERIMETER_NORM_ID}` as const;

export const KNAUF_FUGENFUELLER_JOINTING_PRODUCT_PROFILE_ID =
  "manufacturer-profile:knauf-fugenfueller-leicht:single-12.5mm-hrak-ceiling-jointing:v1" as const;

export const KNAUF_FUGENFUELLER_JOINTING_NORM_ID =
  "drywall_knauf_fugenfueller_leicht_jointing_kg_m2_v1" as const;

export const KNAUF_FUGENFUELLER_JOINTING_SOURCE_ID =
  `src_professional_norm_pack_${KNAUF_FUGENFUELLER_JOINTING_NORM_ID}` as const;

const KNAUF_FUGENFUELLER_JOINTING_SOURCE_PARAMETER_IDS = Object.freeze([
  "board_area_m2",
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
] as const);

const KNAUF_FUGENFUELLER_JOINTING_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "area_m2",
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
  "system_passport_reference",
  "material_certificate_reference",
] as const);

export const FORBO_232_MOUNTING_ADHESIVE_PRODUCT_PROFILE_ID =
  "manufacturer-profile:forbo-eurocol-232-eurosol-montage:310ml:v1" as const;

export const FORBO_232_MOUNTING_ADHESIVE_NORM_ID =
  "baseboards_forbo_232_mounting_adhesive_upper_ml_linear_m_v1" as const;

export const FORBO_232_MOUNTING_ADHESIVE_SOURCE_ID =
  `src_professional_norm_pack_${FORBO_232_MOUNTING_ADHESIVE_NORM_ID}` as const;

const FORBO_232_MOUNTING_ADHESIVE_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "skirting_length_linear_m",
  "skirting_material",
  "substrate_type",
  "selected_adhesive_product",
  "adhesive_profile_mode",
  "adhesive_consumption_ml_linear_m",
  "substrate_ready_confirmed",
  "processing_conditions_confirmed",
  "ventilation_fire_controls_confirmed",
  "manufacturer_instruction_reference",
] as const);

export const GERFLOR_6086_SKIRTING_PRODUCT_PROFILE_ID =
  "manufacturer-profile:gerflor-design-skirting:6086:2m:v1" as const;

export const GERFLOR_6086_SKIRTING_NORM_ID =
  "baseboards_gerflor_design_skirting_linear_m_perimeter_v1" as const;

export const GERFLOR_6086_SKIRTING_SOURCE_ID =
  `src_professional_norm_pack_${GERFLOR_6086_SKIRTING_NORM_ID}` as const;

const GERFLOR_6086_SKIRTING_SOURCE_PARAMETER_IDS = Object.freeze([
  "finished_perimeter_linear_m",
  "inside_corner_count",
  "outside_corner_count",
  "selected_skirting_product",
] as const);

const GERFLOR_6086_SKIRTING_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  ...GERFLOR_6086_SKIRTING_SOURCE_PARAMETER_IDS,
  "gerflor_piece_length_m",
  "gerflor_packaging_confirmed",
  "gerflor_corner_cutting_method_reference",
  "gerflor_corner_allowance_not_assumed_confirmed",
  "gerflor_installation_surface_prepared_plane_confirmed",
  "gerflor_manufacturer_instruction_reference",
  "material_certificate_reference",
] as const);

export const CERESIT_CN69_GLOBAL_25KG_PRODUCT_PROFILE_ID =
  "manufacturer-profile:ceresit-cn69:global-25kg:C_CN69_TDS_1_0420:v1" as const;

export const CERESIT_CN69_GLOBAL_25KG_NORM_ID =
  "flooring_ceresit_cn69_self_leveling_scope_2_10mm_v1" as const;

export const CERESIT_CN69_GLOBAL_25KG_SOURCE_ID =
  `src_professional_norm_pack_${CERESIT_CN69_GLOBAL_25KG_NORM_ID}` as const;

const CERESIT_CN69_GLOBAL_25KG_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "area_m2",
  "layer_thickness_mm",
  "cn69_substrate_type",
  "dry_indoor_use_confirmed",
  "moisture_ingress_prevented",
  "substrate_preparation_confirmed",
  "installation_conditions_confirmed",
  "cn69_global_25kg_tds_variant_confirmed",
  "selected_bag_size_kg",
] as const);

export const CERESIT_CT29_INTERIOR_WALL_PLASTER_PRODUCT_PROFILE_ID =
  "manufacturer-profile:ceresit-ct29:C_CT29_TDS_1_0120:interior-wall-plaster:v1" as const;

export const CERESIT_CT29_INTERIOR_WALL_PLASTER_NORM_ID =
  "plaster_ceresit_ct29_kg_m2_mm_v1" as const;

export const CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_ID =
  `src_professional_norm_pack_${CERESIT_CT29_INTERIOR_WALL_PLASTER_NORM_ID}` as const;

const CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_PARAMETER_IDS = Object.freeze([
  "area_m2",
  "layer_thickness_mm",
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
] as const);

const CERESIT_CT29_INTERIOR_WALL_PLASTER_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  ...CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_PARAMETER_IDS,
  "surface_type",
] as const);

export const CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_PRODUCT_PROFILE_ID =
  "manufacturer-profile:ceresit-ct126:C_CT126_TDS_1_0321:dry-interior-wall-putty:v1" as const;

export const CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_NORM_ID =
  "putty_ceresit_ct126_kg_m2_mm_v1" as const;

export const CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_ID =
  `src_professional_norm_pack_${CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_NORM_ID}` as const;

const CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_PARAMETER_IDS = Object.freeze([
  "area_m2",
  "layer_thickness_mm",
  "substrate_type",
  "substrate_load_bearing_dry_clean_confirmed",
  "substrate_preparation_system",
  "dry_interior_no_permanent_humidity_confirmed",
  "application_temperature_confirmed",
  "ct126_tds_variant_confirmed",
  "selected_bag_size_kg",
] as const);

const CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  ...CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_PARAMETER_IDS,
  "surface_type",
] as const);

export const CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID =
  "manufacturer-profile:ceresit-ct127:C_CT127_TDS_1_0120:dry-interior-finish-putty:v1" as const;

export const CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_NORM_ID =
  "putty_ceresit_ct127_finish_layer_max_2mm_v1" as const;

export const CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_ID =
  `src_professional_norm_pack_${CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_NORM_ID}` as const;

const CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_PARAMETER_IDS = Object.freeze([
  "area_m2",
  "layer_thickness_mm",
  "substrate_type",
  "substrate_absorbency",
  "substrate_load_bearing_dry_clean_confirmed",
  "substrate_preparation_system",
  "selected_consumption_kg_m2",
  "dry_interior_no_permanent_humidity_confirmed",
  "application_temperature_confirmed",
  "selected_bag_size_kg",
] as const);

const CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  ...CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_PARAMETER_IDS,
  "surface_type",
] as const);

export const CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_PRODUCT_PROFILE_ID =
  "manufacturer-profile:ceresit-cl51:03-2024:indoor-ceramic-wet-zone:v1" as const;

export const CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_NORM_ID =
  "waterproofing_ceresit_cl51_two_coats_kg_m2_v1" as const;

export const CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_ID =
  `src_professional_norm_pack_${CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_NORM_ID}` as const;

const CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "area_m2",
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
] as const);

export const CERESIT_CN87_50MM_SCREED_PRODUCT_PROFILE_ID =
  "manufacturer-profile:ceresit-cn87:CN_87_KT_10.21:50mm-screed:25kg:v1" as const;

export const CERESIT_CN87_50MM_SCREED_NORM_ID =
  "screed_cement_sand_mix_kg_m2_50mm_v1" as const;

export const CERESIT_CN87_50MM_SCREED_SOURCE_ID =
  `src_professional_norm_pack_${CERESIT_CN87_50MM_SCREED_NORM_ID}` as const;

const CERESIT_CN87_50MM_SCREED_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "area_m2",
  "layer_thickness_mm",
  "screed_construction_type",
  "underfloor_heating",
  "heating_pipe_outer_diameter_mm",
  "substrate_condition_confirmed",
  "joint_layout_confirmed",
  "selected_bag_size_kg",
] as const);

export const CERESIT_CT17_FLOORING_PRIMER_NORM_ID =
  "flooring_ceresit_ct17_primer_flooring_l_m2_v1" as const;

export const CERESIT_CT17_FLOORING_PRIMER_SOURCE_ID =
  `src_professional_norm_pack_${CERESIT_CT17_FLOORING_PRIMER_NORM_ID}` as const;

const CERESIT_CT17_FLOORING_PRIMER_SOURCE_PARAMETER_IDS = Object.freeze([
  "area_m2",
  "substrate_evenness",
  "substrate_absorbency",
  "selected_consumption_l_m2",
  "coat_count",
  "substrate_dry_load_bearing_clean_confirmed",
  "selected_container_size_l",
] as const);

const CERESIT_CT17_FLOORING_PRIMER_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "area_m2",
  "cn69_substrate_type",
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
] as const);

export const CERESIT_CM11_SMALL_CERAMIC_INDOOR_PRODUCT_PROFILE_ID =
  "manufacturer-profile:ceresit-cm11-plus:global-04-2026:ceramic-up-to-10cm-4mm-indoor-horizontal:25kg:v1" as const;

export const CERESIT_CM11_SMALL_CERAMIC_INDOOR_NORM_ID =
  "tile_ceresit_cm11_plus_adhesive_kg_m2_notch_4_12_v1" as const;

export const CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_ID =
  `src_professional_norm_pack_${CERESIT_CM11_SMALL_CERAMIC_INDOOR_NORM_ID}` as const;

const CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_PARAMETER_IDS = Object.freeze([
  "area_m2",
  "tile_type",
  "tile_size_category",
  "trowel_notch_mm",
  "substrate_type",
  "substrate_even_load_bearing_compact_confirmed",
  "substrate_dry_clean_confirmed",
  "installation_location",
  "floating_buttering_requirement_confirmed",
  "application_temperature_confirmed",
  "cm11_global_tds_variant_confirmed",
  "selected_package_size_kg",
] as const);

const CERESIT_CM11_SMALL_CERAMIC_INDOOR_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  ...CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_PARAMETER_IDS,
  "installation_orientation",
  "minimum_tile_back_contact_percent",
  "manufacturer_tds_reference",
  "material_certificate_reference",
] as const);

export const CERESIT_CT17_TILE_PRIMER_NORM_ID =
  "tile_ceresit_ct17_primer_l_m2_absorbent_substrate_v1" as const;

export const CERESIT_CT17_TILE_PRIMER_SOURCE_ID =
  `src_professional_norm_pack_${CERESIT_CT17_TILE_PRIMER_NORM_ID}` as const;

const CERESIT_CT17_TILE_PRIMER_SOURCE_PARAMETER_IDS = Object.freeze([
  "area_m2",
  "substrate_type",
  "substrate_evenness",
  "substrate_absorbency",
  "selected_consumption_l_m2",
  "coat_count",
  "substrate_dry_load_bearing_clean_confirmed",
  "drying_rule_confirmed",
  "application_conditions_confirmed",
  "selected_container_size_l",
] as const);

const CERESIT_CT17_TILE_PRIMER_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "area_m2",
  "substrate_type",
  "ct17_tile_substrate_evenness",
  "ct17_tile_substrate_absorbency",
  "ct17_tile_selected_consumption_l_m2",
  "ct17_tile_coat_count",
  "substrate_even_load_bearing_compact_confirmed",
  "substrate_dry_clean_confirmed",
  "ct17_tile_drying_rule_confirmed",
  "ct17_tile_cement_wait_minutes",
  "ct17_tile_application_conditions_confirmed",
  "ct17_tile_relative_humidity_percent",
  "ct17_tile_selected_container_size_l",
  "ct17_tile_tds_confirmed",
  "ct17_tile_additional_waste_not_published_confirmed",
  "ct17_tile_tds_reference",
  "ct17_tile_material_certificate_reference",
] as const);

export const CERESIT_CT54_CT17_INTERIOR_WALL_PRODUCT_PROFILE_ID =
  "manufacturer-profile:ceresit-ct54-ct17:interior-wall:two-coats:v1" as const;

export const CERESIT_CT54_INTERIOR_WALL_NORM_ID =
  "paint_ceresit_ct54_silicate_two_coats_l_m2_v1" as const;

export const CERESIT_CT54_INTERIOR_WALL_SOURCE_ID =
  `src_professional_norm_pack_${CERESIT_CT54_INTERIOR_WALL_NORM_ID}` as const;

export const CERESIT_CT17_PAINT_PRIMER_NORM_ID =
  "paint_ceresit_ct17_primer_l_m2_before_paint_v1" as const;

export const CERESIT_CT17_PAINT_PRIMER_SOURCE_ID =
  `src_professional_norm_pack_${CERESIT_CT17_PAINT_PRIMER_NORM_ID}` as const;

export const NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID =
  "method-profile:nrmca-cip31:ready-mix-order:v1" as const;

export const NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID =
  "concrete_nrmca_cip31_selected_contingency_m3_m3_v1" as const;

export const NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID =
  `src_professional_norm_pack_${NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID}` as const;

const NRMCA_CIP31_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "plan_dimension_concrete_volume_m3",
  "plan_volume_calculation_reference",
  "mix_design_or_project_specification_reference",
  "mixture_designation",
  "placement_location",
  "placement_method",
  "selected_contingency_percent",
  "contingency_selection_justification",
  "delivery_schedule_and_truck_capacity",
  "producer_order_confirmation",
  "estimator_approval_reference",
] as const);

const CERESIT_CT54_SOURCE_PARAMETER_IDS = Object.freeze([
  "area_m2",
  "coat_count",
  "substrate_type",
  "substrate_absorption",
  "substrate_smoothness",
  "substrate_carrying_smooth_dry_clean_confirmed",
  "installation_location",
  "intercoat_break_hours",
  "application_conditions_confirmed",
  "facade_rain_protection_confirmed",
  "ct54_tds_variant_confirmed",
  "selected_container_size_l",
] as const);

const CERESIT_CT54_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "area_m2",
  "selected_paint_product",
  "ct54_coat_count",
  "ct54_substrate_type",
  "ct54_substrate_absorption",
  "ct54_substrate_smoothness",
  "ct54_substrate_carrying_smooth_dry_clean_confirmed",
  "ct54_installation_location",
  "ct54_intercoat_break_hours",
  "ct54_application_conditions_confirmed",
  "ct54_application_temperature_c",
  "ct54_relative_humidity_percent",
  "ct54_facade_rain_protection_confirmed",
  "ct54_tds_variant_confirmed",
  "ct54_project_average_rate_confirmed",
  "ct54_selected_container_size_l",
  "ct54_additional_waste_not_published_confirmed",
  "ct54_tds_reference",
  "ct54_material_certificate_reference",
] as const);

const CERESIT_CT17_PAINT_SOURCE_PARAMETER_IDS = Object.freeze([
  "area_m2",
  "substrate_type",
  "substrate_evenness",
  "substrate_absorbency",
  "selected_consumption_l_m2",
  "dilution_ratio",
  "coat_count",
  "substrate_dry_load_bearing_clean_confirmed",
  "complete_drying_confirmed",
  "application_conditions_confirmed",
  "selected_container_size_l",
] as const);

const CERESIT_CT17_PAINT_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "area_m2",
  "selected_primer_product",
  "ct17_paint_substrate_type",
  "ct17_paint_substrate_evenness",
  "ct17_paint_substrate_absorbency",
  "ct17_paint_selected_consumption_l_m2",
  "ct17_paint_dilution_ratio",
  "ct17_paint_coat_count",
  "ct17_paint_substrate_dry_load_bearing_clean_confirmed",
  "ct17_paint_complete_drying_confirmed",
  "ct17_paint_application_conditions_confirmed",
  "ct17_paint_application_temperature_c",
  "ct17_paint_relative_humidity_percent",
  "ct17_paint_selected_container_size_l",
  "ct17_paint_additional_waste_not_published_confirmed",
  "ct17_paint_tds_confirmed",
  "ct17_paint_tds_reference",
  "ct17_paint_material_certificate_reference",
] as const);

export const LEGRAND_P31_TRAY_PRODUCT_PROFILE_ID =
  "manufacturer-profile:legrand-p31:symmetrical-tray:75-300mm:v1" as const;

export const LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID =
  "electrical_legrand_p31_tray_joint_m6_fasteners_piece_joint_v1" as const;

export const LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_ID =
  `src_professional_norm_pack_${LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID}` as const;

export const WAVIN_HEP2O_PUSH_FIT_PRODUCT_PROFILE_ID =
  "manufacturer-profile:wavin-hep2o:push-fit:v1" as const;

export const WAVIN_HEP2O_SMARTSLEEVE_NORM_ID =
  "plumbing_wavin_hep2o_smartsleeve_piece_connection_v1" as const;

export const WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID =
  `src_professional_norm_pack_${WAVIN_HEP2O_SMARTSLEEVE_NORM_ID}` as const;

export const WAVIN_HEP2O_15MM_HORIZONTAL_CLIP_NORM_ID =
  "plumbing_wavin_hep2o_15mm_horizontal_clip_spacing_v1" as const;

export const WAVIN_HEP2O_22MM_HORIZONTAL_CLIP_NORM_ID =
  "plumbing_wavin_hep2o_22mm_horizontal_clip_spacing_v1" as const;

export const WAVIN_HEP2O_15MM_VERTICAL_CLIP_NORM_ID =
  "plumbing_wavin_hep2o_15mm_vertical_clip_spacing_v1" as const;

export const WAVIN_HEP2O_15MM_HORIZONTAL_CLIP_SOURCE_ID =
  `src_professional_norm_pack_${WAVIN_HEP2O_15MM_HORIZONTAL_CLIP_NORM_ID}` as const;

export const WAVIN_HEP2O_22MM_HORIZONTAL_CLIP_SOURCE_ID =
  `src_professional_norm_pack_${WAVIN_HEP2O_22MM_HORIZONTAL_CLIP_NORM_ID}` as const;

export const WAVIN_HEP2O_15MM_VERTICAL_CLIP_SOURCE_ID =
  `src_professional_norm_pack_${WAVIN_HEP2O_15MM_VERTICAL_CLIP_NORM_ID}` as const;

const WAVIN_HEP2O_SMARTSLEEVE_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "exact_material_or_equipment",
  "pipe_material_and_class",
  "jointing_method",
  "connection_count",
  "prepared_pipe_end_count",
  "hep2o_system_variant",
  "hep2o_joint_topology_reference",
] as const);

const WAVIN_HEP2O_CLIP_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "route_length_m",
  "nominal_diameter_mm",
  "hep2o_support_orientation",
  "hep2o_support_span_lengths_m",
  "hep2o_support_anchor_node_count",
  "hep2o_support_layout_reference",
  "hep2o_support_anchor_positions_verified",
] as const);

const WAVIN_HEP2O_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  ...WAVIN_HEP2O_SMARTSLEEVE_REQUIRED_EXPLICIT_PARAMETER_IDS,
  ...WAVIN_HEP2O_CLIP_REQUIRED_EXPLICIT_PARAMETER_IDS,
] as const);

const uponorNorm = (() => {
  const found = heatingNormPack.norm_items.find((item) => item.norm_id === UPONOR_UFH_150MM_NORM_ID);
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${UPONOR_UFH_150MM_NORM_ID}`);
  return found;
})();
if (
  heatingNormPack.work_group !== "heating" ||
  uponorNorm.unit !== "linear_m" ||
  uponorNorm.rate.value !== 6.7 ||
  uponorNorm.rate.unit !== "pipe linear m/heated floor m2 at 150 mm spacing, excluding feed and tail lengths" ||
  uponorNorm.applicability.pipe_spacing_mm !== 150 ||
  uponorNorm.applicability.feed_and_tail_lengths_must_be_added !== true ||
  uponorNorm.applicability.heat_loss_hydraulic_loop_and_manifold_design_required !== true ||
  uponorNorm.applicability.other_spacing_values_require_their_own_table_row !== true ||
  uponorNorm.parameters.length !== UPONOR_UFH_150MM_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  UPONOR_UFH_150MM_REQUIRED_EXPLICIT_PARAMETER_IDS.some(
    (parameterId) => !uponorNorm.parameters.includes(parameterId),
  ) ||
  uponorNorm.rounding.package_unit !== "not_applicable" ||
  uponorNorm.rounding.package_size !== 1 ||
  uponorNorm.rounding.mode !== "no_package_rounding_apply_exact_manufacturer_formula"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${UPONOR_UFH_150MM_NORM_ID}`);
}

export const UPONOR_UFH_150MM_SOURCE_METADATA = Object.freeze({
  source_id: UPONOR_UFH_150MM_SOURCE_ID,
  norm_id: UPONOR_UFH_150MM_NORM_ID,
  source_document_version: heatingNormPack.source_pack_version,
  source_title: uponorNorm.source.title,
  source_url: uponorNorm.source.url,
  exact_locator: uponorNorm.source.page,
  rate_value: uponorNorm.rate.value,
  rate_unit: uponorNorm.rate.unit,
  pipe_spacing_mm: uponorNorm.applicability.pipe_spacing_mm,
  definition_hash: estimateDeterministicHash({
    work_group: heatingNormPack.work_group,
    source_pack_version: heatingNormPack.source_pack_version,
    norm_item: uponorNorm,
  }),
});

const lindabVsrNorm = (() => {
  const found = ventilationNormPack.norm_items.find((item) => item.norm_id === LINDAB_VSR_NORM_ID);
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${LINDAB_VSR_NORM_ID}`);
  return found;
})();

if (
  ventilationNormPack.work_group !== "ventilation" ||
  lindabVsrNorm.unit !== "linear_m" ||
  lindabVsrNorm.rate.unit !== "duct linear m/approved straight route linear m" ||
  lindabVsrNorm.rate.value !== 1 ||
  lindabVsrNorm.parameters.length !== LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS.some(
    (parameterId) => !lindabVsrNorm.parameters.includes(parameterId),
  ) ||
  lindabVsrNorm.applicability.available_diameters_mm.join(",") !== "200,250,315,400,500" ||
  lindabVsrNorm.applicability.maximum_standard_length_m !== 3 ||
  lindabVsrNorm.applicability.primarily_for_cooled_supply_air !== true ||
  lindabVsrNorm.applicability.nozzle_pattern_requires_air_distribution_design !== true ||
  lindabVsrNorm.rounding.package_unit !== "not_applicable" ||
  lindabVsrNorm.rounding.package_size !== 1 ||
  lindabVsrNorm.rounding.mode !== "no_package_rounding_apply_approved_route_length"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${LINDAB_VSR_NORM_ID}`);
}

export const LINDAB_VSR_SOURCE_METADATA = Object.freeze({
  source_id: LINDAB_VSR_SOURCE_ID,
  norm_id: LINDAB_VSR_NORM_ID,
  source_document_version: ventilationNormPack.source_pack_version,
  source_title: lindabVsrNorm.source.title,
  source_url: lindabVsrNorm.source.url,
  exact_locator: lindabVsrNorm.source.page,
  rate_value: lindabVsrNorm.rate.value,
  rate_unit: lindabVsrNorm.rate.unit,
  available_diameters_mm: lindabVsrNorm.applicability.available_diameters_mm,
  maximum_standard_length_m: lindabVsrNorm.applicability.maximum_standard_length_m,
  definition_hash: estimateDeterministicHash({
    work_group: ventilationNormPack.work_group,
    source_pack_version: ventilationNormPack.source_pack_version,
    norm_item: lindabVsrNorm,
  }),
});

const daikin3MxsKNorm = (() => {
  const found = airConditioningNormPack.norm_items.find((item) => item.norm_id === DAIKIN_3MXS_K_NORM_ID);
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${DAIKIN_3MXS_K_NORM_ID}`);
  return found;
})();

if (
  airConditioningNormPack.work_group !== "air_conditioning" ||
  daikin3MxsKNorm.unit !== "kg" ||
  daikin3MxsKNorm.rate.value !== 0.02 ||
  daikin3MxsKNorm.rate.unit !== "kg/m of total piping length exceeding 30 m" ||
  daikin3MxsKNorm.applicability.refrigerant !== "R-410A" ||
  daikin3MxsKNorm.applicability.factory_chargeless_length_m !== 30 ||
  daikin3MxsKNorm.applicability.maximum_total_piping_length_m !== 50 ||
  daikin3MxsKNorm.applicability.maximum_piping_to_each_indoor_unit_m !== 25 ||
  daikin3MxsKNorm.applicability.maximum_outdoor_to_indoor_height_difference_m !== 15 ||
  daikin3MxsKNorm.applicability.maximum_indoor_to_indoor_height_difference_m !== 7.5 ||
  daikin3MxsKNorm.applicability.model_nameplate_and_installation_manual_must_be_confirmed !== true ||
  daikin3MxsKNorm.applicability.other_daikin_or_other_manufacturer_models_forbidden !== true ||
  daikin3MxsKNorm.applicability.maximum_piping_and_height_difference_limits_require_separate_check !== true ||
  daikin3MxsKNorm.parameters.length !== DAIKIN_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  DAIKIN_REQUIRED_EXPLICIT_PARAMETER_IDS.some(
    (parameterId) => !daikin3MxsKNorm.parameters.includes(parameterId),
  ) ||
  daikin3MxsKNorm.rounding.package_unit !== "not_applicable" ||
  daikin3MxsKNorm.rounding.package_size !== 1 ||
  daikin3MxsKNorm.rounding.mode !== "no_package_rounding_apply_exact_manufacturer_formula"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${DAIKIN_3MXS_K_NORM_ID}`);
}

export const DAIKIN_3MXS_K_SOURCE_METADATA = Object.freeze({
  source_id: DAIKIN_3MXS_K_SOURCE_ID,
  norm_id: DAIKIN_3MXS_K_NORM_ID,
  source_document_version: airConditioningNormPack.source_pack_version,
  source_title: daikin3MxsKNorm.source.title,
  source_url: daikin3MxsKNorm.source.url,
  exact_locator: daikin3MxsKNorm.source.page,
  rate_value: daikin3MxsKNorm.rate.value,
  rate_unit: daikin3MxsKNorm.rate.unit,
  refrigerant: daikin3MxsKNorm.applicability.refrigerant,
  factory_chargeless_length_m: daikin3MxsKNorm.applicability.factory_chargeless_length_m,
  maximum_total_piping_length_m: daikin3MxsKNorm.applicability.maximum_total_piping_length_m,
  maximum_piping_to_each_indoor_unit_m: daikin3MxsKNorm.applicability.maximum_piping_to_each_indoor_unit_m,
  maximum_outdoor_to_indoor_height_difference_m:
    daikin3MxsKNorm.applicability.maximum_outdoor_to_indoor_height_difference_m,
  maximum_indoor_to_indoor_height_difference_m:
    daikin3MxsKNorm.applicability.maximum_indoor_to_indoor_height_difference_m,
  definition_hash: estimateDeterministicHash({
    work_group: airConditioningNormPack.work_group,
    source_pack_version: airConditioningNormPack.source_pack_version,
    norm_item: daikin3MxsKNorm,
  }),
});

const knaufD112WallFastenerNorm = (() => {
  const found = ceilingsNormPack.norm_items.find((item) => item.norm_id === KNAUF_D112_WALL_FASTENER_NORM_ID);
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${KNAUF_D112_WALL_FASTENER_NORM_ID}`);
  return found;
})();
const knaufD112ReferenceCeilingM = knaufD112WallFastenerNorm.applicability.reference_ceiling_m;

if (
  ceilingsNormPack.work_group !== "ceilings" ||
  knaufD112WallFastenerNorm.unit !== "piece" ||
  knaufD112WallFastenerNorm.rate.value !== 0.4 ||
  knaufD112WallFastenerNorm.rate.unit !== "piece/m2 for the documented 10 m x 10 m reference ceiling" ||
  knaufD112WallFastenerNorm.applicability.system !== "Knauf D112" ||
  knaufD112WallFastenerNorm.applicability.variant !== "standard_12_5_mm_single_layer" ||
  !knaufD112ReferenceCeilingM ||
  knaufD112ReferenceCeilingM[0] !== 10 ||
  knaufD112ReferenceCeilingM[1] !== 10 ||
  knaufD112WallFastenerNorm.applicability.fastener_must_be_approved_for_substrate !== true ||
  knaufD112WallFastenerNorm.applicability.manufacturer_excludes_loss_and_waste !== true ||
  knaufD112WallFastenerNorm.rounding.mode !== "ceil_to_whole_piece_for_exact_10x10_reference_geometry" ||
  knaufD112WallFastenerNorm.parameters.length !== KNAUF_D112_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  KNAUF_D112_REQUIRED_EXPLICIT_PARAMETER_IDS.some(
    (parameterId) => !knaufD112WallFastenerNorm.parameters.includes(parameterId),
  )
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${KNAUF_D112_WALL_FASTENER_NORM_ID}`);
}

export const KNAUF_D112_WALL_FASTENER_SOURCE_METADATA = Object.freeze({
  source_id: KNAUF_D112_WALL_FASTENER_SOURCE_ID,
  norm_id: KNAUF_D112_WALL_FASTENER_NORM_ID,
  source_document_version: ceilingsNormPack.source_pack_version,
  source_title: knaufD112WallFastenerNorm.source.title,
  source_url: knaufD112WallFastenerNorm.source.url,
  exact_locator: knaufD112WallFastenerNorm.source.page,
  rate_value: knaufD112WallFastenerNorm.rate.value,
  rate_unit: knaufD112WallFastenerNorm.rate.unit,
  system: knaufD112WallFastenerNorm.applicability.system,
  variant: knaufD112WallFastenerNorm.applicability.variant,
  reference_ceiling_m: knaufD112ReferenceCeilingM,
  definition_hash: estimateDeterministicHash({
    work_group: ceilingsNormPack.work_group,
    source_pack_version: ceilingsNormPack.source_pack_version,
    norm_item: knaufD112WallFastenerNorm,
  }),
});

const knaufD112SubstructureAnchorNorm = (() => {
  const found = ceilingsNormPack.norm_items.find(
    (item) => item.norm_id === KNAUF_D112_SUBSTRUCTURE_ANCHOR_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${KNAUF_D112_SUBSTRUCTURE_ANCHOR_NORM_ID}`);
  }
  return found;
})();

if (
  ceilingsNormPack.work_group !== "ceilings" ||
  knaufD112SubstructureAnchorNorm.unit !== "piece" ||
  knaufD112SubstructureAnchorNorm.rate.value !== 1.2 ||
  knaufD112SubstructureAnchorNorm.rate.unit !== "piece/m2 for D112 variant 1" ||
  !("system" in knaufD112SubstructureAnchorNorm.applicability) ||
  knaufD112SubstructureAnchorNorm.applicability.system !== "Knauf D112" ||
  !("variant" in knaufD112SubstructureAnchorNorm.applicability) ||
  knaufD112SubstructureAnchorNorm.applicability.variant !== "standard_12_5_mm_single_layer" ||
  !("load_class_max_kn_m2" in knaufD112SubstructureAnchorNorm.applicability) ||
  knaufD112SubstructureAnchorNorm.applicability.load_class_max_kn_m2 !== 0.15 ||
  !("hanger_spacing_max_mm" in knaufD112SubstructureAnchorNorm.applicability) ||
  knaufD112SubstructureAnchorNorm.applicability.hanger_spacing_max_mm !== 950 ||
  !("carrying_channel_spacing_max_mm" in knaufD112SubstructureAnchorNorm.applicability) ||
  knaufD112SubstructureAnchorNorm.applicability.carrying_channel_spacing_max_mm !== 1000 ||
  !("furring_channel_spacing_max_mm" in knaufD112SubstructureAnchorNorm.applicability) ||
  knaufD112SubstructureAnchorNorm.applicability.furring_channel_spacing_max_mm !== 500 ||
  !("manufacturer_excludes_loss_and_waste" in knaufD112SubstructureAnchorNorm.applicability) ||
  knaufD112SubstructureAnchorNorm.applicability.manufacturer_excludes_loss_and_waste !== true ||
  knaufD112SubstructureAnchorNorm.parameters.length !==
    KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_PARAMETER_IDS.length ||
  KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_PARAMETER_IDS.some(
    (parameterId) => !knaufD112SubstructureAnchorNorm.parameters.includes(parameterId),
  ) ||
  knaufD112SubstructureAnchorNorm.waste_percent_default !== 0 ||
  knaufD112SubstructureAnchorNorm.rounding.package_unit !== "piece" ||
  knaufD112SubstructureAnchorNorm.rounding.package_size !== 1 ||
  knaufD112SubstructureAnchorNorm.rounding.mode !==
    "ceil_to_whole_piece_from_d112_reference_average"
) {
  throw new Error(
    `PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${KNAUF_D112_SUBSTRUCTURE_ANCHOR_NORM_ID}`,
  );
}

export const KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_METADATA = Object.freeze({
  source_id: KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_ID,
  norm_id: KNAUF_D112_SUBSTRUCTURE_ANCHOR_NORM_ID,
  source_document_version: ceilingsNormPack.source_pack_version,
  source_title: knaufD112SubstructureAnchorNorm.source.title,
  source_url: knaufD112SubstructureAnchorNorm.source.url,
  exact_locator: knaufD112SubstructureAnchorNorm.source.page,
  rate_value: knaufD112SubstructureAnchorNorm.rate.value,
  rate_unit: knaufD112SubstructureAnchorNorm.rate.unit,
  system: knaufD112SubstructureAnchorNorm.applicability.system,
  variant: knaufD112SubstructureAnchorNorm.applicability.variant,
  load_class_max_kn_m2: knaufD112SubstructureAnchorNorm.applicability.load_class_max_kn_m2,
  hanger_spacing_max_mm: knaufD112SubstructureAnchorNorm.applicability.hanger_spacing_max_mm,
  carrying_channel_spacing_max_mm:
    knaufD112SubstructureAnchorNorm.applicability.carrying_channel_spacing_max_mm,
  furring_channel_spacing_max_mm:
    knaufD112SubstructureAnchorNorm.applicability.furring_channel_spacing_max_mm,
  manufacturer_excludes_loss_and_waste:
    knaufD112SubstructureAnchorNorm.applicability.manufacturer_excludes_loss_and_waste,
  definition_hash: estimateDeterministicHash({
    work_group: ceilingsNormPack.work_group,
    source_pack_version: ceilingsNormPack.source_pack_version,
    norm_item: knaufD112SubstructureAnchorNorm,
  }),
});

const knaufD112BoardNorm = (() => {
  const found = ceilingsNormPack.norm_items.find(
    (item) => item.norm_id === KNAUF_D112_BOARD_NORM_ID,
  );
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${KNAUF_D112_BOARD_NORM_ID}`);
  return found;
})();

if (
  ceilingsNormPack.work_group !== "ceilings" ||
  knaufD112BoardNorm.unit !== "m2" ||
  knaufD112BoardNorm.rate.value !== 1 ||
  knaufD112BoardNorm.rate.unit !== "m2/m2 for D112 variant 1 before loss and waste" ||
  !("system" in knaufD112BoardNorm.applicability) ||
  knaufD112BoardNorm.applicability.system !== "Knauf D112" ||
  !("variant" in knaufD112BoardNorm.applicability) ||
  knaufD112BoardNorm.applicability.variant !== "standard_12_5_mm_single_layer" ||
  !("board_thickness_mm" in knaufD112BoardNorm.applicability) ||
  knaufD112BoardNorm.applicability.board_thickness_mm !== 12.5 ||
  !("board_types" in knaufD112BoardNorm.applicability) ||
  knaufD112BoardNorm.applicability.board_types.join(",") !== "GKB,GKBI" ||
  !("manufacturer_excludes_loss_and_waste" in knaufD112BoardNorm.applicability) ||
  knaufD112BoardNorm.applicability.manufacturer_excludes_loss_and_waste !== true ||
  !("package_rounding_requires_selected_board_dimensions" in knaufD112BoardNorm.applicability) ||
  knaufD112BoardNorm.applicability.package_rounding_requires_selected_board_dimensions !== true ||
  knaufD112BoardNorm.parameters.length !== KNAUF_D112_BOARD_SOURCE_PARAMETER_IDS.length ||
  KNAUF_D112_BOARD_SOURCE_PARAMETER_IDS.some(
    (parameterId) => !knaufD112BoardNorm.parameters.includes(parameterId),
  ) ||
  knaufD112BoardNorm.waste_percent_default !== 0 ||
  knaufD112BoardNorm.rounding.package_unit !== "m2" ||
  knaufD112BoardNorm.rounding.package_size !== 1 ||
  knaufD112BoardNorm.rounding.mode !==
    "reference_average_net_m2_before_selected_board_layout"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${KNAUF_D112_BOARD_NORM_ID}`);
}

export const KNAUF_D112_BOARD_SOURCE_METADATA = Object.freeze({
  source_id: KNAUF_D112_BOARD_SOURCE_ID,
  norm_id: KNAUF_D112_BOARD_NORM_ID,
  source_document_version: ceilingsNormPack.source_pack_version,
  source_title: knaufD112BoardNorm.source.title,
  source_url: knaufD112BoardNorm.source.url,
  exact_locator: knaufD112BoardNorm.source.page,
  rate_value: knaufD112BoardNorm.rate.value,
  rate_unit: knaufD112BoardNorm.rate.unit,
  system: knaufD112BoardNorm.applicability.system,
  variant: knaufD112BoardNorm.applicability.variant,
  board_thickness_mm: knaufD112BoardNorm.applicability.board_thickness_mm,
  board_types: [...knaufD112BoardNorm.applicability.board_types],
  manufacturer_excludes_loss_and_waste:
    knaufD112BoardNorm.applicability.manufacturer_excludes_loss_and_waste,
  definition_hash: estimateDeterministicHash({
    work_group: ceilingsNormPack.work_group,
    source_pack_version: ceilingsNormPack.source_pack_version,
    norm_item: knaufD112BoardNorm,
  }),
});

const knaufD112UdRunnerNorm = (() => {
  const found = ceilingsNormPack.norm_items.find(
    (item) => item.norm_id === KNAUF_D112_UD_RUNNER_NORM_ID,
  );
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${KNAUF_D112_UD_RUNNER_NORM_ID}`);
  return found;
})();
const knaufD112UdRunnerReferenceCeilingM =
  "reference_ceiling_m" in knaufD112UdRunnerNorm.applicability
    ? knaufD112UdRunnerNorm.applicability.reference_ceiling_m
    : null;

if (
  ceilingsNormPack.work_group !== "ceilings" ||
  knaufD112UdRunnerNorm.unit !== "linear_m" ||
  knaufD112UdRunnerNorm.rate.value !== 0.4 ||
  knaufD112UdRunnerNorm.rate.unit !==
    "linear_m/m2 for the documented 10 m x 10 m reference ceiling" ||
  !("system" in knaufD112UdRunnerNorm.applicability) ||
  knaufD112UdRunnerNorm.applicability.system !== "Knauf D112" ||
  !("variant" in knaufD112UdRunnerNorm.applicability) ||
  knaufD112UdRunnerNorm.applicability.variant !== "standard_12_5_mm_single_layer" ||
  !knaufD112UdRunnerReferenceCeilingM ||
  knaufD112UdRunnerReferenceCeilingM[0] !== 10 ||
  knaufD112UdRunnerReferenceCeilingM[1] !== 10 ||
  !("perimeter_sensitive" in knaufD112UdRunnerNorm.applicability) ||
  knaufD112UdRunnerNorm.applicability.perimeter_sensitive !== true ||
  !("manufacturer_excludes_loss_and_waste" in knaufD112UdRunnerNorm.applicability) ||
  knaufD112UdRunnerNorm.applicability.manufacturer_excludes_loss_and_waste !== true ||
  knaufD112UdRunnerNorm.parameters.length !== KNAUF_D112_UD_RUNNER_SOURCE_PARAMETER_IDS.length ||
  KNAUF_D112_UD_RUNNER_SOURCE_PARAMETER_IDS.some(
    (parameterId) => !knaufD112UdRunnerNorm.parameters.includes(parameterId),
  ) ||
  knaufD112UdRunnerNorm.waste_percent_default !== 0 ||
  knaufD112UdRunnerNorm.rounding.package_unit !== "3_m_profile" ||
  knaufD112UdRunnerNorm.rounding.package_size !== 3 ||
  knaufD112UdRunnerNorm.rounding.mode !==
    "reference_average_linear_m_before_actual_perimeter_and_3_m_piece_layout"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${KNAUF_D112_UD_RUNNER_NORM_ID}`);
}

export const KNAUF_D112_UD_RUNNER_SOURCE_METADATA = Object.freeze({
  source_id: KNAUF_D112_UD_RUNNER_SOURCE_ID,
  norm_id: KNAUF_D112_UD_RUNNER_NORM_ID,
  source_document_version: ceilingsNormPack.source_pack_version,
  source_title: knaufD112UdRunnerNorm.source.title,
  source_url: knaufD112UdRunnerNorm.source.url,
  exact_locator: knaufD112UdRunnerNorm.source.page,
  rate_value: knaufD112UdRunnerNorm.rate.value,
  rate_unit: knaufD112UdRunnerNorm.rate.unit,
  system: knaufD112UdRunnerNorm.applicability.system,
  variant: knaufD112UdRunnerNorm.applicability.variant,
  reference_ceiling_m: knaufD112UdRunnerReferenceCeilingM,
  package_size_m: knaufD112UdRunnerNorm.rounding.package_size,
  manufacturer_excludes_loss_and_waste:
    knaufD112UdRunnerNorm.applicability.manufacturer_excludes_loss_and_waste,
  definition_hash: estimateDeterministicHash({
    work_group: ceilingsNormPack.work_group,
    source_pack_version: ceilingsNormPack.source_pack_version,
    norm_item: knaufD112UdRunnerNorm,
  }),
});

const knaufD112JointTapeNorm = (() => {
  const found = ceilingsNormPack.norm_items.find(
    (item) => item.norm_id === KNAUF_D112_JOINT_TAPE_NORM_ID,
  );
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${KNAUF_D112_JOINT_TAPE_NORM_ID}`);
  return found;
})();

if (
  ceilingsNormPack.work_group !== "ceilings" ||
  knaufD112JointTapeNorm.unit !== "linear_m" ||
  knaufD112JointTapeNorm.rate.value !== 0.45 ||
  knaufD112JointTapeNorm.rate.unit !== "linear_m/m2 for D112 variant 1" ||
  !("system" in knaufD112JointTapeNorm.applicability) ||
  knaufD112JointTapeNorm.applicability.system !== "Knauf D112" ||
  !("variant" in knaufD112JointTapeNorm.applicability) ||
  knaufD112JointTapeNorm.applicability.variant !== "standard_12_5_mm_single_layer" ||
  !("cut_edges_only" in knaufD112JointTapeNorm.applicability) ||
  knaufD112JointTapeNorm.applicability.cut_edges_only !== true ||
  !("manufacturer_excludes_loss_and_waste" in knaufD112JointTapeNorm.applicability) ||
  knaufD112JointTapeNorm.applicability.manufacturer_excludes_loss_and_waste !== true ||
  !("package_rounding_requires_selected_tape" in knaufD112JointTapeNorm.applicability) ||
  knaufD112JointTapeNorm.applicability.package_rounding_requires_selected_tape !== true ||
  knaufD112JointTapeNorm.parameters.length !== KNAUF_D112_JOINT_TAPE_SOURCE_PARAMETER_IDS.length ||
  KNAUF_D112_JOINT_TAPE_SOURCE_PARAMETER_IDS.some(
    (parameterId) => !knaufD112JointTapeNorm.parameters.includes(parameterId),
  ) ||
  knaufD112JointTapeNorm.waste_percent_default !== 0 ||
  knaufD112JointTapeNorm.rounding.package_unit !== "linear_m" ||
  knaufD112JointTapeNorm.rounding.package_size !== 1 ||
  knaufD112JointTapeNorm.rounding.mode !==
    "reference_average_linear_m_before_selected_tape_and_cut_edge_layout"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${KNAUF_D112_JOINT_TAPE_NORM_ID}`);
}

export const KNAUF_D112_JOINT_TAPE_SOURCE_METADATA = Object.freeze({
  source_id: KNAUF_D112_JOINT_TAPE_SOURCE_ID,
  norm_id: KNAUF_D112_JOINT_TAPE_NORM_ID,
  source_document_version: ceilingsNormPack.source_pack_version,
  source_title: knaufD112JointTapeNorm.source.title,
  source_url: knaufD112JointTapeNorm.source.url,
  exact_locator: knaufD112JointTapeNorm.source.page,
  rate_value: knaufD112JointTapeNorm.rate.value,
  rate_unit: knaufD112JointTapeNorm.rate.unit,
  system: knaufD112JointTapeNorm.applicability.system,
  variant: knaufD112JointTapeNorm.applicability.variant,
  cut_edges_only: knaufD112JointTapeNorm.applicability.cut_edges_only,
  manufacturer_excludes_loss_and_waste:
    knaufD112JointTapeNorm.applicability.manufacturer_excludes_loss_and_waste,
  definition_hash: estimateDeterministicHash({
    work_group: ceilingsNormPack.work_group,
    source_pack_version: ceilingsNormPack.source_pack_version,
    norm_item: knaufD112JointTapeNorm,
  }),
});

const knaufD112Tn25ScrewNorm = (() => {
  const found = ceilingsNormPack.norm_items.find((item) => item.norm_id === KNAUF_D112_TN25_SCREW_NORM_ID);
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${KNAUF_D112_TN25_SCREW_NORM_ID}`);
  return found;
})();

if (
  ceilingsNormPack.work_group !== "ceilings" ||
  knaufD112Tn25ScrewNorm.unit !== "piece" ||
  knaufD112Tn25ScrewNorm.name_ru !==
    "Саморез Knauf TN 3,5 × 25 мм для однослойной обшивки потолка D112" ||
  knaufD112Tn25ScrewNorm.rate.value !== 17 ||
  knaufD112Tn25ScrewNorm.rate.unit !== "piece/m2 for D112 variant 1" ||
  knaufD112Tn25ScrewNorm.applicability.system !== "Knauf D112" ||
  knaufD112Tn25ScrewNorm.applicability.variant !== "standard_12_5_mm_single_layer" ||
  knaufD112Tn25ScrewNorm.applicability.board_layer_count !== 1 ||
  knaufD112Tn25ScrewNorm.applicability.screw !== "TN 3.5 x 25 mm" ||
  knaufD112Tn25ScrewNorm.applicability.manufacturer_excludes_loss_and_waste !== true ||
  knaufD112Tn25ScrewNorm.rounding.package_size !== 1 ||
  knaufD112Tn25ScrewNorm.rounding.mode !== "ceil_to_whole_piece_from_d112_reference_average" ||
  knaufD112Tn25ScrewNorm.parameters.length !== KNAUF_D112_TN25_SOURCE_PARAMETER_IDS.length ||
  KNAUF_D112_TN25_SOURCE_PARAMETER_IDS.some(
    (parameterId) => !knaufD112Tn25ScrewNorm.parameters.includes(parameterId),
  )
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${KNAUF_D112_TN25_SCREW_NORM_ID}`);
}

export const KNAUF_D112_TN25_SCREW_SOURCE_METADATA = Object.freeze({
  source_id: KNAUF_D112_TN25_SCREW_SOURCE_ID,
  norm_id: KNAUF_D112_TN25_SCREW_NORM_ID,
  source_document_version: ceilingsNormPack.source_pack_version,
  source_title: knaufD112Tn25ScrewNorm.source.title,
  source_url: knaufD112Tn25ScrewNorm.source.url,
  exact_locator: knaufD112Tn25ScrewNorm.source.page,
  rate_value: knaufD112Tn25ScrewNorm.rate.value,
  rate_unit: knaufD112Tn25ScrewNorm.rate.unit,
  system: knaufD112Tn25ScrewNorm.applicability.system,
  variant: knaufD112Tn25ScrewNorm.applicability.variant,
  board_layer_count: knaufD112Tn25ScrewNorm.applicability.board_layer_count,
  board_thickness_mm: KNAUF_D112_TN25_BOARD_THICKNESS_MM,
  screw: knaufD112Tn25ScrewNorm.applicability.screw,
  definition_hash: estimateDeterministicHash({
    work_group: ceilingsNormPack.work_group,
    source_pack_version: ceilingsNormPack.source_pack_version,
    norm_item: knaufD112Tn25ScrewNorm,
  }),
});

const knaufD112UniflottNorm = (() => {
  const found = ceilingsNormPack.norm_items.find(
    (item) => item.norm_id === KNAUF_D112_UNIFLOTT_NORM_ID,
  );
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${KNAUF_D112_UNIFLOTT_NORM_ID}`);
  return found;
})();
const knaufD112UniflottPackageSizes =
  "documented_package_sizes_kg" in knaufD112UniflottNorm.applicability
    ? knaufD112UniflottNorm.applicability.documented_package_sizes_kg
    : null;

if (
  ceilingsNormPack.work_group !== "ceilings" ||
  knaufD112UniflottNorm.unit !== "kg" ||
  knaufD112UniflottNorm.rate.value !== 0.3 ||
  knaufD112UniflottNorm.rate.unit !== "kg/m2 for hand filling, D112 variant 1" ||
  !("system" in knaufD112UniflottNorm.applicability) ||
  knaufD112UniflottNorm.applicability.system !== "Knauf D112" ||
  !("variant" in knaufD112UniflottNorm.applicability) ||
  knaufD112UniflottNorm.applicability.variant !== "standard_12_5_mm_single_layer" ||
  !("joint_filling_method" in knaufD112UniflottNorm.applicability) ||
  knaufD112UniflottNorm.applicability.joint_filling_method !== "hand" ||
  !knaufD112UniflottPackageSizes ||
  knaufD112UniflottPackageSizes.join(",") !== "5,25" ||
  !("manufacturer_excludes_loss_and_waste" in knaufD112UniflottNorm.applicability) ||
  knaufD112UniflottNorm.applicability.manufacturer_excludes_loss_and_waste !== true ||
  knaufD112UniflottNorm.parameters.length !== KNAUF_D112_UNIFLOTT_SOURCE_PARAMETER_IDS.length ||
  KNAUF_D112_UNIFLOTT_SOURCE_PARAMETER_IDS.some(
    (parameterId) => !knaufD112UniflottNorm.parameters.includes(parameterId),
  ) ||
  knaufD112UniflottNorm.waste_percent_default !== 0 ||
  knaufD112UniflottNorm.rounding.package_unit !== "bag" ||
  knaufD112UniflottNorm.rounding.package_size !== 5 ||
  knaufD112UniflottNorm.rounding.mode !==
    "reference_average_kg_before_selected_5_or_25_kg_bag_rounding"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${KNAUF_D112_UNIFLOTT_NORM_ID}`);
}

export const KNAUF_D112_UNIFLOTT_SOURCE_METADATA = Object.freeze({
  source_id: KNAUF_D112_UNIFLOTT_SOURCE_ID,
  norm_id: KNAUF_D112_UNIFLOTT_NORM_ID,
  source_document_version: ceilingsNormPack.source_pack_version,
  source_title: knaufD112UniflottNorm.source.title,
  source_url: knaufD112UniflottNorm.source.url,
  exact_locator: knaufD112UniflottNorm.source.page,
  rate_value: knaufD112UniflottNorm.rate.value,
  rate_unit: knaufD112UniflottNorm.rate.unit,
  system: knaufD112UniflottNorm.applicability.system,
  variant: knaufD112UniflottNorm.applicability.variant,
  joint_filling_method: knaufD112UniflottNorm.applicability.joint_filling_method,
  documented_package_sizes_kg: [...knaufD112UniflottPackageSizes],
  manufacturer_excludes_loss_and_waste:
    knaufD112UniflottNorm.applicability.manufacturer_excludes_loss_and_waste,
  definition_hash: estimateDeterministicHash({
    work_group: ceilingsNormPack.work_group,
    source_pack_version: ceilingsNormPack.source_pack_version,
    norm_item: knaufD112UniflottNorm,
  }),
});

const knaufFugenfuellerPerimeterNorm = (() => {
  const found = drywallNormPack.norm_items.find(
    (item) => item.norm_id === KNAUF_FUGENFUELLER_PERIMETER_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${KNAUF_FUGENFUELLER_PERIMETER_NORM_ID}`);
  }
  return found;
})();
const knaufFugenfuellerRateRange = "rate_range_kg_linear_m" in knaufFugenfuellerPerimeterNorm.applicability
  ? knaufFugenfuellerPerimeterNorm.applicability.rate_range_kg_linear_m
  : null;
const knaufFugenfuellerSystems = "systems" in knaufFugenfuellerPerimeterNorm.applicability
  ? knaufFugenfuellerPerimeterNorm.applicability.systems
  : null;

if (
  drywallNormPack.work_group !== "drywall" ||
  knaufFugenfuellerPerimeterNorm.unit !== "kg" ||
  knaufFugenfuellerPerimeterNorm.rate.value !== 0.15 ||
  knaufFugenfuellerPerimeterNorm.rate.unit !== "kg/linear_m; range 0.15-0.25 kg/linear_m" ||
  !knaufFugenfuellerSystems ||
  knaufFugenfuellerSystems.length !== 1 ||
  knaufFugenfuellerSystems[0] !== "gypsum_board" ||
  !("connection" in knaufFugenfuellerPerimeterNorm.applicability) ||
  knaufFugenfuellerPerimeterNorm.applicability.connection !== "perimeter" ||
  !knaufFugenfuellerRateRange ||
  knaufFugenfuellerRateRange[0] !== 0.15 ||
  knaufFugenfuellerRateRange[1] !== 0.25 ||
  knaufFugenfuellerPerimeterNorm.waste_percent_default !== 0 ||
  knaufFugenfuellerPerimeterNorm.rounding.package_unit !== "bag" ||
  knaufFugenfuellerPerimeterNorm.rounding.package_size !== 25 ||
  knaufFugenfuellerPerimeterNorm.rounding.mode !== "net_kg_before_rounding_to_confirmed_25kg_profile_package"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${KNAUF_FUGENFUELLER_PERIMETER_NORM_ID}`);
}

export const KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA = Object.freeze({
  source_id: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_ID,
  norm_id: KNAUF_FUGENFUELLER_PERIMETER_NORM_ID,
  source_document_version: drywallNormPack.source_pack_version,
  source_title: knaufFugenfuellerPerimeterNorm.source.title,
  source_url: knaufFugenfuellerPerimeterNorm.source.url,
  exact_locator: knaufFugenfuellerPerimeterNorm.source.page,
  rate_value: knaufFugenfuellerPerimeterNorm.rate.value,
  rate_unit: knaufFugenfuellerPerimeterNorm.rate.unit,
  rate_range_kg_linear_m: [knaufFugenfuellerRateRange[0], knaufFugenfuellerRateRange[1]] as const,
  system: knaufFugenfuellerSystems[0],
  connection: knaufFugenfuellerPerimeterNorm.applicability.connection,
  waste_percent_default: knaufFugenfuellerPerimeterNorm.waste_percent_default,
  package_size_kg: knaufFugenfuellerPerimeterNorm.rounding.package_size,
  definition_hash: estimateDeterministicHash({
    work_group: drywallNormPack.work_group,
    source_pack_version: drywallNormPack.source_pack_version,
    norm_item: knaufFugenfuellerPerimeterNorm,
  }),
});

const knaufFugenfuellerJointingNorm = (() => {
  const found = drywallNormPack.norm_items.find(
    (item) => item.norm_id === KNAUF_FUGENFUELLER_JOINTING_NORM_ID,
  );
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${KNAUF_FUGENFUELLER_JOINTING_NORM_ID}`);
  return found;
})();
const knaufFugenfuellerJointingRateTable =
  "representative_rate_table_kg_m2" in knaufFugenfuellerJointingNorm.applicability
    ? knaufFugenfuellerJointingNorm.applicability.representative_rate_table_kg_m2
    : null;
const knaufFugenfuellerJointingBagSizes =
  "documented_bag_sizes_kg" in knaufFugenfuellerJointingNorm.applicability
    ? knaufFugenfuellerJointingNorm.applicability.documented_bag_sizes_kg
    : null;
const knaufFugenfuellerJointingEdgeTypes =
  "edge_types" in knaufFugenfuellerJointingNorm.applicability
    ? knaufFugenfuellerJointingNorm.applicability.edge_types
    : null;
const knaufFugenfuellerJointingRateVariesWith =
  "rate_varies_with" in knaufFugenfuellerJointingNorm.applicability
    ? knaufFugenfuellerJointingNorm.applicability.rate_varies_with
    : null;

if (
  drywallNormPack.work_group !== "drywall" ||
  knaufFugenfuellerJointingNorm.unit !== "kg" ||
  knaufFugenfuellerJointingNorm.rate.value !== 0.3 ||
  knaufFugenfuellerJointingNorm.rate.unit !==
    "one exact table cell only: approximate kg/m2 for single-layer 12.5 mm Knauf HRAK board on a ceiling, excluding perimeter joints" ||
  !("product" in knaufFugenfuellerJointingNorm.applicability) ||
  knaufFugenfuellerJointingNorm.applicability.product !== "Knauf Fugenfüller Leicht" ||
  !("tds_identifier" in knaufFugenfuellerJointingNorm.applicability) ||
  knaufFugenfuellerJointingNorm.applicability.tds_identifier !== "K462.de/eng/07.11/0/TB" ||
  !knaufFugenfuellerJointingRateTable ||
  knaufFugenfuellerJointingRateTable.single_12_5_mm_knauf_hrak__ceiling !== 0.3 ||
  !knaufFugenfuellerJointingEdgeTypes ||
  !knaufFugenfuellerJointingEdgeTypes.includes("HRAK") ||
  !knaufFugenfuellerJointingRateVariesWith ||
  knaufFugenfuellerJointingRateVariesWith.length !== 4 ||
  ["board_product_type", "board_thickness_mm", "board_layer_configuration", "construction_application"]
    .some((parameterId) => !knaufFugenfuellerJointingRateVariesWith.includes(parameterId)) ||
  !("reinforcement_tape_required" in knaufFugenfuellerJointingNorm.applicability) ||
  knaufFugenfuellerJointingNorm.applicability.reinforcement_tape_required !== true ||
  !("perimeter_connection_joints_excluded" in knaufFugenfuellerJointingNorm.applicability) ||
  knaufFugenfuellerJointingNorm.applicability.perimeter_connection_joints_excluded !== true ||
  !("exact_table_cell_required" in knaufFugenfuellerJointingNorm.applicability) ||
  knaufFugenfuellerJointingNorm.applicability.exact_table_cell_required !== true ||
  !("simple_rate_multiplication_forbidden" in knaufFugenfuellerJointingNorm.applicability) ||
  knaufFugenfuellerJointingNorm.applicability.simple_rate_multiplication_forbidden !== true ||
  !("application_temperature_min_c" in knaufFugenfuellerJointingNorm.applicability) ||
  knaufFugenfuellerJointingNorm.applicability.application_temperature_min_c !== 10 ||
  !("additional_waste_not_published" in knaufFugenfuellerJointingNorm.applicability) ||
  knaufFugenfuellerJointingNorm.applicability.additional_waste_not_published !== true ||
  !knaufFugenfuellerJointingBagSizes ||
  knaufFugenfuellerJointingBagSizes.length !== 3 ||
  ![5, 10, 25].every((size) => knaufFugenfuellerJointingBagSizes.includes(size)) ||
  knaufFugenfuellerJointingNorm.parameters.length !== KNAUF_FUGENFUELLER_JOINTING_SOURCE_PARAMETER_IDS.length ||
  KNAUF_FUGENFUELLER_JOINTING_SOURCE_PARAMETER_IDS.some(
    (parameterId) => !knaufFugenfuellerJointingNorm.parameters.includes(parameterId),
  ) ||
  knaufFugenfuellerJointingNorm.waste_percent_default !== 0 ||
  knaufFugenfuellerJointingNorm.rounding.package_unit !== "bag" ||
  knaufFugenfuellerJointingNorm.rounding.package_size !== 5 ||
  knaufFugenfuellerJointingNorm.rounding.mode !==
    "approximate_net_kg_after_exact_table_cell_selection_before_explicit_5_10_or_25_kg_bag_rounding"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${KNAUF_FUGENFUELLER_JOINTING_NORM_ID}`);
}

export const KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA = Object.freeze({
  source_id: KNAUF_FUGENFUELLER_JOINTING_SOURCE_ID,
  norm_id: KNAUF_FUGENFUELLER_JOINTING_NORM_ID,
  source_document_version: drywallNormPack.source_pack_version,
  source_title: knaufFugenfuellerJointingNorm.source.title,
  source_url: knaufFugenfuellerJointingNorm.source.url,
  exact_locator: knaufFugenfuellerJointingNorm.source.page,
  rate_value: knaufFugenfuellerJointingNorm.rate.value,
  rate_unit: knaufFugenfuellerJointingNorm.rate.unit,
  product: knaufFugenfuellerJointingNorm.applicability.product,
  tds_identifier: knaufFugenfuellerJointingNorm.applicability.tds_identifier,
  exact_table_cell: "single_12_5_mm_knauf_hrak__ceiling" as const,
  board_product_type: "Knauf HRAK board" as const,
  board_thickness_mm: 12.5 as const,
  board_layer_configuration: "single_layer" as const,
  long_edge_type: "HRAK" as const,
  construction_application: "ceiling" as const,
  application_temperature_min_c: 10 as const,
  additional_waste_not_published: true as const,
  documented_bag_sizes_kg: [5, 10, 25] as const,
  definition_hash: estimateDeterministicHash({
    work_group: drywallNormPack.work_group,
    source_pack_version: drywallNormPack.source_pack_version,
    norm_item: knaufFugenfuellerJointingNorm,
  }),
});

const forbo232MountingAdhesiveNorm = (() => {
  const found = baseboardsNormPack.norm_items.find(
    (item) => item.norm_id === FORBO_232_MOUNTING_ADHESIVE_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${FORBO_232_MOUNTING_ADHESIVE_NORM_ID}`);
  }
  return found;
})();
const forbo232RateRange = "manufacturer_rate_range_ml_linear_m" in forbo232MountingAdhesiveNorm.applicability
  ? forbo232MountingAdhesiveNorm.applicability.manufacturer_rate_range_ml_linear_m
  : null;
const forbo232SkirtingMaterials = "skirting_materials" in forbo232MountingAdhesiveNorm.applicability
  ? forbo232MountingAdhesiveNorm.applicability.skirting_materials
  : null;
const forbo232SubstrateTypes = "substrate_types" in forbo232MountingAdhesiveNorm.applicability
  ? forbo232MountingAdhesiveNorm.applicability.substrate_types
  : null;

if (
  baseboardsNormPack.work_group !== "baseboards" ||
  forbo232MountingAdhesiveNorm.unit !== "ml" ||
  forbo232MountingAdhesiveNorm.rate.value !== 40 ||
  forbo232MountingAdhesiveNorm.rate.unit !== "ml/linear_m; conservative upper endpoint of manufacturer range 20-40 ml/linear_m" ||
  !("product" in forbo232MountingAdhesiveNorm.applicability) ||
  forbo232MountingAdhesiveNorm.applicability.product !== "Forbo Eurocol 232 Eurosol Montage" ||
  !forbo232RateRange ||
  forbo232RateRange[0] !== 20 ||
  forbo232RateRange[1] !== 40 ||
  !forbo232SkirtingMaterials ||
  forbo232SkirtingMaterials.length !== 2 ||
  !forbo232SkirtingMaterials.includes("wood") ||
  !forbo232SkirtingMaterials.includes("rigid_pvc") ||
  !forbo232SubstrateTypes ||
  forbo232SubstrateTypes.length !== 3 ||
  !forbo232SubstrateTypes.includes("concrete") ||
  !forbo232SubstrateTypes.includes("wood_material") ||
  !forbo232SubstrateTypes.includes("clean_metal") ||
  forbo232MountingAdhesiveNorm.parameters.length !==
    FORBO_232_MOUNTING_ADHESIVE_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  FORBO_232_MOUNTING_ADHESIVE_REQUIRED_EXPLICIT_PARAMETER_IDS.some(
    (parameterId) => !forbo232MountingAdhesiveNorm.parameters.includes(parameterId),
  ) ||
  forbo232MountingAdhesiveNorm.waste_percent_default !== 0 ||
  forbo232MountingAdhesiveNorm.rounding.package_unit !== "PE_cartridge" ||
  forbo232MountingAdhesiveNorm.rounding.package_size !== 310 ||
  forbo232MountingAdhesiveNorm.rounding.mode !== "ceil"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${FORBO_232_MOUNTING_ADHESIVE_NORM_ID}`);
}

export const FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA = Object.freeze({
  source_id: FORBO_232_MOUNTING_ADHESIVE_SOURCE_ID,
  norm_id: FORBO_232_MOUNTING_ADHESIVE_NORM_ID,
  source_document_version: baseboardsNormPack.source_pack_version,
  source_title: forbo232MountingAdhesiveNorm.source.title,
  source_url: forbo232MountingAdhesiveNorm.source.url,
  exact_locator: forbo232MountingAdhesiveNorm.source.page,
  rate_value: forbo232MountingAdhesiveNorm.rate.value,
  rate_unit: forbo232MountingAdhesiveNorm.rate.unit,
  rate_range_ml_linear_m: [forbo232RateRange[0], forbo232RateRange[1]] as const,
  product: forbo232MountingAdhesiveNorm.applicability.product,
  skirting_materials: [...forbo232SkirtingMaterials],
  substrate_types: [...forbo232SubstrateTypes],
  waste_percent_default: forbo232MountingAdhesiveNorm.waste_percent_default,
  package_size_ml: forbo232MountingAdhesiveNorm.rounding.package_size,
  definition_hash: estimateDeterministicHash({
    work_group: baseboardsNormPack.work_group,
    source_pack_version: baseboardsNormPack.source_pack_version,
    norm_item: forbo232MountingAdhesiveNorm,
  }),
});

const gerflor6086SkirtingNorm = (() => {
  const found = baseboardsNormPack.norm_items.find(
    (item) => item.norm_id === GERFLOR_6086_SKIRTING_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${GERFLOR_6086_SKIRTING_NORM_ID}`);
  }
  return found;
})();

if (
  baseboardsNormPack.work_group !== "baseboards" ||
  gerflor6086SkirtingNorm.unit !== "linear_m" ||
  gerflor6086SkirtingNorm.rate.value !== 1 ||
  gerflor6086SkirtingNorm.rate.unit !== "linear_m/linear_m measured finished perimeter" ||
  !("product_code" in gerflor6086SkirtingNorm.applicability) ||
  gerflor6086SkirtingNorm.applicability.product_code !== "6086" ||
  !("piece_length_m" in gerflor6086SkirtingNorm.applicability) ||
  gerflor6086SkirtingNorm.applicability.piece_length_m !== 2 ||
  !("pieces_per_package" in gerflor6086SkirtingNorm.applicability) ||
  gerflor6086SkirtingNorm.applicability.pieces_per_package !== 6 ||
  !("package_length_linear_m" in gerflor6086SkirtingNorm.applicability) ||
  gerflor6086SkirtingNorm.applicability.package_length_linear_m !== 12 ||
  !("corner_cutting_must_follow_method_statement" in gerflor6086SkirtingNorm.applicability) ||
  gerflor6086SkirtingNorm.applicability.corner_cutting_must_follow_method_statement !== true ||
  !("corner_allowance_not_automatically_assumed" in gerflor6086SkirtingNorm.applicability) ||
  gerflor6086SkirtingNorm.applicability.corner_allowance_not_automatically_assumed !== true ||
  gerflor6086SkirtingNorm.parameters.length !== GERFLOR_6086_SKIRTING_SOURCE_PARAMETER_IDS.length ||
  GERFLOR_6086_SKIRTING_SOURCE_PARAMETER_IDS.some(
    (parameterId) => !gerflor6086SkirtingNorm.parameters.includes(parameterId),
  ) ||
  gerflor6086SkirtingNorm.waste_percent_default !== 0 ||
  gerflor6086SkirtingNorm.rounding.package_unit !== "2_m_piece" ||
  gerflor6086SkirtingNorm.rounding.package_size !== 2 ||
  gerflor6086SkirtingNorm.rounding.mode !== "ceil"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${GERFLOR_6086_SKIRTING_NORM_ID}`);
}

export const GERFLOR_6086_SKIRTING_SOURCE_METADATA = Object.freeze({
  source_id: GERFLOR_6086_SKIRTING_SOURCE_ID,
  norm_id: GERFLOR_6086_SKIRTING_NORM_ID,
  source_document_version: baseboardsNormPack.source_pack_version,
  source_title: gerflor6086SkirtingNorm.source.title,
  source_url: gerflor6086SkirtingNorm.source.url,
  exact_locator: gerflor6086SkirtingNorm.source.page,
  rate_value: gerflor6086SkirtingNorm.rate.value,
  rate_unit: gerflor6086SkirtingNorm.rate.unit,
  product_code: gerflor6086SkirtingNorm.applicability.product_code,
  piece_length_m: gerflor6086SkirtingNorm.applicability.piece_length_m,
  pieces_per_package: gerflor6086SkirtingNorm.applicability.pieces_per_package,
  package_length_linear_m: gerflor6086SkirtingNorm.applicability.package_length_linear_m,
  definition_hash: estimateDeterministicHash({
    work_group: baseboardsNormPack.work_group,
    source_pack_version: baseboardsNormPack.source_pack_version,
    norm_item: gerflor6086SkirtingNorm,
  }),
});

const ceresitCn69Global25KgNorm = (() => {
  const found = flooringNormPack.norm_items.find(
    (item) => item.norm_id === CERESIT_CN69_GLOBAL_25KG_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${CERESIT_CN69_GLOBAL_25KG_NORM_ID}`);
  }
  return found;
})();
const ceresitCn69Surfaces = "surfaces" in ceresitCn69Global25KgNorm.applicability
  ? ceresitCn69Global25KgNorm.applicability.surfaces
  : null;

if (
  flooringNormPack.work_group !== "flooring" ||
  ceresitCn69Global25KgNorm.unit !== "kg" ||
  ceresitCn69Global25KgNorm.rate.value !== 1.3 ||
  ceresitCn69Global25KgNorm.rate.unit !==
    "approximate kg/m2 per mm for the global 25 kg C_CN69_TDS_1_0420 variant" ||
  !("product" in ceresitCn69Global25KgNorm.applicability) ||
  ceresitCn69Global25KgNorm.applicability.product !== "Ceresit CN 69" ||
  !("tds_identifier" in ceresitCn69Global25KgNorm.applicability) ||
  ceresitCn69Global25KgNorm.applicability.tds_identifier !== "C_CN69_TDS_1_0420" ||
  !("production_variant" in ceresitCn69Global25KgNorm.applicability) ||
  ceresitCn69Global25KgNorm.applicability.production_variant !== "global_25kg" ||
  !ceresitCn69Surfaces ||
  ceresitCn69Surfaces.join(",") !== "concrete,cement_sand_screed,other_mineral_base" ||
  !("layer_min_mm" in ceresitCn69Global25KgNorm.applicability) ||
  ceresitCn69Global25KgNorm.applicability.layer_min_mm !== 2 ||
  !("layer_max_mm" in ceresitCn69Global25KgNorm.applicability) ||
  ceresitCn69Global25KgNorm.applicability.layer_max_mm !== 10 ||
  !("simple_rate_multiplication_forbidden" in ceresitCn69Global25KgNorm.applicability) ||
  ceresitCn69Global25KgNorm.applicability.simple_rate_multiplication_forbidden !== true ||
  ceresitCn69Global25KgNorm.parameters.length !==
    CERESIT_CN69_GLOBAL_25KG_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  CERESIT_CN69_GLOBAL_25KG_REQUIRED_EXPLICIT_PARAMETER_IDS.some(
    (parameterId) => !ceresitCn69Global25KgNorm.parameters.includes(parameterId),
  ) ||
  ceresitCn69Global25KgNorm.waste_percent_default !== 0 ||
  ceresitCn69Global25KgNorm.rounding.package_unit !== "bag" ||
  ceresitCn69Global25KgNorm.rounding.package_size !== 25 ||
  ceresitCn69Global25KgNorm.rounding.mode !==
    "approximate_net_kg_before_confirmed_25_kg_bag_rounding"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${CERESIT_CN69_GLOBAL_25KG_NORM_ID}`);
}

export const CERESIT_CN69_GLOBAL_25KG_SOURCE_METADATA = Object.freeze({
  source_id: CERESIT_CN69_GLOBAL_25KG_SOURCE_ID,
  norm_id: CERESIT_CN69_GLOBAL_25KG_NORM_ID,
  source_document_version: flooringNormPack.source_pack_version,
  source_title: ceresitCn69Global25KgNorm.source.title,
  source_url: ceresitCn69Global25KgNorm.source.url,
  exact_locator: ceresitCn69Global25KgNorm.source.page,
  rate_value: ceresitCn69Global25KgNorm.rate.value,
  rate_unit: ceresitCn69Global25KgNorm.rate.unit,
  product: ceresitCn69Global25KgNorm.applicability.product,
  tds_identifier: ceresitCn69Global25KgNorm.applicability.tds_identifier,
  production_variant: ceresitCn69Global25KgNorm.applicability.production_variant,
  surfaces: [...ceresitCn69Surfaces],
  layer_min_mm: ceresitCn69Global25KgNorm.applicability.layer_min_mm,
  layer_max_mm: ceresitCn69Global25KgNorm.applicability.layer_max_mm,
  waste_percent_default: ceresitCn69Global25KgNorm.waste_percent_default,
  package_size_kg: ceresitCn69Global25KgNorm.rounding.package_size,
  definition_hash: estimateDeterministicHash({
    work_group: flooringNormPack.work_group,
    source_pack_version: flooringNormPack.source_pack_version,
    norm_item: ceresitCn69Global25KgNorm,
  }),
});

const ceresitCt29InteriorWallPlasterNorm = (() => {
  const found = plasterNormPack.norm_items.find(
    (item) => item.norm_id === CERESIT_CT29_INTERIOR_WALL_PLASTER_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${CERESIT_CT29_INTERIOR_WALL_PLASTER_NORM_ID}`);
  }
  return found;
})();

if (
  plasterNormPack.work_group !== "plaster" ||
  ceresitCt29InteriorWallPlasterNorm.unit !== "kg" ||
  ceresitCt29InteriorWallPlasterNorm.rate.value !== 1.8 ||
  ceresitCt29InteriorWallPlasterNorm.rate.unit !==
    "approximate kg/m2 per mm for plaster application; not the separate kg/dm3 deep-loss basis" ||
  ceresitCt29InteriorWallPlasterNorm.applicability.product !== "Ceresit CT 29" ||
  ceresitCt29InteriorWallPlasterNorm.applicability.tds_identifier !== "C_CT29_TDS_1_0120" ||
  ceresitCt29InteriorWallPlasterNorm.applicability.application_mode !==
    "plaster_application_by_area_and_thickness" ||
  ceresitCt29InteriorWallPlasterNorm.applicability.excluded_application_mode !==
    "deep_loss_filling_by_volume" ||
  ceresitCt29InteriorWallPlasterNorm.applicability.deep_loss_fill_rate_kg_dm3 !== 1.8 ||
  ceresitCt29InteriorWallPlasterNorm.applicability.surfaces.join(",") !==
    "concrete,traditional_plaster,cement_lime_plaster,rough_mineral_substrate,small_masonry_work" ||
  ceresitCt29InteriorWallPlasterNorm.applicability.installation_locations.join(",") !== "indoor,outdoor" ||
  ceresitCt29InteriorWallPlasterNorm.applicability.application_temperature_min_c !== 5 ||
  ceresitCt29InteriorWallPlasterNorm.applicability.application_temperature_max_c !== 25 ||
  ceresitCt29InteriorWallPlasterNorm.applicability.formula !==
    "ct29_plaster_net_kg = area_m2 * layer_thickness_mm * 1.8" ||
  ceresitCt29InteriorWallPlasterNorm.applicability.simple_rate_multiplication_forbidden !== true ||
  ceresitCt29InteriorWallPlasterNorm.applicability.additional_waste_not_published !== true ||
  ceresitCt29InteriorWallPlasterNorm.applicability.documented_bag_sizes_kg.join(",") !== "5,25" ||
  ceresitCt29InteriorWallPlasterNorm.parameters.length !==
    CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_PARAMETER_IDS.length ||
  CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_PARAMETER_IDS.some(
    (parameterId) => !ceresitCt29InteriorWallPlasterNorm.parameters.includes(parameterId),
  ) ||
  ceresitCt29InteriorWallPlasterNorm.waste_percent_default !== 0 ||
  ceresitCt29InteriorWallPlasterNorm.rounding.package_unit !== "bag" ||
  ceresitCt29InteriorWallPlasterNorm.rounding.package_size !== 5 ||
  ceresitCt29InteriorWallPlasterNorm.rounding.mode !==
    "approximate_net_kg_before_rounding_to_explicitly_selected_5_or_25_kg_bag"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${CERESIT_CT29_INTERIOR_WALL_PLASTER_NORM_ID}`);
}

export const CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_METADATA = Object.freeze({
  source_id: CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_ID,
  norm_id: CERESIT_CT29_INTERIOR_WALL_PLASTER_NORM_ID,
  source_document_version: plasterNormPack.source_pack_version,
  source_title: ceresitCt29InteriorWallPlasterNorm.source.title,
  source_url: ceresitCt29InteriorWallPlasterNorm.source.url,
  exact_locator: ceresitCt29InteriorWallPlasterNorm.source.page,
  rate_value: ceresitCt29InteriorWallPlasterNorm.rate.value,
  rate_unit: ceresitCt29InteriorWallPlasterNorm.rate.unit,
  product: ceresitCt29InteriorWallPlasterNorm.applicability.product,
  tds_identifier: ceresitCt29InteriorWallPlasterNorm.applicability.tds_identifier,
  application_mode: ceresitCt29InteriorWallPlasterNorm.applicability.application_mode,
  excluded_application_mode: ceresitCt29InteriorWallPlasterNorm.applicability.excluded_application_mode,
  surfaces: [...ceresitCt29InteriorWallPlasterNorm.applicability.surfaces],
  installation_locations: [...ceresitCt29InteriorWallPlasterNorm.applicability.installation_locations],
  application_temperature_min_c:
    ceresitCt29InteriorWallPlasterNorm.applicability.application_temperature_min_c,
  application_temperature_max_c:
    ceresitCt29InteriorWallPlasterNorm.applicability.application_temperature_max_c,
  documented_bag_sizes_kg: [...ceresitCt29InteriorWallPlasterNorm.applicability.documented_bag_sizes_kg],
  waste_percent_default: ceresitCt29InteriorWallPlasterNorm.waste_percent_default,
  definition_hash: estimateDeterministicHash({
    work_group: plasterNormPack.work_group,
    source_pack_version: plasterNormPack.source_pack_version,
    norm_item: ceresitCt29InteriorWallPlasterNorm,
  }),
});

const ceresitCt126DryInteriorWallPuttyNorm = (() => {
  const found = puttyNormPack.norm_items.find(
    (item) => item.norm_id === CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_NORM_ID}`);
  }
  return found;
})();

if (
  puttyNormPack.work_group !== "putty" ||
  ceresitCt126DryInteriorWallPuttyNorm.unit !== "kg" ||
  ceresitCt126DryInteriorWallPuttyNorm.rate.value !== 1.2 ||
  ceresitCt126DryInteriorWallPuttyNorm.rate.unit !== "approximate kg/m2 per mm" ||
  ceresitCt126DryInteriorWallPuttyNorm.applicability.product !== "Ceresit CT 126" ||
  ceresitCt126DryInteriorWallPuttyNorm.applicability.tds_identifier !== "C_CT126_TDS_1_0321" ||
  ceresitCt126DryInteriorWallPuttyNorm.applicability.surfaces.join(",") !==
    "cement_plaster,cement_lime_plaster,concrete,gypsum_substrate,gypsum_fibre_board,plasterboard,aerated_concrete,sound_adherent_paint_coat" ||
  ceresitCt126DryInteriorWallPuttyNorm.applicability.layer_min_mm !== 2 ||
  ceresitCt126DryInteriorWallPuttyNorm.applicability.layer_max_mm !== 10 ||
  ceresitCt126DryInteriorWallPuttyNorm.applicability.dry_indoor_use !== true ||
  ceresitCt126DryInteriorWallPuttyNorm.applicability.permanent_high_humidity_excluded !== true ||
  ceresitCt126DryInteriorWallPuttyNorm.applicability.substrate_load_bearing_dry_clean_required !== true ||
  ceresitCt126DryInteriorWallPuttyNorm.applicability.substrate_specific_ct7_or_ct19_preparation_required !== true ||
  ceresitCt126DryInteriorWallPuttyNorm.applicability.application_temperature_min_c !== 5 ||
  ceresitCt126DryInteriorWallPuttyNorm.applicability.application_temperature_max_c !== 30 ||
  ceresitCt126DryInteriorWallPuttyNorm.applicability.formula !==
    "ct126_net_kg = area_m2 * layer_thickness_mm * 1.2" ||
  ceresitCt126DryInteriorWallPuttyNorm.applicability.simple_rate_multiplication_forbidden !== true ||
  ceresitCt126DryInteriorWallPuttyNorm.applicability.additional_waste_not_published !== true ||
  ceresitCt126DryInteriorWallPuttyNorm.applicability.documented_bag_sizes_kg.join(",") !== "5,20" ||
  ceresitCt126DryInteriorWallPuttyNorm.parameters.length !==
    CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_PARAMETER_IDS.length ||
  CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_PARAMETER_IDS.some(
    (parameterId) => !ceresitCt126DryInteriorWallPuttyNorm.parameters.includes(parameterId),
  ) ||
  ceresitCt126DryInteriorWallPuttyNorm.waste_percent_default !== 0 ||
  ceresitCt126DryInteriorWallPuttyNorm.rounding.package_unit !== "bag" ||
  ceresitCt126DryInteriorWallPuttyNorm.rounding.package_size !== 5 ||
  ceresitCt126DryInteriorWallPuttyNorm.rounding.mode !==
    "approximate_net_kg_before_rounding_to_explicitly_selected_5_or_20_kg_bag"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_NORM_ID}`);
}

export const CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_METADATA = Object.freeze({
  source_id: CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_ID,
  norm_id: CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_NORM_ID,
  source_document_version: puttyNormPack.source_pack_version,
  source_title: ceresitCt126DryInteriorWallPuttyNorm.source.title,
  source_url: ceresitCt126DryInteriorWallPuttyNorm.source.url,
  exact_locator: ceresitCt126DryInteriorWallPuttyNorm.source.page,
  rate_value: ceresitCt126DryInteriorWallPuttyNorm.rate.value,
  rate_unit: ceresitCt126DryInteriorWallPuttyNorm.rate.unit,
  product: ceresitCt126DryInteriorWallPuttyNorm.applicability.product,
  tds_identifier: ceresitCt126DryInteriorWallPuttyNorm.applicability.tds_identifier,
  surfaces: [...ceresitCt126DryInteriorWallPuttyNorm.applicability.surfaces],
  layer_min_mm: ceresitCt126DryInteriorWallPuttyNorm.applicability.layer_min_mm,
  layer_max_mm: ceresitCt126DryInteriorWallPuttyNorm.applicability.layer_max_mm,
  application_temperature_min_c:
    ceresitCt126DryInteriorWallPuttyNorm.applicability.application_temperature_min_c,
  application_temperature_max_c:
    ceresitCt126DryInteriorWallPuttyNorm.applicability.application_temperature_max_c,
  documented_bag_sizes_kg: [...ceresitCt126DryInteriorWallPuttyNorm.applicability.documented_bag_sizes_kg],
  waste_percent_default: ceresitCt126DryInteriorWallPuttyNorm.waste_percent_default,
  definition_hash: estimateDeterministicHash({
    work_group: puttyNormPack.work_group,
    source_pack_version: puttyNormPack.source_pack_version,
    norm_item: ceresitCt126DryInteriorWallPuttyNorm,
  }),
});

const ceresitCt127DryInteriorFinishPuttyNorm = (() => {
  const found = puttyNormPack.norm_items.find(
    (item) => item.norm_id === CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_NORM_ID}`);
  }
  return found;
})();

if (
  puttyNormPack.work_group !== "putty" ||
  ceresitCt127DryInteriorFinishPuttyNorm.unit !== "kg" ||
  ceresitCt127DryInteriorFinishPuttyNorm.rate.value !== 0.4 ||
  ceresitCt127DryInteriorFinishPuttyNorm.rate.unit !==
    "published estimated lower bound only; project rate must be selected within 0.4-1.2 kg/m2" ||
  ceresitCt127DryInteriorFinishPuttyNorm.applicability.product !== "Ceresit CT 127" ||
  ceresitCt127DryInteriorFinishPuttyNorm.applicability.tds_identifier !== "C_CT127_TDS_1_0120" ||
  ceresitCt127DryInteriorFinishPuttyNorm.applicability.surfaces.join(",") !==
    "cement_plaster,cement_lime_plaster,concrete,ceresit_ct126,gypsum_substrate,gypsum_fibre_board,plasterboard,aerated_concrete,silicate_block,sound_adherent_paint_coat" ||
  ceresitCt127DryInteriorFinishPuttyNorm.applicability.layer_max_mm !== 2 ||
  ceresitCt127DryInteriorFinishPuttyNorm.applicability.dry_indoor_use !== true ||
  ceresitCt127DryInteriorFinishPuttyNorm.applicability.permanent_humidity_excluded !== true ||
  ceresitCt127DryInteriorFinishPuttyNorm.applicability.substrate_load_bearing_dry_clean_required !== true ||
  ceresitCt127DryInteriorFinishPuttyNorm.applicability
    .substrate_specific_in10_ct17_ct7_or_ct19_preparation_required !== true ||
  ceresitCt127DryInteriorFinishPuttyNorm.applicability.rate_range_kg_m2.join(",") !== "0.4,1.2" ||
  ceresitCt127DryInteriorFinishPuttyNorm.applicability.rate_selection_table_not_published !== true ||
  ceresitCt127DryInteriorFinishPuttyNorm.applicability.selected_consumption_required !== true ||
  ceresitCt127DryInteriorFinishPuttyNorm.applicability.simple_rate_multiplication_forbidden !== true ||
  ceresitCt127DryInteriorFinishPuttyNorm.applicability.application_temperature_min_c !== 5 ||
  ceresitCt127DryInteriorFinishPuttyNorm.applicability.application_temperature_max_c !== 30 ||
  ceresitCt127DryInteriorFinishPuttyNorm.applicability.additional_waste_not_published !== true ||
  ceresitCt127DryInteriorFinishPuttyNorm.applicability.documented_bag_size_kg !== 20 ||
  ceresitCt127DryInteriorFinishPuttyNorm.parameters.length !==
    CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_PARAMETER_IDS.length ||
  CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_PARAMETER_IDS.some(
    (parameterId) => !ceresitCt127DryInteriorFinishPuttyNorm.parameters.includes(parameterId),
  ) ||
  ceresitCt127DryInteriorFinishPuttyNorm.waste_percent_default !== 0 ||
  ceresitCt127DryInteriorFinishPuttyNorm.rounding.package_unit !== "bag" ||
  ceresitCt127DryInteriorFinishPuttyNorm.rounding.package_size !== 20 ||
  ceresitCt127DryInteriorFinishPuttyNorm.rounding.mode !==
    "net_kg_after_explicit_project_rate_selection_before_20_kg_bag_rounding"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_NORM_ID}`);
}

export const CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA = Object.freeze({
  source_id: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_ID,
  norm_id: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_NORM_ID,
  source_document_version: puttyNormPack.source_pack_version,
  source_title: ceresitCt127DryInteriorFinishPuttyNorm.source.title,
  source_url: ceresitCt127DryInteriorFinishPuttyNorm.source.url,
  exact_locator: ceresitCt127DryInteriorFinishPuttyNorm.source.page,
  rate_value: ceresitCt127DryInteriorFinishPuttyNorm.rate.value,
  rate_unit: ceresitCt127DryInteriorFinishPuttyNorm.rate.unit,
  product: ceresitCt127DryInteriorFinishPuttyNorm.applicability.product,
  tds_identifier: ceresitCt127DryInteriorFinishPuttyNorm.applicability.tds_identifier,
  surfaces: [...ceresitCt127DryInteriorFinishPuttyNorm.applicability.surfaces],
  layer_max_mm: ceresitCt127DryInteriorFinishPuttyNorm.applicability.layer_max_mm,
  rate_range_kg_m2: [...ceresitCt127DryInteriorFinishPuttyNorm.applicability.rate_range_kg_m2],
  application_temperature_min_c:
    ceresitCt127DryInteriorFinishPuttyNorm.applicability.application_temperature_min_c,
  application_temperature_max_c:
    ceresitCt127DryInteriorFinishPuttyNorm.applicability.application_temperature_max_c,
  documented_bag_size_kg:
    ceresitCt127DryInteriorFinishPuttyNorm.applicability.documented_bag_size_kg,
  waste_percent_default: ceresitCt127DryInteriorFinishPuttyNorm.waste_percent_default,
  definition_hash: estimateDeterministicHash({
    work_group: puttyNormPack.work_group,
    source_pack_version: puttyNormPack.source_pack_version,
    norm_item: ceresitCt127DryInteriorFinishPuttyNorm,
  }),
});

const krer2706020HotAsphalt40MmNorm = (() => {
  const found = roadworksNormPack.norm_items.find(
    (item) => item.norm_id === KRER27_06_020_HOT_ASPHALT_40MM_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${KRER27_06_020_HOT_ASPHALT_40MM_NORM_ID}`);
  }
  return found;
})();

if (
  roadworksNormPack.work_group !== "roadworks" ||
  krer2706020HotAsphalt40MmNorm.unit !== "krer_norm_unit" ||
  krer2706020HotAsphalt40MmNorm.rate.value !== 0.001 ||
  krer2706020HotAsphalt40MmNorm.rate.unit !==
    "table norm unit/m2; table measurement basis is 1000 m2 of pavement" ||
  krer2706020HotAsphalt40MmNorm.applicability.jurisdiction !== "Kyrgyz Republic" ||
  krer2706020HotAsphalt40MmNorm.applicability.table !== "27-06-020" ||
  krer2706020HotAsphalt40MmNorm.applicability.published_layer_thickness_mm !== 40 ||
  krer2706020HotAsphalt40MmNorm.applicability.table_measurement_basis_m2 !== 1000 ||
  krer2706020HotAsphalt40MmNorm.applicability.calculation !== "pavement_area_m2 / 1000" ||
  krer2706020HotAsphalt40MmNorm.applicability.exact_table_variant_and_resource_column_selection_required !== true ||
  krer2706020HotAsphalt40MmNorm.applicability.resource_rates_must_come_from_selected_official_table_column !== true ||
  krer2706020HotAsphalt40MmNorm.applicability.thickness_density_and_mix_selection_must_not_be_inferred_from_this_routing_rate !== true ||
  krer2706020HotAsphalt40MmNorm.applicability.current_collection_edition_and_amendments_required !== true ||
  krer2706020HotAsphalt40MmNorm.applicability.rate_is_derived_same_unit_conversion_not_published_resource_norm !== true ||
  krer2706020HotAsphalt40MmNorm.applicability.resource_and_cost_rates_blocked_until_exact_variant_selected !== true ||
  krer2706020HotAsphalt40MmNorm.applicability.automatic_production_binding_for_generic_roadworks_forbidden !== true ||
  krer2706020HotAsphalt40MmNorm.parameters.length !== KRER27_06_020_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  KRER27_06_020_REQUIRED_EXPLICIT_PARAMETER_IDS.some(
    (parameterId) => !krer2706020HotAsphalt40MmNorm.parameters.includes(parameterId),
  ) ||
  krer2706020HotAsphalt40MmNorm.waste_percent_default !== 0 ||
  krer2706020HotAsphalt40MmNorm.rounding.package_unit !== "krer_norm_unit" ||
  krer2706020HotAsphalt40MmNorm.rounding.package_size !== 1 ||
  krer2706020HotAsphalt40MmNorm.rounding.mode !==
    "no_rounding_of_fractional_1000_m2_table_units_before_exact_variant_resource_calculation"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${KRER27_06_020_HOT_ASPHALT_40MM_NORM_ID}`);
}

export const KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_METADATA = Object.freeze({
  source_id: KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_ID,
  norm_id: KRER27_06_020_HOT_ASPHALT_40MM_NORM_ID,
  source_document_version: roadworksNormPack.source_pack_version,
  source_title: krer2706020HotAsphalt40MmNorm.source.title,
  source_url: krer2706020HotAsphalt40MmNorm.source.url,
  exact_locator: krer2706020HotAsphalt40MmNorm.source.page,
  rate_value: krer2706020HotAsphalt40MmNorm.rate.value,
  rate_unit: krer2706020HotAsphalt40MmNorm.rate.unit,
  collection: krer2706020HotAsphalt40MmNorm.applicability.collection,
  table: krer2706020HotAsphalt40MmNorm.applicability.table,
  published_layer_thickness_mm:
    krer2706020HotAsphalt40MmNorm.applicability.published_layer_thickness_mm,
  table_measurement_basis_m2:
    krer2706020HotAsphalt40MmNorm.applicability.table_measurement_basis_m2,
  definition_hash: estimateDeterministicHash({
    work_group: roadworksNormPack.work_group,
    source_pack_version: roadworksNormPack.source_pack_version,
    norm_item: krer2706020HotAsphalt40MmNorm,
  }),
});

const ceresitCl51IndoorCeramicWetZoneNorm = (() => {
  const found = waterproofingNormPack.norm_items.find(
    (item) => item.norm_id === CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_NORM_ID}`);
  }
  return found;
})();

if (
  waterproofingNormPack.work_group !== "waterproofing" ||
  ceresitCl51IndoorCeramicWetZoneNorm.unit !== "kg" ||
  ceresitCl51IndoorCeramicWetZoneNorm.rate.value !== 1.3 ||
  ceresitCl51IndoorCeramicWetZoneNorm.rate.unit !== "minimum kg/m2 for two coats" ||
  ceresitCl51IndoorCeramicWetZoneNorm.applicability.product !== "Ceresit CL 51 Express 1-K" ||
  ceresitCl51IndoorCeramicWetZoneNorm.applicability.application_location !==
    "indoor_walls_and_floors_under_ceramic_coverings" ||
  ceresitCl51IndoorCeramicWetZoneNorm.applicability.documented_substrate_examples.join(",") !==
    "mineral_surface,concrete,fully_pointed_brickwork,cement_screed,cementitious_dry_screed,gypsum_board,aerated_concrete" ||
  ceresitCl51IndoorCeramicWetZoneNorm.applicability.wet_zones.join(",") !== "bathroom,kitchen,toilet" ||
  ceresitCl51IndoorCeramicWetZoneNorm.applicability.coat_count !== 2 ||
  ceresitCl51IndoorCeramicWetZoneNorm.applicability.dry_film_min_mm !== 0.5 ||
  ceresitCl51IndoorCeramicWetZoneNorm.applicability.swimming_pools_excluded !== true ||
  ceresitCl51IndoorCeramicWetZoneNorm.applicability.permanently_wet_areas_excluded !== true ||
  ceresitCl51IndoorCeramicWetZoneNorm.applicability.rear_surface_moisture_excluded !== true ||
  ceresitCl51IndoorCeramicWetZoneNorm.applicability.chemical_exposure_excluded !== true ||
  ceresitCl51IndoorCeramicWetZoneNorm.applicability.joint_and_penetration_accessories_excluded_from_rate !== true ||
  ceresitCl51IndoorCeramicWetZoneNorm.applicability.manufacturer_rate_is_minimum_required_amount !== true ||
  ceresitCl51IndoorCeramicWetZoneNorm.applicability.additional_waste_not_published !== true ||
  ceresitCl51IndoorCeramicWetZoneNorm.applicability.documented_bucket_sizes_kg.join(",") !== "5,15" ||
  ceresitCl51IndoorCeramicWetZoneNorm.parameters.length !==
    CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_REQUIRED_EXPLICIT_PARAMETER_IDS.some(
    (parameterId) => !ceresitCl51IndoorCeramicWetZoneNorm.parameters.includes(parameterId),
  ) ||
  ceresitCl51IndoorCeramicWetZoneNorm.waste_percent_default !== 0 ||
  ceresitCl51IndoorCeramicWetZoneNorm.rounding.package_unit !== "bucket" ||
  ceresitCl51IndoorCeramicWetZoneNorm.rounding.package_size !== 5 ||
  ceresitCl51IndoorCeramicWetZoneNorm.rounding.mode !==
    "minimum_required_kg_before_selected_5_or_15_kg_bucket_rounding"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_NORM_ID}`);
}

export const CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA = Object.freeze({
  source_id: CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_ID,
  norm_id: CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_NORM_ID,
  source_document_version: waterproofingNormPack.source_pack_version,
  source_title: ceresitCl51IndoorCeramicWetZoneNorm.source.title,
  source_url: ceresitCl51IndoorCeramicWetZoneNorm.source.url,
  exact_locator: ceresitCl51IndoorCeramicWetZoneNorm.source.page,
  rate_value: ceresitCl51IndoorCeramicWetZoneNorm.rate.value,
  rate_unit: ceresitCl51IndoorCeramicWetZoneNorm.rate.unit,
  product: ceresitCl51IndoorCeramicWetZoneNorm.applicability.product,
  application_location: ceresitCl51IndoorCeramicWetZoneNorm.applicability.application_location,
  documented_substrate_examples: [
    ...ceresitCl51IndoorCeramicWetZoneNorm.applicability.documented_substrate_examples,
  ],
  wet_zones: [...ceresitCl51IndoorCeramicWetZoneNorm.applicability.wet_zones],
  coat_count: ceresitCl51IndoorCeramicWetZoneNorm.applicability.coat_count,
  dry_film_min_mm: ceresitCl51IndoorCeramicWetZoneNorm.applicability.dry_film_min_mm,
  documented_bucket_sizes_kg: [
    ...ceresitCl51IndoorCeramicWetZoneNorm.applicability.documented_bucket_sizes_kg,
  ],
  waste_percent_default: ceresitCl51IndoorCeramicWetZoneNorm.waste_percent_default,
  definition_hash: estimateDeterministicHash({
    work_group: waterproofingNormPack.work_group,
    source_pack_version: waterproofingNormPack.source_pack_version,
    norm_item: ceresitCl51IndoorCeramicWetZoneNorm,
  }),
});

const ceresitCn87Exact50MmScreedNorm = (() => {
  const found = screedNormPack.norm_items.find(
    (item) => item.norm_id === CERESIT_CN87_50MM_SCREED_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${CERESIT_CN87_50MM_SCREED_NORM_ID}`);
  }
  return found;
})();

if (
  screedNormPack.work_group !== "screed" ||
  ceresitCn87Exact50MmScreedNorm.unit !== "kg" ||
  ceresitCn87Exact50MmScreedNorm.rate.value !== 100 ||
  ceresitCn87Exact50MmScreedNorm.rate.unit !==
    "approximate kg/m2 at exactly 50 mm; derived from 2.0 kg/m2 per mm" ||
  ceresitCn87Exact50MmScreedNorm.applicability.product !== "Ceresit CN 87" ||
  ceresitCn87Exact50MmScreedNorm.applicability.layer_thickness_mm !== 50 ||
  ceresitCn87Exact50MmScreedNorm.applicability.source_rate_kg_m2_per_mm !== 2 ||
  ceresitCn87Exact50MmScreedNorm.applicability.formula !==
    "cn87_mortar_kg = area_m2 * layer_thickness_mm * 2.0" ||
  ceresitCn87Exact50MmScreedNorm.applicability.bonded_screed_thickness_mm.join(",") !== "10,80" ||
  ceresitCn87Exact50MmScreedNorm.applicability.separation_layer_screed_thickness_mm.join(",") !== "35,80" ||
  ceresitCn87Exact50MmScreedNorm.applicability.floating_screed_thickness_mm.join(",") !== "45,80" ||
  ceresitCn87Exact50MmScreedNorm.applicability.heated_floating_screed_minimum_thickness_formula !==
    "45 + heating_pipe_outer_diameter_mm" ||
  ceresitCn87Exact50MmScreedNorm.applicability.production_scalar_valid_only_at_50_mm !== true ||
  ceresitCn87Exact50MmScreedNorm.applicability.contact_layer_materials_excluded_from_rate !== true ||
  ceresitCn87Exact50MmScreedNorm.applicability.additional_waste_not_published !== true ||
  ceresitCn87Exact50MmScreedNorm.applicability.documented_bag_size_kg !== 25 ||
  ceresitCn87Exact50MmScreedNorm.parameters.length !==
    CERESIT_CN87_50MM_SCREED_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  CERESIT_CN87_50MM_SCREED_REQUIRED_EXPLICIT_PARAMETER_IDS.some(
    (parameterId) => !ceresitCn87Exact50MmScreedNorm.parameters.includes(parameterId),
  ) ||
  ceresitCn87Exact50MmScreedNorm.waste_percent_default !== 0 ||
  ceresitCn87Exact50MmScreedNorm.rounding.package_unit !== "bag" ||
  ceresitCn87Exact50MmScreedNorm.rounding.package_size !== 25 ||
  ceresitCn87Exact50MmScreedNorm.rounding.mode !==
    "approximate_net_kg_before_25_kg_bag_rounding"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${CERESIT_CN87_50MM_SCREED_NORM_ID}`);
}

export const CERESIT_CN87_50MM_SCREED_SOURCE_METADATA = Object.freeze({
  source_id: CERESIT_CN87_50MM_SCREED_SOURCE_ID,
  norm_id: CERESIT_CN87_50MM_SCREED_NORM_ID,
  source_document_version: screedNormPack.source_pack_version,
  source_title: ceresitCn87Exact50MmScreedNorm.source.title,
  source_url: ceresitCn87Exact50MmScreedNorm.source.url,
  exact_locator: ceresitCn87Exact50MmScreedNorm.source.page,
  tds_identifier: "CN_87_KT_10.21",
  product: ceresitCn87Exact50MmScreedNorm.applicability.product,
  layer_thickness_mm: ceresitCn87Exact50MmScreedNorm.applicability.layer_thickness_mm,
  rate_value: ceresitCn87Exact50MmScreedNorm.applicability.source_rate_kg_m2_per_mm,
  rate_unit: "approximate kg/m2 per mm; exact production binding restricted to 50 mm",
  rate_kg_m2_at_50mm: ceresitCn87Exact50MmScreedNorm.rate.value,
  bonded_screed_thickness_mm: [
    ...ceresitCn87Exact50MmScreedNorm.applicability.bonded_screed_thickness_mm,
  ],
  separation_layer_screed_thickness_mm: [
    ...ceresitCn87Exact50MmScreedNorm.applicability.separation_layer_screed_thickness_mm,
  ],
  floating_screed_thickness_mm: [
    ...ceresitCn87Exact50MmScreedNorm.applicability.floating_screed_thickness_mm,
  ],
  package_size_kg: ceresitCn87Exact50MmScreedNorm.applicability.documented_bag_size_kg,
  waste_percent_default: ceresitCn87Exact50MmScreedNorm.waste_percent_default,
  definition_hash: estimateDeterministicHash({
    work_group: screedNormPack.work_group,
    source_pack_version: screedNormPack.source_pack_version,
    norm_item: ceresitCn87Exact50MmScreedNorm,
  }),
});

const ceresitCt17FlooringPrimerNorm = (() => {
  const found = flooringNormPack.norm_items.find(
    (item) => item.norm_id === CERESIT_CT17_FLOORING_PRIMER_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${CERESIT_CT17_FLOORING_PRIMER_NORM_ID}`);
  }
  return found;
})();
const ceresitCt17FlooringSurfaces = "surfaces" in ceresitCt17FlooringPrimerNorm.applicability
  ? ceresitCt17FlooringPrimerNorm.applicability.surfaces
  : null;
const ceresitCt17FlooringRateRange =
  "rate_range_l_m2" in ceresitCt17FlooringPrimerNorm.applicability
    ? ceresitCt17FlooringPrimerNorm.applicability.rate_range_l_m2
    : null;
const ceresitCt17FlooringContainerSizes =
  "documented_container_sizes_l" in ceresitCt17FlooringPrimerNorm.applicability
    ? ceresitCt17FlooringPrimerNorm.applicability.documented_container_sizes_l
    : null;

if (
  flooringNormPack.work_group !== "flooring" ||
  ceresitCt17FlooringPrimerNorm.unit !== "l" ||
  ceresitCt17FlooringPrimerNorm.rate.value !== 0.1 ||
  ceresitCt17FlooringPrimerNorm.rate.unit !==
    "published lower bound only; project rate must be selected within 0.1-0.5 l/m2" ||
  !("product" in ceresitCt17FlooringPrimerNorm.applicability) ||
  ceresitCt17FlooringPrimerNorm.applicability.product !== "Ceresit CT 17 Profi" ||
  !("tds_identifier" in ceresitCt17FlooringPrimerNorm.applicability) ||
  ceresitCt17FlooringPrimerNorm.applicability.tds_identifier !== "TDS No CT17 Profi 03.24" ||
  !ceresitCt17FlooringSurfaces ||
  ceresitCt17FlooringSurfaces.join(",") !== "absorbent_floor,concrete,screed,gypsum,anhydrite" ||
  !ceresitCt17FlooringRateRange ||
  ceresitCt17FlooringRateRange[0] !== 0.1 ||
  ceresitCt17FlooringRateRange[1] !== 0.5 ||
  !("repeat_if_still_absorbent_after_drying" in ceresitCt17FlooringPrimerNorm.applicability) ||
  ceresitCt17FlooringPrimerNorm.applicability.repeat_if_still_absorbent_after_drying !== true ||
  !("simple_rate_multiplication_forbidden" in ceresitCt17FlooringPrimerNorm.applicability) ||
  ceresitCt17FlooringPrimerNorm.applicability.simple_rate_multiplication_forbidden !== true ||
  !("selected_consumption_and_coat_count_required" in ceresitCt17FlooringPrimerNorm.applicability) ||
  ceresitCt17FlooringPrimerNorm.applicability.selected_consumption_and_coat_count_required !== true ||
  !("additional_waste_not_published" in ceresitCt17FlooringPrimerNorm.applicability) ||
  ceresitCt17FlooringPrimerNorm.applicability.additional_waste_not_published !== true ||
  !ceresitCt17FlooringContainerSizes ||
  ceresitCt17FlooringContainerSizes.join(",") !== "1,2,5,10" ||
  ceresitCt17FlooringPrimerNorm.parameters.length !==
    CERESIT_CT17_FLOORING_PRIMER_SOURCE_PARAMETER_IDS.length ||
  CERESIT_CT17_FLOORING_PRIMER_SOURCE_PARAMETER_IDS.some(
    (parameterId) => !ceresitCt17FlooringPrimerNorm.parameters.includes(parameterId),
  ) ||
  ceresitCt17FlooringPrimerNorm.waste_percent_default !== 0 ||
  ceresitCt17FlooringPrimerNorm.rounding.package_unit !== "container" ||
  ceresitCt17FlooringPrimerNorm.rounding.package_size !== 1 ||
  ceresitCt17FlooringPrimerNorm.rounding.mode !==
    "net_litres_before_rounding_to_explicitly_selected_1_2_5_or_10_l_container"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${CERESIT_CT17_FLOORING_PRIMER_NORM_ID}`);
}

export const CERESIT_CT17_FLOORING_PRIMER_SOURCE_METADATA = Object.freeze({
  source_id: CERESIT_CT17_FLOORING_PRIMER_SOURCE_ID,
  norm_id: CERESIT_CT17_FLOORING_PRIMER_NORM_ID,
  source_document_version: flooringNormPack.source_pack_version,
  source_title: ceresitCt17FlooringPrimerNorm.source.title,
  source_url: ceresitCt17FlooringPrimerNorm.source.url,
  exact_locator: ceresitCt17FlooringPrimerNorm.source.page,
  rate_value: ceresitCt17FlooringPrimerNorm.rate.value,
  rate_unit: ceresitCt17FlooringPrimerNorm.rate.unit,
  product: ceresitCt17FlooringPrimerNorm.applicability.product,
  tds_identifier: ceresitCt17FlooringPrimerNorm.applicability.tds_identifier,
  surfaces: [...ceresitCt17FlooringSurfaces],
  rate_range_l_m2: [ceresitCt17FlooringRateRange[0], ceresitCt17FlooringRateRange[1]] as const,
  documented_container_sizes_l: [...ceresitCt17FlooringContainerSizes],
  definition_hash: estimateDeterministicHash({
    work_group: flooringNormPack.work_group,
    source_pack_version: flooringNormPack.source_pack_version,
    norm_item: ceresitCt17FlooringPrimerNorm,
  }),
});

const ceresitCm11SmallCeramicIndoorNorm = (() => {
  const found = tileNormPack.norm_items.find(
    (item) => item.norm_id === CERESIT_CM11_SMALL_CERAMIC_INDOOR_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${CERESIT_CM11_SMALL_CERAMIC_INDOOR_NORM_ID}`);
  }
  return found;
})();
const ceresitCm11TileTypes = "tile_types" in ceresitCm11SmallCeramicIndoorNorm.applicability
  ? ceresitCm11SmallCeramicIndoorNorm.applicability.tile_types
  : null;
const ceresitCm11Surfaces = "surfaces" in ceresitCm11SmallCeramicIndoorNorm.applicability
  ? ceresitCm11SmallCeramicIndoorNorm.applicability.surfaces
  : null;
const ceresitCm11Locations = "installation_locations" in ceresitCm11SmallCeramicIndoorNorm.applicability
  ? ceresitCm11SmallCeramicIndoorNorm.applicability.installation_locations
  : null;
const ceresitCm11Orientations = "orientations" in ceresitCm11SmallCeramicIndoorNorm.applicability
  ? ceresitCm11SmallCeramicIndoorNorm.applicability.orientations
  : null;
const ceresitCm11RateTable = "rate_table_kg_m2" in ceresitCm11SmallCeramicIndoorNorm.applicability
  ? ceresitCm11SmallCeramicIndoorNorm.applicability.rate_table_kg_m2
  : null;
const ceresitCm11RateVariesWith = "rate_varies_with" in ceresitCm11SmallCeramicIndoorNorm.applicability
  ? ceresitCm11SmallCeramicIndoorNorm.applicability.rate_varies_with
  : null;

if (
  tileNormPack.work_group !== "tile" ||
  ceresitCm11SmallCeramicIndoorNorm.unit !== "kg" ||
  ceresitCm11SmallCeramicIndoorNorm.rate.value !== 2 ||
  ceresitCm11SmallCeramicIndoorNorm.rate.unit !==
    "lowest approximate table row only; exact project row is selected by tile-size category and paired trowel notch" ||
  !("product" in ceresitCm11SmallCeramicIndoorNorm.applicability) ||
  ceresitCm11SmallCeramicIndoorNorm.applicability.product !== "Ceresit CM 11 PLUS" ||
  !("tds_identifier" in ceresitCm11SmallCeramicIndoorNorm.applicability) ||
  ceresitCm11SmallCeramicIndoorNorm.applicability.tds_identifier !== "CERESIT_CM11_TDS_04_2026" ||
  !ceresitCm11TileTypes ||
  !(ceresitCm11TileTypes as readonly string[]).includes("ceramic") ||
  !("tile_max_area_m2" in ceresitCm11SmallCeramicIndoorNorm.applicability) ||
  ceresitCm11SmallCeramicIndoorNorm.applicability.tile_max_area_m2 !== 0.25 ||
  !("tile_max_side_cm" in ceresitCm11SmallCeramicIndoorNorm.applicability) ||
  ceresitCm11SmallCeramicIndoorNorm.applicability.tile_max_side_cm !== 60 ||
  !ceresitCm11Surfaces ||
  !(ceresitCm11Surfaces as readonly string[]).includes("cement_screed") ||
  !ceresitCm11Locations ||
  !(ceresitCm11Locations as readonly string[]).includes("indoor") ||
  !ceresitCm11Orientations ||
  !(ceresitCm11Orientations as readonly string[]).includes("horizontal") ||
  !("substrate_even_load_bearing_compact_dry_clean_required" in ceresitCm11SmallCeramicIndoorNorm.applicability) ||
  ceresitCm11SmallCeramicIndoorNorm.applicability.substrate_even_load_bearing_compact_dry_clean_required !== true ||
  !("application_temperature_min_c" in ceresitCm11SmallCeramicIndoorNorm.applicability) ||
  ceresitCm11SmallCeramicIndoorNorm.applicability.application_temperature_min_c !== 5 ||
  !("application_temperature_max_c" in ceresitCm11SmallCeramicIndoorNorm.applicability) ||
  ceresitCm11SmallCeramicIndoorNorm.applicability.application_temperature_max_c !== 25 ||
  !("indoor_minimum_tile_back_contact_percent" in ceresitCm11SmallCeramicIndoorNorm.applicability) ||
  ceresitCm11SmallCeramicIndoorNorm.applicability.indoor_minimum_tile_back_contact_percent !== 65 ||
  !("larger_tile_or_outdoor_minimum_contact_percent" in ceresitCm11SmallCeramicIndoorNorm.applicability) ||
  ceresitCm11SmallCeramicIndoorNorm.applicability.larger_tile_or_outdoor_minimum_contact_percent !== 90 ||
  !("larger_tile_or_outdoor_floating_buttering_required" in ceresitCm11SmallCeramicIndoorNorm.applicability) ||
  ceresitCm11SmallCeramicIndoorNorm.applicability.larger_tile_or_outdoor_floating_buttering_required !== true ||
  !ceresitCm11RateTable ||
  ceresitCm11RateTable.up_to_10_cm__4_mm !== 2 ||
  ceresitCm11RateTable.up_to_15_cm__6_mm !== 2.7 ||
  ceresitCm11RateTable.up_to_25_cm__8_mm !== 3.4 ||
  ceresitCm11RateTable.up_to_30_cm__10_mm !== 4.2 ||
  ceresitCm11RateTable.above_30_to_60_cm__12_mm !== 4.8 ||
  !ceresitCm11RateVariesWith ||
  ceresitCm11RateVariesWith.length !== 3 ||
  ["substrate_evenness", "trowel_notch_mm", "tile_type"]
    .some((parameterId) => !(ceresitCm11RateVariesWith as readonly string[]).includes(parameterId)) ||
  !("simple_rate_multiplication_forbidden" in ceresitCm11SmallCeramicIndoorNorm.applicability) ||
  ceresitCm11SmallCeramicIndoorNorm.applicability.simple_rate_multiplication_forbidden !== true ||
  !("exact_table_pair_required" in ceresitCm11SmallCeramicIndoorNorm.applicability) ||
  ceresitCm11SmallCeramicIndoorNorm.applicability.exact_table_pair_required !== true ||
  !("additional_waste_not_published" in ceresitCm11SmallCeramicIndoorNorm.applicability) ||
  ceresitCm11SmallCeramicIndoorNorm.applicability.additional_waste_not_published !== true ||
  !("technical_data_mix_batch_size_kg" in ceresitCm11SmallCeramicIndoorNorm.applicability) ||
  ceresitCm11SmallCeramicIndoorNorm.applicability.technical_data_mix_batch_size_kg !== 25 ||
  ceresitCm11SmallCeramicIndoorNorm.parameters.length !==
    CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_PARAMETER_IDS.length ||
  CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_PARAMETER_IDS.some(
    (parameterId) => !ceresitCm11SmallCeramicIndoorNorm.parameters.includes(parameterId),
  ) ||
  ceresitCm11SmallCeramicIndoorNorm.waste_percent_default !== 0 ||
  ceresitCm11SmallCeramicIndoorNorm.rounding.package_unit !== "kg" ||
  ceresitCm11SmallCeramicIndoorNorm.rounding.package_size !== 25 ||
  ceresitCm11SmallCeramicIndoorNorm.rounding.mode !==
    "approximate_net_kg_before_explicit_project_package_selection"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${CERESIT_CM11_SMALL_CERAMIC_INDOOR_NORM_ID}`);
}

export const CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA = Object.freeze({
  source_id: CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_ID,
  norm_id: CERESIT_CM11_SMALL_CERAMIC_INDOOR_NORM_ID,
  source_document_version: tileNormPack.source_pack_version,
  source_title: ceresitCm11SmallCeramicIndoorNorm.source.title,
  source_url: ceresitCm11SmallCeramicIndoorNorm.source.url,
  exact_locator: ceresitCm11SmallCeramicIndoorNorm.source.page,
  rate_value: ceresitCm11SmallCeramicIndoorNorm.rate.value,
  rate_unit: ceresitCm11SmallCeramicIndoorNorm.rate.unit,
  product: ceresitCm11SmallCeramicIndoorNorm.applicability.product,
  tds_identifier: ceresitCm11SmallCeramicIndoorNorm.applicability.tds_identifier,
  exact_table_pair: "up_to_10_cm__4_mm" as const,
  tile_type: "ceramic" as const,
  tile_size_category: "up_to_10_cm" as const,
  trowel_notch_mm: 4 as const,
  substrate_type: "cement_screed" as const,
  installation_location: "indoor" as const,
  installation_orientation: "horizontal" as const,
  minimum_tile_back_contact_percent: 65 as const,
  floating_buttering_required: false as const,
  application_temperature_min_c: 5 as const,
  application_temperature_max_c: 25 as const,
  package_size_kg: 25 as const,
  additional_waste_not_published: true as const,
  definition_hash: estimateDeterministicHash({
    work_group: tileNormPack.work_group,
    source_pack_version: tileNormPack.source_pack_version,
    norm_item: ceresitCm11SmallCeramicIndoorNorm,
  }),
});

const ceresitCt17TilePrimerNorm = (() => {
  const found = tileNormPack.norm_items.find(
    (item) => item.norm_id === CERESIT_CT17_TILE_PRIMER_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${CERESIT_CT17_TILE_PRIMER_NORM_ID}`);
  }
  return found;
})();
const ceresitCt17TileSurfaces = "surfaces" in ceresitCt17TilePrimerNorm.applicability
  ? ceresitCt17TilePrimerNorm.applicability.surfaces
  : null;
const ceresitCt17TileRateRange = "rate_range_l_m2" in ceresitCt17TilePrimerNorm.applicability
  ? ceresitCt17TilePrimerNorm.applicability.rate_range_l_m2
  : null;
const ceresitCt17TileContainerSizes =
  "documented_container_sizes_l" in ceresitCt17TilePrimerNorm.applicability
    ? ceresitCt17TilePrimerNorm.applicability.documented_container_sizes_l
    : null;

if (
  tileNormPack.work_group !== "tile" ||
  ceresitCt17TilePrimerNorm.unit !== "l" ||
  ceresitCt17TilePrimerNorm.rate.value !== 0.1 ||
  ceresitCt17TilePrimerNorm.rate.unit !==
    "published lower bound only; project rate must be selected within 0.1-0.5 l/m2" ||
  !("product" in ceresitCt17TilePrimerNorm.applicability) ||
  ceresitCt17TilePrimerNorm.applicability.product !== "Ceresit CT 17 Profi" ||
  !("tds_identifier" in ceresitCt17TilePrimerNorm.applicability) ||
  ceresitCt17TilePrimerNorm.applicability.tds_identifier !== "TDS No CT17 Profi 03.24" ||
  !ceresitCt17TileSurfaces ||
  !(ceresitCt17TileSurfaces as readonly string[]).includes("screed") ||
  !ceresitCt17TileRateRange ||
  ceresitCt17TileRateRange[0] !== 0.1 ||
  ceresitCt17TileRateRange[1] !== 0.5 ||
  !("cement_or_cement_lime_before_tile_wait_minutes" in ceresitCt17TilePrimerNorm.applicability) ||
  ceresitCt17TilePrimerNorm.applicability.cement_or_cement_lime_before_tile_wait_minutes !== 15 ||
  !("other_substrates_require_complete_drying" in ceresitCt17TilePrimerNorm.applicability) ||
  ceresitCt17TilePrimerNorm.applicability.other_substrates_require_complete_drying !== true ||
  !("application_temperature_min_c" in ceresitCt17TilePrimerNorm.applicability) ||
  ceresitCt17TilePrimerNorm.applicability.application_temperature_min_c !== 5 ||
  !("application_temperature_max_c" in ceresitCt17TilePrimerNorm.applicability) ||
  ceresitCt17TilePrimerNorm.applicability.application_temperature_max_c !== 25 ||
  !("application_relative_humidity_max_percent" in ceresitCt17TilePrimerNorm.applicability) ||
  ceresitCt17TilePrimerNorm.applicability.application_relative_humidity_max_percent !== 80 ||
  !("simple_rate_multiplication_forbidden" in ceresitCt17TilePrimerNorm.applicability) ||
  ceresitCt17TilePrimerNorm.applicability.simple_rate_multiplication_forbidden !== true ||
  !("selected_consumption_and_coat_count_required" in ceresitCt17TilePrimerNorm.applicability) ||
  ceresitCt17TilePrimerNorm.applicability.selected_consumption_and_coat_count_required !== true ||
  !("additional_waste_not_published" in ceresitCt17TilePrimerNorm.applicability) ||
  ceresitCt17TilePrimerNorm.applicability.additional_waste_not_published !== true ||
  !ceresitCt17TileContainerSizes ||
  ceresitCt17TileContainerSizes.join(",") !== "1,2,5,10" ||
  ceresitCt17TilePrimerNorm.parameters.length !== CERESIT_CT17_TILE_PRIMER_SOURCE_PARAMETER_IDS.length ||
  CERESIT_CT17_TILE_PRIMER_SOURCE_PARAMETER_IDS.some(
    (parameterId) => !ceresitCt17TilePrimerNorm.parameters.includes(parameterId),
  ) ||
  ceresitCt17TilePrimerNorm.waste_percent_default !== 0 ||
  ceresitCt17TilePrimerNorm.rounding.package_unit !== "container" ||
  ceresitCt17TilePrimerNorm.rounding.package_size !== 1 ||
  ceresitCt17TilePrimerNorm.rounding.mode !==
    "net_litres_before_rounding_to_explicitly_selected_1_2_5_or_10_l_container"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${CERESIT_CT17_TILE_PRIMER_NORM_ID}`);
}

export const CERESIT_CT17_TILE_PRIMER_SOURCE_METADATA = Object.freeze({
  source_id: CERESIT_CT17_TILE_PRIMER_SOURCE_ID,
  norm_id: CERESIT_CT17_TILE_PRIMER_NORM_ID,
  source_document_version: tileNormPack.source_pack_version,
  source_title: ceresitCt17TilePrimerNorm.source.title,
  source_url: ceresitCt17TilePrimerNorm.source.url,
  exact_locator: ceresitCt17TilePrimerNorm.source.page,
  rate_value: ceresitCt17TilePrimerNorm.rate.value,
  rate_unit: ceresitCt17TilePrimerNorm.rate.unit,
  product: ceresitCt17TilePrimerNorm.applicability.product,
  tds_identifier: ceresitCt17TilePrimerNorm.applicability.tds_identifier,
  surfaces: [...ceresitCt17TileSurfaces],
  rate_range_l_m2: [ceresitCt17TileRateRange[0], ceresitCt17TileRateRange[1]] as const,
  cement_wait_minutes: 15 as const,
  application_temperature_min_c: 5 as const,
  application_temperature_max_c: 25 as const,
  application_relative_humidity_max_percent: 80 as const,
  documented_container_sizes_l: [...ceresitCt17TileContainerSizes],
  definition_hash: estimateDeterministicHash({
    work_group: tileNormPack.work_group,
    source_pack_version: tileNormPack.source_pack_version,
    norm_item: ceresitCt17TilePrimerNorm,
  }),
});

const ceresitCt54InteriorWallNorm = (() => {
  const found = paintNormPack.norm_items.find(
    (item) => item.norm_id === CERESIT_CT54_INTERIOR_WALL_NORM_ID,
  );
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${CERESIT_CT54_INTERIOR_WALL_NORM_ID}`);
  return found;
})();
const ceresitCt54Surfaces = "surfaces" in ceresitCt54InteriorWallNorm.applicability
  ? ceresitCt54InteriorWallNorm.applicability.surfaces
  : null;
const ceresitCt54Locations = "installation_locations" in ceresitCt54InteriorWallNorm.applicability
  ? ceresitCt54InteriorWallNorm.applicability.installation_locations
  : null;
const ceresitCt54ContainerSizes = "documented_container_sizes_l" in ceresitCt54InteriorWallNorm.applicability
  ? ceresitCt54InteriorWallNorm.applicability.documented_container_sizes_l
  : null;

if (
  paintNormPack.work_group !== "paint" ||
  paintNormPack.source_pack_version !== "2026.09-ceresit-ct54-ct17-primary-review-r2" ||
  ceresitCt54InteriorWallNorm.unit !== "l" ||
  ceresitCt54InteriorWallNorm.rate.value !== 0.3 ||
  !("product" in ceresitCt54InteriorWallNorm.applicability) ||
  ceresitCt54InteriorWallNorm.applicability.product !== "Ceresit CT 54 Silicate Aero" ||
  !("tds_identifier" in ceresitCt54InteriorWallNorm.applicability) ||
  ceresitCt54InteriorWallNorm.applicability.tds_identifier !== "C_CT54_TDS_1_0819" ||
  !ceresitCt54Surfaces ||
  !(ceresitCt54Surfaces as readonly string[]).includes("cement_plaster") ||
  !ceresitCt54Locations ||
  !(ceresitCt54Locations as readonly string[]).includes("indoor") ||
  !("coat_count" in ceresitCt54InteriorWallNorm.applicability) ||
  ceresitCt54InteriorWallNorm.applicability.coat_count !== 2 ||
  !("minimum_intercoat_break_hours" in ceresitCt54InteriorWallNorm.applicability) ||
  ceresitCt54InteriorWallNorm.applicability.minimum_intercoat_break_hours !== 12 ||
  !("application_temperature_min_c" in ceresitCt54InteriorWallNorm.applicability) ||
  ceresitCt54InteriorWallNorm.applicability.application_temperature_min_c !== 5 ||
  !("application_temperature_max_c" in ceresitCt54InteriorWallNorm.applicability) ||
  ceresitCt54InteriorWallNorm.applicability.application_temperature_max_c !== 25 ||
  !("application_relative_humidity_max_percent_exclusive" in ceresitCt54InteriorWallNorm.applicability) ||
  ceresitCt54InteriorWallNorm.applicability.application_relative_humidity_max_percent_exclusive !== 80 ||
  !ceresitCt54ContainerSizes ||
  ceresitCt54ContainerSizes.join(",") !== "3.5,15" ||
  ceresitCt54InteriorWallNorm.parameters.length !== CERESIT_CT54_SOURCE_PARAMETER_IDS.length ||
  CERESIT_CT54_SOURCE_PARAMETER_IDS.some(
    (parameterId) => !ceresitCt54InteriorWallNorm.parameters.includes(parameterId),
  ) ||
  ceresitCt54InteriorWallNorm.waste_percent_default !== 0 ||
  ceresitCt54InteriorWallNorm.rounding.package_size !== 3.5 ||
  ceresitCt54InteriorWallNorm.rounding.mode !==
    "approximate_net_litres_before_rounding_to_explicitly_selected_3_5_or_15_l_container"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${CERESIT_CT54_INTERIOR_WALL_NORM_ID}`);
}

export const CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA = Object.freeze({
  source_id: CERESIT_CT54_INTERIOR_WALL_SOURCE_ID,
  norm_id: CERESIT_CT54_INTERIOR_WALL_NORM_ID,
  source_document_version: paintNormPack.source_pack_version,
  source_title: ceresitCt54InteriorWallNorm.source.title,
  source_url: ceresitCt54InteriorWallNorm.source.url,
  exact_locator: ceresitCt54InteriorWallNorm.source.page,
  rate_value: ceresitCt54InteriorWallNorm.rate.value,
  rate_unit: ceresitCt54InteriorWallNorm.rate.unit,
  product: ceresitCt54InteriorWallNorm.applicability.product,
  tds_identifier: ceresitCt54InteriorWallNorm.applicability.tds_identifier,
  surfaces: [...ceresitCt54Surfaces],
  installation_locations: [...ceresitCt54Locations],
  coat_count: 2 as const,
  minimum_intercoat_break_hours: 12 as const,
  application_temperature_min_c: 5 as const,
  application_temperature_max_c: 25 as const,
  application_relative_humidity_max_percent_exclusive: 80 as const,
  documented_container_sizes_l: [...ceresitCt54ContainerSizes],
  additional_waste_not_published: true as const,
  definition_hash: estimateDeterministicHash({
    work_group: paintNormPack.work_group,
    source_pack_version: paintNormPack.source_pack_version,
    norm_item: ceresitCt54InteriorWallNorm,
  }),
});

const ceresitCt17PaintPrimerNorm = (() => {
  const found = paintNormPack.norm_items.find(
    (item) => item.norm_id === CERESIT_CT17_PAINT_PRIMER_NORM_ID,
  );
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${CERESIT_CT17_PAINT_PRIMER_NORM_ID}`);
  return found;
})();
const ceresitCt17PaintSurfaces = "surfaces" in ceresitCt17PaintPrimerNorm.applicability
  ? ceresitCt17PaintPrimerNorm.applicability.surfaces
  : null;
const ceresitCt17PaintRateRange = "rate_range_l_m2" in ceresitCt17PaintPrimerNorm.applicability
  ? ceresitCt17PaintPrimerNorm.applicability.rate_range_l_m2
  : null;
const ceresitCt17PaintDilutions = "painting_dilution_options" in ceresitCt17PaintPrimerNorm.applicability
  ? ceresitCt17PaintPrimerNorm.applicability.painting_dilution_options
  : null;
const ceresitCt17PaintContainerSizes = "documented_container_sizes_l" in ceresitCt17PaintPrimerNorm.applicability
  ? ceresitCt17PaintPrimerNorm.applicability.documented_container_sizes_l
  : null;

if (
  ceresitCt17PaintPrimerNorm.unit !== "l" ||
  ceresitCt17PaintPrimerNorm.rate.value !== 0.1 ||
  !("product" in ceresitCt17PaintPrimerNorm.applicability) ||
  ceresitCt17PaintPrimerNorm.applicability.product !== "Ceresit CT 17 Profi" ||
  !("tds_identifier" in ceresitCt17PaintPrimerNorm.applicability) ||
  ceresitCt17PaintPrimerNorm.applicability.tds_identifier !== "TDS No CT17 Profi 03.24" ||
  !ceresitCt17PaintSurfaces ||
  !(ceresitCt17PaintSurfaces as readonly string[]).includes("plaster") ||
  !ceresitCt17PaintRateRange ||
  ceresitCt17PaintRateRange[0] !== 0.1 ||
  ceresitCt17PaintRateRange[1] !== 0.5 ||
  !ceresitCt17PaintDilutions ||
  ceresitCt17PaintDilutions.join(",") !== "undiluted,water_1_to_1" ||
  !("application_stage" in ceresitCt17PaintPrimerNorm.applicability) ||
  ceresitCt17PaintPrimerNorm.applicability.application_stage !== "before_painting" ||
  !("application_temperature_min_c" in ceresitCt17PaintPrimerNorm.applicability) ||
  ceresitCt17PaintPrimerNorm.applicability.application_temperature_min_c !== 5 ||
  !("application_temperature_max_c" in ceresitCt17PaintPrimerNorm.applicability) ||
  ceresitCt17PaintPrimerNorm.applicability.application_temperature_max_c !== 25 ||
  !("application_relative_humidity_max_percent_exclusive" in ceresitCt17PaintPrimerNorm.applicability) ||
  ceresitCt17PaintPrimerNorm.applicability.application_relative_humidity_max_percent_exclusive !== 80 ||
  !ceresitCt17PaintContainerSizes ||
  ceresitCt17PaintContainerSizes.join(",") !== "1,2,5,10" ||
  ceresitCt17PaintPrimerNorm.parameters.length !== CERESIT_CT17_PAINT_SOURCE_PARAMETER_IDS.length ||
  CERESIT_CT17_PAINT_SOURCE_PARAMETER_IDS.some(
    (parameterId) => !ceresitCt17PaintPrimerNorm.parameters.includes(parameterId),
  ) ||
  ceresitCt17PaintPrimerNorm.waste_percent_default !== 0 ||
  ceresitCt17PaintPrimerNorm.rounding.package_size !== 1 ||
  ceresitCt17PaintPrimerNorm.rounding.mode !==
    "net_litres_before_rounding_to_explicitly_selected_1_2_5_or_10_l_container"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${CERESIT_CT17_PAINT_PRIMER_NORM_ID}`);
}

export const CERESIT_CT17_PAINT_PRIMER_SOURCE_METADATA = Object.freeze({
  source_id: CERESIT_CT17_PAINT_PRIMER_SOURCE_ID,
  norm_id: CERESIT_CT17_PAINT_PRIMER_NORM_ID,
  source_document_version: paintNormPack.source_pack_version,
  source_title: ceresitCt17PaintPrimerNorm.source.title,
  source_url: ceresitCt17PaintPrimerNorm.source.url,
  exact_locator: ceresitCt17PaintPrimerNorm.source.page,
  rate_value: ceresitCt17PaintPrimerNorm.rate.value,
  rate_unit: ceresitCt17PaintPrimerNorm.rate.unit,
  product: ceresitCt17PaintPrimerNorm.applicability.product,
  tds_identifier: ceresitCt17PaintPrimerNorm.applicability.tds_identifier,
  surfaces: [...ceresitCt17PaintSurfaces],
  rate_range_l_m2: [ceresitCt17PaintRateRange[0], ceresitCt17PaintRateRange[1]] as const,
  painting_dilution_options: [...ceresitCt17PaintDilutions],
  application_temperature_min_c: 5 as const,
  application_temperature_max_c: 25 as const,
  application_relative_humidity_max_percent_exclusive: 80 as const,
  documented_container_sizes_l: [...ceresitCt17PaintContainerSizes],
  additional_waste_not_published: true as const,
  definition_hash: estimateDeterministicHash({
    work_group: paintNormPack.work_group,
    source_pack_version: paintNormPack.source_pack_version,
    norm_item: ceresitCt17PaintPrimerNorm,
  }),
});

const nrmcaCip31SelectedContingencyNorm = (() => {
  const found = concreteNormPack.norm_items.find(
    (item) => item.norm_id === NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID}`);
  }
  return found;
})();
const nrmcaCip31ContingencyRange =
  "published_contingency_percent_range" in nrmcaCip31SelectedContingencyNorm.applicability
    ? nrmcaCip31SelectedContingencyNorm.applicability.published_contingency_percent_range
    : null;

if (
  concreteNormPack.work_group !== "concrete" ||
  concreteNormPack.source_pack_version !== "2026.09-nrmca-cip31-order-quantity-primary-review-r2" ||
  nrmcaCip31SelectedContingencyNorm.unit !== "m3" ||
  nrmcaCip31SelectedContingencyNorm.rate.value !== 1.04 ||
  !nrmcaCip31ContingencyRange ||
  nrmcaCip31ContingencyRange[0] !== 4 ||
  nrmcaCip31ContingencyRange[1] !== 10 ||
  !("selected_contingency_percent_required" in nrmcaCip31SelectedContingencyNorm.applicability) ||
  nrmcaCip31SelectedContingencyNorm.applicability.selected_contingency_percent_required !== true ||
  !("simple_lower_bound_rate_multiplication_forbidden" in nrmcaCip31SelectedContingencyNorm.applicability) ||
  nrmcaCip31SelectedContingencyNorm.applicability.simple_lower_bound_rate_multiplication_forbidden !== true ||
  !("automatic_production_binding_for_generic_concrete_forbidden" in nrmcaCip31SelectedContingencyNorm.applicability) ||
  nrmcaCip31SelectedContingencyNorm.applicability.automatic_production_binding_for_generic_concrete_forbidden !== true ||
  nrmcaCip31SelectedContingencyNorm.parameters.length !== NRMCA_CIP31_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  NRMCA_CIP31_REQUIRED_EXPLICIT_PARAMETER_IDS.some(
    (parameterId) => !nrmcaCip31SelectedContingencyNorm.parameters.includes(parameterId),
  ) ||
  nrmcaCip31SelectedContingencyNorm.waste_percent_default !== 0 ||
  nrmcaCip31SelectedContingencyNorm.rounding.package_size !== 1 ||
  nrmcaCip31SelectedContingencyNorm.rounding.mode !==
    "no_rounding_until_project_volume_selected_contingency_and_producer_order_increment_are_confirmed"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID}`);
}

export const NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA = Object.freeze({
  source_id: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
  norm_id: NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID,
  source_document_version: concreteNormPack.source_pack_version,
  source_title: nrmcaCip31SelectedContingencyNorm.source.title,
  source_url: nrmcaCip31SelectedContingencyNorm.source.url,
  exact_locator: nrmcaCip31SelectedContingencyNorm.source.page,
  rate_value: nrmcaCip31SelectedContingencyNorm.rate.value,
  rate_unit: nrmcaCip31SelectedContingencyNorm.rate.unit,
  minimum_selected_contingency_percent: 4 as const,
  maximum_selected_contingency_percent: 10 as const,
  automatic_generic_binding_forbidden: true as const,
  definition_hash: estimateDeterministicHash({
    work_group: concreteNormPack.work_group,
    source_pack_version: concreteNormPack.source_pack_version,
    norm_item: nrmcaCip31SelectedContingencyNorm,
  }),
});

const legrandP31TrayJointFastenerNorm = (() => {
  const found = electricalNormPack.norm_items.find(
    (item) => item.norm_id === LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID,
  );
  if (!found) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID}`);
  }
  return found;
})();
const legrandP31CouplerOptions = "coupler_options" in legrandP31TrayJointFastenerNorm.applicability
  ? legrandP31TrayJointFastenerNorm.applicability.coupler_options
  : null;

if (
  electricalNormPack.work_group !== "electrical" ||
  legrandP31TrayJointFastenerNorm.unit !== "piece" ||
  legrandP31TrayJointFastenerNorm.rate.value !== 8 ||
  legrandP31TrayJointFastenerNorm.rate.unit !== "M6 fasteners/tray joint for 75-300 mm tray" ||
  !("system" in legrandP31TrayJointFastenerNorm.applicability) ||
  legrandP31TrayJointFastenerNorm.applicability.system !== "Legrand P31 symmetrical cable tray" ||
  !("tray_width_mm_min" in legrandP31TrayJointFastenerNorm.applicability) ||
  legrandP31TrayJointFastenerNorm.applicability.tray_width_mm_min !== 75 ||
  !("tray_width_mm_max" in legrandP31TrayJointFastenerNorm.applicability) ||
  legrandP31TrayJointFastenerNorm.applicability.tray_width_mm_max !== 300 ||
  !legrandP31CouplerOptions ||
  legrandP31CouplerOptions.length !== 2 ||
  !legrandP31CouplerOptions.includes("EP Coupler LG-341213") ||
  !legrandP31CouplerOptions.includes("ER Coupler LG-482219") ||
  !("tightening_torque_nm" in legrandP31TrayJointFastenerNorm.applicability) ||
  legrandP31TrayJointFastenerNorm.applicability.tightening_torque_nm !== 11 ||
  !("other_widths_require_their_own_table_row" in legrandP31TrayJointFastenerNorm.applicability) ||
  legrandP31TrayJointFastenerNorm.applicability.other_widths_require_their_own_table_row !== true ||
  legrandP31TrayJointFastenerNorm.rounding.mode !== "ceil"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID}`);
}

export const LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA = Object.freeze({
  source_id: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_ID,
  norm_id: LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID,
  source_document_version: electricalNormPack.source_pack_version,
  source_title: legrandP31TrayJointFastenerNorm.source.title,
  source_url: legrandP31TrayJointFastenerNorm.source.url,
  exact_locator: legrandP31TrayJointFastenerNorm.source.page,
  rate_value: legrandP31TrayJointFastenerNorm.rate.value,
  rate_unit: legrandP31TrayJointFastenerNorm.rate.unit,
  system: legrandP31TrayJointFastenerNorm.applicability.system,
  tray_width_mm_min: legrandP31TrayJointFastenerNorm.applicability.tray_width_mm_min,
  tray_width_mm_max: legrandP31TrayJointFastenerNorm.applicability.tray_width_mm_max,
  coupler_options: [...legrandP31CouplerOptions],
  tightening_torque_nm: legrandP31TrayJointFastenerNorm.applicability.tightening_torque_nm,
  definition_hash: estimateDeterministicHash({
    work_group: electricalNormPack.work_group,
    source_pack_version: electricalNormPack.source_pack_version,
    norm_item: legrandP31TrayJointFastenerNorm,
  }),
});

const wavinHep2OSmartSleeveNorm = (() => {
  const found = plumbingNormPack.norm_items.find((item) => item.norm_id === WAVIN_HEP2O_SMARTSLEEVE_NORM_ID);
  if (!found) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${WAVIN_HEP2O_SMARTSLEEVE_NORM_ID}`);
  return found;
})();

if (
  plumbingNormPack.work_group !== "plumbing" ||
  wavinHep2OSmartSleeveNorm.unit !== "piece" ||
  wavinHep2OSmartSleeveNorm.rate.value !== 1 ||
  wavinHep2OSmartSleeveNorm.rate.unit !== "piece/prepared pipe end inserted into fitting" ||
  wavinHep2OSmartSleeveNorm.applicability.system !== "Wavin Hep2O push-fit" ||
  wavinHep2OSmartSleeveNorm.applicability.count_basis !== "prepared_pipe_end_count" ||
  wavinHep2OSmartSleeveNorm.parameters.length !==
    WAVIN_HEP2O_SMARTSLEEVE_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
  WAVIN_HEP2O_SMARTSLEEVE_REQUIRED_EXPLICIT_PARAMETER_IDS.some(
    (parameterId) => !wavinHep2OSmartSleeveNorm.parameters.includes(parameterId),
  ) ||
  wavinHep2OSmartSleeveNorm.rounding.package_unit !== "piece" ||
  wavinHep2OSmartSleeveNorm.rounding.package_size !== 1 ||
  wavinHep2OSmartSleeveNorm.rounding.mode !== "exact_integer_prepared_pipe_end_count"
) {
  throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${WAVIN_HEP2O_SMARTSLEEVE_NORM_ID}`);
}

export const WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA = Object.freeze({
  source_id: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID,
  norm_id: WAVIN_HEP2O_SMARTSLEEVE_NORM_ID,
  source_document_version: plumbingNormPack.source_pack_version,
  source_title: wavinHep2OSmartSleeveNorm.source.title,
  source_url: wavinHep2OSmartSleeveNorm.source.url,
  exact_locator: wavinHep2OSmartSleeveNorm.source.page,
  rate_value: wavinHep2OSmartSleeveNorm.rate.value,
  rate_unit: wavinHep2OSmartSleeveNorm.rate.unit,
  system: wavinHep2OSmartSleeveNorm.applicability.system,
  installation_step: wavinHep2OSmartSleeveNorm.applicability.installation_step,
  count_basis: wavinHep2OSmartSleeveNorm.applicability.count_basis,
  definition_hash: estimateDeterministicHash({
    work_group: plumbingNormPack.work_group,
    source_pack_version: plumbingNormPack.source_pack_version,
    norm_item: wavinHep2OSmartSleeveNorm,
  }),
});

const wavinHep2OClipNorms = [{
  norm_id: WAVIN_HEP2O_15MM_HORIZONTAL_CLIP_NORM_ID,
  source_id: WAVIN_HEP2O_15MM_HORIZONTAL_CLIP_SOURCE_ID,
  diameter_mm: 15,
  orientation: "horizontal",
  maximum_clip_spacing_m: 0.3,
}, {
  norm_id: WAVIN_HEP2O_22MM_HORIZONTAL_CLIP_NORM_ID,
  source_id: WAVIN_HEP2O_22MM_HORIZONTAL_CLIP_SOURCE_ID,
  diameter_mm: 22,
  orientation: "horizontal",
  maximum_clip_spacing_m: 0.5,
}, {
  norm_id: WAVIN_HEP2O_15MM_VERTICAL_CLIP_NORM_ID,
  source_id: WAVIN_HEP2O_15MM_VERTICAL_CLIP_SOURCE_ID,
  diameter_mm: 15,
  orientation: "vertical",
  maximum_clip_spacing_m: 0.5,
}] as const;

export const WAVIN_HEP2O_CLIP_SOURCE_METADATA = Object.freeze(wavinHep2OClipNorms.map((expected) => {
  const normItem = plumbingNormPack.norm_items.find((item) => item.norm_id === expected.norm_id);
  if (!normItem) throw new Error(`PHYSICAL_NORM_DEFINITION_MISSING:${expected.norm_id}`);
  if (
    plumbingNormPack.work_group !== "plumbing" ||
    normItem.unit !== "piece" ||
    normItem.rate.value !== expected.maximum_clip_spacing_m ||
    normItem.rate.unit !== "recommended maximum support distance m for general-purpose run" ||
    normItem.applicability.system !== "Wavin Hep2O" ||
    normItem.applicability.pipe_nominal_diameter_mm !== expected.diameter_mm ||
    normItem.applicability.orientation !== expected.orientation ||
    normItem.applicability.maximum_clip_spacing_m !== expected.maximum_clip_spacing_m ||
    normItem.applicability.count_formula !== "support_layout_count_from_max_spacing_with_endpoints" ||
    normItem.applicability.simple_rate_multiplication_forbidden !== true ||
    normItem.applicability.general_purpose_support_distances !== true ||
    normItem.applicability.concealed_adequately_supported_exceptions_require_separate_design !== true ||
    normItem.parameters.length !== WAVIN_HEP2O_CLIP_REQUIRED_EXPLICIT_PARAMETER_IDS.length ||
    WAVIN_HEP2O_CLIP_REQUIRED_EXPLICIT_PARAMETER_IDS.some(
      (parameterId) => !normItem.parameters.includes(parameterId),
    ) ||
    normItem.rounding.package_unit !== "piece" ||
    normItem.rounding.package_size !== 1 ||
    normItem.rounding.mode !== "layout_count_from_verified_anchor_nodes_and_maximum_span"
  ) {
    throw new Error(`PHYSICAL_NORM_DEFINITION_CONTRACT_INVALID:${expected.norm_id}`);
  }
  return Object.freeze({
    source_id: expected.source_id,
    norm_id: expected.norm_id,
    source_document_version: plumbingNormPack.source_pack_version,
    source_title: normItem.source.title,
    source_url: normItem.source.url,
    exact_locator: normItem.source.page,
    rate_value: normItem.rate.value,
    rate_unit: normItem.rate.unit,
    system: normItem.applicability.system,
    pipe_nominal_diameter_mm: normItem.applicability.pipe_nominal_diameter_mm,
    orientation: normItem.applicability.orientation,
    maximum_clip_spacing_m: normItem.applicability.maximum_clip_spacing_m,
    count_formula: normItem.applicability.count_formula,
    definition_hash: estimateDeterministicHash({
      work_group: plumbingNormPack.work_group,
      source_pack_version: plumbingNormPack.source_pack_version,
      norm_item: normItem,
    }),
  });
}));

const KNAUF_FUGENFUELLER_PERIMETER_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "perimeter_linear_m",
  "cladding_thickness_mm",
  "perimeter_joint_consumption_kg_linear_m",
  "perimeter_connection_joint_method",
  "system_passport_reference",
  "material_certificate_reference",
] as const);

const LEGRAND_P31_REQUIRED_EXPLICIT_PARAMETER_IDS = Object.freeze([
  "product_specification_id",
  "containment_type",
  "containment_width_mm",
  "tray_joint_count",
  "tray_width_mm",
  "coupler_reference",
  "manufacturer_system_profile_id",
  "installation_manual_reference",
  "tightening_torque_nm",
] as const);

export const CANONICAL_PROFESSIONAL_PHYSICAL_NORM_RUNTIME_BINDINGS_V1 = Object.freeze([
  SARNAFIL_AT18_FIELD_80MM_RUNTIME_BINDING_V1,
  ROCKWOOL_COMFORTBOARD80_R63_38MM_RUNTIME_BINDING_V1,
  SIEMENS_SINTESO_FDB221_RUNTIME_BINDING_V1,
  LEGRAND_049272_BUS_SCS_RUNTIME_BINDING_V1,
  {
  norm_id: UPONOR_UFH_150MM_NORM_ID,
  work_group: "heating",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "WARM_FLOOR_SYSTEM",
  operation_class: "INSTALL",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: UPONOR_UFH_150MM_PRODUCT_PROFILE_ID,
  source_id: UPONOR_UFH_150MM_SOURCE_ID,
  source_document_version: UPONOR_UFH_150MM_SOURCE_METADATA.source_document_version,
  source_definition_hash: UPONOR_UFH_150MM_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: UPONOR_UFH_150MM_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["circuit_length_m"] as const,
}, {
  norm_id: LINDAB_VSR_NORM_ID,
  work_group: "ventilation",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "DUCT_NETWORK",
  operation_class: "INSTALL",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: LINDAB_VSR_PRODUCT_PROFILE_ID,
  source_id: LINDAB_VSR_SOURCE_ID,
  source_document_version: LINDAB_VSR_SOURCE_METADATA.source_document_version,
  source_definition_hash: LINDAB_VSR_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["primary_resource_units_per_output", "procurement_factor"] as const,
}, {
  norm_id: DAIKIN_3MXS_K_NORM_ID,
  work_group: "air_conditioning",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "REFRIGERANT_SYSTEM",
  operation_class: "INSTALL",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: DAIKIN_3MXS_K_PRODUCT_PROFILE_ID,
  source_id: DAIKIN_3MXS_K_SOURCE_ID,
  source_document_version: DAIKIN_3MXS_K_SOURCE_METADATA.source_document_version,
  source_definition_hash: DAIKIN_3MXS_K_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: DAIKIN_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["factory_chargeless_length_m", "manufacturer_charge_kg"] as const,
}, {
  norm_id: KNAUF_D112_WALL_FASTENER_NORM_ID,
  work_group: "ceilings",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "FLAT_CEILING",
  operation_class: "FRAME",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID,
  source_id: KNAUF_D112_WALL_FASTENER_SOURCE_ID,
  source_document_version: KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.source_document_version,
  source_definition_hash: KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: KNAUF_D112_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["quantity_perimeter_track_anchors"] as const,
}, {
  norm_id: KNAUF_D112_BOARD_NORM_ID,
  work_group: "ceilings",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "FLAT_CEILING",
  operation_class: "CLAD",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID,
  source_id: KNAUF_D112_BOARD_SOURCE_ID,
  source_document_version: KNAUF_D112_BOARD_SOURCE_METADATA.source_document_version,
  source_definition_hash: KNAUF_D112_BOARD_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: KNAUF_D112_BOARD_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["quantity_first_layer_gypsum_board"] as const,
}, {
  norm_id: KNAUF_D112_JOINT_TAPE_NORM_ID,
  work_group: "ceilings",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "FLAT_CEILING",
  operation_class: "FINISH_JOINT",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID,
  source_id: KNAUF_D112_JOINT_TAPE_SOURCE_ID,
  source_document_version: KNAUF_D112_JOINT_TAPE_SOURCE_METADATA.source_document_version,
  source_definition_hash: KNAUF_D112_JOINT_TAPE_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: KNAUF_D112_JOINT_TAPE_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["quantity_paper_joint_tape"] as const,
}, {
  norm_id: KNAUF_D112_SUBSTRUCTURE_ANCHOR_NORM_ID,
  work_group: "ceilings",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "FLAT_CEILING",
  operation_class: "FRAME",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID,
  source_id: KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_ID,
  source_document_version: KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_METADATA.source_document_version,
  source_definition_hash: KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: KNAUF_D112_SUBSTRUCTURE_ANCHOR_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["quantity_slab_hanger_anchors"] as const,
}, {
  norm_id: KNAUF_D112_UD_RUNNER_NORM_ID,
  work_group: "ceilings",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "FLAT_CEILING",
  operation_class: "FRAME",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID,
  source_id: KNAUF_D112_UD_RUNNER_SOURCE_ID,
  source_document_version: KNAUF_D112_UD_RUNNER_SOURCE_METADATA.source_document_version,
  source_definition_hash: KNAUF_D112_UD_RUNNER_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: KNAUF_D112_UD_RUNNER_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["quantity_perimeter_track"] as const,
}, {
  norm_id: KNAUF_D112_TN25_SCREW_NORM_ID,
  work_group: "ceilings",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "FLAT_CEILING",
  operation_class: "CLAD",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID,
  source_id: KNAUF_D112_TN25_SCREW_SOURCE_ID,
  source_document_version: KNAUF_D112_TN25_SCREW_SOURCE_METADATA.source_document_version,
  source_definition_hash: KNAUF_D112_TN25_SCREW_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: KNAUF_D112_TN25_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["quantity_first_layer_screws"] as const,
}, {
  norm_id: KNAUF_D112_UNIFLOTT_NORM_ID,
  work_group: "ceilings",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "FLAT_CEILING",
  operation_class: "FINISH_JOINT",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID,
  source_id: KNAUF_D112_UNIFLOTT_SOURCE_ID,
  source_document_version: KNAUF_D112_UNIFLOTT_SOURCE_METADATA.source_document_version,
  source_definition_hash: KNAUF_D112_UNIFLOTT_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: KNAUF_D112_UNIFLOTT_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["quantity_base_joint_compound"] as const,
}, {
  norm_id: KNAUF_FUGENFUELLER_PERIMETER_NORM_ID,
  work_group: "drywall",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "FLAT_CEILING",
  operation_class: "FINISH_JOINT",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: KNAUF_FUGENFUELLER_PERIMETER_PRODUCT_PROFILE_ID,
  source_id: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_ID,
  source_document_version: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA.source_document_version,
  source_definition_hash: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: KNAUF_FUGENFUELLER_PERIMETER_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["perimeter_joint_compound_quantity_kg"] as const,
}, {
  norm_id: KNAUF_FUGENFUELLER_JOINTING_NORM_ID,
  work_group: "drywall",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "FLAT_CEILING",
  operation_class: "FINISH_JOINT",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: KNAUF_FUGENFUELLER_JOINTING_PRODUCT_PROFILE_ID,
  source_id: KNAUF_FUGENFUELLER_JOINTING_SOURCE_ID,
  source_document_version: KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA.source_document_version,
  source_definition_hash: KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: KNAUF_FUGENFUELLER_JOINTING_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["quantity_base_joint_compound"] as const,
}, {
  norm_id: FORBO_232_MOUNTING_ADHESIVE_NORM_ID,
  work_group: "baseboards",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "BASEBOARD",
  operation_class: "GLUE",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: FORBO_232_MOUNTING_ADHESIVE_PRODUCT_PROFILE_ID,
  source_id: FORBO_232_MOUNTING_ADHESIVE_SOURCE_ID,
  source_document_version: FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA.source_document_version,
  source_definition_hash: FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: FORBO_232_MOUNTING_ADHESIVE_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["forbo_adhesive_procurement_quantity_ml"] as const,
}, {
  norm_id: GERFLOR_6086_SKIRTING_NORM_ID,
  work_group: "baseboards",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "BASEBOARD",
  operation_class: "INSTALL",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: GERFLOR_6086_SKIRTING_PRODUCT_PROFILE_ID,
  source_id: GERFLOR_6086_SKIRTING_SOURCE_ID,
  source_document_version: GERFLOR_6086_SKIRTING_SOURCE_METADATA.source_document_version,
  source_definition_hash: GERFLOR_6086_SKIRTING_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: GERFLOR_6086_SKIRTING_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["gerflor_skirting_procurement_quantity_linear_m"] as const,
}, {
  norm_id: CERESIT_CN69_GLOBAL_25KG_NORM_ID,
  work_group: "flooring",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "SUBFLOOR",
  operation_class: "PREPARE",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: CERESIT_CN69_GLOBAL_25KG_PRODUCT_PROFILE_ID,
  source_id: CERESIT_CN69_GLOBAL_25KG_SOURCE_ID,
  source_document_version: CERESIT_CN69_GLOBAL_25KG_SOURCE_METADATA.source_document_version,
  source_definition_hash: CERESIT_CN69_GLOBAL_25KG_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: CERESIT_CN69_GLOBAL_25KG_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["material_consumption_kg_m2_mm"] as const,
}, {
  norm_id: CERESIT_CT17_FLOORING_PRIMER_NORM_ID,
  work_group: "flooring",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "SUBFLOOR",
  operation_class: "PREPARE",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: CERESIT_CN69_GLOBAL_25KG_PRODUCT_PROFILE_ID,
  source_id: CERESIT_CT17_FLOORING_PRIMER_SOURCE_ID,
  source_document_version: CERESIT_CT17_FLOORING_PRIMER_SOURCE_METADATA.source_document_version,
  source_definition_hash: CERESIT_CT17_FLOORING_PRIMER_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: CERESIT_CT17_FLOORING_PRIMER_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["ct17_primer_procurement_quantity_l"] as const,
}, {
  norm_id: CERESIT_CT29_INTERIOR_WALL_PLASTER_NORM_ID,
  work_group: "plaster",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "WALL_PLASTER",
  operation_class: "APPLY",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: CERESIT_CT29_INTERIOR_WALL_PLASTER_PRODUCT_PROFILE_ID,
  source_id: CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_ID,
  source_document_version: CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_METADATA.source_document_version,
  source_definition_hash: CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: CERESIT_CT29_INTERIOR_WALL_PLASTER_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["material_consumption_kg_m2_mm"] as const,
}, {
  norm_id: CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_NORM_ID,
  work_group: "putty",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "WALL_PUTTY",
  operation_class: "APPLY",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_PRODUCT_PROFILE_ID,
  source_id: CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_ID,
  source_document_version: CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_METADATA.source_document_version,
  source_definition_hash: CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["material_consumption_kg_m2_mm", "putty_procurement_quantity_kg"] as const,
}, {
  norm_id: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_NORM_ID,
  work_group: "putty",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "WALL_PUTTY",
  operation_class: "APPLY",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID,
  source_id: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_ID,
  source_document_version: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.source_document_version,
  source_definition_hash: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["putty_procurement_quantity_kg"] as const,
}, {
  norm_id: CERESIT_CN87_50MM_SCREED_NORM_ID,
  work_group: "screed",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "SUBFLOOR",
  operation_class: "PREPARE",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: CERESIT_CN87_50MM_SCREED_PRODUCT_PROFILE_ID,
  source_id: CERESIT_CN87_50MM_SCREED_SOURCE_ID,
  source_document_version: CERESIT_CN87_50MM_SCREED_SOURCE_METADATA.source_document_version,
  source_definition_hash: CERESIT_CN87_50MM_SCREED_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: CERESIT_CN87_50MM_SCREED_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["material_consumption_kg_m2_mm"] as const,
}, {
  norm_id: CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_NORM_ID,
  work_group: "waterproofing",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "CERAMIC_TILE",
  operation_class: "WATERPROOF",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_PRODUCT_PROFILE_ID,
  source_id: CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_ID,
  source_document_version: CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA.source_document_version,
  source_definition_hash: CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["cl51_procurement_quantity_kg"] as const,
}, {
  norm_id: CERESIT_CM11_SMALL_CERAMIC_INDOOR_NORM_ID,
  work_group: "tile",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "CERAMIC_TILE",
  operation_class: "LAY",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: CERESIT_CM11_SMALL_CERAMIC_INDOOR_PRODUCT_PROFILE_ID,
  source_id: CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_ID,
  source_document_version: CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA.source_document_version,
  source_definition_hash: CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: CERESIT_CM11_SMALL_CERAMIC_INDOOR_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["cm11_adhesive_procurement_quantity_kg"] as const,
}, {
  norm_id: CERESIT_CT17_TILE_PRIMER_NORM_ID,
  work_group: "tile",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "CERAMIC_TILE",
  operation_class: "LAY",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: CERESIT_CM11_SMALL_CERAMIC_INDOOR_PRODUCT_PROFILE_ID,
  source_id: CERESIT_CT17_TILE_PRIMER_SOURCE_ID,
  source_document_version: CERESIT_CT17_TILE_PRIMER_SOURCE_METADATA.source_document_version,
  source_definition_hash: CERESIT_CT17_TILE_PRIMER_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: CERESIT_CT17_TILE_PRIMER_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["ct17_tile_primer_procurement_quantity_l"] as const,
}, {
  norm_id: CERESIT_CT54_INTERIOR_WALL_NORM_ID,
  work_group: "paint",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "PAINT",
  operation_class: "PAINT",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: CERESIT_CT54_CT17_INTERIOR_WALL_PRODUCT_PROFILE_ID,
  source_id: CERESIT_CT54_INTERIOR_WALL_SOURCE_ID,
  source_document_version: CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA.source_document_version,
  source_definition_hash: CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: CERESIT_CT54_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["ct54_paint_procurement_quantity_l"] as const,
}, {
  norm_id: CERESIT_CT17_PAINT_PRIMER_NORM_ID,
  work_group: "paint",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "PAINT",
  operation_class: "PAINT",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: CERESIT_CT54_CT17_INTERIOR_WALL_PRODUCT_PROFILE_ID,
  source_id: CERESIT_CT17_PAINT_PRIMER_SOURCE_ID,
  source_document_version: CERESIT_CT17_PAINT_PRIMER_SOURCE_METADATA.source_document_version,
  source_definition_hash: CERESIT_CT17_PAINT_PRIMER_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: CERESIT_CT17_PAINT_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["ct17_paint_primer_procurement_quantity_l"] as const,
}, {
  norm_id: NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID,
  work_group: "concrete",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "REINFORCED_CONCRETE_STRIP_FOUNDATION",
  operation_class: "ORDER_READY_MIX",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
  source_id: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
  source_document_version: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.source_document_version,
  source_definition_hash: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: NRMCA_CIP31_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["concrete_order_quantity_m3"] as const,
}, {
  norm_id: KRER27_06_020_HOT_ASPHALT_40MM_NORM_ID,
  work_group: "roadworks",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "ASPHALT_PAVEMENT",
  operation_class: "INSTALL",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: KRER27_06_020_HOT_ASPHALT_40MM_PRODUCT_PROFILE_ID,
  source_id: KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_ID,
  source_document_version: KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_METADATA.source_document_version,
  source_definition_hash: KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: KRER27_06_020_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["krer27_06_020_table_norm_units"] as const,
}, {
  norm_id: LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID,
  work_group: "electrical",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "CABLE_CHANNEL",
  operation_class: "INSTALL",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: LEGRAND_P31_TRAY_PRODUCT_PROFILE_ID,
  source_id: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_ID,
  source_document_version: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.source_document_version,
  source_definition_hash: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: LEGRAND_P31_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["quantity_containment_joint_bolt"] as const,
}, {
  norm_id: WAVIN_HEP2O_SMARTSLEEVE_NORM_ID,
  work_group: "plumbing",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "HEATING_PIPE_NETWORK",
  operation_class: "INSTALL",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: WAVIN_HEP2O_PUSH_FIT_PRODUCT_PROFILE_ID,
  source_id: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID,
  source_document_version: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.source_document_version,
  source_definition_hash: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.definition_hash,
  consumed_parameter_ids: WAVIN_HEP2O_SMARTSLEEVE_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["smart_sleeve_quantity_piece"] as const,
}, ...WAVIN_HEP2O_CLIP_SOURCE_METADATA.map((metadata) => ({
  norm_id: metadata.norm_id,
  work_group: "plumbing",
  binding_route: "CANONICAL_V4_APPLICABILITY" as const,
  binding_owner: "resolveProfessionalPhysicalNormParameterValuesV1",
  technology_class: "HEATING_PIPE_NETWORK",
  operation_class: "INSTALL",
  scope_mode: "FULL_APPLICABLE_SCOPE" as const,
  product_profile_id: WAVIN_HEP2O_PUSH_FIT_PRODUCT_PROFILE_ID,
  source_id: metadata.source_id,
  source_document_version: metadata.source_document_version,
  source_definition_hash: metadata.definition_hash,
  consumed_parameter_ids: WAVIN_HEP2O_CLIP_REQUIRED_EXPLICIT_PARAMETER_IDS,
  produced_parameter_ids: ["support_count"] as const,
}))]);

type AppliedPhysicalNormResolutionV1 = {
  status: "APPLIED";
  applicability_version: typeof PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1;
  product_profile_id: string;
  source_id: string;
  norm_id: string;
  source_document_version: string;
  source_url: string;
  exact_locator: string;
  source_definition_hash: string;
  source_ids?: readonly string[];
  norm_ids?: readonly string[];
  applied_norms?: readonly {
    source_id: string;
    norm_id: string;
    source_document_version: string;
    source_url: string;
    exact_locator: string;
    source_definition_hash: string;
    produced_parameter_ids: readonly string[];
  }[];
  consumed_parameter_ids: readonly string[];
  produced_parameter_ids: readonly string[];
  calculated_pipe_length_m?: number;
  calculated_resource_quantity_m?: number;
  calculated_additional_refrigerant_kg?: number;
  calculated_wall_fastener_quantity_piece?: number;
  calculated_substructure_anchor_quantity_piece?: number;
  calculated_d112_ud_runner_net_quantity_m?: number;
  calculated_d112_ud_runner_procurement_quantity_m?: number;
  calculated_d112_ud_runner_piece_count?: number;
  calculated_d112_board_net_quantity_m2?: number;
  calculated_d112_board_procurement_quantity_m2?: number;
  calculated_d112_board_piece_count?: number;
  calculated_d112_joint_tape_net_quantity_m?: number;
  calculated_d112_joint_tape_procurement_quantity_m?: number;
  calculated_d112_joint_tape_roll_count?: number;
  calculated_tn25_screw_quantity_piece?: number;
  calculated_uniflott_net_quantity_kg?: number;
  calculated_uniflott_procurement_quantity_kg?: number;
  calculated_perimeter_joint_compound_quantity_kg?: number;
  calculated_fugenfueller_jointing_net_quantity_kg?: number;
  calculated_fugenfueller_jointing_procurement_quantity_kg?: number;
  calculated_forbo_adhesive_procurement_quantity_ml?: number;
  calculated_gerflor_skirting_net_quantity_linear_m?: number;
  calculated_gerflor_skirting_procurement_quantity_linear_m?: number;
  calculated_gerflor_skirting_piece_count?: number;
  calculated_cn69_net_quantity_kg?: number;
  calculated_cn69_bag_count?: number;
  calculated_ct29_net_quantity_kg?: number;
  calculated_ct29_procurement_quantity_kg?: number;
  calculated_ct29_bag_count?: number;
  calculated_ct126_net_quantity_kg?: number;
  calculated_ct126_procurement_quantity_kg?: number;
  calculated_ct126_bag_count?: number;
  calculated_ct127_net_quantity_kg?: number;
  calculated_ct127_procurement_quantity_kg?: number;
  calculated_ct127_bag_count?: number;
  calculated_cl51_minimum_net_quantity_kg?: number;
  calculated_cl51_procurement_quantity_kg?: number;
  calculated_cl51_bucket_count?: number;
  calculated_cn87_net_quantity_kg?: number;
  calculated_cn87_procurement_quantity_kg?: number;
  calculated_cn87_bag_count?: number;
  calculated_ct17_primer_net_quantity_l?: number;
  calculated_ct17_primer_procurement_quantity_l?: number;
  calculated_ct17_primer_container_count?: number;
  calculated_cm11_adhesive_net_quantity_kg?: number;
  calculated_cm11_adhesive_procurement_quantity_kg?: number;
  calculated_ct17_tile_primer_net_quantity_l?: number;
  calculated_ct17_tile_primer_procurement_quantity_l?: number;
  calculated_ct17_tile_primer_container_count?: number;
  calculated_ct54_paint_net_quantity_l?: number;
  calculated_ct54_paint_procurement_quantity_l?: number;
  calculated_ct54_paint_container_count?: number;
  calculated_ct17_paint_primer_net_quantity_l?: number;
  calculated_ct17_paint_primer_procurement_quantity_l?: number;
  calculated_ct17_paint_primer_container_count?: number;
  calculated_concrete_order_quantity_m3?: number;
  calculated_krer27_06_020_table_norm_units?: number;
  calculated_sarnafil_at18_gross_field_membrane_m2?: number;
  calculated_rockwool_comfortboard80_net_board_quantity_m2?: number;
  calculated_siemens_fdb221_base_quantity_piece?: number;
  calculated_legrand_049272_design_cable_quantity_linear_m?: number;
  calculated_tray_joint_fastener_quantity_piece?: number;
  calculated_smart_sleeve_quantity_piece?: number;
  calculated_support_quantity_piece?: number;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
  blockers: readonly [];
  deterministic_hash: string;
};

type NonAppliedPhysicalNormResolutionV1 = {
  status: "NOT_REQUESTED" | "BLOCKED_REQUIRED_INPUTS" | "BLOCKED_NOT_APPLICABLE";
  applicability_version: typeof PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1;
  product_profile_id: string | null;
  source_id: string;
  norm_id: string;
  source_document_version: string;
  source_url: string;
  exact_locator: string;
  source_definition_hash: string;
  consumed_parameter_ids: readonly string[];
  produced_parameter_ids: readonly [];
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
  blockers: readonly string[];
  deterministic_hash: string;
};

export type ProfessionalPhysicalNormApplicabilityResolutionV1 =
  | AppliedPhysicalNormResolutionV1
  | NonAppliedPhysicalNormResolutionV1;

export type AppliedProfessionalPhysicalNormResolutionV1 = AppliedPhysicalNormResolutionV1;

function primitiveString(value: ProfessionalParameterValueV4 | undefined): string | null {
  if (typeof value?.value !== "string") return null;
  const normalized = value.value.trim();
  return normalized.length > 0 ? normalized : null;
}

function explicitValue(
  values: Readonly<Record<string, ProfessionalParameterValueV4>>,
  parameterId: string,
): ProfessionalParameterValueV4 | null {
  const value = values[parameterId];
  if (!value || value.source_type === "VISIBLE_BASELINE_ASSUMPTION") return null;
  if (typeof value.value === "string" && value.value.trim().length === 0) return null;
  return value;
}

function finiteNumber(value: ProfessionalParameterValueV4 | null): number | null {
  if (!value) return null;
  const numeric = typeof value.value === "number"
    ? value.value
    : Number(String(value.value).replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function explicitTrue(value: ProfessionalParameterValueV4 | null): boolean {
  return value?.value === true || value?.value === "true";
}

function explicitFalse(value: ProfessionalParameterValueV4 | null): boolean {
  return value?.value === false || value?.value === "false";
}

function nonApplied(
  status: NonAppliedPhysicalNormResolutionV1["status"],
  productProfileId: string | null,
  parameterValues: Readonly<Record<string, ProfessionalParameterValueV4>>,
  blockers: readonly string[],
  consumedParameterIds: readonly string[] = [],
  sourceMetadata: {
    source_id: string;
    norm_id: string;
    source_document_version: string;
    source_url: string;
    exact_locator: string;
    definition_hash: string;
  } = UPONOR_UFH_150MM_SOURCE_METADATA,
): NonAppliedPhysicalNormResolutionV1 {
  const withoutHash = {
    status,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: sourceMetadata.source_id,
    norm_id: sourceMetadata.norm_id,
    source_document_version: sourceMetadata.source_document_version,
    source_url: sourceMetadata.source_url,
    exact_locator: sourceMetadata.exact_locator,
    source_definition_hash: sourceMetadata.definition_hash,
    consumed_parameter_ids: [...consumedParameterIds].sort(),
    produced_parameter_ids: [] as const,
    parameter_values: parameterValues,
    blockers: [...new Set(blockers)].sort(),
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveLindabVsr(
  productProfileId: typeof LINDAB_VSR_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
    parameterId,
    explicitValue(parameterValuesInput, parameterId),
  ]));
  const missing = LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS,
      LINDAB_VSR_SOURCE_METADATA,
    );
  }

  const routeLengthM = finiteNumber(explicit.route_length_m);
  const diameterMm = finiteNumber(explicit.duct_diameter_mm);
  const invalidNumeric = [
    routeLengthM === null || routeLengthM <= 0 ? "PROJECT_VALUE_INVALID:route_length_m" : "",
    diameterMm === null || !LINDAB_VSR_SOURCE_METADATA.available_diameters_mm.includes(diameterMm)
      ? `PHYSICAL_NORM_NOT_APPLICABLE:${LINDAB_VSR_NORM_ID}:duct_diameter_mm=${diameterMm}`
      : "",
  ].filter(Boolean);
  if (invalidNumeric.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      invalidNumeric,
      LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS,
      LINDAB_VSR_SOURCE_METADATA,
    );
  }
  if (explicit.cooled_supply_air_confirmed?.value !== true) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [`PHYSICAL_NORM_NOT_APPLICABLE:${LINDAB_VSR_NORM_ID}:cooled_supply_air_confirmed=false`],
      LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS,
      LINDAB_VSR_SOURCE_METADATA,
    );
  }

  const resourceUnitsPerOutput = LINDAB_VSR_SOURCE_METADATA.rate_value;
  const calculatedResourceQuantityM = Number((routeLengthM! * resourceUnitsPerOutput).toFixed(9));
  const procurementFactor = calculatedResourceQuantityM / (routeLengthM! * resourceUnitsPerOutput);
  const explicitUnitsPerOutput = finiteNumber(explicitValue(parameterValuesInput, "primary_resource_units_per_output"));
  const explicitProcurementFactor = finiteNumber(explicitValue(parameterValuesInput, "procurement_factor"));
  const conflicts = [
    explicitUnitsPerOutput !== null && Math.abs(explicitUnitsPerOutput - resourceUnitsPerOutput) > 1e-9
      ? `PHYSICAL_NORM_VALUE_CONFLICT:primary_resource_units_per_output=${explicitUnitsPerOutput}:norm_value=${resourceUnitsPerOutput}`
      : "",
    explicitProcurementFactor !== null && Math.abs(explicitProcurementFactor - procurementFactor) > 1e-9
      ? `PHYSICAL_NORM_VALUE_CONFLICT:procurement_factor=${explicitProcurementFactor}:norm_value=${procurementFactor}`
      : "",
  ].filter(Boolean);
  if (conflicts.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      conflicts,
      [...LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS, "primary_resource_units_per_output", "procurement_factor"],
      LINDAB_VSR_SOURCE_METADATA,
    );
  }

  const capturedAt = LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${LINDAB_VSR_PRODUCT_PROFILE_ID}`,
    `route_length_m=${routeLengthM}`,
    `duct_diameter_mm=${diameterMm}`,
    `cooled_supply_air_confirmed=true`,
    `nozzle_pattern=${primitiveString(explicit.nozzle_pattern!)}`,
    `air_distribution_design=${primitiveString(explicit.air_distribution_design!)}`,
    `fitting_schedule=${primitiveString(explicit.fitting_schedule!)}`,
    `formula=route_length_m*${resourceUnitsPerOutput}`,
    "bends_transitions_supports_seals_and_cutting_are_separate=true",
  ].join(";");
  const sourceManagedValue = (
    value: number,
    unitId: string,
  ): ProfessionalParameterValueV4 => ({
    value,
    unit_id: unitId,
    source_type: "APPLICABLE_NORM",
    source_id: LINDAB_VSR_SOURCE_ID,
    captured_at: capturedAt,
    confidence: "high",
    applicability,
  });
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    primary_resource_units_per_output: sourceManagedValue(resourceUnitsPerOutput, "ratio"),
    procurement_factor: sourceManagedValue(procurementFactor, "ratio"),
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: LINDAB_VSR_SOURCE_ID,
    norm_id: LINDAB_VSR_NORM_ID,
    source_document_version: LINDAB_VSR_SOURCE_METADATA.source_document_version,
    source_url: LINDAB_VSR_SOURCE_METADATA.source_url,
    exact_locator: LINDAB_VSR_SOURCE_METADATA.exact_locator,
    source_definition_hash: LINDAB_VSR_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...LINDAB_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["primary_resource_units_per_output", "procurement_factor"],
    calculated_resource_quantity_m: calculatedResourceQuantityM,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveDaikin3MxsK(
  productProfileId: typeof DAIKIN_3MXS_K_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(DAIKIN_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
    parameterId,
    explicitValue(parameterValuesInput, parameterId),
  ]));
  const missing = DAIKIN_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      DAIKIN_REQUIRED_EXPLICIT_PARAMETER_IDS,
      DAIKIN_3MXS_K_SOURCE_METADATA,
    );
  }

  const equipmentModel = primitiveString(explicit.equipment_model!);
  const manufacturerProfile = primitiveString(explicit.manufacturer_system_profile_id!);
  const refrigerantType = primitiveString(explicit.refrigerant_type!);
  const totalPipingLengthM = finiteNumber(explicit.total_refrigerant_piping_length_m);
  const applicabilityBlockers = [
    equipmentModel === "Daikin 3MXS-K"
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${DAIKIN_3MXS_K_NORM_ID}:equipment_model=${equipmentModel}`,
    manufacturerProfile === DAIKIN_3MXS_K_PRODUCT_PROFILE_ID
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${DAIKIN_3MXS_K_NORM_ID}:manufacturer_system_profile_id=${manufacturerProfile}`,
    refrigerantType === DAIKIN_3MXS_K_SOURCE_METADATA.refrigerant
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${DAIKIN_3MXS_K_NORM_ID}:refrigerant_type=${refrigerantType}`,
    totalPipingLengthM !== null && totalPipingLengthM > DAIKIN_3MXS_K_SOURCE_METADATA.factory_chargeless_length_m
      ? ""
      : `PHYSICAL_NORM_ADDITIONAL_CHARGE_NOT_REQUIRED_OR_LENGTH_INVALID:total_refrigerant_piping_length_m=${totalPipingLengthM}`,
    explicit.maximum_piping_and_height_limits_confirmed?.value === true
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${DAIKIN_3MXS_K_NORM_ID}:maximum_piping_and_height_limits_confirmed=false`,
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      DAIKIN_REQUIRED_EXPLICIT_PARAMETER_IDS,
      DAIKIN_3MXS_K_SOURCE_METADATA,
    );
  }

  const rawAdditionalChargeKg = (
    totalPipingLengthM! - DAIKIN_3MXS_K_SOURCE_METADATA.factory_chargeless_length_m
  ) * DAIKIN_3MXS_K_SOURCE_METADATA.rate_value;
  const calculatedAdditionalRefrigerantKg = Number(rawAdditionalChargeKg.toFixed(9));
  const explicitFactoryLength = finiteNumber(explicitValue(parameterValuesInput, "factory_chargeless_length_m"));
  const explicitCharge = finiteNumber(explicitValue(parameterValuesInput, "manufacturer_charge_kg"));
  const conflicts = [
    explicitFactoryLength !== null &&
      Math.abs(explicitFactoryLength - DAIKIN_3MXS_K_SOURCE_METADATA.factory_chargeless_length_m) > 1e-9
      ? `PHYSICAL_NORM_VALUE_CONFLICT:factory_chargeless_length_m=${explicitFactoryLength}:norm_value=${DAIKIN_3MXS_K_SOURCE_METADATA.factory_chargeless_length_m}`
      : "",
    explicitCharge !== null && Math.abs(explicitCharge - calculatedAdditionalRefrigerantKg) > 1e-9
      ? `PHYSICAL_NORM_VALUE_CONFLICT:manufacturer_charge_kg=${explicitCharge}:norm_value=${calculatedAdditionalRefrigerantKg}`
      : "",
  ].filter(Boolean);
  if (conflicts.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      conflicts,
      [...DAIKIN_REQUIRED_EXPLICIT_PARAMETER_IDS, "factory_chargeless_length_m", "manufacturer_charge_kg"],
      DAIKIN_3MXS_K_SOURCE_METADATA,
    );
  }

  const capturedAt = DAIKIN_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${DAIKIN_3MXS_K_PRODUCT_PROFILE_ID}`,
    `equipment_model=${equipmentModel}`,
    `refrigerant_type=${refrigerantType}`,
    `total_refrigerant_piping_length_m=${totalPipingLengthM}`,
    `factory_chargeless_length_m=${DAIKIN_3MXS_K_SOURCE_METADATA.factory_chargeless_length_m}`,
    `outdoor_unit_nameplate_reference=${primitiveString(explicit.outdoor_unit_nameplate_reference!)}`,
    `maximum_piping_and_height_limits_confirmed=true`,
    `formula=max(0,total_refrigerant_piping_length_m-${DAIKIN_3MXS_K_SOURCE_METADATA.factory_chargeless_length_m})*${DAIKIN_3MXS_K_SOURCE_METADATA.rate_value}`,
  ].join(";");
  const sourceManagedValue = (value: number, unitId: string): ProfessionalParameterValueV4 => ({
    value,
    unit_id: unitId,
    source_type: "APPLICABLE_NORM",
    source_id: DAIKIN_3MXS_K_SOURCE_ID,
    captured_at: capturedAt,
    confidence: "high",
    applicability,
  });
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    factory_chargeless_length_m: sourceManagedValue(
      DAIKIN_3MXS_K_SOURCE_METADATA.factory_chargeless_length_m,
      "m",
    ),
    manufacturer_charge_kg: sourceManagedValue(calculatedAdditionalRefrigerantKg, "kg"),
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: DAIKIN_3MXS_K_SOURCE_ID,
    norm_id: DAIKIN_3MXS_K_NORM_ID,
    source_document_version: DAIKIN_3MXS_K_SOURCE_METADATA.source_document_version,
    source_url: DAIKIN_3MXS_K_SOURCE_METADATA.source_url,
    exact_locator: DAIKIN_3MXS_K_SOURCE_METADATA.exact_locator,
    source_definition_hash: DAIKIN_3MXS_K_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...DAIKIN_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["factory_chargeless_length_m", "manufacturer_charge_kg"],
    calculated_additional_refrigerant_kg: calculatedAdditionalRefrigerantKg,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveKnaufD112ReferenceCeiling(
  productProfileId: typeof KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(KNAUF_D112_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
    parameterId,
    explicitValue(parameterValuesInput, parameterId),
  ]));
  const missing = KNAUF_D112_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      KNAUF_D112_REQUIRED_EXPLICIT_PARAMETER_IDS,
      KNAUF_D112_WALL_FASTENER_SOURCE_METADATA,
    );
  }

  const areaM2 = finiteNumber(explicit.area_m2);
  const lengthM = finiteNumber(explicit.length_m);
  const widthM = finiteNumber(explicit.width_m);
  const perimeterAnchorSpacingM = finiteNumber(explicit.ceiling_perimeter_anchor_spacing_m);
  const systemVariant = primitiveString(explicit.system_variant!);
  const substrateType = primitiveString(explicit.substrate_type!);
  const substrateFastenerReference = primitiveString(explicit.substrate_fastener_reference!);
  const [referenceLengthM, referenceWidthM] = KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.reference_ceiling_m;
  const referenceAreaM2 = referenceLengthM * referenceWidthM;
  const geometryMatches = areaM2 !== null && lengthM !== null && widthM !== null &&
    Math.abs(areaM2 - referenceAreaM2) <= 1e-9 &&
    Math.abs(lengthM - referenceLengthM) <= 1e-9 &&
    Math.abs(widthM - referenceWidthM) <= 1e-9 &&
    Math.abs(areaM2 - lengthM * widthM) <= 1e-9;
  const applicabilityBlockers = [
    geometryMatches
      ? ""
      : `PHYSICAL_NORM_REFERENCE_GEOMETRY_NOT_APPLICABLE:length_m=${lengthM}:width_m=${widthM}:area_m2=${areaM2}`,
    systemVariant === KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.variant
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_WALL_FASTENER_NORM_ID}:system_variant=${systemVariant}`,
    substrateType
      ? ""
      : "PROJECT_VALUE_INVALID:substrate_type",
    substrateFastenerReference
      ? ""
      : "PROJECT_VALUE_INVALID:substrate_fastener_reference",
    explicit.substrate_fastener_approved?.value === true
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_WALL_FASTENER_NORM_ID}:substrate_fastener_approved=false`,
    perimeterAnchorSpacingM !== null && perimeterAnchorSpacingM > 0
      ? ""
      : "PROJECT_VALUE_INVALID:ceiling_perimeter_anchor_spacing_m",
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      KNAUF_D112_REQUIRED_EXPLICIT_PARAMETER_IDS,
      KNAUF_D112_WALL_FASTENER_SOURCE_METADATA,
    );
  }

  const calculatedWallFastenerQuantityPiece = Math.ceil(
    areaM2! * KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.rate_value - 1e-9,
  );
  const projectLayoutFastenerQuantityPiece = Math.ceil(
    (2 * (lengthM! + widthM!)) / perimeterAnchorSpacingM! - 1e-9,
  );
  const explicitQuantity = finiteNumber(explicitValue(parameterValuesInput, "quantity_perimeter_track_anchors"));
  const conflicts = [
    projectLayoutFastenerQuantityPiece === calculatedWallFastenerQuantityPiece
      ? ""
      : `PHYSICAL_NORM_PROJECT_LAYOUT_CONFLICT:perimeter_anchor_count=${projectLayoutFastenerQuantityPiece}:norm_value=${calculatedWallFastenerQuantityPiece}`,
    explicitQuantity !== null && Math.abs(explicitQuantity - calculatedWallFastenerQuantityPiece) > 1e-9
      ? `PHYSICAL_NORM_VALUE_CONFLICT:quantity_perimeter_track_anchors=${explicitQuantity}:norm_value=${calculatedWallFastenerQuantityPiece}`
      : "",
  ].filter(Boolean);
  if (conflicts.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      conflicts,
      [...KNAUF_D112_REQUIRED_EXPLICIT_PARAMETER_IDS, "quantity_perimeter_track_anchors"],
      KNAUF_D112_WALL_FASTENER_SOURCE_METADATA,
    );
  }

  const capturedAt = KNAUF_D112_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID}`,
    `system=${KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.system}`,
    `system_variant=${systemVariant}`,
    `reference_ceiling=${referenceLengthM}x${referenceWidthM}m`,
    `area_m2=${areaM2}`,
    `substrate_type=${substrateType}`,
    `substrate_fastener_reference=${substrateFastenerReference}`,
    `substrate_fastener_approved=true`,
    `ceiling_perimeter_anchor_spacing_m=${perimeterAnchorSpacingM}`,
    `formula=ceil(area_m2*${KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.rate_value})`,
    "loss_and_waste_excluded=true",
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    quantity_perimeter_track_anchors: {
      value: calculatedWallFastenerQuantityPiece,
      unit_id: "item",
      source_type: "APPLICABLE_NORM" as const,
      source_id: KNAUF_D112_WALL_FASTENER_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: KNAUF_D112_WALL_FASTENER_SOURCE_ID,
    norm_id: KNAUF_D112_WALL_FASTENER_NORM_ID,
    source_document_version: KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.source_document_version,
    source_url: KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.source_url,
    exact_locator: KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.exact_locator,
    source_definition_hash: KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...KNAUF_D112_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["quantity_perimeter_track_anchors"],
    calculated_wall_fastener_quantity_piece: calculatedWallFastenerQuantityPiece,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveKnaufD112SubstructureAnchor(
  productProfileId: typeof KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(
    KNAUF_D112_SUBSTRUCTURE_ANCHOR_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
      parameterId,
      explicitValue(parameterValuesInput, parameterId),
    ]),
  );
  const missing = KNAUF_D112_SUBSTRUCTURE_ANCHOR_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      KNAUF_D112_SUBSTRUCTURE_ANCHOR_REQUIRED_EXPLICIT_PARAMETER_IDS,
      KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_METADATA,
    );
  }

  const areaM2 = finiteNumber(explicit.area_m2);
  const systemVariant = primitiveString(explicit.system_variant!);
  const substrateType = primitiveString(explicit.substrate_type!);
  const loadClassKnM2 = finiteNumber(explicit.load_class_kn_m2);
  const hangerSpacingM = finiteNumber(explicit.ceiling_hanger_spacing_m);
  const primaryProfileSpacingM = finiteNumber(explicit.ceiling_primary_profile_spacing_m);
  const secondaryProfileSpacingM = finiteNumber(explicit.ceiling_secondary_profile_spacing_m);
  const substructureAnchorReference = primitiveString(explicit.substructure_anchor_reference!);
  const systemPassportReference = primitiveString(explicit.system_passport_reference!);
  const materialCertificateReference = primitiveString(explicit.material_certificate_reference!);
  const applicabilityBlockers = [
    areaM2 !== null && areaM2 > 0
      ? ""
      : "PROJECT_VALUE_INVALID:area_m2",
    systemVariant === KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_METADATA.variant
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_SUBSTRUCTURE_ANCHOR_NORM_ID}:system_variant=${systemVariant}`,
    substrateType
      ? ""
      : "PROJECT_VALUE_INVALID:substrate_type",
    loadClassKnM2 !== null && loadClassKnM2 > 0 &&
      loadClassKnM2 <= KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_METADATA.load_class_max_kn_m2
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_SUBSTRUCTURE_ANCHOR_NORM_ID}:load_class_kn_m2=${loadClassKnM2}`,
    hangerSpacingM !== null && hangerSpacingM > 0 &&
      hangerSpacingM * 1000 <= KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_METADATA.hanger_spacing_max_mm
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_SUBSTRUCTURE_ANCHOR_NORM_ID}:ceiling_hanger_spacing_m=${hangerSpacingM}`,
    primaryProfileSpacingM !== null && primaryProfileSpacingM > 0 &&
      primaryProfileSpacingM * 1000 <=
        KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_METADATA.carrying_channel_spacing_max_mm
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_SUBSTRUCTURE_ANCHOR_NORM_ID}:ceiling_primary_profile_spacing_m=${primaryProfileSpacingM}`,
    secondaryProfileSpacingM !== null && secondaryProfileSpacingM > 0 &&
      secondaryProfileSpacingM * 1000 <=
        KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_METADATA.furring_channel_spacing_max_mm
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_SUBSTRUCTURE_ANCHOR_NORM_ID}:ceiling_secondary_profile_spacing_m=${secondaryProfileSpacingM}`,
    substructureAnchorReference
      ? ""
      : "PROJECT_VALUE_INVALID:substructure_anchor_reference",
    explicit.substructure_anchor_approved?.value === true
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_SUBSTRUCTURE_ANCHOR_NORM_ID}:substructure_anchor_approved=false`,
    explicit.d112_substructure_manufacturer_excludes_loss_and_waste_confirmed?.value === true
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_SUBSTRUCTURE_ANCHOR_NORM_ID}:manufacturer_excludes_loss_and_waste=false`,
    systemPassportReference
      ? ""
      : "PROJECT_VALUE_INVALID:system_passport_reference",
    materialCertificateReference
      ? ""
      : "PROJECT_VALUE_INVALID:material_certificate_reference",
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      KNAUF_D112_SUBSTRUCTURE_ANCHOR_REQUIRED_EXPLICIT_PARAMETER_IDS,
      KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_METADATA,
    );
  }

  const calculatedSubstructureAnchorQuantityPiece = Math.ceil(
    areaM2! * KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_METADATA.rate_value - 1e-9,
  );
  const explicitQuantity = finiteNumber(explicitValue(parameterValuesInput, "quantity_slab_hanger_anchors"));
  if (
    explicitQuantity !== null &&
    Math.abs(explicitQuantity - calculatedSubstructureAnchorQuantityPiece) > 1e-9
  ) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:quantity_slab_hanger_anchors=${explicitQuantity}:norm_value=${calculatedSubstructureAnchorQuantityPiece}`,
      ],
      [
        ...KNAUF_D112_SUBSTRUCTURE_ANCHOR_REQUIRED_EXPLICIT_PARAMETER_IDS,
        "quantity_slab_hanger_anchors",
      ],
      KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_METADATA,
    );
  }

  const capturedAt = KNAUF_D112_SUBSTRUCTURE_ANCHOR_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID}`,
    `system=${KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_METADATA.system}`,
    `system_variant=${systemVariant}`,
    `ceiling_area_m2=canonical(area_m2)=${areaM2}`,
    `substrate_type=${substrateType}`,
    `load_class_kn_m2=${loadClassKnM2}`,
    `ceiling_hanger_spacing_m=${hangerSpacingM}`,
    `carrying_channel_spacing_m=canonical(ceiling_primary_profile_spacing_m)=${primaryProfileSpacingM}`,
    `furring_channel_spacing_m=canonical(ceiling_secondary_profile_spacing_m)=${secondaryProfileSpacingM}`,
    `substructure_anchor_reference=${substructureAnchorReference}`,
    "substructure_anchor_approved=true",
    `system_passport_reference=${systemPassportReference}`,
    `material_certificate_reference=${materialCertificateReference}`,
    `formula=ceil(area_m2*${KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_METADATA.rate_value})`,
    "manufacturer_excludes_loss_and_waste=true",
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    quantity_slab_hanger_anchors: {
      value: calculatedSubstructureAnchorQuantityPiece,
      unit_id: "item",
      source_type: "APPLICABLE_NORM" as const,
      source_id: KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_ID,
    norm_id: KNAUF_D112_SUBSTRUCTURE_ANCHOR_NORM_ID,
    source_document_version: KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_METADATA.source_document_version,
    source_url: KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_METADATA.source_url,
    exact_locator: KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_METADATA.exact_locator,
    source_definition_hash: KNAUF_D112_SUBSTRUCTURE_ANCHOR_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...KNAUF_D112_SUBSTRUCTURE_ANCHOR_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["quantity_slab_hanger_anchors"],
    calculated_substructure_anchor_quantity_piece: calculatedSubstructureAnchorQuantityPiece,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveKnaufD112UdRunner(
  productProfileId: typeof KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(
    KNAUF_D112_UD_RUNNER_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
      parameterId,
      explicitValue(parameterValuesInput, parameterId),
    ]),
  );
  const missing = KNAUF_D112_UD_RUNNER_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      KNAUF_D112_UD_RUNNER_REQUIRED_EXPLICIT_PARAMETER_IDS,
      KNAUF_D112_UD_RUNNER_SOURCE_METADATA,
    );
  }

  const areaM2 = finiteNumber(explicit.area_m2);
  const lengthM = finiteNumber(explicit.length_m);
  const widthM = finiteNumber(explicit.width_m);
  const perimeterM = finiteNumber(explicit.perimeter_m);
  const systemVariant = primitiveString(explicit.system_variant!);
  const selectedProfilePieceLengthM = finiteNumber(explicit.selected_profile_piece_length_m);
  const currentRegionalSystemApproval = primitiveString(explicit.current_regional_system_approval!);
  const systemPassportReference = primitiveString(explicit.system_passport_reference!);
  const materialCertificateReference = primitiveString(explicit.material_certificate_reference!);
  const manufacturerExcludesLossAndWasteConfirmed =
    explicit.d112_ud_runner_manufacturer_excludes_loss_and_waste_confirmed!.value === true ||
    explicit.d112_ud_runner_manufacturer_excludes_loss_and_waste_confirmed!.value === "true";
  const [referenceLengthM, referenceWidthM] = KNAUF_D112_UD_RUNNER_SOURCE_METADATA.reference_ceiling_m;
  const referenceAreaM2 = referenceLengthM * referenceWidthM;
  const geometryMatches = areaM2 !== null && lengthM !== null && widthM !== null &&
    Math.abs(areaM2 - referenceAreaM2) <= 1e-9 &&
    Math.abs(lengthM - referenceLengthM) <= 1e-9 &&
    Math.abs(widthM - referenceWidthM) <= 1e-9 &&
    Math.abs(areaM2 - lengthM * widthM) <= 1e-9;
  const geometryPerimeterM = lengthM !== null && widthM !== null ? 2 * (lengthM + widthM) : null;
  const netNormQuantityM = areaM2 === null
    ? null
    : Number((areaM2 * KNAUF_D112_UD_RUNNER_SOURCE_METADATA.rate_value).toFixed(9));
  const applicabilityBlockers = [
    geometryMatches
      ? ""
      : `PHYSICAL_NORM_REFERENCE_GEOMETRY_NOT_APPLICABLE:length_m=${lengthM}:width_m=${widthM}:area_m2=${areaM2}`,
    systemVariant === KNAUF_D112_UD_RUNNER_SOURCE_METADATA.variant
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_UD_RUNNER_NORM_ID}:system_variant=${systemVariant}`,
    perimeterM !== null && geometryPerimeterM !== null &&
      Math.abs(perimeterM - geometryPerimeterM) <= 1e-9
      ? ""
      : `PHYSICAL_NORM_PROJECT_PERIMETER_CONFLICT:perimeter_m=${perimeterM}:geometry_perimeter_m=${geometryPerimeterM}`,
    perimeterM !== null && netNormQuantityM !== null &&
      Math.abs(perimeterM - netNormQuantityM) <= 1e-9
      ? ""
      : `PHYSICAL_NORM_REFERENCE_RATE_PERIMETER_CONFLICT:perimeter_m=${perimeterM}:norm_value=${netNormQuantityM}`,
    selectedProfilePieceLengthM === KNAUF_D112_UD_RUNNER_SOURCE_METADATA.package_size_m
      ? ""
      : `PHYSICAL_NORM_PACKAGE_NOT_APPLICABLE:selected_profile_piece_length_m=${selectedProfilePieceLengthM}`,
    currentRegionalSystemApproval ? "" : "PROJECT_VALUE_INVALID:current_regional_system_approval",
    manufacturerExcludesLossAndWasteConfirmed
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_UD_RUNNER_NORM_ID}:d112_ud_runner_manufacturer_excludes_loss_and_waste_confirmed=false`,
    systemPassportReference ? "" : "PROJECT_VALUE_INVALID:system_passport_reference",
    materialCertificateReference ? "" : "PROJECT_VALUE_INVALID:material_certificate_reference",
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      KNAUF_D112_UD_RUNNER_REQUIRED_EXPLICIT_PARAMETER_IDS,
      KNAUF_D112_UD_RUNNER_SOURCE_METADATA,
    );
  }

  const calculatedUdRunnerPieceCount = Math.ceil(
    perimeterM! / selectedProfilePieceLengthM! - 1e-9,
  );
  const calculatedUdRunnerProcurementQuantityM = Number(
    (calculatedUdRunnerPieceCount * selectedProfilePieceLengthM!).toFixed(9),
  );
  const explicitQuantity = finiteNumber(explicitValue(parameterValuesInput, "quantity_perimeter_track"));
  if (
    explicitQuantity !== null &&
    Math.abs(explicitQuantity - calculatedUdRunnerProcurementQuantityM) > 1e-9
  ) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:quantity_perimeter_track=${explicitQuantity}:norm_value=${calculatedUdRunnerProcurementQuantityM}`,
      ],
      [...KNAUF_D112_UD_RUNNER_REQUIRED_EXPLICIT_PARAMETER_IDS, "quantity_perimeter_track"],
      KNAUF_D112_UD_RUNNER_SOURCE_METADATA,
    );
  }

  const capturedAt = KNAUF_D112_UD_RUNNER_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID}`,
    `system=${KNAUF_D112_UD_RUNNER_SOURCE_METADATA.system}`,
    `system_variant=${systemVariant}`,
    `reference_ceiling=${referenceLengthM}x${referenceWidthM}m`,
    `ceiling_area_m2=canonical(area_m2)=${areaM2}`,
    `room_length_m=canonical(length_m)=${lengthM}`,
    `room_width_m=canonical(width_m)=${widthM}`,
    `room_perimeter_m=canonical(perimeter_m)=${perimeterM}`,
    `selected_profile_piece_length_m=${selectedProfilePieceLengthM}`,
    `current_regional_system_approval=${currentRegionalSystemApproval}`,
    `net_formula=area_m2*${KNAUF_D112_UD_RUNNER_SOURCE_METADATA.rate_value}`,
    `package_formula=ceil(perimeter_m/selected_profile_piece_length_m)*selected_profile_piece_length_m`,
    "manufacturer_excludes_loss_and_waste=true",
    `system_passport_reference=${systemPassportReference}`,
    `material_certificate_reference=${materialCertificateReference}`,
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    quantity_perimeter_track: {
      value: calculatedUdRunnerProcurementQuantityM,
      unit_id: "m",
      source_type: "APPLICABLE_NORM" as const,
      source_id: KNAUF_D112_UD_RUNNER_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: KNAUF_D112_UD_RUNNER_SOURCE_ID,
    norm_id: KNAUF_D112_UD_RUNNER_NORM_ID,
    source_document_version: KNAUF_D112_UD_RUNNER_SOURCE_METADATA.source_document_version,
    source_url: KNAUF_D112_UD_RUNNER_SOURCE_METADATA.source_url,
    exact_locator: KNAUF_D112_UD_RUNNER_SOURCE_METADATA.exact_locator,
    source_definition_hash: KNAUF_D112_UD_RUNNER_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...KNAUF_D112_UD_RUNNER_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["quantity_perimeter_track"],
    calculated_d112_ud_runner_net_quantity_m: netNormQuantityM!,
    calculated_d112_ud_runner_procurement_quantity_m: calculatedUdRunnerProcurementQuantityM,
    calculated_d112_ud_runner_piece_count: calculatedUdRunnerPieceCount,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveKnaufD112FrameProfile(
  productProfileId: typeof KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const wallFastener = resolveKnaufD112ReferenceCeiling(productProfileId, parameterValuesInput);
  if (wallFastener.status !== "APPLIED") return wallFastener;
  const substructureAnchor = resolveKnaufD112SubstructureAnchor(
    productProfileId,
    wallFastener.parameter_values,
  );
  if (substructureAnchor.status !== "APPLIED") return substructureAnchor;
  const udRunner = resolveKnaufD112UdRunner(productProfileId, substructureAnchor.parameter_values);
  if (udRunner.status !== "APPLIED") return udRunner;

  const consumedParameterIds = [
    ...new Set([
      ...wallFastener.consumed_parameter_ids,
      ...substructureAnchor.consumed_parameter_ids,
      ...udRunner.consumed_parameter_ids,
    ]),
  ];
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: wallFastener.source_id,
    norm_id: wallFastener.norm_id,
    source_document_version: wallFastener.source_document_version,
    source_url: wallFastener.source_url,
    exact_locator: wallFastener.exact_locator,
    source_definition_hash: wallFastener.source_definition_hash,
    source_ids: [wallFastener.source_id, substructureAnchor.source_id, udRunner.source_id],
    norm_ids: [wallFastener.norm_id, substructureAnchor.norm_id, udRunner.norm_id],
    applied_norms: [{
      source_id: wallFastener.source_id,
      norm_id: wallFastener.norm_id,
      source_document_version: wallFastener.source_document_version,
      source_url: wallFastener.source_url,
      exact_locator: wallFastener.exact_locator,
      source_definition_hash: wallFastener.source_definition_hash,
      produced_parameter_ids: wallFastener.produced_parameter_ids,
    }, {
      source_id: substructureAnchor.source_id,
      norm_id: substructureAnchor.norm_id,
      source_document_version: substructureAnchor.source_document_version,
      source_url: substructureAnchor.source_url,
      exact_locator: substructureAnchor.exact_locator,
      source_definition_hash: substructureAnchor.source_definition_hash,
      produced_parameter_ids: substructureAnchor.produced_parameter_ids,
    }, {
      source_id: udRunner.source_id,
      norm_id: udRunner.norm_id,
      source_document_version: udRunner.source_document_version,
      source_url: udRunner.source_url,
      exact_locator: udRunner.exact_locator,
      source_definition_hash: udRunner.source_definition_hash,
      produced_parameter_ids: udRunner.produced_parameter_ids,
    }],
    consumed_parameter_ids: consumedParameterIds,
    produced_parameter_ids: [
      "quantity_perimeter_track_anchors",
      "quantity_slab_hanger_anchors",
      "quantity_perimeter_track",
    ] as const,
    calculated_wall_fastener_quantity_piece: wallFastener.calculated_wall_fastener_quantity_piece,
    calculated_substructure_anchor_quantity_piece:
      substructureAnchor.calculated_substructure_anchor_quantity_piece,
    calculated_d112_ud_runner_net_quantity_m: udRunner.calculated_d112_ud_runner_net_quantity_m,
    calculated_d112_ud_runner_procurement_quantity_m:
      udRunner.calculated_d112_ud_runner_procurement_quantity_m,
    calculated_d112_ud_runner_piece_count: udRunner.calculated_d112_ud_runner_piece_count,
    parameter_values: udRunner.parameter_values,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveKnaufD112Tn25Screws(
  productProfileId: typeof KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(KNAUF_D112_TN25_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
    parameterId,
    explicitValue(parameterValuesInput, parameterId),
  ]));
  const missing = KNAUF_D112_TN25_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      KNAUF_D112_TN25_REQUIRED_EXPLICIT_PARAMETER_IDS,
      KNAUF_D112_TN25_SCREW_SOURCE_METADATA,
    );
  }

  const areaM2 = finiteNumber(explicit.area_m2);
  const lengthM = finiteNumber(explicit.length_m);
  const widthM = finiteNumber(explicit.width_m);
  const boardLayerCount = finiteNumber(explicit.board_layer_count);
  const boardThicknessMm = finiteNumber(explicit.board_thickness_mm);
  const systemVariant = primitiveString(explicit.system_variant!);
  const systemPassportReference = primitiveString(explicit.system_passport_reference!);
  const [referenceLengthM, referenceWidthM] = KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.reference_ceiling_m;
  const referenceAreaM2 = referenceLengthM * referenceWidthM;
  const geometryMatches = areaM2 !== null && lengthM !== null && widthM !== null &&
    Math.abs(areaM2 - referenceAreaM2) <= 1e-9 &&
    Math.abs(lengthM - referenceLengthM) <= 1e-9 &&
    Math.abs(widthM - referenceWidthM) <= 1e-9 &&
    Math.abs(areaM2 - lengthM * widthM) <= 1e-9;
  const applicabilityBlockers = [
    geometryMatches
      ? ""
      : `PHYSICAL_NORM_REFERENCE_GEOMETRY_NOT_APPLICABLE:length_m=${lengthM}:width_m=${widthM}:area_m2=${areaM2}`,
    systemPassportReference
      ? ""
      : "PROJECT_VALUE_INVALID:system_passport_reference",
    systemVariant === KNAUF_D112_TN25_SCREW_SOURCE_METADATA.variant
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_TN25_SCREW_NORM_ID}:system_variant=${systemVariant}`,
    boardLayerCount === KNAUF_D112_TN25_SCREW_SOURCE_METADATA.board_layer_count
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_TN25_SCREW_NORM_ID}:board_layer_count=${boardLayerCount}`,
    boardThicknessMm === KNAUF_D112_TN25_SCREW_SOURCE_METADATA.board_thickness_mm
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_TN25_SCREW_NORM_ID}:board_thickness_mm=${boardThicknessMm}`,
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      KNAUF_D112_TN25_REQUIRED_EXPLICIT_PARAMETER_IDS,
      KNAUF_D112_TN25_SCREW_SOURCE_METADATA,
    );
  }

  const calculatedTn25ScrewQuantityPiece = Math.ceil(
    areaM2! * KNAUF_D112_TN25_SCREW_SOURCE_METADATA.rate_value - 1e-9,
  );
  const explicitQuantity = finiteNumber(explicitValue(parameterValuesInput, "quantity_first_layer_screws"));
  if (explicitQuantity !== null && explicitQuantity !== calculatedTn25ScrewQuantityPiece) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:quantity_first_layer_screws=${explicitQuantity}:norm_value=${calculatedTn25ScrewQuantityPiece}`,
      ],
      [...KNAUF_D112_TN25_REQUIRED_EXPLICIT_PARAMETER_IDS, "quantity_first_layer_screws"],
      KNAUF_D112_TN25_SCREW_SOURCE_METADATA,
    );
  }

  const capturedAt = KNAUF_D112_TN25_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID}`,
    `system=${KNAUF_D112_TN25_SCREW_SOURCE_METADATA.system}`,
    `system_variant=${systemVariant}`,
    `system_passport_reference=${systemPassportReference}`,
    `reference_ceiling=${referenceLengthM}x${referenceWidthM}m`,
    `ceiling_area_m2=canonical(area_m2)=${areaM2}`,
    `board_layer_count=${boardLayerCount}`,
    `board_thickness_mm=${boardThicknessMm}`,
    `screw=${KNAUF_D112_TN25_SCREW_SOURCE_METADATA.screw}`,
    `formula=ceil(area_m2*${KNAUF_D112_TN25_SCREW_SOURCE_METADATA.rate_value})`,
    "loss_and_waste_excluded=true",
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    quantity_first_layer_screws: {
      value: calculatedTn25ScrewQuantityPiece,
      unit_id: "item",
      source_type: "APPLICABLE_NORM" as const,
      source_id: KNAUF_D112_TN25_SCREW_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: KNAUF_D112_TN25_SCREW_SOURCE_ID,
    norm_id: KNAUF_D112_TN25_SCREW_NORM_ID,
    source_document_version: KNAUF_D112_TN25_SCREW_SOURCE_METADATA.source_document_version,
    source_url: KNAUF_D112_TN25_SCREW_SOURCE_METADATA.source_url,
    exact_locator: KNAUF_D112_TN25_SCREW_SOURCE_METADATA.exact_locator,
    source_definition_hash: KNAUF_D112_TN25_SCREW_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...KNAUF_D112_TN25_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["quantity_first_layer_screws"],
    calculated_tn25_screw_quantity_piece: calculatedTn25ScrewQuantityPiece,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveKnaufD112Board(
  productProfileId: typeof KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(
    KNAUF_D112_BOARD_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
      parameterId,
      explicitValue(parameterValuesInput, parameterId),
    ]),
  );
  const missing = KNAUF_D112_BOARD_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      KNAUF_D112_BOARD_REQUIRED_EXPLICIT_PARAMETER_IDS,
      KNAUF_D112_BOARD_SOURCE_METADATA,
    );
  }

  const areaM2 = finiteNumber(explicit.area_m2);
  const systemVariant = primitiveString(explicit.system_variant!);
  const boardType = primitiveString(explicit.board_type!);
  const boardThicknessMm = finiteNumber(explicit.board_thickness_mm);
  const boardLayerCount = finiteNumber(explicit.board_layer_count);
  const selectedBoardLengthMm = finiteNumber(explicit.selected_board_length_mm);
  const selectedBoardWidthMm = finiteNumber(explicit.selected_board_width_mm);
  const selectedBoardLayoutPieceCount = finiteNumber(explicit.selected_board_layout_piece_count);
  const boardLayoutReference = primitiveString(explicit.d112_board_layout_reference!);
  const systemPassportReference = primitiveString(explicit.system_passport_reference!);
  const materialCertificateReference = primitiveString(explicit.material_certificate_reference!);
  const manufacturerExcludesLossAndWasteConfirmed =
    explicit.d112_board_manufacturer_excludes_loss_and_waste_confirmed!.value === true ||
    explicit.d112_board_manufacturer_excludes_loss_and_waste_confirmed!.value === "true";
  const applicabilityBlockers = [
    areaM2 !== null && areaM2 > 0 ? "" : "PROJECT_VALUE_INVALID:area_m2",
    systemVariant === KNAUF_D112_BOARD_SOURCE_METADATA.variant
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_BOARD_NORM_ID}:system_variant=${systemVariant}`,
    KNAUF_D112_BOARD_SOURCE_METADATA.board_types.some((type) => type === boardType)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_BOARD_NORM_ID}:board_type=${boardType}`,
    boardThicknessMm === KNAUF_D112_BOARD_SOURCE_METADATA.board_thickness_mm
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_BOARD_NORM_ID}:board_thickness_mm=${boardThicknessMm}`,
    boardLayerCount === 1
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_BOARD_NORM_ID}:board_layer_count=${boardLayerCount}`,
    selectedBoardLengthMm !== null && selectedBoardLengthMm > 0
      ? ""
      : "PROJECT_VALUE_INVALID:selected_board_length_mm",
    selectedBoardWidthMm !== null && selectedBoardWidthMm > 0
      ? ""
      : "PROJECT_VALUE_INVALID:selected_board_width_mm",
    selectedBoardLayoutPieceCount !== null &&
      selectedBoardLayoutPieceCount > 0 &&
      Number.isInteger(selectedBoardLayoutPieceCount)
      ? ""
      : "PROJECT_VALUE_INVALID:selected_board_layout_piece_count",
    boardLayoutReference ? "" : "PROJECT_VALUE_INVALID:d112_board_layout_reference",
    manufacturerExcludesLossAndWasteConfirmed
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_BOARD_NORM_ID}:d112_board_manufacturer_excludes_loss_and_waste_confirmed=false`,
    systemPassportReference ? "" : "PROJECT_VALUE_INVALID:system_passport_reference",
    materialCertificateReference ? "" : "PROJECT_VALUE_INVALID:material_certificate_reference",
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      KNAUF_D112_BOARD_REQUIRED_EXPLICIT_PARAMETER_IDS,
      KNAUF_D112_BOARD_SOURCE_METADATA,
    );
  }

  const calculatedBoardNetQuantityM2 = Number(
    (areaM2! * KNAUF_D112_BOARD_SOURCE_METADATA.rate_value).toFixed(9),
  );
  const selectedBoardAreaM2 = Number(
    ((selectedBoardLengthMm! / 1000) * (selectedBoardWidthMm! / 1000)).toFixed(9),
  );
  const minimumBoardPieceCount = Math.ceil(calculatedBoardNetQuantityM2 / selectedBoardAreaM2 - 1e-9);
  if (selectedBoardLayoutPieceCount! < minimumBoardPieceCount) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [
        `PHYSICAL_NORM_BOARD_LAYOUT_UNDERSIZED:selected_board_layout_piece_count=${selectedBoardLayoutPieceCount}:minimum_piece_count=${minimumBoardPieceCount}`,
      ],
      KNAUF_D112_BOARD_REQUIRED_EXPLICIT_PARAMETER_IDS,
      KNAUF_D112_BOARD_SOURCE_METADATA,
    );
  }
  const calculatedBoardProcurementQuantityM2 = Number(
    (selectedBoardLayoutPieceCount! * selectedBoardAreaM2).toFixed(9),
  );
  const explicitQuantity = finiteNumber(
    explicitValue(parameterValuesInput, "quantity_first_layer_gypsum_board"),
  );
  if (
    explicitQuantity !== null &&
    Math.abs(explicitQuantity - calculatedBoardProcurementQuantityM2) > 1e-9
  ) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:quantity_first_layer_gypsum_board=${explicitQuantity}:norm_value=${calculatedBoardProcurementQuantityM2}`,
      ],
      [...KNAUF_D112_BOARD_REQUIRED_EXPLICIT_PARAMETER_IDS, "quantity_first_layer_gypsum_board"],
      KNAUF_D112_BOARD_SOURCE_METADATA,
    );
  }

  const capturedAt = KNAUF_D112_BOARD_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID}`,
    `system=${KNAUF_D112_BOARD_SOURCE_METADATA.system}`,
    `system_variant=${systemVariant}`,
    `ceiling_area_m2=canonical(area_m2)=${areaM2}`,
    `board_type=${boardType}`,
    `board_thickness_mm=${boardThicknessMm}`,
    `board_layer_count=${boardLayerCount}`,
    `selected_board_dimensions_mm=${selectedBoardLengthMm}x${selectedBoardWidthMm}`,
    `selected_board_area_m2=${selectedBoardAreaM2}`,
    `selected_board_layout_piece_count=${selectedBoardLayoutPieceCount}`,
    `minimum_board_piece_count=${minimumBoardPieceCount}`,
    `d112_board_layout_reference=${boardLayoutReference}`,
    `net_formula=area_m2*${KNAUF_D112_BOARD_SOURCE_METADATA.rate_value}`,
    "manufacturer_excludes_loss_and_waste=true",
    `system_passport_reference=${systemPassportReference}`,
    `material_certificate_reference=${materialCertificateReference}`,
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    quantity_first_layer_gypsum_board: {
      value: calculatedBoardProcurementQuantityM2,
      unit_id: "m2",
      source_type: "APPLICABLE_NORM" as const,
      source_id: KNAUF_D112_BOARD_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: KNAUF_D112_BOARD_SOURCE_ID,
    norm_id: KNAUF_D112_BOARD_NORM_ID,
    source_document_version: KNAUF_D112_BOARD_SOURCE_METADATA.source_document_version,
    source_url: KNAUF_D112_BOARD_SOURCE_METADATA.source_url,
    exact_locator: KNAUF_D112_BOARD_SOURCE_METADATA.exact_locator,
    source_definition_hash: KNAUF_D112_BOARD_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...KNAUF_D112_BOARD_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["quantity_first_layer_gypsum_board"],
    calculated_d112_board_net_quantity_m2: calculatedBoardNetQuantityM2,
    calculated_d112_board_procurement_quantity_m2: calculatedBoardProcurementQuantityM2,
    calculated_d112_board_piece_count: selectedBoardLayoutPieceCount!,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveKnaufD112CladProfile(
  productProfileId: typeof KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const tn25Screws = resolveKnaufD112Tn25Screws(productProfileId, parameterValuesInput);
  if (tn25Screws.status !== "APPLIED") return tn25Screws;
  const board = resolveKnaufD112Board(productProfileId, tn25Screws.parameter_values);
  if (board.status !== "APPLIED") return board;

  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: tn25Screws.source_id,
    norm_id: tn25Screws.norm_id,
    source_document_version: tn25Screws.source_document_version,
    source_url: tn25Screws.source_url,
    exact_locator: tn25Screws.exact_locator,
    source_definition_hash: tn25Screws.source_definition_hash,
    source_ids: [tn25Screws.source_id, board.source_id],
    norm_ids: [tn25Screws.norm_id, board.norm_id],
    applied_norms: [{
      source_id: tn25Screws.source_id,
      norm_id: tn25Screws.norm_id,
      source_document_version: tn25Screws.source_document_version,
      source_url: tn25Screws.source_url,
      exact_locator: tn25Screws.exact_locator,
      source_definition_hash: tn25Screws.source_definition_hash,
      produced_parameter_ids: tn25Screws.produced_parameter_ids,
    }, {
      source_id: board.source_id,
      norm_id: board.norm_id,
      source_document_version: board.source_document_version,
      source_url: board.source_url,
      exact_locator: board.exact_locator,
      source_definition_hash: board.source_definition_hash,
      produced_parameter_ids: board.produced_parameter_ids,
    }],
    consumed_parameter_ids: [
      ...new Set([...tn25Screws.consumed_parameter_ids, ...board.consumed_parameter_ids]),
    ],
    produced_parameter_ids: [
      "quantity_first_layer_screws",
      "quantity_first_layer_gypsum_board",
    ] as const,
    calculated_tn25_screw_quantity_piece: tn25Screws.calculated_tn25_screw_quantity_piece,
    calculated_d112_board_net_quantity_m2: board.calculated_d112_board_net_quantity_m2,
    calculated_d112_board_procurement_quantity_m2:
      board.calculated_d112_board_procurement_quantity_m2,
    calculated_d112_board_piece_count: board.calculated_d112_board_piece_count,
    parameter_values: board.parameter_values,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveKnaufD112Uniflott(
  productProfileId: typeof KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(
    KNAUF_D112_UNIFLOTT_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
      parameterId,
      explicitValue(parameterValuesInput, parameterId),
    ]),
  );
  const missing = KNAUF_D112_UNIFLOTT_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      KNAUF_D112_UNIFLOTT_REQUIRED_EXPLICIT_PARAMETER_IDS,
      KNAUF_D112_UNIFLOTT_SOURCE_METADATA,
    );
  }

  const areaM2 = finiteNumber(explicit.area_m2);
  const systemVariant = primitiveString(explicit.system_variant!);
  const jointFillingMethod = primitiveString(explicit.joint_filling_method!);
  const selectedBagSizeKg = finiteNumber(explicit.d112_uniflott_selected_bag_size_kg);
  const systemPassportReference = primitiveString(explicit.system_passport_reference!);
  const materialCertificateReference = primitiveString(explicit.material_certificate_reference!);
  const manufacturerExcludesLossAndWasteConfirmed =
    explicit.d112_manufacturer_excludes_loss_and_waste_confirmed!.value === true ||
    explicit.d112_manufacturer_excludes_loss_and_waste_confirmed!.value === "true";
  const applicabilityBlockers = [
    areaM2 !== null && areaM2 > 0 ? "" : "PROJECT_VALUE_INVALID:area_m2",
    systemVariant === KNAUF_D112_UNIFLOTT_SOURCE_METADATA.variant
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_UNIFLOTT_NORM_ID}:system_variant=${systemVariant}`,
    jointFillingMethod === KNAUF_D112_UNIFLOTT_SOURCE_METADATA.joint_filling_method
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_UNIFLOTT_NORM_ID}:joint_filling_method=${jointFillingMethod}`,
    KNAUF_D112_UNIFLOTT_SOURCE_METADATA.documented_package_sizes_kg.includes(
      selectedBagSizeKg ?? Number.NaN,
    )
      ? ""
      : `PHYSICAL_NORM_PACKAGE_NOT_APPLICABLE:d112_uniflott_selected_bag_size_kg=${selectedBagSizeKg}`,
    manufacturerExcludesLossAndWasteConfirmed
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_UNIFLOTT_NORM_ID}:d112_manufacturer_excludes_loss_and_waste_confirmed=false`,
    systemPassportReference ? "" : "PROJECT_VALUE_REQUIRED_EXPLICIT:system_passport_reference",
    materialCertificateReference ? "" : "PROJECT_VALUE_REQUIRED_EXPLICIT:material_certificate_reference",
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      KNAUF_D112_UNIFLOTT_REQUIRED_EXPLICIT_PARAMETER_IDS,
      KNAUF_D112_UNIFLOTT_SOURCE_METADATA,
    );
  }

  const calculatedNetQuantityKg = Number(
    (areaM2! * KNAUF_D112_UNIFLOTT_SOURCE_METADATA.rate_value).toFixed(9),
  );
  const calculatedProcurementQuantityKg =
    Math.ceil(calculatedNetQuantityKg / selectedBagSizeKg! - 1e-9) * selectedBagSizeKg!;
  const explicitQuantity = finiteNumber(explicitValue(parameterValuesInput, "quantity_base_joint_compound"));
  if (explicitQuantity !== null && Math.abs(explicitQuantity - calculatedProcurementQuantityKg) > 1e-9) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:quantity_base_joint_compound=${explicitQuantity}:norm_value=${calculatedProcurementQuantityKg}`,
      ],
      [...KNAUF_D112_UNIFLOTT_REQUIRED_EXPLICIT_PARAMETER_IDS, "quantity_base_joint_compound"],
      KNAUF_D112_UNIFLOTT_SOURCE_METADATA,
    );
  }

  const capturedAt = KNAUF_D112_UNIFLOTT_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID}`,
    `system=${KNAUF_D112_UNIFLOTT_SOURCE_METADATA.system}`,
    `system_variant=${systemVariant}`,
    `ceiling_area_m2=canonical(area_m2)=${areaM2}`,
    `joint_filling_method=${jointFillingMethod}`,
    `selected_consumption_kg_m2=${KNAUF_D112_UNIFLOTT_SOURCE_METADATA.rate_value}`,
    `selected_bag_size_kg=${selectedBagSizeKg}`,
    "manufacturer_excludes_loss_and_waste_confirmed=true",
    `formula=ceil((area_m2*${KNAUF_D112_UNIFLOTT_SOURCE_METADATA.rate_value})/selected_bag_size_kg)*selected_bag_size_kg`,
    `net_quantity_kg=${calculatedNetQuantityKg}`,
    `system_passport_reference=${systemPassportReference}`,
    `material_certificate_reference=${materialCertificateReference}`,
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    quantity_base_joint_compound: {
      value: calculatedProcurementQuantityKg,
      unit_id: "kg",
      source_type: "APPLICABLE_NORM" as const,
      source_id: KNAUF_D112_UNIFLOTT_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: KNAUF_D112_UNIFLOTT_SOURCE_ID,
    norm_id: KNAUF_D112_UNIFLOTT_NORM_ID,
    source_document_version: KNAUF_D112_UNIFLOTT_SOURCE_METADATA.source_document_version,
    source_url: KNAUF_D112_UNIFLOTT_SOURCE_METADATA.source_url,
    exact_locator: KNAUF_D112_UNIFLOTT_SOURCE_METADATA.exact_locator,
    source_definition_hash: KNAUF_D112_UNIFLOTT_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...KNAUF_D112_UNIFLOTT_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["quantity_base_joint_compound"],
    calculated_uniflott_net_quantity_kg: calculatedNetQuantityKg,
    calculated_uniflott_procurement_quantity_kg: calculatedProcurementQuantityKg,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveKnaufD112JointTape(
  productProfileId: typeof KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(
    KNAUF_D112_JOINT_TAPE_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
      parameterId,
      explicitValue(parameterValuesInput, parameterId),
    ]),
  );
  const missing = KNAUF_D112_JOINT_TAPE_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      KNAUF_D112_JOINT_TAPE_REQUIRED_EXPLICIT_PARAMETER_IDS,
      KNAUF_D112_JOINT_TAPE_SOURCE_METADATA,
    );
  }

  const areaM2 = finiteNumber(explicit.area_m2);
  const systemVariant = primitiveString(explicit.system_variant!);
  const selectedTapeRollLengthM = finiteNumber(explicit.selected_joint_tape_roll_length_m);
  const selectedTapeReference = primitiveString(explicit.selected_joint_tape_reference!);
  const cutEdgeJointLayoutReference = primitiveString(explicit.d112_cut_edge_joint_layout_reference!);
  const systemPassportReference = primitiveString(explicit.system_passport_reference!);
  const materialCertificateReference = primitiveString(explicit.material_certificate_reference!);
  const cutEdgeJointingRequired = explicit.cut_edge_jointing_required!.value === true ||
    explicit.cut_edge_jointing_required!.value === "true";
  const manufacturerExcludesLossAndWasteConfirmed =
    explicit.d112_joint_tape_manufacturer_excludes_loss_and_waste_confirmed!.value === true ||
    explicit.d112_joint_tape_manufacturer_excludes_loss_and_waste_confirmed!.value === "true";
  const applicabilityBlockers = [
    areaM2 !== null && areaM2 > 0 ? "" : "PROJECT_VALUE_INVALID:area_m2",
    systemVariant === KNAUF_D112_JOINT_TAPE_SOURCE_METADATA.variant
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_JOINT_TAPE_NORM_ID}:system_variant=${systemVariant}`,
    cutEdgeJointingRequired
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_JOINT_TAPE_NORM_ID}:cut_edge_jointing_required=false`,
    selectedTapeRollLengthM !== null && selectedTapeRollLengthM > 0
      ? ""
      : "PROJECT_VALUE_INVALID:selected_joint_tape_roll_length_m",
    selectedTapeReference ? "" : "PROJECT_VALUE_INVALID:selected_joint_tape_reference",
    cutEdgeJointLayoutReference ? "" : "PROJECT_VALUE_INVALID:d112_cut_edge_joint_layout_reference",
    manufacturerExcludesLossAndWasteConfirmed
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_D112_JOINT_TAPE_NORM_ID}:d112_joint_tape_manufacturer_excludes_loss_and_waste_confirmed=false`,
    systemPassportReference ? "" : "PROJECT_VALUE_INVALID:system_passport_reference",
    materialCertificateReference ? "" : "PROJECT_VALUE_INVALID:material_certificate_reference",
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      KNAUF_D112_JOINT_TAPE_REQUIRED_EXPLICIT_PARAMETER_IDS,
      KNAUF_D112_JOINT_TAPE_SOURCE_METADATA,
    );
  }

  const calculatedJointTapeNetQuantityM = Number(
    (areaM2! * KNAUF_D112_JOINT_TAPE_SOURCE_METADATA.rate_value).toFixed(9),
  );
  const calculatedJointTapeRollCount = Math.ceil(
    calculatedJointTapeNetQuantityM / selectedTapeRollLengthM! - 1e-9,
  );
  const calculatedJointTapeProcurementQuantityM = Number(
    (calculatedJointTapeRollCount * selectedTapeRollLengthM!).toFixed(9),
  );
  const explicitQuantity = finiteNumber(explicitValue(parameterValuesInput, "quantity_paper_joint_tape"));
  if (
    explicitQuantity !== null &&
    Math.abs(explicitQuantity - calculatedJointTapeProcurementQuantityM) > 1e-9
  ) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:quantity_paper_joint_tape=${explicitQuantity}:norm_value=${calculatedJointTapeProcurementQuantityM}`,
      ],
      [...KNAUF_D112_JOINT_TAPE_REQUIRED_EXPLICIT_PARAMETER_IDS, "quantity_paper_joint_tape"],
      KNAUF_D112_JOINT_TAPE_SOURCE_METADATA,
    );
  }

  const capturedAt = KNAUF_D112_JOINT_TAPE_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID}`,
    `system=${KNAUF_D112_JOINT_TAPE_SOURCE_METADATA.system}`,
    `system_variant=${systemVariant}`,
    `ceiling_area_m2=canonical(area_m2)=${areaM2}`,
    "cut_edge_jointing_required=true",
    `selected_joint_tape_reference=${selectedTapeReference}`,
    `selected_joint_tape_roll_length_m=${selectedTapeRollLengthM}`,
    `d112_cut_edge_joint_layout_reference=${cutEdgeJointLayoutReference}`,
    `net_formula=area_m2*${KNAUF_D112_JOINT_TAPE_SOURCE_METADATA.rate_value}`,
    "package_formula=ceil(net_quantity_m/selected_joint_tape_roll_length_m)*selected_joint_tape_roll_length_m",
    "manufacturer_excludes_loss_and_waste=true",
    `system_passport_reference=${systemPassportReference}`,
    `material_certificate_reference=${materialCertificateReference}`,
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    quantity_paper_joint_tape: {
      value: calculatedJointTapeProcurementQuantityM,
      unit_id: "m",
      source_type: "APPLICABLE_NORM" as const,
      source_id: KNAUF_D112_JOINT_TAPE_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: KNAUF_D112_JOINT_TAPE_SOURCE_ID,
    norm_id: KNAUF_D112_JOINT_TAPE_NORM_ID,
    source_document_version: KNAUF_D112_JOINT_TAPE_SOURCE_METADATA.source_document_version,
    source_url: KNAUF_D112_JOINT_TAPE_SOURCE_METADATA.source_url,
    exact_locator: KNAUF_D112_JOINT_TAPE_SOURCE_METADATA.exact_locator,
    source_definition_hash: KNAUF_D112_JOINT_TAPE_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...KNAUF_D112_JOINT_TAPE_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["quantity_paper_joint_tape"],
    calculated_d112_joint_tape_net_quantity_m: calculatedJointTapeNetQuantityM,
    calculated_d112_joint_tape_procurement_quantity_m: calculatedJointTapeProcurementQuantityM,
    calculated_d112_joint_tape_roll_count: calculatedJointTapeRollCount,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveKnaufD112FinishJointProfile(
  productProfileId: typeof KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const uniflott = resolveKnaufD112Uniflott(productProfileId, parameterValuesInput);
  if (uniflott.status !== "APPLIED") return uniflott;
  const jointTape = resolveKnaufD112JointTape(productProfileId, uniflott.parameter_values);
  if (jointTape.status !== "APPLIED") return jointTape;

  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: uniflott.source_id,
    norm_id: uniflott.norm_id,
    source_document_version: uniflott.source_document_version,
    source_url: uniflott.source_url,
    exact_locator: uniflott.exact_locator,
    source_definition_hash: uniflott.source_definition_hash,
    source_ids: [uniflott.source_id, jointTape.source_id],
    norm_ids: [uniflott.norm_id, jointTape.norm_id],
    applied_norms: [{
      source_id: uniflott.source_id,
      norm_id: uniflott.norm_id,
      source_document_version: uniflott.source_document_version,
      source_url: uniflott.source_url,
      exact_locator: uniflott.exact_locator,
      source_definition_hash: uniflott.source_definition_hash,
      produced_parameter_ids: uniflott.produced_parameter_ids,
    }, {
      source_id: jointTape.source_id,
      norm_id: jointTape.norm_id,
      source_document_version: jointTape.source_document_version,
      source_url: jointTape.source_url,
      exact_locator: jointTape.exact_locator,
      source_definition_hash: jointTape.source_definition_hash,
      produced_parameter_ids: jointTape.produced_parameter_ids,
    }],
    consumed_parameter_ids: [
      ...new Set([...uniflott.consumed_parameter_ids, ...jointTape.consumed_parameter_ids]),
    ],
    produced_parameter_ids: [
      "quantity_base_joint_compound",
      "quantity_paper_joint_tape",
    ] as const,
    calculated_uniflott_net_quantity_kg: uniflott.calculated_uniflott_net_quantity_kg,
    calculated_uniflott_procurement_quantity_kg:
      uniflott.calculated_uniflott_procurement_quantity_kg,
    calculated_d112_joint_tape_net_quantity_m:
      jointTape.calculated_d112_joint_tape_net_quantity_m,
    calculated_d112_joint_tape_procurement_quantity_m:
      jointTape.calculated_d112_joint_tape_procurement_quantity_m,
    calculated_d112_joint_tape_roll_count: jointTape.calculated_d112_joint_tape_roll_count,
    parameter_values: jointTape.parameter_values,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveKnaufFugenfuellerPerimeterJoint(
  productProfileId: typeof KNAUF_FUGENFUELLER_PERIMETER_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(KNAUF_FUGENFUELLER_PERIMETER_REQUIRED_EXPLICIT_PARAMETER_IDS.map(
    (parameterId) => [parameterId, explicitValue(parameterValuesInput, parameterId)],
  ));
  const missing = KNAUF_FUGENFUELLER_PERIMETER_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      KNAUF_FUGENFUELLER_PERIMETER_REQUIRED_EXPLICIT_PARAMETER_IDS,
      KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA,
    );
  }

  const perimeterLinearM = finiteNumber(explicit.perimeter_linear_m);
  const claddingThicknessMm = finiteNumber(explicit.cladding_thickness_mm);
  const consumptionKgLinearM = finiteNumber(explicit.perimeter_joint_consumption_kg_linear_m);
  const connectionMethod = primitiveString(explicit.perimeter_connection_joint_method!);
  const systemPassportReference = primitiveString(explicit.system_passport_reference!);
  const materialCertificateReference = primitiveString(explicit.material_certificate_reference!);
  const [minimumConsumption, maximumConsumption] =
    KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA.rate_range_kg_linear_m;
  const applicabilityBlockers = [
    perimeterLinearM !== null && perimeterLinearM > 0
      ? ""
      : "PROJECT_VALUE_INVALID:perimeter_linear_m",
    claddingThicknessMm !== null && claddingThicknessMm > 0
      ? ""
      : "PROJECT_VALUE_INVALID:cladding_thickness_mm",
    consumptionKgLinearM !== null &&
      consumptionKgLinearM >= minimumConsumption &&
      consumptionKgLinearM <= maximumConsumption
      ? ""
      : `PHYSICAL_NORM_RATE_NOT_APPLICABLE:${KNAUF_FUGENFUELLER_PERIMETER_NORM_ID}:perimeter_joint_consumption_kg_linear_m=${consumptionKgLinearM}`,
    connectionMethod === "KNAUF_TRENN_FIX"
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_FUGENFUELLER_PERIMETER_NORM_ID}:perimeter_connection_joint_method=${connectionMethod}`,
    systemPassportReference ? "" : "PROJECT_VALUE_INVALID:system_passport_reference",
    materialCertificateReference ? "" : "PROJECT_VALUE_INVALID:material_certificate_reference",
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      KNAUF_FUGENFUELLER_PERIMETER_REQUIRED_EXPLICIT_PARAMETER_IDS,
      KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA,
    );
  }

  const packageSizeKg = KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA.package_size_kg;
  const rawQuantityKg = perimeterLinearM! * consumptionKgLinearM!;
  const calculatedPerimeterJointCompoundQuantityKg = Math.ceil(rawQuantityKg / packageSizeKg - 1e-9) * packageSizeKg;
  const explicitQuantity = finiteNumber(explicitValue(parameterValuesInput, "perimeter_joint_compound_quantity_kg"));
  if (
    explicitQuantity !== null &&
    Math.abs(explicitQuantity - calculatedPerimeterJointCompoundQuantityKg) > 1e-9
  ) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:perimeter_joint_compound_quantity_kg=${explicitQuantity}:norm_value=${calculatedPerimeterJointCompoundQuantityKg}`,
      ],
      [
        ...KNAUF_FUGENFUELLER_PERIMETER_REQUIRED_EXPLICIT_PARAMETER_IDS,
        "perimeter_joint_compound_quantity_kg",
      ],
      KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA,
    );
  }

  const capturedAt = KNAUF_FUGENFUELLER_PERIMETER_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${KNAUF_FUGENFUELLER_PERIMETER_PRODUCT_PROFILE_ID}`,
    `system=${KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA.system}`,
    `connection=${KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA.connection}`,
    `perimeter_connection_joint_method=${connectionMethod}`,
    `perimeter_linear_m=${perimeterLinearM}`,
    `cladding_thickness_mm=${claddingThicknessMm}`,
    `perimeter_joint_consumption_kg_linear_m=${consumptionKgLinearM}`,
    `system_passport_reference=${systemPassportReference}`,
    `material_certificate_reference=${materialCertificateReference}`,
    "additional_waste_excluded=true",
    `formula=ceil((perimeter_linear_m*perimeter_joint_consumption_kg_linear_m)/${packageSizeKg})*${packageSizeKg}`,
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    perimeter_joint_compound_quantity_kg: {
      value: calculatedPerimeterJointCompoundQuantityKg,
      unit_id: "kg",
      source_type: "APPLICABLE_NORM" as const,
      source_id: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_ID,
    norm_id: KNAUF_FUGENFUELLER_PERIMETER_NORM_ID,
    source_document_version: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA.source_document_version,
    source_url: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA.source_url,
    exact_locator: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA.exact_locator,
    source_definition_hash: KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...KNAUF_FUGENFUELLER_PERIMETER_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["perimeter_joint_compound_quantity_kg"],
    calculated_perimeter_joint_compound_quantity_kg: calculatedPerimeterJointCompoundQuantityKg,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveKnaufFugenfuellerJointing(
  productProfileId: typeof KNAUF_FUGENFUELLER_JOINTING_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(KNAUF_FUGENFUELLER_JOINTING_REQUIRED_EXPLICIT_PARAMETER_IDS.map(
    (parameterId) => [parameterId, explicitValue(parameterValuesInput, parameterId)],
  ));
  const missing = KNAUF_FUGENFUELLER_JOINTING_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      KNAUF_FUGENFUELLER_JOINTING_REQUIRED_EXPLICIT_PARAMETER_IDS,
      KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA,
    );
  }

  const areaM2 = finiteNumber(explicit.area_m2);
  const boardProductType = primitiveString(explicit.board_product_type!);
  const boardThicknessMm = finiteNumber(explicit.board_thickness_mm);
  const boardLayerConfiguration = primitiveString(explicit.board_layer_configuration!);
  const longEdgeType = primitiveString(explicit.long_edge_type!);
  const constructionApplication = primitiveString(explicit.construction_application!);
  const selectedConsumptionKgM2 = finiteNumber(explicit.selected_consumption_kg_m2);
  const selectedBagSizeKg = finiteNumber(explicit.selected_bag_size_kg);
  const systemPassportReference = primitiveString(explicit.system_passport_reference!);
  const materialCertificateReference = primitiveString(explicit.material_certificate_reference!);
  const confirmed = (
    parameterId:
      | "jointing_without_perimeter_confirmed"
      | "reinforcement_tape_confirmed"
      | "substrate_and_application_conditions_confirmed",
  ) => explicit[parameterId]!.value === true || explicit[parameterId]!.value === "true";
  const applicabilityBlockers = [
    areaM2 !== null && areaM2 > 0 ? "" : "PROJECT_VALUE_INVALID:area_m2",
    boardProductType === KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA.board_product_type
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_FUGENFUELLER_JOINTING_NORM_ID}:board_product_type=${boardProductType}`,
    boardThicknessMm === KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA.board_thickness_mm
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_FUGENFUELLER_JOINTING_NORM_ID}:board_thickness_mm=${boardThicknessMm}`,
    boardLayerConfiguration === KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA.board_layer_configuration
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_FUGENFUELLER_JOINTING_NORM_ID}:board_layer_configuration=${boardLayerConfiguration}`,
    longEdgeType === KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA.long_edge_type
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_FUGENFUELLER_JOINTING_NORM_ID}:long_edge_type=${longEdgeType}`,
    constructionApplication === KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA.construction_application
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_FUGENFUELLER_JOINTING_NORM_ID}:construction_application=${constructionApplication}`,
    selectedConsumptionKgM2 === KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA.rate_value
      ? ""
      : `PHYSICAL_NORM_TABLE_CELL_CONFLICT:selected_consumption_kg_m2=${selectedConsumptionKgM2}:table_value=${KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA.rate_value}`,
    selectedBagSizeKg !== null &&
      (KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA.documented_bag_sizes_kg as readonly number[])
        .includes(selectedBagSizeKg)
      ? ""
      : `PHYSICAL_NORM_PACKAGE_NOT_APPLICABLE:selected_bag_size_kg=${selectedBagSizeKg}`,
    confirmed("jointing_without_perimeter_confirmed")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_FUGENFUELLER_JOINTING_NORM_ID}:jointing_without_perimeter_confirmed=false`,
    confirmed("reinforcement_tape_confirmed")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_FUGENFUELLER_JOINTING_NORM_ID}:reinforcement_tape_confirmed=false`,
    confirmed("substrate_and_application_conditions_confirmed")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KNAUF_FUGENFUELLER_JOINTING_NORM_ID}:substrate_and_application_conditions_confirmed=false`,
    systemPassportReference ? "" : "PROJECT_VALUE_INVALID:system_passport_reference",
    materialCertificateReference ? "" : "PROJECT_VALUE_INVALID:material_certificate_reference",
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      KNAUF_FUGENFUELLER_JOINTING_REQUIRED_EXPLICIT_PARAMETER_IDS,
      KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA,
    );
  }

  const calculatedNetQuantityKg = Number((areaM2! * selectedConsumptionKgM2!).toFixed(9));
  const calculatedProcurementQuantityKg = Math.ceil(
    calculatedNetQuantityKg / selectedBagSizeKg! - 1e-9,
  ) * selectedBagSizeKg!;
  const explicitQuantity = finiteNumber(explicitValue(parameterValuesInput, "quantity_base_joint_compound"));
  if (explicitQuantity !== null && Math.abs(explicitQuantity - calculatedProcurementQuantityKg) > 1e-9) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:quantity_base_joint_compound=${explicitQuantity}:norm_value=${calculatedProcurementQuantityKg}`,
      ],
      [...KNAUF_FUGENFUELLER_JOINTING_REQUIRED_EXPLICIT_PARAMETER_IDS, "quantity_base_joint_compound"],
      KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA,
    );
  }

  const capturedAt = KNAUF_FUGENFUELLER_JOINTING_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${KNAUF_FUGENFUELLER_JOINTING_PRODUCT_PROFILE_ID}`,
    `product=${KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA.product}`,
    `tds_identifier=${KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA.tds_identifier}`,
    `exact_table_cell=${KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA.exact_table_cell}`,
    `board_area_m2=canonical(area_m2)=${areaM2}`,
    `board_product_type=${boardProductType}`,
    `board_thickness_mm=${boardThicknessMm}`,
    `board_layer_configuration=${boardLayerConfiguration}`,
    `long_edge_type=${longEdgeType}`,
    `construction_application=${constructionApplication}`,
    `application_temperature_min_c=${KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA.application_temperature_min_c}`,
    `substrate_and_application_conditions_confirmed=true`,
    `reinforcement_tape_confirmed=true`,
    `perimeter_connection_joints_excluded=true`,
    `selected_consumption_kg_m2=${selectedConsumptionKgM2}`,
    `selected_bag_size_kg=${selectedBagSizeKg}`,
    `formula=ceil((area_m2*selected_consumption_kg_m2)/selected_bag_size_kg)*selected_bag_size_kg`,
    `system_passport_reference=${systemPassportReference}`,
    `material_certificate_reference=${materialCertificateReference}`,
    `additional_waste_not_published=${KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA.additional_waste_not_published}`,
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    quantity_base_joint_compound: {
      value: calculatedProcurementQuantityKg,
      unit_id: "kg",
      source_type: "APPLICABLE_NORM" as const,
      source_id: KNAUF_FUGENFUELLER_JOINTING_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: KNAUF_FUGENFUELLER_JOINTING_SOURCE_ID,
    norm_id: KNAUF_FUGENFUELLER_JOINTING_NORM_ID,
    source_document_version: KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA.source_document_version,
    source_url: KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA.source_url,
    exact_locator: KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA.exact_locator,
    source_definition_hash: KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...KNAUF_FUGENFUELLER_JOINTING_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["quantity_base_joint_compound"],
    calculated_fugenfueller_jointing_net_quantity_kg: calculatedNetQuantityKg,
    calculated_fugenfueller_jointing_procurement_quantity_kg: calculatedProcurementQuantityKg,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveCeresitCn69Global25Kg(
  productProfileId: typeof CERESIT_CN69_GLOBAL_25KG_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(CERESIT_CN69_GLOBAL_25KG_REQUIRED_EXPLICIT_PARAMETER_IDS.map(
    (parameterId) => [parameterId, explicitValue(parameterValuesInput, parameterId)],
  ));
  const missing = CERESIT_CN69_GLOBAL_25KG_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      CERESIT_CN69_GLOBAL_25KG_REQUIRED_EXPLICIT_PARAMETER_IDS,
      CERESIT_CN69_GLOBAL_25KG_SOURCE_METADATA,
    );
  }

  const areaM2 = finiteNumber(explicit.area_m2);
  const layerThicknessMm = finiteNumber(explicit.layer_thickness_mm);
  const substrateType = primitiveString(explicit.cn69_substrate_type!);
  const selectedBagSizeKg = finiteNumber(explicit.selected_bag_size_kg);
  const confirmed = (parameterId:
    | "dry_indoor_use_confirmed"
    | "moisture_ingress_prevented"
    | "substrate_preparation_confirmed"
    | "installation_conditions_confirmed"
    | "cn69_global_25kg_tds_variant_confirmed") =>
    explicit[parameterId]!.value === true || explicit[parameterId]!.value === "true";
  const applicabilityBlockers = [
    areaM2 !== null && areaM2 > 0
      ? ""
      : "PROJECT_VALUE_INVALID:area_m2",
    layerThicknessMm !== null &&
      layerThicknessMm >= CERESIT_CN69_GLOBAL_25KG_SOURCE_METADATA.layer_min_mm &&
      layerThicknessMm <= CERESIT_CN69_GLOBAL_25KG_SOURCE_METADATA.layer_max_mm
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CN69_GLOBAL_25KG_NORM_ID}:layer_thickness_mm=${layerThicknessMm}`,
    CERESIT_CN69_GLOBAL_25KG_SOURCE_METADATA.surfaces.includes(substrateType ?? "")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CN69_GLOBAL_25KG_NORM_ID}:cn69_substrate_type=${substrateType}`,
    selectedBagSizeKg === CERESIT_CN69_GLOBAL_25KG_SOURCE_METADATA.package_size_kg
      ? ""
      : `PHYSICAL_NORM_VARIANT_CONFLICT:selected_bag_size_kg=${selectedBagSizeKg}:tds_bag_size_kg=${CERESIT_CN69_GLOBAL_25KG_SOURCE_METADATA.package_size_kg}`,
    confirmed("dry_indoor_use_confirmed")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CN69_GLOBAL_25KG_NORM_ID}:dry_indoor_use_confirmed=false`,
    confirmed("moisture_ingress_prevented")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CN69_GLOBAL_25KG_NORM_ID}:moisture_ingress_prevented=false`,
    confirmed("substrate_preparation_confirmed")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CN69_GLOBAL_25KG_NORM_ID}:substrate_preparation_confirmed=false`,
    confirmed("installation_conditions_confirmed")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CN69_GLOBAL_25KG_NORM_ID}:installation_conditions_confirmed=false`,
    confirmed("cn69_global_25kg_tds_variant_confirmed")
      ? ""
      : `PHYSICAL_NORM_VARIANT_NOT_CONFIRMED:${CERESIT_CN69_GLOBAL_25KG_NORM_ID}`,
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      CERESIT_CN69_GLOBAL_25KG_REQUIRED_EXPLICIT_PARAMETER_IDS,
      CERESIT_CN69_GLOBAL_25KG_SOURCE_METADATA,
    );
  }

  const consumptionRate = CERESIT_CN69_GLOBAL_25KG_SOURCE_METADATA.rate_value;
  const explicitConsumptionRate = finiteNumber(explicitValue(
    parameterValuesInput,
    "material_consumption_kg_m2_mm",
  ));
  if (explicitConsumptionRate !== null && Math.abs(explicitConsumptionRate - consumptionRate) > 1e-9) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:material_consumption_kg_m2_mm=${explicitConsumptionRate}:norm_value=${consumptionRate}`,
      ],
      [
        ...CERESIT_CN69_GLOBAL_25KG_REQUIRED_EXPLICIT_PARAMETER_IDS,
        "material_consumption_kg_m2_mm",
      ],
      CERESIT_CN69_GLOBAL_25KG_SOURCE_METADATA,
    );
  }

  const calculatedCn69NetQuantityKg = Number(
    (areaM2! * layerThicknessMm! * consumptionRate).toFixed(9),
  );
  const calculatedCn69BagCount = Math.ceil(
    calculatedCn69NetQuantityKg / CERESIT_CN69_GLOBAL_25KG_SOURCE_METADATA.package_size_kg - 1e-9,
  );
  const capturedAt = CERESIT_CN69_GLOBAL_25KG_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${CERESIT_CN69_GLOBAL_25KG_PRODUCT_PROFILE_ID}`,
    `tds_identifier=${CERESIT_CN69_GLOBAL_25KG_SOURCE_METADATA.tds_identifier}`,
    `production_variant=${CERESIT_CN69_GLOBAL_25KG_SOURCE_METADATA.production_variant}`,
    `area_m2=${areaM2}`,
    `layer_thickness_mm=${layerThicknessMm}`,
    `cn69_substrate_type=${substrateType}`,
    "dry_indoor_use_confirmed=true",
    "moisture_ingress_prevented=true",
    "substrate_preparation_confirmed=true",
    "installation_conditions_confirmed=true",
    "cn69_global_25kg_tds_variant_confirmed=true",
    `selected_bag_size_kg=${selectedBagSizeKg}`,
    `formula=area_m2*layer_thickness_mm*${consumptionRate}`,
    `net_quantity_kg=${calculatedCn69NetQuantityKg}`,
    `bag_count=${calculatedCn69BagCount}`,
    "additional_waste_percent=0",
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    material_consumption_kg_m2_mm: {
      value: consumptionRate,
      unit_id: "kg_per_m2_mm",
      source_type: "APPLICABLE_NORM" as const,
      source_id: CERESIT_CN69_GLOBAL_25KG_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: CERESIT_CN69_GLOBAL_25KG_SOURCE_ID,
    norm_id: CERESIT_CN69_GLOBAL_25KG_NORM_ID,
    source_document_version: CERESIT_CN69_GLOBAL_25KG_SOURCE_METADATA.source_document_version,
    source_url: CERESIT_CN69_GLOBAL_25KG_SOURCE_METADATA.source_url,
    exact_locator: CERESIT_CN69_GLOBAL_25KG_SOURCE_METADATA.exact_locator,
    source_definition_hash: CERESIT_CN69_GLOBAL_25KG_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...CERESIT_CN69_GLOBAL_25KG_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["material_consumption_kg_m2_mm"],
    calculated_cn69_net_quantity_kg: calculatedCn69NetQuantityKg,
    calculated_cn69_bag_count: calculatedCn69BagCount,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveCeresitCn87Exact50MmScreed(
  productProfileId: typeof CERESIT_CN87_50MM_SCREED_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(
    CERESIT_CN87_50MM_SCREED_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
      parameterId,
      explicitValue(parameterValuesInput, parameterId),
    ]),
  );
  const missing = CERESIT_CN87_50MM_SCREED_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      CERESIT_CN87_50MM_SCREED_REQUIRED_EXPLICIT_PARAMETER_IDS,
      CERESIT_CN87_50MM_SCREED_SOURCE_METADATA,
    );
  }

  const areaM2 = finiteNumber(explicit.area_m2);
  const layerThicknessMm = finiteNumber(explicit.layer_thickness_mm);
  const screedConstructionType = primitiveString(explicit.screed_construction_type!);
  const underfloorHeating = explicitTrue(explicit.underfloor_heating);
  const heatingPipeOuterDiameterMm = finiteNumber(explicit.heating_pipe_outer_diameter_mm);
  const selectedBagSizeKg = finiteNumber(explicit.selected_bag_size_kg);
  const nonHeatedConstructionRanges: Readonly<Record<string, readonly number[]>> = {
    bonded: CERESIT_CN87_50MM_SCREED_SOURCE_METADATA.bonded_screed_thickness_mm,
    separation_layer: CERESIT_CN87_50MM_SCREED_SOURCE_METADATA.separation_layer_screed_thickness_mm,
    floating: CERESIT_CN87_50MM_SCREED_SOURCE_METADATA.floating_screed_thickness_mm,
  };
  const selectedRange = screedConstructionType
    ? nonHeatedConstructionRanges[screedConstructionType]
    : undefined;
  const constructionRangeValid = selectedRange !== undefined &&
    layerThicknessMm !== null &&
    layerThicknessMm >= selectedRange[0]! &&
    layerThicknessMm <= selectedRange[1]!;
  const heatedFloatingValid = underfloorHeating &&
    screedConstructionType === "heated_floating" &&
    layerThicknessMm !== null &&
    heatingPipeOuterDiameterMm !== null &&
    heatingPipeOuterDiameterMm > 0 &&
    layerThicknessMm >= 45 + heatingPipeOuterDiameterMm &&
    layerThicknessMm <= CERESIT_CN87_50MM_SCREED_SOURCE_METADATA.floating_screed_thickness_mm[1]!;
  const nonHeatedSelectionValid = !underfloorHeating &&
    constructionRangeValid &&
    heatingPipeOuterDiameterMm === 0;
  const applicabilityBlockers = [
    areaM2 !== null && areaM2 > 0 ? "" : "PROJECT_VALUE_INVALID:area_m2",
    layerThicknessMm === CERESIT_CN87_50MM_SCREED_SOURCE_METADATA.layer_thickness_mm
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CN87_50MM_SCREED_NORM_ID}:layer_thickness_mm=${layerThicknessMm}:exact_required=50`,
    nonHeatedSelectionValid || heatedFloatingValid
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CN87_50MM_SCREED_NORM_ID}:screed_construction_type=${screedConstructionType}:underfloor_heating=${underfloorHeating}:heating_pipe_outer_diameter_mm=${heatingPipeOuterDiameterMm}`,
    explicitTrue(explicit.substrate_condition_confirmed)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CN87_50MM_SCREED_NORM_ID}:substrate_condition_confirmed=false`,
    explicitTrue(explicit.joint_layout_confirmed)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CN87_50MM_SCREED_NORM_ID}:joint_layout_confirmed=false`,
    selectedBagSizeKg === CERESIT_CN87_50MM_SCREED_SOURCE_METADATA.package_size_kg
      ? ""
      : `PHYSICAL_NORM_VARIANT_CONFLICT:selected_bag_size_kg=${selectedBagSizeKg}:tds_bag_size_kg=${CERESIT_CN87_50MM_SCREED_SOURCE_METADATA.package_size_kg}`,
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      CERESIT_CN87_50MM_SCREED_REQUIRED_EXPLICIT_PARAMETER_IDS,
      CERESIT_CN87_50MM_SCREED_SOURCE_METADATA,
    );
  }

  const consumptionRate = CERESIT_CN87_50MM_SCREED_SOURCE_METADATA.rate_value;
  const explicitConsumptionRate = finiteNumber(explicitValue(
    parameterValuesInput,
    "material_consumption_kg_m2_mm",
  ));
  if (explicitConsumptionRate !== null && Math.abs(explicitConsumptionRate - consumptionRate) > 1e-9) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:material_consumption_kg_m2_mm=${explicitConsumptionRate}:norm_value=${consumptionRate}`,
      ],
      [
        ...CERESIT_CN87_50MM_SCREED_REQUIRED_EXPLICIT_PARAMETER_IDS,
        "material_consumption_kg_m2_mm",
      ],
      CERESIT_CN87_50MM_SCREED_SOURCE_METADATA,
    );
  }

  const calculatedNetQuantityKg = Number(
    (areaM2! * layerThicknessMm! * consumptionRate).toFixed(9),
  );
  const calculatedBagCount = Math.ceil(
    calculatedNetQuantityKg / CERESIT_CN87_50MM_SCREED_SOURCE_METADATA.package_size_kg - 1e-9,
  );
  const calculatedProcurementQuantityKg = Number(
    (calculatedBagCount * CERESIT_CN87_50MM_SCREED_SOURCE_METADATA.package_size_kg).toFixed(9),
  );
  const capturedAt = CERESIT_CN87_50MM_SCREED_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${CERESIT_CN87_50MM_SCREED_PRODUCT_PROFILE_ID}`,
    `product=${CERESIT_CN87_50MM_SCREED_SOURCE_METADATA.product}`,
    `tds_identifier=${CERESIT_CN87_50MM_SCREED_SOURCE_METADATA.tds_identifier}`,
    `area_m2=${areaM2}`,
    `layer_thickness_mm=${layerThicknessMm}`,
    `screed_construction_type=${screedConstructionType}`,
    `underfloor_heating=${underfloorHeating}`,
    `heating_pipe_outer_diameter_mm=${heatingPipeOuterDiameterMm}`,
    "substrate_condition_confirmed=true",
    "joint_layout_confirmed=true",
    `selected_bag_size_kg=${selectedBagSizeKg}`,
    `formula=area_m2*layer_thickness_mm*${consumptionRate}`,
    `net_quantity_kg=${calculatedNetQuantityKg}`,
    `bag_count=${calculatedBagCount}`,
    `procurement_quantity_kg=${calculatedProcurementQuantityKg}`,
    "contact_layer_materials_excluded_from_rate=true",
    "additional_waste_percent=0",
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    material_consumption_kg_m2_mm: {
      value: consumptionRate,
      unit_id: "kg_per_m2_mm",
      source_type: "APPLICABLE_NORM" as const,
      source_id: CERESIT_CN87_50MM_SCREED_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: CERESIT_CN87_50MM_SCREED_SOURCE_ID,
    norm_id: CERESIT_CN87_50MM_SCREED_NORM_ID,
    source_document_version: CERESIT_CN87_50MM_SCREED_SOURCE_METADATA.source_document_version,
    source_url: CERESIT_CN87_50MM_SCREED_SOURCE_METADATA.source_url,
    exact_locator: CERESIT_CN87_50MM_SCREED_SOURCE_METADATA.exact_locator,
    source_definition_hash: CERESIT_CN87_50MM_SCREED_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...CERESIT_CN87_50MM_SCREED_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["material_consumption_kg_m2_mm"] as const,
    calculated_cn87_net_quantity_kg: calculatedNetQuantityKg,
    calculated_cn87_procurement_quantity_kg: calculatedProcurementQuantityKg,
    calculated_cn87_bag_count: calculatedBagCount,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveCeresitCt29InteriorWallPlaster(
  productProfileId: typeof CERESIT_CT29_INTERIOR_WALL_PLASTER_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(
    CERESIT_CT29_INTERIOR_WALL_PLASTER_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
      parameterId,
      explicitValue(parameterValuesInput, parameterId),
    ]),
  );
  const missing = CERESIT_CT29_INTERIOR_WALL_PLASTER_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      CERESIT_CT29_INTERIOR_WALL_PLASTER_REQUIRED_EXPLICIT_PARAMETER_IDS,
      CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_METADATA,
    );
  }

  const areaM2 = finiteNumber(explicit.area_m2);
  const layerThicknessMm = finiteNumber(explicit.layer_thickness_mm);
  const applicationMode = primitiveString(explicit.ct29_application_mode!);
  const substrateType = primitiveString(explicit.substrate_type!);
  const surfaceType = primitiveString(explicit.surface_type!);
  const substrateAbsorbencyClass = primitiveString(explicit.substrate_absorbency_class!);
  const installationLocation = primitiveString(explicit.installation_location!);
  const selectedBagSizeKg = finiteNumber(explicit.selected_bag_size_kg);
  const surfaceTypeBySubstrate: Readonly<Record<string, string>> = Object.freeze({
    concrete: "CONCRETE",
    traditional_plaster: "CEMENT_PLASTER",
    cement_lime_plaster: "CEMENT_PLASTER",
    rough_mineral_substrate: "CEMENT_PLASTER",
    small_masonry_work: "MASONRY",
  });
  const acceptedAbsorbencyClasses = [
    "normal_absorption",
    "dry_highly_absorbent",
    "low_or_non_homogeneous",
  ];
  const applicabilityBlockers = [
    areaM2 !== null && areaM2 > 0 ? "" : "PROJECT_VALUE_INVALID:area_m2",
    layerThicknessMm !== null && layerThicknessMm > 0
      ? ""
      : "PROJECT_VALUE_INVALID:layer_thickness_mm",
    applicationMode === CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_METADATA.application_mode
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT29_INTERIOR_WALL_PLASTER_NORM_ID}:ct29_application_mode=${applicationMode}`,
    substrateType && CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_METADATA.surfaces.includes(substrateType)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT29_INTERIOR_WALL_PLASTER_NORM_ID}:substrate_type=${substrateType}`,
    substrateType && surfaceTypeBySubstrate[substrateType] === surfaceType
      ? ""
      : `PHYSICAL_NORM_PROJECT_VALUE_CONFLICT:surface_type=${surfaceType}:substrate_type=${substrateType}`,
    substrateAbsorbencyClass && acceptedAbsorbencyClasses.includes(substrateAbsorbencyClass)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT29_INTERIOR_WALL_PLASTER_NORM_ID}:substrate_absorbency_class=${substrateAbsorbencyClass}`,
    installationLocation === "indoor"
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT29_INTERIOR_WALL_PLASTER_NORM_ID}:installation_location=${installationLocation}`,
    selectedBagSizeKg !== null &&
      CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_METADATA.documented_bag_sizes_kg.includes(selectedBagSizeKg)
      ? ""
      : `PHYSICAL_NORM_VARIANT_CONFLICT:selected_bag_size_kg=${selectedBagSizeKg}:documented_bag_sizes_kg=${CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_METADATA.documented_bag_sizes_kg.join(",")}`,
    explicitTrue(explicit.substrate_rough_load_carrying_clean_confirmed)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT29_INTERIOR_WALL_PLASTER_NORM_ID}:substrate_rough_load_carrying_clean_confirmed=false`,
    explicitTrue(explicit.substrate_absorbency_preparation_confirmed)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT29_INTERIOR_WALL_PLASTER_NORM_ID}:substrate_absorbency_preparation_confirmed=false`,
    explicitTrue(explicit.application_conditions_confirmed)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT29_INTERIOR_WALL_PLASTER_NORM_ID}:application_conditions_confirmed=false`,
    explicitFalse(explicit.exterior_curing_protection_confirmed)
      ? ""
      : `PHYSICAL_NORM_PROJECT_VALUE_CONFLICT:installation_location=indoor:exterior_curing_protection_confirmed=true`,
    explicitTrue(explicit.ct29_global_tds_variant_confirmed)
      ? ""
      : `PHYSICAL_NORM_VARIANT_NOT_CONFIRMED:${CERESIT_CT29_INTERIOR_WALL_PLASTER_NORM_ID}`,
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      CERESIT_CT29_INTERIOR_WALL_PLASTER_REQUIRED_EXPLICIT_PARAMETER_IDS,
      CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_METADATA,
    );
  }

  const consumptionRate = CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_METADATA.rate_value;
  const explicitConsumptionRate = finiteNumber(explicitValue(
    parameterValuesInput,
    "material_consumption_kg_m2_mm",
  ));
  if (explicitConsumptionRate !== null && Math.abs(explicitConsumptionRate - consumptionRate) > 1e-9) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:material_consumption_kg_m2_mm=${explicitConsumptionRate}:norm_value=${consumptionRate}`,
      ],
      [
        ...CERESIT_CT29_INTERIOR_WALL_PLASTER_REQUIRED_EXPLICIT_PARAMETER_IDS,
        "material_consumption_kg_m2_mm",
      ],
      CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_METADATA,
    );
  }

  const calculatedCt29NetQuantityKg = Number(
    (areaM2! * layerThicknessMm! * consumptionRate).toFixed(9),
  );
  const calculatedCt29BagCount = Math.ceil(calculatedCt29NetQuantityKg / selectedBagSizeKg! - 1e-9);
  const calculatedCt29ProcurementQuantityKg = Number(
    (calculatedCt29BagCount * selectedBagSizeKg!).toFixed(9),
  );
  const capturedAt = CERESIT_CT29_INTERIOR_WALL_PLASTER_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${CERESIT_CT29_INTERIOR_WALL_PLASTER_PRODUCT_PROFILE_ID}`,
    `tds_identifier=${CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_METADATA.tds_identifier}`,
    `ct29_application_mode=${applicationMode}`,
    `area_m2=${areaM2}`,
    `layer_thickness_mm=${layerThicknessMm}`,
    `surface_type=${surfaceType}`,
    `substrate_type=${substrateType}`,
    `substrate_absorbency_class=${substrateAbsorbencyClass}`,
    "substrate_rough_load_carrying_clean_confirmed=true",
    "substrate_absorbency_preparation_confirmed=true",
    "installation_location=indoor",
    "application_conditions_confirmed=true",
    "exterior_curing_protection_confirmed=false",
    "ct29_global_tds_variant_confirmed=true",
    `selected_bag_size_kg=${selectedBagSizeKg}`,
    `formula=area_m2*layer_thickness_mm*${consumptionRate}`,
    `net_quantity_kg=${calculatedCt29NetQuantityKg}`,
    `bag_count=${calculatedCt29BagCount}`,
    `procurement_quantity_kg=${calculatedCt29ProcurementQuantityKg}`,
    "deep_loss_filling_by_volume_excluded=true",
    "additional_waste_percent=0",
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    material_consumption_kg_m2_mm: {
      value: consumptionRate,
      unit_id: "kg_per_m2_mm",
      source_type: "APPLICABLE_NORM" as const,
      source_id: CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_ID,
    norm_id: CERESIT_CT29_INTERIOR_WALL_PLASTER_NORM_ID,
    source_document_version:
      CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_METADATA.source_document_version,
    source_url: CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_METADATA.source_url,
    exact_locator: CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_METADATA.exact_locator,
    source_definition_hash: CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...CERESIT_CT29_INTERIOR_WALL_PLASTER_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["material_consumption_kg_m2_mm"] as const,
    calculated_ct29_net_quantity_kg: calculatedCt29NetQuantityKg,
    calculated_ct29_procurement_quantity_kg: calculatedCt29ProcurementQuantityKg,
    calculated_ct29_bag_count: calculatedCt29BagCount,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveCeresitCt126DryInteriorWallPutty(
  productProfileId: typeof CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(
    CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
      parameterId,
      explicitValue(parameterValuesInput, parameterId),
    ]),
  );
  const missing = CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_REQUIRED_EXPLICIT_PARAMETER_IDS,
      CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_METADATA,
    );
  }

  const areaM2 = finiteNumber(explicit.area_m2);
  const layerThicknessMm = finiteNumber(explicit.layer_thickness_mm);
  const substrateType = primitiveString(explicit.substrate_type!);
  const surfaceType = primitiveString(explicit.surface_type!);
  const substratePreparationSystem = primitiveString(explicit.substrate_preparation_system!);
  const selectedBagSizeKg = finiteNumber(explicit.selected_bag_size_kg);
  const preparationSystemBySubstrate: Readonly<Record<string, string>> = Object.freeze({
    cement_plaster: "CERESIT_CT7",
    cement_lime_plaster: "CERESIT_CT7",
    gypsum_substrate: "CERESIT_CT7",
    gypsum_fibre_board: "CERESIT_CT7",
    plasterboard: "CERESIT_CT7",
    sound_adherent_paint_coat: "CERESIT_CT19",
  });
  const surfaceTypeBySubstrate: Readonly<Record<string, string>> = Object.freeze({
    cement_plaster: "CEMENT_PLASTER",
    cement_lime_plaster: "CEMENT_PLASTER",
    gypsum_substrate: "GYPSUM_BOARD",
    gypsum_fibre_board: "GYPSUM_BOARD",
    plasterboard: "GYPSUM_BOARD",
    sound_adherent_paint_coat: "PROJECT_SPECIFIED",
  });
  const applicabilityBlockers = [
    areaM2 !== null && areaM2 > 0 ? "" : "PROJECT_VALUE_INVALID:area_m2",
    layerThicknessMm !== null &&
      layerThicknessMm >= CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_METADATA.layer_min_mm &&
      layerThicknessMm <= CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_METADATA.layer_max_mm
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_NORM_ID}:layer_thickness_mm=${layerThicknessMm}`,
    substrateType && preparationSystemBySubstrate[substrateType]
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_NORM_ID}:substrate_type=${substrateType}:exact_preparation_mapping_unavailable`,
    substrateType && surfaceTypeBySubstrate[substrateType] === surfaceType
      ? ""
      : `PHYSICAL_NORM_PROJECT_VALUE_CONFLICT:surface_type=${surfaceType}:substrate_type=${substrateType}`,
    substrateType && preparationSystemBySubstrate[substrateType] === substratePreparationSystem
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_NORM_ID}:substrate_type=${substrateType}:substrate_preparation_system=${substratePreparationSystem}`,
    selectedBagSizeKg !== null &&
      CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_METADATA.documented_bag_sizes_kg.includes(selectedBagSizeKg)
      ? ""
      : `PHYSICAL_NORM_VARIANT_CONFLICT:selected_bag_size_kg=${selectedBagSizeKg}:documented_bag_sizes_kg=${CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_METADATA.documented_bag_sizes_kg.join(",")}`,
    explicitTrue(explicit.substrate_load_bearing_dry_clean_confirmed)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_NORM_ID}:substrate_load_bearing_dry_clean_confirmed=false`,
    explicitTrue(explicit.dry_interior_no_permanent_humidity_confirmed)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_NORM_ID}:dry_interior_no_permanent_humidity_confirmed=false`,
    explicitTrue(explicit.application_temperature_confirmed)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_NORM_ID}:application_temperature_confirmed=false`,
    explicitTrue(explicit.ct126_tds_variant_confirmed)
      ? ""
      : `PHYSICAL_NORM_VARIANT_NOT_CONFIRMED:${CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_NORM_ID}`,
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_REQUIRED_EXPLICIT_PARAMETER_IDS,
      CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_METADATA,
    );
  }

  const consumptionRate = CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_METADATA.rate_value;
  const explicitConsumptionRate = finiteNumber(explicitValue(
    parameterValuesInput,
    "material_consumption_kg_m2_mm",
  ));
  if (explicitConsumptionRate !== null && Math.abs(explicitConsumptionRate - consumptionRate) > 1e-9) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:material_consumption_kg_m2_mm=${explicitConsumptionRate}:norm_value=${consumptionRate}`,
      ],
      [
        ...CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_REQUIRED_EXPLICIT_PARAMETER_IDS,
        "material_consumption_kg_m2_mm",
      ],
      CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_METADATA,
    );
  }

  const calculatedCt126NetQuantityKg = Number(
    (areaM2! * layerThicknessMm! * consumptionRate).toFixed(9),
  );
  const calculatedCt126BagCount = Math.ceil(calculatedCt126NetQuantityKg / selectedBagSizeKg! - 1e-9);
  const calculatedCt126ProcurementQuantityKg = Number(
    (calculatedCt126BagCount * selectedBagSizeKg!).toFixed(9),
  );
  const explicitProcurementQuantityKg = finiteNumber(explicitValue(
    parameterValuesInput,
    "putty_procurement_quantity_kg",
  ));
  if (
    explicitProcurementQuantityKg !== null &&
    Math.abs(explicitProcurementQuantityKg - calculatedCt126ProcurementQuantityKg) > 1e-9
  ) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:putty_procurement_quantity_kg=${explicitProcurementQuantityKg}:norm_value=${calculatedCt126ProcurementQuantityKg}`,
      ],
      [
        ...CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_REQUIRED_EXPLICIT_PARAMETER_IDS,
        "putty_procurement_quantity_kg",
      ],
      CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_METADATA,
    );
  }
  const capturedAt = CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_PRODUCT_PROFILE_ID}`,
    `tds_identifier=${CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_METADATA.tds_identifier}`,
    `area_m2=${areaM2}`,
    `layer_thickness_mm=${layerThicknessMm}`,
    `surface_type=${surfaceType}`,
    `substrate_type=${substrateType}`,
    `substrate_preparation_system=${substratePreparationSystem}`,
    "substrate_load_bearing_dry_clean_confirmed=true",
    "dry_interior_no_permanent_humidity_confirmed=true",
    "application_temperature_confirmed=true",
    "ct126_tds_variant_confirmed=true",
    `selected_bag_size_kg=${selectedBagSizeKg}`,
    `formula=area_m2*layer_thickness_mm*${consumptionRate}`,
    `net_quantity_kg=${calculatedCt126NetQuantityKg}`,
    `bag_count=${calculatedCt126BagCount}`,
    `procurement_quantity_kg=${calculatedCt126ProcurementQuantityKg}`,
    "additional_waste_percent=0",
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    material_consumption_kg_m2_mm: {
      value: consumptionRate,
      unit_id: "kg_per_m2_mm",
      source_type: "APPLICABLE_NORM" as const,
      source_id: CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
    putty_procurement_quantity_kg: {
      value: calculatedCt126ProcurementQuantityKg,
      unit_id: "kg",
      source_type: "APPLICABLE_NORM" as const,
      source_id: CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_ID,
    norm_id: CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_NORM_ID,
    source_document_version:
      CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_METADATA.source_document_version,
    source_url: CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_METADATA.source_url,
    exact_locator: CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_METADATA.exact_locator,
    source_definition_hash: CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["material_consumption_kg_m2_mm", "putty_procurement_quantity_kg"] as const,
    calculated_ct126_net_quantity_kg: calculatedCt126NetQuantityKg,
    calculated_ct126_procurement_quantity_kg: calculatedCt126ProcurementQuantityKg,
    calculated_ct126_bag_count: calculatedCt126BagCount,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveCeresitCt127DryInteriorFinishPutty(
  productProfileId: typeof CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(
    CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
      parameterId,
      explicitValue(parameterValuesInput, parameterId),
    ]),
  );
  const missing = CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_REQUIRED_EXPLICIT_PARAMETER_IDS,
      CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA,
    );
  }

  const areaM2 = finiteNumber(explicit.area_m2);
  const layerThicknessMm = finiteNumber(explicit.layer_thickness_mm);
  const selectedConsumptionKgM2 = finiteNumber(explicit.selected_consumption_kg_m2);
  const selectedBagSizeKg = finiteNumber(explicit.selected_bag_size_kg);
  const substrateType = primitiveString(explicit.substrate_type!);
  const substrateAbsorbency = primitiveString(explicit.substrate_absorbency!);
  const substratePreparationSystem = primitiveString(explicit.substrate_preparation_system!);
  const surfaceType = primitiveString(explicit.surface_type!);
  const surfaceTypeBySubstrate: Readonly<Record<string, string>> = Object.freeze({
    cement_plaster: "CEMENT_PLASTER",
    cement_lime_plaster: "CEMENT_PLASTER",
    concrete: "CONCRETE",
    ceresit_ct126: "PROJECT_SPECIFIED",
    gypsum_substrate: "GYPSUM_BOARD",
    gypsum_fibre_board: "GYPSUM_BOARD",
    plasterboard: "GYPSUM_BOARD",
    aerated_concrete: "MASONRY",
    silicate_block: "MASONRY",
    sound_adherent_paint_coat: "PROJECT_SPECIFIED",
  });
  const preparationSystemsBySubstrateAndAbsorbency: Readonly<Record<string, readonly string[]>> =
    Object.freeze({
      "cement_plaster|absorbent": ["CERESIT_IN10", "CERESIT_CT17", "CERESIT_CT7"],
      "cement_lime_plaster|absorbent": ["CERESIT_IN10", "CERESIT_CT17", "CERESIT_CT7"],
      "concrete|absorbent": ["CERESIT_IN10", "CERESIT_CT17", "CERESIT_CT7"],
      "concrete|non_absorbent": ["CERESIT_CT19"],
      "ceresit_ct126|absorbent": ["CERESIT_IN10", "CERESIT_CT17", "CERESIT_CT7"],
      "gypsum_substrate|absorbent": ["CERESIT_IN10", "CERESIT_CT17", "CERESIT_CT7"],
      "gypsum_fibre_board|absorbent": ["CERESIT_IN10", "CERESIT_CT17", "CERESIT_CT7"],
      "plasterboard|absorbent": ["CERESIT_IN10", "CERESIT_CT17", "CERESIT_CT7"],
      "aerated_concrete|very_absorbent": ["CERESIT_IN10", "CERESIT_CT17"],
      "silicate_block|very_absorbent": ["CERESIT_IN10", "CERESIT_CT17"],
      "sound_adherent_paint_coat|non_absorbent": ["CERESIT_CT19"],
    });
  const preparationKey = `${substrateType}|${substrateAbsorbency}`;
  const documentedPreparationSystems = preparationSystemsBySubstrateAndAbsorbency[preparationKey];
  const [minimumConsumptionKgM2, maximumConsumptionKgM2] =
    CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.rate_range_kg_m2;
  const applicabilityBlockers = [
    areaM2 !== null && areaM2 > 0 ? "" : "PROJECT_VALUE_INVALID:area_m2",
    layerThicknessMm !== null &&
      layerThicknessMm > 0 &&
      layerThicknessMm <= CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.layer_max_mm
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_NORM_ID}:layer_thickness_mm=${layerThicknessMm}`,
    selectedConsumptionKgM2 !== null &&
      selectedConsumptionKgM2 >= minimumConsumptionKgM2 &&
      selectedConsumptionKgM2 <= maximumConsumptionKgM2
      ? ""
      : `PHYSICAL_NORM_PROJECT_RATE_REQUIRED:selected_consumption_kg_m2=${selectedConsumptionKgM2}:published_range=${minimumConsumptionKgM2}-${maximumConsumptionKgM2}`,
    substrateType && surfaceTypeBySubstrate[substrateType]
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_NORM_ID}:substrate_type=${substrateType}`,
    substrateType && surfaceTypeBySubstrate[substrateType] === surfaceType
      ? ""
      : `PHYSICAL_NORM_PROJECT_VALUE_CONFLICT:surface_type=${surfaceType}:substrate_type=${substrateType}`,
    documentedPreparationSystems
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_NORM_ID}:substrate_type=${substrateType}:substrate_absorbency=${substrateAbsorbency}:exact_preparation_mapping_unavailable`,
    documentedPreparationSystems?.includes(substratePreparationSystem ?? "")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_NORM_ID}:substrate_type=${substrateType}:substrate_absorbency=${substrateAbsorbency}:substrate_preparation_system=${substratePreparationSystem}`,
    selectedBagSizeKg === CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.documented_bag_size_kg
      ? ""
      : `PHYSICAL_NORM_VARIANT_CONFLICT:selected_bag_size_kg=${selectedBagSizeKg}:documented_bag_size_kg=${CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.documented_bag_size_kg}`,
    explicitTrue(explicit.substrate_load_bearing_dry_clean_confirmed)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_NORM_ID}:substrate_load_bearing_dry_clean_confirmed=false`,
    explicitTrue(explicit.dry_interior_no_permanent_humidity_confirmed)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_NORM_ID}:dry_interior_no_permanent_humidity_confirmed=false`,
    explicitTrue(explicit.application_temperature_confirmed)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_NORM_ID}:application_temperature_confirmed=false`,
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_REQUIRED_EXPLICIT_PARAMETER_IDS,
      CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA,
    );
  }

  const calculatedCt127NetQuantityKg = Number((areaM2! * selectedConsumptionKgM2!).toFixed(9));
  const calculatedCt127BagCount = Math.ceil(calculatedCt127NetQuantityKg / selectedBagSizeKg! - 1e-9);
  const calculatedCt127ProcurementQuantityKg = Number(
    (calculatedCt127BagCount * selectedBagSizeKg!).toFixed(9),
  );
  const explicitProcurementQuantityKg = finiteNumber(explicitValue(
    parameterValuesInput,
    "putty_procurement_quantity_kg",
  ));
  if (
    explicitProcurementQuantityKg !== null &&
    Math.abs(explicitProcurementQuantityKg - calculatedCt127ProcurementQuantityKg) > 1e-9
  ) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:putty_procurement_quantity_kg=${explicitProcurementQuantityKg}:norm_value=${calculatedCt127ProcurementQuantityKg}`,
      ],
      [
        ...CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_REQUIRED_EXPLICIT_PARAMETER_IDS,
        "putty_procurement_quantity_kg",
      ],
      CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA,
    );
  }

  const capturedAt = CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID}`,
    `tds_identifier=${CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.tds_identifier}`,
    `area_m2=${areaM2}`,
    `layer_thickness_mm=${layerThicknessMm}`,
    `surface_type=${surfaceType}`,
    `substrate_type=${substrateType}`,
    `substrate_absorbency=${substrateAbsorbency}`,
    `substrate_preparation_system=${substratePreparationSystem}`,
    "substrate_load_bearing_dry_clean_confirmed=true",
    "dry_interior_no_permanent_humidity_confirmed=true",
    "application_temperature_confirmed=true",
    `selected_consumption_kg_m2=${selectedConsumptionKgM2}`,
    `selected_bag_size_kg=${selectedBagSizeKg}`,
    `formula=area_m2*selected_consumption_kg_m2`,
    `net_quantity_kg=${calculatedCt127NetQuantityKg}`,
    `bag_count=${calculatedCt127BagCount}`,
    `procurement_quantity_kg=${calculatedCt127ProcurementQuantityKg}`,
    "rate_selection_table_not_published=true",
    "additional_waste_percent=0",
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    putty_procurement_quantity_kg: {
      value: calculatedCt127ProcurementQuantityKg,
      unit_id: "kg",
      source_type: "APPLICABLE_NORM" as const,
      source_id: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_ID,
    norm_id: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_NORM_ID,
    source_document_version:
      CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.source_document_version,
    source_url: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.source_url,
    exact_locator: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.exact_locator,
    source_definition_hash: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["putty_procurement_quantity_kg"] as const,
    calculated_ct127_net_quantity_kg: calculatedCt127NetQuantityKg,
    calculated_ct127_procurement_quantity_kg: calculatedCt127ProcurementQuantityKg,
    calculated_ct127_bag_count: calculatedCt127BagCount,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveCeresitCl51IndoorCeramicWetZone(
  productProfileId: typeof CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(
    CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
      parameterId,
      explicitValue(parameterValuesInput, parameterId),
    ]),
  );
  const missing = CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_REQUIRED_EXPLICIT_PARAMETER_IDS,
      CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA,
    );
  }

  const areaM2 = finiteNumber(explicit.area_m2);
  const coatCount = finiteNumber(explicit.coat_count);
  const installationLocation = primitiveString(explicit.installation_location!);
  const wetZoneType = primitiveString(explicit.wet_zone_type!);
  const substrateType = primitiveString(explicit.substrate_type!);
  const selectedBucketSizeKg = finiteNumber(explicit.selected_bucket_size_kg);
  const applicabilityBlockers = [
    areaM2 !== null && areaM2 > 0 ? "" : "PROJECT_VALUE_INVALID:area_m2",
    coatCount === CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA.coat_count
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_NORM_ID}:coat_count=${coatCount}`,
    installationLocation === "indoor"
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_NORM_ID}:installation_location=${installationLocation}`,
    explicitTrue(explicit.under_ceramic_covering)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_NORM_ID}:under_ceramic_covering=false`,
    wetZoneType && CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA.wet_zones.includes(wetZoneType)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_NORM_ID}:wet_zone_type=${wetZoneType}`,
    substrateType &&
      CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA.documented_substrate_examples.includes(substrateType)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_NORM_ID}:substrate_type=${substrateType}`,
    explicitTrue(explicit.substrate_preparation_confirmed)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_NORM_ID}:substrate_preparation_confirmed=false`,
    explicitTrue(explicit.permanent_water_contact_excluded)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_NORM_ID}:permanent_water_contact_excluded=false`,
    explicitTrue(explicit.rear_surface_moisture_excluded)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_NORM_ID}:rear_surface_moisture_excluded=false`,
    explicitTrue(explicit.chemical_exposure_excluded)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_NORM_ID}:chemical_exposure_excluded=false`,
    selectedBucketSizeKg !== null &&
      CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA.documented_bucket_sizes_kg.includes(
        selectedBucketSizeKg,
      )
      ? ""
      : `PHYSICAL_NORM_VARIANT_CONFLICT:selected_bucket_size_kg=${selectedBucketSizeKg}:documented_bucket_sizes_kg=${CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA.documented_bucket_sizes_kg.join(",")}`,
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_REQUIRED_EXPLICIT_PARAMETER_IDS,
      CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA,
    );
  }

  const minimumNetQuantityKg = Number(
    (areaM2! * CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA.rate_value).toFixed(9),
  );
  const bucketCount = Math.ceil(minimumNetQuantityKg / selectedBucketSizeKg! - 1e-9);
  const procurementQuantityKg = Number((bucketCount * selectedBucketSizeKg!).toFixed(9));
  const explicitProcurementQuantityKg = finiteNumber(explicitValue(
    parameterValuesInput,
    "cl51_procurement_quantity_kg",
  ));
  if (
    explicitProcurementQuantityKg !== null &&
    Math.abs(explicitProcurementQuantityKg - procurementQuantityKg) > 1e-9
  ) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:cl51_procurement_quantity_kg=${explicitProcurementQuantityKg}:norm_value=${procurementQuantityKg}`,
      ],
      [
        ...CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_REQUIRED_EXPLICIT_PARAMETER_IDS,
        "cl51_procurement_quantity_kg",
      ],
      CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA,
    );
  }

  const capturedAt = CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_PRODUCT_PROFILE_ID}`,
    `product=${CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA.product}`,
    `area_m2=${areaM2}`,
    `coat_count=${coatCount}`,
    "installation_location=indoor",
    "under_ceramic_covering=true",
    `wet_zone_type=${wetZoneType}`,
    `substrate_type=${substrateType}`,
    "substrate_preparation_confirmed=true",
    "permanent_water_contact_excluded=true",
    "rear_surface_moisture_excluded=true",
    "chemical_exposure_excluded=true",
    `minimum_dry_film_mm=${CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA.dry_film_min_mm}`,
    `formula=area_m2*${CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA.rate_value}`,
    `minimum_net_quantity_kg=${minimumNetQuantityKg}`,
    `selected_bucket_size_kg=${selectedBucketSizeKg}`,
    `bucket_count=${bucketCount}`,
    `procurement_quantity_kg=${procurementQuantityKg}`,
    "joint_and_penetration_accessories_excluded_from_rate=true",
    "additional_waste_percent=0",
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    cl51_procurement_quantity_kg: {
      value: procurementQuantityKg,
      unit_id: "kg",
      source_type: "APPLICABLE_NORM" as const,
      source_id: CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_ID,
    norm_id: CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_NORM_ID,
    source_document_version:
      CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA.source_document_version,
    source_url: CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA.source_url,
    exact_locator: CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA.exact_locator,
    source_definition_hash: CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["cl51_procurement_quantity_kg"] as const,
    calculated_cl51_minimum_net_quantity_kg: minimumNetQuantityKg,
    calculated_cl51_procurement_quantity_kg: procurementQuantityKg,
    calculated_cl51_bucket_count: bucketCount,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveCeresitCt17FlooringPrimer(
  productProfileId: typeof CERESIT_CN69_GLOBAL_25KG_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(
    CERESIT_CT17_FLOORING_PRIMER_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
      parameterId,
      explicitValue(parameterValuesInput, parameterId),
    ]),
  );
  const missing = CERESIT_CT17_FLOORING_PRIMER_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      CERESIT_CT17_FLOORING_PRIMER_REQUIRED_EXPLICIT_PARAMETER_IDS,
      CERESIT_CT17_FLOORING_PRIMER_SOURCE_METADATA,
    );
  }

  const areaM2 = finiteNumber(explicit.area_m2);
  const cn69SubstrateType = primitiveString(explicit.cn69_substrate_type!);
  const mappedSubstrateType = cn69SubstrateType === "cement_sand_screed"
    ? "screed"
    : cn69SubstrateType === "concrete"
      ? "concrete"
      : null;
  const substrateEvenness = primitiveString(explicit.ct17_substrate_evenness!);
  const substrateAbsorbency = primitiveString(explicit.ct17_substrate_absorbency!);
  const selectedConsumptionLM2 = finiteNumber(explicit.ct17_selected_consumption_l_m2);
  const coatCount = finiteNumber(explicit.ct17_coat_count);
  const selectedContainerSizeL = finiteNumber(explicit.ct17_selected_container_size_l);
  const systemPassportReference = primitiveString(explicit.system_passport_reference!);
  const materialCertificateReference = primitiveString(explicit.material_certificate_reference!);
  const confirmed = (parameterId:
    | "ct17_substrate_dry_load_bearing_clean_confirmed"
    | "ct17_repeat_rule_confirmed"
    | "ct17_additional_waste_not_published_confirmed"
    | "ct17_flooring_tds_confirmed") =>
    explicit[parameterId]!.value === true || explicit[parameterId]!.value === "true";
  const stillAbsorbentAfterDrying =
    explicit.ct17_still_absorbent_after_drying!.value === true ||
    explicit.ct17_still_absorbent_after_drying!.value === "true";
  const explicitlyNotStillAbsorbentAfterDrying =
    explicit.ct17_still_absorbent_after_drying!.value === false ||
    explicit.ct17_still_absorbent_after_drying!.value === "false";
  const [minimumRate, maximumRate] = CERESIT_CT17_FLOORING_PRIMER_SOURCE_METADATA.rate_range_l_m2;
  const applicabilityBlockers = [
    areaM2 !== null && areaM2 > 0 ? "" : "PROJECT_VALUE_INVALID:area_m2",
    mappedSubstrateType !== null &&
      CERESIT_CT17_FLOORING_PRIMER_SOURCE_METADATA.surfaces.includes(mappedSubstrateType)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT17_FLOORING_PRIMER_NORM_ID}:cn69_substrate_type=${cn69SubstrateType}`,
    substrateEvenness !== null && ["even", "locally_uneven"].includes(substrateEvenness)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT17_FLOORING_PRIMER_NORM_ID}:ct17_substrate_evenness=${substrateEvenness}`,
    substrateAbsorbency === "absorbent"
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT17_FLOORING_PRIMER_NORM_ID}:ct17_substrate_absorbency=${substrateAbsorbency}`,
    selectedConsumptionLM2 !== null &&
      selectedConsumptionLM2 >= minimumRate &&
      selectedConsumptionLM2 <= maximumRate
      ? ""
      : `PHYSICAL_NORM_RATE_NOT_APPLICABLE:${CERESIT_CT17_FLOORING_PRIMER_NORM_ID}:ct17_selected_consumption_l_m2=${selectedConsumptionLM2}`,
    coatCount !== null && Number.isInteger(coatCount) && coatCount > 0
      ? ""
      : "PROJECT_VALUE_INVALID:ct17_coat_count",
    confirmed("ct17_substrate_dry_load_bearing_clean_confirmed")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT17_FLOORING_PRIMER_NORM_ID}:ct17_substrate_dry_load_bearing_clean_confirmed=false`,
    selectedContainerSizeL !== null &&
      CERESIT_CT17_FLOORING_PRIMER_SOURCE_METADATA.documented_container_sizes_l.includes(
        selectedContainerSizeL,
      )
      ? ""
      : `PHYSICAL_NORM_PACKAGE_NOT_APPLICABLE:ct17_selected_container_size_l=${selectedContainerSizeL}`,
    stillAbsorbentAfterDrying || explicitlyNotStillAbsorbentAfterDrying
      ? ""
      : "PROJECT_VALUE_INVALID:ct17_still_absorbent_after_drying",
    stillAbsorbentAfterDrying && coatCount !== null && coatCount < 2
      ? `PHYSICAL_NORM_COAT_COUNT_CONFLICT:ct17_coat_count=${coatCount}:still_absorbent_after_drying=true`
      : "",
    explicitlyNotStillAbsorbentAfterDrying && coatCount !== 1
      ? `PHYSICAL_NORM_COAT_COUNT_CONFLICT:ct17_coat_count=${coatCount}:still_absorbent_after_drying=false`
      : "",
    confirmed("ct17_repeat_rule_confirmed")
      ? ""
      : `PHYSICAL_NORM_REPEAT_RULE_NOT_CONFIRMED:${CERESIT_CT17_FLOORING_PRIMER_NORM_ID}`,
    confirmed("ct17_additional_waste_not_published_confirmed")
      ? ""
      : `PHYSICAL_NORM_WASTE_POLICY_NOT_CONFIRMED:${CERESIT_CT17_FLOORING_PRIMER_NORM_ID}`,
    confirmed("ct17_flooring_tds_confirmed")
      ? ""
      : `PHYSICAL_NORM_VARIANT_NOT_CONFIRMED:${CERESIT_CT17_FLOORING_PRIMER_NORM_ID}`,
    systemPassportReference !== null && systemPassportReference.length > 0
      ? ""
      : "PROJECT_VALUE_INVALID:system_passport_reference",
    materialCertificateReference !== null && materialCertificateReference.length > 0
      ? ""
      : "PROJECT_VALUE_INVALID:material_certificate_reference",
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      CERESIT_CT17_FLOORING_PRIMER_REQUIRED_EXPLICIT_PARAMETER_IDS,
      CERESIT_CT17_FLOORING_PRIMER_SOURCE_METADATA,
    );
  }

  const calculatedNetQuantityL = Number(
    (areaM2! * selectedConsumptionLM2! * coatCount!).toFixed(9),
  );
  const calculatedContainerCount = Math.ceil(
    calculatedNetQuantityL / selectedContainerSizeL! - 1e-9,
  );
  const calculatedProcurementQuantityL = Number(
    (calculatedContainerCount * selectedContainerSizeL!).toFixed(9),
  );
  const explicitProcurementQuantityL = finiteNumber(explicitValue(
    parameterValuesInput,
    "ct17_primer_procurement_quantity_l",
  ));
  if (
    explicitProcurementQuantityL !== null &&
    Math.abs(explicitProcurementQuantityL - calculatedProcurementQuantityL) > 1e-9
  ) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:ct17_primer_procurement_quantity_l=${explicitProcurementQuantityL}:norm_value=${calculatedProcurementQuantityL}`,
      ],
      [
        ...CERESIT_CT17_FLOORING_PRIMER_REQUIRED_EXPLICIT_PARAMETER_IDS,
        "ct17_primer_procurement_quantity_l",
      ],
      CERESIT_CT17_FLOORING_PRIMER_SOURCE_METADATA,
    );
  }

  const capturedAt = CERESIT_CT17_FLOORING_PRIMER_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${CERESIT_CN69_GLOBAL_25KG_PRODUCT_PROFILE_ID}`,
    `product=${CERESIT_CT17_FLOORING_PRIMER_SOURCE_METADATA.product}`,
    `tds_identifier=${CERESIT_CT17_FLOORING_PRIMER_SOURCE_METADATA.tds_identifier}`,
    `area_m2=${areaM2}`,
    `substrate_type=${mappedSubstrateType}:canonical(cn69_substrate_type=${cn69SubstrateType})`,
    `substrate_evenness=${substrateEvenness}:canonical(ct17_substrate_evenness)`,
    `substrate_absorbency=${substrateAbsorbency}:canonical(ct17_substrate_absorbency)`,
    `selected_consumption_l_m2=${selectedConsumptionLM2}:canonical(ct17_selected_consumption_l_m2)`,
    `coat_count=${coatCount}:canonical(ct17_coat_count)`,
    "substrate_dry_load_bearing_clean_confirmed=true",
    `still_absorbent_after_drying=${stillAbsorbentAfterDrying}`,
    "repeat_if_still_absorbent_after_drying_confirmed=true",
    `selected_container_size_l=${selectedContainerSizeL}`,
    `formula=area_m2*selected_consumption_l_m2*coat_count`,
    `net_quantity_l=${calculatedNetQuantityL}`,
    `container_count=${calculatedContainerCount}`,
    "additional_waste_percent=0:not_published_by_source",
    `system_passport_reference=${systemPassportReference}`,
    `material_certificate_reference=${materialCertificateReference}`,
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    ct17_primer_procurement_quantity_l: {
      value: calculatedProcurementQuantityL,
      unit_id: "l",
      source_type: "APPLICABLE_NORM" as const,
      source_id: CERESIT_CT17_FLOORING_PRIMER_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: CERESIT_CT17_FLOORING_PRIMER_SOURCE_ID,
    norm_id: CERESIT_CT17_FLOORING_PRIMER_NORM_ID,
    source_document_version: CERESIT_CT17_FLOORING_PRIMER_SOURCE_METADATA.source_document_version,
    source_url: CERESIT_CT17_FLOORING_PRIMER_SOURCE_METADATA.source_url,
    exact_locator: CERESIT_CT17_FLOORING_PRIMER_SOURCE_METADATA.exact_locator,
    source_definition_hash: CERESIT_CT17_FLOORING_PRIMER_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...CERESIT_CT17_FLOORING_PRIMER_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["ct17_primer_procurement_quantity_l"],
    calculated_ct17_primer_net_quantity_l: calculatedNetQuantityL,
    calculated_ct17_primer_procurement_quantity_l: calculatedProcurementQuantityL,
    calculated_ct17_primer_container_count: calculatedContainerCount,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveCeresitCn69FloorSystemProfile(
  productProfileId: typeof CERESIT_CN69_GLOBAL_25KG_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const cn69 = resolveCeresitCn69Global25Kg(productProfileId, parameterValuesInput);
  if (cn69.status !== "APPLIED") return cn69;
  const ct17 = resolveCeresitCt17FlooringPrimer(productProfileId, cn69.parameter_values);
  if (ct17.status !== "APPLIED") return ct17;

  const consumedParameterIds = [
    ...new Set([...cn69.consumed_parameter_ids, ...ct17.consumed_parameter_ids]),
  ];
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: cn69.source_id,
    norm_id: cn69.norm_id,
    source_document_version: cn69.source_document_version,
    source_url: cn69.source_url,
    exact_locator: cn69.exact_locator,
    source_definition_hash: cn69.source_definition_hash,
    source_ids: [cn69.source_id, ct17.source_id],
    norm_ids: [cn69.norm_id, ct17.norm_id],
    applied_norms: [{
      source_id: cn69.source_id,
      norm_id: cn69.norm_id,
      source_document_version: cn69.source_document_version,
      source_url: cn69.source_url,
      exact_locator: cn69.exact_locator,
      source_definition_hash: cn69.source_definition_hash,
      produced_parameter_ids: cn69.produced_parameter_ids,
    }, {
      source_id: ct17.source_id,
      norm_id: ct17.norm_id,
      source_document_version: ct17.source_document_version,
      source_url: ct17.source_url,
      exact_locator: ct17.exact_locator,
      source_definition_hash: ct17.source_definition_hash,
      produced_parameter_ids: ct17.produced_parameter_ids,
    }],
    consumed_parameter_ids: consumedParameterIds,
    produced_parameter_ids: [
      "material_consumption_kg_m2_mm",
      "ct17_primer_procurement_quantity_l",
    ] as const,
    calculated_cn69_net_quantity_kg: cn69.calculated_cn69_net_quantity_kg,
    calculated_cn69_bag_count: cn69.calculated_cn69_bag_count,
    calculated_ct17_primer_net_quantity_l: ct17.calculated_ct17_primer_net_quantity_l,
    calculated_ct17_primer_procurement_quantity_l:
      ct17.calculated_ct17_primer_procurement_quantity_l,
    calculated_ct17_primer_container_count: ct17.calculated_ct17_primer_container_count,
    parameter_values: ct17.parameter_values,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveCeresitCm11SmallCeramicIndoor(
  productProfileId: typeof CERESIT_CM11_SMALL_CERAMIC_INDOOR_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(
    CERESIT_CM11_SMALL_CERAMIC_INDOOR_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
      parameterId,
      explicitValue(parameterValuesInput, parameterId),
    ]),
  );
  const missing = CERESIT_CM11_SMALL_CERAMIC_INDOOR_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      CERESIT_CM11_SMALL_CERAMIC_INDOOR_REQUIRED_EXPLICIT_PARAMETER_IDS,
      CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA,
    );
  }

  const areaM2 = finiteNumber(explicit.area_m2);
  const tileType = primitiveString(explicit.tile_type!);
  const tileSizeCategory = primitiveString(explicit.tile_size_category!);
  const trowelNotchMm = finiteNumber(explicit.trowel_notch_mm);
  const substrateType = primitiveString(explicit.substrate_type!);
  const installationLocation = primitiveString(explicit.installation_location!);
  const installationOrientation = primitiveString(explicit.installation_orientation!);
  const selectedPackageSizeKg = finiteNumber(explicit.selected_package_size_kg);
  const minimumTileBackContactPercent = finiteNumber(explicit.minimum_tile_back_contact_percent);
  const manufacturerTdsReference = primitiveString(explicit.manufacturer_tds_reference!);
  const materialCertificateReference = primitiveString(explicit.material_certificate_reference!);
  const confirmed = (parameterId:
    | "substrate_even_load_bearing_compact_confirmed"
    | "substrate_dry_clean_confirmed"
    | "application_temperature_confirmed"
    | "cm11_global_tds_variant_confirmed") =>
    explicit[parameterId]!.value === true || explicit[parameterId]!.value === "true";
  const explicitlyFalse = (parameterId: "floating_buttering_requirement_confirmed") =>
    explicit[parameterId]!.value === false || explicit[parameterId]!.value === "false";
  const applicabilityBlockers = [
    areaM2 !== null && areaM2 > 0 ? "" : "PROJECT_VALUE_INVALID:area_m2",
    tileType === CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA.tile_type
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CM11_SMALL_CERAMIC_INDOOR_NORM_ID}:tile_type=${tileType}`,
    tileSizeCategory === CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA.tile_size_category
      ? ""
      : `PHYSICAL_NORM_TABLE_PAIR_NOT_APPLICABLE:tile_size_category=${tileSizeCategory}`,
    trowelNotchMm === CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA.trowel_notch_mm
      ? ""
      : `PHYSICAL_NORM_TABLE_PAIR_NOT_APPLICABLE:trowel_notch_mm=${trowelNotchMm}`,
    substrateType === CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA.substrate_type
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CM11_SMALL_CERAMIC_INDOOR_NORM_ID}:substrate_type=${substrateType}`,
    installationLocation === CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA.installation_location
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CM11_SMALL_CERAMIC_INDOOR_NORM_ID}:installation_location=${installationLocation}`,
    installationOrientation === CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA.installation_orientation
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CM11_SMALL_CERAMIC_INDOOR_NORM_ID}:installation_orientation=${installationOrientation}`,
    confirmed("substrate_even_load_bearing_compact_confirmed")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CM11_SMALL_CERAMIC_INDOOR_NORM_ID}:substrate_even_load_bearing_compact_confirmed=false`,
    confirmed("substrate_dry_clean_confirmed")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CM11_SMALL_CERAMIC_INDOOR_NORM_ID}:substrate_dry_clean_confirmed=false`,
    explicitlyFalse("floating_buttering_requirement_confirmed")
      ? ""
      : `PHYSICAL_NORM_TABLE_PAIR_NOT_APPLICABLE:floating_buttering_requirement_confirmed=true`,
    confirmed("application_temperature_confirmed")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CM11_SMALL_CERAMIC_INDOOR_NORM_ID}:application_temperature_confirmed=false`,
    confirmed("cm11_global_tds_variant_confirmed")
      ? ""
      : `PHYSICAL_NORM_VARIANT_NOT_CONFIRMED:${CERESIT_CM11_SMALL_CERAMIC_INDOOR_NORM_ID}`,
    selectedPackageSizeKg === CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA.package_size_kg
      ? ""
      : `PHYSICAL_NORM_VARIANT_CONFLICT:selected_package_size_kg=${selectedPackageSizeKg}:tds_package_size_kg=${CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA.package_size_kg}`,
    minimumTileBackContactPercent ===
      CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA.minimum_tile_back_contact_percent
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CM11_SMALL_CERAMIC_INDOOR_NORM_ID}:minimum_tile_back_contact_percent=${minimumTileBackContactPercent}`,
    manufacturerTdsReference ? "" : "PROJECT_VALUE_REQUIRED_EXPLICIT:manufacturer_tds_reference",
    materialCertificateReference ? "" : "PROJECT_VALUE_REQUIRED_EXPLICIT:material_certificate_reference",
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      CERESIT_CM11_SMALL_CERAMIC_INDOOR_REQUIRED_EXPLICIT_PARAMETER_IDS,
      CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA,
    );
  }

  const selectedConsumptionKgM2 = CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA.rate_value;
  const calculatedNetQuantityKg = Number((areaM2! * selectedConsumptionKgM2).toFixed(9));
  const calculatedProcurementQuantityKg =
    Math.ceil(
      calculatedNetQuantityKg /
        CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA.package_size_kg -
        1e-9,
    ) * CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA.package_size_kg;
  const explicitProcurementQuantityKg = finiteNumber(
    explicitValue(parameterValuesInput, "cm11_adhesive_procurement_quantity_kg"),
  );
  if (
    explicitProcurementQuantityKg !== null &&
    Math.abs(explicitProcurementQuantityKg - calculatedProcurementQuantityKg) > 1e-9
  ) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:cm11_adhesive_procurement_quantity_kg=${explicitProcurementQuantityKg}:norm_value=${calculatedProcurementQuantityKg}`,
      ],
      [
        ...CERESIT_CM11_SMALL_CERAMIC_INDOOR_REQUIRED_EXPLICIT_PARAMETER_IDS,
        "cm11_adhesive_procurement_quantity_kg",
      ],
      CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA,
    );
  }

  const capturedAt = CERESIT_CM11_SMALL_CERAMIC_INDOOR_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${CERESIT_CM11_SMALL_CERAMIC_INDOOR_PRODUCT_PROFILE_ID}`,
    `product=${CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA.product}`,
    `tds_identifier=${CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA.tds_identifier}`,
    `exact_table_pair=${CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA.exact_table_pair}`,
    `area_m2=${areaM2}`,
    `tile_type=${tileType}`,
    `tile_size_category=${tileSizeCategory}`,
    `trowel_notch_mm=${trowelNotchMm}`,
    `substrate_type=${substrateType}`,
    `installation_location=${installationLocation}`,
    `installation_orientation=${installationOrientation}`,
    "substrate_even_load_bearing_compact_confirmed=true",
    "substrate_dry_clean_confirmed=true",
    "floating_buttering_requirement_confirmed=false",
    "application_temperature_confirmed=true",
    "cm11_global_tds_variant_confirmed=true",
    `minimum_tile_back_contact_percent=${minimumTileBackContactPercent}`,
    `selected_consumption_kg_m2=${selectedConsumptionKgM2}`,
    `selected_package_size_kg=${selectedPackageSizeKg}`,
    `formula=ceil((area_m2*selected_consumption_kg_m2)/selected_package_size_kg)*selected_package_size_kg`,
    `net_quantity_kg=${calculatedNetQuantityKg}`,
    `manufacturer_tds_reference=${manufacturerTdsReference}`,
    `material_certificate_reference=${materialCertificateReference}`,
    `additional_waste_not_published=${CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA.additional_waste_not_published}`,
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    cm11_adhesive_procurement_quantity_kg: {
      value: calculatedProcurementQuantityKg,
      unit_id: "kg",
      source_type: "APPLICABLE_NORM" as const,
      source_id: CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_ID,
    norm_id: CERESIT_CM11_SMALL_CERAMIC_INDOOR_NORM_ID,
    source_document_version:
      CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA.source_document_version,
    source_url: CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA.source_url,
    exact_locator: CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA.exact_locator,
    source_definition_hash: CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [
      ...CERESIT_CM11_SMALL_CERAMIC_INDOOR_REQUIRED_EXPLICIT_PARAMETER_IDS,
    ],
    produced_parameter_ids: ["cm11_adhesive_procurement_quantity_kg"],
    calculated_cm11_adhesive_net_quantity_kg: calculatedNetQuantityKg,
    calculated_cm11_adhesive_procurement_quantity_kg: calculatedProcurementQuantityKg,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveCeresitCt17TilePrimer(
  productProfileId: typeof CERESIT_CM11_SMALL_CERAMIC_INDOOR_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(
    CERESIT_CT17_TILE_PRIMER_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
      parameterId,
      explicitValue(parameterValuesInput, parameterId),
    ]),
  );
  const missing = CERESIT_CT17_TILE_PRIMER_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      CERESIT_CT17_TILE_PRIMER_REQUIRED_EXPLICIT_PARAMETER_IDS,
      CERESIT_CT17_TILE_PRIMER_SOURCE_METADATA,
    );
  }

  const areaM2 = finiteNumber(explicit.area_m2);
  const substrateType = primitiveString(explicit.substrate_type!);
  const substrateEvenness = primitiveString(explicit.ct17_tile_substrate_evenness!);
  const substrateAbsorbency = primitiveString(explicit.ct17_tile_substrate_absorbency!);
  const selectedConsumptionLM2 = finiteNumber(explicit.ct17_tile_selected_consumption_l_m2);
  const coatCount = finiteNumber(explicit.ct17_tile_coat_count);
  const cementWaitMinutes = finiteNumber(explicit.ct17_tile_cement_wait_minutes);
  const relativeHumidityPercent = finiteNumber(explicit.ct17_tile_relative_humidity_percent);
  const selectedContainerSizeL = finiteNumber(explicit.ct17_tile_selected_container_size_l);
  const tdsReference = primitiveString(explicit.ct17_tile_tds_reference!);
  const materialCertificateReference = primitiveString(
    explicit.ct17_tile_material_certificate_reference!,
  );
  const confirmed = (parameterId:
    | "substrate_even_load_bearing_compact_confirmed"
    | "substrate_dry_clean_confirmed"
    | "ct17_tile_drying_rule_confirmed"
    | "ct17_tile_application_conditions_confirmed"
    | "ct17_tile_tds_confirmed"
    | "ct17_tile_additional_waste_not_published_confirmed") =>
    explicit[parameterId]!.value === true || explicit[parameterId]!.value === "true";
  const [minimumRate, maximumRate] = CERESIT_CT17_TILE_PRIMER_SOURCE_METADATA.rate_range_l_m2;
  const applicabilityBlockers = [
    areaM2 !== null && areaM2 > 0 ? "" : "PROJECT_VALUE_INVALID:area_m2",
    substrateType === "cement_screed" &&
      CERESIT_CT17_TILE_PRIMER_SOURCE_METADATA.surfaces.includes("screed")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT17_TILE_PRIMER_NORM_ID}:substrate_type=${substrateType}`,
    substrateEvenness !== null && ["even", "locally_uneven"].includes(substrateEvenness)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT17_TILE_PRIMER_NORM_ID}:ct17_tile_substrate_evenness=${substrateEvenness}`,
    substrateAbsorbency === "absorbent"
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT17_TILE_PRIMER_NORM_ID}:ct17_tile_substrate_absorbency=${substrateAbsorbency}`,
    selectedConsumptionLM2 !== null &&
      selectedConsumptionLM2 >= minimumRate &&
      selectedConsumptionLM2 <= maximumRate
      ? ""
      : `PHYSICAL_NORM_RATE_NOT_APPLICABLE:${CERESIT_CT17_TILE_PRIMER_NORM_ID}:ct17_tile_selected_consumption_l_m2=${selectedConsumptionLM2}`,
    coatCount !== null && Number.isInteger(coatCount) && coatCount > 0
      ? ""
      : "PROJECT_VALUE_INVALID:ct17_tile_coat_count",
    confirmed("substrate_even_load_bearing_compact_confirmed") &&
      confirmed("substrate_dry_clean_confirmed")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT17_TILE_PRIMER_NORM_ID}:substrate_dry_load_bearing_clean_confirmed=false`,
    confirmed("ct17_tile_drying_rule_confirmed")
      ? ""
      : `PHYSICAL_NORM_DRYING_RULE_NOT_CONFIRMED:${CERESIT_CT17_TILE_PRIMER_NORM_ID}`,
    cementWaitMinutes === CERESIT_CT17_TILE_PRIMER_SOURCE_METADATA.cement_wait_minutes
      ? ""
      : `PHYSICAL_NORM_DRYING_TIME_NOT_APPLICABLE:ct17_tile_cement_wait_minutes=${cementWaitMinutes}`,
    confirmed("ct17_tile_application_conditions_confirmed")
      ? ""
      : `PHYSICAL_NORM_APPLICATION_CONDITIONS_NOT_CONFIRMED:${CERESIT_CT17_TILE_PRIMER_NORM_ID}`,
    relativeHumidityPercent !== null &&
      relativeHumidityPercent >= 0 &&
      relativeHumidityPercent <=
        CERESIT_CT17_TILE_PRIMER_SOURCE_METADATA.application_relative_humidity_max_percent
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT17_TILE_PRIMER_NORM_ID}:ct17_tile_relative_humidity_percent=${relativeHumidityPercent}`,
    selectedContainerSizeL !== null &&
      CERESIT_CT17_TILE_PRIMER_SOURCE_METADATA.documented_container_sizes_l.includes(
        selectedContainerSizeL,
      )
      ? ""
      : `PHYSICAL_NORM_PACKAGE_NOT_APPLICABLE:ct17_tile_selected_container_size_l=${selectedContainerSizeL}`,
    confirmed("ct17_tile_tds_confirmed")
      ? ""
      : `PHYSICAL_NORM_VARIANT_NOT_CONFIRMED:${CERESIT_CT17_TILE_PRIMER_NORM_ID}`,
    confirmed("ct17_tile_additional_waste_not_published_confirmed")
      ? ""
      : `PHYSICAL_NORM_WASTE_POLICY_NOT_CONFIRMED:${CERESIT_CT17_TILE_PRIMER_NORM_ID}`,
    tdsReference ? "" : "PROJECT_VALUE_INVALID:ct17_tile_tds_reference",
    materialCertificateReference
      ? ""
      : "PROJECT_VALUE_INVALID:ct17_tile_material_certificate_reference",
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      CERESIT_CT17_TILE_PRIMER_REQUIRED_EXPLICIT_PARAMETER_IDS,
      CERESIT_CT17_TILE_PRIMER_SOURCE_METADATA,
    );
  }

  const calculatedNetQuantityL = Number(
    (areaM2! * selectedConsumptionLM2! * coatCount!).toFixed(9),
  );
  const calculatedContainerCount = Math.ceil(
    calculatedNetQuantityL / selectedContainerSizeL! - 1e-9,
  );
  const calculatedProcurementQuantityL = Number(
    (calculatedContainerCount * selectedContainerSizeL!).toFixed(9),
  );
  const explicitProcurementQuantityL = finiteNumber(explicitValue(
    parameterValuesInput,
    "ct17_tile_primer_procurement_quantity_l",
  ));
  if (
    explicitProcurementQuantityL !== null &&
    Math.abs(explicitProcurementQuantityL - calculatedProcurementQuantityL) > 1e-9
  ) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:ct17_tile_primer_procurement_quantity_l=${explicitProcurementQuantityL}:norm_value=${calculatedProcurementQuantityL}`,
      ],
      [
        ...CERESIT_CT17_TILE_PRIMER_REQUIRED_EXPLICIT_PARAMETER_IDS,
        "ct17_tile_primer_procurement_quantity_l",
      ],
      CERESIT_CT17_TILE_PRIMER_SOURCE_METADATA,
    );
  }

  const capturedAt = CERESIT_CT17_TILE_PRIMER_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${CERESIT_CM11_SMALL_CERAMIC_INDOOR_PRODUCT_PROFILE_ID}`,
    `product=${CERESIT_CT17_TILE_PRIMER_SOURCE_METADATA.product}`,
    `tds_identifier=${CERESIT_CT17_TILE_PRIMER_SOURCE_METADATA.tds_identifier}`,
    `area_m2=${areaM2}`,
    `substrate_type=screed:canonical(substrate_type=${substrateType})`,
    `substrate_evenness=${substrateEvenness}:canonical(ct17_tile_substrate_evenness)`,
    `substrate_absorbency=${substrateAbsorbency}:canonical(ct17_tile_substrate_absorbency)`,
    `selected_consumption_l_m2=${selectedConsumptionLM2}:canonical(ct17_tile_selected_consumption_l_m2)`,
    `coat_count=${coatCount}:canonical(ct17_tile_coat_count)`,
    "substrate_dry_load_bearing_clean_confirmed=true",
    `cement_or_cement_lime_before_tile_wait_minutes=${cementWaitMinutes}`,
    "drying_rule_confirmed=true",
    `application_temperature_c=${CERESIT_CT17_TILE_PRIMER_SOURCE_METADATA.application_temperature_min_c}-${CERESIT_CT17_TILE_PRIMER_SOURCE_METADATA.application_temperature_max_c}`,
    `application_relative_humidity_percent=${relativeHumidityPercent}`,
    `selected_container_size_l=${selectedContainerSizeL}`,
    `formula=area_m2*selected_consumption_l_m2*coat_count`,
    `net_quantity_l=${calculatedNetQuantityL}`,
    `container_count=${calculatedContainerCount}`,
    "additional_waste_percent=0:not_published_by_source",
    `tds_reference=${tdsReference}`,
    `material_certificate_reference=${materialCertificateReference}`,
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    ct17_tile_primer_procurement_quantity_l: {
      value: calculatedProcurementQuantityL,
      unit_id: "l",
      source_type: "APPLICABLE_NORM" as const,
      source_id: CERESIT_CT17_TILE_PRIMER_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: CERESIT_CT17_TILE_PRIMER_SOURCE_ID,
    norm_id: CERESIT_CT17_TILE_PRIMER_NORM_ID,
    source_document_version: CERESIT_CT17_TILE_PRIMER_SOURCE_METADATA.source_document_version,
    source_url: CERESIT_CT17_TILE_PRIMER_SOURCE_METADATA.source_url,
    exact_locator: CERESIT_CT17_TILE_PRIMER_SOURCE_METADATA.exact_locator,
    source_definition_hash: CERESIT_CT17_TILE_PRIMER_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...CERESIT_CT17_TILE_PRIMER_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["ct17_tile_primer_procurement_quantity_l"],
    calculated_ct17_tile_primer_net_quantity_l: calculatedNetQuantityL,
    calculated_ct17_tile_primer_procurement_quantity_l: calculatedProcurementQuantityL,
    calculated_ct17_tile_primer_container_count: calculatedContainerCount,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveCeresitCm11TileSystemProfile(
  productProfileId: typeof CERESIT_CM11_SMALL_CERAMIC_INDOOR_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const cm11 = resolveCeresitCm11SmallCeramicIndoor(productProfileId, parameterValuesInput);
  if (cm11.status !== "APPLIED") return cm11;
  const ct17 = resolveCeresitCt17TilePrimer(productProfileId, cm11.parameter_values);
  if (ct17.status !== "APPLIED") return ct17;

  const consumedParameterIds = [
    ...new Set([...cm11.consumed_parameter_ids, ...ct17.consumed_parameter_ids]),
  ];
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: cm11.source_id,
    norm_id: cm11.norm_id,
    source_document_version: cm11.source_document_version,
    source_url: cm11.source_url,
    exact_locator: cm11.exact_locator,
    source_definition_hash: cm11.source_definition_hash,
    source_ids: [cm11.source_id, ct17.source_id],
    norm_ids: [cm11.norm_id, ct17.norm_id],
    applied_norms: [{
      source_id: cm11.source_id,
      norm_id: cm11.norm_id,
      source_document_version: cm11.source_document_version,
      source_url: cm11.source_url,
      exact_locator: cm11.exact_locator,
      source_definition_hash: cm11.source_definition_hash,
      produced_parameter_ids: cm11.produced_parameter_ids,
    }, {
      source_id: ct17.source_id,
      norm_id: ct17.norm_id,
      source_document_version: ct17.source_document_version,
      source_url: ct17.source_url,
      exact_locator: ct17.exact_locator,
      source_definition_hash: ct17.source_definition_hash,
      produced_parameter_ids: ct17.produced_parameter_ids,
    }],
    consumed_parameter_ids: consumedParameterIds,
    produced_parameter_ids: [
      "cm11_adhesive_procurement_quantity_kg",
      "ct17_tile_primer_procurement_quantity_l",
    ] as const,
    calculated_cm11_adhesive_net_quantity_kg: cm11.calculated_cm11_adhesive_net_quantity_kg,
    calculated_cm11_adhesive_procurement_quantity_kg:
      cm11.calculated_cm11_adhesive_procurement_quantity_kg,
    calculated_ct17_tile_primer_net_quantity_l:
      ct17.calculated_ct17_tile_primer_net_quantity_l,
    calculated_ct17_tile_primer_procurement_quantity_l:
      ct17.calculated_ct17_tile_primer_procurement_quantity_l,
    calculated_ct17_tile_primer_container_count:
      ct17.calculated_ct17_tile_primer_container_count,
    parameter_values: ct17.parameter_values,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveCeresitCt54InteriorWallPaint(
  productProfileId: typeof CERESIT_CT54_CT17_INTERIOR_WALL_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(CERESIT_CT54_REQUIRED_EXPLICIT_PARAMETER_IDS.map(
    (parameterId) => [parameterId, explicitValue(parameterValuesInput, parameterId)],
  ));
  const missing = CERESIT_CT54_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      CERESIT_CT54_REQUIRED_EXPLICIT_PARAMETER_IDS,
      CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA,
    );
  }

  const areaM2 = finiteNumber(explicit.area_m2);
  const selectedPaintProduct = primitiveString(explicit.selected_paint_product!);
  const coatCount = finiteNumber(explicit.ct54_coat_count);
  const substrateType = primitiveString(explicit.ct54_substrate_type!);
  const substrateAbsorption = primitiveString(explicit.ct54_substrate_absorption!);
  const substrateSmoothness = primitiveString(explicit.ct54_substrate_smoothness!);
  const installationLocation = primitiveString(explicit.ct54_installation_location!);
  const intercoatBreakHours = finiteNumber(explicit.ct54_intercoat_break_hours);
  const applicationTemperatureC = finiteNumber(explicit.ct54_application_temperature_c);
  const relativeHumidityPercent = finiteNumber(explicit.ct54_relative_humidity_percent);
  const selectedContainerSizeL = finiteNumber(explicit.ct54_selected_container_size_l);
  const tdsReference = primitiveString(explicit.ct54_tds_reference!);
  const materialCertificateReference = primitiveString(explicit.ct54_material_certificate_reference!);
  const applicabilityBlockers = [
    areaM2 !== null && areaM2 > 0 ? "" : "PROJECT_VALUE_INVALID:area_m2",
    selectedPaintProduct === CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA.product
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT54_INTERIOR_WALL_NORM_ID}:selected_paint_product=${selectedPaintProduct}`,
    coatCount === CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA.coat_count
      ? ""
      : `PHYSICAL_NORM_COAT_COUNT_CONFLICT:ct54_coat_count=${coatCount}:source_coat_count=${CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA.coat_count}`,
    (CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA.surfaces as readonly string[]).includes(substrateType ?? "")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT54_INTERIOR_WALL_NORM_ID}:ct54_substrate_type=${substrateType}`,
    substrateAbsorption !== null && ["low", "normal", "high"].includes(substrateAbsorption)
      ? ""
      : "PROJECT_VALUE_INVALID:ct54_substrate_absorption",
    substrateSmoothness !== null && ["smooth", "slightly_textured", "textured"].includes(substrateSmoothness)
      ? ""
      : "PROJECT_VALUE_INVALID:ct54_substrate_smoothness",
    explicitTrue(explicit.ct54_substrate_carrying_smooth_dry_clean_confirmed)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT54_INTERIOR_WALL_NORM_ID}:ct54_substrate_carrying_smooth_dry_clean_confirmed=false`,
    installationLocation === "indoor"
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT54_INTERIOR_WALL_NORM_ID}:ct54_installation_location=${installationLocation}`,
    intercoatBreakHours !== null &&
      intercoatBreakHours >= CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA.minimum_intercoat_break_hours
      ? ""
      : `PHYSICAL_NORM_INTERCOAT_BREAK_TOO_SHORT:ct54_intercoat_break_hours=${intercoatBreakHours}`,
    explicitTrue(explicit.ct54_application_conditions_confirmed)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT54_INTERIOR_WALL_NORM_ID}:ct54_application_conditions_confirmed=false`,
    applicationTemperatureC !== null &&
      applicationTemperatureC >= CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA.application_temperature_min_c &&
      applicationTemperatureC <= CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA.application_temperature_max_c
      ? ""
      : `PHYSICAL_NORM_TEMPERATURE_NOT_APPLICABLE:ct54_application_temperature_c=${applicationTemperatureC}`,
    relativeHumidityPercent !== null &&
      relativeHumidityPercent >= 0 &&
      relativeHumidityPercent < CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA.application_relative_humidity_max_percent_exclusive
      ? ""
      : `PHYSICAL_NORM_HUMIDITY_NOT_APPLICABLE:ct54_relative_humidity_percent=${relativeHumidityPercent}`,
    explicitFalse(explicit.ct54_facade_rain_protection_confirmed)
      ? ""
      : `PHYSICAL_NORM_LOCATION_CONFLICT:ct54_facade_rain_protection_confirmed=true:installation_location=indoor`,
    explicitTrue(explicit.ct54_tds_variant_confirmed)
      ? ""
      : `PHYSICAL_NORM_VARIANT_NOT_CONFIRMED:${CERESIT_CT54_INTERIOR_WALL_NORM_ID}`,
    explicitTrue(explicit.ct54_project_average_rate_confirmed)
      ? ""
      : `PHYSICAL_NORM_APPROXIMATE_RATE_NOT_ACCEPTED:${CERESIT_CT54_INTERIOR_WALL_NORM_ID}`,
    selectedContainerSizeL !== null &&
      (CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA.documented_container_sizes_l as readonly number[])
        .includes(selectedContainerSizeL)
      ? ""
      : `PHYSICAL_NORM_PACKAGE_NOT_APPLICABLE:ct54_selected_container_size_l=${selectedContainerSizeL}`,
    explicitTrue(explicit.ct54_additional_waste_not_published_confirmed)
      ? ""
      : `PHYSICAL_NORM_WASTE_POLICY_NOT_CONFIRMED:${CERESIT_CT54_INTERIOR_WALL_NORM_ID}`,
    tdsReference ? "" : "PROJECT_VALUE_INVALID:ct54_tds_reference",
    materialCertificateReference ? "" : "PROJECT_VALUE_INVALID:ct54_material_certificate_reference",
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      CERESIT_CT54_REQUIRED_EXPLICIT_PARAMETER_IDS,
      CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA,
    );
  }

  const calculatedNetQuantityL = Number(
    (areaM2! * CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA.rate_value).toFixed(9),
  );
  const calculatedContainerCount = Math.ceil(calculatedNetQuantityL / selectedContainerSizeL! - 1e-9);
  const calculatedProcurementQuantityL = Number((calculatedContainerCount * selectedContainerSizeL!).toFixed(9));
  const explicitProcurementQuantityL = finiteNumber(explicitValue(
    parameterValuesInput,
    "ct54_paint_procurement_quantity_l",
  ));
  if (explicitProcurementQuantityL !== null &&
      Math.abs(explicitProcurementQuantityL - calculatedProcurementQuantityL) > 1e-9) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [`PHYSICAL_NORM_VALUE_CONFLICT:ct54_paint_procurement_quantity_l=${explicitProcurementQuantityL}:norm_value=${calculatedProcurementQuantityL}`],
      [...CERESIT_CT54_REQUIRED_EXPLICIT_PARAMETER_IDS, "ct54_paint_procurement_quantity_l"],
      CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA,
    );
  }

  const capturedAt = CERESIT_CT54_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${productProfileId}`,
    `product=${selectedPaintProduct}`,
    `tds_identifier=${CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA.tds_identifier}`,
    `area_m2=${areaM2}`,
    `coat_count=${coatCount}`,
    `substrate_type=${substrateType}`,
    `substrate_absorption=${substrateAbsorption}`,
    `substrate_smoothness=${substrateSmoothness}`,
    `installation_location=${installationLocation}`,
    `intercoat_break_hours=${intercoatBreakHours}`,
    `application_temperature_c=${applicationTemperatureC}`,
    `relative_humidity_percent=${relativeHumidityPercent}`,
    `project_average_rate_l_m2=${CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA.rate_value}:explicitly_accepted`,
    `formula=area_m2*${CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA.rate_value}`,
    `net_quantity_l=${calculatedNetQuantityL}`,
    `container_count=${calculatedContainerCount}`,
    "additional_waste_percent=0:not_published_by_source",
    `ct54_tds_reference=${tdsReference}`,
    `ct54_material_certificate_reference=${materialCertificateReference}`,
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    ct54_paint_procurement_quantity_l: {
      value: calculatedProcurementQuantityL,
      unit_id: "l",
      source_type: "APPLICABLE_NORM" as const,
      source_id: CERESIT_CT54_INTERIOR_WALL_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: CERESIT_CT54_INTERIOR_WALL_SOURCE_ID,
    norm_id: CERESIT_CT54_INTERIOR_WALL_NORM_ID,
    source_document_version: CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA.source_document_version,
    source_url: CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA.source_url,
    exact_locator: CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA.exact_locator,
    source_definition_hash: CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...CERESIT_CT54_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["ct54_paint_procurement_quantity_l"],
    calculated_ct54_paint_net_quantity_l: calculatedNetQuantityL,
    calculated_ct54_paint_procurement_quantity_l: calculatedProcurementQuantityL,
    calculated_ct54_paint_container_count: calculatedContainerCount,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveCeresitCt17PaintPrimer(
  productProfileId: typeof CERESIT_CT54_CT17_INTERIOR_WALL_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(CERESIT_CT17_PAINT_REQUIRED_EXPLICIT_PARAMETER_IDS.map(
    (parameterId) => [parameterId, explicitValue(parameterValuesInput, parameterId)],
  ));
  const missing = CERESIT_CT17_PAINT_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      CERESIT_CT17_PAINT_REQUIRED_EXPLICIT_PARAMETER_IDS,
      CERESIT_CT17_PAINT_PRIMER_SOURCE_METADATA,
    );
  }

  const areaM2 = finiteNumber(explicit.area_m2);
  const selectedPrimerProduct = primitiveString(explicit.selected_primer_product!);
  const substrateType = primitiveString(explicit.ct17_paint_substrate_type!);
  const substrateEvenness = primitiveString(explicit.ct17_paint_substrate_evenness!);
  const substrateAbsorbency = primitiveString(explicit.ct17_paint_substrate_absorbency!);
  const selectedConsumptionLM2 = finiteNumber(explicit.ct17_paint_selected_consumption_l_m2);
  const dilutionRatio = primitiveString(explicit.ct17_paint_dilution_ratio!);
  const coatCount = finiteNumber(explicit.ct17_paint_coat_count);
  const applicationTemperatureC = finiteNumber(explicit.ct17_paint_application_temperature_c);
  const relativeHumidityPercent = finiteNumber(explicit.ct17_paint_relative_humidity_percent);
  const selectedContainerSizeL = finiteNumber(explicit.ct17_paint_selected_container_size_l);
  const tdsReference = primitiveString(explicit.ct17_paint_tds_reference!);
  const materialCertificateReference = primitiveString(explicit.ct17_paint_material_certificate_reference!);
  const [minimumRate, maximumRate] = CERESIT_CT17_PAINT_PRIMER_SOURCE_METADATA.rate_range_l_m2;
  const applicabilityBlockers = [
    areaM2 !== null && areaM2 > 0 ? "" : "PROJECT_VALUE_INVALID:area_m2",
    selectedPrimerProduct === CERESIT_CT17_PAINT_PRIMER_SOURCE_METADATA.product
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT17_PAINT_PRIMER_NORM_ID}:selected_primer_product=${selectedPrimerProduct}`,
    (CERESIT_CT17_PAINT_PRIMER_SOURCE_METADATA.surfaces as readonly string[]).includes(substrateType ?? "")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT17_PAINT_PRIMER_NORM_ID}:ct17_paint_substrate_type=${substrateType}`,
    substrateEvenness !== null && ["even", "locally_uneven"].includes(substrateEvenness)
      ? ""
      : "PROJECT_VALUE_INVALID:ct17_paint_substrate_evenness",
    substrateAbsorbency === "absorbent"
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT17_PAINT_PRIMER_NORM_ID}:ct17_paint_substrate_absorbency=${substrateAbsorbency}`,
    selectedConsumptionLM2 !== null && selectedConsumptionLM2 >= minimumRate && selectedConsumptionLM2 <= maximumRate
      ? ""
      : `PHYSICAL_NORM_RATE_NOT_APPLICABLE:${CERESIT_CT17_PAINT_PRIMER_NORM_ID}:ct17_paint_selected_consumption_l_m2=${selectedConsumptionLM2}`,
    (CERESIT_CT17_PAINT_PRIMER_SOURCE_METADATA.painting_dilution_options as readonly string[])
      .includes(dilutionRatio ?? "")
      ? ""
      : `PHYSICAL_NORM_DILUTION_NOT_APPLICABLE:ct17_paint_dilution_ratio=${dilutionRatio}`,
    coatCount !== null && Number.isInteger(coatCount) && coatCount > 0
      ? ""
      : "PROJECT_VALUE_INVALID:ct17_paint_coat_count",
    explicitTrue(explicit.ct17_paint_substrate_dry_load_bearing_clean_confirmed)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT17_PAINT_PRIMER_NORM_ID}:ct17_paint_substrate_dry_load_bearing_clean_confirmed=false`,
    explicitTrue(explicit.ct17_paint_complete_drying_confirmed)
      ? ""
      : `PHYSICAL_NORM_DRYING_NOT_CONFIRMED:${CERESIT_CT17_PAINT_PRIMER_NORM_ID}`,
    explicitTrue(explicit.ct17_paint_application_conditions_confirmed)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${CERESIT_CT17_PAINT_PRIMER_NORM_ID}:ct17_paint_application_conditions_confirmed=false`,
    applicationTemperatureC !== null &&
      applicationTemperatureC >= CERESIT_CT17_PAINT_PRIMER_SOURCE_METADATA.application_temperature_min_c &&
      applicationTemperatureC <= CERESIT_CT17_PAINT_PRIMER_SOURCE_METADATA.application_temperature_max_c
      ? ""
      : `PHYSICAL_NORM_TEMPERATURE_NOT_APPLICABLE:ct17_paint_application_temperature_c=${applicationTemperatureC}`,
    relativeHumidityPercent !== null && relativeHumidityPercent >= 0 &&
      relativeHumidityPercent < CERESIT_CT17_PAINT_PRIMER_SOURCE_METADATA.application_relative_humidity_max_percent_exclusive
      ? ""
      : `PHYSICAL_NORM_HUMIDITY_NOT_APPLICABLE:ct17_paint_relative_humidity_percent=${relativeHumidityPercent}`,
    selectedContainerSizeL !== null &&
      (CERESIT_CT17_PAINT_PRIMER_SOURCE_METADATA.documented_container_sizes_l as readonly number[])
        .includes(selectedContainerSizeL)
      ? ""
      : `PHYSICAL_NORM_PACKAGE_NOT_APPLICABLE:ct17_paint_selected_container_size_l=${selectedContainerSizeL}`,
    explicitTrue(explicit.ct17_paint_additional_waste_not_published_confirmed)
      ? ""
      : `PHYSICAL_NORM_WASTE_POLICY_NOT_CONFIRMED:${CERESIT_CT17_PAINT_PRIMER_NORM_ID}`,
    explicitTrue(explicit.ct17_paint_tds_confirmed)
      ? ""
      : `PHYSICAL_NORM_VARIANT_NOT_CONFIRMED:${CERESIT_CT17_PAINT_PRIMER_NORM_ID}`,
    tdsReference ? "" : "PROJECT_VALUE_INVALID:ct17_paint_tds_reference",
    materialCertificateReference ? "" : "PROJECT_VALUE_INVALID:ct17_paint_material_certificate_reference",
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      CERESIT_CT17_PAINT_REQUIRED_EXPLICIT_PARAMETER_IDS,
      CERESIT_CT17_PAINT_PRIMER_SOURCE_METADATA,
    );
  }

  const calculatedNetQuantityL = Number((areaM2! * selectedConsumptionLM2! * coatCount!).toFixed(9));
  const calculatedContainerCount = Math.ceil(calculatedNetQuantityL / selectedContainerSizeL! - 1e-9);
  const calculatedProcurementQuantityL = Number((calculatedContainerCount * selectedContainerSizeL!).toFixed(9));
  const explicitProcurementQuantityL = finiteNumber(explicitValue(
    parameterValuesInput,
    "ct17_paint_primer_procurement_quantity_l",
  ));
  if (explicitProcurementQuantityL !== null &&
      Math.abs(explicitProcurementQuantityL - calculatedProcurementQuantityL) > 1e-9) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [`PHYSICAL_NORM_VALUE_CONFLICT:ct17_paint_primer_procurement_quantity_l=${explicitProcurementQuantityL}:norm_value=${calculatedProcurementQuantityL}`],
      [...CERESIT_CT17_PAINT_REQUIRED_EXPLICIT_PARAMETER_IDS, "ct17_paint_primer_procurement_quantity_l"],
      CERESIT_CT17_PAINT_PRIMER_SOURCE_METADATA,
    );
  }

  const capturedAt = CERESIT_CT17_PAINT_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${productProfileId}`,
    `product=${selectedPrimerProduct}`,
    `tds_identifier=${CERESIT_CT17_PAINT_PRIMER_SOURCE_METADATA.tds_identifier}`,
    `area_m2=${areaM2}`,
    `substrate_type=${substrateType}`,
    `substrate_evenness=${substrateEvenness}`,
    `substrate_absorbency=${substrateAbsorbency}`,
    `selected_consumption_l_m2=${selectedConsumptionLM2}`,
    `dilution_ratio=${dilutionRatio}`,
    `coat_count=${coatCount}`,
    `application_temperature_c=${applicationTemperatureC}`,
    `relative_humidity_percent=${relativeHumidityPercent}`,
    `formula=area_m2*selected_consumption_l_m2*coat_count`,
    `net_quantity_l=${calculatedNetQuantityL}`,
    `container_count=${calculatedContainerCount}`,
    "additional_waste_percent=0:not_published_by_source",
    `ct17_paint_tds_reference=${tdsReference}`,
    `ct17_paint_material_certificate_reference=${materialCertificateReference}`,
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    ct17_paint_primer_procurement_quantity_l: {
      value: calculatedProcurementQuantityL,
      unit_id: "l",
      source_type: "APPLICABLE_NORM" as const,
      source_id: CERESIT_CT17_PAINT_PRIMER_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: CERESIT_CT17_PAINT_PRIMER_SOURCE_ID,
    norm_id: CERESIT_CT17_PAINT_PRIMER_NORM_ID,
    source_document_version: CERESIT_CT17_PAINT_PRIMER_SOURCE_METADATA.source_document_version,
    source_url: CERESIT_CT17_PAINT_PRIMER_SOURCE_METADATA.source_url,
    exact_locator: CERESIT_CT17_PAINT_PRIMER_SOURCE_METADATA.exact_locator,
    source_definition_hash: CERESIT_CT17_PAINT_PRIMER_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...CERESIT_CT17_PAINT_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["ct17_paint_primer_procurement_quantity_l"],
    calculated_ct17_paint_primer_net_quantity_l: calculatedNetQuantityL,
    calculated_ct17_paint_primer_procurement_quantity_l: calculatedProcurementQuantityL,
    calculated_ct17_paint_primer_container_count: calculatedContainerCount,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveCeresitCt54Ct17InteriorWallSystem(
  productProfileId: typeof CERESIT_CT54_CT17_INTERIOR_WALL_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const primer = resolveCeresitCt17PaintPrimer(productProfileId, parameterValuesInput);
  if (primer.status !== "APPLIED") return primer;
  const paint = resolveCeresitCt54InteriorWallPaint(productProfileId, primer.parameter_values);
  if (paint.status !== "APPLIED") return paint;
  const consumedParameterIds = [...new Set([
    ...primer.consumed_parameter_ids,
    ...paint.consumed_parameter_ids,
  ])];
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: paint.source_id,
    norm_id: paint.norm_id,
    source_document_version: paint.source_document_version,
    source_url: paint.source_url,
    exact_locator: paint.exact_locator,
    source_definition_hash: paint.source_definition_hash,
    source_ids: [paint.source_id, primer.source_id],
    norm_ids: [paint.norm_id, primer.norm_id],
    applied_norms: [paint, primer].map((resolution) => ({
      source_id: resolution.source_id,
      norm_id: resolution.norm_id,
      source_document_version: resolution.source_document_version,
      source_url: resolution.source_url,
      exact_locator: resolution.exact_locator,
      source_definition_hash: resolution.source_definition_hash,
      produced_parameter_ids: resolution.produced_parameter_ids,
    })),
    consumed_parameter_ids: consumedParameterIds,
    produced_parameter_ids: [
      "ct54_paint_procurement_quantity_l",
      "ct17_paint_primer_procurement_quantity_l",
    ] as const,
    calculated_ct54_paint_net_quantity_l: paint.calculated_ct54_paint_net_quantity_l,
    calculated_ct54_paint_procurement_quantity_l: paint.calculated_ct54_paint_procurement_quantity_l,
    calculated_ct54_paint_container_count: paint.calculated_ct54_paint_container_count,
    calculated_ct17_paint_primer_net_quantity_l: primer.calculated_ct17_paint_primer_net_quantity_l,
    calculated_ct17_paint_primer_procurement_quantity_l:
      primer.calculated_ct17_paint_primer_procurement_quantity_l,
    calculated_ct17_paint_primer_container_count: primer.calculated_ct17_paint_primer_container_count,
    parameter_values: paint.parameter_values,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveForbo232MountingAdhesive(
  productProfileId: typeof FORBO_232_MOUNTING_ADHESIVE_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(FORBO_232_MOUNTING_ADHESIVE_REQUIRED_EXPLICIT_PARAMETER_IDS.map(
    (parameterId) => [parameterId, explicitValue(parameterValuesInput, parameterId)],
  ));
  const missing = FORBO_232_MOUNTING_ADHESIVE_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      FORBO_232_MOUNTING_ADHESIVE_REQUIRED_EXPLICIT_PARAMETER_IDS,
      FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA,
    );
  }

  const skirtingLengthLinearM = finiteNumber(explicit.skirting_length_linear_m);
  const skirtingMaterial = primitiveString(explicit.skirting_material!);
  const substrateType = primitiveString(explicit.substrate_type!);
  const selectedAdhesiveProduct = primitiveString(explicit.selected_adhesive_product!);
  const adhesiveProfileMode = primitiveString(explicit.adhesive_profile_mode!);
  const adhesiveConsumptionMlLinearM = finiteNumber(explicit.adhesive_consumption_ml_linear_m);
  const manufacturerInstructionReference = primitiveString(explicit.manufacturer_instruction_reference!);
  const [minimumConsumption, maximumConsumption] =
    FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA.rate_range_ml_linear_m;
  const flagConfirmed = (parameterId: "substrate_ready_confirmed" | "processing_conditions_confirmed" | "ventilation_fire_controls_confirmed") =>
    explicit[parameterId]!.value === true || explicit[parameterId]!.value === "true";
  const applicabilityBlockers = [
    skirtingLengthLinearM !== null && skirtingLengthLinearM > 0
      ? ""
      : "PROJECT_VALUE_INVALID:skirting_length_linear_m",
    FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA.skirting_materials.includes(skirtingMaterial ?? "")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${FORBO_232_MOUNTING_ADHESIVE_NORM_ID}:skirting_material=${skirtingMaterial}`,
    FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA.substrate_types.includes(substrateType ?? "")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${FORBO_232_MOUNTING_ADHESIVE_NORM_ID}:substrate_type=${substrateType}`,
    selectedAdhesiveProduct === FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA.product
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${FORBO_232_MOUNTING_ADHESIVE_NORM_ID}:selected_adhesive_product=${selectedAdhesiveProduct}`,
    adhesiveProfileMode === "FORBO_EUROCOL_232"
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${FORBO_232_MOUNTING_ADHESIVE_NORM_ID}:adhesive_profile_mode=${adhesiveProfileMode}`,
    adhesiveConsumptionMlLinearM !== null &&
      adhesiveConsumptionMlLinearM >= minimumConsumption &&
      adhesiveConsumptionMlLinearM <= maximumConsumption
      ? ""
      : `PHYSICAL_NORM_RATE_NOT_APPLICABLE:${FORBO_232_MOUNTING_ADHESIVE_NORM_ID}:adhesive_consumption_ml_linear_m=${adhesiveConsumptionMlLinearM}`,
    flagConfirmed("substrate_ready_confirmed")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${FORBO_232_MOUNTING_ADHESIVE_NORM_ID}:substrate_ready_confirmed=false`,
    flagConfirmed("processing_conditions_confirmed")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${FORBO_232_MOUNTING_ADHESIVE_NORM_ID}:processing_conditions_confirmed=false`,
    flagConfirmed("ventilation_fire_controls_confirmed")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${FORBO_232_MOUNTING_ADHESIVE_NORM_ID}:ventilation_fire_controls_confirmed=false`,
    manufacturerInstructionReference ? "" : "PROJECT_VALUE_INVALID:manufacturer_instruction_reference",
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      FORBO_232_MOUNTING_ADHESIVE_REQUIRED_EXPLICIT_PARAMETER_IDS,
      FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA,
    );
  }

  const packageSizeMl = FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA.package_size_ml;
  const rawAdhesiveQuantityMl = skirtingLengthLinearM! * adhesiveConsumptionMlLinearM!;
  const calculatedForboAdhesiveProcurementQuantityMl =
    Math.ceil(rawAdhesiveQuantityMl / packageSizeMl - 1e-9) * packageSizeMl;
  const explicitQuantity = finiteNumber(explicitValue(
    parameterValuesInput,
    "forbo_adhesive_procurement_quantity_ml",
  ));
  if (
    explicitQuantity !== null &&
    Math.abs(explicitQuantity - calculatedForboAdhesiveProcurementQuantityMl) > 1e-9
  ) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:forbo_adhesive_procurement_quantity_ml=${explicitQuantity}:norm_value=${calculatedForboAdhesiveProcurementQuantityMl}`,
      ],
      [
        ...FORBO_232_MOUNTING_ADHESIVE_REQUIRED_EXPLICIT_PARAMETER_IDS,
        "forbo_adhesive_procurement_quantity_ml",
      ],
      FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA,
    );
  }

  const capturedAt = FORBO_232_MOUNTING_ADHESIVE_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${FORBO_232_MOUNTING_ADHESIVE_PRODUCT_PROFILE_ID}`,
    `selected_adhesive_product=${selectedAdhesiveProduct}`,
    `skirting_material=${skirtingMaterial}`,
    `substrate_type=${substrateType}`,
    `skirting_length_linear_m=${skirtingLengthLinearM}`,
    `adhesive_consumption_ml_linear_m=${adhesiveConsumptionMlLinearM}`,
    `manufacturer_instruction_reference=${manufacturerInstructionReference}`,
    "substrate_ready_confirmed=true",
    "processing_conditions_confirmed=true",
    "ventilation_fire_controls_confirmed=true",
    `formula=ceil((skirting_length_linear_m*adhesive_consumption_ml_linear_m)/${packageSizeMl})*${packageSizeMl}`,
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    forbo_adhesive_procurement_quantity_ml: {
      value: calculatedForboAdhesiveProcurementQuantityMl,
      unit_id: "ml",
      source_type: "APPLICABLE_NORM" as const,
      source_id: FORBO_232_MOUNTING_ADHESIVE_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: FORBO_232_MOUNTING_ADHESIVE_SOURCE_ID,
    norm_id: FORBO_232_MOUNTING_ADHESIVE_NORM_ID,
    source_document_version: FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA.source_document_version,
    source_url: FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA.source_url,
    exact_locator: FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA.exact_locator,
    source_definition_hash: FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...FORBO_232_MOUNTING_ADHESIVE_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["forbo_adhesive_procurement_quantity_ml"],
    calculated_forbo_adhesive_procurement_quantity_ml: calculatedForboAdhesiveProcurementQuantityMl,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveGerflor6086Skirting(
  productProfileId: typeof GERFLOR_6086_SKIRTING_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(
    GERFLOR_6086_SKIRTING_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
      parameterId,
      explicitValue(parameterValuesInput, parameterId),
    ]),
  );
  const missing = GERFLOR_6086_SKIRTING_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      GERFLOR_6086_SKIRTING_REQUIRED_EXPLICIT_PARAMETER_IDS,
      GERFLOR_6086_SKIRTING_SOURCE_METADATA,
    );
  }

  const finishedPerimeterLinearM = finiteNumber(explicit.finished_perimeter_linear_m);
  const insideCornerCount = finiteNumber(explicit.inside_corner_count);
  const outsideCornerCount = finiteNumber(explicit.outside_corner_count);
  const selectedSkirtingProduct = primitiveString(explicit.selected_skirting_product!);
  const pieceLengthM = finiteNumber(explicit.gerflor_piece_length_m);
  const cornerCuttingMethodReference = primitiveString(
    explicit.gerflor_corner_cutting_method_reference!,
  );
  const manufacturerInstructionReference = primitiveString(
    explicit.gerflor_manufacturer_instruction_reference!,
  );
  const materialCertificateReference = primitiveString(explicit.material_certificate_reference!);
  const confirmed = (parameterId:
    | "gerflor_packaging_confirmed"
    | "gerflor_corner_allowance_not_assumed_confirmed"
    | "gerflor_installation_surface_prepared_plane_confirmed") =>
    explicit[parameterId]!.value === true || explicit[parameterId]!.value === "true";
  const validCornerCount = (value: number | null) =>
    value !== null && Number.isInteger(value) && value >= 0;
  const applicabilityBlockers = [
    finishedPerimeterLinearM !== null && finishedPerimeterLinearM > 0
      ? ""
      : "PROJECT_VALUE_INVALID:finished_perimeter_linear_m",
    validCornerCount(insideCornerCount) ? "" : "PROJECT_VALUE_INVALID:inside_corner_count",
    validCornerCount(outsideCornerCount) ? "" : "PROJECT_VALUE_INVALID:outside_corner_count",
    selectedSkirtingProduct === "Gerflor Design Skirting 6086"
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${GERFLOR_6086_SKIRTING_NORM_ID}:selected_skirting_product=${selectedSkirtingProduct}`,
    pieceLengthM === GERFLOR_6086_SKIRTING_SOURCE_METADATA.piece_length_m
      ? ""
      : `PHYSICAL_NORM_VARIANT_CONFLICT:gerflor_piece_length_m=${pieceLengthM}:source_piece_length_m=${GERFLOR_6086_SKIRTING_SOURCE_METADATA.piece_length_m}`,
    confirmed("gerflor_packaging_confirmed")
      ? ""
      : `PHYSICAL_NORM_PACKAGING_NOT_CONFIRMED:${GERFLOR_6086_SKIRTING_NORM_ID}`,
    cornerCuttingMethodReference
      ? ""
      : "PROJECT_VALUE_INVALID:gerflor_corner_cutting_method_reference",
    confirmed("gerflor_corner_allowance_not_assumed_confirmed")
      ? ""
      : `PHYSICAL_NORM_CORNER_ALLOWANCE_POLICY_NOT_CONFIRMED:${GERFLOR_6086_SKIRTING_NORM_ID}`,
    confirmed("gerflor_installation_surface_prepared_plane_confirmed")
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${GERFLOR_6086_SKIRTING_NORM_ID}:gerflor_installation_surface_prepared_plane_confirmed=false`,
    manufacturerInstructionReference
      ? ""
      : "PROJECT_VALUE_INVALID:gerflor_manufacturer_instruction_reference",
    materialCertificateReference ? "" : "PROJECT_VALUE_INVALID:material_certificate_reference",
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      GERFLOR_6086_SKIRTING_REQUIRED_EXPLICIT_PARAMETER_IDS,
      GERFLOR_6086_SKIRTING_SOURCE_METADATA,
    );
  }

  const calculatedNetQuantityLinearM = Number(finishedPerimeterLinearM!.toFixed(9));
  const calculatedPieceCount = Math.ceil(
    calculatedNetQuantityLinearM / GERFLOR_6086_SKIRTING_SOURCE_METADATA.piece_length_m - 1e-9,
  );
  const calculatedProcurementQuantityLinearM = Number(
    (calculatedPieceCount * GERFLOR_6086_SKIRTING_SOURCE_METADATA.piece_length_m).toFixed(9),
  );
  const explicitProcurementQuantityLinearM = finiteNumber(explicitValue(
    parameterValuesInput,
    "gerflor_skirting_procurement_quantity_linear_m",
  ));
  if (
    explicitProcurementQuantityLinearM !== null &&
    Math.abs(explicitProcurementQuantityLinearM - calculatedProcurementQuantityLinearM) > 1e-9
  ) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:gerflor_skirting_procurement_quantity_linear_m=${explicitProcurementQuantityLinearM}:norm_value=${calculatedProcurementQuantityLinearM}`,
      ],
      [
        ...GERFLOR_6086_SKIRTING_REQUIRED_EXPLICIT_PARAMETER_IDS,
        "gerflor_skirting_procurement_quantity_linear_m",
      ],
      GERFLOR_6086_SKIRTING_SOURCE_METADATA,
    );
  }

  const capturedAt = GERFLOR_6086_SKIRTING_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${GERFLOR_6086_SKIRTING_PRODUCT_PROFILE_ID}`,
    `product_code=${GERFLOR_6086_SKIRTING_SOURCE_METADATA.product_code}`,
    `selected_skirting_product=${selectedSkirtingProduct}`,
    `finished_perimeter_linear_m=${finishedPerimeterLinearM}`,
    `inside_corner_count=${insideCornerCount}`,
    `outside_corner_count=${outsideCornerCount}`,
    `piece_length_m=${pieceLengthM}`,
    `pieces_per_package=${GERFLOR_6086_SKIRTING_SOURCE_METADATA.pieces_per_package}`,
    `package_length_linear_m=${GERFLOR_6086_SKIRTING_SOURCE_METADATA.package_length_linear_m}`,
    `corner_cutting_method_reference=${cornerCuttingMethodReference}`,
    "corner_allowance_linear_m=0:not_automatically_assumed",
    "installation_surface_prepared_plane_confirmed=true",
    `formula=ceil(finished_perimeter_linear_m/${pieceLengthM})*${pieceLengthM}`,
    `piece_count=${calculatedPieceCount}`,
    `manufacturer_instruction_reference=${manufacturerInstructionReference}`,
    `material_certificate_reference=${materialCertificateReference}`,
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    gerflor_skirting_procurement_quantity_linear_m: {
      value: calculatedProcurementQuantityLinearM,
      unit_id: "linear_m",
      source_type: "APPLICABLE_NORM" as const,
      source_id: GERFLOR_6086_SKIRTING_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: GERFLOR_6086_SKIRTING_SOURCE_ID,
    norm_id: GERFLOR_6086_SKIRTING_NORM_ID,
    source_document_version: GERFLOR_6086_SKIRTING_SOURCE_METADATA.source_document_version,
    source_url: GERFLOR_6086_SKIRTING_SOURCE_METADATA.source_url,
    exact_locator: GERFLOR_6086_SKIRTING_SOURCE_METADATA.exact_locator,
    source_definition_hash: GERFLOR_6086_SKIRTING_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...GERFLOR_6086_SKIRTING_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["gerflor_skirting_procurement_quantity_linear_m"],
    calculated_gerflor_skirting_net_quantity_linear_m: calculatedNetQuantityLinearM,
    calculated_gerflor_skirting_procurement_quantity_linear_m:
      calculatedProcurementQuantityLinearM,
    calculated_gerflor_skirting_piece_count: calculatedPieceCount,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveLegrandP31TrayJointFasteners(
  productProfileId: typeof LEGRAND_P31_TRAY_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(LEGRAND_P31_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
    parameterId,
    explicitValue(parameterValuesInput, parameterId),
  ]));
  const missing = LEGRAND_P31_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      LEGRAND_P31_REQUIRED_EXPLICIT_PARAMETER_IDS,
      LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA,
    );
  }

  const jointCount = finiteNumber(explicit.tray_joint_count);
  const trayWidthMm = finiteNumber(explicit.tray_width_mm);
  const containmentWidthMm = finiteNumber(explicit.containment_width_mm);
  const tighteningTorqueNm = finiteNumber(explicit.tightening_torque_nm);
  const containmentType = primitiveString(explicit.containment_type!);
  const couplerReference = primitiveString(explicit.coupler_reference!);
  const manufacturerSystemProfileId = primitiveString(explicit.manufacturer_system_profile_id!);
  const productSpecificationId = primitiveString(explicit.product_specification_id!);
  const installationManualReference = primitiveString(explicit.installation_manual_reference!);
  const applicabilityBlockers = [
    jointCount !== null && Number.isInteger(jointCount) && jointCount > 0
      ? ""
      : "PROJECT_VALUE_INVALID:tray_joint_count",
    trayWidthMm !== null &&
        trayWidthMm >= LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.tray_width_mm_min &&
        trayWidthMm <= LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.tray_width_mm_max
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID}:tray_width_mm=${trayWidthMm}`,
    containmentWidthMm !== null && trayWidthMm !== null && Math.abs(containmentWidthMm - trayWidthMm) <= 1e-9
      ? ""
      : `PHYSICAL_NORM_PROJECT_VALUE_CONFLICT:containment_width_mm=${containmentWidthMm}:tray_width_mm=${trayWidthMm}`,
    containmentType === "TRAY"
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID}:containment_type=${containmentType}`,
    couplerReference && LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.coupler_options.includes(couplerReference)
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID}:coupler_reference=${couplerReference}`,
    manufacturerSystemProfileId === LEGRAND_P31_TRAY_PRODUCT_PROFILE_ID
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID}:manufacturer_system_profile_id=${manufacturerSystemProfileId}`,
    tighteningTorqueNm === LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.tightening_torque_nm
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID}:tightening_torque_nm=${tighteningTorqueNm}`,
    productSpecificationId ? "" : "PROJECT_VALUE_INVALID:product_specification_id",
    installationManualReference ? "" : "PROJECT_VALUE_INVALID:installation_manual_reference",
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      LEGRAND_P31_REQUIRED_EXPLICIT_PARAMETER_IDS,
      LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA,
    );
  }

  const calculatedTrayJointFastenerQuantityPiece = Math.ceil(
    jointCount! * LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.rate_value - 1e-9,
  );
  const explicitQuantity = finiteNumber(explicitValue(parameterValuesInput, "quantity_containment_joint_bolt"));
  if (explicitQuantity !== null && Math.abs(explicitQuantity - calculatedTrayJointFastenerQuantityPiece) > 1e-9) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [`PHYSICAL_NORM_VALUE_CONFLICT:quantity_containment_joint_bolt=${explicitQuantity}:norm_value=${calculatedTrayJointFastenerQuantityPiece}`],
      [...LEGRAND_P31_REQUIRED_EXPLICIT_PARAMETER_IDS, "quantity_containment_joint_bolt"],
      LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA,
    );
  }

  const capturedAt = LEGRAND_P31_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${LEGRAND_P31_TRAY_PRODUCT_PROFILE_ID}`,
    `system=${LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.system}`,
    `tray_joint_count=${jointCount}`,
    `tray_width_mm=${trayWidthMm}`,
    `coupler_reference=${couplerReference}`,
    `tightening_torque_nm=${tighteningTorqueNm}`,
    `product_specification_id=${productSpecificationId}`,
    `installation_manual_reference=${installationManualReference}`,
    `formula=ceil(tray_joint_count*${LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.rate_value})`,
    "other_widths_require_their_own_table_row=true",
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    quantity_containment_joint_bolt: {
      value: calculatedTrayJointFastenerQuantityPiece,
      unit_id: "item",
      source_type: "APPLICABLE_NORM" as const,
      source_id: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_ID,
    norm_id: LEGRAND_P31_TRAY_JOINT_FASTENER_NORM_ID,
    source_document_version: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.source_document_version,
    source_url: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.source_url,
    exact_locator: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.exact_locator,
    source_definition_hash: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...LEGRAND_P31_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["quantity_containment_joint_bolt"],
    calculated_tray_joint_fastener_quantity_piece: calculatedTrayJointFastenerQuantityPiece,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function parsePositiveLengthSchedule(value: string | null): readonly number[] | null {
  if (!value) return null;
  const tokens = value.split(/[;\n]+/u).map((token) => token.trim());
  if (tokens.length === 0 || tokens.some((token) => token.length === 0)) return null;
  const lengths = tokens.map((token) => Number(token.replace(/\s+/gu, "").replace(",", ".")));
  return lengths.every((length) => Number.isFinite(length) && length > 0) ? lengths : null;
}

function resolveWavinHep2OProfile(
  productProfileId: typeof WAVIN_HEP2O_PUSH_FIT_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(WAVIN_HEP2O_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
    parameterId,
    explicitValue(parameterValuesInput, parameterId),
  ]));
  const missing = WAVIN_HEP2O_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      WAVIN_HEP2O_REQUIRED_EXPLICIT_PARAMETER_IDS,
      WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA,
    );
  }

  const exactMaterialOrEquipment = primitiveString(explicit.exact_material_or_equipment!);
  const pipeMaterialAndClass = primitiveString(explicit.pipe_material_and_class!);
  const jointingMethod = primitiveString(explicit.jointing_method!);
  const systemVariant = primitiveString(explicit.hep2o_system_variant!);
  const connectionCount = finiteNumber(explicit.connection_count);
  const preparedPipeEndCount = finiteNumber(explicit.prepared_pipe_end_count);
  const routeLengthM = finiteNumber(explicit.route_length_m);
  const nominalDiameterMm = finiteNumber(explicit.nominal_diameter_mm);
  const supportOrientation = primitiveString(explicit.hep2o_support_orientation!);
  const supportSpanLengths = parsePositiveLengthSchedule(
    primitiveString(explicit.hep2o_support_span_lengths_m!),
  );
  const supportAnchorNodeCount = finiteNumber(explicit.hep2o_support_anchor_node_count);
  const supportAnchorPositionsVerified = explicit.hep2o_support_anchor_positions_verified!.value === true ||
    explicit.hep2o_support_anchor_positions_verified!.value === "true";
  const invalidNumeric = [
    ["connection_count", connectionCount],
    ["prepared_pipe_end_count", preparedPipeEndCount],
  ] as const;
  const numericBlockers = invalidNumeric
    .filter(([, value]) => value === null || !Number.isInteger(value) || value <= 0)
    .map(([parameterId]) => `PROJECT_VALUE_INVALID:${parameterId}`);
  if (routeLengthM === null || routeLengthM <= 0) numericBlockers.push("PROJECT_VALUE_INVALID:route_length_m");
  if (nominalDiameterMm === null || !Number.isInteger(nominalDiameterMm) || nominalDiameterMm <= 0) {
    numericBlockers.push("PROJECT_VALUE_INVALID:nominal_diameter_mm");
  }
  if (supportAnchorNodeCount === null || !Number.isInteger(supportAnchorNodeCount) || supportAnchorNodeCount < 2) {
    numericBlockers.push("PROJECT_VALUE_INVALID:hep2o_support_anchor_node_count");
  }
  if (!supportSpanLengths) numericBlockers.push("PROJECT_VALUE_INVALID:hep2o_support_span_lengths_m");
  if (numericBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      numericBlockers,
      WAVIN_HEP2O_REQUIRED_EXPLICIT_PARAMETER_IDS,
      WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA,
    );
  }

  const clipSourceMetadata = WAVIN_HEP2O_CLIP_SOURCE_METADATA.find((metadata) =>
    metadata.pipe_nominal_diameter_mm === nominalDiameterMm && metadata.orientation === supportOrientation);
  const supportSpanLengthSumM = supportSpanLengths!.reduce((sum, length) => sum + length, 0);
  const routeLengthToleranceM = Math.max(1e-9, routeLengthM! * 1e-9);

  const applicabilityBlockers = [
    exactMaterialOrEquipment === "Wavin Hep2O Barrier pipe and Hep2O fittings"
      ? null
      : `PHYSICAL_NORM_NOT_APPLICABLE:${WAVIN_HEP2O_SMARTSLEEVE_NORM_ID}:exact_material_or_equipment=${exactMaterialOrEquipment}`,
    pipeMaterialAndClass === "Wavin Hep2O Barrier pipe"
      ? null
      : `PHYSICAL_NORM_NOT_APPLICABLE:${WAVIN_HEP2O_SMARTSLEEVE_NORM_ID}:pipe_material_and_class=${pipeMaterialAndClass}`,
    jointingMethod === "Wavin Hep2O push-fit with SmartSleeve"
      ? null
      : `PHYSICAL_NORM_NOT_APPLICABLE:${WAVIN_HEP2O_SMARTSLEEVE_NORM_ID}:jointing_method=${jointingMethod}`,
    systemVariant === "WAVIN_HEP2O_PUSH_FIT"
      ? null
      : `PHYSICAL_NORM_NOT_APPLICABLE:${WAVIN_HEP2O_SMARTSLEEVE_NORM_ID}:hep2o_system_variant=${systemVariant}`,
    preparedPipeEndCount! >= connectionCount!
      ? null
      : `PHYSICAL_NORM_PROJECT_TOPOLOGY_CONFLICT:prepared_pipe_end_count=${preparedPipeEndCount}:connection_count=${connectionCount}`,
    clipSourceMetadata
      ? null
      : `PHYSICAL_NORM_NOT_APPLICABLE:WAVIN_HEP2O_CLIP_SPACING:nominal_diameter_mm=${nominalDiameterMm}:orientation=${supportOrientation}`,
    Math.abs(supportSpanLengthSumM - routeLengthM!) <= routeLengthToleranceM
      ? null
      : `PHYSICAL_NORM_PROJECT_TOPOLOGY_CONFLICT:hep2o_support_span_length_sum_m=${supportSpanLengthSumM}:route_length_m=${routeLengthM}`,
    supportAnchorPositionsVerified
      ? null
      : "PHYSICAL_NORM_PROJECT_TOPOLOGY_NOT_VERIFIED:hep2o_support_anchor_positions_verified",
  ].filter((blocker): blocker is string => blocker !== null);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      WAVIN_HEP2O_REQUIRED_EXPLICIT_PARAMETER_IDS,
      WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA,
    );
  }

  const calculatedSmartSleeveQuantityPiece =
    preparedPipeEndCount! * WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.rate_value;
  const calculatedSupportQuantityPiece = supportAnchorNodeCount! + supportSpanLengths!.reduce(
    (sum, spanLengthM) => sum + Math.max(
      0,
      Math.ceil(spanLengthM / clipSourceMetadata!.maximum_clip_spacing_m) - 1,
    ),
    0,
  );
  const explicitQuantity = finiteNumber(explicitValue(parameterValuesInput, "smart_sleeve_quantity_piece"));
  const explicitSupportCount = finiteNumber(explicitValue(parameterValuesInput, "support_count"));
  const valueConflictBlockers = [
    explicitQuantity === null || explicitQuantity === calculatedSmartSleeveQuantityPiece
      ? null
      : `PHYSICAL_NORM_VALUE_CONFLICT:smart_sleeve_quantity_piece=${explicitQuantity}:norm_value=${calculatedSmartSleeveQuantityPiece}`,
    explicitSupportCount === null || explicitSupportCount === calculatedSupportQuantityPiece
      ? null
      : `PHYSICAL_NORM_VALUE_CONFLICT:support_count=${explicitSupportCount}:norm_value=${calculatedSupportQuantityPiece}`,
  ].filter((blocker): blocker is string => blocker !== null);
  if (valueConflictBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      valueConflictBlockers,
      [...WAVIN_HEP2O_REQUIRED_EXPLICIT_PARAMETER_IDS, "smart_sleeve_quantity_piece", "support_count"],
      WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA,
    );
  }

  const capturedAt = WAVIN_HEP2O_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    smart_sleeve_quantity_piece: {
      value: calculatedSmartSleeveQuantityPiece,
      unit_id: "item",
      source_type: "APPLICABLE_NORM",
      source_id: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high",
      applicability: [
        `product_profile_id=${WAVIN_HEP2O_PUSH_FIT_PRODUCT_PROFILE_ID}`,
        `system=${WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.system}`,
        `prepared_pipe_end_count=${preparedPipeEndCount}`,
        `connection_count=${connectionCount}`,
        `joint_topology_reference=${primitiveString(explicit.hep2o_joint_topology_reference!)}`,
        `formula=prepared_pipe_end_count*${WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.rate_value}`,
      ].join(";"),
    } satisfies ProfessionalParameterValueV4,
    support_count: {
      value: calculatedSupportQuantityPiece,
      unit_id: "item",
      source_type: "APPLICABLE_NORM",
      source_id: clipSourceMetadata!.source_id,
      captured_at: capturedAt,
      confidence: "high",
      applicability: [
        `product_profile_id=${WAVIN_HEP2O_PUSH_FIT_PRODUCT_PROFILE_ID}`,
        `system=${clipSourceMetadata!.system}`,
        `nominal_diameter_mm=${nominalDiameterMm}`,
        `orientation=${supportOrientation}`,
        `maximum_clip_spacing_m=${clipSourceMetadata!.maximum_clip_spacing_m}`,
        `support_span_lengths_m=${supportSpanLengths!.join(",")}`,
        `support_anchor_node_count=${supportAnchorNodeCount}`,
        `support_layout_reference=${primitiveString(explicit.hep2o_support_layout_reference!)}`,
        `formula=anchor_node_count+sum(max(0,ceil(span_length/maximum_spacing)-1))`,
      ].join(";"),
    } satisfies ProfessionalParameterValueV4,
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID,
    norm_id: WAVIN_HEP2O_SMARTSLEEVE_NORM_ID,
    source_document_version: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.source_document_version,
    source_url: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.source_url,
    exact_locator: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.exact_locator,
    source_definition_hash: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.definition_hash,
    source_ids: [WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID, clipSourceMetadata!.source_id],
    norm_ids: [WAVIN_HEP2O_SMARTSLEEVE_NORM_ID, clipSourceMetadata!.norm_id],
    applied_norms: [{
      source_id: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID,
      norm_id: WAVIN_HEP2O_SMARTSLEEVE_NORM_ID,
      source_document_version: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.source_document_version,
      source_url: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.source_url,
      exact_locator: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.exact_locator,
      source_definition_hash: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.definition_hash,
      produced_parameter_ids: ["smart_sleeve_quantity_piece"],
    }, {
      source_id: clipSourceMetadata!.source_id,
      norm_id: clipSourceMetadata!.norm_id,
      source_document_version: clipSourceMetadata!.source_document_version,
      source_url: clipSourceMetadata!.source_url,
      exact_locator: clipSourceMetadata!.exact_locator,
      source_definition_hash: clipSourceMetadata!.definition_hash,
      produced_parameter_ids: ["support_count"],
    }],
    consumed_parameter_ids: [...WAVIN_HEP2O_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["smart_sleeve_quantity_piece", "support_count"] as const,
    calculated_smart_sleeve_quantity_piece: calculatedSmartSleeveQuantityPiece,
    calculated_support_quantity_piece: calculatedSupportQuantityPiece,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveKrer2706020HotAsphalt40Mm(
  productProfileId: typeof KRER27_06_020_HOT_ASPHALT_40MM_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(
    KRER27_06_020_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
      parameterId,
      explicitValue(parameterValuesInput, parameterId),
    ]),
  );
  const missing = KRER27_06_020_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      KRER27_06_020_REQUIRED_EXPLICIT_PARAMETER_IDS,
      KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_METADATA,
    );
  }

  const pavementAreaM2 = finiteNumber(explicit.pavement_area_m2);
  const measurementBasisM2 = finiteNumber(explicit.pavement_area_measurement_basis_m2);
  const aggregateSizeMm = finiteNumber(explicit.aggregate_size_mm);
  const layerThicknessMm = finiteNumber(explicit.layer_thickness_mm);
  const mixtureKind = primitiveString(explicit.mixture_kind!);
  const mixtureTypeAndDensityClass = primitiveString(explicit.mixture_type_and_density_class!);
  const selectedTableCode = primitiveString(explicit.selected_krer27_table_code!);
  const selectedTableVariant = primitiveString(explicit.selected_table_variant!);
  const selectedWorkComposition = primitiveString(explicit.selected_table_variant_work_composition!);
  const selectedResourceRows = primitiveString(explicit.selected_table_resource_rows!);
  const selectedEdition = primitiveString(explicit.selected_collection_edition_and_amendments!);
  const pavementSpecification = primitiveString(explicit.pavement_design_and_compaction_specification!);
  const currentPriceLevelAndIndices = primitiveString(explicit.current_price_level_and_regional_indices!);
  const estimatorApprovalReference = primitiveString(explicit.estimator_approval_reference!);
  const genericReference = /^(?:unknown|generic|not_selected|n\/a|none|неизвестно|не выбрано)$/iu;
  const exactReference = (value: string | null): boolean => Boolean(value && !genericReference.test(value));
  const applicabilityBlockers = [
    pavementAreaM2 !== null && pavementAreaM2 > 0
      ? ""
      : "PROJECT_VALUE_INVALID:pavement_area_m2",
    measurementBasisM2 === KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_METADATA.table_measurement_basis_m2
      ? ""
      : `PHYSICAL_NORM_VARIANT_CONFLICT:pavement_area_measurement_basis_m2=${measurementBasisM2}:published_basis_m2=${KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_METADATA.table_measurement_basis_m2}`,
    mixtureKind === "HOT_ASPHALT_CONCRETE"
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KRER27_06_020_HOT_ASPHALT_40MM_NORM_ID}:mixture_kind=${mixtureKind}`,
    exactReference(mixtureTypeAndDensityClass)
      ? ""
      : "PROJECT_VALUE_INVALID:mixture_type_and_density_class",
    aggregateSizeMm !== null && aggregateSizeMm > 0
      ? ""
      : "PROJECT_VALUE_INVALID:aggregate_size_mm",
    layerThicknessMm === KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_METADATA.published_layer_thickness_mm
      ? ""
      : `PHYSICAL_NORM_NOT_APPLICABLE:${KRER27_06_020_HOT_ASPHALT_40MM_NORM_ID}:layer_thickness_mm=${layerThicknessMm}`,
    selectedTableCode === KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_METADATA.table
      ? ""
      : `PHYSICAL_NORM_VARIANT_CONFLICT:selected_krer27_table_code=${selectedTableCode}:required_table=${KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_METADATA.table}`,
    exactReference(selectedTableVariant) ? "" : "PROJECT_VALUE_INVALID:selected_table_variant",
    exactReference(selectedWorkComposition) ? "" : "PROJECT_VALUE_INVALID:selected_table_variant_work_composition",
    exactReference(selectedResourceRows) ? "" : "PROJECT_VALUE_INVALID:selected_table_resource_rows",
    exactReference(selectedEdition) ? "" : "PROJECT_VALUE_INVALID:selected_collection_edition_and_amendments",
    exactReference(pavementSpecification) ? "" : "PROJECT_VALUE_INVALID:pavement_design_and_compaction_specification",
    exactReference(currentPriceLevelAndIndices) ? "" : "PROJECT_VALUE_INVALID:current_price_level_and_regional_indices",
    exactReference(estimatorApprovalReference) ? "" : "PROJECT_VALUE_INVALID:estimator_approval_reference",
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      KRER27_06_020_REQUIRED_EXPLICIT_PARAMETER_IDS,
      KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_METADATA,
    );
  }

  const calculatedTableNormUnits =
    pavementAreaM2! / KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_METADATA.table_measurement_basis_m2;
  const explicitTableNormUnits = finiteNumber(explicitValue(
    parameterValuesInput,
    "krer27_06_020_table_norm_units",
  ));
  if (
    explicitTableNormUnits !== null &&
    Math.abs(explicitTableNormUnits - calculatedTableNormUnits) > 1e-9
  ) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:krer27_06_020_table_norm_units=${explicitTableNormUnits}:norm_value=${calculatedTableNormUnits}`,
      ],
      [...KRER27_06_020_REQUIRED_EXPLICIT_PARAMETER_IDS, "krer27_06_020_table_norm_units"],
      KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_METADATA,
    );
  }

  const capturedAt = KRER27_06_020_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${productProfileId}`,
    `collection=${KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_METADATA.collection}`,
    `table=${selectedTableCode}`,
    `selected_table_variant=${selectedTableVariant}`,
    `selected_table_variant_work_composition=${selectedWorkComposition}`,
    `selected_table_resource_rows=${selectedResourceRows}`,
    `mixture_kind=${mixtureKind}`,
    `mixture_type_and_density_class=${mixtureTypeAndDensityClass}`,
    `aggregate_size_mm=${aggregateSizeMm}`,
    `layer_thickness_mm=${layerThicknessMm}`,
    `pavement_area_m2=${pavementAreaM2}`,
    `table_measurement_basis_m2=${measurementBasisM2}`,
    `formula=pavement_area_m2/${measurementBasisM2}`,
    `table_norm_units=${calculatedTableNormUnits}`,
    `selected_collection_edition_and_amendments=${selectedEdition}`,
    `pavement_design_and_compaction_specification=${pavementSpecification}`,
    `current_price_level_and_regional_indices=${currentPriceLevelAndIndices}`,
    `estimator_approval_reference=${estimatorApprovalReference}`,
    "derived_same_unit_conversion_only=true",
    "resource_rates_not_inferred=true",
    "cost_rates_not_inferred=true",
    "additional_waste_percent=0",
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    krer27_06_020_table_norm_units: {
      value: calculatedTableNormUnits,
      unit_id: "krer_norm_unit",
      source_type: "APPLICABLE_NORM" as const,
      source_id: KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_ID,
    norm_id: KRER27_06_020_HOT_ASPHALT_40MM_NORM_ID,
    source_document_version: KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_METADATA.source_document_version,
    source_url: KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_METADATA.source_url,
    exact_locator: KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_METADATA.exact_locator,
    source_definition_hash: KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...KRER27_06_020_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["krer27_06_020_table_norm_units"] as const,
    calculated_krer27_06_020_table_norm_units: calculatedTableNormUnits,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

function resolveNrmcaCip31ReadyMixOrder(
  productProfileId: typeof NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
  parameterValuesInput: Readonly<Record<string, ProfessionalParameterValueV4>>,
): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const explicit = Object.fromEntries(NRMCA_CIP31_REQUIRED_EXPLICIT_PARAMETER_IDS.map(
    (parameterId) => [parameterId, explicitValue(parameterValuesInput, parameterId)],
  ));
  const missing = NRMCA_CIP31_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      parameterValuesInput,
      missing,
      NRMCA_CIP31_REQUIRED_EXPLICIT_PARAMETER_IDS,
      NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA,
    );
  }

  const planDimensionConcreteVolumeM3 = finiteNumber(explicit.plan_dimension_concrete_volume_m3);
  const planVolumeCalculationReference = primitiveString(explicit.plan_volume_calculation_reference!);
  const mixDesignReference = primitiveString(explicit.mix_design_or_project_specification_reference!);
  const mixtureDesignation = primitiveString(explicit.mixture_designation!);
  const placementLocation = primitiveString(explicit.placement_location!);
  const placementMethod = primitiveString(explicit.placement_method!);
  const selectedContingencyPercent = finiteNumber(explicit.selected_contingency_percent);
  const contingencySelectionJustification = primitiveString(explicit.contingency_selection_justification!);
  const deliveryScheduleAndTruckCapacity = primitiveString(explicit.delivery_schedule_and_truck_capacity!);
  const producerOrderConfirmation = primitiveString(explicit.producer_order_confirmation!);
  const estimatorApprovalReference = primitiveString(explicit.estimator_approval_reference!);
  const applicabilityBlockers = [
    planDimensionConcreteVolumeM3 !== null && planDimensionConcreteVolumeM3 > 0
      ? ""
      : "PROJECT_VALUE_INVALID:plan_dimension_concrete_volume_m3",
    planVolumeCalculationReference ? "" : "PROJECT_VALUE_INVALID:plan_volume_calculation_reference",
    mixDesignReference ? "" : "PROJECT_VALUE_INVALID:mix_design_or_project_specification_reference",
    mixtureDesignation ? "" : "PROJECT_VALUE_INVALID:mixture_designation",
    placementLocation ? "" : "PROJECT_VALUE_INVALID:placement_location",
    placementMethod !== null && ["pump", "crane_bucket", "direct_chute"].includes(placementMethod)
      ? ""
      : `PHYSICAL_NORM_PLACEMENT_METHOD_NOT_APPLICABLE:placement_method=${placementMethod}`,
    selectedContingencyPercent !== null &&
      selectedContingencyPercent >= NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.minimum_selected_contingency_percent &&
      selectedContingencyPercent <= NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.maximum_selected_contingency_percent
      ? ""
      : `PHYSICAL_NORM_RATE_NOT_APPLICABLE:${NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID}:selected_contingency_percent=${selectedContingencyPercent}`,
    contingencySelectionJustification ? "" : "PROJECT_VALUE_INVALID:contingency_selection_justification",
    deliveryScheduleAndTruckCapacity ? "" : "PROJECT_VALUE_INVALID:delivery_schedule_and_truck_capacity",
    producerOrderConfirmation ? "" : "PROJECT_VALUE_INVALID:producer_order_confirmation",
    estimatorApprovalReference ? "" : "PROJECT_VALUE_INVALID:estimator_approval_reference",
  ].filter(Boolean);
  if (applicabilityBlockers.length > 0) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      applicabilityBlockers,
      NRMCA_CIP31_REQUIRED_EXPLICIT_PARAMETER_IDS,
      NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA,
    );
  }

  const calculatedConcreteOrderQuantityM3 = Number((
    planDimensionConcreteVolumeM3! * (1 + selectedContingencyPercent! / 100)
  ).toFixed(9));
  const explicitConcreteOrderQuantityM3 = finiteNumber(explicitValue(
    parameterValuesInput,
    "concrete_order_quantity_m3",
  ));
  if (
    explicitConcreteOrderQuantityM3 !== null &&
    Math.abs(explicitConcreteOrderQuantityM3 - calculatedConcreteOrderQuantityM3) > 1e-9
  ) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      parameterValuesInput,
      [
        `PHYSICAL_NORM_VALUE_CONFLICT:concrete_order_quantity_m3=${explicitConcreteOrderQuantityM3}:norm_value=${calculatedConcreteOrderQuantityM3}`,
      ],
      [...NRMCA_CIP31_REQUIRED_EXPLICIT_PARAMETER_IDS, "concrete_order_quantity_m3"],
      NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA,
    );
  }

  const capturedAt = NRMCA_CIP31_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const applicability = [
    `product_profile_id=${productProfileId}`,
    `plan_dimension_concrete_volume_m3=${planDimensionConcreteVolumeM3}`,
    `plan_volume_calculation_reference=${planVolumeCalculationReference}`,
    `mix_design_or_project_specification_reference=${mixDesignReference}`,
    `mixture_designation=${mixtureDesignation}`,
    `placement_location=${placementLocation}`,
    `placement_method=${placementMethod}`,
    `selected_contingency_percent=${selectedContingencyPercent}`,
    `contingency_selection_justification=${contingencySelectionJustification}`,
    `delivery_schedule_and_truck_capacity=${deliveryScheduleAndTruckCapacity}`,
    `producer_order_confirmation=${producerOrderConfirmation}`,
    `estimator_approval_reference=${estimatorApprovalReference}`,
    `formula=plan_dimension_concrete_volume_m3*(1+selected_contingency_percent/100)`,
    `concrete_order_quantity_m3=${calculatedConcreteOrderQuantityM3}`,
    "automatic_generic_binding=false",
  ].join(";");
  const parameterValues = Object.freeze({
    ...parameterValuesInput,
    concrete_order_quantity_m3: {
      value: calculatedConcreteOrderQuantityM3,
      unit_id: "m3",
      source_type: "APPLICABLE_NORM" as const,
      source_id: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high" as const,
      applicability,
    },
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: productProfileId,
    source_id: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
    norm_id: NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID,
    source_document_version: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.source_document_version,
    source_url: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.source_url,
    exact_locator: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.exact_locator,
    source_definition_hash: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...NRMCA_CIP31_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["concrete_order_quantity_m3"] as const,
    calculated_concrete_order_quantity_m3: calculatedConcreteOrderQuantityM3,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

export function resolveProfessionalPhysicalNormParameterValuesV1(input: {
  technology_class: string;
  operation_class: string;
  material_system?: string;
  scope_mode: ProfessionalEstimateScopeModeV4;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
  physical_context?: {
    asphalt_layer_count?: number;
  };
}): ProfessionalPhysicalNormApplicabilityResolutionV1 {
  const profileValue = explicitValue(input.parameter_values, "product_profile_id");
  const productProfileId = primitiveString(profileValue ?? undefined);
  if (productProfileId === LEGRAND_049272_BUS_SCS_PRODUCT_PROFILE_ID) {
    return resolveLegrand049272BusScsPhysicalNormV1({
      technology_class: input.technology_class,
      operation_class: input.operation_class,
      material_system: input.material_system,
      scope_mode: input.scope_mode,
      parameter_values: input.parameter_values,
    });
  }
  if (productProfileId === SIEMENS_SINTESO_FDB221_PRODUCT_PROFILE_ID) {
    return resolveSiemensSintesoFdb221PhysicalNormV1({
      technology_class: input.technology_class,
      operation_class: input.operation_class,
      material_system: input.material_system,
      scope_mode: input.scope_mode,
      parameter_values: input.parameter_values,
    });
  }
  if (productProfileId === ROCKWOOL_COMFORTBOARD80_R63_38MM_PRODUCT_PROFILE_ID) {
    return resolveRockwoolComfortboard80R6338MmPhysicalNormV1({
      technology_class: input.technology_class,
      operation_class: input.operation_class,
      material_system: input.material_system,
      scope_mode: input.scope_mode,
      parameter_values: input.parameter_values,
    });
  }
  if (productProfileId === SARNAFIL_AT18_FIELD_80MM_PRODUCT_PROFILE_ID) {
    return resolveSarnafilAt18Field80MmPhysicalNormV1({
      technology_class: input.technology_class,
      operation_class: input.operation_class,
      material_system: input.material_system,
      scope_mode: input.scope_mode,
      parameter_values: input.parameter_values,
    });
  }
  if (productProfileId === KRER27_06_020_HOT_ASPHALT_40MM_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "ASPHALT_PAVEMENT" &&
      input.operation_class === "INSTALL" &&
      input.material_system === "HOT_ASPHALT_CONCRETE" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      if (input.physical_context?.asphalt_layer_count !== 1) {
        return nonApplied(
          "BLOCKED_NOT_APPLICABLE",
          productProfileId,
          input.parameter_values,
          [
            `PHYSICAL_NORM_NOT_APPLICABLE:${KRER27_06_020_HOT_ASPHALT_40MM_NORM_ID}:asphalt_layer_count=${input.physical_context?.asphalt_layer_count ?? "missing"}`,
          ],
          KRER27_06_020_REQUIRED_EXPLICIT_PARAMETER_IDS,
          KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_METADATA,
        );
      }
      return resolveKrer2706020HotAsphalt40Mm(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      KRER27_06_020_HOT_ASPHALT_40MM_SOURCE_METADATA,
    );
  }
  if (productProfileId === NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "REINFORCED_CONCRETE_STRIP_FOUNDATION" &&
      input.operation_class === "ORDER_READY_MIX" &&
      input.material_system === "READY_MIX_CONCRETE" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      return resolveNrmcaCip31ReadyMixOrder(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA,
    );
  }
  if (productProfileId === CERESIT_CT29_INTERIOR_WALL_PLASTER_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "WALL_PLASTER" &&
      input.operation_class === "APPLY" &&
      input.material_system === "WALL_PLASTER" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      return resolveCeresitCt29InteriorWallPlaster(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      CERESIT_CT29_INTERIOR_WALL_PLASTER_SOURCE_METADATA,
    );
  }
  if (productProfileId === CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "WALL_PUTTY" &&
      input.operation_class === "APPLY" &&
      input.material_system === "WALL_PUTTY" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      return resolveCeresitCt126DryInteriorWallPutty(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      CERESIT_CT126_DRY_INTERIOR_WALL_PUTTY_SOURCE_METADATA,
    );
  }
  if (productProfileId === CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "WALL_PUTTY" &&
      input.operation_class === "APPLY" &&
      input.material_system === "WALL_PUTTY" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      return resolveCeresitCt127DryInteriorFinishPutty(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA,
    );
  }
  if (productProfileId === CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "CERAMIC_TILE" &&
      input.operation_class === "WATERPROOF" &&
      input.material_system === "CERAMIC_TILE" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      return resolveCeresitCl51IndoorCeramicWetZone(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      CERESIT_CL51_INDOOR_CERAMIC_WET_ZONE_SOURCE_METADATA,
    );
  }
  if (productProfileId === CERESIT_CN69_GLOBAL_25KG_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "SUBFLOOR" &&
      input.operation_class === "PREPARE" &&
      input.material_system === "SUBFLOOR" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      return resolveCeresitCn69FloorSystemProfile(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      CERESIT_CN69_GLOBAL_25KG_SOURCE_METADATA,
    );
  }
  if (productProfileId === CERESIT_CN87_50MM_SCREED_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "SUBFLOOR" &&
      input.operation_class === "PREPARE" &&
      input.material_system === "SUBFLOOR" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      return resolveCeresitCn87Exact50MmScreed(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      CERESIT_CN87_50MM_SCREED_SOURCE_METADATA,
    );
  }
  if (productProfileId === CERESIT_CM11_SMALL_CERAMIC_INDOOR_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "CERAMIC_TILE" &&
      input.operation_class === "LAY" &&
      input.material_system === "CERAMIC_TILE" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      return resolveCeresitCm11TileSystemProfile(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      CERESIT_CM11_SMALL_CERAMIC_INDOOR_SOURCE_METADATA,
    );
  }
  if (productProfileId === CERESIT_CT54_CT17_INTERIOR_WALL_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "PAINT" &&
      input.operation_class === "PAINT" &&
      input.material_system === "PAINT" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      return resolveCeresitCt54Ct17InteriorWallSystem(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      CERESIT_CT54_INTERIOR_WALL_SOURCE_METADATA,
    );
  }
  if (productProfileId === FORBO_232_MOUNTING_ADHESIVE_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "BASEBOARD" &&
      input.operation_class === "GLUE" &&
      input.material_system === "BASEBOARD" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      return resolveForbo232MountingAdhesive(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      FORBO_232_MOUNTING_ADHESIVE_SOURCE_METADATA,
    );
  }
  if (productProfileId === GERFLOR_6086_SKIRTING_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "BASEBOARD" &&
      input.operation_class === "INSTALL" &&
      input.material_system === "BASEBOARD" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      return resolveGerflor6086Skirting(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      GERFLOR_6086_SKIRTING_SOURCE_METADATA,
    );
  }
  if (productProfileId === WAVIN_HEP2O_PUSH_FIT_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "HEATING_PIPE_NETWORK" &&
      input.operation_class === "INSTALL" &&
      input.material_system === "HEATING_PIPE:SPACE_HEATING:HEATING_WATER" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      return resolveWavinHep2OProfile(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA,
    );
  }
  if (productProfileId === LEGRAND_P31_TRAY_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "CABLE_CHANNEL" &&
      input.operation_class === "INSTALL" &&
      input.material_system === "CABLE_CHANNEL" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      return resolveLegrandP31TrayJointFasteners(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA,
    );
  }
  if (productProfileId === KNAUF_FUGENFUELLER_JOINTING_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "FLAT_CEILING" &&
      input.operation_class === "FINISH_JOINT" &&
      input.material_system === "FLAT_CEILING" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      return resolveKnaufFugenfuellerJointing(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      KNAUF_FUGENFUELLER_JOINTING_SOURCE_METADATA,
    );
  }
  if (productProfileId === KNAUF_FUGENFUELLER_PERIMETER_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "FLAT_CEILING" &&
      input.operation_class === "FINISH_JOINT" &&
      input.material_system === "FLAT_CEILING" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      return resolveKnaufFugenfuellerPerimeterJoint(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      KNAUF_FUGENFUELLER_PERIMETER_SOURCE_METADATA,
    );
  }
  if (productProfileId === KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID) {
    const exactFlatCeilingRoute =
      input.technology_class === "FLAT_CEILING" &&
      input.material_system === "FLAT_CEILING" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE";
    if (
      exactFlatCeilingRoute &&
      input.operation_class === "FRAME"
    ) {
      return resolveKnaufD112FrameProfile(productProfileId, input.parameter_values);
    }
    if (exactFlatCeilingRoute && input.operation_class === "CLAD") {
      return resolveKnaufD112CladProfile(productProfileId, input.parameter_values);
    }
    if (exactFlatCeilingRoute && input.operation_class === "FINISH_JOINT") {
      return resolveKnaufD112FinishJointProfile(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      input.operation_class === "CLAD"
        ? KNAUF_D112_TN25_SCREW_SOURCE_METADATA
        : input.operation_class === "FINISH_JOINT"
          ? KNAUF_D112_UNIFLOTT_SOURCE_METADATA
          : KNAUF_D112_WALL_FASTENER_SOURCE_METADATA,
    );
  }
  if (productProfileId === DAIKIN_3MXS_K_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "REFRIGERANT_SYSTEM" &&
      input.operation_class === "INSTALL" &&
      input.material_system === "CONDITIONER:COOLING_AIR_CONDITIONING:REFRIGERANT_PROJECT_DEFINED" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      return resolveDaikin3MxsK(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      DAIKIN_3MXS_K_SOURCE_METADATA,
    );
  }
  if (productProfileId === LINDAB_VSR_PRODUCT_PROFILE_ID) {
    if (
      input.technology_class === "DUCT_NETWORK" &&
      input.operation_class === "INSTALL" &&
      input.scope_mode === "FULL_APPLICABLE_SCOPE"
    ) {
      return resolveLindabVsr(productProfileId, input.parameter_values);
    }
    return nonApplied(
      "NOT_REQUESTED",
      productProfileId,
      input.parameter_values,
      [],
      [],
      LINDAB_VSR_SOURCE_METADATA,
    );
  }
  if (
    input.technology_class !== "WARM_FLOOR_SYSTEM" ||
    input.operation_class !== "INSTALL" ||
    input.scope_mode !== "FULL_APPLICABLE_SCOPE" ||
    productProfileId !== UPONOR_UFH_150MM_PRODUCT_PROFILE_ID
  ) {
    return nonApplied("NOT_REQUESTED", productProfileId, input.parameter_values, []);
  }

  const explicit = Object.fromEntries(UPONOR_UFH_150MM_REQUIRED_EXPLICIT_PARAMETER_IDS.map((parameterId) => [
    parameterId,
    explicitValue(input.parameter_values, parameterId),
  ]));
  const missing = UPONOR_UFH_150MM_REQUIRED_EXPLICIT_PARAMETER_IDS
    .filter((parameterId) => explicit[parameterId] === null)
    .map((parameterId) => `PROJECT_VALUE_REQUIRED_EXPLICIT:${parameterId}`);
  if (missing.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      input.parameter_values,
      missing,
      UPONOR_UFH_150MM_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const areaM2 = finiteNumber(explicit.zone_area_m2);
  const spacingMm = finiteNumber(explicit.designed_pipe_spacing_mm);
  const feedTailM = finiteNumber(explicit.feed_tail_length_linear_m);
  const loopLimitM = finiteNumber(explicit.loop_length_limit);
  const circuitCount = finiteNumber(explicit.circuit_count);
  const manifoldOutletCount = finiteNumber(explicit.manifold_outlet_count);
  const longestCircuitM = finiteNumber(explicit.longest_circuit_length_m);
  const numericErrors = [
    ["zone_area_m2", areaM2, (value: number) => value > 0],
    ["designed_pipe_spacing_mm", spacingMm, (value: number) => value > 0],
    ["feed_tail_length_linear_m", feedTailM, (value: number) => value >= 0],
    ["loop_length_limit", loopLimitM, (value: number) => value > 0],
    ["circuit_count", circuitCount, (value: number) => Number.isInteger(value) && value > 0],
    ["manifold_outlet_count", manifoldOutletCount, (value: number) => Number.isInteger(value) && value > 0],
    ["longest_circuit_length_m", longestCircuitM, (value: number) => value > 0],
  ] as const;
  const invalidNumeric = numericErrors
    .filter(([, value, predicate]) => value === null || !predicate(value))
    .map(([parameterId]) => `PROJECT_VALUE_INVALID:${parameterId}`);
  if (invalidNumeric.length > 0) {
    return nonApplied(
      "BLOCKED_REQUIRED_INPUTS",
      productProfileId,
      input.parameter_values,
      invalidNumeric,
      UPONOR_UFH_150MM_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  if (spacingMm !== UPONOR_UFH_150MM_SOURCE_METADATA.pipe_spacing_mm) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      [`PHYSICAL_NORM_NOT_APPLICABLE:${UPONOR_UFH_150MM_NORM_ID}:designed_pipe_spacing_mm=${spacingMm}`],
      UPONOR_UFH_150MM_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }
  if (longestCircuitM! > loopLimitM!) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      [`PHYSICAL_NORM_LAYOUT_LIMIT_EXCEEDED:longest_circuit_length_m=${longestCircuitM}:loop_length_limit=${loopLimitM}`],
      UPONOR_UFH_150MM_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }
  if (manifoldOutletCount! < circuitCount!) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      [`PHYSICAL_NORM_MANIFOLD_OUTLETS_INSUFFICIENT:circuit_count=${circuitCount}:manifold_outlet_count=${manifoldOutletCount}`],
      UPONOR_UFH_150MM_REQUIRED_EXPLICIT_PARAMETER_IDS,
    );
  }

  const rawPipeLengthM = areaM2! * UPONOR_UFH_150MM_SOURCE_METADATA.rate_value + feedTailM!;
  const calculatedPipeLengthM = Number(rawPipeLengthM.toFixed(9));
  const explicitCircuitLengthM = finiteNumber(explicitValue(input.parameter_values, "circuit_length_m"));
  if (explicitCircuitLengthM !== null && explicitCircuitLengthM !== calculatedPipeLengthM) {
    return nonApplied(
      "BLOCKED_NOT_APPLICABLE",
      productProfileId,
      input.parameter_values,
      [`PHYSICAL_NORM_VALUE_CONFLICT:circuit_length_m=${explicitCircuitLengthM}:calculated_pipe_length_m=${calculatedPipeLengthM}`],
      [...UPONOR_UFH_150MM_REQUIRED_EXPLICIT_PARAMETER_IDS, "circuit_length_m"],
    );
  }
  const capturedAt = UPONOR_UFH_150MM_REQUIRED_EXPLICIT_PARAMETER_IDS
    .map((parameterId) => explicit[parameterId]!.captured_at)
    .sort()
    .at(-1)!;
  const parameterValues = Object.freeze({
    ...input.parameter_values,
    circuit_length_m: {
      value: calculatedPipeLengthM,
      unit_id: "m",
      source_type: "APPLICABLE_NORM",
      source_id: UPONOR_UFH_150MM_SOURCE_ID,
      captured_at: capturedAt,
      confidence: "high",
      applicability: [
        `product_profile_id=${UPONOR_UFH_150MM_PRODUCT_PROFILE_ID}`,
        `designed_pipe_spacing_mm=${spacingMm}`,
        `zone_area_m2=${areaM2}`,
        `feed_tail_length_linear_m=${feedTailM}`,
        `loop_length_limit=${loopLimitM}`,
        `hydraulic_loop_design_reference=${primitiveString(explicit.hydraulic_loop_design_reference!)}`,
        `manifold_location=${primitiveString(explicit.manifold_location!)}`,
        `formula=zone_area_m2*${UPONOR_UFH_150MM_SOURCE_METADATA.rate_value}+feed_tail_length_linear_m`,
      ].join(";"),
    } satisfies ProfessionalParameterValueV4,
  });
  const withoutHash = {
    status: "APPLIED" as const,
    applicability_version: PROFESSIONAL_PHYSICAL_NORM_APPLICABILITY_VERSION_V1,
    product_profile_id: UPONOR_UFH_150MM_PRODUCT_PROFILE_ID,
    source_id: UPONOR_UFH_150MM_SOURCE_ID,
    norm_id: UPONOR_UFH_150MM_NORM_ID,
    source_document_version: UPONOR_UFH_150MM_SOURCE_METADATA.source_document_version,
    source_url: UPONOR_UFH_150MM_SOURCE_METADATA.source_url,
    exact_locator: UPONOR_UFH_150MM_SOURCE_METADATA.exact_locator,
    source_definition_hash: UPONOR_UFH_150MM_SOURCE_METADATA.definition_hash,
    consumed_parameter_ids: [...UPONOR_UFH_150MM_REQUIRED_EXPLICIT_PARAMETER_IDS],
    produced_parameter_ids: ["circuit_length_m"] as const,
    calculated_pipe_length_m: calculatedPipeLengthM,
    parameter_values: parameterValues,
    blockers: [] as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}
