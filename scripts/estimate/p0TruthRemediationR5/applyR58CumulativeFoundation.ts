import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Json = Record<string, any>;

const SPEC_PATH = resolve(
  "C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (10).md",
);
const SPEC_SHA256 = "4cf42813e8a94816867ec62e63909fe0624a12d6955f598599deb0a92338e318";
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const ACTIVE_RELEASE_ID = "da29dc2b-1384-5487-b8da-6ee93f4e514e";
const RELEASE_KEY = "p0-r58-cumulative-candidate-4cf42813";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const PSQL = process.env.P0_PSQL_EXE ?? "C:/Program Files/PostgreSQL/17/bin/psql.exe";
const MIGRATIONS = [
  resolve("supabase/migrations/20260818030000_p0_r54_cumulative_manifest.sql"),
  resolve("supabase/migrations/20260818040000_p0_r58_cumulative_compiler_contract.sql"),
] as const;
const REPAIR_MATRIX_SUMMARY = resolve(
  ".release-runtime/p0-one-monolith-r58/evidence/05-baseline/R58_4272_REPAIR_MATRIX_SUMMARY.json",
);
const ROOT = resolve(".release-runtime/p0-one-monolith-r58/evidence/03-monolith");

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
    timeout: 30_000,
  }).trim();
}

function migrationBody(path: string): string {
  const source = readFileSync(path, "utf8");
  invariant(/\bbegin\s*;/iu.test(source), `R58_FOUNDATION_MIGRATION_BEGIN_MISSING:${path}`);
  invariant(/commit\s*;\s*$/iu.test(source), `R58_FOUNDATION_MIGRATION_COMMIT_MISSING:${path}`);
  return source.replace(/\bbegin\s*;/iu, "").replace(/commit\s*;\s*$/iu, "");
}

function psql(input: string): string {
  return execFileSync(PSQL, [DATABASE_URL, "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1"], {
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 60_000,
    maxBuffer: 20 * 1024 * 1024,
  }).trim();
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/gu, "''")}'`;
}

function deterministicUuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function databaseState(): Json {
  const manifestTable = psql(`
    select coalesce(to_regclass('public.estimate_cumulative_manifest_entry')::text,'');
  `);
  const manifestRows = manifestTable
    ? Number(psql(`
        select count(*)
        from public.estimate_cumulative_manifest_entry manifest
        join public.estimate_definition_release release on release.id=manifest.release_id
        where release.release_key=${sqlLiteral(RELEASE_KEY)};
      `))
    : null;
  const value = psql(`
    select jsonb_build_object(
      'database',current_database(),
      'active_release_id',(select id from public.estimate_definition_release where status='active'),
      'active_release_count',(select count(*) from public.estimate_definition_release where status='active'),
      'candidate_release_id',(select id from public.estimate_definition_release where release_key=${sqlLiteral(RELEASE_KEY)}),
      'candidate_status',(select status from public.estimate_definition_release where release_key=${sqlLiteral(RELEASE_KEY)}),
      'approved_baselines',(select count(*) from public.estimate_approved_template_baseline),
      'search_releases',(select count(*) from public.estimate_search_index_release)
    )::text;
  `);
  return {
    ...(JSON.parse(value) as Json),
    manifest_table: manifestTable || null,
    manifest_rows: manifestRows,
  };
}

function main(): void {
  const apply = process.argv.includes("--apply");
  invariant(process.argv.length === 2 || (process.argv.length === 3 && apply), "R58_FOUNDATION_USAGE_ONLY_OPTIONAL_APPLY");
  invariant(sha256File(SPEC_PATH) === SPEC_SHA256, "R58_FOUNDATION_SPEC_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === "codex/p0-one-monolith-r5", `R58_FOUNDATION_BRANCH_DRIFT:${branch}`);
  invariant(git(["status", "--porcelain=v1"]) === "", "R58_FOUNDATION_REQUIRES_CLEAN_HEAD");
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);

  const matrix = JSON.parse(readFileSync(REPAIR_MATRIX_SUMMARY, "utf8")) as Json;
  invariant(matrix.total === 4_272 && matrix.uniqueCatalogIds === 4_272,
    "R58_FOUNDATION_REPAIR_MATRIX_DENOMINATOR_DRIFT");
  invariant(matrix.partitions?.FROZEN_GREEN_617 === 617
    && matrix.partitions?.COMPILE_RED_937 === 937
    && matrix.partitions?.TRACE_NOT_ADMITTED_1432 === 1_432
    && matrix.partitions?.NO_AUTHORITATIVE_TRACE_1286 === 1_286,
  "R58_FOUNDATION_REPAIR_MATRIX_PARTITION_DRIFT");
  const candidateReleaseId = deterministicUuid(`${RELEASE_KEY}:${SPEC_SHA256}`);
  const before = databaseState();
  invariant(before.active_release_id === ACTIVE_RELEASE_ID && before.active_release_count === 1,
    "R58_FOUNDATION_ACTIVE_RELEASE_DRIFT");
  const includeMigrations = before.manifest_table == null;
  const metadata = JSON.stringify({
    authority: "P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5.8",
    specSha256: SPEC_SHA256,
    lifecycle: "DRAFT_REPAIR_QUEUE_NOT_ACTIVE",
    effectiveDefinitionDenominator: 4_272,
    repairPartitions: matrix.partitions,
    batch009Included: false,
    active8081Cutover: false,
  });
  const packageSha256 = sha256(`${SPEC_SHA256}:${matrix.ledgerSha256}:${head}:${tree}`);
  const transactionOutput = psql(`
    begin;
    set local lock_timeout='5s';
    set local statement_timeout='45s';
    ${includeMigrations ? MIGRATIONS.map(migrationBody).join("\n") : ""}
    insert into public.estimate_definition_release(
      id,release_key,schema_version,status,source_commit,source_tree,
      source_manifest_sha256,definition_count,parameter_count,formula_count,
      resource_row_count,metadata,parent_release_id,source_package_sha256
    )
    select ${sqlLiteral(candidateReleaseId)}::uuid,${sqlLiteral(RELEASE_KEY)},6,'draft',
      ${sqlLiteral(head)},${sqlLiteral(tree)},${sqlLiteral(String(matrix.ledgerSha256))},
      parent.definition_count,parent.parameter_count,parent.formula_count,parent.resource_row_count,
      ${sqlLiteral(metadata)}::jsonb,parent.id,${sqlLiteral(packageSha256)}
    from public.estimate_definition_release parent where parent.id=${sqlLiteral(ACTIVE_RELEASE_ID)}::uuid
    on conflict(release_key) do nothing;

    insert into public.estimate_cumulative_manifest_entry(
      release_id,catalog_id,definition_version_id,source_batch,source_release_id,
      domain_id,publication_state,approved_template_baseline_id,baseline_ready,
      scenario_ready,definition_hash,entry_sha256
    )
    select ${sqlLiteral(candidateReleaseId)}::uuid,version.catalog_id,version.id,
      case
        when version.source_metadata ? 'acceptedMemberSet' then 'PRE_BATCH005_ASPHALT_FROZEN'
        when version.source_metadata ? 'acceptedBatches' then 'BATCH001-BATCH004'
        when version.source_metadata ? 'batch005ProofSha256' then 'BATCH005'
        when version.source_metadata ? 'originalClientR2Status' then 'BATCH006'
        when version.source_metadata ? 'r3Status' then 'BATCH007'
        when version.source_metadata ? 'oldConcreteR2R3R4Status' then 'BATCH008'
        else 'UNCLASSIFIED'
      end,
      version.release_id,
      case
        when version.source_metadata ? 'acceptedMemberSet' then 'asphalt'
        when version.source_metadata ? 'acceptedBatches' then 'drywall'
        when version.source_metadata ? 'batch005ProofSha256' then 'electrical'
        when version.source_metadata ? 'originalClientR2Status' then 'water_supply_sewerage'
        when version.source_metadata ? 'r3Status' then 'hvac_heat_supply'
        when version.source_metadata ? 'oldConcreteR2R3R4Status' then 'concrete'
        else 'unclassified'
      end,
      'ACCEPTED_INHERITED',null,false,false,version.definition_sha256,
      encode(extensions.digest(convert_to(concat_ws('|',
        ${sqlLiteral(candidateReleaseId)},version.catalog_id,version.id::text,
        version.release_id::text,version.definition_sha256
      ),'UTF8'),'sha256'),'hex')
    from public.estimate_definition_version version
    where version.release_id=${sqlLiteral(ACTIVE_RELEASE_ID)}::uuid
    on conflict(release_id,catalog_id) do nothing;

    do $foundation$
    declare
      v_release public.estimate_definition_release%rowtype;
      v_count integer;
      v_unclassified integer;
      v_batch009 integer;
      v_direct_rows integer;
    begin
      select * into v_release from public.estimate_definition_release where release_key=${sqlLiteral(RELEASE_KEY)};
      if v_release.id<>${sqlLiteral(candidateReleaseId)}::uuid or v_release.status<>'draft'
        or v_release.sealed_at is not null or v_release.parent_release_id<>${sqlLiteral(ACTIVE_RELEASE_ID)}::uuid
        or v_release.source_commit<>${sqlLiteral(head)} or v_release.source_tree<>${sqlLiteral(tree)} then
        raise exception 'R58_FOUNDATION_CANDIDATE_RELEASE_DRIFT';
      end if;
      select count(*),count(*) filter(where domain_id='unclassified'),
        count(*) filter(where upper(source_batch) like 'BATCH009%')
      into v_count,v_unclassified,v_batch009
      from public.estimate_cumulative_manifest_entry where release_id=v_release.id;
      if v_count<>4272 or v_unclassified<>0 or v_batch009<>0 then
        raise exception 'R58_FOUNDATION_MANIFEST_DRIFT count=% unclassified=% batch009=%',v_count,v_unclassified,v_batch009;
      end if;
      select count(*) into v_direct_rows from public.estimate_definition_version where release_id=v_release.id;
      if v_direct_rows<>0 then raise exception 'R58_FOUNDATION_COPIED_ACCEPTED_DEFINITIONS:%',v_direct_rows; end if;
      if (select count(*) from public.estimate_definition_release where status='active')<>1
        or (select id from public.estimate_definition_release where status='active')<>${sqlLiteral(ACTIVE_RELEASE_ID)}::uuid then
        raise exception 'R58_FOUNDATION_ACTIVE_RELEASE_CHANGED';
      end if;
    end
    $foundation$;

    select jsonb_build_object(
      'candidate_release_id',${sqlLiteral(candidateReleaseId)},
      'candidate_status',(select status from public.estimate_definition_release where id=${sqlLiteral(candidateReleaseId)}::uuid),
      'manifest_rows',(select count(*) from public.estimate_cumulative_manifest_entry where release_id=${sqlLiteral(candidateReleaseId)}::uuid),
      'baseline_ready',(select count(*) from public.estimate_cumulative_manifest_entry where release_id=${sqlLiteral(candidateReleaseId)}::uuid and baseline_ready),
      'scenario_ready',(select count(*) from public.estimate_cumulative_manifest_entry where release_id=${sqlLiteral(candidateReleaseId)}::uuid and scenario_ready),
      'direct_definition_rows',(select count(*) from public.estimate_definition_version where release_id=${sqlLiteral(candidateReleaseId)}::uuid),
      'domains',(select jsonb_object_agg(domain_id,count) from (
        select domain_id,count(*) count from public.estimate_cumulative_manifest_entry
        where release_id=${sqlLiteral(candidateReleaseId)}::uuid group by domain_id order by domain_id
      ) domain_counts),
      'active_release_id',(select id from public.estimate_definition_release where status='active'),
      'batch009_rows',(select count(*) from public.estimate_cumulative_manifest_entry
        where release_id=${sqlLiteral(candidateReleaseId)}::uuid and upper(source_batch) like 'BATCH009%')
    )::text;
    ${apply ? "commit;" : "rollback;"}
  `);
  const summaryLine = transactionOutput.split(/\r?\n/u).find((line) => line.trim().startsWith("{"));
  invariant(summaryLine, "R58_FOUNDATION_TRANSACTION_SUMMARY_MISSING");
  const transaction = JSON.parse(summaryLine) as Json;
  const after = databaseState();
  if (apply) {
    invariant(after.candidate_release_id === candidateReleaseId
      && after.candidate_status === "draft" && after.manifest_rows === 4_272,
    "R58_FOUNDATION_APPLY_NOT_PERSISTED");
  } else {
    invariant(JSON.stringify(after) === JSON.stringify(before), "R58_FOUNDATION_DRY_RUN_ROLLBACK_DRIFT");
  }
  invariant(after.active_release_id === ACTIVE_RELEASE_ID && after.active_release_count === 1,
    "R58_FOUNDATION_ACTIVE_RELEASE_CHANGED_AFTER_TRANSACTION");

  const evidence = {
    schemaVersion: "p0-one-monolith-r58-cumulative-foundation.v1",
    capturedAt: new Date().toISOString(),
    specSha256: SPEC_SHA256,
    mode: apply ? "APPLY" : "DRY_RUN_ROLLBACK",
    source: { branch, head, tree },
    repairMatrixSha256: matrix.ledgerSha256,
    candidateReleaseId,
    migrationsApplied: apply && includeMigrations,
    before,
    transaction,
    after,
    activeReleaseSwitched: false,
    runtime8081Switched: false,
    searchCutover: false,
    batch009Activated: false,
    status: apply
      ? "GREEN_R58_DRAFT_CUMULATIVE_FOUNDATION_4272_APPLIED_ACTIVE_UNCHANGED"
      : "GREEN_R58_DRAFT_CUMULATIVE_FOUNDATION_4272_DRY_RUN_ROLLED_BACK",
  };
  const output = resolve(ROOT, apply
    ? "R58_CUMULATIVE_FOUNDATION_APPLY.json"
    : "R58_CUMULATIVE_FOUNDATION_DRY_RUN.json");
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
}
