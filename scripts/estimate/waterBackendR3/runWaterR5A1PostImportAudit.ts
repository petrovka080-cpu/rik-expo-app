import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const ROOT = resolve(__dirname, "../../..");
const RUNTIME = join(ROOT, ".release-runtime", "batch006-water-backend-r3");
const EVIDENCE = join(RUNTIME, "evidence-a2");
const PACKAGE = resolve(process.env.BATCH006_PACKAGE_ROOT ?? join(RUNTIME, "03-r6-a2-release-a"));
const DATABASE_URL = process.env.BATCH006_DATABASE_URL;
const EXPECTED_DATABASE = process.env.BATCH006_EXPECTED_DATABASE_NAME;

function argument(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const row = value as Json;
  return `{${Object.keys(row).sort().map((key) => `${JSON.stringify(key)}:${stable(row[key])}`).join(",")}}`;
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

async function main(): Promise<void> {
  if (!DATABASE_URL) throw new Error("BATCH006_DATABASE_URL_REQUIRED");
  const selected = decodeURIComponent(new URL(DATABASE_URL).pathname.replace(/^\//, ""));
  if (!EXPECTED_DATABASE || selected !== EXPECTED_DATABASE || !/^batch006_water_r6_a2_[ab]$/.test(selected)) {
    throw new Error(`BATCH006_EXACT_DISPOSABLE_DATABASE_REQUIRED:${selected}:${EXPECTED_DATABASE ?? "MISSING"}`);
  }
  const manifestPath = join(PACKAGE, "manifest.json");
  const manifestBytes = readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as Json;
  const first = readJson(join(EVIDENCE, "A2_06_FIRST_REPAIRED_ORACLE.json"));
  const second = readJson(join(EVIDENCE, "A2_06_SECOND_CLEAN_ORACLE.json"));
  const pair = readJson(join(EVIDENCE, "A2_06_ORACLE_COMPARISON.json"));
  const massPath = resolve(argument("mass-proof", join(EVIDENCE, "A2_09_WATER_MASS_ADMISSION_PROOF.json")));
  const mass = readJson(massPath);
  const output = resolve(argument("output", join(EVIDENCE, "A2_09_POST_IMPORT_ORACLE.json")));
  const client = new Client({ connectionString: DATABASE_URL, application_name: "batch006-water-r6-a2-post-import-oracle" });
  await client.connect();
  try {
    const identity = (await client.query(`
      select current_database() database, r.id,r.release_key,r.status,r.schema_version,r.parent_release_id,
        r.source_commit,r.source_tree,r.source_manifest_sha256,r.source_package_sha256,r.definition_count,
        r.parameter_count,r.formula_count,r.resource_row_count,r.metadata,
        s.denominator_total,s.admitted_global_count,s.queue_remaining,s.external_reference_count,
        s.batch007_selected,s.batch007_execution_started
      from public.estimate_definition_release r cross join public.estimate_program_control_state s
      where r.id=$1 and s.singleton=true
    `, [manifest.releaseId])).rows[0] as Json;
    const counts = (await client.query(`
      with water_rows as (
        select v.catalog_id,s.* from public.estimate_definition_version v
        join public.estimate_work_identity w on w.catalog_id=v.catalog_id
        join public.estimate_resource_spec s on s.definition_version_id=v.id
        where v.release_id=$1 and w.domain='water_supply_sewerage'
      ) select
        (select count(distinct catalog_id)::integer from water_rows) water_definitions,
        (select count(*)::integer from water_rows) water_resources,
        (select count(*)::integer from public.estimate_parameter_definition p join public.estimate_definition_version pv on pv.id=p.definition_version_id join public.estimate_work_identity pw on pw.catalog_id=pv.catalog_id where pv.release_id=$1 and pw.domain='water_supply_sewerage') water_parameters,
        (select count(*)::integer from public.estimate_formula_graph f join public.estimate_definition_version fv on fv.id=f.definition_version_id join public.estimate_work_identity fw on fw.catalog_id=fv.catalog_id where fv.release_id=$1 and fw.domain='water_supply_sewerage') water_formulas,
        (select count(*)::integer from water_rows where row_sha256 !~ '^[0-9a-f]{64}$') invalid_row_hash,
        (select count(*)::integer from water_rows where jsonb_array_length(coalesce(source_metadata->'normativeTrace','[]'::jsonb))=0) missing_normative_trace,
        (select count(*)::integer from water_rows where source_metadata->'priceRoute' is null) missing_price_route,
        (select count(*)::integer from water_rows where semantic_owner is null or (semantic_owner not like 'water:%' and semantic_owner not like 'typed-child:%')) wrong_owner,
        (select count(*)-count(distinct (catalog_id,row_id)) from water_rows)::integer duplicate_rows,
        (select count(*)::integer from water_rows s where not exists(select 1 from public.estimate_work_normative_binding b where b.resource_spec_id=s.id)) missing_normalized_norm,
        (select count(*)::integer from water_rows s where not exists(select 1 from public.estimate_resource_price_route_binding b where b.resource_spec_id=s.id)) missing_normalized_price
    `, [manifest.releaseId])).rows[0] as Json;
    const digests = (await client.query(`
      select
        (select encode(extensions.digest(convert_to(coalesce(string_agg(v.catalog_id||':'||v.definition_sha256,E'\\n' order by v.catalog_id),''),'UTF8'),'sha256'),'hex') from public.estimate_definition_version v join public.estimate_work_identity w on w.catalog_id=v.catalog_id where v.release_id=$1 and w.domain='water_supply_sewerage') definitions_sha256,
        (select encode(extensions.digest(convert_to(coalesce(string_agg(v.catalog_id||':'||p.parameter_id||':'||p.ordinal::text||':'||p.value_type||':'||coalesce(p.unit_id,'')||':'||p.required::text||':'||coalesce(p.default_value::text,'null')||':'||p.constraints_json::text,E'\\n' order by v.catalog_id,p.ordinal,p.parameter_id),''),'UTF8'),'sha256'),'hex') from public.estimate_parameter_definition p join public.estimate_definition_version v on v.id=p.definition_version_id join public.estimate_work_identity w on w.catalog_id=v.catalog_id where v.release_id=$1 and w.domain='water_supply_sewerage') parameters_sha256,
        (select encode(extensions.digest(convert_to(coalesce(string_agg(v.catalog_id||':'||f.formula_id||':'||f.ast_sha256,E'\\n' order by v.catalog_id,f.formula_id),''),'UTF8'),'sha256'),'hex') from public.estimate_formula_graph f join public.estimate_definition_version v on v.id=f.definition_version_id join public.estimate_work_identity w on w.catalog_id=v.catalog_id where v.release_id=$1 and w.domain='water_supply_sewerage') formulas_sha256,
        (select encode(extensions.digest(convert_to(coalesce(string_agg(v.catalog_id||':'||s.row_id||':'||s.row_sha256,E'\\n' order by v.catalog_id,s.ordinal,s.row_id),''),'UTF8'),'sha256'),'hex') from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id join public.estimate_work_identity w on w.catalog_id=v.catalog_id where v.release_id=$1 and w.domain='water_supply_sewerage') resources_sha256
    `, [manifest.releaseId])).rows[0] as Json;
    const jobTruth = (await client.query(`
      select count(*)::integer jobs,
        count(*) filter(where status='succeeded')::integer succeeded,
        count(*) filter(where status='running')::integer running,
        count(*) filter(where status='running' and lease_expires_at<now())::integer expired_running,
        count(*) filter(where result_revision_id is null and status='succeeded')::integer orphan_succeeded,
        count(distinct idempotency_key)::integer distinct_idempotency_keys,
        count(distinct result_revision_id) filter(where result_revision_id is not null)::integer distinct_revisions
      from public.estimate_compile_job where target_release_id=$1
    `, [manifest.releaseId])).rows[0] as Json;
    const revisions = (await client.query(`
      select count(*)::integer revisions,
        count(distinct id)::integer distinct_revisions,
        (count(*)-count(distinct checksum_sha256))::integer repeated_checksums,
        count(*) filter(where release_id<>$1)::integer wrong_release
      from public.estimate_revision where release_id=$1
    `, [manifest.releaseId])).rows[0] as Json;
    const report = {
      schemaVersion: "water-r6-a2-post-import-independent-audit.v1",
      generatedAt: new Date().toISOString(),
      database: selected,
      disposable: true,
      releaseId: manifest.releaseId,
      package: {
        manifestSha256: manifest.manifestSha256,
        manifestFileSha256: sha256(manifestBytes),
        sourcePackageSha256: manifest.sourcePackageSha256,
        sourceFingerprintSha256: manifest.sourceGit.worktreeSourceFingerprintSha256,
      },
      oracle: {
        firstStatus: first.status,
        secondStatus: second.status,
        pairStatus: pair.status,
        comparisonStatus: pair.status,
        firstSourceSha256: first.oracleSourceSha256,
        secondSourceSha256: second.oracleSourceSha256,
        independentSources: first.oracleSourceSha256 !== second.oracleSourceSha256,
        unresolved: Number(first.failureCount) + Number(second.failureCount) + Number(pair.mismatchCount),
        productionImports: Number(first.productionBuilderImports) + Number(second.productionBuilderImports),
      },
      identity,
      counts,
      normalizedDigests: digests,
      admission: {
        proofSha256: sha256(readFileSync(massPath)),
        releaseId: mass.releaseId,
        compile: mass.serverCompile,
        recalculate: mass.serverRecalculate,
        scenarios: mass.scenarios,
        resourceBranchCoverage: mass.resourceBranchCoverage,
        invalidParameterCombinations: mass.invalidParameterCombinations,
        mutuallyExclusiveSimultaneous: mass.mutuallyExclusiveSimultaneous,
        doubleCount: mass.doubleCount,
        duplicateRevisions: mass.duplicateRevisions,
        unreachableRows: mass.unreachableRows,
      },
      jobTruth,
      revisions,
      wrongReleaseEvidence: 0,
      wrongCardinalityEvidence: 0,
      productionDeployed: false,
      batch007Started: false,
      status: "GREEN",
    };
    const expectedJobs = Number(mass.scenarios?.executed);
    if (identity?.database !== selected || identity?.id !== manifest.releaseId || identity?.status !== "prepared"
      || Number(identity.schema_version) !== 5 || identity.source_manifest_sha256 !== manifest.manifestSha256
      || identity.source_package_sha256 !== manifest.sourcePackageSha256
      || Number(counts.water_definitions) !== manifest.waterDelta.definitions || Number(counts.water_parameters) !== manifest.waterDelta.parameters
      || Number(counts.water_formulas) !== manifest.waterDelta.formulas || Number(counts.water_resources) !== manifest.waterDelta.resources
      || ["invalid_row_hash", "missing_normative_trace", "missing_price_route", "wrong_owner", "duplicate_rows", "missing_normalized_norm", "missing_normalized_price"].some((key) => Number(counts[key]) !== 0)
      || report.oracle.firstStatus !== "GREEN_FIRST_REPAIRED_INDEPENDENT_ORACLE"
      || report.oracle.secondStatus !== "GREEN_SECOND_CLEAN_INDEPENDENT_ORACLE"
      || report.oracle.pairStatus !== "GREEN_TWO_INDEPENDENT_ORACLES" || !report.oracle.independentSources
      || report.oracle.unresolved !== 0 || report.oracle.productionImports !== 0
      || mass.status !== "GREEN" || mass.releaseId !== manifest.releaseId
      || Number(mass.serverCompile?.green) !== manifest.waterDelta.definitions
      || Number(mass.serverRecalculate?.green) !== manifest.waterDelta.definitions
      || Number(mass.resourceBranchCoverage?.reached) !== manifest.waterDelta.resources
      || Number(mass.invalidParameterCombinations) !== 0 || Number(mass.mutuallyExclusiveSimultaneous) !== 0
      || Number(mass.doubleCount) !== 0 || Number(mass.duplicateRevisions) !== 0 || Number(mass.unreachableRows) !== 0
      || Number(jobTruth.jobs) < expectedJobs || Number(jobTruth.running) !== 0 || Number(jobTruth.orphan_succeeded) !== 0
      || Number(jobTruth.jobs) !== Number(jobTruth.distinct_idempotency_keys)
      || Number(revisions.revisions) !== Number(revisions.distinct_revisions) || Number(revisions.wrong_release) !== 0) {
      report.status = "RED";
      throw new Error(`WATER_R6_A2_POST_IMPORT_ORACLE_RED:${stable(report)}`);
    }
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
