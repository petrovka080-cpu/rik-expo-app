import { BUILT_IN_AI_50000_PHASE1_MACRO_DOMAINS } from "./builtInAi50000MacroDomains";

export const BUILT_IN_AI_50000_TARGET_SHARDS_TOTAL = 50;
export const BUILT_IN_AI_50000_TARGET_CASES_PER_SHARD = 1000;
export const BUILT_IN_AI_50000_TARGET_CASES_TOTAL =
  BUILT_IN_AI_50000_TARGET_SHARDS_TOTAL * BUILT_IN_AI_50000_TARGET_CASES_PER_SHARD;
export const BUILT_IN_AI_50000_TARGET_MACRO_DOMAINS_TOTAL = 25;
export const BUILT_IN_AI_50000_TARGET_DOMAINS_TOTAL = 500;
export const BUILT_IN_AI_50000_TARGET_DOMAINS_PER_MACRO_DOMAIN =
  BUILT_IN_AI_50000_TARGET_DOMAINS_TOTAL / BUILT_IN_AI_50000_TARGET_MACRO_DOMAINS_TOTAL;
export const BUILT_IN_AI_50000_TARGET_CASES_PER_DOMAIN =
  BUILT_IN_AI_50000_TARGET_CASES_TOTAL / BUILT_IN_AI_50000_TARGET_DOMAINS_TOTAL;

export const BUILT_IN_AI_50000_PHASE1_SHARDS_TOTAL = 5;
export const BUILT_IN_AI_50000_PHASE1_CASES_PER_SHARD = 1000;
export const BUILT_IN_AI_50000_PHASE1_CASES_PER_MACRO_DOMAIN = 200;
export const BUILT_IN_AI_50000_PHASE1_CASES_TOTAL =
  BUILT_IN_AI_50000_PHASE1_SHARDS_TOTAL * BUILT_IN_AI_50000_PHASE1_CASES_PER_SHARD;

export const BUILT_IN_AI_50000_PHASE1_WAVE =
  "S_BUILT_IN_AI_50000_PHASE1_GOVERNED_EXPANSION_SHARD_LIVE_GATE_NO_HACKS_POINT_OF_NO_RETURN";

export const BUILT_IN_AI_50000_PHASE1_GREEN_STATUS =
  "GREEN_BUILT_IN_AI_50000_PHASE1_GOVERNED_EXPANSION_READY";

export const BUILT_IN_AI_50000_PHASE1_BLOCKED_STATUS =
  "BLOCKED_PHASE1_MANIFEST_INVALID";

export const BUILT_IN_AI_50000_PHASE1_CHOICE =
  "OPTION_B_CREATE_ISOLATED_50K_PHASE1_CANDIDATE_MANIFEST";

export const BUILT_IN_AI_50000_PHASE2_WAVE =
  "S_BUILT_IN_AI_50000_PHASE2_ALL_SHARDS_RUNTIME_CI_MERGE_GATE_NO_HACKS_POINT_OF_NO_RETURN";

export const BUILT_IN_AI_50000_PHASE2_GREEN_STATUS =
  "GREEN_BUILT_IN_AI_50000_PHASE2_ALL_SHARDS_RUNTIME_READY";

export const BUILT_IN_AI_50000_PHASE2_BLOCKED_STATUS =
  "BLOCKED_FULL_50000_MANIFEST_INVALID";

export const BUILT_IN_AI_50000_PHASE2_CHOICE =
  "OPTION_B_GENERATE_FULL_50K_FROM_GOVERNED_ONTOLOGY";

export const BUILT_IN_AI_50000_PHASE3_WAVE =
  "S_BUILT_IN_AI_50000_PHASE3_LIVE_APP_DOMAIN_SAMPLE_WEB_ANDROID_PDF_GATE_NO_HACKS_POINT_OF_NO_RETURN";

export const BUILT_IN_AI_50000_PHASE3_GREEN_STATUS =
  "GREEN_BUILT_IN_AI_50000_PHASE3_LIVE_APP_DOMAIN_SAMPLE_READY";

export const BUILT_IN_AI_50000_PHASE3_BLOCKED_STATUS =
  "BLOCKED_LIVE_SAMPLE_PLAN_INVALID";

export const BUILT_IN_AI_50000_PHASE3_CHOICE =
  "OPTION_B_SAMPLE_FROM_PHASE2_MERGED_RUNTIME_RESULTS";

export const BUILT_IN_AI_50000_PHASE1_CRITICAL_CASE_IDS = Object.freeze([
  "phase1_anchor_brick_masonry_74sqm",
  "phase1_anchor_gable_roof_installation_100sqm",
  "phase1_anchor_asphalt_paving_1000sqm",
  "phase1_anchor_carpet_laying_100sqm",
  "phase1_anchor_drywall_wall_cladding_352sqm",
  "phase1_anchor_ceramic_tile_floor_laying_174sqm",
  "phase1_anchor_laminate_laying_100sqm",
  "phase1_anchor_concrete_slab_200sqm",
  "phase1_anchor_rebar_installation_height_5m",
  "phase1_anchor_facade_insulation_200sqm",
  "phase1_anchor_electrical_wiring_80sqm",
  "phase1_anchor_pipe_replacement_40lm",
  "phase1_anchor_roof_repair_70sqm",
  "phase1_anchor_bathroom_waterproofing_30sqm",
  "phase1_anchor_solar_panel_installation",
  "phase1_anchor_battery_storage_installation",
  "phase1_anchor_boiler_room_piping",
  "phase1_anchor_micro_hydro_intake",
  "phase1_anchor_substation_grounding",
  "phase1_anchor_greenhouse_installation",
  "phase1_anchor_furniture_room_furnishing",
  "phase1_anchor_smart_home_basic",
  "phase1_anchor_emergency_roof_leak_repair",
  "phase1_anchor_rebar_product_search_d14",
  "phase1_anchor_asphalt_supplier_search_10000sqm",
  "phase1_anchor_estimate_to_pdf",
]);

export const BUILT_IN_AI_50000_PHASE1_MACRO_DOMAIN_IDS = Object.freeze(
  BUILT_IN_AI_50000_PHASE1_MACRO_DOMAINS.map((domain) => domain.id),
);
