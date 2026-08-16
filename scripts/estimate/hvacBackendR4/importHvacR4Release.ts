import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join, resolve } from "node:path";
import { Client, type ClientConfig } from "pg";

type Json = Record<string, any>;
type FileProof = { file: string; rows: number; bytes: number; sha256: string };

const ROOT = resolve(__dirname, "../../..");
const RUNTIME = join(ROOT, ".release-runtime", "batch007-hvac-r4");
const EVIDENCE = join(RUNTIME, "evidence");
const EXPECTED = Object.freeze({ works: 3054, globalWorks: 2925, externalReferences: 129, parameters: 451353, formulas: 687002, resources: 687002, hvacDefinitions: 1012, hvacGlobal: 920, hvacExternal: 92, hvacParameters: 132173, hvacFormulas: 353575, hvacResources: 353575 });
const IMPORTER = "batch007-hvac-r4-a2-importer.v1";

function argument(name: string, fallback = ""): string {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}
function flag(name: string): boolean { return process.argv.includes(`--${name}`); }
function stable(value: any): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
}
function sha(value: any): string { return createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : stable(value)).digest("hex"); }

async function fileProof(path: string, file: string): Promise<FileProof> {
  const digest = createHash("sha256");
  let rows = 0;
  let bytes = 0;
  for await (const chunk of createReadStream(path)) {
    const data = chunk as Buffer;
    digest.update(data);
    bytes += data.length;
    for (const byte of data) if (byte === 10) rows += 1;
  }
  return { file, rows, bytes, sha256: digest.digest("hex") };
}

async function verifyPackage(packageRoot: string): Promise<Json> {
  const path = join(packageRoot, "manifest.json");
  if (!existsSync(path)) throw new Error(`HVAC_MANIFEST_NOT_FOUND:${path}`);
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  const { manifestSha256, ...withoutHash } = manifest;
  if (manifest.schemaVersion !== "batch007-hvac-r4-a2-release.v1" || manifest.definitionSchemaVersion !== 5 || sha(stable(withoutHash)) !== manifestSha256) throw new Error("HVAC_MANIFEST_HASH_RED");
  const h = manifest.hvacDelta;
  const a = manifest.actual;
  if (a.works !== EXPECTED.works || a.globalWorks !== EXPECTED.globalWorks || a.externalReferences !== EXPECTED.externalReferences
    || a.parameters !== EXPECTED.parameters || a.formulas !== EXPECTED.formulas || a.resources !== EXPECTED.resources
    || h.definitions !== EXPECTED.hvacDefinitions || h.global !== EXPECTED.hvacGlobal || h.external !== EXPECTED.hvacExternal
    || h.parameters !== EXPECTED.hvacParameters || h.formulas !== EXPECTED.hvacFormulas || h.resources !== EXPECTED.hvacResources
    || h.corpusSetSha256 !== "4ebcced9a7eda71bdc94431743229a4faff79a750a7736bded6c80c207a4f625"
    || manifest.normativeGap.newExternalNonDemolition !== 88 || manifest.normativeGap.unresolved !== 0
    || manifest.programControl.admittedBefore !== 2005 || manifest.programControl.remainingBefore !== 9605
    || manifest.programControl.admittedAfter !== 2925 || manifest.programControl.remainingAfter !== 8685
    || manifest.programControl.externalQueueBefore !== 8 || manifest.programControl.externalQueueAfter !== 8
    || manifest.programControl.queueMutationDuringImport !== 0) throw new Error("HVAC_MANIFEST_EXACT_CARDINALITY_RED");
  for (const expected of manifest.files as FileProof[]) {
    const file = join(packageRoot, expected.file);
    if (!existsSync(file) || statSync(file).size !== expected.bytes) throw new Error(`HVAC_PACKAGE_FILE_SIZE_RED:${expected.file}`);
    if (stable(await fileProof(file, expected.file)) !== stable(expected)) throw new Error(`HVAC_PACKAGE_FILE_PROOF_RED:${expected.file}`);
  }
  const packageHash = sha(stable({ schemaVersion: manifest.schemaVersion, releaseId: manifest.releaseId, releaseKey: manifest.releaseKey, parentReleaseId: manifest.parentRelease.releaseId, files: manifest.files, sourceFingerprintSha256: manifest.sourceGit.worktreeSourceFingerprintSha256, contentIdentity: manifest.contentIdentity }));
  if (packageHash !== manifest.sourcePackageSha256) throw new Error("HVAC_SOURCE_PACKAGE_HASH_RED");
  return manifest;
}

function databaseConfig(): ClientConfig {
  const connectionString = argument("database-url", process.env.BATCH007_DATABASE_URL ?? "");
  if (!connectionString) throw new Error("BATCH007_DATABASE_URL_REQUIRED");
  const url = new URL(connectionString);
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!new Set(["localhost", "127.0.0.1", "::1"]).has(url.hostname) || Number(url.port || 5432) !== 55432 || !/^batch007_hvac_r4_a2_[ab]$/.test(database) || /prod/i.test(`${url.hostname}${database}`)) throw new Error(`HVAC_IMPORT_DISPOSABLE_DATABASE_ALLOWLIST_RED:${url.hostname}:${url.port}:${database}`);
  const expected = process.env.BATCH007_EXPECTED_DATABASE_NAME;
  if (!expected || database !== expected) throw new Error(`HVAC_IMPORT_EXACT_DATABASE_RED:${database}:${expected ?? "MISSING"}`);
  return { connectionString, application_name: IMPORTER, statement_timeout: 0 };
}

async function* batches(path: string, size: number): AsyncGenerator<Json[]> {
  const input = createInterface({ input: createReadStream(path, "utf8"), crlfDelay: Infinity });
  let rows: Json[] = [];
  for await (const line of input) {
    if (!line.trim()) continue;
    rows.push(JSON.parse(line));
    if (rows.length >= size) { yield rows; rows = []; }
  }
  if (rows.length) yield rows;
}

async function assertProgramState(client: Client): Promise<void> {
  const row = (await client.query(`select denominator_total,admitted_global_count,queue_remaining,external_reference_count,batch006_started,water_domain_complete,water_domain_remaining,global_content_complete,batch007_selected,batch007_execution_started,hvac_domain_complete,hvac_domain_remaining,batch008_selected,batch008_execution_started from public.estimate_program_control_state where singleton=true`)).rows[0];
  if (!row || Number(row.denominator_total) !== 11610 || Number(row.admitted_global_count) !== 2005 || Number(row.queue_remaining) !== 9605 || Number(row.external_reference_count) !== 8
    || row.batch006_started !== true || row.water_domain_complete !== true || Number(row.water_domain_remaining) !== 0 || row.global_content_complete !== false
    || row.batch007_selected !== true || row.batch007_execution_started !== true || row.hvac_domain_complete !== false || Number(row.hvac_domain_remaining) !== 920
    || row.batch008_selected !== false || row.batch008_execution_started !== false) throw new Error(`HVAC_PROGRAM_CONTROL_PRE_IMPORT_RED:${JSON.stringify(row ?? null)}`);
}

async function insertWorks(client: Client, path: string, releaseId: string): Promise<void> {
  for await (const batch of batches(path, 200)) {
    for (const work of batch) work.definitionSha256 = sha(stable({ passport: work.passport, applicability: work.applicability, sourceMetadata: work.sourceMetadata }));
    await client.query(`with input as (select * from jsonb_to_recordset($1::jsonb) as x("catalogId" text,namespace text,domain text,"sourceIdentity" text,"workKey" text,"titleRu" text,"denominatorEligible" boolean,"definitionVersion" integer,passport jsonb,applicability jsonb,"sourceMetadata" jsonb,"definitionSha256" text)), identities as (insert into public.estimate_work_identity(catalog_id,namespace,domain,source_identity,work_key,title_ru,denominator_eligible) select "catalogId",namespace,domain,"sourceIdentity","workKey","titleRu","denominatorEligible" from input on conflict(catalog_id) do nothing returning catalog_id) insert into public.estimate_definition_version(release_id,catalog_id,definition_version,passport,applicability,definition_sha256,source_metadata) select $2::uuid,"catalogId","definitionVersion",passport,applicability,"definitionSha256","sourceMetadata" from input`, [JSON.stringify(batch), releaseId]);
    const mismatch = await client.query(`select count(*)::integer count from jsonb_to_recordset($1::jsonb) as x("catalogId" text,namespace text,domain text,"sourceIdentity" text,"workKey" text,"titleRu" text,"denominatorEligible" boolean) join public.estimate_work_identity w on w.catalog_id=x."catalogId" where (w.namespace,w.domain,w.source_identity,w.work_key,w.title_ru,w.denominator_eligible) is distinct from (x.namespace,x.domain,x."sourceIdentity",x."workKey",x."titleRu",x."denominatorEligible")`, [JSON.stringify(batch)]);
    if (Number(mismatch.rows[0].count) !== 0) throw new Error("HVAC_WORK_IDENTITY_CONFLICT");
  }
}

async function insertParameters(client: Client, path: string, releaseId: string): Promise<void> {
  for await (const batch of batches(path, 600)) await client.query(`insert into public.estimate_parameter_definition(definition_version_id,parameter_id,ordinal,value_type,unit_id,title_ru,required,default_value,constraints_json) select v.id,x."parameterId",x.ordinal,x."valueType",x."unitId",x."titleRu",x.required,x."defaultValue",x.constraints from jsonb_to_recordset($1::jsonb) as x("catalogId" text,"parameterId" text,ordinal integer,"valueType" text,"unitId" text,"titleRu" text,required boolean,"defaultValue" jsonb,constraints jsonb) join public.estimate_definition_version v on v.release_id=$2::uuid and v.catalog_id=x."catalogId"`, [JSON.stringify(batch), releaseId]);
}

async function insertFormulas(client: Client, path: string, releaseId: string): Promise<void> {
  for await (const batch of batches(path, 400)) {
    for (const formula of batch) formula.astSha256 = sha(stable(formula.ast));
    await client.query(`insert into public.estimate_formula_graph(definition_version_id,formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256) select v.id,x."formulaId",x."outputUnitId",x."expressionSource",x.ast,x."inputParameterIds",x."astSha256" from jsonb_to_recordset($1::jsonb) as x("catalogId" text,"formulaId" text,"outputUnitId" text,"expressionSource" text,ast jsonb,"inputParameterIds" text[],"astSha256" text) join public.estimate_definition_version v on v.release_id=$2::uuid and v.catalog_id=x."catalogId"`, [JSON.stringify(batch), releaseId]);
  }
}

async function insertResources(client: Client, path: string, releaseId: string): Promise<void> {
  for await (const batch of batches(path, 100)) {
    for (const resource of batch) resource.rowSha256 = sha(stable(resource));
    await client.query(`insert into public.estimate_resource_spec(definition_version_id,row_id,ordinal,section,category,title_ru,row_type,unit_id,formula_id,inclusion_ast,resource_graph,semantic_owner,cost_owner_id,procurement_eligible,source_metadata,row_sha256) select v.id,x."rowId",x.ordinal,x.section,x.category,x."titleRu",x."rowType",x."unitId",x."formulaId",x."inclusionAst",x."resourceGraph",x."semanticOwner",x."costOwnerId",x."procurementEligible",x."sourceMetadata",x."rowSha256" from jsonb_to_recordset($1::jsonb) as x("catalogId" text,"rowId" text,ordinal integer,section text,category text,"titleRu" text,"rowType" text,"unitId" text,"formulaId" text,"inclusionAst" jsonb,"resourceGraph" jsonb,"semanticOwner" text,"costOwnerId" text,"procurementEligible" boolean,"sourceMetadata" jsonb,"rowSha256" text) join public.estimate_definition_version v on v.release_id=$2::uuid and v.catalog_id=x."catalogId"`, [JSON.stringify(batch), releaseId]);
  }
}

async function normalize(client: Client, releaseId: string, manifest: Json): Promise<void> {
  for (const source of manifest.officialSources) await client.query(`insert into public.estimate_normative_source(source_key,title_ru,authority,official_url,artifact_sha256,effective_from,metadata) values($1,$2,$3,$4,$5,$6::date,$7::jsonb) on conflict(source_key) do update set title_ru=excluded.title_ru,authority=excluded.authority,official_url=excluded.official_url,artifact_sha256=excluded.artifact_sha256,effective_from=excluded.effective_from,metadata=excluded.metadata`, [source.sourceId, source.titleRu, source.authority, source.officialUrl, source.artifactSha256, source.effectiveFrom, JSON.stringify({ documentCode: source.documentCode, status: source.status, applicability: source.applicability })]);
  await client.query(`insert into public.estimate_professional_passport(definition_version_id,release_id,catalog_id,passport_version,passport,parameter_cardinality,resource_cardinality,passport_sha256) select v.id,v.release_id,v.catalog_id,v.passport->>'passportVersion',v.passport,(select count(*) from public.estimate_parameter_definition p where p.definition_version_id=v.id)::integer,(select count(*) from public.estimate_resource_spec s where s.definition_version_id=v.id)::integer,encode(extensions.digest(convert_to(v.passport::text,'UTF8'),'sha256'),'hex') from public.estimate_definition_version v join public.estimate_work_identity w on w.catalog_id=v.catalog_id where v.release_id=$1::uuid and w.domain='hvac_heat_supply'`, [releaseId]);
  await client.query(`insert into public.estimate_normative_locator(source_id,locator_key,locator) select distinct on(ns.id,locator_key) ns.id,locator_key,trace from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id cross join lateral jsonb_array_elements(coalesce(s.source_metadata->'normativeTrace','[]'::jsonb)) trace join public.estimate_normative_source ns on ns.source_key=trace->>'source_id' cross join lateral(select md5(ns.source_key||':'||trace::text) locator_key) k where v.release_id=$1::uuid order by ns.id,locator_key,s.id on conflict(source_id,locator_key) do nothing`, [releaseId]);
  await client.query(`insert into public.estimate_work_normative_binding(definition_version_id,resource_spec_id,locator_id,applicability) select distinct s.definition_version_id,s.id,nl.id,jsonb_build_object('text',coalesce(trace->'applicability','null'::jsonb)) from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id cross join lateral jsonb_array_elements(coalesce(s.source_metadata->'normativeTrace','[]'::jsonb)) trace join public.estimate_normative_source ns on ns.source_key=trace->>'source_id' join public.estimate_normative_locator nl on nl.source_id=ns.id and nl.locator_key=md5(ns.source_key||':'||trace::text) where v.release_id=$1::uuid on conflict do nothing`, [releaseId]);
  await client.query(`insert into public.estimate_work_normative_binding(definition_version_id,resource_spec_id,locator_id,applicability) select nv.id,ns.id,ob.locator_id,ob.applicability from public.estimate_definition_version nv join public.estimate_work_identity w on w.catalog_id=nv.catalog_id and w.domain<>'hvac_heat_supply' join public.estimate_definition_version ov on ov.release_id=$2::uuid and ov.catalog_id=nv.catalog_id join public.estimate_resource_spec ns on ns.definition_version_id=nv.id join public.estimate_resource_spec os on os.definition_version_id=ov.id and os.row_id=ns.row_id join public.estimate_work_normative_binding ob on ob.definition_version_id=ov.id and ob.resource_spec_id=os.id where nv.release_id=$1::uuid on conflict do nothing`, [releaseId, manifest.parentRelease.releaseId]);
  await client.query(`insert into public.estimate_price_route(route_key,currency_code,priority,source_kind,metadata) select 'release-resource:'||v.release_id::text||':'||s.row_id,'KGS',100,case when w.domain='hvac_heat_supply' then 'normative' else 'manual' end,jsonb_build_object('costOwnerId',s.cost_owner_id,'sourceRoute',s.source_metadata->'priceRoute','releaseId',v.release_id) from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id join public.estimate_work_identity w on w.catalog_id=v.catalog_id where v.release_id=$1::uuid and s.cost_owner_id is not null on conflict(route_key) do nothing`, [releaseId]);
  await client.query(`insert into public.estimate_resource_price_route_binding(resource_spec_id,route_id,price_key,priority) select s.id,r.id,s.cost_owner_id,r.priority from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id join public.estimate_price_route r on r.route_key='release-resource:'||v.release_id::text||':'||s.row_id where v.release_id=$1::uuid and s.cost_owner_id is not null on conflict do nothing`, [releaseId]);
}

async function importPackage(client: Client, packageRoot: string, manifest: Json): Promise<Json> {
  await client.query("begin isolation level serializable");
  try {
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [manifest.releaseKey]);
    await assertProgramState(client);
    const existing = await client.query(`select mi.status,mi.package_sha256,r.id release_id,r.status release_status from public.estimate_migration_import mi join public.estimate_definition_release r on r.id=mi.release_id where mi.import_key=$1`, [manifest.releaseKey]);
    if (existing.rowCount) {
      const row = existing.rows[0];
      if (row.package_sha256 !== manifest.manifestSha256 || row.status !== "imported" || !["prepared", "active"].includes(row.release_status)) throw new Error("HVAC_IMPORT_KEY_CONFLICT");
      await client.query("commit");
      return { mode: "replay", releaseId: row.release_id, releaseStatus: row.release_status };
    }
    const parent = (await client.query(`select id,release_key,source_manifest_sha256,source_package_sha256,status,sealed_at from public.estimate_definition_release where id=$1 for share`, [manifest.parentRelease.releaseId])).rows[0];
    if (!parent || parent.release_key !== manifest.parentRelease.releaseKey || parent.source_manifest_sha256 !== manifest.parentRelease.sourceManifestSha256 || parent.source_package_sha256 !== manifest.parentRelease.sourcePackageSha256 || parent.status !== "active" || parent.sealed_at == null) throw new Error(`HVAC_PREDECESSOR_RELEASE_RED:${JSON.stringify(parent ?? null)}`);
    await client.query(`insert into public.estimate_definition_release(id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,source_package_sha256,parent_release_id,definition_count,parameter_count,formula_count,resource_row_count,metadata) values($1,$2,5,'draft',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)`, [manifest.releaseId, manifest.releaseKey, manifest.sourceGit.head, manifest.sourceGit.tree, manifest.manifestSha256, manifest.sourcePackageSha256, manifest.parentRelease.releaseId, manifest.actual.works, manifest.actual.parameters, manifest.actual.formulas, manifest.actual.resources, JSON.stringify({ importerVersion: IMPORTER, hvacDelta: manifest.hvacDelta, normativeGap: manifest.normativeGap, contentIdentity: manifest.contentIdentity, sourceFingerprintSha256: manifest.sourceGit.worktreeSourceFingerprintSha256 })]);
    process.stderr.write("[hvac-import] works\n"); await insertWorks(client, join(packageRoot, "works.jsonl"), manifest.releaseId);
    process.stderr.write("[hvac-import] parameters\n"); await insertParameters(client, join(packageRoot, "parameters.jsonl"), manifest.releaseId);
    process.stderr.write("[hvac-import] formulas\n"); await insertFormulas(client, join(packageRoot, "formulas.jsonl"), manifest.releaseId);
    process.stderr.write("[hvac-import] resources\n"); await insertResources(client, join(packageRoot, "resources.jsonl"), manifest.releaseId);
    process.stderr.write("[hvac-import] normalized bindings\n"); await normalize(client, manifest.releaseId, manifest);
    const counts = (await client.query(`select (select count(*) from public.estimate_definition_version where release_id=$1)::integer definitions,(select count(*) from public.estimate_parameter_definition p join public.estimate_definition_version v on v.id=p.definition_version_id where v.release_id=$1)::integer parameters,(select count(*) from public.estimate_formula_graph f join public.estimate_definition_version v on v.id=f.definition_version_id where v.release_id=$1)::integer formulas,(select count(*) from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id where v.release_id=$1)::integer resources,(select count(*) from public.estimate_professional_passport p where p.release_id=$1)::integer hvac_passports,(select count(*) from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id left join public.estimate_work_normative_binding b on b.resource_spec_id=s.id where v.release_id=$1 and b.resource_spec_id is null)::integer missing_norms,(select count(*) from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id left join public.estimate_resource_price_route_binding b on b.resource_spec_id=s.id where v.release_id=$1 and b.resource_spec_id is null)::integer missing_prices`, [manifest.releaseId])).rows[0];
    if (Number(counts.definitions) !== EXPECTED.works || Number(counts.parameters) !== EXPECTED.parameters || Number(counts.formulas) !== EXPECTED.formulas || Number(counts.resources) !== EXPECTED.resources || Number(counts.hvac_passports) !== EXPECTED.hvacDefinitions || Number(counts.missing_norms) !== 0 || Number(counts.missing_prices) !== 0) throw new Error(`HVAC_DATABASE_IMPORT_COUNT_RED:${JSON.stringify(counts)}`);
    const namespaces = (await client.query(`select count(*) filter(where w.denominator_eligible)::integer global_count,count(*) filter(where not w.denominator_eligible)::integer external_count,count(*) filter(where w.domain='hvac_heat_supply')::integer hvac_count from public.estimate_definition_version v join public.estimate_work_identity w on w.catalog_id=v.catalog_id where v.release_id=$1`, [manifest.releaseId])).rows[0];
    if (Number(namespaces.global_count) !== EXPECTED.globalWorks || Number(namespaces.external_count) !== EXPECTED.externalReferences || Number(namespaces.hvac_count) !== EXPECTED.hvacDefinitions) throw new Error(`HVAC_DATABASE_NAMESPACE_RED:${JSON.stringify(namespaces)}`);
    await client.query("update public.estimate_definition_release set status='prepared',sealed_at=now() where id=$1 and status='draft'", [manifest.releaseId]);
    await client.query(`insert into public.estimate_migration_import(import_key,release_id,domain,package_sha256,work_count,external_count,resource_row_count,status,source_lineage,imported_at) values($1,$2,'hvac_heat_supply',$3,$4,$5,$6,'imported',$7::jsonb,now())`, [manifest.releaseKey, manifest.releaseId, manifest.manifestSha256, EXPECTED.hvacDefinitions, EXPECTED.hvacExternal, EXPECTED.hvacResources, JSON.stringify({ parentRelease: manifest.parentRelease, sourcePackageSha256: manifest.sourcePackageSha256, hvacGlobalIdSetSha256: manifest.hvacDelta.globalIdSetSha256 })]);
    await client.query(`insert into public.estimate_program_event(event_kind,event_key,denominator_delta,queue_delta,payload) values('migration',$1,0,0,$2::jsonb)`, [`${manifest.releaseKey}:prepared-import`, JSON.stringify({ releaseId: manifest.releaseId, parentReleaseId: manifest.parentRelease.releaseId, hvacDefinitions: EXPECTED.hvacDefinitions, globalHvacDefinitions: EXPECTED.hvacGlobal, externalHvacDefinitions: EXPECTED.hvacExternal, queueMutation: 0, productionDeployed: false })]);
    await assertProgramState(client);
    await client.query("commit");
    return { mode: "import", releaseId: manifest.releaseId, releaseStatus: "prepared", counts, namespaces };
  } catch (error) { await client.query("rollback"); throw error; }
}

async function main(): Promise<void> {
  const packageRoot = resolve(argument("package", join(RUNTIME, "release-a")));
  const manifest = await verifyPackage(packageRoot);
  if (flag("dry-run")) { process.stdout.write(`${JSON.stringify({ mode: "dry_run", releaseId: manifest.releaseId, manifestSha256: manifest.manifestSha256 })}\n`); return; }
  const config = databaseConfig();
  const client = new Client(config);
  await client.connect();
  try {
    const result = await importPackage(client, packageRoot, manifest);
    const database = decodeURIComponent(new URL(config.connectionString as string).pathname.replace(/^\//, ""));
    const report = { schemaVersion: "batch007-hvac-r4-a2-import-report.v1", database, packageRoot, releaseId: manifest.releaseId, manifestSha256: manifest.manifestSha256, sourcePackageSha256: manifest.sourcePackageSha256, sourceFingerprintSha256: manifest.sourceGit.worktreeSourceFingerprintSha256, result, queueMutation: 0, productionDeployed: false, batch008Started: false, status: ["import", "replay"].includes(result.mode) ? "GREEN" : "RED" };
    const output = resolve(argument("evidence-output", join(EVIDENCE, "08-database", `IMPORT_${database}.json`)));
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } finally { await client.end(); }
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`); process.exitCode = 1; });
