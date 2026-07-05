import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  runProfessionalBoqTruthAudit10000,
  type ProfessionalBoqTruthLedgerRow,
} from "./auditProfessionalBoqTruth10000";
import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";
import {
  PRODUCTION_GRADE_CRITICAL_CASE_SET,
  runProductionGradeCriticalCases,
  summarizeProductionGradeCaseProofs,
  validateProductionGradeCriticalCases,
  productionGradeCorpusFingerprint,
  type ProductionGradeCaseProof,
  type ProductionGradeLayerMatrixRow,
} from "./productionGradeLayerSealCore";

export const PRODUCTION_GRADE_LAYER_SEAL_ROOT = path.join(".release-runtime", "ai-estimate-production-grade-layer-seal");

export type ProductionGradePrerequisiteLayerStatus = {
  source_sha: string;
  checked_at: string;
  stale_summary_paths: string[];
  missing_summary_roots: string[];
  latest_summaries: {
    layer: string;
    path: string | null;
    source_sha: string | null;
    final_status: string | null;
    stale: boolean;
  }[];
  stale_summaries_accepted_as_green: false;
  missing_summaries_accepted_as_green: false;
};

export type ProductionGradeLayerMatrixSummary = {
  final_status: "GREEN_AI_ESTIMATE_PRODUCTION_GRADE_LAYER_MATRIX_CREATED" | "STOP_AI_ESTIMATE_PRODUCTION_GRADE_LAYER_MATRIX_INCOMPLETE";
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  case_set: typeof PRODUCTION_GRADE_CRITICAL_CASE_SET;
  production_grade_layer_matrix_created: boolean;
  templates_scanned: number;
  ready_production_grade_technical_count: number;
  blocked_templates_count: number;
  base_templates_ready_production_grade_count: number;
  expanded_templates_ready_production_grade_count: number;
  generic_rows_count: number;
  template_only_generic_rows_count: number;
  names_only_rows_count: number;
  wrong_unit_rows_count: number;
  unknown_unit_rows_count: number;
  duplicate_noise_rows_count: number;
  raw_dump_ui_count: number;
  empty_estimate_count: number;
  missing_calculator_count: number;
  missing_parameter_schema_count: number;
  missing_norm_pack_count: number;
  missing_material_rows_count: number;
  missing_service_equipment_rows_count: number;
  missing_pdf_mapping_count: number;
  missing_buyer_handoff_mapping_count: number;
  ai_invented_quantity_count: number;
  ai_invented_material_count: number;
  fake_price_count: number;
  fake_final_total_count: number;
  backend_family_packs_verified: boolean;
  calculators_verified: boolean;
  norm_packs_verified: boolean;
  recipes_verified: boolean;
  compiled_boq_verified: boolean;
  request_runtime_verified: boolean;
  grouped_ui_verified: boolean;
  snapshot_verified: boolean;
  pdf_from_snapshot_verified: boolean;
  buyer_handoff_verified: boolean;
  critical_cases_count: number;
  critical_cases_passed: number;
  critical_cases_failed: number;
  critical_cases_same_corpus_fingerprint: string;
  fixture_validation_blockers: string[];
  production_case_blockers: string[];
  sample_outputs_created: boolean;
  sample_outputs_count: number;
  sample_outputs_dir: string | null;
  prerequisite_layer_status_path: string;
  stale_prerequisite_summaries: string[];
  missing_prerequisite_roots: string[];
  stale_summaries_accepted_as_green: false;
  render_staging_started: false;
  owner_go_no_go_started: false;
  marketplace_touched: false;
  rfq_touched: false;
  warehouse_touched: false;
  payment_touched: false;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  production_db_touched: false;
  destructive_migration_run: false;
  full_jest_started: false;
  fake_green_claimed: false;
  matrix_artifact: string;
  truth_ledger_artifact: string | null;
  summary_artifact: string;
  blocking_reasons: string[];
};

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function walkFiles(root: string, fileName: string): string[] {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(root)) {
    const fullPath = path.join(root, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) files.push(...walkFiles(fullPath, fileName));
    if (stats.isFile() && entry === fileName) files.push(fullPath);
  }
  return files;
}

function newestFile(files: string[]): string | null {
  return files
    .map((filePath) => ({ filePath, mtimeMs: statSync(filePath).mtimeMs }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs)[0]?.filePath ?? null;
}

function prerequisiteLayerStatus(sourceSha: string): ProductionGradePrerequisiteLayerStatus {
  const roots = [
    { layer: "current_head_layered_refresh", root: path.join(".release-runtime", "ai-estimate-current-head-layered-refresh") },
    { layer: "professional_boq_runtime_contract", root: path.join(".release-runtime", "ai-estimate-professional-boq-runtime-contract") },
    { layer: "real_11610_expanded_professional_boq", root: path.join(".release-runtime", "ai-estimate-11610-real-expanded-professional-boq") },
    { layer: "truth_10000_plus_expanded", root: path.join(".release-runtime", "ai-estimate-10k-professional-boq-truth-audit") },
    { layer: "wave2b_wrong_units", root: path.join(".release-runtime", "ai-estimate-wave2b-wrong-units") },
    { layer: "wave2c_expanded_1610", root: path.join(".release-runtime", "ai-estimate-wave2c-expanded-1610") },
  ];
  const latest = roots.map((item) => {
    const latestPath = newestFile(walkFiles(item.root, "summary.json"));
    if (!latestPath) {
      return {
        layer: item.layer,
        path: null,
        source_sha: null,
        final_status: null,
        stale: false,
      };
    }
    const parsed = readJson<{ source_sha?: string; final_status?: string }>(latestPath);
    return {
      layer: item.layer,
      path: latestPath,
      source_sha: parsed.source_sha ?? null,
      final_status: parsed.final_status ?? null,
      stale: (parsed.source_sha ?? null) !== sourceSha,
    };
  });
  return {
    source_sha: sourceSha,
    checked_at: new Date().toISOString(),
    stale_summary_paths: latest.filter((item) => item.stale && item.path).map((item) => item.path!),
    missing_summary_roots: latest.filter((item) => item.path == null).map((item) => item.layer),
    latest_summaries: latest,
    stale_summaries_accepted_as_green: false,
    missing_summaries_accepted_as_green: false,
  };
}

function matrixRow(row: ProfessionalBoqTruthLedgerRow): ProductionGradeLayerMatrixRow {
  const productionReady =
    row.status === "READY_PROFESSIONAL_BOQ" &&
    row.row_count > 0 &&
    row.has_work_rows &&
    row.has_material_rows &&
    (row.has_service_rows || row.has_equipment_rows_when_required) &&
    row.generic_rows_count === 0 &&
    row.template_only_generic_rows_count === 0 &&
    row.names_only_rows_count === 0 &&
    row.wrong_unit_rows_count === 0 &&
    row.unknown_unit_rows_count === 0 &&
    row.empty_estimate_count === 0 &&
    row.raw_dump_ui_count === 0 &&
    row.fake_price_count === 0 &&
    row.fake_final_total_count === 0 &&
    row.calculation_trace_valid &&
    row.norm_source_valid &&
    row.pdf_mapping_valid &&
    row.buyer_handoff_mapping_valid;
  return {
    template_id: row.template_id,
    template_name: row.template_name,
    family: row.family,
    category: row.category,
    subtype: row.subtype,
    calculator_id: row.calculator_id,
    parameter_schema_id: row.parameter_schema_id,
    norm_pack_id: row.norm_pack_id,
    source_registry_id: row.source_registry_id,
    status: row.status,
    row_count: row.row_count,
    work_rows_count: row.work_rows_count,
    material_rows_count: row.material_rows_count,
    labor_rows_count: row.labor_rows_count,
    service_rows_count: row.service_rows_count,
    equipment_rows_count: row.equipment_rows_count,
    transport_rows_count: row.transport_rows_count,
    mobilization_rows_count: row.mobilization_rows_count,
    overhead_rows_count: row.overhead_rows_count,
    grouped_ui_sections_count: row.grouped_ui_sections_count,
    pdf_row_count: row.pdf_row_count,
    buyer_handoff_row_count: row.buyer_handoff_row_count,
    generic_rows_count: row.generic_rows_count,
    template_only_generic_rows_count: row.template_only_generic_rows_count,
    wrong_unit_rows_count: row.wrong_unit_rows_count,
    unknown_unit_rows_count: row.unknown_unit_rows_count,
    empty_estimate_count: row.empty_estimate_count,
    raw_dump_ui_count: row.raw_dump_ui_count,
    fake_price_count: row.fake_price_count,
    fake_final_total_count: row.fake_final_total_count,
    calculation_trace_valid: row.calculation_trace_valid,
    norm_source_valid: row.norm_source_valid,
    pdf_mapping_valid: row.pdf_mapping_valid,
    buyer_handoff_mapping_valid: row.buyer_handoff_mapping_valid,
    production_grade_technical_ready: productionReady,
    blocking_reasons: row.blocking_reasons,
  };
}

function writeJsonl(filePath: string, rows: readonly unknown[]): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function writeSampleOutputs(outputDir: string, proofs: readonly ProductionGradeCaseProof[], sampleCount: number) {
  mkdirSync(outputDir, { recursive: true });
  const samplePaths: string[] = [];
  for (const proof of proofs.slice(0, sampleCount)) {
    const samplePath = path.join(outputDir, `${proof.case_id}.sample.json`);
    writeJson(samplePath, {
      case_id: proof.case_id,
      prompt: proof.prompt,
      coverage_group: proof.coverage_group,
      source: proof.source,
      expected_family: proof.expected_family,
      actual_family: proof.actual_family,
      row_count: proof.row_count,
      counts: {
        work: proof.work_rows_count,
        material: proof.material_rows_count,
        service: proof.service_rows_count,
        equipment: proof.equipment_rows_count,
      },
      units: proof.units,
      grouped_sections_count: proof.grouped_sections_count,
      snapshot_row_count: proof.snapshot_row_count,
      pdf_generated_from_snapshot: proof.pdf_generated_from_snapshot,
      pdf_rows_bound_to_snapshot: proof.pdf_rows_bound_to_snapshot,
      buyer_handoff_items_count: proof.buyer_handoff_items_count,
      buyer_handoff_procurement_subset_valid: proof.buyer_handoff_procurement_subset_valid,
      fake_final_total: !proof.no_fake_final_total_without_source,
      blocking_reasons: proof.blocking_reasons,
    });
    samplePaths.push(path.relative(process.cwd(), samplePath).replace(/\\/g, "/"));
  }
  return {
    output_dir: path.relative(process.cwd(), outputDir).replace(/\\/g, "/"),
    sample_count: samplePaths.length,
    sample_paths: samplePaths,
  };
}

export function buildProductionGradeEstimateLayerMatrix(input: {
  writeLedger?: boolean;
  writeSummary?: boolean;
  sampleCount?: number;
} = {}) {
  const outDir = path.join(PRODUCTION_GRADE_LAYER_SEAL_ROOT, timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const truth = runProfessionalBoqTruthAudit10000({
    writeLedger: input.writeLedger,
    writeSummary: input.writeSummary,
    generatedAt,
  });
  const matrix = truth.ledger.map(matrixRow);
  const fixtureValidationBlockers = validateProductionGradeCriticalCases();
  const caseProofs = runProductionGradeCriticalCases();
  const caseSummary = summarizeProductionGradeCaseProofs(caseProofs);
  const sampleOutputs = writeSampleOutputs(path.join(outDir, "sample-outputs"), caseProofs, input.sampleCount ?? 30);
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  const prereqStatus = prerequisiteLayerStatus(sourceSha);
  const prereqPath = path.join(outDir, "prerequisite-layer-status.json");
  const matrixPath = path.join(outDir, "layer-matrix.jsonl");
  const caseProofsPath = path.join(outDir, "critical-case-proofs.json");
  const summaryPath = path.join(outDir, "summary.json");
  const readyRows = matrix.filter((row) => row.production_grade_technical_ready);
  const blockedRows = matrix.filter((row) => !row.production_grade_technical_ready);
  const technicalSealed =
    truth.summary.templates_audited === 11610 &&
    matrix.length === 11610 &&
    readyRows.length === 11610 &&
    blockedRows.length === 0 &&
    truth.summary.ready_professional_boq_count === 11610 &&
    truth.summary.blocked_templates_count === 0 &&
    caseSummary.critical_cases_passed === 100 &&
    fixtureValidationBlockers.length === 0 &&
    sampleOutputs.sample_count >= 25;
  const blockingReasons = [
    matrix.length === 11610 ? "" : `matrix_count_invalid:${matrix.length}`,
    readyRows.length === 11610 ? "" : `production_grade_ready_count_invalid:${readyRows.length}`,
    blockedRows.length === 0 ? "" : `blocked_templates:${blockedRows.length}`,
    caseSummary.critical_cases_passed === 100 ? "" : `critical_cases_failed:${caseSummary.critical_cases_failed}`,
    fixtureValidationBlockers.length === 0 ? "" : `fixture_validation:${fixtureValidationBlockers.join("|")}`,
    sampleOutputs.sample_count >= 25 ? "" : `sample_outputs_short:${sampleOutputs.sample_count}`,
  ].filter(Boolean);
  const summary: ProductionGradeLayerMatrixSummary = {
    final_status: technicalSealed
      ? "GREEN_AI_ESTIMATE_PRODUCTION_GRADE_LAYER_MATRIX_CREATED"
      : "STOP_AI_ESTIMATE_PRODUCTION_GRADE_LAYER_MATRIX_INCOMPLETE",
    source_sha: sourceSha,
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: generatedAt,
    case_set: PRODUCTION_GRADE_CRITICAL_CASE_SET,
    production_grade_layer_matrix_created: true,
    templates_scanned: matrix.length,
    ready_production_grade_technical_count: readyRows.length,
    blocked_templates_count: blockedRows.length,
    base_templates_ready_production_grade_count: matrix.filter((row) => row.category !== "expanded_complex" && row.production_grade_technical_ready).length,
    expanded_templates_ready_production_grade_count: matrix.filter((row) => row.category === "expanded_complex" && row.production_grade_technical_ready).length,
    generic_rows_count: truth.summary.generic_rows_count,
    template_only_generic_rows_count: truth.summary.template_only_generic_rows_count,
    names_only_rows_count: truth.summary.names_only_rows_count,
    wrong_unit_rows_count: truth.summary.wrong_unit_rows_count,
    unknown_unit_rows_count: truth.summary.unknown_unit_rows_count,
    duplicate_noise_rows_count: truth.summary.duplicate_noise_rows_count,
    raw_dump_ui_count: truth.summary.raw_dump_ui_count,
    empty_estimate_count: truth.summary.empty_estimate_count,
    missing_calculator_count: matrix.filter((row) => !row.calculator_id).length,
    missing_parameter_schema_count: matrix.filter((row) => !row.parameter_schema_id).length,
    missing_norm_pack_count: matrix.filter((row) => !row.norm_pack_id).length,
    missing_material_rows_count: truth.summary.missing_material_rows_count,
    missing_service_equipment_rows_count: truth.summary.missing_service_equipment_rows_count,
    missing_pdf_mapping_count: truth.summary.missing_pdf_mapping_count,
    missing_buyer_handoff_mapping_count: truth.summary.missing_buyer_handoff_mapping_count,
    ai_invented_quantity_count: truth.summary.ai_invented_quantity_count,
    ai_invented_material_count: truth.summary.ai_invented_material_count,
    fake_price_count: truth.summary.fake_price_count,
    fake_final_total_count: truth.summary.fake_final_total_count,
    backend_family_packs_verified: readyRows.every((row) => Boolean(row.family)),
    calculators_verified: readyRows.every((row) => Boolean(row.calculator_id)),
    norm_packs_verified: readyRows.every((row) => Boolean(row.norm_pack_id)),
    recipes_verified: readyRows.every((row) => row.work_rows_count > 0 && row.material_rows_count > 0),
    compiled_boq_verified: readyRows.every((row) => row.row_count > 0),
    request_runtime_verified: caseSummary.critical_cases_passed === 100,
    grouped_ui_verified: readyRows.every((row) => row.grouped_ui_sections_count > 0) && caseProofs.every((proof) => proof.grouped_sections_count > 0),
    snapshot_verified: caseProofs.every((proof) => proof.snapshot_created && proof.snapshot_row_count === proof.row_count),
    pdf_from_snapshot_verified: readyRows.every((row) => row.pdf_mapping_valid) && caseProofs.every((proof) => proof.pdf_generated_from_snapshot && proof.pdf_rows_bound_to_snapshot),
    buyer_handoff_verified: readyRows.every((row) => row.buyer_handoff_mapping_valid) && caseProofs.every((proof) => proof.buyer_handoff_procurement_subset_valid),
    critical_cases_count: caseSummary.critical_cases_count,
    critical_cases_passed: caseSummary.critical_cases_passed,
    critical_cases_failed: caseSummary.critical_cases_failed,
    critical_cases_same_corpus_fingerprint: productionGradeCorpusFingerprint(),
    fixture_validation_blockers: fixtureValidationBlockers,
    production_case_blockers: caseSummary.blockers,
    sample_outputs_created: sampleOutputs.sample_count >= 25,
    sample_outputs_count: sampleOutputs.sample_count,
    sample_outputs_dir: sampleOutputs.output_dir,
    prerequisite_layer_status_path: path.relative(process.cwd(), prereqPath).replace(/\\/g, "/"),
    stale_prerequisite_summaries: prereqStatus.stale_summary_paths,
    missing_prerequisite_roots: prereqStatus.missing_summary_roots,
    stale_summaries_accepted_as_green: false,
    render_staging_started: false,
    owner_go_no_go_started: false,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    production_db_touched: false,
    destructive_migration_run: false,
    full_jest_started: false,
    fake_green_claimed: false,
    matrix_artifact: path.relative(process.cwd(), matrixPath).replace(/\\/g, "/"),
    truth_ledger_artifact: truth.ledgerPath,
    summary_artifact: path.relative(process.cwd(), summaryPath).replace(/\\/g, "/"),
    blocking_reasons: blockingReasons,
  };
  writeJson(prereqPath, prereqStatus);
  writeJsonl(matrixPath, matrix);
  writeJson(caseProofsPath, { case_set: PRODUCTION_GRADE_CRITICAL_CASE_SET, cases: caseProofs });
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return {
    outDir,
    prerequisiteLayerStatusPath: prereqPath,
    matrixPath,
    caseProofsPath,
    summaryPath,
    summary,
    matrix,
    caseProofs,
  };
}

if (require.main === module) {
  const result = buildProductionGradeEstimateLayerMatrix({
    writeLedger: hasFlag("write-ledger"),
    writeSummary: !hasFlag("no-write-summary") || hasFlag("write-summary"),
  });
  console.log(JSON.stringify({
    final_status: result.summary.final_status,
    templates_scanned: result.summary.templates_scanned,
    ready_production_grade_technical_count: result.summary.ready_production_grade_technical_count,
    blocked_templates_count: result.summary.blocked_templates_count,
    critical_cases_passed: `${result.summary.critical_cases_passed}/${result.summary.critical_cases_count}`,
    sample_outputs_count: result.summary.sample_outputs_count,
    blockers: result.summary.blocking_reasons.slice(0, 20),
    artifact: result.summary.summary_artifact,
  }, null, 2));
  if (result.summary.blocking_reasons.length > 0) process.exitCode = 1;
}
