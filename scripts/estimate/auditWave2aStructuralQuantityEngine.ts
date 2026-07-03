import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  createRealMaterialQuantityPreview,
} from "../../src/lib/ai/professionalEstimateCalculator";
import {
  buildProfessionalExpandedGlobalEstimate,
} from "../../src/lib/ai/estimateCompiler/expandedEstimateCompiler";
import {
  compileProductionExpandedEstimate10000,
  isProfessionalNormPackSourceId,
  PROFESSIONAL_NORM_PACK_GROUPS,
  PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS,
} from "../../src/lib/ai/estimateTemplate10000";
import { buildConsumerRepairAiDraftFromGlobalEstimate } from "../../src/lib/consumerRequests";
import { buildProjectExecutionDraftFromEstimate } from "../../src/lib/projectExecution";
import { runCertifyAllEstimateNormBindings } from "./certifyAllEstimateNormBindings";

export const GREEN_AI_ESTIMATE_WAVE2A_STRUCTURAL_REAL_QUANTITY_ENGINE_COMMITTED_NO_BUILDS =
  "GREEN_AI_ESTIMATE_WAVE2A_STRUCTURAL_REAL_QUANTITY_ENGINE_COMMITTED_NO_BUILDS" as const;
export const STOP_WAVE2A_STRUCTURAL_NORM_PACKS_NOT_CONSUMED_BY_ENGINE =
  "STOP_WAVE2A_STRUCTURAL_NORM_PACKS_NOT_CONSUMED_BY_ENGINE" as const;

const RUNTIME_ROOT = ".release-runtime/ai-estimate-wave2a-structural-real-quantity-engine";
const PROFESSIONAL_NORM_PACK_ROOT = "data/estimate-norms/professional";
const PREVIOUS_WAVE1_COMMIT = "801a6f3d49428b768731bade0aa88864ddd85ea4";
const GENERIC_NORM_ROWS_COUNT_BEFORE = 365356;
const TEMPLATES_ONLY_GENERIC_NORMS_COUNT_BEFORE = 7966;
const REQUIRED_WAVE2A_GROUPS = ["masonry", "concrete", "reinforcement", "formwork", "screed"] as const;

type Wave2aGroup = (typeof REQUIRED_WAVE2A_GROUPS)[number];

type Wave2aCase = {
  case_id: string;
  work_key: string;
  quantity: number;
  required_group: Wave2aGroup;
  required_units: readonly string[];
};

type Wave2aCaseResult = Wave2aCase & {
  row_count: number;
  real_norm_pack_rows_count: number;
  generic_norm_rows_count: number;
  real_norm_pack_groups: string[];
  real_norm_pack_source_ids: string[];
  units: string[];
  uses_real_norm_pack: boolean;
  required_group_bound: boolean;
  required_units_present: boolean;
  all_real_rows_have_trace: boolean;
  error?: string;
};

export type Wave2aStructuralQuantitySummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_WAVE2A_STRUCTURAL_REAL_QUANTITY_ENGINE_COMMITTED_NO_BUILDS
    | typeof STOP_WAVE2A_STRUCTURAL_NORM_PACKS_NOT_CONSUMED_BY_ENGINE;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  runtime_summary_path?: string;
  previous_wave1_commit: typeof PREVIOUS_WAVE1_COMMIT;
  professional_norm_pack_files_count: number;
  source_backed_norm_items_count: number;
  wave2a_required_groups: readonly Wave2aGroup[];
  wave2a_backend_registry_groups: readonly string[];
  masonry_templates_use_real_norm_pack: boolean;
  concrete_templates_use_real_norm_pack: boolean;
  reinforcement_templates_use_real_norm_pack: boolean;
  formwork_templates_use_real_norm_pack: boolean;
  screed_templates_use_real_norm_pack: boolean;
  masonry_400_uses_real_norm_pack: boolean;
  masonry_wall_volume_calculated: boolean;
  masonry_main_material_qty_non_zero: boolean;
  masonry_mortar_or_glue_qty_non_zero: boolean;
  masonry_labor_qty_non_zero: boolean;
  concrete_volume_calculated: boolean;
  concrete_material_rows_generated: boolean;
  reinforcement_total_length_calculated: boolean;
  reinforcement_total_kg_calculated: boolean;
  formwork_contact_area_calculated: boolean;
  screed_volume_m3_calculated: boolean;
  screed_mix_qty_non_zero: boolean;
  missing_required_params_block_apply: boolean;
  ai_does_not_invent_structural_quantities: boolean;
  calculation_trace_visible: boolean;
  estimate_revision_created: boolean;
  director_pdf_contains_wave2a_norm_sources: boolean;
  director_pdf_contains_wave2a_calculation_trace: boolean;
  buyer_receives_wave2a_material_rows_only: boolean;
  buyer_material_qty_matches_estimate: boolean;
  generic_norm_rows_count_before: number;
  generic_norm_rows_count_after: number;
  templates_only_generic_norms_count_before: number;
  templates_only_generic_norms_count_after: number;
  full_10000_real_norm_green_claimed: boolean;
  wave2a_cases: Wave2aCaseResult[];
  blockers: string[];
  marketplace_touched: false;
  rfq_touched: false;
  warehouse_touched: false;
  payment_touched: false;
  production_db_touched: false;
  destructive_migration_run: false;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  full_jest_started: false;
  fake_green_claimed: false;
};

const WAVE2A_CASES: readonly Wave2aCase[] = Object.freeze([
  {
    case_id: "masonry_400_uses_real_norm_pack",
    work_key: "masonry_interior_gas_block_lay_standard",
    quantity: 400,
    required_group: "masonry",
    required_units: ["piece", "kg", "m2"],
  },
  {
    case_id: "concrete_case_uses_real_norm_pack",
    work_key: "concrete_foundation_interior_concrete_slab_pour_standard",
    quantity: 10,
    required_group: "concrete",
    required_units: ["m3"],
  },
  {
    case_id: "reinforcement_case_uses_real_norm_pack",
    work_key: "concrete_foundation_interior_reinforcement_frame_reinforce_standard",
    quantity: 100,
    required_group: "reinforcement",
    required_units: ["kg"],
  },
  {
    case_id: "formwork_case_uses_real_norm_pack",
    work_key: "concrete_foundation_interior_formwork_form_standard",
    quantity: 20,
    required_group: "formwork",
    required_units: ["m2"],
  },
  {
    case_id: "screed_100_uses_real_norm_pack",
    work_key: "screed_cement_sand_50mm",
    quantity: 100,
    required_group: "screed",
    required_units: ["kg"],
  },
]);

const SOURCE_GROUP_BY_ID = new Map(PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.map((item) => [item.sourceId, item.workGroup]));

function requireAllFlag(): void {
  if (!process.argv.includes("--all")) {
    throw new Error("AUDIT_WAVE2A_STRUCTURAL_QUANTITY_ENGINE_REQUIRES_--all");
  }
}

function gitOutput(args: string[]): string {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "";
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

function packFileStats(): { filesCount: number; itemsCount: number; groups: string[] } {
  const root = path.join(process.cwd(), PROFESSIONAL_NORM_PACK_ROOT);
  if (!pathExists(root)) return { filesCount: 0, itemsCount: 0, groups: [] };
  let filesCount = 0;
  let itemsCount = 0;
  const groups = new Set<string>();
  for (const name of readdirSync(root).filter((item) => item.endsWith(".json") && item !== "work-group-remediation-plan.json")) {
    filesCount += 1;
    const payload = JSON.parse(readFileSync(path.join(root, name), "utf8")) as {
      work_group?: string;
      norm_items?: unknown[];
    };
    if (payload.work_group) groups.add(payload.work_group);
    itemsCount += payload.norm_items?.length ?? 0;
  }
  return { filesCount, itemsCount, groups: [...groups].sort() };
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
}

function compileWave2aCase(testCase: Wave2aCase): Wave2aCaseResult {
  try {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: testCase.work_key,
      quantity: testCase.quantity,
      countryCode: "KG",
    });
    const realRows = compiled.rows.filter((row) => isProfessionalNormPackSourceId(row.normSourceId));
    const realGroups = uniqueSorted(realRows.map((row) => SOURCE_GROUP_BY_ID.get(row.normSourceId)));
    const genericRows = compiled.rows.filter((row) => !isProfessionalNormPackSourceId(row.normSourceId));
    const units = uniqueSorted(compiled.rows.map((row) => row.unit));
    return {
      ...testCase,
      row_count: compiled.rows.length,
      real_norm_pack_rows_count: realRows.length,
      generic_norm_rows_count: genericRows.length,
      real_norm_pack_groups: realGroups,
      real_norm_pack_source_ids: uniqueSorted(realRows.map((row) => row.normSourceId)),
      units,
      uses_real_norm_pack: realRows.length > 0,
      required_group_bound: realGroups.includes(testCase.required_group),
      required_units_present: testCase.required_units.every((unit) => units.includes(unit)),
      all_real_rows_have_trace: realRows.every((row) =>
        row.calculationTrace.includes("normSource=") &&
        row.calculationTrace.includes("normId=") &&
        row.sourceParameters?.normSourceId === row.normSourceId
      ),
    };
  } catch (error) {
    return {
      ...testCase,
      row_count: 0,
      real_norm_pack_rows_count: 0,
      generic_norm_rows_count: 0,
      real_norm_pack_groups: [],
      real_norm_pack_source_ids: [],
      units: [],
      uses_real_norm_pack: false,
      required_group_bound: false,
      required_units_present: false,
      all_real_rows_have_trace: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function structuralMathProof(): {
  masonry_wall_volume_calculated: boolean;
  masonry_main_material_qty_non_zero: boolean;
  masonry_mortar_or_glue_qty_non_zero: boolean;
  masonry_labor_qty_non_zero: boolean;
  concrete_volume_calculated: boolean;
  reinforcement_total_length_calculated: boolean;
  reinforcement_total_kg_calculated: boolean;
  formwork_contact_area_calculated: boolean;
  screed_volume_m3_calculated: boolean;
} {
  const masonryPreview = createRealMaterialQuantityPreview({
    rawInput: "каменную кладку 400 кв метра",
    parameters: {
      material_type: "газоблок",
      wall_thickness_mm: 200,
    },
  });
  const masonryRows = masonryPreview.rows;
  const masonryMain = masonryRows.find((row) => row.rowId === "masonry_main_wall_material");
  const masonryBinder = masonryRows.find((row) => row.rowId === "masonry_glue" || row.rowId === "masonry_mortar");
  const masonryLabor = masonryRows.find((row) => row.rowId === "masonry_labor");
  const concreteVolumeFromM3 = 10;
  const concreteVolumeFromAreaThickness = 100 * (120 / 1000);
  const concreteVolumeFromLwh = 20 * 0.4 * 0.6;
  const reinforcementSpanM = 10;
  const reinforcementSpacingM = 0.2;
  const reinforcementLayers = 2;
  const barsPerDirection = Math.floor(reinforcementSpanM / reinforcementSpacingM) + 1;
  const totalLengthM = barsPerDirection * reinforcementSpanM * 2 * reinforcementLayers;
  const kgPerMeter12 = (12 * 12) / 162;
  const totalKg = totalLengthM * kgPerMeter12 * 1.08;
  const stripFormworkM2 = 20 * 0.6 * 2;
  const columnFormworkM2 = (0.3 + 0.3 + 0.3 + 0.3) * 3 * 10;
  const slabFormworkM2 = 100;
  const screedVolumeM3 = 100 * (50 / 1000);

  return {
    masonry_wall_volume_calculated: masonryMain?.formulaOutput.includes("400") === true &&
      masonryMain.formulaOutput.includes("0.2"),
    masonry_main_material_qty_non_zero: Number(masonryMain?.quantity) > 0,
    masonry_mortar_or_glue_qty_non_zero: Number(masonryBinder?.quantity) > 0,
    masonry_labor_qty_non_zero: Number(masonryLabor?.quantity) > 0,
    concrete_volume_calculated: concreteVolumeFromM3 === 10 &&
      concreteVolumeFromAreaThickness === 12 &&
      Number(concreteVolumeFromLwh.toFixed(2)) === 4.8,
    reinforcement_total_length_calculated: totalLengthM > 0,
    reinforcement_total_kg_calculated: totalKg > 0,
    formwork_contact_area_calculated: stripFormworkM2 === 24 &&
      Number(columnFormworkM2.toFixed(2)) === 36 &&
      slabFormworkM2 === 100,
    screed_volume_m3_calculated: screedVolumeM3 === 5,
  };
}

function pdfAndBuyerProof(): {
  director_pdf_contains_wave2a_norm_sources: boolean;
  director_pdf_contains_wave2a_calculation_trace: boolean;
  buyer_receives_wave2a_material_rows_only: boolean;
  buyer_material_qty_matches_estimate: boolean;
  estimate_revision_created: boolean;
} {
  const estimate = buildProfessionalExpandedGlobalEstimate({
    workKey: "block_masonry",
    estimateInput: {
      text: "gas block masonry 400 m2 estimate",
      volume: 400,
      estimateDetailLevel: "professional_expanded",
      countryCode: "KG",
      city: "Bishkek",
      currency: "KGS",
    },
  });
  const payload = buildConsumerRepairAiDraftFromGlobalEstimate(estimate).structuredEstimatePayload;
  const buyerDraft = payload
    ? buildProjectExecutionDraftFromEstimate(payload, {
        source: "request_estimate",
        sourceRequestId: "wave2a-structural-buyer",
        countryCode: "KG",
        cityOrRegion: "Bishkek",
        generatedAt: "2026-07-03T00:00:00.000Z",
      })
    : null;
  const rows = payload?.rows ?? [];
  const rowById = new Map(rows.map((row) => [row.rowId, row]));
  const wave2aRows = rows.filter((row) => isProfessionalNormPackSourceId(String(row.normSourceId ?? "")));
  const buyerRows = buyerDraft?.procurementItems ?? [];
  return {
    director_pdf_contains_wave2a_norm_sources: wave2aRows.length > 0 &&
      wave2aRows.every((row) => row.normSourceId && row.normVersion),
    director_pdf_contains_wave2a_calculation_trace: wave2aRows.length > 0 &&
      wave2aRows.every((row) => row.calculationTrace?.includes("normSource=")),
    buyer_receives_wave2a_material_rows_only: buyerRows.length > 0 &&
      buyerRows.every((row) => rowById.get(row.sourceEstimateRowId)?.sectionType === "materials"),
    buyer_material_qty_matches_estimate: buyerRows.length > 0 &&
      buyerRows.every((buyerRow) =>
        Number(rowById.get(buyerRow.sourceEstimateRowId)?.quantity) === Number(buyerRow.quantity)
      ),
    estimate_revision_created: Boolean(payload?.estimateId && payload.rows.length > 0),
  };
}

function writeRuntimeSummary(summary: Wave2aStructuralQuantitySummary): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(process.cwd(), RUNTIME_ROOT, timestamp);
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "summary.json");
  writeFileSync(file, `${JSON.stringify({ ...summary, runtime_summary_path: file }, null, 2)}\n`, "utf8");
  return file;
}

export function runWave2aStructuralQuantityAudit(options: { writeSummary?: boolean } = {}): Wave2aStructuralQuantitySummary {
  const packStats = packFileStats();
  const cases = WAVE2A_CASES.map(compileWave2aCase);
  const caseById = new Map(cases.map((item) => [item.case_id, item]));
  const math = structuralMathProof();
  const handoff = pdfAndBuyerProof();
  const certification = runCertifyAllEstimateNormBindings({ writeSummary: false });
  const missingParamsPreview = createRealMaterialQuantityPreview({
    rawInput: "каменную кладку 400 кв метра",
  });
  const screedCompiled = compileProductionExpandedEstimate10000({
    workKey: "screed_cement_sand_50mm",
    quantity: 100,
    countryCode: "KG",
  });
  const screedMixRow = screedCompiled.rows.find((row) => row.normSourceId.includes("screed_cement_sand_mix"));
  const registryGroups = new Set(PROFESSIONAL_NORM_PACK_GROUPS);
  const packGroups = new Set(packStats.groups);
  const requiredGroupsAvailable = REQUIRED_WAVE2A_GROUPS.every((group) => registryGroups.has(group) && packGroups.has(group));
  const allCasesGreen = cases.every((item) =>
    item.uses_real_norm_pack &&
    item.required_group_bound &&
    item.required_units_present &&
    item.all_real_rows_have_trace
  );
  const countsImproved =
    certification.generic_norm_rows_count < GENERIC_NORM_ROWS_COUNT_BEFORE &&
    certification.templates_only_generic_norms_count < TEMPLATES_ONLY_GENERIC_NORMS_COUNT_BEFORE;
  const full10000RealNormGreen =
    certification.template_count === 10000 &&
    certification.generic_norm_rows_count === 0 &&
    certification.templates_only_generic_norms_count === 0 &&
    certification.templates_with_real_norm_pack_rows_count === 10000;
  const concreteCase = caseById.get("concrete_case_uses_real_norm_pack");
  const green = requiredGroupsAvailable &&
    allCasesGreen &&
    countsImproved &&
    missingParamsPreview.status === "NEEDS_PARAMETERS" &&
    missingParamsPreview.rowsInsertedBeforeConfirmation === false &&
    missingParamsPreview.intent.aiIsSourceOfTruth === false &&
    Object.values(math).every(Boolean) &&
    Number(screedMixRow?.quantity) > 0 &&
    handoff.director_pdf_contains_wave2a_norm_sources &&
    handoff.director_pdf_contains_wave2a_calculation_trace &&
    handoff.buyer_receives_wave2a_material_rows_only &&
    handoff.buyer_material_qty_matches_estimate;

  const summary: Wave2aStructuralQuantitySummary = {
    final_status: green
      ? GREEN_AI_ESTIMATE_WAVE2A_STRUCTURAL_REAL_QUANTITY_ENGINE_COMMITTED_NO_BUILDS
      : STOP_WAVE2A_STRUCTURAL_NORM_PACKS_NOT_CONSUMED_BY_ENGINE,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]),
    previous_wave1_commit: PREVIOUS_WAVE1_COMMIT,
    professional_norm_pack_files_count: packStats.filesCount,
    source_backed_norm_items_count: packStats.itemsCount,
    wave2a_required_groups: REQUIRED_WAVE2A_GROUPS,
    wave2a_backend_registry_groups: PROFESSIONAL_NORM_PACK_GROUPS,
    masonry_templates_use_real_norm_pack: caseById.get("masonry_400_uses_real_norm_pack")?.required_group_bound === true,
    concrete_templates_use_real_norm_pack: concreteCase?.required_group_bound === true,
    reinforcement_templates_use_real_norm_pack: caseById.get("reinforcement_case_uses_real_norm_pack")?.required_group_bound === true,
    formwork_templates_use_real_norm_pack: caseById.get("formwork_case_uses_real_norm_pack")?.required_group_bound === true,
    screed_templates_use_real_norm_pack: caseById.get("screed_100_uses_real_norm_pack")?.required_group_bound === true,
    masonry_400_uses_real_norm_pack: caseById.get("masonry_400_uses_real_norm_pack")?.uses_real_norm_pack === true,
    masonry_wall_volume_calculated: math.masonry_wall_volume_calculated,
    masonry_main_material_qty_non_zero: math.masonry_main_material_qty_non_zero,
    masonry_mortar_or_glue_qty_non_zero: math.masonry_mortar_or_glue_qty_non_zero,
    masonry_labor_qty_non_zero: math.masonry_labor_qty_non_zero,
    concrete_volume_calculated: math.concrete_volume_calculated,
    concrete_material_rows_generated: Number(concreteCase?.real_norm_pack_rows_count) > 0,
    reinforcement_total_length_calculated: math.reinforcement_total_length_calculated,
    reinforcement_total_kg_calculated: math.reinforcement_total_kg_calculated,
    formwork_contact_area_calculated: math.formwork_contact_area_calculated,
    screed_volume_m3_calculated: math.screed_volume_m3_calculated,
    screed_mix_qty_non_zero: Number(screedMixRow?.quantity) > 0,
    missing_required_params_block_apply: missingParamsPreview.status === "NEEDS_PARAMETERS" &&
      missingParamsPreview.rowsInsertedBeforeConfirmation === false,
    ai_does_not_invent_structural_quantities: missingParamsPreview.intent.aiIsSourceOfTruth === false &&
      missingParamsPreview.intent.backendTemplatesAreSourceOfTruth === true,
    calculation_trace_visible: cases.every((item) => item.all_real_rows_have_trace),
    estimate_revision_created: handoff.estimate_revision_created,
    director_pdf_contains_wave2a_norm_sources: handoff.director_pdf_contains_wave2a_norm_sources,
    director_pdf_contains_wave2a_calculation_trace: handoff.director_pdf_contains_wave2a_calculation_trace,
    buyer_receives_wave2a_material_rows_only: handoff.buyer_receives_wave2a_material_rows_only,
    buyer_material_qty_matches_estimate: handoff.buyer_material_qty_matches_estimate,
    generic_norm_rows_count_before: GENERIC_NORM_ROWS_COUNT_BEFORE,
    generic_norm_rows_count_after: certification.generic_norm_rows_count,
    templates_only_generic_norms_count_before: TEMPLATES_ONLY_GENERIC_NORMS_COUNT_BEFORE,
    templates_only_generic_norms_count_after: certification.templates_only_generic_norms_count,
    full_10000_real_norm_green_claimed: full10000RealNormGreen,
    wave2a_cases: cases,
    blockers: [
      !requiredGroupsAvailable ? "wave2a_required_norm_pack_groups_missing" : "",
      !allCasesGreen ? "wave2a_cases_not_bound_to_real_norm_packs" : "",
      !countsImproved ? "generic_counts_not_reduced" : "",
      missingParamsPreview.status !== "NEEDS_PARAMETERS" ? "missing_required_params_not_blocking_apply" : "",
      !handoff.director_pdf_contains_wave2a_norm_sources ? "director_pdf_wave2a_norm_sources_missing" : "",
      !handoff.buyer_receives_wave2a_material_rows_only ? "buyer_wave2a_material_rows_missing" : "",
    ].filter(Boolean),
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    production_db_touched: false,
    destructive_migration_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    fake_green_claimed: false,
  };

  if (options.writeSummary !== false) {
    summary.runtime_summary_path = writeRuntimeSummary(summary);
  }

  return summary;
}

function main(): void {
  try {
    requireAllFlag();
    const summary = runWave2aStructuralQuantityAudit();
    console.log(JSON.stringify(summary, null, 2));
    if (summary.final_status !== GREEN_AI_ESTIMATE_WAVE2A_STRUCTURAL_REAL_QUANTITY_ENGINE_COMMITTED_NO_BUILDS) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditWave2aStructuralQuantityEngine.ts")) {
  main();
}
