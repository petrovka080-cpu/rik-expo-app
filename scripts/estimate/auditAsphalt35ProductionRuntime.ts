import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  RoadworksWaveAProductionRegistry,
  buildAsphalt35NormativeCompositionLedgerV3,
  compileRoadworksWaveAWork,
} from "../../src/lib/estimate/v4/roadworks";
import {
  runProductionGradeEstimateCase,
  type ProductionGradeCriticalCase,
} from "./productionGradeLayerSealCore";

const exactSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const status = execFileSync("git", ["status", "--porcelain=v1"], { encoding: "utf8" }).trim();
const diff = execFileSync("git", ["diff", "--binary"], { encoding: "utf8" });
const subjectTreeHash = createHash("sha256").update(JSON.stringify({ exactSha, status, diff })).digest("hex");
const generatedAt = new Date().toISOString();
const ledger = new Map(buildAsphalt35NormativeCompositionLedgerV3().map((row) => [row.workId, row]));

function testCase(workId: string, templateId: string, label: string, executable: boolean, units: string[]): ProductionGradeCriticalCase {
  return {
    case_id: `asphalt-35:${workId}`,
    prompt: `${label} 240 м2 толщина 60 мм`,
    expected_family: workId,
    expected_template_id: templateId,
    selected_template_id: templateId,
    selected_work_key: workId,
    coverage_group: "road_earthworks",
    source: "POST_R6_01_FINAL_R1",
    required_row_types: executable ? ["work"] : ["document"],
    required_material_keywords: [],
    required_service_keywords: [],
    required_equipment_keywords: [],
    expected_units: units,
    forbidden_units: ["item"],
    high_risk_expected: true,
    pdf_required: true,
    buyer_handoff_required: executable,
    forbidden_refusal: true,
    forbidden_drawings_required_stop: true,
    forbidden_raw_dump: true,
    forbidden_fake_final_total: true,
  };
}

const results = RoadworksWaveAProductionRegistry.map((registration) => {
  const record = ledger.get(registration.workId)!;
  const executable = record.terminalDecision === "EXECUTABLE_B";
  const compiled = executable
    ? compileRoadworksWaveAWork(registration.canonicalWorkId, DEFAULT_ROADWORKS_WAVE_A_INPUTS, { scopeProfile: registration.scopeProfile })
    : null;
  const units = [...new Set((compiled?.rows ?? [{ unit: "pcs" }]).map((row) => row.unit))];
  const expectedBuyerRows = compiled?.rows.filter((row) => row.procurementOwner === "buyer").length ?? 0;
  const proof = runProductionGradeEstimateCase(testCase(
    registration.workId,
    registration.templateId,
    registration.professionalNameRu,
    executable,
    units,
  ));
  const blockers = [
    proof.actual_family === registration.workId ? "" : `family:${proof.actual_family}`,
    proof.selected_template_id === registration.templateId ? "" : `template:${proof.selected_template_id}`,
    proof.row_count === (executable ? record.resourceRowIds.length : 1) ? "" : `rows:${proof.row_count}`,
    proof.all_rows_have_canonical_unit ? "" : "non_canonical_unit",
    proof.all_rows_have_norm_source ? "" : "norm_source_missing",
    proof.all_rows_have_calculation_trace ? "" : "formula_trace_missing",
    proof.all_rows_have_runtime_contract_marker ? "" : "runtime_contract_missing",
    proof.snapshot_created && proof.snapshot_row_count === proof.row_count ? "" : "revision_snapshot_mismatch",
    proof.pdf_generated_from_snapshot && proof.pdf_rows_bound_to_snapshot && proof.pdf_storage_object_exists ? "" : "pdf_projection_mismatch",
    proof.no_raw_dump ? "" : "raw_dump_visible",
    proof.no_fake_final_total_without_source ? "" : "fake_final_total",
    proof.buyer_handoff_items_count === expectedBuyerRows ? "" : `procurement_rows:${proof.buyer_handoff_items_count}:${expectedBuyerRows}`,
    expectedBuyerRows > 0
      ? proof.buyer_handoff_created && proof.buyer_handoff_procurement_subset_valid ? "" : "buyer_handoff_mismatch"
      : proof.buyer_handoff_created ? "unexpected_buyer_handoff" : "",
    executable ? (proof.work_rows_count > 0 ? "" : "work_rows_missing") : (proof.other_rows_count === 1 ? "" : "conditional_document_missing"),
  ].filter(Boolean);
  return {
    work_id: registration.workId,
    terminal_decision: record.terminalDecision,
    expected_rows: executable ? record.resourceRowIds.length : 1,
    expected_buyer_rows: expectedBuyerRows,
    actual_rows: proof.row_count,
    actual_buyer_rows: proof.buyer_handoff_items_count,
    revision_rows: proof.snapshot_row_count,
    pdf_rows_bound: proof.pdf_rows_bound_to_snapshot,
    units: proof.units,
    blockers,
    passed: blockers.length === 0,
  };
});

const blockers = results.flatMap((row) => row.blockers.map((blocker) => `${row.work_id}:${blocker}`));
const payload = {
  schema: "asphalt-35-production-runtime-v1",
  generated_at: generatedAt,
  exact_sha: exactSha,
  subject_tree_hash: subjectTreeHash,
  dirty_subject: status.length > 0,
  records_seen: results.length,
  records_terminal: results.filter((row) => row.passed).length,
  executable_b: results.filter((row) => row.terminal_decision === "EXECUTABLE_B").length,
  blocked_c: results.filter((row) => row.terminal_decision === "BLOCKED_C").length,
  missing: 35 - results.length,
  duplicates: results.length - new Set(results.map((row) => row.work_id)).size,
  blockers,
  passed: blockers.length === 0 && results.length === 35,
  results,
};
const outDir = path.join(".release-runtime", "asphalt-v3-final-r1", exactSha, "runtime");
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "asphalt-35-engine-revision-pdf-procurement.json"), `${JSON.stringify(payload, null, 2)}\n`);
console.info(JSON.stringify({
  output: path.join(outDir, "asphalt-35-engine-revision-pdf-procurement.json"),
  subject_tree_hash: subjectTreeHash,
  records_terminal: `${payload.records_terminal}/35`,
  executable_b: payload.executable_b,
  blocked_c: payload.blocked_c,
  blockers: blockers.slice(0, 30),
}, null, 2));
if (!payload.passed) process.exitCode = 1;
