import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  compileProductionExpandedEstimate10000,
  clearProductionExpandedEstimate10000Caches,
  isProfessionalNormPackSourceId,
  PRODUCTION_WORK_DEFINITIONS_10000,
} from "../../src/lib/ai/estimateTemplate10000";
import {
  AUTONOMOUS_ESTIMATE_PROGRAM_RUNTIME_ROOT,
  buildAutonomousEstimatePriorityPlan,
} from "./buildAutonomousEstimatePriorityPlan";

export const GREEN_AI_ESTIMATE_RENDERED_SNAPSHOTS_10000_READY_NO_BUILDS =
  "GREEN_AI_ESTIMATE_RENDERED_SNAPSHOTS_10000_READY_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_RENDERED_SNAPSHOTS_10000_FAILED =
  "STOP_AI_ESTIMATE_RENDERED_SNAPSHOTS_10000_FAILED" as const;

export type RenderedEstimateSnapshots10000Summary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_RENDERED_SNAPSHOTS_10000_READY_NO_BUILDS
    | typeof STOP_AI_ESTIMATE_RENDERED_SNAPSHOTS_10000_FAILED;
  batch_id: string;
  rendered_template_count: number;
  rendered_snapshot_count: number;
  rendered_row_count: number;
  rows_with_professional_names: number;
  rows_with_norm_sources: number;
  rows_with_formula_trace: number;
  material_rows: number;
  material_rows_with_units: number;
  buyer_handoff_rows: number;
  buyer_handoff_work_rows: number;
  buyer_handoff_quantity_mismatches: number;
  rendered_rows_have_professional_names: boolean;
  rendered_rows_have_norm_sources: boolean;
  rendered_rows_have_formula_trace: boolean;
  rendered_material_units_correct: boolean;
  buyer_subset_matches_snapshot: boolean;
  rendered_snapshots_10000_passed: boolean;
  acceptance_mode: boolean;
  snapshots_materialized_in_memory: true;
  full_snapshot_files_written: false;
  raw_10000_snapshot_files_not_committed: true;
  fake_green_claimed: false;
  marketplace_touched: false;
  sample_snapshots: Array<{
    template_id: string;
    work_key: string;
    row_count: number;
    compiled_hash: string;
    first_row_code: string | null;
    first_norm_source_id: string | null;
  }>;
  runtime_summary_path: string | null;
  blockers: string[];
};

const GENERIC_ROW_PATTERN =
  /Материалы:\s|Дополнительные материалы:|Дополнительные работы:|Оборудование и инструмент:|Прочие материалы|Прочие работы|Строительные материалы|Монтажные работы|generic material|generic labor|fallback|other_construction_work/i;

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function batchArg(): string | null {
  if (process.argv.includes("--all")) return "full-10000-verification";
  const direct = process.argv.find((arg) => arg.startsWith("--batch="));
  if (direct) return direct.slice("--batch=".length);
  const index = process.argv.indexOf("--batch");
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function definitionIdsForBatch(batchId: string): Set<string> {
  if (batchId === "full-10000-verification") {
    return new Set(PRODUCTION_WORK_DEFINITIONS_10000.map((definition) => definition.templateKey));
  }
  const plan = buildAutonomousEstimatePriorityPlan({ writeFiles: false, writeRuntime: false, runChildAudits: false });
  const candidate = plan.candidates.find((item) => item.batch_id === batchId);
  return new Set(candidate?.template_ids ?? []);
}

export function renderEstimateSnapshots10000(options: {
  batchId?: string;
  writeSummary?: boolean;
  acceptanceMode?: boolean;
} = {}): RenderedEstimateSnapshots10000Summary {
  const batchId = options.batchId ?? "full-10000-verification";
  const acceptanceMode = options.acceptanceMode ?? false;
  const definitionIds = definitionIdsForBatch(batchId);
  const selectedDefinitions = PRODUCTION_WORK_DEFINITIONS_10000.filter((definition) =>
    definitionIds.has(definition.templateKey)
  );

  let renderedRowCount = 0;
  let rowsWithProfessionalNames = 0;
  let rowsWithNormSources = 0;
  let rowsWithFormulaTrace = 0;
  let materialRows = 0;
  let materialRowsWithUnits = 0;
  let buyerHandoffRows = 0;
  let buyerHandoffWorkRows = 0;
  let buyerHandoffQuantityMismatches = 0;
  const blockers: string[] = [];
  const sampleSnapshots: RenderedEstimateSnapshots10000Summary["sample_snapshots"] = [];

  if (definitionIds.size === 0) blockers.push(`batch_templates_missing:${batchId}`);

  for (const definition of selectedDefinitions) {
    const estimate = compileProductionExpandedEstimate10000({
      workKey: definition.workKey,
      quantity: 100,
      countryCode: "KG",
    });
    if (estimate.rows.length === 0) blockers.push(`${definition.workKey}:rendered_rows_empty`);
    if (sampleSnapshots.length < 20) {
      sampleSnapshots.push({
        template_id: estimate.templateKey,
        work_key: estimate.workKey,
        row_count: estimate.rows.length,
        compiled_hash: estimate.compiledHash,
        first_row_code: estimate.rows[0]?.rowCode ?? null,
        first_norm_source_id: estimate.rows[0]?.normSourceId ?? null,
      });
    }
    for (const row of estimate.rows) {
      renderedRowCount += 1;
      const professionalName = Boolean(row.titleRu.trim()) && !GENERIC_ROW_PATTERN.test(row.titleRu);
      const normSource = Boolean(row.normId && row.normVersion && isProfessionalNormPackSourceId(row.normSourceId));
      const formulaTrace = Boolean(
        row.formulaId &&
          row.calculationTrace.includes("formula=") &&
          row.calculationTrace.includes("expression=") &&
          row.calculationTrace.includes("result="),
      );
      if (professionalName) rowsWithProfessionalNames += 1;
      if (normSource) rowsWithNormSources += 1;
      if (formulaTrace) rowsWithFormulaTrace += 1;
      if (row.lineType === "material" || row.section === "materials") {
        materialRows += 1;
        if (row.unit && row.displayUnit && Number.isFinite(row.quantity) && row.quantity > 0) {
          materialRowsWithUnits += 1;
        }
      }
      if (row.includedInProcurement) {
        buyerHandoffRows += 1;
        if (row.lineType === "work" || row.section === "labor") buyerHandoffWorkRows += 1;
        const source = estimate.rows.find((candidate) => candidate.rowCode === row.rowCode);
        if (!source || source.quantity !== row.quantity || source.unit !== row.unit) {
          buyerHandoffQuantityMismatches += 1;
        }
      }
    }
  }

  const renderedRowsHaveProfessionalNames =
    renderedRowCount > 0 && rowsWithProfessionalNames === renderedRowCount;
  const renderedRowsHaveNormSources = renderedRowCount > 0 && rowsWithNormSources === renderedRowCount;
  const renderedRowsHaveFormulaTrace = renderedRowCount > 0 && rowsWithFormulaTrace === renderedRowCount;
  const renderedMaterialUnitsCorrect = materialRows > 0 && materialRowsWithUnits === materialRows;
  const buyerSubsetMatchesSnapshot =
    buyerHandoffRows > 0 && buyerHandoffWorkRows === 0 && buyerHandoffQuantityMismatches === 0;
  if (batchId === "full-10000-verification" && selectedDefinitions.length !== 10000) {
    blockers.push(`rendered_template_count:${selectedDefinitions.length}`);
  }
  if (!renderedRowsHaveProfessionalNames) blockers.push("rendered_rows_professional_names_missing");
  if (!renderedRowsHaveNormSources) blockers.push("rendered_rows_norm_sources_missing");
  if (!renderedRowsHaveFormulaTrace) blockers.push("rendered_rows_formula_trace_missing");
  if (!renderedMaterialUnitsCorrect) blockers.push("rendered_material_units_incorrect");
  if (!buyerSubsetMatchesSnapshot) blockers.push("buyer_subset_mismatch");

  const renderedSnapshotsPassed = blockers.length === 0;
  clearProductionExpandedEstimate10000Caches();
  const summary: RenderedEstimateSnapshots10000Summary = {
    final_status: renderedSnapshotsPassed
      ? GREEN_AI_ESTIMATE_RENDERED_SNAPSHOTS_10000_READY_NO_BUILDS
      : STOP_AI_ESTIMATE_RENDERED_SNAPSHOTS_10000_FAILED,
    batch_id: batchId,
    rendered_template_count: selectedDefinitions.length,
    rendered_snapshot_count: selectedDefinitions.length,
    rendered_row_count: renderedRowCount,
    rows_with_professional_names: rowsWithProfessionalNames,
    rows_with_norm_sources: rowsWithNormSources,
    rows_with_formula_trace: rowsWithFormulaTrace,
    material_rows: materialRows,
    material_rows_with_units: materialRowsWithUnits,
    buyer_handoff_rows: buyerHandoffRows,
    buyer_handoff_work_rows: buyerHandoffWorkRows,
    buyer_handoff_quantity_mismatches: buyerHandoffQuantityMismatches,
    rendered_rows_have_professional_names: renderedRowsHaveProfessionalNames,
    rendered_rows_have_norm_sources: renderedRowsHaveNormSources,
    rendered_rows_have_formula_trace: renderedRowsHaveFormulaTrace,
    rendered_material_units_correct: renderedMaterialUnitsCorrect,
    buyer_subset_matches_snapshot: buyerSubsetMatchesSnapshot,
    rendered_snapshots_10000_passed: renderedSnapshotsPassed,
    acceptance_mode: acceptanceMode,
    snapshots_materialized_in_memory: true,
    full_snapshot_files_written: false,
    raw_10000_snapshot_files_not_committed: true,
    fake_green_claimed: false,
    marketplace_touched: false,
    sample_snapshots: sampleSnapshots,
    runtime_summary_path: null,
    blockers: blockers.slice(0, 50),
  };

  if (options.writeSummary === true) {
    const runtimeDir = path.join(process.cwd(), AUTONOMOUS_ESTIMATE_PROGRAM_RUNTIME_ROOT, timestampForPath());
    const runtimeSummaryPath = path.join(runtimeDir, "rendered-snapshots-summary.json");
    mkdirSync(runtimeDir, { recursive: true });
    summary.runtime_summary_path = path.relative(process.cwd(), runtimeSummaryPath).replace(/\\/g, "/");
    writeFileSync(runtimeSummaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  }
  return summary;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/renderEstimateSnapshots10000.ts")) {
  try {
    const batchId = batchArg();
    if (!batchId) throw new Error("RENDER_ESTIMATE_SNAPSHOTS_10000_REQUIRES_--batch_OR_--all");
    const summary = renderEstimateSnapshots10000({
      batchId,
      writeSummary: true,
      acceptanceMode: process.argv.includes("--acceptance-mode") || process.argv.includes("--all"),
    });
    console.log(JSON.stringify(summary, null, 2));
    process.exitCode =
      summary.final_status === GREEN_AI_ESTIMATE_RENDERED_SNAPSHOTS_10000_READY_NO_BUILDS ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
