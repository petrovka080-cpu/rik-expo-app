import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const SPEC_PATH = resolve(
  "C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (10).md",
);
const SPEC_SHA256 = "4cf42813e8a94816867ec62e63909fe0624a12d6955f598599deb0a92338e318";
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const ACTIVE_RELEASE_ID = "da29dc2b-1384-5487-b8da-6ee93f4e514e";
const CANDIDATE_RELEASE_KEY = "p0-r58-cumulative-candidate-4cf42813";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const OUTPUT = resolve(
  ".release-runtime/p0-one-monolith-r58/evidence/06-backend/BATCH001_008_PREPARED_CANDIDATE_4272.json",
);
const APPLY = process.argv.includes("--apply");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

async function main(): Promise<void> {
  invariant(sha256(readFileSync(SPEC_PATH)) === SPEC_SHA256, "R58_PREPARE_SPEC_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === EXPECTED_BRANCH, `R58_PREPARE_BRANCH_DRIFT:${branch}`);
  invariant(git(["status", "--porcelain=v1"]) === "", "R58_PREPARE_DIRTY_WORKTREE");
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: APPLY ? "r58-prepare-cumulative-4272-apply" : "r58-prepare-cumulative-4272-dry-run",
    statement_timeout: 120_000,
  });
  await client.connect();
  let evidence: Json;
  try {
    await client.query("begin");
    await client.query("set local lock_timeout='5s'");
    const active = (await client.query(
      "select id,status,release_key from public.estimate_definition_release where id=$1",
      [ACTIVE_RELEASE_ID],
    )).rows[0] as Json | undefined;
    invariant(active?.status === "active", "R58_PREPARE_ACTIVE_RELEASE_DRIFT");
    const candidate = (await client.query(
      "select * from public.estimate_definition_release where release_key=$1 for update",
      [CANDIDATE_RELEASE_KEY],
    )).rows[0] as Json | undefined;
    invariant(candidate, "R58_PREPARE_CANDIDATE_MISSING");
    invariant(["draft", "prepared"].includes(String(candidate.status)),
      `R58_PREPARE_CANDIDATE_STATUS:${candidate.status}`);
    invariant(candidate.parent_release_id === ACTIVE_RELEASE_ID, "R58_PREPARE_PARENT_RELEASE_DRIFT");
    invariant(candidate.metadata?.specSha256 === SPEC_SHA256 && candidate.metadata?.batch009Included === false,
      "R58_PREPARE_AUTHORITY_METADATA_DRIFT");

    const manifest = (await client.query(`
      select count(*)::int total,count(distinct manifest.catalog_id)::int unique_catalogs,
        count(*) filter(where manifest.baseline_ready and manifest.scenario_ready
          and manifest.approved_template_baseline_id is not null)::int ready,
        count(*) filter(where manifest.publication_state='CANONICAL_SUCCESSOR')::int successors,
        count(*) filter(where coalesce(manifest.source_batch,'')='BATCH009')::int batch009,
        count(*) filter(where baseline.id is null)::int missing_baselines,
        count(distinct manifest.approved_template_baseline_id)::int unique_baselines
      from public.estimate_cumulative_manifest_entry manifest
      left join public.estimate_approved_template_baseline baseline
        on baseline.id=manifest.approved_template_baseline_id
      where manifest.release_id=$1
    `, [candidate.id])).rows[0] as Json;
    invariant(manifest.total === 4_272 && manifest.unique_catalogs === 4_272 && manifest.ready === 4_272,
      `R58_PREPARE_MANIFEST_DENOMINATOR:${manifest.total}/${manifest.unique_catalogs}/${manifest.ready}`);
    invariant(manifest.successors === 2_793 && manifest.batch009 === 0
      && manifest.missing_baselines === 0 && manifest.unique_baselines === 4_272,
    "R58_PREPARE_MANIFEST_INTEGRITY_RED");

    const cumulative = (await client.query(`
      select count(*)::int definitions,
        coalesce(sum(stats.parameters),0)::bigint::text parameters,
        coalesce(sum(stats.formulas),0)::bigint::text formulas,
        coalesce(sum(stats.resources),0)::bigint::text resources
      from public.estimate_cumulative_manifest_entry manifest
      join lateral (
        select
          (select count(*) from public.estimate_parameter_definition p
            where p.definition_version_id=manifest.definition_version_id) parameters,
          (select count(*) from public.estimate_formula_graph f
            where f.definition_version_id=manifest.definition_version_id) formulas,
          (select count(*) from public.estimate_resource_spec r
            where r.definition_version_id=manifest.definition_version_id) resources
      ) stats on true
      where manifest.release_id=$1
    `, [candidate.id])).rows[0] as Json;
    invariant(cumulative.definitions === 4_272
      && Number(cumulative.parameters) === 840_667
      && Number(cumulative.formulas) === 1_157_018
      && Number(cumulative.resources) === 1_157_018,
    `R58_PREPARE_CUMULATIVE_COUNTS:${JSON.stringify(cumulative)}`);
    invariant(candidate.definition_count === cumulative.definitions
      && candidate.parameter_count === Number(cumulative.parameters)
      && candidate.formula_count === Number(cumulative.formulas)
      && candidate.resource_row_count === Number(cumulative.resources),
    "R58_PREPARE_RELEASE_COUNTS_DRIFT");

    const alreadyPrepared = candidate.status === "prepared";
    if (!alreadyPrepared) {
      await client.query(`update public.estimate_definition_release set
        status='prepared',sealed_at=now(),activated_at=null,source_commit=$2,source_tree=$3,
        metadata=metadata || $4::jsonb where id=$1`, [
        candidate.id,
        head,
        tree,
        JSON.stringify({
          lifecycle: "PREPARED_FOR_FRESH_4272_BACKEND_GATE_NOT_ACTIVE",
          r58CumulativePrepared4272: {
            contract: "p0-one-monolith-r58-cumulative-prepared-candidate-4272.v1",
            specSha256: SPEC_SHA256,
            head,
            tree,
            manifestReady: 4_272,
            successorEntries: 2_793,
            cumulative,
            activeReleaseSwitched: false,
            runtime8081Switched: false,
            searchCutover: false,
            terminalGreenClaimed: false,
          },
        }),
      ]);
    }

    evidence = {
      schemaVersion: "p0-one-monolith-r58-cumulative-prepared-candidate-4272.v1",
      capturedAt: new Date().toISOString(),
      specSha256: SPEC_SHA256,
      branch,
      head,
      tree,
      descendantOf691acb78: true,
      database: new URL(DATABASE_URL).pathname.replace(/^\//u, ""),
      activeRelease: active,
      candidateReleaseId: candidate.id,
      candidateReleaseKey: candidate.release_key,
      priorStatus: candidate.status,
      resultingStatus: "prepared",
      manifest,
      cumulative,
      writesApplied: APPLY && !alreadyPrepared ? 1 : 0,
      idempotent: alreadyPrepared,
      activeReleaseSwitched: false,
      runtime8081Switched: false,
      searchCutover: false,
      terminalGreenClaimed: false,
      status: alreadyPrepared
        ? "GREEN_R58_CUMULATIVE_CANDIDATE_4272_PREPARE_IDEMPOTENT"
        : APPLY
          ? "GREEN_R58_CUMULATIVE_CANDIDATE_4272_PREPARED_NOT_ACTIVE"
          : "GREEN_R58_CUMULATIVE_CANDIDATE_4272_PREPARE_DRY_RUN_ROLLED_BACK",
    };
    if (APPLY) await client.query("commit");
    else await client.query("rollback");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    status: evidence.status,
    candidateReleaseId: evidence.candidateReleaseId,
    manifest: evidence.manifest,
    cumulative: evidence.cumulative,
    writesApplied: evidence.writesApplied,
    evidencePath: OUTPUT,
  }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
