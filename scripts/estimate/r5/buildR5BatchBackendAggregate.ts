import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Json = Record<string, any>;

const MASTER_SHA256 = "45352facf763cd0c628a3e0c8b8bc882821928da5b8eeb9caa386b76e07a3c43";
const RELEASE_ID = "eb3f1734-d52a-5011-b2de-da1f567d90b0";
const SEARCH_RELEASE_ID = "0793f1ba-d7ea-51c3-9587-4f82a58aa774";
const RELEASE_KEY = "r5-global-approved-baseline-successor-f72416d25234";
const OUTPUT = resolve(".release-runtime/r5/evidence/11_R5_BATCH_BACKEND_AGGREGATE.json");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Json;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function fileProof(path: string): Json {
  const bytes = readFileSync(path);
  return { path: resolve(path).replaceAll("\\", "/"), bytes: bytes.length, sha256: sha256(bytes) };
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function jsonl(path: string): Json[] {
  return readFileSync(path, "utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Json);
}

function main(): void {
  const batches: Json[] = [];
  const sourceStateIds = new Set<string>();
  let groups = 0;
  let cases = 0;
  let web = 0;
  let android = 0;
  let paired = 0;
  let valid = 0;
  let invalid = 0;
  for (let number = 1; number <= 8; number += 1) {
    const batchId = `BATCH-${String(number).padStart(3, "0")}`;
    const directory = resolve(`.release-runtime/r5/evidence/batches/${batchId.toLowerCase()}`);
    const summaryPath = resolve(directory, `${batchId}_BACKEND_MATRIX_R5.json`);
    const ledgerPath = resolve(directory, `${batchId}_BACKEND_CASES_R5.jsonl`);
    const summary = JSON.parse(readFileSync(summaryPath, "utf8")) as Json;
    const rows = jsonl(ledgerPath);
    const groupCount = Number(summary.counts?.authoritative_groups ?? 0);
    invariant(summary.master_sha256 === MASTER_SHA256
      && summary.status === "GREEN_BACKEND_CONTENT_LEVELS_1_11_SURFACE_LEVELS_12_13_PENDING",
    `R5_BACKEND_AGGREGATE_SUMMARY_RED:${batchId}`);
    invariant(summary.canonical_owner?.release_id === RELEASE_ID
      && summary.canonical_owner?.search_release_id === SEARCH_RELEASE_ID,
    `R5_BACKEND_AGGREGATE_OWNER_RED:${batchId}`);
    invariant(rows.length === groupCount * 30 && rows.every((row) => row.batch_id === batchId
      && row.release_id === RELEASE_ID && row.search_release_id === SEARCH_RELEASE_ID
      && Array.isArray(row.defects) && row.defects.length === 0),
    `R5_BACKEND_AGGREGATE_LEDGER_RED:${batchId}:${rows.length}/${groupCount * 30}`);
    const groupIds = [...new Set(rows.map((row) => String(row.work_group_id)))];
    invariant(groupIds.length === groupCount && groupIds.every((groupId) => {
      const groupRows = rows.filter((row) => row.work_group_id === groupId);
      return groupRows.length === 30
        && new Set(groupRows.map((row) => row.input_sha)).size === 30
        && groupRows.filter((row) => row.planned_surfaces.includes("WEB")).length === 15
        && groupRows.filter((row) => row.planned_surfaces.includes("ANDROID_API34")).length === 20
        && groupRows.filter((row) => row.paired_same_input_web_android === true).length === 5
        && groupRows.filter((row) => row.verdict === "GREEN_BACKEND_VALID_REVISION").length === 25
        && groupRows.filter((row) => row.verdict === "GREEN_EXPECTED_INVALID_REJECTED_NO_REVISION").length === 5;
    }), `R5_BACKEND_AGGREGATE_GROUP_MATRIX_RED:${batchId}`);
    sourceStateIds.add(String(summary.source_identity?.source_state_id ?? ""));
    groups += groupCount;
    cases += rows.length;
    web += groupCount * 15;
    android += groupCount * 20;
    paired += groupCount * 5;
    valid += groupCount * 25;
    invalid += groupCount * 5;
    batches.push({
      batch_id: batchId,
      release_id: RELEASE_ID,
      release_key: RELEASE_KEY,
      search_release_id: SEARCH_RELEASE_ID,
      work_groups: groupCount,
      cases: rows.length,
      summary: fileProof(summaryPath),
      ledger: fileProof(ledgerPath),
    });
  }
  invariant(sourceStateIds.size === 1 && !sourceStateIds.has(""),
    `R5_BACKEND_AGGREGATE_SOURCE_DRIFT:${[...sourceStateIds].join(",")}`);
  invariant(groups === 678 && cases === 20_340 && web === 10_170 && android === 13_560
    && paired === 3_390 && valid === 16_950 && invalid === 3_390,
  `R5_BACKEND_AGGREGATE_DENOMINATOR_RED:${groups}/${cases}/${web}/${android}/${paired}/${valid}/${invalid}`);
  const payload = {
    contract: "rik-expo-app-r5.batch-backend-aggregate.v1",
    status: "GREEN_BACKEND_ALL_BATCHES_SURFACES_PENDING",
    master_sha256: MASTER_SHA256,
    source_state_id: [...sourceStateIds][0],
    canonical_owner: { release_id: RELEASE_ID, search_release_id: SEARCH_RELEASE_ID },
    counts: {
      authoritative_groups: groups,
      unique_cases: cases,
      web_planned: web,
      android_planned: android,
      paired_planned: paired,
      unique_surface_executions: web + android,
      valid_revisions: valid,
      expected_invalid_rejected: invalid,
    },
    batches,
    production_accessed: false,
    release_performed: false,
  };
  atomicJson(OUTPUT, { ...payload, payload_sha256: sha256(stableJson(payload)) });
  process.stdout.write(`${JSON.stringify({ status: payload.status, counts: payload.counts, output: fileProof(OUTPUT) }, null, 2)}\n`);
}

main();
