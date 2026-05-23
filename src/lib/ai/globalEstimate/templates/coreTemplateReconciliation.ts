export const GLOBAL_ESTIMATE_TEMPLATE_RATEBOOK_REQUIRED_WORK_KEYS = [
  "asphalt_paving",
  "carpet_laying",
  "drywall_partition",
  "drywall_wall_cladding",
  "gable_roof_installation",
  "brick_masonry",
  "ceramic_tile_floor_laying",
  "laminate_laying",
  "roof_repair",
  "waterproofing_bathroom",
] as const;

export type GlobalEstimateTemplateRatebookRequiredWorkKey =
  typeof GLOBAL_ESTIMATE_TEMPLATE_RATEBOOK_REQUIRED_WORK_KEYS[number];

export const GLOBAL_ESTIMATE_FORBIDDEN_GENERIC_ROW_NAMES = [
  "\u0421\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
  "\u041e\u0441\u043d\u043e\u0432\u043d\u043e\u0439 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b: \u0421\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
  "\u041f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0430: \u0421\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
  "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b: \u0421\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
  "\u0420\u0430\u0431\u043e\u0442\u044b: \u0421\u0442\u0440\u043e\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b",
  "\u0420\u0435\u043c\u043e\u043d\u0442\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b \u043f\u043e\u0441\u043b\u0435 \u0441\u043e\u0433\u043b\u0430\u0441\u043e\u0432\u0430\u043d\u0438\u044f",
  "\u041e\u0441\u043c\u043e\u0442\u0440 \u0438 \u0443\u0442\u043e\u0447\u043d\u0435\u043d\u0438\u0435 \u043e\u0431\u044a\u0451\u043c\u0430 \u0440\u0430\u0431\u043e\u0442",
] as const;

export const GLOBAL_ESTIMATE_TEMPLATE_RECONCILIATION_EXPECTED_ROW_CODES = {
  asphalt_paving: [
    "sand_base",
    "crushed_stone_base",
    "bitumen_emulsion",
    "asphalt_lower_coarse",
    "asphalt_top_fine",
    "equipment_mobilization",
    "asphalt_lower_laying",
    "asphalt_top_laying",
  ],
  carpet_laying: [
    "carpet_covering",
    "carpet_underlay",
    "carpet_glue_tape",
    "carpet_base_preparation",
    "carpet_laying_work",
    "carpet_cutting",
  ],
  drywall_partition: [
    "drywall_sheets",
    "drywall_track_profile",
    "drywall_stud_profile",
    "drywall_fasteners",
    "drywall_joint_tape",
    "drywall_joint_putty",
    "drywall_frame_install",
    "drywall_sheet_install",
  ],
  drywall_wall_cladding: [
    "drywall_wall_cladding_material_1",
    "drywall_wall_cladding_material_2",
    "drywall_wall_cladding_labor_1",
    "drywall_wall_cladding_labor_2",
  ],
  gable_roof_installation: [
    "gable_roof_rafters",
    "gable_roof_wall_plate",
    "gable_roof_membrane",
    "gable_roof_batten",
    "gable_roof_covering",
    "gable_roof_flashings",
    "gable_roof_rafter_install",
    "gable_roof_batten_install",
    "gable_roof_covering_install",
  ],
  brick_masonry: [
    "brick_masonry_brick",
    "brick_masonry_mortar",
    "brick_masonry_mesh",
    "brick_masonry_laying",
    "brick_masonry_jointing",
  ],
  ceramic_tile_floor_laying: [
    "ceramic_tile_floor_laying_material_1",
    "ceramic_tile_floor_laying_material_2",
    "ceramic_tile_floor_laying_material_3",
    "ceramic_tile_floor_laying_labor_1",
    "ceramic_tile_floor_laying_labor_2",
    "ceramic_tile_floor_laying_labor_3",
  ],
  laminate_laying: [
    "laminate_board",
    "underlayment",
    "baseboard",
    "laminate_install",
  ],
  roof_repair: [
    "roof_repair_material_1",
    "roof_repair_material_2",
    "roof_repair_labor_1",
    "roof_repair_labor_2",
  ],
  waterproofing_bathroom: [
    "waterproofing_bathroom_main_material",
    "waterproofing_bathroom_auxiliary",
    "waterproofing_bathroom_prep",
    "waterproofing_bathroom_install",
  ],
} as const satisfies Record<GlobalEstimateTemplateRatebookRequiredWorkKey, readonly string[]>;

export function isGlobalEstimateTemplateRatebookRequiredWorkKey(
  workKey: string,
): workKey is GlobalEstimateTemplateRatebookRequiredWorkKey {
  return GLOBAL_ESTIMATE_TEMPLATE_RATEBOOK_REQUIRED_WORK_KEYS.includes(
    workKey as GlobalEstimateTemplateRatebookRequiredWorkKey,
  );
}
