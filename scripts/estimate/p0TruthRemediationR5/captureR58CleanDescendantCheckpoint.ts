import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, unknown>;

const SPEC_PATH = resolve(
  "C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (11).md",
);
const SPEC_SHA256 = "21bdd2cf79185cbcf2a6621005f32d6eaf47e653dd88e5b006fcdc6797854138";
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const ACTIVE_RELEASE_ID = "da29dc2b-1384-5487-b8da-6ee93f4e514e";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const PG_DUMP = process.env.P0_PG_DUMP_EXE ?? "C:/Program Files/PostgreSQL/17/bin/pg_dump.exe";
const ROOT = resolve(".release-runtime/p0-one-monolith-r58/evidence/01-preservation");
const SCHEMA_DUMP = resolve(ROOT, "PRE_4272_DATABASE_SCHEMA.sql");
const SOURCE_BUNDLE = resolve(ROOT, "CURRENT_R58_CLEAN_POST_691ACB78_INCREMENTAL.bundle");
const OUTPUT = resolve(ROOT, "CURRENT_R58_CLEAN_DESCENDANT_CHECKPOINT.json");

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

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

async function tableCounts(client: Client): Promise<Json> {
  const result: Json = {};
  for (const table of COUNT_TABLES) {
    const exists = (await client.query("select to_regclass($1)::text value", [`public.${table}`])).rows[0]?.value;
    result[table] = exists
      ? Number((await client.query(`select count(*)::text value from public.${table}`)).rows[0]?.value)
      : null;
  }
  return result;
}

async function main(): Promise<void> {
  invariant(sha256File(SPEC_PATH) === SPEC_SHA256, "R58_CLEAN_CHECKPOINT_SPEC_DRIFT");
  invariant(existsSync(PG_DUMP), `R58_CLEAN_CHECKPOINT_PG_DUMP_MISSING:${PG_DUMP}`);
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === EXPECTED_BRANCH, `R58_CLEAN_CHECKPOINT_BRANCH_DRIFT:${branch}`);
  invariant(git(["status", "--porcelain=v1"]) === "", "R58_CLEAN_CHECKPOINT_DIRTY_WORKTREE");
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);

  mkdirSync(ROOT, { recursive: true });
  execFileSync(PG_DUMP, [
    "--schema-only",
    "--no-owner",
    "--no-privileges",
    `--file=${SCHEMA_DUMP}`,
    DATABASE_URL,
  ], { stdio: ["ignore", "pipe", "pipe"], timeout: 60_000 });
  execFileSync("git", ["bundle", "create", SOURCE_BUNDLE, "HEAD", `^${BASE_COMMIT}`], {
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 60_000,
  });
  execFileSync("git", ["bundle", "verify", SOURCE_BUNDLE], {
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  });

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "r58-clean-descendant-checkpoint-read-only",
    statement_timeout: 60_000,
  });
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
      "select to_jsonb(release) value from public.estimate_definition_release release where id=$1",
      [ACTIVE_RELEASE_ID],
    )).rows[0]?.value;
    invariant(activeRelease, "R58_CLEAN_CHECKPOINT_ACTIVE_RELEASE_MISSING");
    const activeDefinitions = (await client.query(`
      select count(*)::int definitions,
        encode(extensions.digest(convert_to(string_agg(
          concat_ws('|',version.catalog_id,version.id::text,version.definition_sha256),E'\\n'
          order by version.catalog_id,version.id
        ),'UTF8'),'sha256'),'hex') definition_set_sha256
      from public.estimate_definition_version version where version.release_id=$1
    `, [ACTIVE_RELEASE_ID])).rows[0];
    invariant(activeDefinitions.definitions === 4_272, "R58_CLEAN_CHECKPOINT_4272_DENOMINATOR_DRIFT");
    database = {
      ...identity,
      active_release: activeRelease,
      active_release_definition_set: activeDefinitions,
      table_counts: await tableCounts(client),
      persistent_writes: 0,
    };
    await client.query("rollback");
  } finally {
    await client.end();
  }

  const evidence = {
    schemaVersion: "p0-one-monolith-r58-clean-descendant-checkpoint.v1",
    capturedAt: new Date().toISOString(),
    specSha256: SPEC_SHA256,
    source: {
      branch,
      baseCommit: BASE_COMMIT,
      head,
      tree,
      clean: true,
      descendantOfBase: true,
      bundlePath: relative(resolve("."), SOURCE_BUNDLE).replace(/\\/gu, "/"),
      bundleBytes: statSync(SOURCE_BUNDLE).size,
      bundleSha256: sha256File(SOURCE_BUNDLE),
      bundleVerify: "GREEN",
    },
    database,
    schemaDump: {
      path: relative(resolve("."), SCHEMA_DUMP).replace(/\\/gu, "/"),
      bytes: statSync(SCHEMA_DUMP).size,
      sha256: sha256File(SCHEMA_DUMP),
      pgDumpVersion: execFileSync(PG_DUMP, ["--version"], { encoding: "utf8", timeout: 10_000 }).trim(),
    },
    activeReleaseSwitched: false,
    runtime8081Switched: false,
    status: "GREEN_R58_CLEAN_DESCENDANT_SOURCE_AND_PRE_4272_DATABASE_CHECKPOINT",
  };
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    status: evidence.status,
    head,
    tree,
    database: database.database_name,
    definitions: (database.active_release_definition_set as Json).definitions,
    tableCounts: database.table_counts,
    schemaDumpSha256: evidence.schemaDump.sha256,
    sourceBundleSha256: evidence.source.bundleSha256,
    output: OUTPUT,
  }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
