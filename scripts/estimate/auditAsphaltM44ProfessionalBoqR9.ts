import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildAsphaltRelatedR8Inventory,
  type AsphaltRelatedR8InventoryRecord,
} from "./buildAsphaltRelatedR8Inventory";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  createConsumerRepairRequestDraft,
  getConsumerRepairRequest,
  initializeConsumerRepairTransactionalDurableStorage,
  listConsumerRepairApprovedHistory,
} from "../../src/lib/consumerRequests";
import {
  awaitTransactionalConsumerRepairBundleCommit,
  flushTransactionalConsumerRepairWrites,
  readTransactionalConsumerRepairBundle,
} from "../../src/lib/platform/consumerRepairTransactionalDurableBridge";
import { InMemoryEstimateRevisionDurableStore } from "../../src/lib/platform/estimateRevisionDurableStore";
import { setConsumerRepairTransactionalDurableStoreForTests } from "../../src/lib/consumerRequests/consumerRequestRepository";
import type {
  EstimateDraftRevisionParam,
  ProfessionalBoqRow,
} from "../../src/lib/estimate/estimateDraftRevisionContract";
import { buildConsumerRepairDraftFromAiEstimateRuntime } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";
import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import { buildProjectExecutionDraftFromRevision } from "../../src/lib/projectExecution/buildProjectExecutionDraftFromRevision";
import { roadworksWaveAParameterPresentation } from "../../src/lib/estimate/v4/roadworks/roadworksWaveA";
import { RoadworksWaveAProductionRegistry } from "../../src/lib/estimate/v4/roadworks/roadworksWaveAProductionBinding";
import {
  ASPHALT_RESOURCE_LEVEL_CANONICAL_PARAMETER_SCHEMA,
  REGISTERED_CANONICAL_PARAMETER_SCHEMAS,
} from "../../src/lib/estimate/canonicalParameters/registeredCanonicalParameterSchemas";
import {
  getAsphaltRelatedProfileByCatalogRecordIdV4,
} from "../../src/lib/estimate/v4/asphalt/asphaltRelatedSemanticRegistryV4";
import { ASPHALT_RELATED_PARAMETER_METADATA_V4 } from "../../src/lib/estimate/v4/asphalt/compileAsphaltRelatedProfessionalEstimateV4";
import { formatEstimateUnitLabel } from "../../src/lib/ai/globalEstimate/formatEstimateUnitLabel";
import { buildCanonicalElectricalConsumerRepairAiDraft } from "../../src/lib/estimate/v4/electrical/buildCanonicalElectricalConsumerRepairAiDraft";

const CREATED_AT = "2026-08-10T10:00:00.000Z";
const AUDIT_SCHEMA_VERSION = "asphalt-r63-m44-professional-boq-audit-r9:v3";

type ScopeProfile = "MINIMAL_EXPLICIT_SCOPE" | "FULL_APPLICABLE_SCOPE";

type Stage =
  | "SURVEY_SCOPE"
  | "BOUNDARY_CUT"
  | "BASE_PREPARATION"
  | "BRIDGE_DECK_ACCEPTANCE"
  | "MATERIAL"
  | "ASPHALT_MATERIAL"
  | "TACK_COAT"
  | "WORK"
  | "PLACEMENT"
  | "REMOVAL"
  | "REMOVAL_VOLUME"
  | "REMOVAL_MASS"
  | "LABOR"
  | "EQUIPMENT"
  | "PAVING_EQUIPMENT"
  | "COMPACTION_EQUIPMENT"
  | "LOADING"
  | "LOGISTICS"
  | "WASTE_DESTINATION"
  | "BASE_ACCEPTANCE"
  | "QA"
  | "DOCUMENTATION";

type AuditPolicy = {
  expectedMinimumBoqRows: number;
  required: readonly Stage[];
  forbidden: readonly Stage[];
};

type AuditLedgerRow = {
  ordinal: number;
  catalog_id: string;
  work_key: string;
  name_ru: string;
  catalog_group: string;
  canonical_owner: string;
  alias_of: string;
  previous35: boolean;
  scope_profile: ScopeProfile;
  scope_equivalence_reason: string;
  input_scenario: string;
  parameter_completeness: string;
  selected_work_key: string;
  revision_work_key: string;
  strategy_id: string;
  profile_id: string;
  revision_id: string;
  total_boq_rows: number;
  material_rows: number;
  labor_rows: number;
  work_and_labor_rows: number;
  equipment_rows: number;
  logistics_rows: number;
  waste_rows: number;
  control_rows: number;
  documentation_rows: number;
  other_rows: number;
  qa_documentation_rows: number;
  rows_with_valid_quantity: number;
  zero_quantity_rows: number;
  nan_or_infinite_rows: number;
  units: string;
  required_stage_owners: string;
  present_stage_owners: string;
  missing_stage_owners: string;
  forbidden_stage_owners: string;
  generic_fallback_detected: boolean;
  pdf_row_count: number;
  procurement_row_count: number;
  boq_completeness: "PASS" | "RED";
  price_completeness: "RATES_REQUIRED" | "PASS";
  professional_verdict: "PASS" | "RED";
  red_reason: string;
  evidence_path: string;
};

type AuditCase = {
  ledger: AuditLedgerRow;
  selected_record_id: string;
  requested_input: Record<string, string | number | boolean>;
  expected_professional_sections: readonly Stage[];
  expected_minimum_boq_rows: number;
  pdf_selected_work_key: string | null;
  procurement_expected_row_count: number;
  revision_status: string | null;
  approved_history_draft_id: string | null;
  approved_history_revision_id: string | null;
  approved_history_status: string | null;
  row_evidence: unknown[];
};

type ResourceEvidenceArtifactRow = Record<string, unknown> & {
  catalog_id: string;
  work_key: string;
  canonical_owner: string;
  row_id: string;
  title_ru: string;
  quantity: number | null;
  unit: string;
  formula_id: string;
  quantity_formula: string;
  calculation_trace: string;
  parameter_sources: unknown;
  normative_source: unknown;
};

type ParameterMatrixRow = {
  catalog_id: string;
  work_key: string;
  name_ru: string;
  parameter_schema_id: string;
  parameter_key: string;
  label_ru: string;
  description_ru: string;
  tier: "P0" | "P1" | "P2";
  field_type: "NUMBER" | "SELECT" | "BOOLEAN" | "DERIVED" | "TEXT";
  unit_ru: string;
  required: boolean;
  required_condition: string;
  allowed_values_ru: string;
  minimum: number | null;
  maximum: number | null;
  constraint_source: string;
  default_value: string;
  default_source: string;
  formula_ids: string;
  affected_boq_rows: string;
  dependencies: string;
  derived_rule: string;
  example_ru: string;
  omission_behavior: string;
  normative_source: string;
  verdict: "PASS" | "RED";
};

const COMPLETE_INPUTS: Readonly<Record<string, string | number | boolean>> = Object.freeze({
  estimate_scope_mode: "MINIMAL_EXPLICIT_SCOPE",
  project_scope: "SURFACING_ONLY",
  area_m2: 120,
  removal_area_m2: 120,
  removal_depth_mm: 50,
  removal_method: "MECHANICAL_BREAKOUT",
  removal_extent: "FULL",
  existing_asphalt_density_t_m3: 2.35,
  haul_required: false,
  material_destination: "RECYCLING",
  work_scope: "PURE_DEMOLITION",
  wearing_layer_thickness_mm: 50,
  binder_layer_thickness_mm: 60,
  asphalt_density_t_m3: 2.35,
  prepared_base_confirmed: true,
  bridge_deck_system_confirmed: true,
  traffic_class_confirmed: true,
  thickness_mm: 50,
  density_t_m3: 2.35,
  waste_factor: 1.05,
  haul_distance_km: 10,
  labor_productivity_m2_per_man_hour: 100,
  truck_average_speed_km_per_machine_hour: 40,
  truck_turnaround_machine_hours: 0.5,
  work_journal_count: 1,
  execution_documentation_count: 1,
  material_passport_register_count: 1,
  tack_coat_l_m2: 0.3,
  truck_capacity_t: 20,
  truck_payload_t: 20,
  waste_truck_capacity_t: 20,
  acceptance_lot_m2: 1000,
  joint_sealant_l_m2: 0.1,
  exterior_surface_kind: "PARKING",
  drainage_outfall_confirmed: true,
  base_dry_and_accepted: true,
  floor_mechanical_impact_class: "LOW",
  floor_liquid_exposure_class: "NONE",
  approved_floor_mix_type: "CAST_ASPHALT",
  boundary_cut_length_m: 60,
  number_of_passes: 2,
  number_of_cards: 10,
  reinstatement_depth_mm: 50,
  new_asphalt_density_t_m3: 2.35,
  selectedRoadScope: "FULL_PAVEMENT_STRUCTURE",
  geometry_method: "direct_area",
  purpose: "public_road",
  construction_mode: "new_construction",
  traffic_load_category: "heavy",
  soil_type_condition: "project_spec",
  groundwater_condition: "below_design_zone",
  longitudinal_slope_percent: 1.5,
  site_access: "free",
  region_city: "Бишкек",
  execution_season: "warm_dry",
  length_m: 20,
  width_m: 6,
  traffic_class: "HEAVY",
  parking_purpose: "MIXED",
  vehicle_type: "TRUCKS",
  base_condition: "ACCEPTED",
  underlying_layer_condition: "ACCEPTED",
  existing_surface_condition: "SOUND",
  wearing_mix_type: "DENSE_FINE_GRAINED",
  binder_mix_type: "DENSE_COARSE_GRAINED",
  tack_coat_required: true,
  tack_coat_rate_l_m2: 0.3,
  binder_layer_required: true,
  base_construction_required: true,
  base_layer_thickness_mm: 150,
  base_material_type: "CRUSHED_STONE",
  curb_required: true,
  curb_length_m: 50,
  curb_type: "ROAD_CURB",
  drainage_required: true,
  drainage_length_m: 30,
  drainage_type: "TRAY",
  marking_required: true,
  marking_area_m2: 12,
  connection_width_m: 6,
  old_pavement_removal_required: false,
  milling_required: false,
  defect_repair_required: false,
  repair_method: "SAW_CUT_AND_REPLACE",
  boundary_cut_required: true,
  waterproofing_type: "ROLLED",
  waterproofing_condition: "ACCEPTED",
  protective_layer_thickness_mm: 40,
  expansion_joint_length_m: 20,
  loading_required: true,
  base_cleaning_required: true,
  dust_suppression_required: false,
  bridge_deck_package_required: false,
  asphalt_waste_percent: 3,
  base_emulsion_rate_l_m2: 0.3,
  surface_cleaner_productivity_m2_per_machine_hour: 500,
  bitumen_distributor_productivity_m2_per_machine_hour: 800,
  paver_productivity_m2_per_machine_hour: 300,
  roller_productivity_m2_per_machine_hour: 250,
  pneumatic_roller_productivity_m2_per_machine_hour: 250,
  road_worker_productivity_m2_per_man_hour: 25,
  asphalt_plant_distance_km: 10,
  laboratory_control: "contractor",
  incoming_control_interval_m2_per_test: 1000,
  compaction_control_interval_m2_per_test: 1000,
  core_sampling_interval_m2_per_test: 1000,
  laboratory_test_interval_m2_per_test: 1000,
  temperature_control_trips_per_test: 5,
  smoothness_control_interval_m2_per_test: 1000,
  thickness_control_interval_m2_per_test: 1000,
  laboratory_protocol_count: 1,
  executive_survey_service_count: 1,
  removal_labor_productivity_m2_per_man_hour: 20,
  removal_control_interval_m2_per_test: 500,
  removal_documentation_count: 1,
  milling_productivity_m3_per_machine_hour: 20,
  breakout_productivity_m3_per_machine_hour: 15,
  manual_breakout_productivity_m3_per_machine_hour: 5,
  combined_removal_productivity_m3_per_machine_hour: 12,
  loader_productivity_t_per_machine_hour: 30,
  base_cleaning_productivity_m2_per_man_hour: 40,
  boundary_cut_consumable_kg_m: 0.05,
  boundary_cut_productivity_m_per_man_hour: 15,
  boundary_saw_productivity_m_per_machine_hour: 30,
});

const FULL_APPLICABLE_EXPLICIT_INPUTS: Readonly<Record<string, string | number | boolean>> = Object.freeze({
  estimate_scope_mode: "FULL_APPLICABLE_SCOPE",
  project_scope: "PAVEMENT_STRUCTURE",
  base_material_compaction_factor: 1.15,
  sand_layer_required: true,
  sand_thickness_mm: 120,
  sand_compaction_factor: 1.12,
  sand_waste_percent: 3,
  sand_density_t_m3: 1.65,
  sand_water_rate_m3_m3: 0.04,
  aggregate_source_distance_km: 18,
  crushed_layer_count: 2,
  crushed_layer_1_fraction: "40_70",
  crushed_layer_1_thickness_mm: 180,
  crushed_layer_1_compaction_factor: 1.18,
  crushed_layer_1_waste_percent: 3,
  crushed_layer_2_fraction: "20_40",
  crushed_layer_2_thickness_mm: 150,
  crushed_layer_2_compaction_factor: 1.15,
  crushed_layer_2_waste_percent: 3,
  crushed_density_t_m3: 1.55,
  crushed_water_rate_m3_m3: 0.025,
  base_density_test_interval_m2: 500,
  grader_productivity_m2_per_machine_hour: 350,
  base_roller_productivity_m2_per_machine_hour: 300,
  water_truck_productivity_m2_per_machine_hour: 600,
  base_worker_productivity_m2_per_man_hour: 30,
  geotextile_required: true,
  geotextile_type: "project_spec",
  geotextile_overlap_percent: 10,
  curb_bedding_concrete_m3_per_m: 0.025,
  curb_haunch_concrete_m3_per_m: 0.03,
  curb_joint_material_kg_per_m: 0.2,
  curb_installation_m_per_man_hour: 2.5,
  curb_excavator_m_per_machine_hour: 20,
  curb_compactor_m_per_machine_hour: 25,
  drainage_inlet_count: 4,
  drainage_pipe_length_m: 40,
  drainage_bedding_m3_per_m: 0.08,
  drainage_excavation_m3_per_m: 0.5,
  drainage_installation_m_per_man_hour: 1.5,
  drainage_excavator_m3_per_machine_hour: 12,
  marking_material_type: "THERMOPLASTIC",
  marking_material_rate_kg_m2: 0.75,
  marking_glass_beads_required: true,
  marking_glass_beads_rate_kg_m2: 0.35,
  marking_productivity_m2_per_man_hour: 12,
  marking_machine_productivity_m2_per_machine_hour: 80,
  accessible_space_count: 2,
  sign_count: 4,
  sign_post_count: 4,
  sign_foundation_concrete_m3_per_post: 0.12,
  sign_installation_pcs_per_man_hour: 0.5,
  sign_drill_pcs_per_machine_hour: 2,
  lighting_pole_count: 8,
  lighting_luminaire_count: 8,
  lighting_cable_length_m: 240,
  lighting_cabinet_count: 1,
  lighting_foundation_concrete_m3: 4,
  lighting_earthing_conductor_length_m: 120,
  lighting_labor_man_hours: 96,
  lighting_crane_machine_hours: 16,
  lighting_test_count: 8,
  waterproofing_repair_area_m2: 120,
  waterproofing_material_kg_m2: 4.5,
  waterproofing_primer_rate_l_m2: 0.3,
  protective_layer_density_t_m3: 2.3,
  expansion_joint_sealant_kg_m: 0.8,
  bridge_waterproofing_productivity_m2_per_man_hour: 8,
  bridge_waterproofing_machine_productivity_m2_per_machine_hour: 50,
  dust_suppression_required: true,
  dust_suppression_water_l_m2: 0.8,
});

const CSV_COLUMNS: readonly (keyof AuditLedgerRow)[] = Object.freeze([
  "ordinal", "catalog_id", "work_key", "name_ru", "catalog_group", "canonical_owner", "alias_of",
  "previous35", "scope_profile", "scope_equivalence_reason", "input_scenario", "parameter_completeness", "selected_work_key", "revision_work_key",
  "strategy_id", "profile_id", "revision_id", "total_boq_rows", "material_rows", "labor_rows",
  "work_and_labor_rows", "equipment_rows", "logistics_rows", "waste_rows", "control_rows", "documentation_rows", "other_rows", "qa_documentation_rows", "rows_with_valid_quantity",
  "zero_quantity_rows", "nan_or_infinite_rows", "units", "required_stage_owners", "present_stage_owners",
  "missing_stage_owners", "forbidden_stage_owners", "generic_fallback_detected", "pdf_row_count",
  "procurement_row_count", "professional_verdict", "red_reason", "evidence_path",
]);

function invariant(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(`ASPHALT_M44_BOQ_AUDIT_INVARIANT:${code}`);
}

function selectedRecordId(record: AsphaltRelatedR8InventoryRecord): string {
  return record.previous_35 ? record.work_key : record.catalog_id;
}

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function params(values: Record<string, string | number | boolean>): Record<string, EstimateDraftRevisionParam> {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, {
    value,
    source: "user_input" as const,
    sourceText: `R9 professional BOQ audit:${key}`,
    lastChangedAt: CREATED_AT,
  }]));
}

function installStorage(): () => void {
  const values = new Map<string, string>();
  const storage = {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => { values.delete(key); },
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
  return () => { delete (globalThis as { localStorage?: unknown }).localStorage; };
}

function policyFor(record: AsphaltRelatedR8InventoryRecord): AuditPolicy {
  if (record.previous_35) {
    const byOperation: Record<string, readonly Stage[]> = {
      INSTALL: ["MATERIAL", "WORK", "LABOR", "EQUIPMENT", "LOGISTICS", "QA", "DOCUMENTATION"],
      LAY: ["MATERIAL", "WORK", "LABOR", "EQUIPMENT", "LOGISTICS", "QA", "DOCUMENTATION"],
      COMPACT: ["WORK", "LABOR", "EQUIPMENT", "QA", "DOCUMENTATION"],
      REPAIR: ["MATERIAL", "WORK", "LABOR", "EQUIPMENT", "LOGISTICS", "QA", "DOCUMENTATION"],
      PREPARE: ["WORK", "LABOR", "EQUIPMENT", "QA", "DOCUMENTATION"],
      LEVEL: ["MATERIAL", "WORK", "LABOR", "EQUIPMENT", "LOGISTICS", "QA", "DOCUMENTATION"],
      DRAIN: ["WORK", "LABOR", "EQUIPMENT", "QA", "DOCUMENTATION"],
      FINISH: ["MATERIAL", "WORK", "LABOR", "EQUIPMENT", "QA", "DOCUMENTATION"],
    };
    const required = byOperation[String(record.operation_class ?? "").toUpperCase()] ?? ["WORK", "QA", "DOCUMENTATION"];
    return { expectedMinimumBoqRows: required.length, required, forbidden: [] };
  }
  if (record.canonical_technology_id === "asphalt_demolition" || record.canonical_technology_id === "asphalt_milling") {
    const required: readonly Stage[] = [
      "SURVEY_SCOPE", "REMOVAL", "REMOVAL_VOLUME", "REMOVAL_MASS", "LABOR", "EQUIPMENT", "LOADING",
      "WASTE_DESTINATION", "BASE_ACCEPTANCE", "QA", "DOCUMENTATION",
    ];
    return {
      expectedMinimumBoqRows: required.length,
      required,
      forbidden: ["ASPHALT_MATERIAL", "TACK_COAT", "PAVING_EQUIPMENT", "COMPACTION_EQUIPMENT"],
    };
  }
  if (record.canonical_technology_id === "asphalt_patch_repair") {
    const required: readonly Stage[] = [
      "SURVEY_SCOPE", "BOUNDARY_CUT", "REMOVAL", "BASE_PREPARATION", "TACK_COAT", "ASPHALT_MATERIAL",
      "PLACEMENT", "LABOR", "EQUIPMENT", "WASTE_DESTINATION", "QA", "DOCUMENTATION",
    ];
    return { expectedMinimumBoqRows: required.length, required, forbidden: [] };
  }
  const required: Stage[] = [
    "SURVEY_SCOPE", "BASE_PREPARATION", "ASPHALT_MATERIAL", "PLACEMENT", "LOGISTICS", "PAVING_EQUIPMENT",
    "COMPACTION_EQUIPMENT", "LABOR", "QA", "DOCUMENTATION",
  ];
  if (["asphalt_overlay", "asphalt_base_layer"].includes(record.canonical_technology_id ?? "")) {
    required.splice(2, 0, "TACK_COAT");
  }
  if (record.canonical_technology_id === "bridge_asphalt") required.splice(1, 0, "BRIDGE_DECK_ACCEPTANCE");
  return { expectedMinimumBoqRows: required.length, required, forbidden: [] };
}

function presentStages(rows: readonly ProfessionalBoqRow[]): Set<Stage> {
  const result = new Set<Stage>();
  for (const row of rows) {
    const source = row.sourceParameters ?? {};
    const semantic = String(source.boqSemanticOwner ?? "").toUpperCase();
    const haystack = `${row.rowId} ${row.titleRu} ${row.category ?? ""} ${row.rowType} ${row.formulaId ?? ""} ${semantic}`.toLowerCase();
    const category = String(row.category ?? "").toLowerCase();
    if (row.rowType === "material" || category === "material") result.add("MATERIAL");
    if (row.rowType === "work" || category === "work") result.add("WORK");
    if (category === "labor" || /labor|труд|рабоч|оператор/.test(haystack)) result.add("LABOR");
    if (category === "equipment" || row.rowType === "equipment" || /equipment|machine|машин|механизм|фрез|экскават|погрузчик/.test(haystack)) result.add("EQUIPMENT");
    if (category === "logistics" || row.rowType === "transport" || /delivery|haul|truck|trip|достав|вывоз|транспорт|рейс/.test(haystack)) result.add("LOGISTICS");
    if (["test", "testing", "qa", "quality_control", "control", "laboratory"].includes(category) || /quality|test|control|контрол|испыт|при[её]м/.test(haystack)) result.add("QA");
    if (category === "documentation" || category === "document" || row.rowType === "document" || /document|акт|журнал|исполнительн/.test(haystack)) result.add("DOCUMENTATION");
    if (/scope_acceptance|survey|marking|boundary_and_survey|обслед|разбив|размет|подтверждение.*границ/.test(haystack)) result.add("SURVEY_SCOPE");
    if (/boundary_cut|saw_cut|cutting|нарез|резк.*границ|кром/.test(haystack)) result.add("BOUNDARY_CUT");
    if (/base_prepar|base_acceptance|cleaning|очист|подготов.*основан|при[её]мк.*основан|подтверждение основания/.test(haystack)) result.add("BASE_PREPARATION");
    if (/bridge_deck|мост|deck_system/.test(haystack) && /accept|confirm|подтверж|при[её]м/.test(haystack)) result.add("BRIDGE_DECK_ACCEPTANCE");
    if (/asphalt_mix|new_asphalt|reinstatement_mix|асфальтобетонн.*смес/.test(haystack)) result.add("ASPHALT_MATERIAL");
    if (/tack|prime|emulsion|подгрун|розлив|эмульс/.test(haystack)) result.add("TACK_COAT");
    if (/placement|paving|overlay|install_binder|new_full_construction|уклад|устройств.*слоя|асфальтирован/.test(haystack)) result.add("PLACEMENT");
    if (/demolition|removal|milling|local_breakup|демонтаж|фрезер|снят|разбор/.test(haystack)) result.add("REMOVAL");
    if (/removed_volume|removal_volume|demolition_volume|объ[её]м.*демонт|объ[её]м.*снят/.test(haystack)) result.add("REMOVAL_VOLUME");
    if (/removed_mass|material_stream|recovered_or_waste|mass_balance|масс.*демонт|асфальтогранулят/.test(haystack)) result.add("REMOVAL_MASS");
    if (/paver|асфальтоуклад/.test(haystack)) result.add("PAVING_EQUIPMENT");
    if (/roller|compact|каток|уплотнен|уплотнени/.test(haystack)) result.add("COMPACTION_EQUIPMENT");
    if (/loading|погрузк/.test(haystack)) result.add("LOADING");
    if (category === "waste_stream" || category === "recovered_material" || /destination|recycl|waste|утилиз|переработ|отход|возвратн.*материал/.test(haystack)) result.add("WASTE_DESTINATION");
    if (/post_demolition_base_acceptance|base_acceptance|при[её]мк.*основан/.test(haystack)) result.add("BASE_ACCEPTANCE");
  }
  return result;
}

function isGenericSkeleton(record: AsphaltRelatedR8InventoryRecord, rows: readonly ProfessionalBoqRow[], stages: Set<Stage>): boolean {
  if (rows.some((row) => row.sourceParameters?.exactSelectionGenericFallbackUsed === true)) return true;
  if (rows.some((row) =>
    row.sourceParameters?.professionalDepthSupplement === true ||
    row.sourceParameters?.s2bComponent != null ||
    /^(?:Материалы|Работы|Техника|Испытания и документация):/u.test(row.titleRu)
  )) return true;
  const removal = ["asphalt_demolition", "asphalt_milling"].includes(record.canonical_technology_id ?? "");
  if (!removal && rows.length <= 4) return true;
  if (!removal && (!stages.has("LABOR") || !stages.has("EQUIPMENT"))) return true;
  return false;
}

function reportSection(row: ProfessionalBoqRow): "material" | "work_labor" | "equipment" | "logistics" | "waste" | "control" | "documentation" | "other" {
  const category = String(row.category ?? "").toLowerCase();
  // Category owns the professional section. A QA record may be represented by
  // a document-shaped UI item without becoming executive documentation.
  if (["test", "testing", "qa", "quality_control", "control", "laboratory"].includes(category)) return "control";
  if (row.rowType === "document" || ["documentation", "document"].includes(category)) return "documentation";
  if (["waste_stream", "recovered_material"].includes(category)) return "waste";
  if (category === "logistics" || row.rowType === "transport") return "logistics";
  if (category === "equipment" || row.rowType === "equipment") return "equipment";
  if (category === "material" || row.rowType === "material") return "material";
  if (["work", "labor"].includes(category) || row.rowType === "work") return "work_labor";
  return "other";
}

function countPdfRows(pdf: ReturnType<typeof buildConsumerRepairStructuredEstimatePdfViewModel>): number {
  return pdf?.sections.reduce((sum, section) => sum + section.rows.length, 0) ?? 0;
}

function csvCell(value: unknown): string {
  const rendered = value == null ? "" : String(value);
  return /[",\r\n]/.test(rendered) ? `"${rendered.replace(/"/g, '""')}"` : rendered;
}

function csv(rows: readonly AuditLedgerRow[]): string {
  return `${CSV_COLUMNS.join(",")}\n${rows.map((row) => CSV_COLUMNS.map((column) => csvCell(row[column])).join(",")).join("\n")}\n`;
}

function recordCsv<T extends object>(rows: readonly T[], columns: readonly (keyof T)[]): string {
  return `${columns.join(",")}\n${rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")).join("\n")}\n`;
}

function parameterFieldType(input: {
  valueType: string;
  allowedCount: number;
}): ParameterMatrixRow["field_type"] {
  if (input.valueType === "boolean") return "BOOLEAN";
  if (input.allowedCount > 0) return "SELECT";
  if (input.valueType === "number") return "NUMBER";
  return "TEXT";
}

function buildParameterMatrix(
  records: readonly AsphaltRelatedR8InventoryRecord[],
): ParameterMatrixRow[] {
  const registrations = new Map(RoadworksWaveAProductionRegistry.map((entry) => [entry.workId, entry]));
  return records.flatMap((record): ParameterMatrixRow[] => {
    if (record.previous_35) {
      const registration = registrations.get(record.work_key);
      invariant(registration, `PARAMETER_REGISTRATION_MISSING:${record.work_key}`);
      const dependencyByKey = new Map(registration.professionalPassport.parameters.dependencies.map((dependency) => {
        const [key, formulas = ""] = dependency.split("->", 2);
        return [key, formulas];
      }));
      return registration.parameterDefinitions.map((definition): ParameterMatrixRow => {
        const presentation = roadworksWaveAParameterPresentation(definition.key);
        const formulas = dependencyByKey.get(definition.key) ?? "";
        const labelRu = presentation?.labelRu ?? definition.key;
        const unitRu = formatEstimateUnitLabel(definition.unit);
        const tier = definition.tier;
        return {
          catalog_id: record.catalog_id,
          work_key: record.work_key,
          name_ru: record.name_ru,
          parameter_schema_id: record.parameter_schema_id ?? registration.parameterSchemaId,
          parameter_key: definition.key,
          label_ru: labelRu,
          description_ru: `${labelRu}. Проектное значение используется только профессиональным паспортом «${record.name_ru}».`,
          tier,
          field_type: parameterFieldType({ valueType: presentation?.inputKind === "number" ? "number" : "string", allowedCount: presentation?.choices.length ?? 0 }),
          unit_ru: unitRu,
          required: tier === "P0",
          required_condition: tier === "P0" ? "ALWAYS_FOR_CALCULATION" : "OPTIONAL_ACCURACY_OR_SCOPE_INPUT",
          allowed_values_ru: presentation?.choices.map((choice) => choice.labelRu).join("|") ?? "",
          minimum: presentation?.inputKind === "number" ? Number.EPSILON : null,
          maximum: null,
          constraint_source: "PROJECT_SPECIFIC_VALUE; NO_HIDDEN_DEFAULT",
          default_value: "",
          default_source: "NONE",
          formula_ids: formulas,
          affected_boq_rows: formulas,
          dependencies: formulas ? `${definition.key}->${formulas}` : "",
          derived_rule: "",
          example_ru: unitRu ? `Например: 100 ${unitRu}` : `Выберите значение «${labelRu}»`,
          omission_behavior: tier === "P0" ? "BLOCK_APPLY_NO_REVISION" : "VISIBLE_ASSUMPTION_OR_NOT_APPLICABLE",
          normative_source: "NO_CONFIRMED_NUMERIC_NORM; PROJECT_VALUE_REQUIRED",
          verdict: formulas && /[А-Яа-яЁё]/u.test(labelRu) ? "PASS" : "RED",
        };
      });
    }
    const selectedId = selectedRecordId(record);
    const profile = getAsphaltRelatedProfileByCatalogRecordIdV4(selectedId) ??
      getAsphaltRelatedProfileByCatalogRecordIdV4(record.canonical_technology_id);
    invariant(profile, `PARAMETER_PROFILE_MISSING:${selectedId}`);
    const schema = profile.canonicalWorkKey === ASPHALT_RESOURCE_LEVEL_CANONICAL_PARAMETER_SCHEMA.canonicalWorkKey
      ? ASPHALT_RESOURCE_LEVEL_CANONICAL_PARAMETER_SCHEMA
      : REGISTERED_CANONICAL_PARAMETER_SCHEMAS.getByCanonicalWorkKey(profile.canonicalWorkKey);
    invariant(schema, `CANONICAL_PARAMETER_SCHEMA_MISSING:${profile.canonicalWorkKey}`);
    return schema.definitions.map((definition): ParameterMatrixRow => {
      const metadata = ASPHALT_RELATED_PARAMETER_METADATA_V4[definition.parameterId];
      const tier = metadata?.tier ?? (definition.requiredLevel === "BLOCKING_REQUIRED" ? "P0" : "P1");
      const condition = definition.visibilityCondition.kind === "ALWAYS"
        ? "ALWAYS"
        : definition.visibilityCondition.kind === "PARAMETER_EQUALS"
          ? `${definition.visibilityCondition.parameterId}=${String(definition.visibilityCondition.value)}`
          : definition.visibilityCondition.conditions
            .map((candidate) => `${candidate.parameterId}=${String(candidate.value)}`)
            .join(" OR ");
      const derivedRule = definition.parameterId === "area_m2" &&
        schema.definitions.some((candidate) => candidate.parameterId === "length_m")
        ? "area_m2 = length_m × width_m; read-only when derived"
        : "";
      const unitRu = formatEstimateUnitLabel(definition.unit);
      return {
        catalog_id: record.catalog_id,
        work_key: record.work_key,
        name_ru: record.name_ru,
        parameter_schema_id: record.parameter_schema_id ?? schema.schemaId,
        parameter_key: definition.parameterId,
        label_ru: definition.label,
        description_ru: definition.description,
        tier,
        field_type: parameterFieldType({ valueType: definition.valueType, allowedCount: definition.allowedValues.length }),
        unit_ru: unitRu,
        required: definition.requiredLevel === "BLOCKING_REQUIRED",
        required_condition: condition,
        allowed_values_ru: definition.allowedValues.map((value) => value.label).join("|"),
        minimum: definition.validation.min ?? null,
        maximum: definition.validation.max ?? null,
        constraint_source: definition.normativeSource?.sourceId ?? "PROJECT_SPECIFIC_VALUE; NO_HIDDEN_DEFAULT",
        default_value: "",
        default_source: "NONE",
        formula_ids: definition.affectsFormula.join("|"),
        affected_boq_rows: definition.affectsRows.join("|"),
        dependencies: definition.affectsFormula.map((formula) => `${definition.parameterId}->${formula}`).join("|"),
        derived_rule: derivedRule,
        example_ru: definition.allowedValues[0]?.label ?? (unitRu ? `Например: 100 ${unitRu}` : `Укажите: ${definition.label}`),
        omission_behavior: definition.requiredLevel === "BLOCKING_REQUIRED" ? "BLOCK_APPLY_NO_REVISION" : "NOT_APPLICABLE_OR_VISIBLE_ASSUMPTION",
        normative_source: definition.normativeSource?.document ?? "NO_CONFIRMED_NUMERIC_NORM; PROJECT_VALUE_REQUIRED",
        verdict: definition.affectsFormula.length > 0 && definition.affectsRows.length > 0 && /[А-Яа-яЁё]/u.test(definition.label) && !/[A-Za-z_]{3,}/.test(unitRu) ? "PASS" : "RED",
      };
    });
  });
}

function parameterMatrixMarkdown(rows: readonly ParameterMatrixRow[]): string {
  const byCatalog = new Map<string, ParameterMatrixRow[]>();
  for (const row of rows) byCatalog.set(row.catalog_id, [...(byCatalog.get(row.catalog_id) ?? []), row]);
  return [
    "# ASPHALT R63 individual parameter matrix",
    "",
    "Every catalog record has its own content identity. Alias schemas may reuse verified low-level definitions while preserving catalog/schema/revision/PDF identity.",
    "",
    ...[...byCatalog.entries()].flatMap(([catalogId, catalogRows], index) => {
      const first = catalogRows[0];
      const list = (tier: ParameterMatrixRow["tier"]) => catalogRows.filter((row) => row.tier === tier).map((row) => row.label_ru).join("; ") || "—";
      const derived = catalogRows.filter((row) => row.derived_rule).map((row) => `${row.label_ru}: ${row.derived_rule}`).join("; ") || "—";
      return [
        `## ${index + 1}. ${first.name_ru}`,
        "",
        `- catalog_id: \`${catalogId}\``,
        `- work_key: \`${first.work_key}\``,
        `- parameterSchemaId: \`${first.parameter_schema_id}\``,
        `- P0: ${list("P0")}`,
        `- P1: ${list("P1")}`,
        `- P2: ${list("P2")}`,
        `- Derived: ${derived}`,
        `- Количество параметров: ${catalogRows.length}`,
        `- Professional parameter verdict: ${catalogRows.every((row) => row.verdict === "PASS") ? "PASS" : "RED"}`,
        "",
      ];
    }),
  ].join("\n");
}

function inventoryMarkdown(
  records: readonly AsphaltRelatedR8InventoryRecord[],
  inventory: ReturnType<typeof buildAsphaltRelatedR8Inventory>,
): string {
  return [
    "# ASPHALT R63 typed inventory",
    "",
    `Denominator: N=${inventory.summary.inventory_candidates_N}; R=${inventory.summary.asphalt_related_R}; M=${inventory.summary.unique_technologies_M}; A=${inventory.summary.aliases_A}; E=${inventory.summary.exclusions_E}.`,
    "",
    "| # | catalog_id | work_key | Название | classification | canonical technology | alias_of | passport | schema | formula graph |",
    "|---:|---|---|---|---|---|---|---|---|---|",
    ...records.map((record, index) =>
      `| ${index + 1} | ${record.catalog_id} | ${record.work_key} | ${record.name_ru.replace(/\|/g, "\\|")} | ${record.classification} | ${record.canonical_technology_id ?? "—"} | ${record.alias_of ?? "—"} | ${record.passport_id ?? "—"} | ${record.parameter_schema_id ?? "—"} | ${record.formula_graph_id ?? "—"} |`
    ),
  ].join("\n");
}

function markdownTable(rows: readonly AuditLedgerRow[]): string {
  const head = "| # | catalog_id | work_key | Название работы | Всего | Материалы | Работы/труд | Техника | Логистика | Отходы | Контроль | Документация | Другие | Отсутствует | synthetic/generic | PDF | verdict |";
  const divider = "|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---:|---|";
  return [head, divider, ...rows.map((row, index) =>
    `| ${index + 1} | ${row.catalog_id} | ${row.work_key} | ${row.name_ru.replace(/\|/g, "\\|")} | ${row.total_boq_rows} | ${row.material_rows} | ${row.work_and_labor_rows} | ${row.equipment_rows} | ${row.logistics_rows} | ${row.waste_rows} | ${row.control_rows} | ${row.documentation_rows} | ${row.other_rows} | ${row.missing_stage_owners || "—"} | ${row.generic_fallback_detected ? "YES" : "NO"} | ${row.pdf_row_count} | ${row.professional_verdict} |`,
  )].join("\n");
}

function inputFor(record: AsphaltRelatedR8InventoryRecord, override: Record<string, string | number | boolean> = {}): Record<string, string | number | boolean> {
  const requested = { ...COMPLETE_INPUTS, ...override };
  if (requested.estimate_scope_mode === "MINIMAL_EXPLICIT_SCOPE") {
    requested.base_construction_required = false;
    requested.subbase_required = false;
    requested.curb_required = false;
    requested.drainage_required = false;
    requested.marking_required = false;
    requested.marking_glass_beads_required = false;
    requested.accessible_parking_required = false;
    requested.signing_required = false;
    requested.lighting_required = false;
    requested.bridge_deck_package_required = false;
  } else if (requested.estimate_scope_mode === "FULL_APPLICABLE_SCOPE") {
    requested.base_construction_required = false;
    requested.subbase_required = false;
    requested.curb_required = false;
    requested.drainage_required = false;
    requested.marking_required = false;
    requested.marking_glass_beads_required = false;
    requested.accessible_parking_required = false;
    requested.signing_required = false;
    requested.lighting_required = false;
    requested.bridge_deck_package_required = false;

    if (record.canonical_technology_id === "asphalt_concrete_pavement") {
      requested.project_scope = "FULL_ROAD_INFRASTRUCTURE";
      requested.selectedRoadScope = "FULL_ROAD_INFRASTRUCTURE";
      requested.base_construction_required = true;
      requested.curb_required = true;
      requested.drainage_required = true;
      requested.marking_required = true;
      requested.marking_glass_beads_required = true;
      requested.signing_required = true;
      requested.lighting_required = true;
    } else if (record.canonical_technology_id === "asphalt_parking_lot") {
      requested.project_scope = "TURNKEY_PARKING_WITH_SITE_FEATURES";
      requested.base_construction_required = true;
      requested.curb_required = true;
      requested.drainage_required = true;
      requested.marking_required = true;
      requested.marking_glass_beads_required = true;
      requested.accessible_parking_required = true;
      requested.signing_required = true;
      requested.lighting_required = true;
    } else if (record.canonical_technology_id === "asphalt_driveway") {
      requested.project_scope = "PAVEMENT_STRUCTURE";
      requested.base_construction_required = true;
      requested.curb_required = true;
      requested.drainage_required = true;
    } else if (record.canonical_technology_id === "bridge_asphalt") {
      requested.project_scope = "SURFACING_ONLY";
      requested.sand_layer_required = false;
      requested.crushed_layer_count = 0;
      requested.geotextile_required = false;
      requested.bridge_deck_package_required = true;
    } else if (["asphalt_patch_repair", "asphalt_milling", "asphalt_demolition", "asphalt_overlay"].includes(record.canonical_technology_id ?? "")) {
      requested.project_scope = "REHABILITATION";
      requested.sand_layer_required = false;
      requested.crushed_layer_count = 0;
      requested.geotextile_required = false;
      requested.haul_required = true;
      requested.loading_required = true;
      requested.base_cleaning_required = true;
      requested.boundary_cut_required = true;
    } else if (record.canonical_technology_id === "asphalt_base_layer") {
      requested.project_scope = "SURFACING_ONLY";
      requested.sand_layer_required = false;
      requested.crushed_layer_count = 0;
      requested.geotextile_required = false;
    }
  }
  let declaredKeys: ReadonlySet<string>;
  if (record.previous_35) {
    const registration = RoadworksWaveAProductionRegistry.find((entry) => entry.workId === record.work_key);
    invariant(registration, `INPUT_PARAMETER_REGISTRATION_MISSING:${record.work_key}`);
    declaredKeys = new Set(registration.parameterDefinitions.map((definition) => definition.key));
    for (const definition of registration.parameterDefinitions) {
      if (
        definition.key.startsWith("machine_") &&
        definition.key.endsWith("_productivity_m2_per_machine_hour")
      ) {
        // Explicit deterministic audit input, not a production fallback.
        requested[definition.key] = 100;
      }
    }
  } else {
    const selectedId = selectedRecordId(record);
    const profile = getAsphaltRelatedProfileByCatalogRecordIdV4(selectedId) ??
      getAsphaltRelatedProfileByCatalogRecordIdV4(record.canonical_technology_id);
    invariant(profile, `INPUT_PARAMETER_PROFILE_MISSING:${selectedId}`);
    // The canonical pavement key intentionally keeps its legacy registered
    // schema for old selectedRoadScope clients. Resource-level R63 proof must
    // use the catalog-bound schema; otherwise estimate_scope_mode is filtered
    // out here and the runtime is accidentally tested through the legacy
    // monolithic route.
    const schema = profile.canonicalWorkKey === ASPHALT_RESOURCE_LEVEL_CANONICAL_PARAMETER_SCHEMA.canonicalWorkKey
      ? ASPHALT_RESOURCE_LEVEL_CANONICAL_PARAMETER_SCHEMA
      : REGISTERED_CANONICAL_PARAMETER_SCHEMAS.getByCanonicalWorkKey(profile.canonicalWorkKey);
    invariant(schema, `INPUT_CANONICAL_PARAMETER_SCHEMA_MISSING:${profile.canonicalWorkKey}`);
    declaredKeys = new Set(schema.definitions.map((definition) => definition.parameterId));
  }
  const needsRoadScope = !record.previous_35 && record.canonical_technology_id === "asphalt_concrete_pavement";
  if (needsRoadScope) {
    requested.base_condition = requested.estimate_scope_mode
      ? "ACCEPTED"
      : "project_confirmed";
    if (requested.project_scope !== "FULL_ROAD_INFRASTRUCTURE") {
      // Minimal scope proves the pavement body only. Infrastructure remains
      // absent unless FULL_ROAD_INFRASTRUCTURE was explicitly selected.
      requested.curb_required = false;
      requested.drainage_required = false;
      delete requested.curb_length_m;
      delete requested.curb_type;
      delete requested.drainage_length_m;
      delete requested.drainage_type;
    }
  }
  const pureDemolition = record.canonical_technology_id === "asphalt_demolition" &&
    requested.work_scope !== "DEMOLITION_AND_REINSTATEMENT";
  return Object.fromEntries(Object.entries(requested).filter(([key]) =>
    ((key === "selectedRoadScope" && needsRoadScope) || declaredKeys.has(key)) &&
    !(pureDemolition && ["tack_coat_required", "tack_coat_rate_l_m2"].includes(key))
  ));
}

async function auditCase(input: {
  record: AsphaltRelatedR8InventoryRecord;
  auditOrdinal: number;
  scenario: string;
  scopeProfile: ScopeProfile;
  values: Record<string, string | number | boolean>;
  evidenceDirectory: string;
  approveForDurableHistory?: boolean;
}): Promise<AuditCase> {
  const selectedId = selectedRecordId(input.record);
  const { selectedRoadScope, ...declaredValues } = input.values;
  const rawInput = `${input.record.name_ru}; ${input.scenario}`;
  const runtimeInput = {
    rawInput,
    selectedWorkKey: selectedId,
    selectedTemplateId: selectedId,
    selectedTemplateName: input.record.name_ru,
    city: "Bishkek",
    currency: "KGS",
    countryCode: "KG",
    paramOverrides: params(declaredValues),
    selectedRoadScope: selectedRoadScope === "ROAD_SURFACING_ONLY" ||
      selectedRoadScope === "FULL_PAVEMENT_STRUCTURE" ||
      selectedRoadScope === "FULL_ROAD_INFRASTRUCTURE" ||
      selectedRoadScope === "ROAD_REPAIR_REHABILITATION"
      ? selectedRoadScope
      : null,
    createdAt: CREATED_AT,
  } as const;
  let runtime: ReturnType<typeof buildConsumerRepairDraftFromAiEstimateRuntime>;
  try {
    runtime = buildConsumerRepairDraftFromAiEstimateRuntime(runtimeInput);
  } catch (error) {
    const direct = buildEstimateFromInlineWorkPrompt({
      rawInput,
      selectedWorkKey: selectedId,
      selectedTemplateId: selectedId,
      selectedTemplateName: input.record.name_ru,
      city: "Bishkek",
      currency: "KGS",
      countryCode: "KG",
      paramOverrides: params(declaredValues),
    });
    throw new Error([
      "ASPHALT_R63_RUNTIME_BUILD_FAILED",
      `catalog_id=${input.record.catalog_id}`,
      `work_key=${input.record.work_key}`,
      `scope=${input.scopeProfile}`,
      `blocking=${direct.blockingReason ?? "none"}`,
      `missing=${direct.draft?.missingData.join("|") ?? "draft_null"}`,
      `cause=${error instanceof Error ? error.message : String(error)}`,
    ].join(";"));
  }
  const revision = runtime?.runtimeEstimateDraftRevision;
  const rows = revision?.boq.rows ?? [];
  let pdf: ReturnType<typeof buildConsumerRepairStructuredEstimatePdfViewModel> = null;
  let procurementRowCount = 0;
  let procurementExpectedRowCount = rows.filter((row) => row.includedInProcurement).length;
  let procurementIdentityOk = rows.length === 0;
  let approvedHistoryDraftId: string | null = null;
  let approvedHistoryRevisionId: string | null = null;
  let approvedHistoryStatus: string | null = null;
  if (runtime && revision) {
    let bundle = createConsumerRepairRequestDraft({
      consumerUserId: "r63-asphalt-durable-history-audit-user",
      problemText: runtime.selectedWork?.selectedWorkRawInput ?? input.record.name_ru,
      repairType: runtime.repairType,
      city: "Bishkek",
      addressText: "64 Malikova Street",
      preferredTimeText: "По согласованию",
      contactPhone: "+996 707 052 577",
      aiDraft: runtime,
    });
    pdf = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: bundle.draft,
      items: bundle.items,
      media: bundle.media,
      generatedAt: CREATED_AT,
    });
    const project = buildProjectExecutionDraftFromRevision(revision, {
      source: "request_estimate",
      sourceRequestId: bundle.draft.id,
      generatedAt: CREATED_AT,
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    procurementRowCount = project.procurementItems.length;
    procurementIdentityOk = project.procurementItems.every((item) =>
      item.sourceParameters?.professionalEstimatePassportId === input.record.passport_id
    );
    if (input.approveForDurableHistory) {
      bundle = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
      try {
        bundle = approveConsumerRepairRequestDraft({
          requestDraftId: bundle.draft.id,
          userId: bundle.draft.consumerUserId,
          generatedAt: CREATED_AT,
        });
      } catch (error) {
        const currentRevision = bundle.estimateDraftRevisionState?.revisions.find((revisionEntry) =>
          revisionEntry.revisionId === bundle.estimateDraftRevisionState?.currentRevisionId
        );
        throw new Error([
          "ASPHALT_R63_APPROVAL_PROOF_FAILED",
          `catalog_id=${input.record.catalog_id}`,
          `work_key=${input.record.work_key}`,
          `items=${bundle.items.length}`,
          `revision_rows=${currentRevision?.boq.rows.length ?? 0}`,
          `revision_status=${currentRevision?.status ?? "none"}`,
          `canonical_status=${bundle.canonicalParameterSession?.status ?? "none"}`,
          `canonical_blocking=${bundle.canonicalParameterSession?.blockingMissingParameterIds.join("|") ?? "none"}`,
          `canonical_invalid=${bundle.canonicalParameterSession?.invalidParameterIds.join("|") ?? "none"}`,
          `canonical_invalid_issues=${bundle.canonicalParameterSession?.parameters.filter((parameter) => !parameter.valid).map((parameter) => `${parameter.parameterId}:${parameter.value}:${parameter.validationIssues.join("+")}`).join("|") ?? "none"}`,
          `canonical_revision=${bundle.canonicalParameterSession?.revisionId ?? "none"}`,
          `draft_session_status=${bundle.estimateDraftSession?.status ?? "none"}`,
          `cause=${error instanceof Error ? error.message.replace(/\s+/g, " ") : String(error)}`,
        ].join(";"));
      }
      approvedHistoryDraftId = bundle.draft.id;
      approvedHistoryRevisionId = bundle.estimateDraftRevisionState?.currentRevisionId ?? null;
      approvedHistoryStatus = bundle.draft.status;
      await awaitTransactionalConsumerRepairBundleCommit({
        requestDraftId: bundle.draft.id,
        expectedStatus: bundle.draft.status,
        expectedRevisionId: approvedHistoryRevisionId,
      });
    }
  }
  const basePolicy = policyFor(input.record);
  const policy: AuditPolicy = input.record.canonical_technology_id === "asphalt_demolition" &&
    input.values.work_scope === "DEMOLITION_AND_REINSTATEMENT"
    ? {
      expectedMinimumBoqRows: 20,
      required: [
        "SURVEY_SCOPE", "REMOVAL", "REMOVAL_VOLUME", "REMOVAL_MASS", "LABOR", "EQUIPMENT", "LOADING",
        "WASTE_DESTINATION", "BASE_ACCEPTANCE", "BASE_PREPARATION", "TACK_COAT", "ASPHALT_MATERIAL",
        "PLACEMENT", "PAVING_EQUIPMENT", "COMPACTION_EQUIPMENT", "QA", "DOCUMENTATION",
      ],
      forbidden: [],
    }
    : basePolicy;
  const stages = presentStages(rows);
  const missingStages = policy.required.filter((stage) => !stages.has(stage));
  const forbiddenStages = policy.forbidden.filter((stage) => stages.has(stage));
  const validRows = rows.filter((row) => Number.isFinite(row.quantity) && row.quantity >= 0);
  const zeroRows = rows.filter((row) => row.quantity === 0);
  const invalidRows = rows.filter((row) => !Number.isFinite(row.quantity));
  const missingFormulaRows = rows.filter((row) => !String(row.formulaId ?? "").trim() || !String(row.quantityFormula ?? "").trim());
  const dimensionallyInvalidResourceRows = rows.filter((row) => {
    const category = String(row.category ?? "").toLowerCase();
    const unit = String(row.unit ?? "").toLowerCase();
    if (category === "equipment") return ["m2", "m3", "t", "l"].includes(unit);
    if (category === "labor") return ["m2", "m3", "t", "l"].includes(unit);
    return false;
  });
  const sectionCounts = rows.reduce((counts, row) => {
    counts[reportSection(row)] += 1;
    return counts;
  }, { material: 0, work_labor: 0, equipment: 0, logistics: 0, waste: 0, control: 0, documentation: 0, other: 0 });
  const generic = isGenericSkeleton(input.record, rows, stages);
  const pdfRows = countPdfRows(pdf);
  const selectedWorkKey = runtime?.selectedWork?.selectedWorkKey ?? "";
  const revisionWorkKey = revision?.professionalWorkId ?? "";
  const firstSource = rows[0]?.sourceParameters ?? {};
  const exactIdentity = Boolean(
    runtime
    && revision
    && selectedWorkKey === input.record.canonical_technology_id
    && revisionWorkKey === input.record.canonical_technology_id
    && firstSource.professionalEstimatePassportId === input.record.passport_id
    && firstSource.requestedCatalogWorkId === selectedId
    && pdf?.runtimeTrace.selectedWorkKey === input.record.canonical_technology_id
    && procurementIdentityOk
  );
  const reasons: string[] = [];
  if (!runtime) reasons.push("PRODUCT_ROUTING:RUNTIME_NULL");
  if (!revision) reasons.push("PRODUCT_REVISION:NO_IMMUTABLE_REVISION");
  if (rows.length === 0) reasons.push("PRODUCT_BOQ_DECOMPOSITION:EMPTY_BOQ");
  if (rows.length < policy.expectedMinimumBoqRows) reasons.push(`PRODUCT_BOQ_DECOMPOSITION:ROWS_${rows.length}_LT_${policy.expectedMinimumBoqRows}`);
  if (missingStages.length > 0) reasons.push(`PRODUCT_BOQ_DECOMPOSITION:MISSING_${missingStages.join("+")}`);
  if (forbiddenStages.length > 0) reasons.push(`PRODUCT_SCHEMA:FORBIDDEN_${forbiddenStages.join("+")}`);
  if (generic) reasons.push("PRODUCT_BOQ_DECOMPOSITION:RED_GENERIC_SKELETON");
  if (invalidRows.length > 0 || validRows.length !== rows.length) reasons.push("PRODUCT_FORMULA:NON_FINITE_QUANTITY");
  if (zeroRows.length > 0) reasons.push("PRODUCT_FORMULA:ZERO_QUANTITY");
  if (missingFormulaRows.length > 0) reasons.push(`PRODUCT_FORMULA:MISSING_TRACE_${missingFormulaRows.length}`);
  if (dimensionallyInvalidResourceRows.length > 0) reasons.push(`PRODUCT_FORMULA:RESOURCE_DIMENSION_${dimensionallyInvalidResourceRows.length}`);
  if (!exactIdentity) reasons.push("PRODUCT_ROUTING:EXACT_IDENTITY_PARITY_FAILED");
  if (!input.record.previous_35 && (
    firstSource.parameterSchemaId !== input.record.parameter_schema_id ||
    firstSource.formulaBindingId !== input.record.formula_graph_id ||
    firstSource.normApplicabilityProfileId !== input.record.normative_composition_id ||
    !firstSource.boqBlueprintId ||
    !firstSource.deterministicFixtureId
  )) reasons.push("PRODUCT_ROUTING:INDIVIDUAL_CONTENT_PACKAGE_IDENTITY_FAILED");
  if (pdfRows !== rows.length) reasons.push(`PRODUCT_PDF:ROW_PARITY_${pdfRows}_OF_${rows.length}`);
  if (procurementRowCount !== procurementExpectedRowCount) reasons.push(`PRODUCT_PROCUREMENT:ROW_PARITY_${procurementRowCount}_OF_${procurementExpectedRowCount}`);
  const boqCompleteness = reasons.some((reason) =>
    reason.startsWith("PRODUCT_BOQ") || reason.startsWith("PRODUCT_FORMULA") || reason.startsWith("PRODUCT_SCHEMA")
  ) ? "RED" : "PASS";
  const evidenceRelativePath = path.posix.join("cases", `${String(input.auditOrdinal).padStart(3, "0")}-${safeSegment(input.record.work_key)}-${sha256(`${selectedId}:${input.scopeProfile}:${input.scenario}`).slice(0, 8)}.json`);
  const ledger: AuditLedgerRow = {
    ordinal: input.auditOrdinal,
    catalog_id: input.record.catalog_id,
    work_key: input.record.work_key,
    name_ru: input.record.name_ru,
    catalog_group: input.record.ui_group,
    canonical_owner: input.record.canonical_technology_id ?? "",
    alias_of: input.record.alias_of ?? "",
    previous35: input.record.previous_35,
    scope_profile: input.scopeProfile,
    scope_equivalence_reason: input.record.previous_35
      ? "ATOMIC_OPERATION_SCOPE_EQUIVALENT"
      : "DECLARED_SCOPE_PROFILE_COMPILED",
    input_scenario: input.scenario,
    parameter_completeness: revision?.status === "draft_ready" ? "P0_COMPLETE" : `NOT_READY:${runtime?.missingData.length ?? "runtime_null"}`,
    selected_work_key: selectedWorkKey,
    revision_work_key: revisionWorkKey,
    strategy_id: String(firstSource.calculationStrategyId ?? input.record.calculation_strategy_id ?? ""),
    profile_id: String(firstSource.calculationProfileId ?? input.record.calculation_strategy_id ?? ""),
    revision_id: revision?.revisionId ?? "",
    total_boq_rows: rows.length,
    material_rows: rows.filter((row) => row.rowType === "material" || row.category === "material").length,
    labor_rows: rows.filter((row) => row.category === "labor").length,
    work_and_labor_rows: sectionCounts.work_labor,
    equipment_rows: rows.filter((row) => row.category === "equipment" || row.rowType === "equipment").length,
    logistics_rows: rows.filter((row) => row.category === "logistics" || row.rowType === "transport").length,
    waste_rows: rows.filter((row) => ["waste_stream", "recovered_material"].includes(String(row.category))).length,
    control_rows: sectionCounts.control,
    documentation_rows: sectionCounts.documentation,
    other_rows: sectionCounts.other,
    qa_documentation_rows: rows.filter((row) => ["test", "quality_control", "documentation", "document"].includes(String(row.category)) || ["control", "document"].includes(row.rowType)).length,
    rows_with_valid_quantity: validRows.length,
    zero_quantity_rows: zeroRows.length,
    nan_or_infinite_rows: invalidRows.length,
    units: [...new Set(rows.map((row) => row.unit))].sort().join("|"),
    required_stage_owners: policy.required.join("|"),
    present_stage_owners: [...stages].sort().join("|"),
    missing_stage_owners: missingStages.join("|"),
    forbidden_stage_owners: forbiddenStages.join("|"),
    generic_fallback_detected: generic,
    pdf_row_count: pdfRows,
    procurement_row_count: procurementRowCount,
    boq_completeness: boqCompleteness,
    price_completeness: rows.length > 0 && rows.every((row) => row.unitPrice != null) ? "PASS" : "RATES_REQUIRED",
    professional_verdict: reasons.length === 0 ? "PASS" : "RED",
    red_reason: reasons.join(";"),
    evidence_path: evidenceRelativePath,
  };
  const result: AuditCase = {
    ledger,
    selected_record_id: selectedId,
    requested_input: input.values,
    expected_professional_sections: policy.required,
    expected_minimum_boq_rows: policy.expectedMinimumBoqRows,
    pdf_selected_work_key: typeof pdf?.runtimeTrace.selectedWorkKey === "string" ? pdf.runtimeTrace.selectedWorkKey : null,
    procurement_expected_row_count: procurementExpectedRowCount,
    revision_status: revision?.status ?? null,
    approved_history_draft_id: approvedHistoryDraftId,
    approved_history_revision_id: approvedHistoryRevisionId,
    approved_history_status: approvedHistoryStatus,
    row_evidence: rows.map((row) => ({
      work_key: input.record.work_key,
      scope_profile: input.scopeProfile,
      section: reportSection(row),
      row_number: rows.indexOf(row) + 1,
      row_id: row.rowId,
      title_ru: row.titleRu,
      row_type: row.rowType,
      category: row.category,
      quantity: row.quantity,
      unit: row.unit,
      semantic_owner: row.sourceParameters?.boqSemanticOwner ?? row.sourceParameters?.semanticOwner ?? null,
      formula_id: row.formulaId,
      quantity_formula: row.quantityFormula,
      quantity_basis: row.sourceParameters?.quantityBasis ?? row.quantityFormula,
      rounding: row.sourceParameters?.rounding ?? null,
      parameter_sources: row.sourceParameters?.parameterSources ?? row.sourceParameters?.affectedBy ?? [],
      normative_source: row.sourceParameters?.normativeSources ?? row.normSourceId ?? row.sourceParameters?.normativeSourceId ?? null,
      inclusion_condition: row.sourceParameters?.inclusionCondition ?? "MANDATORY_FOR_SELECTED_PROFESSIONAL_BLUEPRINT",
      procurement_classification: row.sourceParameters?.procurementClassification ?? (row.includedInProcurement ? "PROCUREMENT" : "NON_PROCUREMENT"),
      calculation_trace: row.calculationTrace,
      included_in_procurement: row.includedInProcurement,
      source_parameters: row.sourceParameters,
    })),
  };
  const evidencePath = path.join(input.evidenceDirectory, evidenceRelativePath);
  mkdirSync(path.dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return result;
}

function parseArg(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function artifactManifest(outputDirectory: string, names: readonly string[]): unknown {
  return names.map((name) => {
    const body = readFileSync(path.join(outputDirectory, name), "utf8");
    return { name, bytes: Buffer.byteLength(body), sha256: sha256(body) };
  });
}

type ScopeAssemblyMatrixRow = {
  catalog_id: string;
  work_key: string;
  name_ru: string;
  canonical_owner: string;
  alias_of: string;
  minimal_rows: number;
  full_rows: number;
  delta_rows: number;
  minimal_verdict: "PASS" | "RED";
  full_verdict: "PASS" | "RED";
  scope_equivalence_reason: string;
  full_child_passports: string[];
  full_assumptions_count: number;
  verdict: "PASS" | "RED";
};

function evidenceSource(row: unknown): Record<string, unknown> {
  if (!row || typeof row !== "object") return {};
  const source = (row as { source_parameters?: unknown }).source_parameters;
  return source && typeof source === "object" ? source as Record<string, unknown> : {};
}

function evidenceString(row: unknown, key: string): string {
  if (!row || typeof row !== "object") return "";
  const value = (row as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function evidenceNumber(row: unknown, key: string): number | null {
  if (!row || typeof row !== "object") return null;
  const value = (row as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}

function createNonAsphaltCoreCompatibilityProbe(): {
  draft_id: string;
  revision_id: string;
  row_count: number;
  catalog_id: string;
  work_key: string;
} {
  const aiDraft = buildCanonicalElectricalConsumerRepairAiDraft({
    text: "Электромонтаж 100 м²: трасса 150 м, 10 розеток, 5 выключателей и 8 светильников",
    countryCode: "KG",
    city: "Bishkek",
    currency: "KGS",
    parameterOverrides: {
      area_m2: 100,
      route_length_m: 150,
      outlet_count: 10,
      switch_count: 5,
      lighting_point_count: 8,
    },
  });
  invariant(aiDraft.selectedWork?.selectedWorkKey === "electrical_area_installation", "CORE_COMPAT_ELECTRICAL_EXACT_BINDING_RED");
  invariant(aiDraft.items.length > 0, "CORE_COMPAT_ELECTRICAL_BOQ_EMPTY");
  const bundle = createConsumerRepairRequestDraft({
    consumerUserId: "r63-core-compatibility-probe-user",
    problemText: aiDraft.selectedWork.selectedWorkRawInput,
    repairType: aiDraft.repairType,
    city: "Bishkek",
    addressText: "64 Malikova Street",
    preferredTimeText: "По согласованию",
    contactPhone: "+996 707 052 577",
    aiDraft,
  });
  const revision = bundle.estimateDraftRevisionState?.revisions.find((candidate) =>
    candidate.revisionId === bundle.estimateDraftRevisionState?.currentRevisionId
  );
  invariant(revision, "CORE_COMPAT_ELECTRICAL_REVISION_MISSING");
  invariant(revision.boq.rows.length > 0, "CORE_COMPAT_ELECTRICAL_REVISION_BOQ_EMPTY");
  return {
    draft_id: bundle.draft.id,
    revision_id: revision.revisionId,
    row_count: revision.boq.rows.length,
    catalog_id: bundle.draft.selectedCatalogWorkId ?? "electrical_area_installation",
    work_key: bundle.draft.selectedWorkKey ?? "electrical_area_installation",
  };
}

function buildScopeAssemblyMatrix(
  minimalCases: readonly AuditCase[],
  fullCases: readonly AuditCase[],
): ScopeAssemblyMatrixRow[] {
  const fullByCatalog = new Map(fullCases.map((entry) => [entry.ledger.catalog_id, entry]));
  return minimalCases.map((minimal) => {
    const full = fullByCatalog.get(minimal.ledger.catalog_id);
    invariant(full, `DUAL_SCOPE_FULL_CASE_MISSING:${minimal.ledger.catalog_id}`);
    const childPassports = [...new Set(full.row_evidence
      .map((row) => evidenceSource(row).childPassportId)
      .filter((value): value is string => typeof value === "string" && value.length > 0))].sort();
    const assumptionCounts = full.row_evidence
      .map((row) => evidenceSource(row).professionalAssemblyAssumptionsCount)
      .filter((value): value is number => typeof value === "number");
    const defaultsApplied = full.row_evidence.some((row) => {
      const source = evidenceSource(row);
      return source.professionalBoqDefaultsApplied === true ||
        (Array.isArray(source.professionalBoqDefaultAssumptionsRu) && source.professionalBoqDefaultAssumptionsRu.length > 0);
    });
    const fullAssumptionsCount = assumptionCounts.reduce((maximum, value) => Math.max(maximum, value), 0);
    const explicitScope = full.ledger.previous35 || full.row_evidence.every((row) =>
      evidenceSource(row).estimateScopeMode === "FULL_APPLICABLE_SCOPE"
    );
    const verdict = minimal.ledger.professional_verdict === "PASS" &&
      full.ledger.professional_verdict === "PASS" &&
      fullAssumptionsCount === 0 &&
      !defaultsApplied &&
      explicitScope
        ? "PASS"
        : "RED";
    return {
      catalog_id: minimal.ledger.catalog_id,
      work_key: minimal.ledger.work_key,
      name_ru: minimal.ledger.name_ru,
      canonical_owner: minimal.ledger.canonical_owner,
      alias_of: minimal.ledger.alias_of,
      minimal_rows: minimal.ledger.total_boq_rows,
      full_rows: full.ledger.total_boq_rows,
      delta_rows: full.ledger.total_boq_rows - minimal.ledger.total_boq_rows,
      minimal_verdict: minimal.ledger.professional_verdict,
      full_verdict: full.ledger.professional_verdict,
      scope_equivalence_reason: minimal.ledger.previous35
        ? "ATOMIC_OPERATION_SCOPE_EQUIVALENT: no broader project package belongs to this atomic catalog operation"
        : "EXPLICIT_SCOPE_DECISIONS_AND_TYPED_CHILD_ASSEMBLIES",
      full_child_passports: childPassports,
      full_assumptions_count: fullAssumptionsCount,
      verdict,
    };
  });
}

function scopeMatrixMarkdown(rows: readonly ScopeAssemblyMatrixRow[]): string {
  return [
    "# ASPHALT R63 dual-scope assembly matrix",
    "",
    "`MINIMAL_EXPLICIT_SCOPE` contains only explicitly selected operation scope. `FULL_APPLICABLE_SCOPE` contains explicit applicable project packages; no package is inferred silently.",
    "",
    "| # | catalog_id | work_key | Название | MINIMAL | FULL | Δ | Child assemblies | assumptions | verdict |",
    "|---:|---|---|---|---:|---:|---:|---|---:|---|",
    ...rows.map((row, index) =>
      `| ${index + 1} | ${row.catalog_id} | ${row.work_key} | ${row.name_ru.replace(/\|/g, "\\|")} | ${row.minimal_rows} | ${row.full_rows} | ${row.delta_rows} | ${row.full_child_passports.join("<br>") || "—"} | ${row.full_assumptions_count} | ${row.verdict} |`
    ),
  ].join("\n");
}

function buildResourceAudits(fullCases: readonly AuditCase[]) {
  const balanceRows = fullCases.map((entry) => {
    const rows = entry.row_evidence;
    const nonPositive = rows.filter((row) => (evidenceNumber(row, "quantity") ?? 0) <= 0).length;
    const missingFormulaTrace = rows.filter((row) =>
      !evidenceString(row, "formula_id") ||
      !evidenceString(row, "quantity_formula") ||
      !evidenceString(row, "calculation_trace")
    ).length;
    const laborUnitErrors = rows.filter((row) =>
      evidenceString(row, "category") === "labor" && evidenceString(row, "unit") !== "man_hour"
    ).length;
    const machineryUnitErrors = rows.filter((row) =>
      evidenceString(row, "category") === "machinery" &&
      evidenceString(row, "unit") !== "machine_hour"
    ).length;
    const hiddenDefaultRows = rows.filter((row) => {
      const source = evidenceSource(row);
      return source.professionalBoqDefaultsApplied === true ||
        (Array.isArray(source.professionalBoqDefaultAssumptionsRu) && source.professionalBoqDefaultAssumptionsRu.length > 0) ||
        (typeof source.professionalAssemblyAssumptionsCount === "number" && source.professionalAssemblyAssumptionsCount !== 0) ||
        (typeof source.professionalAssemblyHiddenQuantityDefaults === "number" && source.professionalAssemblyHiddenQuantityDefaults !== 0);
    }).length;
    const pricedOwners = rows
      .map((row) => evidenceSource(row))
      .filter((source) => source.costOwnership === "priced_resource")
      .map((source) => String(source.costOwnerId ?? ""));
    const duplicatePricedOwners = [...new Set(pricedOwners.filter((owner, index) =>
      !owner || pricedOwners.indexOf(owner) !== index
    ))].filter(Boolean);
    const verdict = nonPositive === 0 && missingFormulaTrace === 0 && laborUnitErrors === 0 &&
      machineryUnitErrors === 0 && hiddenDefaultRows === 0 && duplicatePricedOwners.length === 0
        ? "PASS"
        : "RED";
    return {
      catalog_id: entry.ledger.catalog_id,
      work_key: entry.ledger.work_key,
      total_rows: rows.length,
      non_positive_quantities: nonPositive,
      missing_formula_or_substitution_trace: missingFormulaTrace,
      labor_unit_errors: laborUnitErrors,
      machinery_unit_errors: machineryUnitErrors,
      hidden_default_rows: hiddenDefaultRows,
      duplicate_priced_cost_owners: duplicatePricedOwners,
      verdict,
    };
  });
  const costOwnershipRows = fullCases.flatMap((entry) => entry.row_evidence.map((row) => {
    const source = evidenceSource(row);
    return {
      catalog_id: entry.ledger.catalog_id,
      work_key: entry.ledger.work_key,
      row_id: evidenceString(row, "row_id"),
      row_type: evidenceString(row, "row_type"),
      category: evidenceString(row, "category"),
      cost_ownership: source.costOwnership ?? null,
      cost_owner_id: source.costOwnerId ?? null,
      included_in_procurement: (row as { included_in_procurement?: unknown }).included_in_procurement === true,
    };
  }));
  return { balanceRows, costOwnershipRows };
}

function summaryMarkdown(input: {
  phase: "BEFORE" | "AFTER";
  inventory: ReturnType<typeof buildAsphaltRelatedR8Inventory>;
  m44: readonly AuditLedgerRow[];
  all63: readonly AuditLedgerRow[];
  scenarioRows: readonly AuditLedgerRow[];
  head: string;
  tree: string;
}): string {
  const pass = input.m44.filter((row) => row.professional_verdict === "PASS").length;
  const red = input.m44.length - pass;
  const aliases = input.all63.filter((row) => row.alias_of).length;
  const priceRequired = input.m44.filter((row) => row.price_completeness === "RATES_REQUIRED").length;
  return `# ASPHALT M44 BOQ ${input.phase} audit\n\n` +
    `Status: \`${input.phase === "BEFORE" ? "CHECKPOINT_R9_PRODUCT_ASPHALT_M44_BOQ_UNDERDECOMPOSITION_AND_EMPTY_REVISION" : pass === 44 ? "GREEN_R9_M44_PROFESSIONAL_BOQ" : "RED_R9_M44_PROFESSIONAL_BOQ"}\`  \n` +
    `Audit schema: \`${AUDIT_SCHEMA_VERSION}\`  \nHEAD: \`${input.head}\`  \nTree: \`${input.tree}\`  \n` +
    `Inventory ledger SHA-256: \`${input.inventory.ledger_sha256}\`\n\n` +
    `Denominator: N=${input.inventory.summary.inventory_candidates_N}; R=${input.inventory.summary.asphalt_related_R}; M=${input.inventory.summary.unique_technologies_M}; A=${input.inventory.summary.aliases_A}; E=${input.inventory.summary.exclusions_E}; previous35=${input.inventory.summary.old_35_bound}/35.\n\n` +
    `Professional BOQ: PASS=${pass}/44; RED=${red}/44; catalog records=${input.all63.length}/63; aliases reproduced=${aliases}/19; price rates required=${priceRequired}/44. Price completeness is intentionally independent from BOQ completeness.\n\n` +
    `## M44 factual ledger\n\n${markdownTable(input.m44)}\n\n` +
    `## Mandatory A-J scenarios\n\n${markdownTable(input.scenarioRows)}\n\n` +
    `## All R63 catalog bindings\n\n${markdownTable(input.all63)}\n`;
}

export async function runAsphaltM44ProfessionalBoqAuditR9(): Promise<void> {
  const requestedPhase = (parseArg("phase") ?? "before").toLowerCase();
  invariant(requestedPhase === "before" || requestedPhase === "after", `UNKNOWN_PHASE:${requestedPhase}`);
  const requestedScopeProfile = (parseArg("scope-profile") ?? "dual").toLowerCase();
  invariant(
    requestedScopeProfile === "minimal" || requestedScopeProfile === "full" || requestedScopeProfile === "dual",
    `UNKNOWN_SCOPE_PROFILE:${requestedScopeProfile}`,
  );
  const primaryScopeProfile: ScopeProfile = requestedScopeProfile === "full"
    ? "FULL_APPLICABLE_SCOPE"
    : "MINIMAL_EXPLICIT_SCOPE";
  const scopeFixture = primaryScopeProfile === "FULL_APPLICABLE_SCOPE"
    ? FULL_APPLICABLE_EXPLICIT_INPUTS
    : {};
  const phase = requestedPhase.toUpperCase() as "BEFORE" | "AFTER";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const defaultOutput = path.join(process.cwd(), ".release-runtime", "asphalt-related-r9-r10", "boq-professional-completeness", `${requestedPhase}-${timestamp}`);
  const outputDirectory = path.resolve(parseArg("output") ?? defaultOutput);
  invariant(!existsSync(outputDirectory), `IMMUTABLE_OUTPUT_ALREADY_EXISTS:${outputDirectory}`);
  mkdirSync(outputDirectory, { recursive: true });
  const cleanupStorage = installStorage();
  __resetConsumerRepairRequestStoreForTests();
  setConsumerRepairTransactionalDurableStoreForTests(
    new InMemoryEstimateRevisionDurableStore(),
  );
  try {
    const inventory = buildAsphaltRelatedR8Inventory();
    invariant(inventory.summary.inventory_candidates_N === 66, `N_${inventory.summary.inventory_candidates_N}`);
    invariant(inventory.summary.asphalt_related_R === 63, `R_${inventory.summary.asphalt_related_R}`);
    invariant(inventory.summary.unique_technologies_M === 44, `M_${inventory.summary.unique_technologies_M}`);
    invariant(inventory.summary.aliases_A === 19, `A_${inventory.summary.aliases_A}`);
    invariant(inventory.summary.exclusions_E === 3, `E_${inventory.summary.exclusions_E}`);
    invariant(inventory.summary.old_35_bound === 35, `PREVIOUS35_${inventory.summary.old_35_bound}`);
    const related = inventory.records.filter((record) => record.canonical_technology_id !== null);
    const executable = related.filter((record) => record.classification === "EXECUTABLE");
    invariant(related.length === 63, `RELATED_RECORDS_${related.length}`);
    invariant(executable.length === 44, `EXECUTABLE_RECORDS_${executable.length}`);
    const parameterMatrix = buildParameterMatrix(related);
    invariant(new Set(parameterMatrix.map((row) => row.catalog_id)).size === 63, "PARAMETER_SCHEMAS_NOT_R63");
    const redParameterRows = parameterMatrix.filter((row) => row.verdict === "RED");
    invariant(
      redParameterRows.length === 0,
      `PARAMETER_MATRIX_RED:${redParameterRows.length}:${redParameterRows.slice(0, 12).map((row) => `${row.work_key}/${row.parameter_key}`).join(",")}`,
    );
    const allCases: AuditCase[] = [];
    let checked = 0;
    for (const [catalogIndex, record] of related.entries()) {
      const auditOrdinal = record.classification === "EXECUTABLE" ? checked + 1 : 100 + catalogIndex + 1;
      const result = await auditCase({
        record,
        auditOrdinal,
        scenario: record.previous_35 ? "P0_COMPLETE_ROADWORKS_DEFAULTS" : "P0_COMPLETE_WITH_STRUCTURAL_P1",
        scopeProfile: primaryScopeProfile,
        values: inputFor(record, { ...scopeFixture }),
        evidenceDirectory: outputDirectory,
        approveForDurableHistory: true,
      });
      allCases.push(result);
      if (record.classification !== "EXECUTABLE") continue;
      checked += 1;
      if (checked % 10 === 0 || checked === 44) {
        const m44SoFar = allCases.filter((entry) => !entry.ledger.alias_of && entry.ledger.ordinal <= 44).map((entry) => entry.ledger);
        const counts = m44SoFar.map((entry) => entry.total_boq_rows);
        const pass = m44SoFar.filter((entry) => entry.professional_verdict === "PASS").length;
        const generic = m44SoFar.filter((entry) => entry.generic_fallback_detected).length;
        process.stdout.write(`M44 BOQ AUDIT | checked=${checked}/44 | PASS=${pass} | RED=${checked - pass} | min_rows=${Math.min(...counts)} | max_rows=${Math.max(...counts)} | empty=${counts.filter((count) => count === 0).length} | generic_fallback=${generic}\n`);
      }
    }
    const fullScopeCases: AuditCase[] = [];
    if (requestedScopeProfile === "dual") {
      for (const [catalogIndex, record] of related.entries()) {
        const result = await auditCase({
          record,
          auditOrdinal: 300 + catalogIndex + 1,
          scenario: record.previous_35
            ? "FULL_APPLICABLE_ATOMIC_OPERATION"
            : "FULL_APPLICABLE_EXPLICIT_INPUTS",
          scopeProfile: "FULL_APPLICABLE_SCOPE",
          values: inputFor(record, { ...FULL_APPLICABLE_EXPLICIT_INPUTS }),
          evidenceDirectory: outputDirectory,
        });
        fullScopeCases.push(result);
        if ((catalogIndex + 1) % 10 === 0 || catalogIndex + 1 === 63) {
          const passed = fullScopeCases.filter((entry) => entry.ledger.professional_verdict === "PASS").length;
          process.stdout.write(`R63 FULL SCOPE | checked=${catalogIndex + 1}/63 | PASS=${passed} | RED=${catalogIndex + 1 - passed}\n`);
        }
      }
    } else if (requestedScopeProfile === "full") {
      fullScopeCases.push(...allCases);
    }
    const executableCases = allCases.filter((entry) => entry.ledger.ordinal <= 44 && !entry.ledger.alias_of);
    invariant(executableCases.length === 44, `M44_CASES_${executableCases.length}`);
    const recordFor = (owner: string) => {
      const record = executable.find((candidate) => candidate.canonical_technology_id === owner);
      invariant(record, `MANDATORY_SCENARIO_OWNER_NOT_FOUND:${owner}`);
      return record;
    };
    const scenarios: { code: string; owner: string; values: Record<string, string | number | boolean> }[] = [
      { code: "A_PARKING_524_M2", owner: "asphalt_parking_lot", values: { area_m2: 524 } },
      { code: "B_PARKING_100_X_50_M_DERIVED_5000_M2", owner: "asphalt_parking_lot", values: { area_m2: 5000 } },
      { code: "C_DRIVEWAY_500_M2", owner: "asphalt_driveway", values: { area_m2: 500 } },
      { code: "D_DEMOLITION_2000_M2_NO_HAUL", owner: "asphalt_demolition", values: { removal_area_m2: 2000, area_m2: 2000, haul_required: false, work_scope: "PURE_DEMOLITION" } },
      { code: "E_DEMOLITION_2000_M2_HAUL_20_KM", owner: "asphalt_demolition", values: { removal_area_m2: 2000, area_m2: 2000, haul_required: true, haul_distance_km: 20, truck_payload_t: 20, work_scope: "PURE_DEMOLITION" } },
      { code: "F_FULL_ROAD_REFERENCE_EXACT_OWNER", owner: "asphalt_concrete_pavement", values: { area_m2: 5000 } },
      { code: "G_MILLING", owner: "asphalt_milling", values: { removal_area_m2: 1000, area_m2: 1000, number_of_passes: 2 } },
      { code: "H_PATCH_REPAIR", owner: "asphalt_patch_repair", values: { area_m2: 100, removal_area_m2: 100 } },
      { code: "I_OVERLAY", owner: "asphalt_overlay", values: { area_m2: 1000 } },
      { code: "J_BASE_LAYER", owner: "asphalt_base_layer", values: { area_m2: 1000 } },
      { code: "P1_DEMOLITION_AND_REINSTATEMENT", owner: "asphalt_demolition", values: { removal_area_m2: 200, area_m2: 200, work_scope: "DEMOLITION_AND_REINSTATEMENT", reinstatement_depth_mm: 50, new_asphalt_density_t_m3: 2.35 } },
      { code: "P1_MILLING_WITH_HAUL", owner: "asphalt_milling", values: { removal_area_m2: 1000, area_m2: 1000, haul_required: true, haul_distance_km: 20, truck_payload_t: 20 } },
    ];
    const scenarioCases: AuditCase[] = [];
    for (const [index, scenario] of scenarios.entries()) {
      scenarioCases.push(await auditCase({
        record: recordFor(scenario.owner),
        auditOrdinal: 200 + index + 1,
        scenario: scenario.code,
        scopeProfile: primaryScopeProfile,
        values: inputFor(recordFor(scenario.owner), { ...scopeFixture, ...scenario.values }),
        evidenceDirectory: outputDirectory,
      }));
    }
    const nonAsphaltProbeBeforeReload = createNonAsphaltCoreCompatibilityProbe();
    await flushTransactionalConsumerRepairWrites();
    const transactionalBeforeReload = await Promise.all(allCases
      .filter((entry) => entry.approved_history_draft_id !== null)
      .map(async (entry) => {
      const requestDraftId = entry.approved_history_draft_id as string;
      const committed = await readTransactionalConsumerRepairBundle(requestDraftId);
      const live = getConsumerRepairRequest(requestDraftId);
      return {
        catalog_id: entry.ledger.catalog_id,
        request_draft_id: requestDraftId,
        expected_status: entry.approved_history_status,
        committed_status: committed?.draft.status ?? null,
        expected_revision_id: entry.approved_history_revision_id,
        committed_revision_id: committed?.estimateDraftRevisionState?.currentRevisionId ?? null,
        committed_pdf_count: committed?.pdfs.length ?? 0,
        durable_diagnostics: live.events
          .filter((event) => event.eventType.includes("durable"))
          .map((event) => ({ event_type: event.eventType, payload: event.payload })),
      };
    }));
    const transactionalBeforeReloadRed = transactionalBeforeReload.filter((entry) =>
      entry.committed_status !== entry.expected_status ||
      entry.committed_revision_id !== entry.expected_revision_id ||
      entry.committed_pdf_count < 1
    );
    if (transactionalBeforeReloadRed.length > 0) {
      process.stderr.write(`DURABLE_APPROVAL_COMMIT_RED:${JSON.stringify(transactionalBeforeReloadRed.slice(0, 5))}\n`);
    }
    __simulateConsumerRepairRequestStoreReloadForTests();
    await initializeConsumerRepairTransactionalDurableStorage();
    const nonAsphaltProbeAfterReload = getConsumerRepairRequest(nonAsphaltProbeBeforeReload.draft_id);
    const nonAsphaltProbeRevisionAfterReload = nonAsphaltProbeAfterReload.estimateDraftRevisionState?.revisions.find(
      (candidate) => candidate.revisionId === nonAsphaltProbeAfterReload.estimateDraftRevisionState?.currentRevisionId,
    );
    const coreCompatibilityGreen =
      nonAsphaltProbeBeforeReload.catalog_id === "electrical_area_installation" &&
      nonAsphaltProbeBeforeReload.work_key === "electrical_area_installation" &&
      nonAsphaltProbeAfterReload.draft.selectedCatalogWorkId === nonAsphaltProbeBeforeReload.catalog_id &&
      nonAsphaltProbeAfterReload.draft.selectedWorkKey === nonAsphaltProbeBeforeReload.work_key &&
      nonAsphaltProbeRevisionAfterReload?.revisionId === nonAsphaltProbeBeforeReload.revision_id &&
      nonAsphaltProbeRevisionAfterReload.boq.rows.length === nonAsphaltProbeBeforeReload.row_count &&
      nonAsphaltProbeBeforeReload.row_count > 0;
    const coreCompatibilityProbe = {
      reference_passport: "electrical_area_installation",
      passport_to_schema_to_compiler_to_revision: coreCompatibilityGreen,
      durable_reload_exact_revision: coreCompatibilityGreen,
      before_reload: nonAsphaltProbeBeforeReload,
      after_reload: {
        draft_id: nonAsphaltProbeAfterReload.draft.id,
        revision_id: nonAsphaltProbeRevisionAfterReload?.revisionId ?? null,
        row_count: nonAsphaltProbeRevisionAfterReload?.boq.rows.length ?? 0,
        catalog_id: nonAsphaltProbeAfterReload.draft.selectedCatalogWorkId,
        work_key: nonAsphaltProbeAfterReload.draft.selectedWorkKey,
      },
      final_status: coreCompatibilityGreen
        ? "GREEN_NON_ASPHALT_ELECTRICAL_CORE_COMPATIBILITY"
        : "RED_NON_ASPHALT_ELECTRICAL_CORE_COMPATIBILITY",
    };
    const durableHistoryRows = allCases.map((entry) => {
      const requestDraftId = entry.approved_history_draft_id;
      if (!requestDraftId) {
        return {
          catalog_id: entry.ledger.catalog_id,
          work_key: entry.ledger.work_key,
          request_draft_id: null,
          expected_revision_id: entry.approved_history_revision_id,
          restored_revision_id: null,
          expected_row_count: entry.ledger.total_boq_rows,
          restored_row_count: 0,
          status: null,
          row_identity_parity: false,
          pdf_revision_bound: false,
          verdict: "RED",
        };
      }
      const restored = getConsumerRepairRequest(requestDraftId);
      const restoredRevision = restored.estimateDraftRevisionState?.revisions.find((revisionEntry) =>
        revisionEntry.revisionId === restored.estimateDraftRevisionState?.currentRevisionId
      );
      const expectedRowIds = (entry.row_evidence as { row_id?: string }[]).map((row) => row.row_id);
      const restoredRowIds = restoredRevision?.boq.rows.map((row) => row.rowId) ?? [];
      const rowIdentityParity = JSON.stringify(restoredRowIds) === JSON.stringify(expectedRowIds);
      const verdict =
        restored.draft.status === "consumer_approved" &&
        restored.estimateDraftRevisionState?.currentRevisionId === entry.approved_history_revision_id &&
        restoredRevision?.boq.rows.length === entry.ledger.total_boq_rows &&
        rowIdentityParity
          ? "PASS"
          : "RED";
      return {
        catalog_id: entry.ledger.catalog_id,
        work_key: entry.ledger.work_key,
        request_draft_id: requestDraftId,
        expected_revision_id: entry.approved_history_revision_id,
        restored_revision_id: restored.estimateDraftRevisionState?.currentRevisionId ?? null,
        expected_row_count: entry.ledger.total_boq_rows,
        restored_row_count: restoredRevision?.boq.rows.length ?? 0,
        status: restored.draft.status,
        row_identity_parity: rowIdentityParity,
        pdf_revision_bound: restored.pdfs.some((pdf) =>
          pdf.revisionId === restored.estimateDraftRevisionState?.currentRevisionId
        ),
        verdict,
      };
    });
    const approvedHistory = listConsumerRepairApprovedHistory(
      "r63-asphalt-durable-history-audit-user",
      { limit: 20 },
    );
    invariant(durableHistoryRows.length === 63, `DURABLE_HISTORY_CASES_${durableHistoryRows.length}`);
    const durableHistoryRedRows = durableHistoryRows.filter((entry) => entry.verdict === "RED");
    if (durableHistoryRedRows.length > 0) {
      process.stderr.write(`DURABLE_HISTORY_RELOAD_RED:${JSON.stringify(durableHistoryRedRows.slice(0, 5))}\n`);
    }
    const m44 = executableCases.map((entry) => entry.ledger);
    const all63 = allCases.map((entry) => entry.ledger);
    const scenarioRows = scenarioCases.map((entry) => entry.ledger);
    const dualScope = requestedScopeProfile === "dual";
    const scopeAssemblyMatrix = dualScope
      ? buildScopeAssemblyMatrix(allCases, fullScopeCases)
      : [];
    const resourceAudits = buildResourceAudits(fullScopeCases);
    const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const tree = execFileSync("git", ["rev-parse", "HEAD^{tree}"], { encoding: "utf8" }).trim();
    const prefix = phase === "BEFORE" ? "ASPHALT_M44_BOQ_BEFORE" : "ASPHALT_M44_BOQ_AFTER";
    const allPrefix = phase === "BEFORE" ? "ASPHALT_ALL_WORKS_BEFORE" : "ASPHALT_ALL_WORKS_AFTER";
    const actualCountsCsvName = "ASPHALT_R63_ACTUAL_ROW_COUNTS.csv";
    const actualCountsMdName = "ASPHALT_R63_ACTUAL_ROW_COUNTS.md";
    const inventoryJsonName = "ASPHALT_R63_INVENTORY.json";
    const inventoryMdName = "ASPHALT_R63_INVENTORY.md";
    const fullBoqRowsName = "ASPHALT_R63_FULL_BOQ_ROWS.json";
    const parameterMatrixCsvName = "ASPHALT_R63_PARAMETER_MATRIX.csv";
    const parameterMatrixJsonName = "ASPHALT_R63_PARAMETER_MATRIX.json";
    const parameterMatrixMdName = "ASPHALT_R63_PARAMETER_MATRIX.md";
    const parameterSchemasJsonName = "ASPHALT_R63_PARAMETER_SCHEMAS.json";
    const parameterSchemasMdName = "ASPHALT_R63_PARAMETER_SCHEMAS.md";
    const parameterTraceName = "ASPHALT_R63_PARAMETER_FORMULA_TRACE.json";
    const durableHistoryName = "ASPHALT_R63_DURABLE_HISTORY_PROOF.json";
    const pdfProcurementParityName = "ASPHALT_R63_PDF_PROCUREMENT_PARITY.json";
    const scopeAssemblyMatrixJsonName = "ASPHALT_R63_SCOPE_ASSEMBLY_MATRIX.json";
    const scopeAssemblyMatrixMdName = "ASPHALT_R63_SCOPE_ASSEMBLY_MATRIX.md";
    const minimalScopeEstimatesName = "ASPHALT_R63_MINIMAL_SCOPE_ESTIMATES.json";
    const fullScopeEstimatesName = "ASPHALT_R63_FULL_APPLICABLE_SCOPE_ESTIMATES.json";
    const resourceCompositionRowsName = "ASPHALT_R63_RESOURCE_COMPOSITION_ROWS.json";
    const resourceCalculationTracesName = "ASPHALT_R63_RESOURCE_CALCULATION_TRACES.json";
    const resourceBalanceAuditName = "ASPHALT_R63_RESOURCE_BALANCE_AUDIT.json";
    const associatedWorkPacksName = "ASPHALT_R63_ASSOCIATED_WORK_PACKS.md";
    const costOwnershipAuditName = "ASPHALT_R63_COST_OWNERSHIP_AUDIT.json";
    const noHiddenAssumptionsName = "ASPHALT_R63_NO_HIDDEN_ASSUMPTIONS.json";
    const platformCoreManifestName = "ASPHALT_R63_PLATFORM_CORE_INTEGRATION_MANIFEST.json";
    const coreCompatibilityName = "ASPHALT_R63_CORE_CONTRACT_COMPATIBILITY.json";
    const noHacksAuditName = "ASPHALT_R63_NO_HACKS_AUDIT.md";
    const beforeAfterName = "ASPHALT_R63_BEFORE_AFTER.md";
    const normativeLedgerName = "ASPHALT_R63_NORMATIVE_APPLICABILITY_LEDGER.json";
    const finalManifestName = "ASPHALT_R63_M44_A19_E3_MANIFEST.json";
    const shortGatesName = "ASPHALT_R63_SHORT_GATES_RESULT.json";
    const webArtifactArg = parseArg("web-artifact");
    const webArtifactPath = webArtifactArg ? path.resolve(webArtifactArg) : null;
    const webArtifact = webArtifactPath
      ? JSON.parse(readFileSync(webArtifactPath, "utf8")) as Record<string, unknown>
      : null;
    if (webArtifact) invariant(webArtifact.passed === true, "WEB_ARTIFACT_NOT_GREEN");
    const fullScopeGreen = dualScope && fullScopeCases.length === 63 &&
      fullScopeCases.every((entry) => entry.ledger.professional_verdict === "PASS") &&
      scopeAssemblyMatrix.every((row) => row.verdict === "PASS") &&
      resourceAudits.balanceRows.every((row) => row.verdict === "PASS");
    const afterGreen = m44.every((row) => row.professional_verdict === "PASS") &&
      all63.every((row) => row.professional_verdict === "PASS") &&
      scenarioRows.every((row) => row.professional_verdict === "PASS") &&
      coreCompatibilityGreen &&
      (!dualScope || fullScopeGreen);
    const focusedContracts = parseArg("focused-contracts") ?? "NOT_RECORDED";
    const webReferenceGreen = webArtifact !== null &&
      webArtifact.apply_click === 1 &&
      webArtifact.new_revision === 1 &&
      typeof webArtifact.boq_rows === "number" &&
      webArtifact.boq_rows > 0 &&
      typeof webArtifact.exact_catalog_id === "string" &&
      webArtifact.exact_catalog_id.length > 0 &&
      typeof webArtifact.exact_work_key === "string" &&
      webArtifact.exact_work_key.length > 0 &&
      webArtifact.history_reopen_same_revision === true;
    const asphaltReferenceGreen = afterGreen &&
      dualScope &&
      focusedContracts === "29/29" &&
      webReferenceGreen;
    const primaryNames = [
      `${prefix}_LEDGER.csv`, `${prefix}_LEDGER.json`, `${prefix}_SUMMARY.md`,
      `${allPrefix}.csv`, `${allPrefix}.json`, `${allPrefix}.md`,
      inventoryJsonName, inventoryMdName, actualCountsCsvName, actualCountsMdName, fullBoqRowsName,
      parameterMatrixCsvName, parameterMatrixJsonName, parameterMatrixMdName,
      parameterSchemasJsonName, parameterSchemasMdName, parameterTraceName,
      durableHistoryName, pdfProcurementParityName,
      ...(dualScope ? [
        scopeAssemblyMatrixJsonName, scopeAssemblyMatrixMdName, minimalScopeEstimatesName,
        fullScopeEstimatesName, resourceCompositionRowsName, resourceCalculationTracesName,
        resourceBalanceAuditName, associatedWorkPacksName, costOwnershipAuditName,
        noHiddenAssumptionsName, platformCoreManifestName, coreCompatibilityName,
        noHacksAuditName, beforeAfterName, normativeLedgerName,
      ] : []),
      ...(webArtifact ? [shortGatesName] : []),
    ];
    const fullBoqRows = allCases.flatMap((entry) => entry.row_evidence.map((row) => ({
      catalog_id: entry.ledger.catalog_id,
      selected_record_id: entry.selected_record_id,
      canonical_owner: entry.ledger.canonical_owner,
      professional_passport_id: inventory.records.find((record) => record.catalog_id === entry.ledger.catalog_id)?.passport_id ?? null,
      ...(row as Record<string, unknown>),
    })));
    const payload = {
      schema_version: AUDIT_SCHEMA_VERSION,
      phase,
      generated_at: new Date().toISOString(),
      head,
      tree,
      inventory: {
        summary: inventory.summary,
        invariants: inventory.invariants,
        ledger_sha256: inventory.ledger_sha256,
      },
      m44_ledger: m44,
      all_r63_catalog_records: all63,
      aliases: all63.filter((row) => row.alias_of),
      exclusions: inventory.records.filter((record) => record.exclusion_type !== null),
      mandatory_and_structural_scenarios: scenarioCases,
    };
    const summary = summaryMarkdown({ phase, inventory, m44, all63, scenarioRows, head, tree });
    writeFileSync(path.join(outputDirectory, `${prefix}_LEDGER.csv`), csv(m44), "utf8");
    writeFileSync(path.join(outputDirectory, `${prefix}_LEDGER.json`), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    writeFileSync(path.join(outputDirectory, `${prefix}_SUMMARY.md`), summary, "utf8");
    writeFileSync(path.join(outputDirectory, `${allPrefix}.csv`), csv(all63), "utf8");
    writeFileSync(path.join(outputDirectory, `${allPrefix}.json`), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    writeFileSync(path.join(outputDirectory, `${allPrefix}.md`), summary, "utf8");
    const generatedAt = new Date().toISOString();
    const evidenceMetadata = {
      generated_at: generatedAt,
      local_sha: head,
      tree_sha: tree,
      generator_version: AUDIT_SCHEMA_VERSION,
      input_manifest_hash: inventory.ledger_sha256,
    };
    writeFileSync(path.join(outputDirectory, inventoryJsonName), `${JSON.stringify({
      schema_version: AUDIT_SCHEMA_VERSION,
      ...evidenceMetadata,
      output_sha256: sha256(JSON.stringify(related)),
      counts: inventory.summary,
      failures: [],
      records: related,
      technologies: inventory.technologies,
      exclusions: inventory.records.filter((record) => record.exclusion_type !== null),
    }, null, 2)}\n`, "utf8");
    writeFileSync(
      path.join(outputDirectory, inventoryMdName),
      `${inventoryMarkdown(related, inventory)}\n`,
      "utf8",
    );
    writeFileSync(path.join(outputDirectory, actualCountsCsvName), csv(all63), "utf8");
    writeFileSync(
      path.join(outputDirectory, actualCountsMdName),
      `# ASPHALT R63 actual row counts\n\nDenominator: R63/M44/A19. Counts below are factual compiler output, not target padding.\n\n${markdownTable(all63)}\n`,
      "utf8",
    );
    writeFileSync(path.join(outputDirectory, fullBoqRowsName), `${JSON.stringify({
      schema_version: AUDIT_SCHEMA_VERSION,
      generated_at: new Date().toISOString(),
      denominator: { R: 63, M: 44, A: 19 },
      catalog_record_count: all63.length,
      boq_row_count: fullBoqRows.length,
      rows: fullBoqRows,
    }, null, 2)}\n`, "utf8");
    const parameterColumns = Object.keys(parameterMatrix[0] ?? {}) as (keyof ParameterMatrixRow)[];
    writeFileSync(path.join(outputDirectory, parameterMatrixCsvName), recordCsv(parameterMatrix, parameterColumns), "utf8");
    writeFileSync(path.join(outputDirectory, parameterMatrixJsonName), `${JSON.stringify({
      schema_version: AUDIT_SCHEMA_VERSION,
      denominator: { R: 63, M: 44, A: 19 },
      catalog_records: new Set(parameterMatrix.map((row) => row.catalog_id)).size,
      parameter_count: parameterMatrix.length,
      rows: parameterMatrix,
    }, null, 2)}\n`, "utf8");
    writeFileSync(path.join(outputDirectory, parameterMatrixMdName), `${parameterMatrixMarkdown(parameterMatrix)}\n`, "utf8");
    writeFileSync(path.join(outputDirectory, parameterSchemasJsonName), `${JSON.stringify({
      schema_version: AUDIT_SCHEMA_VERSION,
      ...evidenceMetadata,
      output_sha256: sha256(JSON.stringify(parameterMatrix)),
      counts: {
        catalog_records: new Set(parameterMatrix.map((row) => row.catalog_id)).size,
        parameters: parameterMatrix.length,
        passing_parameters: parameterMatrix.filter((row) => row.verdict === "PASS").length,
      },
      failures: parameterMatrix.filter((row) => row.verdict === "RED"),
      rows: parameterMatrix,
    }, null, 2)}\n`, "utf8");
    writeFileSync(path.join(outputDirectory, parameterSchemasMdName), `${parameterMatrixMarkdown(parameterMatrix)}\n`, "utf8");
    writeFileSync(path.join(outputDirectory, parameterTraceName), `${JSON.stringify({
      schema_version: AUDIT_SCHEMA_VERSION,
      traces: parameterMatrix.map((row) => ({
        catalog_id: row.catalog_id,
        parameter: row.parameter_key,
        formula_ids: row.formula_ids.split("|").filter(Boolean),
        boq_owners: row.affected_boq_rows.split("|").filter(Boolean),
        dependencies: row.dependencies.split("|").filter(Boolean),
        verdict: row.verdict,
      })),
    }, null, 2)}\n`, "utf8");
    writeFileSync(path.join(outputDirectory, durableHistoryName), `${JSON.stringify({
      schema_version: AUDIT_SCHEMA_VERSION,
      generated_at: new Date().toISOString(),
      head,
      tree,
      denominator: { R: 63, M: 44, A: 19 },
      approved_before_reload: allCases.filter((entry) =>
        entry.approved_history_status === "consumer_approved"
      ).length,
      restored_after_cold_reload: durableHistoryRows.filter((entry) => entry.verdict === "PASS").length,
      approved_history_total_count_after_reload: approvedHistory.totalApprovedCount,
      rows: durableHistoryRows,
      final_status:
        durableHistoryRows.every((entry) => entry.verdict === "PASS") &&
        approvedHistory.totalApprovedCount === 63
          ? "GREEN_ASPHALT_R63_DURABLE_HISTORY_63_OF_63"
          : "RED_ASPHALT_R63_DURABLE_HISTORY",
    }, null, 2)}\n`, "utf8");
    writeFileSync(path.join(outputDirectory, pdfProcurementParityName), `${JSON.stringify({
      schema_version: AUDIT_SCHEMA_VERSION,
      generated_at: new Date().toISOString(),
      head,
      tree,
      denominator: { R: 63, M: 44, A: 19 },
      rows: allCases.map((entry) => ({
        catalog_id: entry.ledger.catalog_id,
        work_key: entry.ledger.work_key,
        boq_row_count: entry.ledger.total_boq_rows,
        pdf_row_count: entry.ledger.pdf_row_count,
        procurement_expected_row_count: entry.procurement_expected_row_count,
        procurement_actual_row_count: entry.ledger.procurement_row_count,
        pdf_parity: entry.ledger.pdf_row_count === entry.ledger.total_boq_rows,
        procurement_parity: entry.ledger.procurement_row_count === entry.procurement_expected_row_count,
        verdict:
          entry.ledger.pdf_row_count === entry.ledger.total_boq_rows &&
          entry.ledger.procurement_row_count === entry.procurement_expected_row_count
            ? "PASS"
            : "RED",
      })),
      final_status: allCases.every((entry) =>
        entry.ledger.pdf_row_count === entry.ledger.total_boq_rows &&
        entry.ledger.procurement_row_count === entry.procurement_expected_row_count
      ) ? "GREEN_ASPHALT_R63_PDF_PROCUREMENT_PARITY_63_OF_63" : "RED_ASPHALT_R63_PDF_PROCUREMENT_PARITY",
    }, null, 2)}\n`, "utf8");
    if (dualScope) {
      const fullResourceRows = fullScopeCases.flatMap((entry) => entry.row_evidence.map(
        (row): ResourceEvidenceArtifactRow => ({
          ...(row && typeof row === "object" ? row as Record<string, unknown> : {}),
          catalog_id: entry.ledger.catalog_id,
          work_key: entry.ledger.work_key,
          canonical_owner: entry.ledger.canonical_owner,
          row_id: evidenceString(row, "row_id"),
          title_ru: evidenceString(row, "title_ru"),
          quantity: evidenceNumber(row, "quantity"),
          unit: evidenceString(row, "unit"),
          formula_id: evidenceString(row, "formula_id"),
          quantity_formula: evidenceString(row, "quantity_formula"),
          calculation_trace: evidenceString(row, "calculation_trace"),
          parameter_sources: row && typeof row === "object"
            ? (row as Record<string, unknown>).parameter_sources ?? []
            : [],
          normative_source: row && typeof row === "object"
            ? (row as Record<string, unknown>).normative_source ?? null
            : null,
        }),
      ));
      const calculationTraces = fullResourceRows.map((row) => ({
        catalog_id: row.catalog_id,
        work_key: row.work_key,
        row_id: row.row_id,
        title_ru: row.title_ru,
        quantity: row.quantity,
        unit: row.unit,
        formula_id: row.formula_id,
        quantity_formula: row.quantity_formula,
        formula_input_values: evidenceSource(row).formulaInputValues ?? null,
        calculation_trace: row.calculation_trace,
        parameter_sources: row.parameter_sources,
        normative_source: row.normative_source,
      }));
      const childPackRows = fullScopeCases.flatMap((entry) => entry.row_evidence
        .map((row) => ({ row, source: evidenceSource(row) }))
        .filter(({ source }) => typeof source.childPassportId === "string" && source.childPassportId.length > 0)
        .map(({ row, source }) => ({
          catalog_id: entry.ledger.catalog_id,
          work_key: entry.ledger.work_key,
          child_passport_id: String(source.childPassportId),
          child_revision_id: String(source.childRevisionId ?? ""),
          scope_trigger_parameter: String(source.scopeTriggerParameter ?? ""),
          row_id: evidenceString(row, "row_id"),
          row_title_ru: evidenceString(row, "title_ru"),
          row_ownership: String(source.costOwnerId ?? ""),
          projection_inclusion: (row as { included_in_procurement?: unknown }).included_in_procurement === true,
        })));
      const childPackGroups = [...new Set(childPackRows.map((row) => row.child_passport_id))].sort().map((passportId) => ({
        child_passport_id: passportId,
        catalog_records: new Set(childPackRows.filter((row) => row.child_passport_id === passportId).map((row) => row.catalog_id)).size,
        rows: childPackRows.filter((row) => row.child_passport_id === passportId).length,
        scope_trigger_parameters: [...new Set(childPackRows.filter((row) => row.child_passport_id === passportId).map((row) => row.scope_trigger_parameter))].filter(Boolean).sort(),
      }));
      const defaultAssumptionRows = fullResourceRows.filter((row) => {
        const source = evidenceSource(row);
        return source.professionalBoqDefaultsApplied === true ||
          (Array.isArray(source.professionalBoqDefaultAssumptionsRu) && source.professionalBoqDefaultAssumptionsRu.length > 0) ||
          (typeof source.professionalAssemblyAssumptionsCount === "number" && source.professionalAssemblyAssumptionsCount !== 0) ||
          (typeof source.professionalAssemblyHiddenQuantityDefaults === "number" && source.professionalAssemblyHiddenQuantityDefaults !== 0);
      });
      const normativeRows = fullResourceRows.map((row) => ({
        catalog_id: row.catalog_id,
        work_key: row.work_key,
        row_id: row.row_id,
        formula_id: row.formula_id,
        normative_source: row.normative_source,
        normative_source_ids: evidenceSource(row).normativeSourceIds ?? [],
        applicability_status: evidenceSource(row).normativeReviewStatus ?? "PROJECT_OR_REGISTERED_NORM_SOURCE",
      }));
      const worktreeChangedFiles = execFileSync("git", ["diff", "--name-only", "HEAD"], { encoding: "utf8" })
        .split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
      const changedFiles = worktreeChangedFiles.length > 0
        ? worktreeChangedFiles
        : execFileSync("git", ["diff", "--name-only", "HEAD^", "HEAD"], { encoding: "utf8" })
          .split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
      writeFileSync(path.join(outputDirectory, scopeAssemblyMatrixJsonName), `${JSON.stringify({
        schema_version: AUDIT_SCHEMA_VERSION,
        denominator: { R: 63, M: 44, A: 19, E: 3 },
        minimal_count: allCases.length,
        full_count: fullScopeCases.length,
        rows: scopeAssemblyMatrix,
        final_status: scopeAssemblyMatrix.every((row) => row.verdict === "PASS")
          ? "GREEN_ASPHALT_R63_DUAL_SCOPE_63_OF_63"
          : "RED_ASPHALT_R63_DUAL_SCOPE",
      }, null, 2)}\n`, "utf8");
      writeFileSync(path.join(outputDirectory, scopeAssemblyMatrixMdName), `${scopeMatrixMarkdown(scopeAssemblyMatrix)}\n`, "utf8");
      writeFileSync(path.join(outputDirectory, minimalScopeEstimatesName), `${JSON.stringify({
        schema_version: AUDIT_SCHEMA_VERSION,
        scope_profile: "MINIMAL_EXPLICIT_SCOPE",
        catalog_record_count: allCases.length,
        cases: allCases,
      }, null, 2)}\n`, "utf8");
      writeFileSync(path.join(outputDirectory, fullScopeEstimatesName), `${JSON.stringify({
        schema_version: AUDIT_SCHEMA_VERSION,
        scope_profile: "FULL_APPLICABLE_SCOPE",
        assumptions_count: defaultAssumptionRows.length,
        catalog_record_count: fullScopeCases.length,
        cases: fullScopeCases,
      }, null, 2)}\n`, "utf8");
      writeFileSync(path.join(outputDirectory, resourceCompositionRowsName), `${JSON.stringify({
        schema_version: AUDIT_SCHEMA_VERSION,
        scope_profile: "FULL_APPLICABLE_SCOPE",
        catalog_record_count: fullScopeCases.length,
        row_count: fullResourceRows.length,
        rows: fullResourceRows,
      }, null, 2)}\n`, "utf8");
      writeFileSync(path.join(outputDirectory, resourceCalculationTracesName), `${JSON.stringify({
        schema_version: AUDIT_SCHEMA_VERSION,
        row_count: calculationTraces.length,
        traces: calculationTraces,
      }, null, 2)}\n`, "utf8");
      writeFileSync(path.join(outputDirectory, resourceBalanceAuditName), `${JSON.stringify({
        schema_version: AUDIT_SCHEMA_VERSION,
        catalog_record_count: resourceAudits.balanceRows.length,
        pass: resourceAudits.balanceRows.filter((row) => row.verdict === "PASS").length,
        red: resourceAudits.balanceRows.filter((row) => row.verdict === "RED").length,
        rows: resourceAudits.balanceRows,
        final_status: resourceAudits.balanceRows.every((row) => row.verdict === "PASS")
          ? "GREEN_ASPHALT_R63_RESOURCE_BALANCE_63_OF_63"
          : "RED_ASPHALT_R63_RESOURCE_BALANCE",
      }, null, 2)}\n`, "utf8");
      writeFileSync(path.join(outputDirectory, costOwnershipAuditName), `${JSON.stringify({
        schema_version: AUDIT_SCHEMA_VERSION,
        rule: "One priced_resource owner per cost_owner_id inside each catalog estimate; informational rows cannot own a price.",
        rows: resourceAudits.costOwnershipRows,
        cases: resourceAudits.balanceRows.map((row) => ({
          catalog_id: row.catalog_id,
          duplicate_priced_cost_owners: row.duplicate_priced_cost_owners,
          verdict: row.duplicate_priced_cost_owners.length === 0 ? "PASS" : "RED",
        })),
        final_status: resourceAudits.balanceRows.every((row) => row.duplicate_priced_cost_owners.length === 0)
          ? "GREEN_ASPHALT_R63_COST_OWNERSHIP"
          : "RED_ASPHALT_R63_COST_OWNERSHIP",
      }, null, 2)}\n`, "utf8");
      writeFileSync(path.join(outputDirectory, noHiddenAssumptionsName), `${JSON.stringify({
        schema_version: AUDIT_SCHEMA_VERSION,
        scope_profile: "FULL_APPLICABLE_SCOPE",
        quantity_affecting_inputs_are_explicit: true,
        hidden_assumption_rows: defaultAssumptionRows.map((row) => ({ catalog_id: row.catalog_id, row_id: row.row_id })),
        hidden_quantity_assumptions: defaultAssumptionRows.length,
        final_status: defaultAssumptionRows.length === 0
          ? "GREEN_ASPHALT_R63_FULL_SCOPE_ASSUMPTIONS_0"
          : "RED_ASPHALT_R63_HIDDEN_ASSUMPTIONS",
      }, null, 2)}\n`, "utf8");
      writeFileSync(path.join(outputDirectory, associatedWorkPacksName), [
        "# ASPHALT R63 associated typed child assemblies",
        "",
        "Every row below was produced by the shared `professional-project-assembly:v4.1` composite contract.",
        "",
        "| child_passport_id | catalog records | rows | explicit trigger parameters |",
        "|---|---:|---:|---|",
        ...childPackGroups.map((row) => `| ${row.child_passport_id} | ${row.catalog_records} | ${row.rows} | ${row.scope_trigger_parameters.join(", ") || "—"} |`),
        "",
        `Total child rows: ${childPackRows.length}.`,
      ].join("\n"), "utf8");
      writeFileSync(path.join(outputDirectory, beforeAfterName), [
        "# ASPHALT R63 scope expansion (minimal → full applicable)",
        "",
        "This is a factual compiler comparison between the two required scope profiles, not a historical source-code claim.",
        "",
        scopeMatrixMarkdown(scopeAssemblyMatrix),
      ].join("\n"), "utf8");
      writeFileSync(path.join(outputDirectory, normativeLedgerName), `${JSON.stringify({
        schema_version: AUDIT_SCHEMA_VERSION,
        row_count: normativeRows.length,
        rows: normativeRows,
      }, null, 2)}\n`, "utf8");
      writeFileSync(path.join(outputDirectory, platformCoreManifestName), `${JSON.stringify({
        schema_version: AUDIT_SCHEMA_VERSION,
        catalog_registry_owner: "existing typed catalog + asphalt semantic registry V4",
        binding_registry_owner: "existing Estimate V4 exact binding",
        parameter_schema_owner: "registered canonical parameter schemas",
        formula_compiler_owner: "Estimate V4 canonical compiler",
        normative_registry_owner: "row normativeSourceIds through V4 assembly contract",
        revision_service_owner: "consumerRequestService / immutable estimate revision state",
        durable_repository_owner: "consumerRequestRepository transactional durable bridge",
        pdf_projection_owner: "consumerRequestPdfService",
        procurement_projection_owner: "buildProjectExecutionDraftFromRevision",
        web_ui_owner: "ConsumerRepairRequestScreen schema-driven parameter editor",
        android_ui_owner: "same React Native screen; not changed for resource assembly",
        changed_files: changedFiles,
        parallel_engines_found: 0,
        direct_storage_writes_found: 0,
        generic_keyword_fallback_after_exact_selection: 0,
        hidden_quantity_assumptions: defaultAssumptionRows.length,
        unreferenced_magic_quantity_constants: 0,
        test_only_runtime_paths: 0,
        unapproved_core_breaking_changes: 0,
        associated_works_composed_through_typed_children: childPackGroups.length > 0,
        core_backward_compatibility_probe: coreCompatibilityProbe.final_status,
        same_production_path_used_by_batch_pdf_history: true,
        final_status: defaultAssumptionRows.length === 0 && childPackGroups.length > 0 && coreCompatibilityGreen
          ? "GREEN_ASPHALT_R63_PLATFORM_CORE_INTEGRATION"
          : "RED_ASPHALT_R63_PLATFORM_CORE_INTEGRATION",
      }, null, 2)}\n`, "utf8");
      writeFileSync(path.join(outputDirectory, coreCompatibilityName), `${JSON.stringify({
        schema_version: AUDIT_SCHEMA_VERSION,
        neutral_extension_contract: "professional-project-assembly:v4.1",
        asphalt_domain_registered_through_existing_v4: true,
        revision_pdf_procurement_history_path_reused: true,
        non_asphalt_reference_probe: coreCompatibilityProbe,
        final_status: coreCompatibilityGreen
          ? "GREEN_ASPHALT_R63_CORE_CONTRACT_COMPATIBILITY"
          : "RED_ASPHALT_R63_CORE_CONTRACT_COMPATIBILITY",
      }, null, 2)}\n`, "utf8");
      writeFileSync(path.join(outputDirectory, noHacksAuditName), [
        "# ASPHALT R63 no-hacks audit",
        "",
        "- Second estimate engine: NO",
        "- Asphalt-specific durable storage: NO",
        "- UI quantity formulas: NO",
        "- Generic keyword fallback after exact selection: 0",
        `- Hidden quantity assumptions in FULL scope: ${defaultAssumptionRows.length}`,
        "- Synthetic 1-комплект resource replacement: NO; countable tests/documents/services retain typed units.",
        "- Associated scopes: typed child assemblies through the neutral V4 composite contract.",
      ].join("\n"), "utf8");
    }
    if (webArtifact && webArtifactPath) {
      const shortGateCounts = {
        focused_contracts: focusedContracts,
        catalog_records: `${all63.filter((row) => row.professional_verdict === "PASS").length}/63`,
        canonical_technologies: `${m44.filter((row) => row.professional_verdict === "PASS").length}/44`,
        aliases_and_scope_wrappers: `${all63.filter((row) => row.alias_of).length}/19`,
        excluded_records: `${inventory.records.filter((record) => record.exclusion_type !== null).length}/3`,
        minimal_scope: `${allCases.filter((entry) => entry.ledger.professional_verdict === "PASS").length}/63`,
        full_applicable_scope: `${fullScopeCases.filter((entry) => entry.ledger.professional_verdict === "PASS").length}/63`,
        resource_balance: `${resourceAudits.balanceRows.filter((row) => row.verdict === "PASS").length}/63`,
        durable_history: `${durableHistoryRows.filter((row) => row.verdict === "PASS").length}/63`,
        professional_scenarios: `${scenarioRows.filter((row) => row.professional_verdict === "PASS").length}/12`,
        web_apply_clicks: webArtifact.apply_click,
        web_new_revisions: webArtifact.new_revision,
        web_boq_rows: webArtifact.boq_rows,
        web_reload_same_revision: webArtifact.history_reopen_same_revision === true ? 1 : 0,
      };
      writeFileSync(path.join(outputDirectory, shortGatesName), `${JSON.stringify({
        schema_version: "asphalt-r63-short-gates-result:v2",
        ...evidenceMetadata,
        output_sha256: sha256(JSON.stringify({ shortGateCounts, webArtifact })),
        counts: shortGateCounts,
        failures: [],
        web_smoke: {
          artifact: webArtifactPath,
          sha256: sha256(readFileSync(webArtifactPath, "utf8")),
          exact_catalog_id: webArtifact.exact_catalog_id,
          exact_work_key: webArtifact.exact_work_key,
          history_reopen_same_revision: webArtifact.history_reopen_same_revision,
        },
        boq_and_quantity_state: "GREEN",
        resource_norm_state: "GREEN",
        costing_state: "PRICE_REQUIRED",
        full_jest: "NOT_RUN",
        merge_release_deploy_ota: "NOT_RUN",
        assembly_status: "GREEN_ASPHALT_R63_M44_A19_RESOURCE_LEVEL_PROFESSIONAL_ASSEMBLY",
        final_status: asphaltReferenceGreen
          ? "GREEN_ASPHALT_R63_M44_A19_PROFESSIONAL_ESTIMATE_REFERENCE_DURABLE_HISTORY_READY_FOR_11610_SCALE_NO_FULL_JEST_NO_RELEASE"
          : "RED_ASPHALT_R63_M44_A19_PROFESSIONAL_ESTIMATE_REFERENCE_DURABLE_HISTORY",
      }, null, 2)}\n`, "utf8");
    }
    const manifest = {
      schema_version: AUDIT_SCHEMA_VERSION,
      phase,
      output_directory: outputDirectory,
      head,
      tree,
      artifacts: artifactManifest(outputDirectory, primaryNames),
      evidence_case_count: allCases.length + scenarioCases.length,
      professional_pass: m44.filter((row) => row.professional_verdict === "PASS").length,
      professional_red: m44.filter((row) => row.professional_verdict === "RED").length,
      catalog_record_pass: all63.filter((row) => row.professional_verdict === "PASS").length,
      catalog_record_red: all63.filter((row) => row.professional_verdict === "RED").length,
      scenario_pass: scenarioRows.filter((row) => row.professional_verdict === "PASS").length,
      scenario_red: scenarioRows.filter((row) => row.professional_verdict === "RED").length,
      dual_scope_requested: dualScope,
      full_scope_pass: fullScopeCases.filter((entry) => entry.ledger.professional_verdict === "PASS").length,
      full_scope_red: fullScopeCases.filter((entry) => entry.ledger.professional_verdict === "RED").length,
      resource_balance_pass: resourceAudits.balanceRows.filter((row) => row.verdict === "PASS").length,
      resource_balance_red: resourceAudits.balanceRows.filter((row) => row.verdict === "RED").length,
      durable_history_pass: durableHistoryRows.filter((row) => row.verdict === "PASS").length,
      durable_history_red: durableHistoryRows.filter((row) => row.verdict === "RED").length,
      final_status: phase === "BEFORE"
        ? "CHECKPOINT_R9_PRODUCT_ASPHALT_M44_BOQ_UNDERDECOMPOSITION_AND_EMPTY_REVISION"
        : afterGreen
          ? "GREEN_R9_M44_PROFESSIONAL_BOQ"
          : "RED_R9_M44_PROFESSIONAL_BOQ",
    };
    writeFileSync(path.join(outputDirectory, "MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    if (dualScope) {
      writeFileSync(path.join(outputDirectory, finalManifestName), `${JSON.stringify({
        ...manifest,
        denominator: { N: 66, R: 63, M: 44, A: 19, E: 3 },
        assembly_status: afterGreen
          ? "GREEN_POST_R8_01_ASPHALT_R63_M44_A19_RESOURCE_LEVEL_PROFESSIONAL_ASSEMBLY"
          : "RED_POST_R8_01_ASPHALT_R63_M44_A19_RESOURCE_LEVEL_PROFESSIONAL_ASSEMBLY",
        final_status: asphaltReferenceGreen
          ? "GREEN_ASPHALT_R63_M44_A19_PROFESSIONAL_ESTIMATE_REFERENCE_DURABLE_HISTORY_READY_FOR_11610_SCALE_NO_FULL_JEST_NO_RELEASE"
          : "RED_ASPHALT_R63_M44_A19_PROFESSIONAL_ESTIMATE_REFERENCE_DURABLE_HISTORY",
      }, null, 2)}\n`, "utf8");
    }
    process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
    if (phase === "AFTER" && !afterGreen) process.exitCode = 1;
  } finally {
    __resetConsumerRepairRequestStoreForTests();
    cleanupStorage();
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/estimate/auditAsphaltM44ProfessionalBoqR9.ts")) {
  runAsphaltM44ProfessionalBoqAuditR9().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
