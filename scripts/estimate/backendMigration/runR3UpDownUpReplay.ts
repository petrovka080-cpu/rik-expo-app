import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { Client } from "pg";

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE = join(ROOT, ".release-runtime", "master11610-backend-canonical-r2", "evidence");
const SOURCE_URL = process.env.ESTIMATE_R1_BASELINE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/master11610_r1";
const CANDIDATE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL ?? "";
const R1_RELEASE_ID = "86e62f78-7aee-49ff-a033-bb832339d588";

type Json = Record<string, any>;

function stableJson(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}
function sha256(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
function git(args: string[]): string { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); }

async function r1Fingerprint(client: Client): Promise<Json> {
  const release = (await client.query(`
    select id,release_key,schema_version,source_commit,source_tree,source_manifest_sha256,
           definition_count,resource_row_count,metadata,created_at,activated_at,sealed_at
    from public.estimate_definition_release where id=$1
  `, [R1_RELEASE_ID])).rows;
  const aggregates = await client.query(`
    select
      (select count(*)::integer from public.estimate_definition_version where release_id=$1) definitions,
      (select count(*)::integer from public.estimate_parameter_definition p join public.estimate_definition_version v on v.id=p.definition_version_id where v.release_id=$1) parameters,
      (select count(*)::integer from public.estimate_formula_graph f join public.estimate_definition_version v on v.id=f.definition_version_id where v.release_id=$1) formulas,
      (select count(*)::integer from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id where v.release_id=$1) resources,
      (select count(*)::integer from public.estimate_revision where release_id=$1) revisions,
      (select count(*)::integer from public.estimate_revision_row rr join public.estimate_revision r on r.id=rr.revision_id where r.release_id=$1) rows,
      (select count(*)::integer from public.estimate_revision_row_price rp join public.estimate_revision r on r.id=rp.revision_id where r.release_id=$1) prices,
      (select encode(sha256(convert_to(string_agg(jsonb_build_array(v.catalog_id,v.definition_version,v.definition_sha256)::text,E'\n' order by v.catalog_id),'UTF8')),'hex') from public.estimate_definition_version v where v.release_id=$1) definitions_sha256,
      (select encode(sha256(convert_to(string_agg(jsonb_build_array(v.catalog_id,p.parameter_id,p.ordinal,p.value_type,p.unit_id,p.title_ru,p.required,p.default_value,p.constraints_json)::text,E'\n' order by v.catalog_id,p.ordinal,p.parameter_id),'UTF8')),'hex') from public.estimate_parameter_definition p join public.estimate_definition_version v on v.id=p.definition_version_id where v.release_id=$1) parameters_sha256,
      (select encode(sha256(convert_to(string_agg(jsonb_build_array(v.catalog_id,f.formula_id,f.ast_sha256)::text,E'\n' order by v.catalog_id,f.formula_id),'UTF8')),'hex') from public.estimate_formula_graph f join public.estimate_definition_version v on v.id=f.definition_version_id where v.release_id=$1) formulas_sha256,
      (select encode(sha256(convert_to(string_agg(jsonb_build_array(v.catalog_id,s.row_id,s.row_sha256)::text,E'\n' order by v.catalog_id,s.ordinal,s.row_id),'UTF8')),'hex') from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id where v.release_id=$1) resources_sha256,
      (select encode(sha256(convert_to(jsonb_agg(jsonb_build_array(r.id,r.parent_revision_id,r.release_id,r.catalog_id,r.revision_number,r.status,r.input_parameters,r.price_snapshot_ids,r.currency_code,r.totals,r.row_count,r.checksum_sha256,r.compiler_version,r.migration_source,r.created_at) order by r.id)::text,'UTF8')),'hex') from public.estimate_revision r where r.release_id=$1) revisions_sha256,
      (select encode(sha256(convert_to(jsonb_agg(jsonb_build_array(rr.revision_id,rr.row_id,rr.ordinal,rr.resource_spec_id,rr.section,rr.category,rr.title_ru,rr.unit_id,rr.quantity,rr.unit_price,rr.amount,rr.currency_code,rr.procurement_eligible,rr.calculation_trace,rr.normative_trace,rr.legacy_row_payload,rr.row_sha256) order by rr.revision_id,rr.ordinal)::text,'UTF8')),'hex') from public.estimate_revision_row rr join public.estimate_revision r on r.id=rr.revision_id where r.release_id=$1) rows_sha256,
      (select encode(sha256(convert_to(jsonb_agg(to_jsonb(rp) order by rp.revision_id,rp.row_id)::text,'UTF8')),'hex') from public.estimate_revision_row_price rp join public.estimate_revision r on r.id=rp.revision_id where r.release_id=$1) prices_sha256
  `, [R1_RELEASE_ID]);
  return { release, ...aggregates.rows[0] };
}

async function schemaFingerprint(client: Client): Promise<string> {
  const result = await client.query(`
    select encode(sha256(convert_to(string_agg(value,E'\n' order by value),'UTF8')),'hex') value
    from (
      select concat(table_name,':',column_name,':',data_type,':',is_nullable,':',coalesce(column_default,'')) value
      from information_schema.columns where table_schema='public' and table_name like 'estimate_%'
      union all
      select concat('fn:',p.proname,':',pg_get_function_identity_arguments(p.oid),':',
        regexp_replace(pg_get_functiondef(p.oid),'[[:space:]]+','','g'))
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'estimate_%'
    ) rows
  `);
  return result.rows[0].value;
}

async function main(): Promise<void> {
  if (!CANDIDATE_URL) throw new Error("ESTIMATE_MIGRATION_DATABASE_URL_REQUIRED");
  const candidateName = new URL(CANDIDATE_URL).pathname.replace(/^\//, "");
  if (!/^master11610_r3_(?:exact_final|replay_[12])$/.test(candidateName)) throw new Error(`DISPOSABLE_DATABASE_NAME_REJECTED:${candidateName}`);
  mkdirSync(EVIDENCE, { recursive: true });
  const upPath = join(ROOT, "supabase", "migrations", "20260814190000_estimate_canonical_backend_platform_r2.sql");
  const downPath = join(ROOT, "supabase", "rollback", "20260814190000_estimate_canonical_backend_platform_r2.down.sql");
  const up = readFileSync(upPath, "utf8");
  const down = readFileSync(downPath, "utf8");
  const source = new Client({ connectionString: SOURCE_URL, application_name: "r3-up-down-up-source" });
  const candidate = new Client({ connectionString: CANDIDATE_URL, application_name: "r3-up-down-up-candidate" });
  await Promise.all([source.connect(), candidate.connect()]);
  try {
    const sourceR1 = await r1Fingerprint(source);
    const before = await r1Fingerprint(candidate);
    const schemaBefore = await schemaFingerprint(candidate);
    if (stableJson(sourceR1) !== stableJson(before)) throw new Error("FRESH_CLONE_R1_NOT_BYTE_PRESERVING");
    await candidate.query(up);
    const afterUp = await r1Fingerprint(candidate);
    const schemaAfterUp = await schemaFingerprint(candidate);
    if (stableJson(sourceR1) !== stableJson(afterUp)) throw new Error("R1_DRIFT_AFTER_FIRST_UP");
    await candidate.query(down);
    const afterDown = await r1Fingerprint(candidate);
    const schemaAfterDown = await schemaFingerprint(candidate);
    if (stableJson(sourceR1) !== stableJson(afterDown) || schemaAfterDown !== schemaBefore) throw new Error("R1_DRIFT_AFTER_DOWN");
    await candidate.query(up);
    const afterSecondUp = await r1Fingerprint(candidate);
    const schemaAfterSecondUp = await schemaFingerprint(candidate);
    if (stableJson(sourceR1) !== stableJson(afterSecondUp) || schemaAfterSecondUp !== schemaAfterUp) throw new Error("R1_DRIFT_AFTER_SECOND_UP");
    const sourceBinding = { head: git(["rev-parse", "HEAD"]), tree: git(["rev-parse", "HEAD^{tree}"]) };
    const proof = {
      schemaVersion: "r2-up-down-up-migration-replay.r3", generatedAt: new Date().toISOString(),
      source: sourceBinding, database: candidateName,
      migration: { path: upPath, bytes: Buffer.byteLength(up), sha256: sha256(up) },
      rollback: { path: downPath, bytes: Buffer.byteLength(down), sha256: sha256(down) },
      stages: {
        before: { schemaFingerprint: schemaBefore, r1: before },
        up1: { schemaFingerprint: schemaAfterUp, r1: afterUp },
        down: { schemaFingerprint: schemaAfterDown, r1: afterDown },
        up2: { schemaFingerprint: schemaAfterSecondUp, r1: afterSecondUp },
      },
      r1LogicalBytePreservation: true, schemaReplayExact: true, status: "GREEN",
    };
    writeFileSync(join(EVIDENCE, "R2_UP_DOWN_UP_MIGRATION_REPLAY.json"), `${JSON.stringify(proof, null, 2)}\n`, "utf8");
    writeFileSync(join(EVIDENCE, "CANONICAL_R1_BYTE_PRESERVATION_PROOF.json"), `${JSON.stringify({
      schemaVersion: "canonical-r1-byte-preservation-proof.r3", generatedAt: proof.generatedAt,
      source: sourceBinding, sourceDatabase: new URL(SOURCE_URL).pathname.replace(/^\//, ""), cloneDatabase: candidateName,
      r1ReleaseId: R1_RELEASE_ID, sourceFingerprint: sourceR1, cloneFingerprints: { before, afterUp, afterDown, afterSecondUp },
      revisionCount: Number(sourceR1.revisions), rowCount: Number(sourceR1.rows), priceCount: Number(sourceR1.prices),
      mismatches: 0, status: "GREEN",
    }, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify({ status: "GREEN", database: candidateName, source: sourceBinding, schemaReplayExact: true, r1Revisions: sourceR1.revisions }, null, 2)}\n`);
  } finally {
    await Promise.all([source.end(), candidate.end()]);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
