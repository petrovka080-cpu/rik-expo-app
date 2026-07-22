import type { AsphaltAssemblyProfileIdV4 } from "./asphaltPreliminaryAssemblyPolicyV4";

export type AsphaltScopeManifestV4 = {
  manifest_id: string;
  version: "1.0.0";
  profile_id: AsphaltAssemblyProfileIdV4;
  required_row_ids: string[];
  explicitly_excluded_wbs_ru: string[];
};

const PREPARATION = [
  "initial_data_analysis",
  "field_site_survey",
  "base_acceptance",
  "mechanized_surface_cleaning",
  "geodetic_layout",
  "axes_marks_fixing",
  "mobilization_demobilization",
  "work_zone_organization",
] as const;

const PAVEMENT_COMMON = [
  "base_emulsion_material",
  "base_emulsion_application",
  "asphalt_layer_1_material",
  "asphalt_layer_1_paving",
  "asphalt_layer_1_preliminary_compaction",
  "asphalt_layer_1_main_compaction",
  "asphalt_layer_1_final_compaction",
  "asphalt_layer_1_quality_control",
  "road_workers",
  "surface_cleaner",
  "bitumen_distributor",
  "asphalt_paver_layer_1",
  "smooth_roller_layer_1",
  "pneumatic_roller_layer_1",
  "asphalt_layer_1_delivery",
  "asphalt_layer_1_truck_trips",
  "dump_trucks_layer_1",
] as const;

const SECOND_LAYER = [
  "emulsion_interface_1_2",
  "emulsion_interface_1_2_application",
  "asphalt_layer_2_material",
  "asphalt_layer_2_paving",
  "asphalt_layer_2_preliminary_compaction",
  "asphalt_layer_2_main_compaction",
  "asphalt_layer_2_final_compaction",
  "asphalt_layer_2_quality_control",
  "asphalt_paver_layer_2",
  "smooth_roller_layer_2",
  "pneumatic_roller_layer_2",
  "asphalt_layer_2_delivery",
  "asphalt_layer_2_truck_trips",
  "dump_trucks_layer_2",
] as const;

const FINISHING = [
  "longitudinal_joints",
  "transverse_joints",
  "edge_treatment",
  "joint_sealing_material",
  "joint_sealing_application",
  "incoming_material_control",
  "asphalt_temperature_control",
  "asphalt_compaction_control",
  "asphalt_core_sampling",
  "laboratory_tests",
  "surface_smoothness_control",
  "pavement_thickness_control",
  "laboratory_protocol",
  "executive_survey",
  "execution_documentation",
] as const;

const FULL_PREPARATION = [
  "temporary_traffic_management",
  "site_clearing",
  "site_preparation",
  "preparation_workers",
] as const;

const EARTHWORK = [
  "topsoil_stripping",
  "subgrade_excavation",
  "soil_loading",
  "soil_movement",
  "soil_haul",
  "soil_trips",
  "soil_disposal",
  "earthwork_grading",
  "subgrade_profiling",
  "subgrade_compaction",
  "subgrade_density_control",
  "excavator",
  "wheel_loader",
  "bulldozer",
  "subgrade_roller",
  "earthwork_workers",
] as const;

const SUBBASE = [
  "geotextile_material",
  "geotextile_installation",
  "sand_material",
  "sand_delivery",
  "sand_trips",
  "sand_placement",
  "sand_moistening_water",
  "sand_moistening",
  "sand_compaction",
  "sand_thickness_control",
  "sand_density_control",
  "base_workers",
] as const;

const CRUSHED_BASE = [1, 2].flatMap((position) => [
  `crushed_layer_${position}_material`,
  `crushed_layer_${position}_delivery`,
  `crushed_layer_${position}_trips`,
  `crushed_layer_${position}_placement`,
  `crushed_layer_${position}_profiling`,
  `crushed_layer_${position}_keying`,
  `crushed_layer_${position}_moistening_water`,
  `crushed_layer_${position}_moistening`,
  `crushed_layer_${position}_compaction`,
  `crushed_layer_${position}_elevation_control`,
  `crushed_layer_${position}_density_control`,
]);

const BASE_MACHINERY = ["grader", "base_roller", "water_truck"] as const;

function manifest(
  profile: AsphaltAssemblyProfileIdV4,
  required: readonly string[],
  excluded: string[],
): AsphaltScopeManifestV4 {
  return {
    manifest_id: `asphalt:${profile}:expanded-professional-assembly:v1`,
    version: "1.0.0",
    profile_id: profile,
    required_row_ids: [...new Set(required)],
    explicitly_excluded_wbs_ru: excluded,
  };
}

export function getAsphaltScopeManifestV4(profile: AsphaltAssemblyProfileIdV4): AsphaltScopeManifestV4 {
  const commonTwoLayer = [...PREPARATION, ...PAVEMENT_COMMON, ...SECOND_LAYER, ...FINISHING];
  if (profile === "new_full_road_pavement" || profile === "parking_full_construction") {
    return manifest(profile, [
      ...commonTwoLayer,
      ...FULL_PREPARATION,
      ...EARTHWORK,
      ...SUBBASE,
      ...CRUSHED_BASE,
      ...BASE_MACHINERY,
    ], [
      "Слабый грунт заменяется только после инженерных изысканий.",
      "Водоотвод, бордюры, трубы, разметка, знаки, ограждения и освещение включаются только по проектной применимости.",
    ]);
  }
  if (profile === "rehabilitation_with_milling") {
    return manifest(profile, [
      ...commonTwoLayer,
      "milling",
      "milling_machine",
      "milled_material_loading",
      "milled_material_transport",
      "milled_material_disposal",
    ], ["Земляное полотно и новые сплошные слои основания не входят в ремонтный профиль без проекта реконструкции."]);
  }
  if (profile === "overlay_on_existing_pavement") {
    return manifest(profile, [...PREPARATION, ...PAVEMENT_COMMON, ...FINISHING, "existing_pavement_repairs"], [
      "Сплошное фрезерование, земляное полотно и новые слои основания не включены без подтверждения.",
    ]);
  }
  if (profile === "local_patch_repair") {
    return manifest(profile, [...PREPARATION, ...PAVEMENT_COMMON, ...FINISHING, "local_patch_saw_cutting", "local_patch_removal", "local_patch_base_preparation"], [
      "Сплошные земляные, базовые и двухслойные работы не входят в локальный ремонт.",
    ]);
  }
  return manifest(profile, commonTwoLayer, [
    "Земляное полотно, песчаные и щебёночные слои исключены: выбран scope покрытия по принятому готовому основанию.",
    "Дополнительные дорожные конструкции включаются только после подтверждения применимости и объёмов.",
  ]);
}
