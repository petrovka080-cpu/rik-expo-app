import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { Client } from "pg";

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE_ROOT = join(ROOT, ".release-runtime", "master11610-backend-canonical-r2", "evidence");
const PACKAGE_ROOT = join(ROOT, ".release-runtime", "master11610-backend-canonical-r2", "02-canonical-export");
const SOURCE_DATABASE_URL = process.env.ESTIMATE_R1_BASELINE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/master11610_schema_replay";
const CANDIDATE_DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/master11610_r2_dev";
const R1_RELEASE_ID = "86e62f78-7aee-49ff-a033-bb832339d588";
const R2_RELEASE_ID = "c90141a2-fdd6-4e78-b01c-bad792c8df18";

type JsonRecord = Record<string, unknown>;

function stableJson(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as JsonRecord;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : stableJson(value)).digest("hex");
}

async function r1Fingerprints(client: Client): Promise<JsonRecord> {
  const result = await client.query(`
    select 'release_core' label, encode(sha256(convert_to(jsonb_agg(jsonb_build_object(
      'id',id,'release_key',release_key,'schema_version',schema_version,'status',status,
      'source_commit',source_commit,'source_tree',source_tree,
      'source_manifest_sha256',source_manifest_sha256,'definition_count',definition_count,
      'resource_row_count',resource_row_count,'metadata',metadata,'created_at',created_at,
      'activated_at',activated_at,'sealed_at',sealed_at
    ) order by id)::text,'UTF8')),'hex') hash, count(*)::integer count
    from public.estimate_definition_release where id=$1
    union all
    select 'definitions', encode(sha256(convert_to(string_agg(
      jsonb_build_array(v.catalog_id,v.definition_version,v.definition_sha256)::text,E'\n' order by v.catalog_id
    ),'UTF8')),'hex'), count(*)::integer
    from public.estimate_definition_version v where v.release_id=$1
    union all
    select 'parameters', encode(sha256(convert_to(string_agg(jsonb_build_array(
      v.catalog_id,p.parameter_id,p.ordinal,p.value_type,p.unit_id,p.title_ru,p.required,p.default_value,p.constraints_json
    )::text,E'\n' order by v.catalog_id,p.ordinal,p.parameter_id),'UTF8')),'hex'), count(*)::integer
    from public.estimate_parameter_definition p
    join public.estimate_definition_version v on v.id=p.definition_version_id where v.release_id=$1
    union all
    select 'formulas', encode(sha256(convert_to(string_agg(
      jsonb_build_array(v.catalog_id,f.formula_id,f.ast_sha256)::text,E'\n' order by v.catalog_id,f.formula_id
    ),'UTF8')),'hex'), count(*)::integer
    from public.estimate_formula_graph f
    join public.estimate_definition_version v on v.id=f.definition_version_id where v.release_id=$1
    union all
    select 'resources', encode(sha256(convert_to(string_agg(
      jsonb_build_array(v.catalog_id,s.row_id,s.row_sha256)::text,E'\n' order by v.catalog_id,s.ordinal,s.row_id
    ),'UTF8')),'hex'), count(*)::integer
    from public.estimate_resource_spec s
    join public.estimate_definition_version v on v.id=s.definition_version_id where v.release_id=$1
    union all
    select 'revisions', encode(sha256(convert_to(jsonb_agg(jsonb_build_object(
      'id',r.id,'parent_revision_id',r.parent_revision_id,'organization_id',r.organization_id,
      'owner_user_id',r.owner_user_id,'release_id',r.release_id,'catalog_id',r.catalog_id,
      'revision_number',r.revision_number,'status',r.status,'input_parameters',r.input_parameters,
      'price_snapshot_ids',r.price_snapshot_ids,'currency_code',r.currency_code,'totals',r.totals,
      'row_count',r.row_count,'checksum_sha256',r.checksum_sha256,
      'compiler_version',r.compiler_version,'migration_source',r.migration_source,'created_at',r.created_at
    ) order by r.id)::text,'UTF8')),'hex'), count(*)::integer
    from public.estimate_revision r where r.release_id=$1
    union all
    select 'revision_rows', encode(sha256(convert_to(jsonb_agg(jsonb_build_object(
      'revision_id',rr.revision_id,'row_id',rr.row_id,'ordinal',rr.ordinal,
      'resource_spec_id',rr.resource_spec_id,'section',rr.section,'category',rr.category,
      'title_ru',rr.title_ru,'unit_id',rr.unit_id,'quantity',rr.quantity,
      'unit_price',rr.unit_price,'amount',rr.amount,'currency_code',rr.currency_code,
      'procurement_eligible',rr.procurement_eligible,'calculation_trace',rr.calculation_trace,
      'normative_trace',rr.normative_trace,'legacy_row_payload',rr.legacy_row_payload,
      'row_sha256',rr.row_sha256
    ) order by rr.revision_id,rr.ordinal)::text,'UTF8')),'hex'), count(*)::integer
    from public.estimate_revision_row rr where rr.revision_id in (
      select id from public.estimate_revision where release_id=$1
    )
    union all
    select 'revision_prices', encode(sha256(convert_to(jsonb_agg(to_jsonb(rp)
      order by rp.revision_id,rp.row_id)::text,'UTF8')),'hex'), count(*)::integer
    from public.estimate_revision_row_price rp where rp.revision_id in (
      select id from public.estimate_revision where release_id=$1
    )
    order by label
  `, [R1_RELEASE_ID]);
  return Object.fromEntries(result.rows.map((row) => [row.label, { count: Number(row.count), sha256: row.hash }]));
}

async function main(): Promise<void> {
  const manifestBytes = readFileSync(join(PACKAGE_ROOT, "manifest.json"));
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as JsonRecord;
  const source = new Client({ connectionString: SOURCE_DATABASE_URL, application_name: "r1-lineage-source-proof" });
  const candidate = new Client({ connectionString: CANDIDATE_DATABASE_URL, application_name: "r1-r2-lineage-candidate-proof" });
  await Promise.all([source.connect(), candidate.connect()]);
  try {
    const sourceR1 = await r1Fingerprints(source);
    const candidateR1 = await r1Fingerprints(candidate);
    const releasesResult = await candidate.query(`
        select id,release_key,schema_version,status,parent_release_id,source_manifest_sha256,
               source_package_sha256,definition_count,parameter_count,formula_count,
               resource_row_count,sealed_at,activated_at
        from public.estimate_definition_release where id=any($1::uuid[]) order by schema_version
      `, [[R1_RELEASE_ID, R2_RELEASE_ID]]);
    const countsResult = await candidate.query(`
        select
          (select count(*)::integer from public.estimate_definition_version where release_id=$1) definitions,
          (select count(*)::integer from public.estimate_parameter_definition p join public.estimate_definition_version v on v.id=p.definition_version_id where v.release_id=$1) parameters,
          (select count(*)::integer from public.estimate_formula_graph f join public.estimate_definition_version v on v.id=f.definition_version_id where v.release_id=$1) formulas,
          (select count(*)::integer from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id where v.release_id=$1) resources
      `, [R2_RELEASE_ID]);
    const programResult = await candidate.query("select denominator_total,admitted_global_count,queue_remaining,external_reference_count,batch006_started from public.estimate_program_control_state where singleton=true");
    const sealResult = await candidate.query("select * from public.estimate_definition_release_admission_seal where release_id=$1", [R2_RELEASE_ID]);
    const releases = releasesResult.rows;
    const r2 = releases.find((row) => row.id === R2_RELEASE_ID);
    const r1 = releases.find((row) => row.id === R1_RELEASE_ID);
    const counts = countsResult.rows[0];
    const program = programResult.rows[0];
    const seal = sealResult.rows[0];
    const r1Unchanged = stableJson(sourceR1) === stableJson(candidateR1);
    const green = r1Unchanged && r1?.status === "active" && r2?.status === "prepared"
      && r2?.parent_release_id === R1_RELEASE_ID
      && r2?.source_manifest_sha256 === manifest.manifestSha256
      && r2?.source_package_sha256 === manifest.sourcePackageSha256
      && Number(r2?.definition_count) === 1_168 && Number(r2?.parameter_count) === 138_425
      && Number(r2?.formula_count) === 101_416 && Number(r2?.resource_row_count) === 101_416
      && Number(counts.definitions) === 1_168 && Number(counts.parameters) === 138_425
      && Number(counts.formulas) === 101_416 && Number(counts.resources) === 101_416
      && Number(program.denominator_total) === 11_610 && Number(program.admitted_global_count) === 1_160
      && Number(program.queue_remaining) === 10_450 && Number(program.external_reference_count) === 8
      && program.batch006_started === false && seal?.test_runtime_residue === 0;
    const proof = {
      schemaVersion: "canonical-r1-to-r2-release-lineage-proof.r2",
      generatedAt: new Date().toISOString(),
      sourceR1Release: r1,
      preparedR2Release: r2,
      package: {
        releaseId: manifest.releaseId,
        releaseKey: manifest.releaseKey,
        manifestSha256: manifest.manifestSha256,
        manifestFileSha256: sha256(manifestBytes),
        sourcePackageSha256: manifest.sourcePackageSha256,
        predecessorRelease: manifest.predecessorRelease,
      },
      r1BytePreservation: {
        sourceDatabaseFingerprints: sourceR1,
        candidateDatabaseFingerprints: candidateR1,
        mismatchCount: r1Unchanged ? 0 : 1,
      },
      r2Cardinalities: {
        definitions: Number(counts.definitions),
        parameters: Number(counts.parameters),
        formulas: Number(counts.formulas),
        resources: Number(counts.resources),
      },
      admissionSeal: seal,
      programControl: program,
      activationDeferredUntilIndependentGreen: true,
      status: green ? "GREEN_PREPARED_NOT_ACTIVATED" : "RED",
    };
    writeFileSync(join(EVIDENCE_ROOT, "CANONICAL_R1_TO_R2_RELEASE_LINEAGE_PROOF.json"), `${JSON.stringify(proof, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify({ status: proof.status, r1Unchanged, r2Cardinalities: proof.r2Cardinalities })}\n`);
    if (!green) process.exitCode = 1;
  } finally {
    await Promise.all([source.end(), candidate.end()]);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
