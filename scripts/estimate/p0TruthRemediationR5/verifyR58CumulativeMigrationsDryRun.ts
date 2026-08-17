import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Json = Record<string, unknown>;

const SPEC_PATH = resolve(
  "C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (10).md",
);
const SPEC_SHA256 = "4cf42813e8a94816867ec62e63909fe0624a12d6955f598599deb0a92338e318";
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const PSQL = process.env.P0_PSQL_EXE ?? "C:/Program Files/PostgreSQL/17/bin/psql.exe";
const MIGRATIONS = [
  resolve("supabase/migrations/20260818030000_p0_r54_cumulative_manifest.sql"),
  resolve("supabase/migrations/20260818040000_p0_r58_cumulative_compiler_contract.sql"),
] as const;
const OUTPUT = resolve(
  ".release-runtime/p0-one-monolith-r58/evidence/03-monolith/R58_CUMULATIVE_MIGRATION_DRY_RUN.json",
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(path: string): string {
  return sha256(readFileSync(path));
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function migrationBody(path: string): string {
  const source = readFileSync(path, "utf8");
  invariant(/\bbegin\s*;/iu.test(source), `R58_MIGRATION_BEGIN_MISSING:${path}`);
  invariant(/commit\s*;\s*$/iu.test(source), `R58_MIGRATION_COMMIT_MISSING:${path}`);
  return source.replace(/\bbegin\s*;/iu, "").replace(/commit\s*;\s*$/iu, "");
}

function psql(input: string): string {
  return execFileSync(PSQL, [DATABASE_URL, "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1"], {
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 60_000,
    maxBuffer: 10 * 1024 * 1024,
  }).trim();
}

function objectState(): Json {
  const value = psql(`
    select jsonb_build_object(
      'manifest_table',to_regclass('public.estimate_cumulative_manifest_entry')::text,
      'admission_function',to_regprocedure('public.estimate_create_cumulative_admission_job_r54(uuid,text,uuid,uuid,text,text,text,uuid,jsonb)')::text,
      'create_function',to_regprocedure('public.estimate_create_compile_job_r58(text,text,text,uuid,uuid,jsonb)')::text,
      'commit_function',to_regprocedure('public.estimate_commit_cumulative_compile_job_r58(uuid,text,jsonb,jsonb)')::text
    )::text;
  `);
  return JSON.parse(value) as Json;
}

function main(): void {
  invariant(sha256File(SPEC_PATH) === SPEC_SHA256, "R58_MIGRATION_DRY_RUN_SPEC_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === "codex/p0-one-monolith-r5", `R58_MIGRATION_DRY_RUN_BRANCH_DRIFT:${branch}`);
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);

  const before = objectState();
  const transactionOutput = psql(`
    begin;
    set local lock_timeout='5s';
    set local statement_timeout='45s';
    ${MIGRATIONS.map(migrationBody).join("\n")}
    do $probe$
    declare
      v_create text;
      v_commit text;
      v_trigger_count integer;
    begin
      if to_regclass('public.estimate_cumulative_manifest_entry') is null then
        raise exception 'R58_MANIFEST_TABLE_NOT_CREATED';
      end if;
      if to_regprocedure('public.estimate_create_cumulative_admission_job_r54(uuid,text,uuid,uuid,text,text,text,uuid,jsonb)') is null then
        raise exception 'R58_CUMULATIVE_ADMISSION_FUNCTION_NOT_CREATED';
      end if;
      if to_regprocedure('public.estimate_create_compile_job_r58(text,text,text,uuid,uuid,jsonb)') is null then
        raise exception 'R58_CUMULATIVE_CREATE_FUNCTION_NOT_CREATED';
      end if;
      if to_regprocedure('public.estimate_commit_cumulative_compile_job_r58(uuid,text,jsonb,jsonb)') is null then
        raise exception 'R58_CUMULATIVE_COMMIT_FUNCTION_NOT_CREATED';
      end if;
      select count(*) into v_trigger_count from pg_trigger
      where tgrelid='public.estimate_revision_row'::regclass
        and tgname='estimate_revision_row_semantic_owner_r3_trg' and not tgisinternal;
      if v_trigger_count<>1 then raise exception 'R58_SEMANTIC_OWNER_TRIGGER_COUNT:%',v_trigger_count; end if;
      select pg_get_functiondef('public.estimate_create_compile_job_r58(text,text,text,uuid,uuid,jsonb)'::regprocedure) into v_create;
      select pg_get_functiondef('public.estimate_commit_cumulative_compile_job_r58(uuid,text,jsonb,jsonb)'::regprocedure) into v_commit;
      if position('cumulative catalog definition is not active' in v_create)=0 then
        raise exception 'R58_CREATE_FAIL_CLOSED_GUARD_MISSING';
      end if;
      if position('cumulative baseline/user parameter provenance mismatch' in v_commit)=0 then
        raise exception 'R58_BASELINE_PROVENANCE_GUARD_MISSING';
      end if;
      if position('cumulative revision row ownership projection is invalid' in v_commit)=0 then
        raise exception 'R58_ROW_OWNERSHIP_GUARD_MISSING';
      end if;
    end
    $probe$;
    select jsonb_build_object(
      'manifest_table',to_regclass('public.estimate_cumulative_manifest_entry')::text,
      'admission_function',to_regprocedure('public.estimate_create_cumulative_admission_job_r54(uuid,text,uuid,uuid,text,text,text,uuid,jsonb)')::text,
      'create_function',to_regprocedure('public.estimate_create_compile_job_r58(text,text,text,uuid,uuid,jsonb)')::text,
      'commit_function',to_regprocedure('public.estimate_commit_cumulative_compile_job_r58(uuid,text,jsonb,jsonb)')::text,
      'semantic_owner_trigger_count',(select count(*) from pg_trigger where tgrelid='public.estimate_revision_row'::regclass and tgname='estimate_revision_row_semantic_owner_r3_trg' and not tgisinternal),
      'create_function_sha256',encode(extensions.digest(convert_to(pg_get_functiondef('public.estimate_create_compile_job_r58(text,text,text,uuid,uuid,jsonb)'::regprocedure),'UTF8'),'sha256'),'hex'),
      'commit_function_sha256',encode(extensions.digest(convert_to(pg_get_functiondef('public.estimate_commit_cumulative_compile_job_r58(uuid,text,jsonb,jsonb)'::regprocedure),'UTF8'),'sha256'),'hex')
    )::text;
    rollback;
  `);
  const insideLine = transactionOutput.split(/\r?\n/u).find((line) => line.trim().startsWith("{"));
  invariant(insideLine, "R58_MIGRATION_TRANSACTION_SUMMARY_MISSING");
  const inside = JSON.parse(insideLine) as Json;
  const after = objectState();
  invariant(JSON.stringify(after) === JSON.stringify(before), "R58_MIGRATION_ROLLBACK_OBJECT_DRIFT");

  const evidence = {
    schemaVersion: "p0-one-monolith-r58-cumulative-migration-dry-run.v1",
    capturedAt: new Date().toISOString(),
    specSha256: SPEC_SHA256,
    source: { branch, head, tree },
    database: new URL(DATABASE_URL).pathname.replace(/^\//u, ""),
    migrations: MIGRATIONS.map((path) => ({
      path: path.replace(/\\/gu, "/"),
      bytes: readFileSync(path).byteLength,
      sha256: sha256File(path),
    })),
    before,
    insideTransaction: inside,
    afterRollback: after,
    persistentWrites: 0,
    activeReleaseSwitched: false,
    runtime8081Switched: false,
    orphanProcesses: 0,
    status: "GREEN_R58_MIGRATIONS_TRANSACTIONALLY_PARSED_AND_ROLLED_BACK",
  };
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
}
