import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { Client } from "pg";

type Json = Record<string, any>;

const CONTRACT = "real-professional-estimates-r2.batch001-008-baseline-lock.v1";
const MASTER_SPEC_PATH = resolve("C:/Users/User/Downloads/MASTER_TZ_REAL_PROFESSIONAL_ESTIMATES_R1_RU (1).md");
const MASTER_SPEC_SHA256 = "b9373689e495a8d7e0883818371022eb792800baf10d19340f50c1aace08d986";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const ACTIVE_DEFINITION_RELEASE_ID = "da29dc2b-1384-5487-b8da-6ee93f4e514e";
const TARGET_DEFINITION_RELEASE_ID = process.env.CANONICAL_ESTIMATE_TARGET_RELEASE_ID
  ?? "4c5affaf-5f63-5d04-b036-875c684f8c45";
const TARGET_SEARCH_RELEASE_ID = process.env.CANONICAL_ESTIMATE_TARGET_SEARCH_RELEASE_ID
  ?? "367c2439-df83-5f27-bedd-89247b50caae";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const ROOT = resolve(".release-runtime/real-professional-estimates-r2");
const BASELINE_OUTPUT = resolve(ROOT, "evidence/00-baseline/BATCH001_008_BASELINE_LOCK.json");
const STATE_OUTPUT = resolve(ROOT, "state/batch001_008_r2_state.json");
const PRESERVED_PATHS = [
  "scripts/estimate/concreteBackendR6/buildConcreteR6ForensicAndAdjudication.ts",
  "scripts/estimate/concreteBackendR6/concreteProfessionalDefinitionsR6.ts",
  "scripts/estimate/concreteBackendR6/prepareConcreteR6StripFoundationSuccessor.ts",
  "scripts/estimate/concreteBackendR6/realProfessionalEstimateContentGateR1.ts",
  "scripts/estimate/concreteBackendR6/reinforcedConcreteStripFoundationR1.ts",
  "tests/estimateBackend/concreteR6Professional.contract.test.ts",
  ".release-runtime/real-professional-estimates-r1/evidence/02-concrete-forensic/forensic-generator-report.json",
  ".release-runtime/real-professional-estimates-r1/evidence/02-concrete-forensic/quarantine-ledger.json",
  ".release-runtime/real-professional-estimates-r1/evidence/03-successor/CONCRETE_STRIP_SUCCESSOR_DRY_RUN.json",
] as const;
const STAGES = [
  "DISCOVERY",
  "BASELINE_LOCK",
  "STATIC_AUDIT",
  "ADJUDICATION",
  "SUCCESSOR_BUILD",
  "CONTENT_GATES",
  "ROLE_REVIEW",
  "BACKEND_E2E",
  "WEB_E2E",
  "ANDROID_E2E",
  "PARITY",
  "CLOSEOUT",
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256Buffer(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(path: string): string {
  return sha256Buffer(readFileSync(path));
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function sha256(value: unknown): string {
  return sha256Buffer(Buffer.from(JSON.stringify(stable(value)), "utf8"));
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function preservedFiles(): Json[] {
  return PRESERVED_PATHS
    .map((relativePath) => ({ relativePath, absolutePath: resolve(relativePath) }))
    .filter(({ absolutePath }) => existsSync(absolutePath))
    .map(({ relativePath, absolutePath }) => ({
      path: relativePath.replaceAll("\\", "/"),
      bytes: statSync(absolutePath).size,
      sha256: sha256File(absolutePath),
    }));
}

async function main(): Promise<void> {
  invariant(existsSync(MASTER_SPEC_PATH), "R2_MASTER_SPEC_MISSING");
  invariant(sha256File(MASTER_SPEC_PATH) === MASTER_SPEC_SHA256, "R2_MASTER_SPEC_SHA256_DRIFT");

  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["show", "-s", "--format=%T", "HEAD"]);
  const worktreeStatus = git(["status", "--porcelain=v1"]);
  invariant(branch === EXPECTED_BRANCH, `R2_BASELINE_BRANCH_DRIFT:${branch}`);

  const databaseIdentity = new URL(DATABASE_URL);
  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "batch001-008-r2-baseline-lock-readonly",
  });
  await client.connect();
  let database: Json;
  let definitionReleases: Json[];
  let definitionManifestCounts: Json[];
  let searchRelease: Json;
  let mutationResidue: Json;
  try {
    database = (await client.query(`select
      current_database() database_name,
      current_setting('server_version') server_version,
      pg_is_in_recovery() in_recovery
    `)).rows[0] as Json;
    definitionReleases = (await client.query(`select
      id::text,release_key,status,parent_release_id::text,definition_count,parameter_count,
      formula_count,resource_row_count,source_commit,source_tree,source_manifest_sha256,
      source_package_sha256,sealed_at,activated_at
      from public.estimate_definition_release where id=any($1::uuid[]) order by id`, [[
      ACTIVE_DEFINITION_RELEASE_ID,
      TARGET_DEFINITION_RELEASE_ID,
    ]])).rows as Json[];
    definitionManifestCounts = (await client.query(`select release_id::text,
      count(*)::int manifest_count,count(distinct catalog_id)::int unique_catalog_count,
      count(*) filter(where domain_id='concrete')::int concrete_count
      from public.estimate_cumulative_manifest_entry where release_id=any($1::uuid[])
      group by release_id order by release_id`, [[
      ACTIVE_DEFINITION_RELEASE_ID,
      TARGET_DEFINITION_RELEASE_ID,
    ]])).rows as Json[];
    searchRelease = (await client.query(`select
      id::text,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,
      source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,
      metadata,sealed_at,activated_at
      from public.estimate_search_index_release where id=$1`, [TARGET_SEARCH_RELEASE_ID])).rows[0] as Json;
    mutationResidue = (await client.query(`select
      count(*) filter(where release_key like 'real-professional-estimates-r2-%')::int r2_release_count,
      count(*) filter(where release_key like 'real-professional-estimates-r1-concrete-strip-%')::int r1_concrete_successor_count
      from public.estimate_definition_release`)).rows[0] as Json;
  } finally {
    await client.end();
  }

  const activeRelease = definitionReleases.find((release) => release.id === ACTIVE_DEFINITION_RELEASE_ID);
  const targetRelease = definitionReleases.find((release) => release.id === TARGET_DEFINITION_RELEASE_ID);
  invariant(activeRelease?.status === "active", "R2_BASELINE_ACTIVE_RELEASE_DRIFT");
  invariant(targetRelease?.status === "prepared", "R2_BASELINE_TARGET_RELEASE_DRIFT");
  invariant(searchRelease?.id === TARGET_SEARCH_RELEASE_ID, "R2_BASELINE_SEARCH_RELEASE_MISSING");
  invariant(Number(mutationResidue.r2_release_count) === 0, "R2_BASELINE_PREEXISTING_R2_RELEASE");
  invariant(Number(mutationResidue.r1_concrete_successor_count) === 0, "R2_BASELINE_PREEXISTING_R1_CONCRETE_SUCCESSOR");

  const capturedAt = new Date().toISOString();
  const preserved = preservedFiles();
  const baseline = {
    schemaVersion: CONTRACT,
    capturedAt,
    masterSpec: {
      path: MASTER_SPEC_PATH.replaceAll("\\", "/"),
      lineCount: readFileSync(MASTER_SPEC_PATH, "utf8").trimEnd().split(/\r?\n/u).length,
      sha256: MASTER_SPEC_SHA256,
    },
    source: {
      branch,
      head,
      tree,
      clean: worktreeStatus === "",
      worktreeStatus: worktreeStatus.split(/\r?\n/u).filter(Boolean),
    },
    database: {
      ...database,
      host: databaseIdentity.hostname,
      port: Number(databaseIdentity.port),
      cloneIdentitySha256: sha256({
        databaseName: database.database_name,
        host: databaseIdentity.hostname,
        port: databaseIdentity.port,
        serverVersion: database.server_version,
      }),
    },
    releases: {
      activeDefinitionReleaseId: ACTIVE_DEFINITION_RELEASE_ID,
      targetDefinitionReleaseId: TARGET_DEFINITION_RELEASE_ID,
      targetSearchReleaseId: TARGET_SEARCH_RELEASE_ID,
      definitionReleases,
      definitionManifestCounts,
      searchRelease,
    },
    preservedIntermediateEvidence: preserved,
    prohibitedActions: ["activation", "deploy", "ota", "merge", "batch009"],
    databaseWritesApplied: 0,
    runtimePortsTouched: [],
    status: "GREEN_R2_BASELINE_LOCK_READ_ONLY",
  };
  const baselineSha256 = sha256(baseline);

  if (existsSync(BASELINE_OUTPUT)) {
    const existing = JSON.parse(readFileSync(BASELINE_OUTPUT, "utf8")) as Json;
    invariant(existing.baselineSha256 === existing.computedPayloadSha256,
      "R2_BASELINE_EXISTING_INTERNAL_SHA_DRIFT");
    invariant(existing.source?.head === head
      && existing.source?.tree === tree
      && existing.masterSpec?.sha256 === MASTER_SPEC_SHA256
      && existing.releases?.activeDefinitionReleaseId === ACTIVE_DEFINITION_RELEASE_ID
      && existing.releases?.targetDefinitionReleaseId === TARGET_DEFINITION_RELEASE_ID
      && existing.releases?.targetSearchReleaseId === TARGET_SEARCH_RELEASE_ID,
    "R2_BASELINE_EXISTING_IDENTITY_DRIFT");
  } else {
    writeJson(BASELINE_OUTPUT, {
      ...baseline,
      baselineSha256,
      computedPayloadSha256: baselineSha256,
    });
  }

  const stages = Object.fromEntries(STAGES.map((stage) => [stage, {
    status: stage === "DISCOVERY" ? "IN_PROGRESS" : stage === "BASELINE_LOCK" ? "GREEN" : "PENDING",
    updatedAt: capturedAt,
  }]));
  const state = {
    schemaVersion: "real-professional-estimates-r2.batch001-008-state.v1",
    updatedAt: capturedAt,
    masterSpecSha256: MASTER_SPEC_SHA256,
    baselineLockPath: BASELINE_OUTPUT.replaceAll("\\", "/"),
    baselineSha256,
    sourceHead: head,
    sourceTree: tree,
    currentStage: "DISCOVERY",
    stages,
    batches: Object.fromEntries(Array.from({ length: 8 }, (_, index) => [
      `BATCH-${String(index + 1).padStart(3, "0")}`,
      { discovery: "PENDING", staticAudit: "PENDING", adjudication: "PENDING", terminal: "PENDING" },
    ])),
    lastTerminalResult: "GREEN_R2_BASELINE_LOCK_READ_ONLY",
  };
  if (!existsSync(STATE_OUTPUT)) writeJson(STATE_OUTPUT, state);

  process.stdout.write(`${JSON.stringify({
    baselineOutput: BASELINE_OUTPUT,
    stateOutput: STATE_OUTPUT,
    baselineSha256,
    source: baseline.source,
    database: baseline.database,
    releases: baseline.releases,
    preservedFileCount: preserved.length,
    status: baseline.status,
  }, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
