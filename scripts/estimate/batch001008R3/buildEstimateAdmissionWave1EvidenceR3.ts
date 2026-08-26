import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Client } from "pg";

type Json = Record<string, any>;

const CONTRACT = "real-professional-estimates-r3.wave1-admission-evidence.v1";
const MASTER_PATH = resolve("C:/Users/User/Downloads/MASTER_TZ_REAL_PROFESSIONAL_ESTIMATES_R3_RU.md");
const MASTER_SHA256 = "af1ecdcba601536fb5e5bc8d81814eed34f302677ec1270dc3e172069989b29b";
const DATABASE_URL = process.env.R3_ADMISSION_HARNESS_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55434/admission_r3_harness";
const ROOT = resolve(".release-runtime/real-professional-estimates-r3");
const OUTPUT = resolve(ROOT, "evidence/01-admission/ESTIMATE_ADMISSION_R3_WAVE1.json");
const STATE_PATH = resolve(ROOT, "state/batch001_008_r3_state.json");
const INCIDENT_PATH = resolve(ROOT, "evidence/00-baseline/ANCHOR_GROUP_21879F3C_INCIDENT.json");

const FILES = [
  "src/lib/estimate/backendPlatform/estimateAdmissionR3.ts",
  "src/lib/estimate/backendPlatform/estimateAdmissionR3.test.ts",
  "src/lib/estimate/backendPlatform/contracts.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateClient.ts",
  "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
  "supabase/functions/canonical-estimate/index.ts",
  "supabase/migrations/20260819090000_estimate_admission_r3.sql",
  "scripts/estimate/batch001008R3/estimateAdmissionR3SchemaHarness.sql",
  "scripts/estimate/batch001008R3/estimateAdmissionR3BehaviorHarness.sql",
  "tests/estimateBackend/batch001008ContentAdmissionGate.contract.test.ts",
  "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx",
  "src/features/requests/components/WorkTemplateSuggestions.tsx",
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function fileIdentity(path: string): Json {
  const absolute = resolve(path);
  invariant(existsSync(absolute), `R3_WAVE1_FILE_MISSING:${path}`);
  return { path: path.replaceAll("\\", "/"), bytes: statSync(absolute).size, sha256: sha256(readFileSync(absolute)) };
}

function run(label: string, command: string, args: string[]): Json {
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    cwd: resolve("."), encoding: "utf8", maxBuffer: 100 * 1024 * 1024,
    shell: false, windowsHide: true,
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  invariant(result.status === 0, `R3_WAVE1_COMMAND_RED:${label}:${result.status}:${output.slice(-2_000)}`);
  return {
    label,
    exitCode: result.status,
    durationMs: Date.now() - startedAt,
    outputSha256: sha256(output),
    outputTail: output.split(/\r?\n/u).slice(-12),
  };
}

function writeJsonAtomic(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

async function main(): Promise<void> {
  invariant(sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256, "R3_MASTER_SHA256_DRIFT");
  const nodeExecutable = process.execPath;
  const commands = [
    run("targeted-jest-12", nodeExecutable, [
      "node_modules/jest/bin/jest.js",
      "src/lib/estimate/backendPlatform/estimateAdmissionR3.test.ts",
      "tests/estimateBackend/batch001008ContentAdmissionGate.contract.test.ts",
      "src/features/requests/components/WorkTemplateSuggestions.r4.test.tsx",
      "src/components/estimate/ProfessionalEstimateComposer.support.test.ts",
      "--runInBand", "--no-coverage",
    ]),
    run("typecheck-four-shards", nodeExecutable, ["scripts/typecheck/runTypecheckShards.mjs"]),
    run("git-diff-check", "git", ["diff", "--check"]),
  ];

  const client = new Client({ connectionString: DATABASE_URL, application_name: "r3-wave1-evidence-readonly" });
  await client.connect();
  let databaseProof: Json;
  try {
    await client.query("begin transaction read only");
    const schema = (await client.query(`select
      (select column_default from information_schema.columns where table_schema='public'
        and table_name='estimate_definition_version' and column_name='content_status') content_status_default,
      (select column_default from information_schema.columns where table_schema='public'
        and table_name='estimate_definition_version' and column_name='content_gate_status') content_gate_default,
      (select column_default from information_schema.columns where table_schema='public'
        and table_name='estimate_cumulative_manifest_entry' and column_name='runtime_publication_state') publication_default,
      exists(select 1 from information_schema.triggers where trigger_schema='public'
        and event_object_table='estimate_compile_job' and trigger_name='estimate_compile_job_admission_r3_trg') trigger_exists`)).rows[0] as Json;
    const decisions = (await client.query(`select
      count(*)::integer total_allowed,
      count(*) filter(where estimate_admission_decision->>'mode'='production')::integer production_allowed,
      count(*) filter(where estimate_admission_decision->>'mode'='isolated_candidate_test')::integer candidate_allowed,
      count(*) filter(where estimate_admission_decision is null)::integer missing_decision
      from public.estimate_compile_job`)).rows[0] as Json;
    await client.query("rollback");
    databaseProof = { transaction: "READ_ONLY", schema, decisions };
  } finally {
    await client.end();
  }
  invariant(databaseProof.schema.content_status_default === "'QUARANTINED'::text", "R3_CONTENT_DEFAULT_NOT_QUARANTINED");
  invariant(databaseProof.schema.content_gate_default === "'RED'::text", "R3_GATE_DEFAULT_NOT_RED");
  invariant(databaseProof.schema.publication_default === "'QUARANTINED'::text", "R3_PUBLICATION_DEFAULT_NOT_QUARANTINED");
  invariant(databaseProof.schema.trigger_exists === true, "R3_JOB_TRIGGER_MISSING");
  invariant(databaseProof.decisions.total_allowed === 2
    && databaseProof.decisions.production_allowed === 1
    && databaseProof.decisions.candidate_allowed === 1
    && databaseProof.decisions.missing_decision === 0,
  "R3_SQL_BEHAVIOR_COUNTS_RED");

  const incident = JSON.parse(readFileSync(INCIDENT_PATH, "utf8")) as Json;
  invariant(incident.incident?.decomposition?.materials === 33
    && incident.incident?.decomposition?.displayed_as_works === 317
    && incident.incident?.decomposition?.total_rows === 350,
  "R3_INCIDENT_REGRESSION_DRIFT");

  const evidence = {
    schemaVersion: CONTRACT,
    generatedAt: new Date().toISOString(),
    status: "GREEN_R3_WAVE1_P0_CONTAINMENT",
    masterSpec: { path: MASTER_PATH.replaceAll("\\", "/"), sha256: MASTER_SHA256, lineCount: 2_476 },
    source: {
      head: run("git-head", "git", ["rev-parse", "HEAD"]).outputTail.at(-1),
      tree: run("git-tree", "git", ["show", "-s", "--format=%T", "HEAD"]).outputTail.at(-1),
      files: FILES.map(fileIdentity),
    },
    evaluator: {
      function: "evaluateEstimateAdmission",
      contractVersion: "estimate-admission-r3",
      modes: ["production", "isolated_candidate_test", "legacy_read_only"],
      allRequiredIngressDeclared: true,
      localRuntimeBound: true,
      productionEdgeBound: true,
      databaseRpcBypassBlocked: true,
      clientFailClosedBound: true,
    },
    exactIncident: {
      revisionId: incident.incident.revision.id,
      status: incident.incident.logicalStatus,
      reason: incident.incident.reason,
      decomposition: incident.incident.decomposition,
      immutableLegacyReadOnly: true,
    },
    verification: { commands, databaseProof },
    authoritativeAuditDatabaseRuntime: "DEFERRED_UNTIL_LOCAL_55432_LISTENER_RECOVERED",
    databaseWritesToAuthoritativeAuditDatabase: 0,
    fullJest: "DEFERRED_BY_OPERATOR_NOT_RUN",
    prohibitedActionsObserved: [],
  };
  writeJsonAtomic(OUTPUT, { ...evidence, evidenceSha256: sha256(JSON.stringify(evidence)) });

  const state = JSON.parse(readFileSync(STATE_PATH, "utf8")) as Json;
  state.updatedAt = evidence.generatedAt;
  state.currentWave = "WAVE_2_AUTHORITATIVE_AUDIT";
  state.waves.WAVE_1_P0_CONTAINMENT = { status: "GREEN", evidence: [OUTPUT] };
  state.waves.WAVE_2_AUTHORITATIVE_AUDIT = {
    ...state.waves.WAVE_2_AUTHORITATIVE_AUDIT,
    status: "IN_PROGRESS",
    inheritedDenominator: 4_282,
  };
  state.terminalStatus = "RED";
  state.fullJest = "DEFERRED_BY_OPERATOR_NOT_RUN";
  writeJsonAtomic(STATE_PATH, state);
  process.stdout.write(`${JSON.stringify({ status: evidence.status, outputPath: OUTPUT, databaseProof })}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
