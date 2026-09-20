import {
  requireKnownWorkEstimate,
  rowsOf,
  UNIVERSAL_KNOWN_WORK_CASES,
} from "../aiPlatform/universalProfessionalEstimateEngineTestHelpers";

const REQUIRED_TECHNOLOGY_CODES: Readonly<Record<string, readonly string[]>> = {
  acoustic_panels: [
    "acoustic_substrate_anchors",
    "acoustic_absorbent_backing",
    "acoustic_finish_acceptance",
    "acoustic_panel_installation_mobile_access_tower",
    "acoustic_panel_installation_access_tower_operations",
    "acoustic_panel_installation_access_tower_delivery_return",
    "acoustic_panel_installation_fall_protection",
  ],
  fire_alarm: [
    "fire_alarm_junction_boxes",
    "fire_alarm_line_isolators",
    "fire_alarm_penetration_firestop",
    "fire_alarm_integrated_test",
    "fire_alarm_installation_mobile_access_tower",
    "fire_alarm_installation_access_tower_operations",
    "fire_alarm_installation_access_tower_delivery_return",
    "fire_alarm_installation_fall_protection",
  ],
  cold_room: [
    "cold_room_wall_panels",
    "cold_room_ceiling_panels",
    "cold_room_insulated_door",
    "cold_room_evaporator",
    "cold_room_pressure_vacuum_test",
    "cold_room_temperature_mapping",
    "cold_room_installation_mobile_access_tower",
    "cold_room_installation_access_tower_operations",
    "cold_room_installation_access_tower_delivery_return",
    "cold_room_installation_fall_protection",
  ],
  dock_leveler: [
    "dock_leveler_anchor_set",
    "dock_leveler_nonshrink_grout",
    "dock_leveler_frame_setting",
    "dock_leveler_hydraulic_connection",
    "dock_leveler_load_test",
  ],
  smoke_extraction: [
    "smoke_duct_supports",
    "smoke_duct_fire_protection",
    "smoke_airflow_balancing",
    "smoke_fire_scenario_test",
    "smoke_extraction_system_mobile_access_tower",
    "smoke_extraction_system_access_tower_operations",
    "smoke_extraction_system_access_tower_delivery_return",
    "smoke_extraction_system_fall_protection",
  ],
  bms_automation: [
    "bms_io_modules",
    "bms_protocol_gateways",
    "bms_io_point_test",
    "bms_network_configuration",
    "bms_functional_performance_test",
    "bms_automation_installation_mobile_access_tower",
    "bms_automation_installation_access_tower_operations",
    "bms_automation_installation_access_tower_delivery_return",
    "bms_automation_installation_fall_protection",
  ],
  industrial_equipment: [
    "industrial_shim_packs",
    "industrial_nonshrink_grout",
    "industrial_receiving_inspection",
    "industrial_setting_on_foundation",
    "industrial_precision_alignment",
    "industrial_dry_and_load_test",
    "industrial_mobile_crane",
    "industrial_rigging_tools",
  ],
};

describe("embedded AI entrypoints accept any construction work estimate", () => {
  it.each(UNIVERSAL_KNOWN_WORK_CASES.slice(0, 7))("$id works from embedded AI contexts", (testCase) => {
    expect(requireKnownWorkEstimate(testCase, "/ai?context=foreman").work.workKey).toBe(testCase.expectedWorkKey);
    expect(requireKnownWorkEstimate(testCase, "/ai?context=request").work.workKey).toBe(testCase.expectedWorkKey);
  });

  it.each(UNIVERSAL_KNOWN_WORK_CASES.slice(0, 7))("$id contains real technology instead of row-count padding", (testCase) => {
    const rows = rowsOf(requireKnownWorkEstimate(testCase, "/ai?context=request"));
    const codes = rows.map((row) => row.code);
    expect(codes).toEqual(expect.arrayContaining(REQUIRED_TECHNOLOGY_CODES[testCase.id] ?? []));
    expect(codes.some((code) => /(?:^|_)(?:assurance|padding|filler|placeholder)(?:_|$)|^professional_wbs_/iu.test(code))).toBe(false);
    expect(rows.some((row) => /требуется уточнение|\bwarning\b/iu.test(row.name))).toBe(false);
    expect(rows.some((row) => /^(?:материал|материалы|работа|работы|механизм|механизмы|услуга|услуги)$/iu.test(row.name.trim()))).toBe(false);
  });
});
