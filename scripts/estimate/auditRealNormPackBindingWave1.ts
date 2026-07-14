import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { runEstimateEngineRoutingAudit } from "./auditEstimateEngineRouting";
import {
  compileProductionExpandedEstimate10000,
  getProductionExpandedTemplate10000,
  isProfessionalNormPackSourceId,
  PROFESSIONAL_NORM_PACK_GROUPS,
  PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS,
} from "../../src/lib/ai/estimateTemplate10000";

export const GREEN_AI_ESTIMATE_REAL_NORM_PACK_BINDING_WAVE1_NO_BUILDS =
  "GREEN_AI_ESTIMATE_REAL_NORM_PACK_BINDING_WAVE1_NO_BUILDS" as const;
export const STOP_REAL_NORM_PACKS_EXIST_BUT_NOT_USED_BY_ENGINE =
  "STOP_REAL_NORM_PACKS_EXIST_BUT_NOT_USED_BY_ENGINE" as const;
export const STOP_REAL_NORM_PACKS_NOT_CONSUMED =
  "STOP_REAL_NORM_PACKS_NOT_CONSUMED" as const;

export const RUNTIME_ROOT = ".release-runtime/ai-estimate-real-norm-pack-binding-wave1";

const PROFESSIONAL_NORM_PACK_ROOT = "data/estimate-norms/professional";
const REQUIRED_WAVE1_GROUPS = ["tile", "plaster", "putty", "paint", "flooring", "drywall", "waterproofing"] as const;

type Wave1Group = (typeof REQUIRED_WAVE1_GROUPS)[number];

type ProfessionalNormPackJson = {
  work_group?: string;
  norm_items?: Array<{
    norm_id?: string;
    rate?: { value?: number; unit?: string };
    source?: { title?: string; url?: string; provenance?: string };
  }>;
};

type Wave1Case = {
  case_id: string;
  work_key: string;
  quantity: number;
  required_groups: readonly Wave1Group[];
};

type Wave1CaseResult = Wave1Case & {
  template_key: string | null;
  row_count: number;
  real_norm_pack_rows_count: number;
  generic_norm_rows_count: number;
  real_norm_pack_source_ids: string[];
  real_norm_pack_norm_ids: string[];
  real_norm_pack_groups: string[];
  required_groups_bound: boolean;
  rows_have_source_backed_norm_ids: boolean;
  error?: string;
};

export type RealNormPackBindingWave1Summary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_REAL_NORM_PACK_BINDING_WAVE1_NO_BUILDS
    | typeof STOP_REAL_NORM_PACKS_EXIST_BUT_NOT_USED_BY_ENGINE
    | typeof STOP_REAL_NORM_PACKS_NOT_CONSUMED;
  source_sha: string;
  runtime_summary_path?: string;
  professional_norm_pack_files_count: number;
  source_backed_norm_items_count: number;
  norm_pack_files_parsed: boolean;
  norm_pack_items_loaded_into_backend_norm_registry: boolean;
  norm_pack_items_available_to_formula_engine: boolean;
  wave1_required_groups: readonly Wave1Group[];
  wave1_backend_registry_groups: readonly string[];
  wave1_norm_pack_groups_bound: boolean;
  wave1_synthetic_norm_rows_replaced: boolean;
  wave1_rows_have_source_backed_norm_ids: boolean;
  tile_template_uses_real_norm_pack: boolean;
  plaster_template_uses_real_norm_pack: boolean;
  putty_template_uses_real_norm_pack: boolean;
  paint_template_uses_real_norm_pack: boolean;
  flooring_template_uses_real_norm_pack: boolean;
  drywall_template_uses_real_norm_pack: boolean;
  waterproofing_template_uses_real_norm_pack: boolean;
  apartment_54_uses_real_norm_packs: boolean;
  apartment_54_wave1_groups_bound: readonly string[];
  paint_has_dedicated_template: boolean;
  screed_has_dedicated_template: boolean;
  paint_200_flow_uses_paint_template: boolean;
  screed_100_flow_uses_screed_template: boolean;
  starter_cases: Wave1CaseResult[];
  availability_case_count: number;
  available_registry_norm_ids_count: number;
  missing_registry_norm_ids_in_formula_engine: string[];
  fake_green_claimed: false;
  production_db_touched: false;
  destructive_migration_run: false;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  full_jest_started: false;
  blockers: string[];
};

const GENERIC_STRUCTURAL_SOURCE_IDS = new Set([
  "src_norm_internal_labor_standards_2026_07",
  "src_norm_material_consumption_tables_2026_07",
  "src_norm_public_reference_construction_methods_2026_07",
  "src_norm_estimator_manual_service_policy_2026_07",
]);

const STARTER_CASES: readonly Wave1Case[] = Object.freeze([
  {
    case_id: "plaster_300_uses_real_norm_pack",
    work_key: "plaster_paint_interior_wall_plaster_apply_standard",
    quantity: 300,
    required_groups: ["plaster"],
  },
  {
    case_id: "tile_45_uses_real_norm_pack",
    work_key: "tile_stone_interior_ceramic_tile_lay_standard",
    quantity: 45,
    required_groups: ["tile"],
  },
  {
    case_id: "paint_200_uses_real_norm_pack",
    work_key: "paint_wall_ceiling_2_coats",
    quantity: 200,
    required_groups: ["paint"],
  },
  {
    case_id: "drywall_80_uses_real_norm_pack",
    work_key: "drywall_ceiling_interior_drywall_partition_install_standard",
    quantity: 80,
    required_groups: ["drywall"],
  },
  {
    case_id: "apartment_54_uses_wave1_real_norm_packs",
    work_key: "apartment_capital_renovation",
    quantity: 54,
    required_groups: REQUIRED_WAVE1_GROUPS,
  },
  {
    case_id: "screed_100_uses_dedicated_template",
    work_key: "screed_cement_sand_50mm",
    quantity: 100,
    required_groups: ["flooring"],
  },
]);

const FORMULA_ENGINE_AVAILABILITY_KEYS = Object.freeze([
  "tile_stone_interior_ceramic_tile_lay_standard",
  "plaster_paint_interior_wall_plaster_apply_standard",
  "plaster_paint_interior_wall_putty_apply_standard",
  "plaster_paint_interior_finish_layer_apply_standard",
  "paint_wall_ceiling_2_coats",
  "primer_wall_ceiling",
  "self_leveling_floor_5mm",
  "drywall_ceiling_interior_drywall_partition_install_standard",
  "waterproofing_interior_wet_zone_apply_standard",
]);

const REGISTRY_BY_SOURCE_ID = new Map(PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.map((item) => [item.sourceId, item]));

function isWave1RegistryItem(item: (typeof PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS)[number]): boolean {
  return REQUIRED_WAVE1_GROUPS.includes(item.workGroup as Wave1Group);
}

function requireAllFlag(): void {
  if (!process.argv.includes("--all")) {
    throw new Error("AUDIT_REAL_NORM_PACK_BINDING_WAVE1_REQUIRES_--all");
  }
}

function sourceSha(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function pathExists(filePath: string): boolean {
  try {
    statSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function readProfessionalPackFiles(): {
  filesCount: number;
  itemsCount: number;
  parsed: boolean;
  normIds: Set<string>;
  groups: Set<string>;
} {
  const root = path.join(process.cwd(), PROFESSIONAL_NORM_PACK_ROOT);
  if (!pathExists(root)) {
    return { filesCount: 0, itemsCount: 0, parsed: false, normIds: new Set(), groups: new Set() };
  }
  const normIds = new Set<string>();
  const groups = new Set<string>();
  let parsed = true;
  let filesCount = 0;
  let itemsCount = 0;
  for (const name of readdirSync(root).filter((item) => item.endsWith(".json") && item !== "work-group-remediation-plan.json")) {
    filesCount += 1;
    try {
      const pack = JSON.parse(readFileSync(path.join(root, name), "utf8")) as ProfessionalNormPackJson;
      if (pack.work_group) groups.add(pack.work_group);
      for (const item of pack.norm_items ?? []) {
        itemsCount += 1;
        if (item.norm_id) normIds.add(item.norm_id);
      }
    } catch {
      parsed = false;
    }
  }
  return { filesCount, itemsCount, parsed, normIds, groups };
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
}

function groupForSourceId(sourceId: string): string | null {
  return REGISTRY_BY_SOURCE_ID.get(sourceId)?.workGroup ?? null;
}

function compileWave1Case(testCase: Wave1Case): Wave1CaseResult {
  try {
    const template = getProductionExpandedTemplate10000(testCase.work_key);
    const compiled = compileProductionExpandedEstimate10000({
      workKey: testCase.work_key,
      quantity: testCase.quantity,
      countryCode: "KG",
    });
    const realRows = compiled.rows.filter((row) => isProfessionalNormPackSourceId(row.normSourceId));
    const realGroups = uniqueSorted(realRows.map((row) => groupForSourceId(row.normSourceId)));
    const realNormIds = uniqueSorted(realRows.map((row) => row.normId));
    const genericRows = compiled.rows.filter((row) => GENERIC_STRUCTURAL_SOURCE_IDS.has(String(row.normSourceId)));
    return {
      ...testCase,
      template_key: template.templateKey,
      row_count: compiled.rows.length,
      real_norm_pack_rows_count: realRows.length,
      generic_norm_rows_count: genericRows.length,
      real_norm_pack_source_ids: uniqueSorted(realRows.map((row) => row.normSourceId)),
      real_norm_pack_norm_ids: realNormIds,
      real_norm_pack_groups: realGroups,
      required_groups_bound: testCase.required_groups.every((group) => realGroups.includes(group)),
      rows_have_source_backed_norm_ids: realRows.length > 0 &&
        realRows.every((row) => isProfessionalNormPackSourceId(row.normSourceId) && row.normId.includes(":professional_pack:")),
    };
  } catch (error) {
    return {
      ...testCase,
      template_key: null,
      row_count: 0,
      real_norm_pack_rows_count: 0,
      generic_norm_rows_count: 0,
      real_norm_pack_source_ids: [],
      real_norm_pack_norm_ids: [],
      real_norm_pack_groups: [],
      required_groups_bound: false,
      rows_have_source_backed_norm_ids: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function availableRegistryNormIdsFromFormulaEngine(): Set<string> {
  const found = new Set<string>();
  for (const workKey of FORMULA_ENGINE_AVAILABILITY_KEYS) {
    const compiled = compileProductionExpandedEstimate10000({
      workKey,
      quantity: 25,
      countryCode: "KG",
    });
    for (const row of compiled.rows) {
      const registryItem = REGISTRY_BY_SOURCE_ID.get(row.normSourceId);
      if (registryItem) found.add(registryItem.normId);
    }
  }
  return found;
}

function writeRuntimeSummary(summary: RealNormPackBindingWave1Summary): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(process.cwd(), RUNTIME_ROOT, timestamp);
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "summary.json");
  writeFileSync(file, JSON.stringify({ ...summary, runtime_summary_path: file }, null, 2));
  return file;
}

export function runRealNormPackBindingWave1Audit(options: { writeSummary?: boolean } = {}): RealNormPackBindingWave1Summary {
  const packFiles = readProfessionalPackFiles();
  const registryNormIds = new Set(PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.map((item) => item.normId));
  const registryGroups = new Set(PROFESSIONAL_NORM_PACK_GROUPS);
  const starterCases = STARTER_CASES.map(compileWave1Case);
  const availabilityNormIds = availableRegistryNormIdsFromFormulaEngine();
  const wave1RegistryItems = PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.filter(isWave1RegistryItem);
  const missingRegistryNormIds = wave1RegistryItems
    .map((item) => item.normId)
    .filter((normId) => !availabilityNormIds.has(normId))
    .sort();
  const routingSummary = runEstimateEngineRoutingAudit({ writeSummary: false });
  const apartmentCase = starterCases.find((item) => item.case_id === "apartment_54_uses_wave1_real_norm_packs");
  const groupCase = (group: Wave1Group) => starterCases.some((item) =>
    item.required_groups.includes(group) && item.real_norm_pack_groups.includes(group),
  );
  const normPackItemsLoaded = [...packFiles.normIds].every((normId) => registryNormIds.has(normId)) &&
    PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.length >= packFiles.itemsCount;
  const wave1GroupsBound = REQUIRED_WAVE1_GROUPS.every((group) =>
    registryGroups.has(group) &&
    starterCases.some((item) => item.real_norm_pack_groups.includes(group)),
  );
  const rowsHaveSourceBackedNormIds = starterCases.every((item) => item.rows_have_source_backed_norm_ids);
  const paintCase = routingSummary.routing_cases.find((item) => item.case_id === "paint_200_two_coats");
  const screedCase = routingSummary.routing_cases.find((item) => item.case_id === "screed_100_thickness_50");
  const paint200FlowUsesPaintTemplate = paintCase?.selected_work_key === "paint_wall_ceiling_2_coats" &&
    paintCase.selected_norm_work_group === "paint" &&
    paintCase.uses_norm_pack;
  const screed100FlowUsesScreedTemplate = screedCase?.selected_work_key === "screed_cement_sand_50mm" &&
    routingSummary.screed_case_has_dedicated_template &&
    screedCase.uses_10k_template_catalog;

  const green = packFiles.filesCount >= 7 &&
    packFiles.itemsCount >= 12 &&
    packFiles.parsed &&
    normPackItemsLoaded &&
    missingRegistryNormIds.length === 0 &&
    wave1GroupsBound &&
    rowsHaveSourceBackedNormIds &&
    groupCase("tile") &&
    groupCase("plaster") &&
    groupCase("putty") &&
    groupCase("paint") &&
    groupCase("flooring") &&
    groupCase("drywall") &&
    groupCase("waterproofing") &&
    apartmentCase?.required_groups_bound === true &&
    routingSummary.paint_has_dedicated_template &&
    routingSummary.screed_has_dedicated_template &&
    paint200FlowUsesPaintTemplate &&
    screed100FlowUsesScreedTemplate;

  const totalRealRows = starterCases.reduce((sum, item) => sum + item.real_norm_pack_rows_count, 0);
  const finalStatus = green
    ? GREEN_AI_ESTIMATE_REAL_NORM_PACK_BINDING_WAVE1_NO_BUILDS
    : packFiles.filesCount >= 7 && totalRealRows === 0
      ? STOP_REAL_NORM_PACKS_EXIST_BUT_NOT_USED_BY_ENGINE
      : STOP_REAL_NORM_PACKS_NOT_CONSUMED;

  const summary: RealNormPackBindingWave1Summary = {
    final_status: finalStatus,
    source_sha: sourceSha(),
    professional_norm_pack_files_count: packFiles.filesCount,
    source_backed_norm_items_count: packFiles.itemsCount,
    norm_pack_files_parsed: packFiles.parsed,
    norm_pack_items_loaded_into_backend_norm_registry: normPackItemsLoaded,
    norm_pack_items_available_to_formula_engine: missingRegistryNormIds.length === 0,
    wave1_required_groups: REQUIRED_WAVE1_GROUPS,
    wave1_backend_registry_groups: PROFESSIONAL_NORM_PACK_GROUPS,
    wave1_norm_pack_groups_bound: wave1GroupsBound,
    wave1_synthetic_norm_rows_replaced: wave1GroupsBound,
    wave1_rows_have_source_backed_norm_ids: rowsHaveSourceBackedNormIds,
    tile_template_uses_real_norm_pack: groupCase("tile"),
    plaster_template_uses_real_norm_pack: groupCase("plaster"),
    putty_template_uses_real_norm_pack: groupCase("putty"),
    paint_template_uses_real_norm_pack: groupCase("paint"),
    flooring_template_uses_real_norm_pack: groupCase("flooring"),
    drywall_template_uses_real_norm_pack: groupCase("drywall"),
    waterproofing_template_uses_real_norm_pack: groupCase("waterproofing"),
    apartment_54_uses_real_norm_packs: apartmentCase?.required_groups_bound === true,
    apartment_54_wave1_groups_bound: apartmentCase?.real_norm_pack_groups ?? [],
    paint_has_dedicated_template: routingSummary.paint_has_dedicated_template,
    screed_has_dedicated_template: routingSummary.screed_has_dedicated_template,
    paint_200_flow_uses_paint_template: Boolean(paint200FlowUsesPaintTemplate),
    screed_100_flow_uses_screed_template: Boolean(screed100FlowUsesScreedTemplate),
    starter_cases: starterCases,
    availability_case_count: FORMULA_ENGINE_AVAILABILITY_KEYS.length,
    available_registry_norm_ids_count: availabilityNormIds.size,
    missing_registry_norm_ids_in_formula_engine: missingRegistryNormIds,
    fake_green_claimed: false,
    production_db_touched: false,
    destructive_migration_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    blockers: [
      packFiles.filesCount < 7 ? `professional_norm_pack_files_count:${packFiles.filesCount}` : "",
      packFiles.itemsCount < 12 ? `source_backed_norm_items_count:${packFiles.itemsCount}` : "",
      !packFiles.parsed ? "norm_pack_files_not_parsed" : "",
      !normPackItemsLoaded ? "norm_pack_items_not_loaded_into_backend_norm_registry" : "",
      missingRegistryNormIds.length > 0 ? `missing_registry_norm_ids_in_formula_engine:${missingRegistryNormIds.join(",")}` : "",
      !wave1GroupsBound ? "wave1_norm_pack_groups_not_bound" : "",
      !rowsHaveSourceBackedNormIds ? "wave1_rows_missing_source_backed_norm_ids" : "",
      apartmentCase?.required_groups_bound !== true ? "apartment_54_missing_wave1_real_norm_pack_groups" : "",
      !routingSummary.paint_has_dedicated_template ? "paint_dedicated_template_missing" : "",
      !routingSummary.screed_has_dedicated_template ? "screed_dedicated_template_missing" : "",
      !paint200FlowUsesPaintTemplate ? "paint_200_flow_not_using_paint_template" : "",
      !screed100FlowUsesScreedTemplate ? "screed_100_flow_not_using_screed_template" : "",
    ].filter(Boolean),
  };

  if (options.writeSummary !== false) {
    summary.runtime_summary_path = writeRuntimeSummary(summary);
  }

  return summary;
}

function main(): void {
  try {
    requireAllFlag();
    const summary = runRealNormPackBindingWave1Audit();
    console.log(JSON.stringify(summary, null, 2));
    if (summary.final_status !== GREEN_AI_ESTIMATE_REAL_NORM_PACK_BINDING_WAVE1_NO_BUILDS) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditRealNormPackBindingWave1.ts")) {
  main();
}
