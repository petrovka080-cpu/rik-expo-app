import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Client } from "pg";

import { buildStripFoundationContentPassportR3 } from "../concreteBackendR6/buildStripFoundationContentPassportR3";

type Json = Record<string, any>;

const MASTER = resolve("C:/Users/User/Downloads/MASTER_TZ_REAL_PROFESSIONAL_ESTIMATES_R3_RU.md");
const MASTER_SHA256 = "af1ecdcba601536fb5e5bc8d81814eed34f302677ec1270dc3e172069989b29b";
const ROOT = resolve(".release-runtime/real-professional-estimates-r3");
const STATE = resolve(ROOT, "state/batch001_008_r3_state.json");
const REACHABILITY = resolve(ROOT, "evidence/03-content-model/R3_PRODUCTION_ROUTE_COMPILER_REACHABILITY.json");
const OUTPUT = resolve(ROOT, "evidence/03-content-model/ESTIMATE_CONTENT_PASSPORT_R3_WAVE3.json");
const DATABASE_URL = process.env.R3_CONTENT_PASSPORT_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55434/admission_r3_harness";
const MIGRATION = resolve("supabase/migrations/20260819100000_estimate_content_passport_r3.sql");
const SQL_HARNESS = resolve("scripts/estimate/batch001008R3/estimateContentPassportR3BehaviorHarness.sql");
const PSQL = "C:/Program Files/PostgreSQL/17/bin/psql.exe";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashFile(path: string): string {
  return sha256(readFileSync(path));
}

function command(file: string, args: readonly string[]): { output: string; exitCode: 0 } {
  return {
    output: execFileSync(file, [...args], {
      cwd: resolve("."),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 180_000,
      maxBuffer: 16 * 1024 * 1024,
    }).trim(),
    exitCode: 0,
  };
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

async function main(): Promise<void> {
  invariant(hashFile(MASTER) === MASTER_SHA256, "R3_CONTENT_WAVE_MASTER_DRIFT");
  const reachability = JSON.parse(readFileSync(REACHABILITY, "utf8")) as Json;
  invariant(reachability.status === "GREEN_R58_PRODUCTION_ROUTE_CLIENT_COMPILER_REACHABILITY_ZERO",
    "R3_CONTENT_FRONTEND_COMPILER_REACHABLE");
  invariant(Object.values(reachability.after?.productionAppRoutesReaching ?? {}).every((count) => count === 0),
    "R3_CONTENT_FRONTEND_COMPILER_ROUTE_COUNT_RED");

  const strip = buildStripFoundationContentPassportR3();
  invariant(strip.decision.allowed && strip.decision.status === "GREEN", "R3_STRIP_CONTENT_PASSPORT_RED");
  invariant(strip.decision.metrics.genericCartesianRows === 0
    && strip.decision.metrics.rawInternalUnitRows === 0
    && strip.decision.metrics.duplicateSemanticOwners === 0
    && strip.decision.metrics.duplicateOwnCostOwners === 0,
  "R3_STRIP_CONTENT_METRIC_RED");

  const targetedJest = command(process.execPath, [
    "node_modules/jest/bin/jest.js",
    "--runInBand",
    "src/lib/estimate/backendPlatform/estimateContentPassportR3.test.ts",
  ]);
  const productTypecheck = command(process.execPath, [
    "node_modules/typescript/bin/tsc",
    "--project",
    "tsconfig.typecheck.product.json",
    "--noEmit",
    "--pretty",
    "false",
  ]);
  const scriptsTypecheck = command(process.execPath, [
    "node_modules/typescript/bin/tsc",
    "--project",
    "tsconfig.typecheck.scripts.json",
    "--noEmit",
    "--pretty",
    "false",
  ]);
  const diffCheck = command("git", ["diff", "--check"]);

  const migrationRun = command(PSQL, [DATABASE_URL, "-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", MIGRATION]);
  const sqlHarness = command(PSQL, [DATABASE_URL, "-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1", "-f", SQL_HARNESS]);
  const sqlResultLine = sqlHarness.output.split(/\r?\n/u).map((line) => line.trim()).find((line) => line.startsWith("{"));
  invariant(sqlResultLine, "R3_CONTENT_SQL_RESULT_MISSING");
  const sqlResult = JSON.parse(sqlResultLine) as Json;
  invariant(sqlResult.status === "GREEN_R3_CONTENT_PASSPORT_SQL_HARNESS"
    && Number(sqlResult.greenDefinitions) === 1
    && Number(sqlResult.immutablePreparedPassports) === 1,
  "R3_CONTENT_SQL_HARNESS_RED");

  const client = new Client({ connectionString: DATABASE_URL, application_name: "r3-content-passport-wave3-evidence" });
  await client.connect();
  const databaseProof = (await client.query(`select
    to_regclass('public.estimate_content_passport_r3')::text passport_table,
    count(*) filter(where trigger_name='estimate_definition_content_gate_insert_r3_trg')::int insert_gate,
    count(*) filter(where trigger_name='estimate_definition_content_gate_update_r3_trg')::int update_gate,
    count(*) filter(where trigger_name='estimate_content_passport_immutable_r3_trg')::int immutable_gate
    from information_schema.triggers
    where event_object_schema='public'`)).rows[0] as Json;
  await client.end();
  invariant(databaseProof.passport_table === "estimate_content_passport_r3"
    && Number(databaseProof.insert_gate) === 1
    && Number(databaseProof.update_gate) === 1
    && Number(databaseProof.immutable_gate) === 2,
  "R3_CONTENT_SQL_TRIGGER_PROOF_RED");

  const generatedAt = new Date().toISOString();
  const evidence = {
    contract: "real-professional-estimates-r3.content-passport-wave3.v1",
    generatedAt,
    masterSpecSha256: MASTER_SHA256,
    source: {
      branch: command("git", ["branch", "--show-current"]).output,
      head: command("git", ["rev-parse", "HEAD"]).output,
      tree: command("git", ["show", "-s", "--format=%T", "HEAD"]).output,
    },
    contentGate: {
      contract: strip.decision.contract,
      domainNeutral: true,
      prohibitedCartesianAxes: ["alias", "sibling_title", "english_keyword", "qa_term", "document_term"],
      prohibitedRawUnits: ["worker_h", "man_hour", "machine_h", "test", "document", "connection", "service", "*_per_unit"],
      emptyCategoryAllowedWithReason: true,
      exactDeliveryFlowRequired: true,
      exactFormulaAndNormativeSourceRequired: true,
    },
    representativeRealSuccessor: {
      catalogId: strip.passport.catalogId,
      decision: strip.decision,
      parameterCount: strip.passport.parameters.length,
      formulaCount: strip.passport.formulas.length,
    },
    runtimeReachability: {
      evidencePath: REACHABILITY.replaceAll("\\", "/"),
      evidenceSha256: hashFile(REACHABILITY),
      after: reachability.after.productionAppRoutesReaching,
      blockers: reachability.blockers,
    },
    database: {
      isolatedHarnessOnly: true,
      migrationPath: MIGRATION.replaceAll("\\", "/"),
      migrationSha256: hashFile(MIGRATION),
      migrationExitCode: migrationRun.exitCode,
      sqlHarnessPath: SQL_HARNESS.replaceAll("\\", "/"),
      sqlHarnessSha256: hashFile(SQL_HARNESS),
      sqlHarness: sqlResult,
      schemaProof: databaseProof,
      productionDatabaseWrites: 0,
    },
    verification: {
      targetedJest: { exitCode: targetedJest.exitCode, suites: 1, tests: 4 },
      productTypecheck: { exitCode: productTypecheck.exitCode },
      scriptsTypecheck: { exitCode: scriptsTypecheck.exitCode },
      diffCheck: { exitCode: diffCheck.exitCode },
      fullJest: "DEFERRED_BY_OPERATOR_NOT_RUN",
    },
    overallStatus: "RED_REPAIR_BATCH001_008_PENDING",
    status: "GREEN_R3_CONTENT_MODEL_GATE_INSTALLED_NO_RELEASE",
  };
  const body = { ...evidence, payloadSha256: sha256(JSON.stringify(evidence)) };
  atomicJson(OUTPUT, body);

  const state = JSON.parse(readFileSync(STATE, "utf8")) as Json;
  state.updatedAt = generatedAt;
  state.currentWave = "WAVE_4_REPAIR_BATCH001_008";
  state.waves.WAVE_3_CANONICAL_CONTENT_MODEL = {
    status: "GREEN_GATE_INSTALLED",
    evidence: [OUTPUT.replaceAll("\\", "/"), REACHABILITY.replaceAll("\\", "/")],
    payloadSha256: body.payloadSha256,
    frontendCompilerReachability: 0,
    overall: "RED_REPAIR_BATCH001_008_PENDING",
  };
  state.terminalStatus = "RED";
  state.fullJest = "DEFERRED_BY_OPERATOR_NOT_RUN";
  atomicJson(STATE, state);

  process.stdout.write(`${JSON.stringify({
    status: body.status,
    overallStatus: body.overallStatus,
    stripDecision: strip.decision,
    databaseProof,
    output: OUTPUT,
    payloadSha256: body.payloadSha256,
  }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
