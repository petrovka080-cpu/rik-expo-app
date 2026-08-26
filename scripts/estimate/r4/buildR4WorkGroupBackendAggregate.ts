import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;

const MASTER_SHA256 = "44084dd37cf6c6612e39fdf2aded9a34acef752e7742ee18985a8be316288585";
const EVIDENCE_ROOT = resolve(".release-runtime/real-useful-estimates-r4/evidence/current-green");
const INVENTORY_PATH = resolve(EVIDENCE_ROOT, "04_AUTHORITATIVE_WORK_GROUP_INVENTORY_R4.json");
const PLAN_PATH = resolve(EVIDENCE_ROOT, "05_WORK_GROUP_30_CASE_PLAN_R4.jsonl");
const OUTPUT_PATH = resolve(EVIDENCE_ROOT, "11_WORK_GROUP_BACKEND_AGGREGATE_R4.json");
const BATCH_DIRECTORIES: Readonly<Record<string, string>> = Object.freeze({
  "BATCH-001": "batch-001",
  "BATCH-002": "batch-002",
  "BATCH-003": "batch-003",
  "BATCH-004": "batch-004",
  "BATCH-005": "batch-005",
  "BATCH-006": "batch-006",
  "BATCH-007": "batch-007",
  "BATCH-008": "batch-008-v2",
});

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Json;
  return `{${Object.keys(record).filter((key) => record[key] !== undefined).sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function sha256(value: Buffer | string | unknown): string {
  const bytes = Buffer.isBuffer(value) || typeof value === "string" ? value : stableJson(value);
  return createHash("sha256").update(bytes).digest("hex");
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function readJsonl(path: string): Json[] {
  return readFileSync(path, "utf8").trim().split(/\r?\n/u).filter(Boolean)
    .map((line) => JSON.parse(line) as Json);
}

function artifact(path: string): Json {
  const bytes = readFileSync(path);
  return { path: path.replaceAll("\\", "/"), bytes: bytes.length, sha256: sha256(bytes) };
}

function main(): void {
  const inventory = readJson(INVENTORY_PATH);
  const plan = readJsonl(PLAN_PATH);
  invariant(inventory.master_contract_sha256 === MASTER_SHA256, "R4_BACKEND_AGGREGATE_INVENTORY_MASTER_DRIFT");
  invariant(plan.length === 23_100 && new Set(plan.map((row) => row.case_id)).size === plan.length,
    `R4_BACKEND_AGGREGATE_PLAN_RED:${plan.length}`);

  const globalCaseIds = new Set<string>();
  const batchRows: Json[] = [];
  const allGroupResults: Json[] = [];
  for (const [batchId, directory] of Object.entries(BATCH_DIRECTORIES)) {
    const root = resolve(EVIDENCE_ROOT, "work-group-runtime/backend", directory);
    const summaryPath = resolve(root, `${batchId}_BACKEND_MATRIX_R4.json`);
    const ledgerPath = resolve(root, `${batchId}_BACKEND_CASES_R4.jsonl`);
    const summary = readJson(summaryPath);
    const ledger = readJsonl(ledgerPath);
    const batchPlan = plan.filter((row) => row.batch_id === batchId);
    invariant(summary.contract === "rik-expo-app-r4.work-group-backend-matrix.v1"
      && summary.status === "GREEN_BACKEND_MATRIX_SURFACE_TERMINAL_PENDING"
      && summary.masterSha256 === MASTER_SHA256,
    `R4_BACKEND_AGGREGATE_SUMMARY_RED:${batchId}`);
    invariant(ledger.length === batchPlan.length && Number(summary.counts?.plannedCases) === ledger.length,
      `R4_BACKEND_AGGREGATE_LEDGER_COUNT_RED:${batchId}:${ledger.length}/${batchPlan.length}`);
    const planByCase = new Map(batchPlan.map((row) => [String(row.case_id), row]));
    const groupRows = new Map<string, Json[]>();
    for (const row of ledger) {
      const caseId = String(row.case_id);
      const planned = planByCase.get(caseId);
      invariant(planned && !globalCaseIds.has(caseId), `R4_BACKEND_AGGREGATE_CASE_ID_RED:${caseId}`);
      globalCaseIds.add(caseId);
      invariant(row.master_sha256 === MASTER_SHA256
        && row.batch_id === batchId
        && row.source_state_id === summary.sourceIdentity?.source_state_id
        && row.backend_surface_claim === false
        && row.production_accessed === false
        && stableJson(row.planned_surfaces) === stableJson(planned.planned_surfaces)
        && row.paired_same_input_web_android === planned.paired_same_input_web_android,
      `R4_BACKEND_AGGREGATE_CASE_BINDING_RED:${caseId}`);
      if (Number(row.case_ordinal) <= 25) {
        invariant(row.verdict === "GREEN_BACKEND_VALID_REVISION" && row.compile_job_status === "succeeded"
          && typeof row.revision_id === "string" && row.compiler_owner === "backend",
        `R4_BACKEND_AGGREGATE_VALID_RED:${caseId}`);
      } else {
        invariant(row.verdict === "GREEN_BACKEND_INVALID_REJECTED_NO_REVISION" && row.compile_job_status === "failed"
          && row.revision_id == null,
        `R4_BACKEND_AGGREGATE_INVALID_RED:${caseId}`);
      }
      const rows = groupRows.get(String(row.work_group_id)) ?? [];
      rows.push(row);
      groupRows.set(String(row.work_group_id), rows);
    }
    invariant(groupRows.size === Number(summary.counts?.workGroups), `R4_BACKEND_AGGREGATE_GROUP_COUNT_RED:${batchId}`);
    for (const [workGroupId, rows] of groupRows) {
      const web = rows.filter((row) => row.planned_surfaces.includes("WEB")).length;
      const android = rows.filter((row) => row.planned_surfaces.includes("ANDROID_API34")).length;
      const paired = rows.filter((row) => row.paired_same_input_web_android === true).length;
      const valid = rows.filter((row) => row.verdict === "GREEN_BACKEND_VALID_REVISION").length;
      const invalid = rows.filter((row) => row.verdict === "GREEN_BACKEND_INVALID_REJECTED_NO_REVISION").length;
      invariant(rows.length === 30 && new Set(rows.map((row) => row.input_sha)).size === 30
        && valid === 25 && invalid === 5 && web === 15 && android === 20 && paired === 5,
      `R4_BACKEND_AGGREGATE_GROUP_RED:${workGroupId}:${rows.length}/${valid}/${invalid}/${web}/${android}/${paired}`);
      allGroupResults.push({
        batch_id: batchId,
        work_group_id: workGroupId,
        unique_cases: 30,
        backend_valid_revisions: 25,
        backend_invalid_rejected_no_revision: 5,
        web_planned: 15,
        android_api34_planned: 20,
        paired_planned: 5,
        backend_status: "GREEN",
        surface_status: "PENDING",
      });
    }
    batchRows.push({
      batch_id: batchId,
      source_state_id: summary.sourceIdentity.source_state_id,
      component_manifest_sha256: summary.sourceIdentity.component_manifest_sha256,
      release_id: summary.release.id,
      release_key: summary.release.key,
      work_groups: groupRows.size,
      cases: ledger.length,
      valid_revisions: ledger.filter((row) => row.verdict === "GREEN_BACKEND_VALID_REVISION").length,
      invalid_rejected_no_revision: ledger.filter((row) => row.verdict === "GREEN_BACKEND_INVALID_REJECTED_NO_REVISION").length,
      summary: artifact(summaryPath),
      ledger: artifact(ledgerPath),
    });
  }

  const totals = {
    batches: batchRows.length,
    work_groups: allGroupResults.length,
    unique_cases: globalCaseIds.size,
    valid_revisions: batchRows.reduce((sum, row) => sum + Number(row.valid_revisions), 0),
    invalid_rejected_no_revision: batchRows.reduce((sum, row) => sum + Number(row.invalid_rejected_no_revision), 0),
    web_executions_planned: allGroupResults.length * 15,
    android_api34_executions_planned: allGroupResults.length * 20,
    paired_cases_planned: allGroupResults.length * 5,
  };
  invariant(stableJson(totals) === stableJson({
    batches: 8,
    work_groups: 770,
    unique_cases: 23_100,
    valid_revisions: 19_250,
    invalid_rejected_no_revision: 3_850,
    web_executions_planned: 11_550,
    android_api34_executions_planned: 15_400,
    paired_cases_planned: 3_850,
  }), `R4_BACKEND_AGGREGATE_TOTAL_RED:${stableJson(totals)}`);

  const payload = {
    contract: "rik-expo-app-r4.work-group-backend-aggregate.v1",
    status: "GREEN_BACKEND_ALL_BATCHES_SURFACES_PENDING",
    master_sha256: MASTER_SHA256,
    terminal_work_group_runtime_30_green: false,
    terminal_pending: ["WEB", "ANDROID_API34", "PAIRED_PARITY", "PDF", "PROCUREMENT", "VISUAL_REVIEW"],
    totals,
    batches: batchRows,
    group_results: allGroupResults,
    parents: {
      inventory: artifact(INVENTORY_PATH),
      case_plan: artifact(PLAN_PATH),
    },
    production_accessed: false,
    production_published: false,
  };
  const output = { ...payload, payload_sha256: sha256(payload) };
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ status: output.status, totals, outputPath: OUTPUT_PATH, payloadSha256: output.payload_sha256 }, null, 2)}\n`);
}

main();
