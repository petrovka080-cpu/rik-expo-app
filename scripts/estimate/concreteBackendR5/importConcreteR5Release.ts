import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join, resolve } from "node:path";

import { Client, type ClientConfig } from "pg";

type Json = Record<string, any>;

const ROOT = resolve(__dirname, "../../..");
const RUNTIME = join(ROOT, ".release-runtime", "batch008-concrete-r5");
const EVIDENCE = join(RUNTIME, "evidence");
const EXPECTED = Object.freeze({ works: 4_272, globalWorks: 3_755, externalReferences: 517, parameters: 840_667, formulas: 1_157_018, resources: 1_157_018, concreteDefinitions: 1_218, concreteGlobal: 830, concreteExternal: 388, concreteParameters: 389_314, concreteFormulas: 470_016, concreteResources: 470_016 });
const PREDECESSOR_RELEASE_ID = "ed35b18b-8fc6-5c7f-b1c8-aeeb07b6ef33";
const IMPORTER = "batch008-concrete-r5-importer.v1";

function argument(name: string, fallback = ""): string {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}
function flag(name: string): boolean { return process.argv.includes(`--${name}`); }
function stable(value: any): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).filter((key) => value[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
}
function sha(value: any): string { return createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : stable(value)).digest("hex"); }

async function fileProof(path: string): Promise<{ rows: number; bytes: number; sha256: string }> {
  const digest = createHash("sha256");
  let rows = 0;
  let bytes = 0;
  for await (const chunk of createReadStream(path)) { const data = chunk as Buffer; digest.update(data); bytes += data.length; for (const byte of data) if (byte === 10) rows += 1; }
  return { rows, bytes, sha256: digest.digest("hex") };
}

async function verifyPackage(packageRoot: string): Promise<Json> {
  const path = join(packageRoot, "manifest.json");
  if (!existsSync(path)) throw new Error(`CONCRETE_MANIFEST_MISSING:${path}`);
  const manifest = JSON.parse(readFileSync(path, "utf8")) as Json;
  const { manifestSha256, ...withoutHash } = manifest;
  if (manifest.schemaVersion !== "batch008-concrete-r5-release.v1" || manifest.definitionSchemaVersion !== 5 || sha(stable(withoutHash)) !== manifestSha256) throw new Error("CONCRETE_MANIFEST_HASH_RED");
  if (manifest.parentRelease.releaseId !== PREDECESSOR_RELEASE_ID || manifest.actual.works !== EXPECTED.works || manifest.actual.globalWorks !== EXPECTED.globalWorks || manifest.actual.externalReferences !== EXPECTED.externalReferences || manifest.actual.parameters !== EXPECTED.parameters || manifest.actual.formulas !== EXPECTED.formulas || manifest.actual.resources !== EXPECTED.resources
    || manifest.concreteDelta.definitions !== EXPECTED.concreteDefinitions || manifest.concreteDelta.global !== EXPECTED.concreteGlobal || manifest.concreteDelta.external !== EXPECTED.concreteExternal || manifest.concreteDelta.parameters !== EXPECTED.concreteParameters || manifest.concreteDelta.formulas !== EXPECTED.concreteFormulas || manifest.concreteDelta.resources !== EXPECTED.concreteResources) throw new Error("CONCRETE_MANIFEST_CARDINALITY_RED");
  for (const file of manifest.files as Json[]) {
    const proof = await fileProof(join(packageRoot, file.file));
    if (proof.rows !== file.rows || proof.bytes !== file.bytes || proof.sha256 !== file.sha256) throw new Error(`CONCRETE_PACKAGE_FILE_RED:${file.file}`);
  }
  return manifest;
}

function databaseConfig(): ClientConfig {
  const connectionString = argument("database-url", process.env.BATCH008_DATABASE_URL ?? "");
  if (!connectionString) throw new Error("BATCH008_DATABASE_URL_REQUIRED");
  const url = new URL(connectionString);
  if (!["127.0.0.1", "localhost", "::1"].includes(url.hostname) || Number(url.port || 5432) !== 55432) throw new Error(`CONCRETE_PRODUCTION_HOST_FORBIDDEN:${url.hostname}:${url.port}`);
  const database = decodeURIComponent(url.pathname.replace(/^\//u, ""));
  const expectedDatabase = argument("expected-database");
  if (expectedDatabase && database !== expectedDatabase) throw new Error(`CONCRETE_EXACT_DATABASE_RED:${database}:${expectedDatabase}`);
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
  const release = (await client.query(`select id::text,status,parent_release_id::text,sealed_at,activated_at from public.estimate_definition_release where status='active'`)).rows;
  if (release.length !== 1 || release[0].id !== PREDECESSOR_RELEASE_ID || release[0].status !== "active" || !release[0].sealed_at || !release[0].activated_at) throw new Error(`CONCRETE_PREDECESSOR_ACTIVE_RED:${JSON.stringify(release)}`);
  const row = (await client.query(`select denominator_total,admitted_global_count,queue_remaining,external_reference_count,batch007_selected,batch007_execution_started,hvac_domain_complete,hvac_domain_remaining,batch008_selected,batch008_execution_started,concrete_domain_complete,concrete_domain_remaining,all_normative_work_gaps_disposed,missing_required_works,batch009_selected,batch009_execution_started from public.estimate_program_control_state where singleton=true`)).rows[0];
  if (!row || Number(row.denominator_total) !== 11_610 || Number(row.admitted_global_count) !== 2_925 || Number(row.queue_remaining) !== 8_685 || Number(row.external_reference_count) !== 8
    || row.batch007_selected !== true || row.batch007_execution_started !== true || row.hvac_domain_complete !== true || Number(row.hvac_domain_remaining) !== 0
    || row.batch008_selected !== true || row.batch008_execution_started !== true || row.concrete_domain_complete !== false || Number(row.concrete_domain_remaining) !== 830
    || row.all_normative_work_gaps_disposed !== false || Number(row.missing_required_works) !== 0 || row.batch009_selected !== false || row.batch009_execution_started !== false) throw new Error(`CONCRETE_PROGRAM_STATE_RED:${JSON.stringify(row ?? null)}`);
}

async function insertWorks(client: Client, path: string, releaseId: string): Promise<void> {
  for await (const batch of batches(path, 400)) {
    for (const work of batch) work.definitionSha256 = sha({ passport: work.passport, applicability: work.applicability, sourceMetadata: work.sourceMetadata });
    await client.query(`with input as (select * from jsonb_to_recordset($1::jsonb) as x("catalogId" text,namespace text,domain text,"sourceIdentity" text,"workKey" text,"titleRu" text,"denominatorEligible" boolean,"definitionVersion" integer,passport jsonb,applicability jsonb,"sourceMetadata" jsonb,"definitionSha256" text)), identities as (insert into public.estimate_work_identity(catalog_id,namespace,domain,source_identity,work_key,title_ru,denominator_eligible) select "catalogId",namespace,domain,"sourceIdentity","workKey","titleRu","denominatorEligible" from input on conflict(catalog_id) do nothing returning catalog_id) insert into public.estimate_definition_version(release_id,catalog_id,definition_version,passport,applicability,definition_sha256,source_metadata) select $2::uuid,"catalogId","definitionVersion",passport,applicability,"definitionSha256","sourceMetadata" from input`, [JSON.stringify(batch), releaseId]);
    const mismatch = await client.query(`select count(*)::integer count from jsonb_to_recordset($1::jsonb) as x("catalogId" text,namespace text,domain text,"sourceIdentity" text,"workKey" text,"titleRu" text,"denominatorEligible" boolean) join public.estimate_work_identity w on w.catalog_id=x."catalogId" where (w.namespace,w.domain,w.source_identity,w.work_key,w.title_ru,w.denominator_eligible) is distinct from (x.namespace,x.domain,x."sourceIdentity",x."workKey",x."titleRu",x."denominatorEligible")`, [JSON.stringify(batch)]);
    if (Number(mismatch.rows[0].count) !== 0) throw new Error("CONCRETE_WORK_IDENTITY_CONFLICT");
  }
}

async function insertParameters(client: Client, path: string, releaseId: string): Promise<void> {
  for await (const batch of batches(path, 1_200)) await client.query(`insert into public.estimate_parameter_definition(definition_version_id,parameter_id,ordinal,value_type,unit_id,title_ru,required,default_value,constraints_json) select v.id,x."parameterId",x.ordinal,x."valueType",x."unitId",x."titleRu",x.required,x."defaultValue",x.constraints from jsonb_to_recordset($1::jsonb) as x("catalogId" text,"parameterId" text,ordinal integer,"valueType" text,"unitId" text,"titleRu" text,required boolean,"defaultValue" jsonb,constraints jsonb) join public.estimate_definition_version v on v.release_id=$2::uuid and v.catalog_id=x."catalogId"`, [JSON.stringify(batch), releaseId]);
}

async function insertFormulas(client: Client, path: string, releaseId: string): Promise<void> {
  for await (const batch of batches(path, 800)) {
    for (const formula of batch) formula.astSha256 = sha(formula.ast);
    await client.query(`insert into public.estimate_formula_graph(definition_version_id,formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256) select v.id,x."formulaId",x."outputUnitId",x."expressionSource",x.ast,x."inputParameterIds",x."astSha256" from jsonb_to_recordset($1::jsonb) as x("catalogId" text,"formulaId" text,"outputUnitId" text,"expressionSource" text,ast jsonb,"inputParameterIds" text[],"astSha256" text) join public.estimate_definition_version v on v.release_id=$2::uuid and v.catalog_id=x."catalogId"`, [JSON.stringify(batch), releaseId]);
  }
}

async function insertResources(client: Client, path: string, releaseId: string): Promise<void> {
  for await (const batch of batches(path, 400)) {
    for (const resource of batch) resource.rowSha256 = sha(resource);
    await client.query(`insert into public.estimate_resource_spec(definition_version_id,row_id,ordinal,section,category,title_ru,row_type,unit_id,formula_id,inclusion_ast,resource_graph,semantic_owner,cost_owner_id,procurement_eligible,source_metadata,row_sha256) select v.id,x."rowId",x.ordinal,x.section,x.category,x."titleRu",x."rowType",x."unitId",x."formulaId",x."inclusionAst",x."resourceGraph",x."semanticOwner",x."costOwnerId",x."procurementEligible",x."sourceMetadata",x."rowSha256" from jsonb_to_recordset($1::jsonb) as x("catalogId" text,"rowId" text,ordinal integer,section text,category text,"titleRu" text,"rowType" text,"unitId" text,"formulaId" text,"inclusionAst" jsonb,"resourceGraph" jsonb,"semanticOwner" text,"costOwnerId" text,"procurementEligible" boolean,"sourceMetadata" jsonb,"rowSha256" text) join public.estimate_definition_version v on v.release_id=$2::uuid and v.catalog_id=x."catalogId"`, [JSON.stringify(batch), releaseId]);
  }
}

async function normalize(client: Client, releaseId: string, manifest: Json): Promise<void> {
  for (const source of manifest.officialSources) await client.query(`insert into public.estimate_normative_source(source_key,title_ru,authority,official_url,artifact_sha256,effective_from,metadata) values($1,$2,$3,$4,$5,$6::date,$7::jsonb) on conflict(source_key) do update set title_ru=excluded.title_ru,authority=excluded.authority,official_url=excluded.official_url,artifact_sha256=excluded.artifact_sha256,effective_from=excluded.effective_from,metadata=excluded.metadata`, [source.sourceId, source.titleRu, source.authority, source.officialUrl, source.artifactSha256, source.effectiveFrom, JSON.stringify({ documentCode: source.documentCode, status: source.status, applicability: source.applicability })]);
  await client.query(`insert into public.estimate_professional_passport(definition_version_id,release_id,catalog_id,passport_version,passport,parameter_cardinality,resource_cardinality,passport_sha256) select v.id,v.release_id,v.catalog_id,v.passport->>'passportVersion',v.passport,(select count(*) from public.estimate_parameter_definition p where p.definition_version_id=v.id)::integer,(select count(*) from public.estimate_resource_spec s where s.definition_version_id=v.id)::integer,encode(extensions.digest(convert_to(v.passport::text,'UTF8'),'sha256'),'hex') from public.estimate_definition_version v join public.estimate_work_identity w on w.catalog_id=v.catalog_id where v.release_id=$1::uuid and w.domain='concrete'`, [releaseId]);
  await client.query(`insert into public.estimate_normative_locator(source_id,locator_key,locator) select distinct on(ns.id,locator_key) ns.id,locator_key,jsonb_build_object('sourceId',s.source_metadata->'normative'->>'sourceId','exactLocator',s.source_metadata->'normative'->>'exactLocator','pdfPage',s.source_metadata->'normative'->'pdfPage','rateCode',s.source_metadata->'normative'->'rateCode','officialPdfSha256',s.source_metadata->'normative'->>'officialPdfSha256') from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id join public.estimate_work_identity w on w.catalog_id=v.catalog_id and w.domain='concrete' join public.estimate_normative_source ns on ns.source_key=s.source_metadata->'normative'->>'sourceId' cross join lateral(select md5(ns.source_key||':'||(s.source_metadata->'normative'->>'exactLocator')) locator_key) k where v.release_id=$1::uuid order by ns.id,locator_key,s.id on conflict(source_id,locator_key) do nothing`, [releaseId]);
  await client.query(`insert into public.estimate_work_normative_binding(definition_version_id,resource_spec_id,locator_id,applicability) select s.definition_version_id,s.id,nl.id,jsonb_build_object('exactLocator',s.source_metadata->'normative'->>'exactLocator') from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id join public.estimate_work_identity w on w.catalog_id=v.catalog_id and w.domain='concrete' join public.estimate_normative_source ns on ns.source_key=s.source_metadata->'normative'->>'sourceId' join public.estimate_normative_locator nl on nl.source_id=ns.id and nl.locator_key=md5(ns.source_key||':'||(s.source_metadata->'normative'->>'exactLocator')) where v.release_id=$1::uuid on conflict do nothing`, [releaseId]);
  await client.query(`insert into public.estimate_work_normative_binding(definition_version_id,resource_spec_id,locator_id,applicability) select nv.id,ns.id,ob.locator_id,ob.applicability from public.estimate_definition_version nv join public.estimate_work_identity w on w.catalog_id=nv.catalog_id and w.domain<>'concrete' join public.estimate_definition_version ov on ov.release_id=$2::uuid and ov.catalog_id=nv.catalog_id join public.estimate_resource_spec ns on ns.definition_version_id=nv.id join public.estimate_resource_spec os on os.definition_version_id=ov.id and os.row_id=ns.row_id join public.estimate_work_normative_binding ob on ob.definition_version_id=ov.id and ob.resource_spec_id=os.id where nv.release_id=$1::uuid on conflict do nothing`, [releaseId, manifest.parentRelease.releaseId]);
  await client.query(`insert into public.estimate_price_route(route_key,currency_code,priority,source_kind,metadata) select 'release-resource:'||v.release_id::text||':'||s.row_id,'KGS',100,case upper(coalesce(s.source_metadata->'price'->>'route','')) when 'OFFICIAL_MATERIAL_BOOK' then 'catalog' when 'OFFICIAL_MACHINE_RATE' then 'normative' when 'OFFICIAL_LABOR_RATE' then 'normative' when 'OFFICIAL_RESOURCE_RATE' then 'normative' when 'CHILD_OWNER_ESTIMATE' then 'fallback' else 'manual' end,jsonb_build_object('price',s.source_metadata->'price','releaseId',v.release_id) from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id join public.estimate_work_identity w on w.catalog_id=v.catalog_id and w.domain='concrete' where v.release_id=$1::uuid on conflict(route_key) do nothing`, [releaseId]);
  await client.query(`insert into public.estimate_resource_price_route_binding(resource_spec_id,route_id,price_key,priority) select s.id,r.id,s.row_id,r.priority from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id join public.estimate_work_identity w on w.catalog_id=v.catalog_id and w.domain='concrete' join public.estimate_price_route r on r.route_key='release-resource:'||v.release_id::text||':'||s.row_id where v.release_id=$1::uuid on conflict do nothing`, [releaseId]);
  await client.query(`insert into public.estimate_resource_price_route_binding(resource_spec_id,route_id,price_key,priority) select ns.id,ob.route_id,ob.price_key,ob.priority from public.estimate_definition_version nv join public.estimate_work_identity w on w.catalog_id=nv.catalog_id and w.domain<>'concrete' join public.estimate_definition_version ov on ov.release_id=$2::uuid and ov.catalog_id=nv.catalog_id join public.estimate_resource_spec ns on ns.definition_version_id=nv.id join public.estimate_resource_spec os on os.definition_version_id=ov.id and os.row_id=ns.row_id join public.estimate_resource_price_route_binding ob on ob.resource_spec_id=os.id where nv.release_id=$1::uuid on conflict do nothing`, [releaseId, manifest.parentRelease.releaseId]);
}

async function importPackage(client: Client, packageRoot: string, manifest: Json): Promise<Json> {
  await client.query("begin isolation level serializable");
  try {
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [manifest.releaseKey]);
    await assertProgramState(client);
    const existing = await client.query(`select mi.status,mi.package_sha256,r.id::text release_id,r.status release_status from public.estimate_migration_import mi join public.estimate_definition_release r on r.id=mi.release_id where mi.import_key=$1`, [manifest.releaseKey]);
    if (existing.rowCount) {
      const row = existing.rows[0];
      if (row.package_sha256 !== manifest.manifestSha256 || row.status !== "imported" || !["prepared", "active"].includes(row.release_status)) throw new Error("CONCRETE_IMPORT_KEY_CONFLICT");
      await client.query("commit");
      return { mode: "replay", releaseId: row.release_id, releaseStatus: row.release_status };
    }
    const parent = (await client.query(`select id::text,release_key,source_manifest_sha256,source_package_sha256,status,sealed_at,activated_at from public.estimate_definition_release where id=$1 for share`, [manifest.parentRelease.releaseId])).rows[0];
    if (!parent || parent.release_key !== manifest.parentRelease.releaseKey || parent.source_manifest_sha256 !== manifest.parentRelease.sourceManifestSha256 || parent.source_package_sha256 !== manifest.parentRelease.sourcePackageSha256 || parent.status !== "active" || !parent.sealed_at || !parent.activated_at) throw new Error(`CONCRETE_PREDECESSOR_RELEASE_RED:${JSON.stringify(parent ?? null)}`);
    await client.query(`insert into public.estimate_definition_release(id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,source_package_sha256,parent_release_id,definition_count,parameter_count,formula_count,resource_row_count,metadata) values($1,$2,5,'draft',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)`, [manifest.releaseId, manifest.releaseKey, manifest.sourceGit.head, manifest.sourceGit.tree, manifest.manifestSha256, manifest.sourcePackageSha256, manifest.parentRelease.releaseId, manifest.actual.works, manifest.actual.parameters, manifest.actual.formulas, manifest.actual.resources, JSON.stringify({ importerVersion: IMPORTER, concreteDelta: manifest.concreteDelta, normativeDiscovery: manifest.normativeDiscovery, contentIdentity: manifest.contentIdentity, sourceFingerprintSha256: manifest.sourceGit.worktreeSourceFingerprintSha256 })]);
    process.stderr.write("[concrete-import] works\n"); await insertWorks(client, join(packageRoot, "works.jsonl"), manifest.releaseId);
    process.stderr.write("[concrete-import] parameters\n"); await insertParameters(client, join(packageRoot, "parameters.jsonl"), manifest.releaseId);
    process.stderr.write("[concrete-import] formulas\n"); await insertFormulas(client, join(packageRoot, "formulas.jsonl"), manifest.releaseId);
    process.stderr.write("[concrete-import] resources\n"); await insertResources(client, join(packageRoot, "resources.jsonl"), manifest.releaseId);
    process.stderr.write("[concrete-import] normalized bindings\n"); await normalize(client, manifest.releaseId, manifest);
    const counts = (await client.query(`select (select count(*) from public.estimate_definition_version where release_id=$1)::integer definitions,(select count(*) from public.estimate_parameter_definition p join public.estimate_definition_version v on v.id=p.definition_version_id where v.release_id=$1)::integer parameters,(select count(*) from public.estimate_formula_graph f join public.estimate_definition_version v on v.id=f.definition_version_id where v.release_id=$1)::integer formulas,(select count(*) from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id where v.release_id=$1)::integer resources,(select count(*) from public.estimate_professional_passport p where p.release_id=$1)::integer concrete_passports,(select count(*) from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id left join public.estimate_work_normative_binding b on b.resource_spec_id=s.id where v.release_id=$1 and b.resource_spec_id is null)::integer missing_norms,(select count(*) from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id left join public.estimate_resource_price_route_binding b on b.resource_spec_id=s.id where v.release_id=$1 and b.resource_spec_id is null)::integer missing_prices`, [manifest.releaseId])).rows[0];
    if (Number(counts.definitions) !== EXPECTED.works || Number(counts.parameters) !== EXPECTED.parameters || Number(counts.formulas) !== EXPECTED.formulas || Number(counts.resources) !== EXPECTED.resources || Number(counts.concrete_passports) !== EXPECTED.concreteDefinitions || Number(counts.missing_norms) !== 0 || Number(counts.missing_prices) !== 0) throw new Error(`CONCRETE_DATABASE_IMPORT_COUNT_RED:${JSON.stringify(counts)}`);
    const namespaces = (await client.query(`select count(*) filter(where w.denominator_eligible)::integer global_count,count(*) filter(where not w.denominator_eligible)::integer external_count,count(*) filter(where w.domain='concrete')::integer concrete_count from public.estimate_definition_version v join public.estimate_work_identity w on w.catalog_id=v.catalog_id where v.release_id=$1`, [manifest.releaseId])).rows[0];
    if (Number(namespaces.global_count) !== EXPECTED.globalWorks || Number(namespaces.external_count) !== EXPECTED.externalReferences || Number(namespaces.concrete_count) !== EXPECTED.concreteDefinitions) throw new Error(`CONCRETE_DATABASE_NAMESPACE_RED:${JSON.stringify(namespaces)}`);
    await client.query("update public.estimate_definition_release set status='prepared',sealed_at=now() where id=$1 and status='draft'", [manifest.releaseId]);
    await client.query(`insert into public.estimate_migration_import(import_key,release_id,domain,package_sha256,work_count,external_count,resource_row_count,status,source_lineage,imported_at) values($1,$2,'concrete',$3,$4,$5,$6,'imported',$7::jsonb,now())`, [manifest.releaseKey, manifest.releaseId, manifest.manifestSha256, EXPECTED.concreteDefinitions, EXPECTED.concreteExternal, EXPECTED.concreteResources, JSON.stringify({ parentRelease: manifest.parentRelease, sourcePackageSha256: manifest.sourcePackageSha256, concreteGlobalIdSetSha256: manifest.concreteDelta.globalIdSetSha256 })]);
    await client.query(`insert into public.estimate_program_event(event_kind,event_key,denominator_delta,queue_delta,payload) values('migration',$1,0,0,$2::jsonb)`, [`${manifest.releaseKey}:prepared-import`, JSON.stringify({ releaseId: manifest.releaseId, parentReleaseId: manifest.parentRelease.releaseId, concreteDefinitions: EXPECTED.concreteDefinitions, globalConcreteDefinitions: EXPECTED.concreteGlobal, externalConcreteDefinitions: EXPECTED.concreteExternal, queueMutation: 0, productionDeployed: false })]);
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
    const database = decodeURIComponent(new URL(config.connectionString as string).pathname.replace(/^\//u, ""));
    const report = { schemaVersion: "batch008-concrete-r5-import-report.v1", database, packageRoot, releaseId: manifest.releaseId, manifestSha256: manifest.manifestSha256, sourcePackageSha256: manifest.sourcePackageSha256, sourceFingerprintSha256: manifest.sourceGit.worktreeSourceFingerprintSha256, result, queueMutation: 0, productionDeployed: false, batch009Started: false, status: ["import", "replay"].includes(result.mode) ? "GREEN" : "RED" };
    const output = resolve(argument("evidence-output", join(EVIDENCE, "08-database", `IMPORT_${database}.json`)));
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } finally { await client.end(); }
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`); process.exitCode = 1; });
