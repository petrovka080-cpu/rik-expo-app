import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Client } from "pg";

type Json = Record<string, any>;

const CONTRACT = "real-professional-estimates-r3.batch001-008-baseline-lock.v1";
const MASTER_SPEC_PATH = resolve("C:/Users/User/Downloads/MASTER_TZ_REAL_PROFESSIONAL_ESTIMATES_R3_RU.md");
const MASTER_SPEC_SHA256 = "af1ecdcba601536fb5e5bc8d81814eed34f302677ec1270dc3e172069989b29b";
const R2_SPEC_SHA256 = "b9373689e495a8d7e0883818371022eb792800baf10d19340f50c1aace08d986";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const ACTIVE_RELEASE_ID = "da29dc2b-1384-5487-b8da-6ee93f4e514e";
const INCIDENT_RELEASE_ID = "4c5affaf-5f63-5d04-b036-875c684f8c45";
const REMEDIATION_RELEASE_ID = "06e19aee-e921-5b66-8fc3-c441ab918d29";
const SEARCH_RELEASE_ID = "367c2439-df83-5f27-bedd-89247b50caae";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const ROOT = resolve(".release-runtime/real-professional-estimates-r3");
const OUTPUT_PATH = resolve(ROOT, "evidence/00-baseline/BATCH001_008_R3_BASELINE_LOCK.json");
const STATE_PATH = resolve(ROOT, "state/batch001_008_r3_state.json");
const INCIDENT_PATH = resolve(ROOT, "evidence/00-baseline/ANCHOR_GROUP_21879F3C_INCIDENT.json");
const R2_BASELINE_PATH = resolve(
  ".release-runtime/real-professional-estimates-r2/evidence/00-baseline/BATCH001_008_BASELINE_LOCK.json",
);
const PRESERVED_PATHS = [
  "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
  "scripts/estimate/batch001008R2/buildBatch001008R2AuthoritativeAudit.ts",
  "scripts/estimate/batch001008R2/reconcileBatch001008R2PreparedSuccessors.ts",
  "scripts/estimate/concreteBackendR6/reinforcedConcreteStripFoundationR1.ts",
  "scripts/estimate/concreteBackendR6/prepareConcreteR6StripFoundationSuccessor.ts",
  "tests/estimateBackend/concreteR6Professional.contract.test.ts",
  "src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel.tsx",
  "src/features/consumerRepair/RequestEstimateItemsEditor.tsx",
  "src/lib/catalog/catalogItemsService.ts",
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256Buffer(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
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
  return execFileSync("git", [...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000 }).trim();
}

function writeJsonAtomic(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function fileIdentity(relativePath: string): Json | null {
  const absolutePath = resolve(relativePath);
  if (!existsSync(absolutePath)) return null;
  return { path: relativePath.replaceAll("\\", "/"), bytes: statSync(absolutePath).size, sha256: sha256Buffer(readFileSync(absolutePath)) };
}

async function main(): Promise<void> {
  invariant(sha256Buffer(readFileSync(MASTER_SPEC_PATH)) === MASTER_SPEC_SHA256, "R3_MASTER_SPEC_SHA256_DRIFT");
  invariant(existsSync(INCIDENT_PATH), "R3_WAVE0_INCIDENT_EVIDENCE_MISSING");
  invariant(existsSync(R2_BASELINE_PATH), "R3_R2_LINEAGE_BASELINE_MISSING");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["show", "-s", "--format=%T", "HEAD"]);
  const worktreeStatus = git(["status", "--porcelain=v1"]).split(/\r?\n/u).filter(Boolean);
  invariant(branch === EXPECTED_BRANCH, `R3_BASELINE_BRANCH_DRIFT:${branch}`);

  const client = new Client({ connectionString: DATABASE_URL, application_name: "batch001-008-r3-baseline-readonly" });
  await client.connect();
  let database: Json;
  let releases: Json[];
  let manifestCounts: Json[];
  let searchRelease: Json;
  try {
    await client.query("begin transaction read only");
    database = (await client.query(`select current_database() database_name,
      current_setting('server_version') server_version,pg_is_in_recovery() in_recovery`)).rows[0] as Json;
    releases = (await client.query(`select id::text,release_key,status,parent_release_id::text,
      definition_count,parameter_count,formula_count,resource_row_count,source_commit,source_tree,
      source_manifest_sha256,source_package_sha256,sealed_at,activated_at
      from public.estimate_definition_release where id=any($1::uuid[]) order by id`, [[
      ACTIVE_RELEASE_ID, INCIDENT_RELEASE_ID, REMEDIATION_RELEASE_ID,
    ]])).rows as Json[];
    manifestCounts = (await client.query(`select release_id::text,count(*)::integer manifest_count,
      count(distinct catalog_id)::integer unique_catalog_count,
      count(*) filter(where domain_id='concrete')::integer concrete_count,
      count(*) filter(where baseline_ready and scenario_ready)::integer ready_count
      from public.estimate_cumulative_manifest_entry where release_id=any($1::uuid[])
      group by release_id order by release_id`, [[INCIDENT_RELEASE_ID, REMEDIATION_RELEASE_ID]])).rows as Json[];
    searchRelease = (await client.query(`select id::text,release_key,status,snapshot_sha256,
      taxonomy_version,group_relation_version,ranking_contract_version,global_count,external_count,
      source_commit,source_tree,activated_at from public.estimate_search_index_release where id=$1`,
    [SEARCH_RELEASE_ID])).rows[0] as Json;
    await client.query("rollback");
  } finally {
    await client.end();
  }

  invariant(releases.find((release) => release.id === ACTIVE_RELEASE_ID)?.status === "active", "R3_ACTIVE_RELEASE_DRIFT");
  invariant(releases.find((release) => release.id === INCIDENT_RELEASE_ID)?.status === "prepared", "R3_INCIDENT_RELEASE_DRIFT");
  invariant(releases.find((release) => release.id === REMEDIATION_RELEASE_ID)?.status === "prepared", "R3_REMEDIATION_RELEASE_DRIFT");
  invariant(searchRelease?.id === SEARCH_RELEASE_ID, "R3_SEARCH_RELEASE_MISSING");

  const r2Baseline = JSON.parse(readFileSync(R2_BASELINE_PATH, "utf8")) as Json;
  const capturedAt = new Date().toISOString();
  const preserved = PRESERVED_PATHS.map(fileIdentity).filter(Boolean);
  const payload = {
    schemaVersion: CONTRACT,
    capturedAt,
    masterSpec: { path: MASTER_SPEC_PATH.replaceAll("\\", "/"), lineCount: 2_476, sha256: MASTER_SPEC_SHA256 },
    priorContractLineage: {
      r2SpecSha256: R2_SPEC_SHA256,
      r2BaselinePath: R2_BASELINE_PATH.replaceAll("\\", "/"),
      r2BaselineSha256: r2Baseline.baselineSha256,
      r2EvidencePreserved: true,
    },
    source: { branch, head, tree, clean: worktreeStatus.length === 0, worktreeStatus },
    database: { ...database, connectionIdentitySha256: sha256(new URL(DATABASE_URL).pathname) },
    releases: {
      activeReleaseId: ACTIVE_RELEASE_ID,
      incidentReleaseId: INCIDENT_RELEASE_ID,
      remediationReleaseId: REMEDIATION_RELEASE_ID,
      searchReleaseId: SEARCH_RELEASE_ID,
      releases,
      manifestCounts,
      searchRelease,
    },
    incidentEvidence: fileIdentity(INCIDENT_PATH.replace(resolve() + "\\", "")),
    preservedChanges: preserved,
    prohibitedActions: ["production_activation", "deploy", "ota", "merge", "push", "pull_request", "batch009", "full_jest"],
    databaseWritesAppliedByThisLock: 0,
    status: "GREEN_R3_WAVE0_BASELINE_LOCK_READ_ONLY",
  };
  const baselineSha256 = sha256(payload);
  writeJsonAtomic(OUTPUT_PATH, { ...payload, baselineSha256, computedPayloadSha256: baselineSha256 });

  const state = {
    schemaVersion: "real-professional-estimates-r3.batch001-008-state.v1",
    updatedAt: capturedAt,
    masterSpecSha256: MASTER_SPEC_SHA256,
    baselineLockPath: OUTPUT_PATH.replaceAll("\\", "/"),
    baselineSha256,
    sourceHead: head,
    sourceTree: tree,
    currentWave: "WAVE_1_P0_CONTAINMENT",
    waves: {
      WAVE_0_FREEZE_REPRODUCTION: { status: "GREEN", evidence: [OUTPUT_PATH, INCIDENT_PATH] },
      WAVE_1_P0_CONTAINMENT: { status: "IN_PROGRESS" },
      WAVE_2_AUTHORITATIVE_AUDIT: { status: "RED_REMEDIATION_REQUIRED", inheritedDenominator: 4_282 },
      WAVE_3_CANONICAL_CONTENT_MODEL: { status: "IN_PROGRESS" },
      WAVE_4_REPAIR_BATCH001_008: { status: "IN_PROGRESS", preparedSuccessors: 1 },
      WAVE_5_USER_WORKFLOW: { status: "IN_PROGRESS" },
      WAVE_6_SAME_SHA_ACCEPTANCE: { status: "PENDING" },
    },
    terminalStatus: "RED",
    fullJest: "DEFERRED_BY_OPERATOR_NOT_RUN",
  };
  writeJsonAtomic(STATE_PATH, state);
  process.stdout.write(`${JSON.stringify({ status: payload.status, outputPath: OUTPUT_PATH, statePath: STATE_PATH, baselineSha256 })}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
