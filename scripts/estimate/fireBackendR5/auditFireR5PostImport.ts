import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "pg";

import { assertExact, semanticSha256, writeJson } from "./support";

type Json = Record<string, any>;

function argument(name: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? "";
}

async function digest(client: Client, sql: string, values: unknown[]): Promise<{ count: number; digest: string }> {
  const row = (await client.query(sql, values)).rows[0];
  return { count: Number(row.count), digest: String(row.digest) };
}

async function main(): Promise<void> {
  const databaseUrl = argument("database-url") || process.env.BATCH009_DATABASE_URL || "";
  const packageRoot = resolve(argument("package-root"));
  const label = (argument("label") || "A").toUpperCase();
  assertExact(databaseUrl.length > 0 && packageRoot.length > 0 && ["A", "B"].includes(label), "FIRE_POST_IMPORT_ARGS_RED");
  const url = new URL(databaseUrl);
  const database = decodeURIComponent(url.pathname.slice(1));
  assertExact(["127.0.0.1", "localhost", "::1"].includes(url.hostname) && Number(url.port) === 55432 && /^batch009_fire_r5_[ab]$/u.test(database), "FIRE_POST_IMPORT_DATABASE_ALLOWLIST_RED");
  const manifest = JSON.parse(readFileSync(resolve(packageRoot, "manifest.json"), "utf8")) as Json;
  const client = new Client({ connectionString: databaseUrl, application_name: `batch009-post-import-oracle-${label.toLowerCase()}`, statement_timeout: 0 });
  await client.connect();
  try {
    const releases = (await client.query(`select id::text,release_key,status,parent_release_id::text,definition_count,parameter_count,formula_count,resource_row_count,source_manifest_sha256,source_package_sha256,sealed_at is not null sealed,activated_at is not null activated from public.estimate_definition_release where id=any($1::uuid[]) order by id`, [[manifest.parentRelease.releaseId, manifest.releaseId]])).rows;
    const state = (await client.query(`select denominator_total,admitted_global_count,queue_remaining,external_reference_count,batch008_selected,batch008_execution_started,concrete_domain_complete,concrete_domain_remaining,batch009_selected,batch009_execution_started,fire_domain_complete,fire_domain_remaining,all_normative_work_gaps_disposed,missing_required_works,batch010_selected,batch010_execution_started,program_state_version,state_sha256 from public.estimate_program_control_state where singleton=true`)).rows[0];
    const domain = (await client.query(`select count(*)::integer definitions,count(*) filter(where w.denominator_eligible)::integer global,count(*) filter(where not w.denominator_eligible)::integer external,count(*) filter(where not w.denominator_eligible and v.catalog_id like 'external:fire:r5:d:%')::integer demolition,count(*) filter(where not w.denominator_eligible and v.catalog_id like 'external:fire:r5:n:%')::integer non_demolition from public.estimate_definition_version v join public.estimate_work_identity w on w.catalog_id=v.catalog_id where v.release_id=$1 and w.domain='fire'`, [manifest.releaseId])).rows[0];
    const cardinalities = (await client.query(`select
      (select count(*) from public.estimate_definition_version where release_id=$1)::integer definitions,
      (select count(*) from public.estimate_parameter_definition p join public.estimate_definition_version v on v.id=p.definition_version_id where v.release_id=$1)::integer parameters,
      (select count(*) from public.estimate_formula_graph f join public.estimate_definition_version v on v.id=f.definition_version_id where v.release_id=$1)::integer formulas,
      (select count(*) from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id where v.release_id=$1)::integer resources,
      (select count(*) from public.estimate_work_normative_binding b join public.estimate_definition_version v on v.id=b.definition_version_id where v.release_id=$1)::integer norm_bindings,
      (select count(*) from public.estimate_resource_price_route_binding b join public.estimate_resource_spec s on s.id=b.resource_spec_id join public.estimate_definition_version v on v.id=s.definition_version_id where v.release_id=$1)::integer price_bindings,
      (select count(*) from public.estimate_professional_passport p where p.release_id=$1)::integer passports`, [manifest.releaseId])).rows[0];
    const digests = {
      definitions: await digest(client, `select count(*)::integer,md5(coalesce(string_agg(md5(v.catalog_id||':'||v.definition_version::text||':'||v.definition_sha256),'' order by v.catalog_id),'')) digest from public.estimate_definition_version v where v.release_id=$1`, [manifest.releaseId]),
      parameters: await digest(client, `select count(*)::integer,md5(coalesce(string_agg(md5(v.catalog_id||':'||p.ordinal::text||':'||p.parameter_id||':'||p.value_type||':'||p.unit_id||':'||p.constraints_json::text),'' order by v.catalog_id,p.ordinal),'')) digest from public.estimate_parameter_definition p join public.estimate_definition_version v on v.id=p.definition_version_id where v.release_id=$1`, [manifest.releaseId]),
      formulas: await digest(client, `select count(*)::integer,md5(coalesce(string_agg(md5(v.catalog_id||':'||f.formula_id||':'||f.ast_sha256),'' order by v.catalog_id,f.formula_id),'')) digest from public.estimate_formula_graph f join public.estimate_definition_version v on v.id=f.definition_version_id where v.release_id=$1`, [manifest.releaseId]),
      resources: await digest(client, `select count(*)::integer,md5(coalesce(string_agg(md5(v.catalog_id||':'||s.ordinal::text||':'||s.row_id||':'||s.row_sha256),'' order by v.catalog_id,s.ordinal),'')) digest from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id where v.release_id=$1`, [manifest.releaseId]),
      fireIds: await digest(client, `select count(*)::integer,md5(coalesce(string_agg(md5(v.catalog_id||':'||w.namespace||':'||w.denominator_eligible::text),'' order by v.catalog_id),'')) digest from public.estimate_definition_version v join public.estimate_work_identity w on w.catalog_id=v.catalog_id where v.release_id=$1 and w.domain='fire'`, [manifest.releaseId]),
    };
    const beforeEvents = (await client.query(`select count(*)::integer admission_events,coalesce(sum(queue_delta),0)::integer queue_delta from public.estimate_program_event where event_kind='admission' and event_key like 'batch009-fire-r5:%'`)).rows[0];
    const predecessor = releases.find((row) => row.id === manifest.parentRelease.releaseId);
    const target = releases.find((row) => row.id === manifest.releaseId);
    assertExact(predecessor?.status === "active" && predecessor.activated && predecessor.sealed, "FIRE_POST_IMPORT_PREDECESSOR_RED");
    assertExact(target?.status === "prepared" && target.sealed && !target.activated && target.parent_release_id === manifest.parentRelease.releaseId, "FIRE_POST_IMPORT_TARGET_RED");
    assertExact(Number(state.denominator_total) === 11_610 && Number(state.admitted_global_count) === 3_755 && Number(state.queue_remaining) === 7_855 && Number(state.external_reference_count) === 8, "FIRE_POST_IMPORT_QUEUE_RED");
    assertExact(state.batch009_selected === true && state.batch009_execution_started === true && state.fire_domain_complete === false && Number(state.fire_domain_remaining) === 88 && state.batch010_selected === false && state.batch010_execution_started === false, "FIRE_POST_IMPORT_STATE_RED");
    assertExact(Number(domain.definitions) === 231 && Number(domain.global) === 88 && Number(domain.external) === 143 && Number(domain.demolition) === 4 && Number(domain.non_demolition) === 139, "FIRE_POST_IMPORT_DOMAIN_RED");
    assertExact(Number(cardinalities.definitions) === 4_503 && Number(cardinalities.parameters) === 895_723 && Number(cardinalities.formulas) === 1_243_194 && Number(cardinalities.resources) === 1_243_194, "FIRE_POST_IMPORT_CARDINALITY_RED");
    assertExact(Number(beforeEvents.admission_events) === 0 && Number(beforeEvents.queue_delta) === 0, "FIRE_POST_IMPORT_EARLY_ADMISSION_RED");
    const canonical = { manifestSha256: manifest.manifestSha256, sourcePackageSha256: manifest.sourcePackageSha256, releaseId: manifest.releaseId, releases, state: { ...state, program_state_version: String(state.program_state_version) }, domain, cardinalities, digests, beforeEvents };
    const report = { schemaVersion: "batch009-fire-r5-post-import-oracle.v1", label, database, ...canonical, oracleSha256: semanticSha256(canonical), activeReleaseUnchanged: true, queueUnchanged: true, externalGlobalAdmission: 0, productionConnections: 0, status: "GREEN" };
    writeJson(`08-database/POST_IMPORT_ORACLE_${label}.json`, report);
    process.stdout.write(`${JSON.stringify({ label, database, releaseId: manifest.releaseId, oracleSha256: report.oracleSha256, status: report.status }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`); process.exitCode = 1; });
