export const PROFESSIONAL_NORM_PACK_BASIS_PARAMETER_BY_NORM_ID = Object.freeze({
  air_conditioning_daikin_3mxs_k_additional_refrigerant_kg_m_v1: "total_refrigerant_piping_length_m",
  baseboards_forbo_232_mounting_adhesive_upper_ml_linear_m_v1: "skirting_length_linear_m",
  baseboards_gerflor_design_skirting_linear_m_perimeter_v1: "finished_perimeter_linear_m",
  carpentry_sikagard_wood_preserver_l_m2_preventative_v1: "treated_timber_surface_area_m2",
  ceilings_knauf_d112_standard_board_m2_m2_v1: "ceiling_area_m2",
  ceilings_knauf_d112_standard_joint_tape_linear_m_m2_v1: "ceiling_area_m2",
  ceilings_knauf_d112_standard_substructure_anchor_piece_m2_v1: "ceiling_area_m2",
  ceilings_knauf_d112_standard_tn25_screw_piece_m2_v1: "ceiling_area_m2",
  ceilings_knauf_d112_standard_ud_runner_linear_m_m2_v1: "ceiling_area_m2",
  ceilings_knauf_d112_standard_uniflott_kg_m2_v1: "ceiling_area_m2",
  ceilings_knauf_d112_standard_wall_fastener_piece_m2_v1: "ceiling_area_m2",
  cleaning_tennant_t350_600mm_conventional_practical_hour_m2_v1: "cleanable_hard_floor_area_m2",
  concrete_ready_mix_m3_m3_placed_v1: "volume_m3",
  delivery_ford_transit_v363_max_payload_trip_per_kg_v1: "cargo_weight_kg",
  demolition_krer46_selected_table_same_unit_routing_v1: "measured_project_quantity",
  documentation_kg_selected_design_price_unit_routing_v1: "project_capacity_measure",
  drywall_knauf_fugenfueller_leicht_jointing_kg_m2_v1: "board_area_m2",
  drywall_knauf_fugenfueller_perimeter_joint_kg_linear_m_v1: "perimeter_linear_m",
  earthworks_fhwa_fp24_structural_backfill_lifts_per_m_v1: "compacted_backfill_depth_m",
  electrical_legrand_049272_cable_linear_m_route_v1: "approved_route_length_linear_m",
  electrical_legrand_p31_tray_joint_m6_fasteners_piece_joint_v1: "tray_joint_count",
  equipment_rent_united_rentals_one_shift_hours_day_v1: "shift_count",
  facade_rockwool_fixrock_conventional_fixings_piece_m2_v1: "facade_insulation_area_m2",
  fire_safety_siemens_sinteso_base_piece_per_detector_point_v1: "designed_detector_point_count",
  flooring_ceresit_cn69_self_leveling_scope_2_10mm_v1: "area_m2",
  flooring_ceresit_ct17_primer_flooring_l_m2_v1: "area_m2",
  formwork_contact_area_m2_m3_concrete_element_v1: "volume_m3",
  heating_uponor_ufh_pipe_m_m2_150mm_spacing_v1: "heated_floor_area_m2",
  insulation_rockwool_comfortboard80_r63_38mm_m2_m2_v1: "net_insulation_area_m2",
  landscaping_rain_bird_xfd_dripline_m_route_m_v1: "approved_dripline_route_linear_m",
  low_voltage_legrand_049272_cable_linear_m_route_v1: "approved_route_length_linear_m",
  masonry_aac_block_600_200_200_piece_m2_wall_v1: "area_m2",
  masonry_brick_250_120_65_piece_m2_half_brick_v1: "area_m2",
  masonry_cement_lime_mortar_m3_m2_brick_v1: "area_m2",
  masonry_reinforcement_mesh_m2_m2_wall_v1: "area_m2",
  masonry_thin_bed_block_adhesive_kg_m2_200mm_v1: "area_m2",
  metalwork_jotun_hardtop_xp_l_m2_100um_v1: "coated_steel_area_m2",
  paint_ceresit_ct17_primer_l_m2_before_paint_v1: "area_m2",
  paint_ceresit_ct54_silicate_two_coats_l_m2_v1: "area_m2",
  plaster_ceresit_ct29_kg_m2_mm_v1: "area_m2",
  plumbing_wavin_hep2o_15mm_horizontal_clip_spacing_v1: "pipe_length_linear_m",
  plumbing_wavin_hep2o_15mm_vertical_clip_spacing_v1: "pipe_length_linear_m",
  plumbing_wavin_hep2o_22mm_horizontal_clip_spacing_v1: "pipe_length_linear_m",
  plumbing_wavin_hep2o_smartsleeve_piece_connection_v1: "prepared_pipe_end_count",
  putty_ceresit_ct126_kg_m2_mm_v1: "area_m2",
  putty_ceresit_ct127_finish_layer_max_2mm_v1: "area_m2",
  reinforcement_rebar_kg_m3_concrete_element_v1: "volume_m3",
  roadworks_krer27_06_020_norm_unit_per_m2_v1: "pavement_area_m2",
  roofing_sarnafil_at18_field_overlap_m2_m2_v1: "net_rectangular_field_area_m2",
  screed_cement_sand_mix_kg_m2_50mm_v1: "area_m2",
  services_kg_author_supervision_confirmed_visit_unit_v1: "contracted_author_supervision_visit_count",
  sewerage_wavin_osma_110mm_3m_pipe_linear_m_route_v1: "approved_pipe_route_linear_m",
  tile_ceresit_cm11_plus_adhesive_kg_m2_notch_4_12_v1: "area_m2",
  tile_ceresit_ct17_primer_l_m2_absorbent_substrate_v1: "area_m2",
  ventilation_lindab_vsr_duct_linear_m_route_v1: "approved_duct_route_linear_m",
  waste_removal_us_epa_cd_concrete_kg_m3_v1: "measured_loose_concrete_debris_m3",
  waste_removal_us_epa_cd_composite_kg_m3_v1: "measured_loose_cd_debris_m3",
  waterproofing_ceresit_cl51_two_coats_kg_m2_v1: "area_m2",
  windows_doors_soudafoam_genius_can_per_joint_m_v1: "qualified_joint_length_linear_m",
} as const);

export type ProfessionalNormPackBasisUnit =
  | "m2"
  | "m3"
  | "linear_m"
  | "kg"
  | "piece"
  | "point"
  | "day"
  | "selected_unit";

export function inferProfessionalNormPackBasisUnit(parameterKey: string): ProfessionalNormPackBasisUnit | null {
  if (parameterKey.endsWith("_m2")) return "m2";
  if (parameterKey.endsWith("_m3")) return "m3";
  if (parameterKey.endsWith("_linear_m") || parameterKey.endsWith("_length_m") || parameterKey.endsWith("_depth_m")) {
    return "linear_m";
  }
  if (parameterKey.endsWith("_weight_kg")) return "kg";
  if (parameterKey === "designed_detector_point_count") return "point";
  if (parameterKey === "shift_count") return "day";
  if (parameterKey.endsWith("_count")) return "piece";
  if (parameterKey === "measured_project_quantity" || parameterKey === "project_capacity_measure") {
    return "selected_unit";
  }
  return null;
}
