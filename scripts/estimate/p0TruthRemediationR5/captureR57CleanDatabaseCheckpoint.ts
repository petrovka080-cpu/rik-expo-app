import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const SPEC_PATH = path.resolve(
  "C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (9).md",
);
const SPEC_SHA256 = "b86e460d194c98f56546bdcc50704a38fba6fc74c4de3d661d2e1221d6d2e76e";
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const ACTIVE_RELEASE_ID = "da29dc2b-1384-5487-b8da-6ee93f4e514e";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const PG_DUMP = process.env.P0_PG_DUMP_EXE ?? "C:/Program Files/PostgreSQL/17/bin/pg_dump.exe";
const ROOT = path.resolve(".release-runtime/p0-one-monolith-r57/evidence/01-preservation");
const SCHEMA_DUMP = path.join(ROOT, "PRE_CANDIDATE_DATABASE_SCHEMA.sql");
const SOURCE_BUNDLE = path.join(ROOT, "CURRENT_R57_CLEAN_POST_691ACB78_INCREMENTAL.bundle");
const OUTPUT = path.join(ROOT, "CURRENT_R57_CLEAN_DATABASE_CHECKPOINT.json");

const COUNT_TABLES = [
  "estimate_definition_release",
  "estimate_definition_version",
  "estimate_parameter_definition",
  "estimate_formula_graph",
  "estimate_resource_spec",
  "estimate_approved_template_baseline",
  "estimate_cumulative_manifest_entry",
  "estimate_revision",
  "estimate_revision_row",
  "estimate_compile_job",
  "estimate_search_index_release",
  "estimate_search_group",
  "estimate_search_document",
  "estimate_search_group_membership",
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256File(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

async function tableCounts(client: Client): Promise<Json> {
  const result: Json = {};
  for (const table of COUNT_TABLES) {
    const exists = (await client.query("select to_regclass($1)::text value", [`public.${table}`])).rows[0]?.value;
    result[table] = exists
      ? Number((await client.query(`select count(*)::text value from public.${table}`)).rows[0].value)
      : null;
  }
  return result;
}

async function main(): Promise<void> {
  invariant(sha256File(SPEC_PATH) === SPEC_SHA256, "R57_DATABASE_CHECKPOINT_SPEC_DRIFT");
  invariant(existsSync(PG_DUMP), `R57_DATABASE_CHECKPOINT_PG_DUMP_MISSING:${PG_DUMP}`);
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === EXPECTED_BRANCH, `R57_DATABASE_CHECKPOINT_BRANCH_DRIFT:${branch}`);
  invariant(git(["status", "--porcelain=v1"]) === "", "R57_DATABASE_CHECKPOINT_DIRTY_WORKTREE");
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);

  mkdirSync(ROOT, { recursive: true });
  execFileSync(PG_DUMP, [
    "--schema-only",
    "--no-owner",
    "--no-privileges",
    `--file=${SCHEMA_DUMP}`,
    DATABASE_URL,
  ], { stdio: ["ignore", "pipe", "pipe"] });

  execFileSync("git", ["bundle", "create", SOURCE_BUNDLE, "HEAD", `^${BASE_COMMIT}`], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  execFileSync("git", ["bundle", "verify", SOURCE_BUNDLE], { stdio: ["ignore", "pipe", "pipe"] });

  const client = new Client({ connectionString: DATABASE_URL, application_name: "r57-clean-db-checkpoint-read-only" });
  await client.connect();
  let database: Json;
  try {
    await client.query("begin read only isolation level repeatable read");
    const identity = (await client.query(`
      select current_database() database_name,
        pg_database_size(current_database())::text database_bytes,
        current_setting('server_version') server_version,
        txid_current_snapshot()::text transaction_snapshot
    `)).rows[0];
    const activeRelease = (await client.query(
      "select to_jsonb(r) value from estimate_definition_release r where id=$1",
      [ACTIVE_RELEASE_ID],
    )).rows[0]?.value;
    invariant(activeRelease, "R57_DATABASE_CHECKPOINT_ACTIVE_RELEASE_MISSING");
    const releaseDefinitionSet = (await client.query(`
      select count(*)::int definitions,
        encode(extensions.digest(convert_to(string_agg(
          concat_ws('|',v.catalog_id,v.id::text,v.definition_sha256), E'\\n'
          order by v.catalog_id,v.id
        ),'UTF8'),'sha256'),'hex') definition_set_sha256
      from estimate_definition_version v where v.release_id=$1
    `, [ACTIVE_RELEASE_ID])).rows[0];
    invariant(releaseDefinitionSet.definitions === 4_272, "R57_DATABASE_CHECKPOINT_RELEASE_DENOMINATOR_DRIFT");
    database = {
      ...identity,
      active_release: activeRelease,
      active_release_definition_set: releaseDefinitionSet,
      table_counts: await tableCounts(client),
      persistent_writes: 0,
    };
    await client.query("rollback");
  } finally {
    await client.end();
  }

  const changedPaths = git(["diff", "--name-only", `${BASE_COMMIT}..${head}`, "--"])
    .split(/\r?\n/u).filter(Boolean);
  const evidence = {
    schema_version: "p0-one-monolith-r57-clean-database-checkpoint.v1",
    spec_sha256: SPEC_SHA256,
    captured_at: new Date().toISOString(),
    source: {
      branch,
      base_commit: BASE_COMMIT,
      head,
      tree,
      clean: true,
      changed_path_count: changedPaths.length,
      bundle_path: path.relative(path.resolve("."), SOURCE_BUNDLE).replace(/\\/gu, "/"),
      bundle_bytes: statSync(SOURCE_BUNDLE).size,
      bundle_sha256: sha256File(SOURCE_BUNDLE),
      bundle_verify: "GREEN",
    },
    database,
    schema_dump: {
      path: path.relative(path.resolve("."), SCHEMA_DUMP).replace(/\\/gu, "/"),
      bytes: statSync(SCHEMA_DUMP).size,
      sha256: sha256File(SCHEMA_DUMP),
      pg_dump_version: execFileSync(PG_DUMP, ["--version"], { encoding: "utf8" }).trim(),
    },
    active_release_switched: false,
    runtime_8081_switched: false,
    status: "GREEN_R57_CLEAN_SOURCE_AND_PRE_CANDIDATE_DATABASE_CHECKPOINT",
  };
  writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    status: evidence.status,
    head,
    tree,
    database: database.database_name,
    database_bytes: database.database_bytes,
    definitions: database.active_release_definition_set.definitions,
    table_counts: database.table_counts,
    schema_dump_sha256: evidence.schema_dump.sha256,
    source_bundle_sha256: evidence.source.bundle_sha256,
    output: OUTPUT,
  }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
