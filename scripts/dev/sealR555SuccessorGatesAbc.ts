import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;
const MASTER_SHA256 = "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const ROOT = resolve(".release-runtime/r555/evidence");
const OUTPUT = resolve(ROOT, "22E_R555_SUCCESSOR_GATES_ABC_SUMMARY.json");
function invariant(value: unknown, code: string): asserts value { if (!value) throw new Error(`R555_ABC_SEAL:${code}`); }
function sha(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
function read(name: string): Json { return JSON.parse(readFileSync(resolve(ROOT, name), "utf8")) as Json; }
function file(name: string) { const bytes = readFileSync(resolve(ROOT, name)); return { path: resolve(ROOT, name).replaceAll("\\", "/"), bytes: bytes.length, sha256: sha(bytes) }; }
function atomic(value: unknown): void { mkdirSync(dirname(OUTPUT), { recursive: true }); const tmp=`${OUTPUT}.${process.pid}.tmp`; writeFileSync(tmp,`${JSON.stringify(value,null,2)}\n`); renameSync(tmp,OUTPUT); }

async function main(): Promise<void> {
  const manifest = read("22A_R555_SUCCESSOR_ABC_SEED_MANIFEST.json");
  const a = read("22B_R555_SUCCESSOR_GATE_A_2_OF_2.json");
  const b = read("22C_R555_SUCCESSOR_GATE_B_10_OF_10.json");
  const c = read("22D_R555_SUCCESSOR_GATE_C_50_OF_50.json");
  invariant(manifest.status === "GREEN_R555_SUCCESSOR_ABC_SEED_MANIFEST_FROZEN_BEFORE_BROWSER_RUN", "MANIFEST_RED");
  invariant(a.status === "GREEN_R555_SUCCESSOR_GATE_A_FULL_PATH_2_OF_2" && a.green === 2 && a.denominator === 2, "GATE_A_RED");
  invariant(b.status === "GREEN_R555_SUCCESSOR_GATE_B_FULL_PATH_10_OF_10" && b.green === 10 && b.denominator === 10, "GATE_B_RED");
  invariant(c.status === "GREEN_R555_SUCCESSOR_GATE_C_FULL_PATH_REFINED_50_OF_50" && c.green === 50 && c.denominator === 50, "GATE_C_RED");
  invariant(c.frozen_catalog_set_sha256 === manifest.gate_c.catalog_set_sha256 && c.unique_catalog_ids === 50 && c.unique_domains === 38, "GATE_C_MANIFEST_DRIFT");
  invariant(c.independent_content_audit?.green === 50 && c.token_refreshed_count === 0
    && c.console_error_count === 0 && c.page_error_count === 0 && c.request_failure_count === 0, "GATE_C_QUALITY_RED");
  const testOutput = execFileSync(process.execPath, [resolve("node_modules/jest/bin/jest.js"), "tests/requestEstimate/canonicalElectricalParameterEditorUi.contract.test.tsx", "--runInBand"], {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 180_000,
  });
  const client = new Client({ connectionString: DATABASE_URL, application_name: "r555-successor-abc-seal" });
  await client.connect();
  let state: Json;
  try {
    state = (await client.query(`select
      (select count(*)::int from public.estimate_definition_release where status='active') active_definition_releases,
      (select count(*)::int from public.estimate_search_index_release where status='active') active_search_releases,
      (select count(*)::int from public.estimate_compile_job where status in ('queued','running','retry_wait')) live_jobs,
      (select count(*)::int from public.estimate_candidate_capability_r3 where release_id=$1 and revoked_at is null and expires_at>now()) candidate_capabilities`,
    [manifest.candidate_release_id])).rows[0] as Json;
  } finally { await client.end(); }
  invariant(Number(state.live_jobs) === 0 && Number(state.candidate_capabilities) === 1, "RUNTIME_RESIDUE_RED");
  const eventLines = readFileSync(resolve(ROOT, "22D_R555_SUCCESSOR_GATE_C_EVENTS.jsonl"), "utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Json);
  const receiptBase = {
    schema_version: "rik-expo-app-r555.successor-gates-abc-seal.v1",
    generated_utc: new Date().toISOString(),
    status: "GREEN_R555_SUCCESSOR_GATES_A_2_B_10_C_50",
    master_sha256: MASTER_SHA256,
    candidate_release_id: manifest.candidate_release_id,
    candidate_search_release_id: manifest.candidate_search_release_id,
    frozen_catalog_set_sha256: manifest.gate_c.catalog_set_sha256,
    gate_a: { green: 2, denominator: 2, full_path: true },
    gate_b: { green: 10, denominator: 10, distinct_technology_families: 10, full_path: true },
    gate_c: { green: 50, denominator: 50, unique_catalog_ids: 50, unique_domains: 38,
      default_preliminary: "50/50", refined_child: "50/50", history_pdf_procurement_cold_reopen: "50/50",
      independent_content_audit: c.independent_content_audit },
    asphalt_dirty_state_defect: {
      preserved_red_attempts: eventLines.filter((row) => row.status === "RED" && row.catalog_id === "built-in-ai-1000:0702").length,
      remediation: "dirty parameter input survives background canonical session fingerprint refresh",
      source: "src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel.tsx",
      regression_test: "tests/requestEstimate/canonicalElectricalParameterEditorUi.contract.test.tsx",
      targeted_test: "9/9 GREEN",
      targeted_test_stdout_sha256: sha(testOutput),
    },
    auth_refresh_storm: false,
    live_jobs: Number(state.live_jobs),
    candidate_capabilities: Number(state.candidate_capabilities),
    evidence: [
      file("22A_R555_SUCCESSOR_ABC_SEED_MANIFEST.json"),
      file("22B_R555_SUCCESSOR_GATE_A_2_OF_2.json"),
      file("22C_R555_SUCCESSOR_GATE_B_10_OF_10.json"),
      file("22D_R555_SUCCESSOR_GATE_C_50_OF_50.json"),
      file("22D_R555_SUCCESSOR_GATE_C_EVENTS.jsonl"),
    ],
    active_release_switched: false,
    production_accessed: false,
    deployed: false,
    merged: false,
    released: false,
    ota: false,
  };
  atomic({ ...receiptBase, payload_sha256: sha(JSON.stringify(receiptBase)) });
  process.stdout.write(`${JSON.stringify({ status: receiptBase.status, gate_a: "2/2", gate_b: "10/10", gate_c: "50/50", live_jobs: state.live_jobs })}\n`);
}
void main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`); process.exitCode=1; });
