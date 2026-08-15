import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";

import { Client, type ClientConfig } from "pg";

const ROOT = resolve(__dirname, "../../..");
const DEFAULT_PACKAGE = join(ROOT, ".release-runtime", "batch006-water-backend-r3", "02-backend-release");
const IMPORTER_VERSION = "batch006-water-backend-importer.r5";

type JsonRecord = Record<string, unknown>;
type FileProof = { file: string; rows: number; bytes: number; sha256: string };
type Manifest = {
  schemaVersion: "batch006-water-backend-release.r5";
  releaseId: string;
  releaseKey: string;
  definitionSchemaVersion: 5;
  parentRelease: { releaseId: string; releaseKey: string; sourceManifestSha256: string; sourcePackageSha256: string };
  actual: {
    works: number; globalWorks: number; externalReferences: number; parameters: number; formulas: number; resources: number;
    byDomain: Record<string, { works: number; resources: number }>;
  };
  waterDelta: {
    definitions: number; parameters: number; formulas: number; resources: number;
    admittedCatalogIdSetSha256: string; paddingRows: number; frontendDefinitionOwner: number;
  };
  programControl: {
    denominator: number; admittedBefore: number; remainingBefore: number; newlyAdmittedWater: number;
    admittedAfter: number; remainingAfter: number; externalBeforeAfter: number; queueMutationDuringImport: number;
  };
  sourceGit: { head: string; tree: string; worktreeSourceFingerprintSha256: string };
  officialSources: Array<{
    sourceId: string; documentCode: string; titleRu: string; authority: string; officialUrl: string;
    artifactSha256: string; effectiveFrom: string; status: string; applicability: string;
  }>;
  files: FileProof[];
  contentIdentity: string;
  sourcePackageSha256: string;
  manifestSha256: string;
};

function argument(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as JsonRecord;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : stableJson(value)).digest("hex");
}

async function fileProof(path: string, file: string): Promise<FileProof> {
  const digest = createHash("sha256");
  let rows = 0;
  let bytes = 0;
  for await (const chunk of createReadStream(path)) {
    const buffer = chunk as Buffer;
    digest.update(buffer);
    bytes += buffer.byteLength;
    for (const byte of buffer) if (byte === 10) rows += 1;
  }
  return { file, rows, bytes, sha256: digest.digest("hex") };
}

async function verifyPackage(packageRoot: string): Promise<Manifest> {
  const manifestPath = join(packageRoot, "manifest.json");
  if (!existsSync(manifestPath)) throw new Error(`WATER_MANIFEST_NOT_FOUND:${manifestPath}`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
  const { manifestSha256, ...withoutHash } = manifest;
  if (manifest.schemaVersion !== "batch006-water-backend-release.r5" || manifest.definitionSchemaVersion !== 5
    || sha256(withoutHash) !== manifestSha256) throw new Error("WATER_MANIFEST_IDENTITY_RED");
  if (
    manifest.actual.works !== 2_013 || manifest.actual.globalWorks !== 2_005 || manifest.actual.externalReferences !== 8 ||
    manifest.waterDelta.definitions !== 845 || manifest.waterDelta.parameters < 1 ||
    manifest.waterDelta.formulas < 1 || manifest.waterDelta.formulas !== manifest.waterDelta.resources ||
    manifest.actual.parameters !== 138_425 + manifest.waterDelta.parameters ||
    manifest.actual.formulas !== 101_416 + manifest.waterDelta.formulas ||
    manifest.actual.resources !== 101_416 + manifest.waterDelta.resources ||
    manifest.waterDelta.paddingRows !== 0 || manifest.waterDelta.frontendDefinitionOwner !== 0 ||
    manifest.programControl.denominator !== 11_610 || manifest.programControl.admittedBefore !== 1_160 ||
    manifest.programControl.remainingBefore !== 10_450 || manifest.programControl.newlyAdmittedWater !== 845 ||
    manifest.programControl.admittedAfter !== 2_005 || manifest.programControl.remainingAfter !== 9_605 ||
    manifest.programControl.externalBeforeAfter !== 8 || manifest.programControl.queueMutationDuringImport !== 0
  ) throw new Error("WATER_MANIFEST_EXACT_CARDINALITY_RED");
  for (const expected of manifest.files) {
    const path = join(packageRoot, expected.file);
    if (!existsSync(path) || statSync(path).size !== expected.bytes) throw new Error(`WATER_PACKAGE_FILE_SIZE_RED:${expected.file}`);
    const actual = await fileProof(path, expected.file);
    if (stableJson(actual) !== stableJson(expected)) throw new Error(`WATER_PACKAGE_FILE_PROOF_RED:${expected.file}`);
  }
  const expectedPackageHash = sha256({
    schemaVersion: manifest.schemaVersion,
    releaseId: manifest.releaseId,
    releaseKey: manifest.releaseKey,
    parentReleaseId: manifest.parentRelease.releaseId,
    files: manifest.files,
    sourceFingerprintSha256: manifest.sourceGit.worktreeSourceFingerprintSha256,
    contentIdentity: manifest.contentIdentity,
  });
  if (expectedPackageHash !== manifest.sourcePackageSha256) throw new Error("WATER_SOURCE_PACKAGE_SHA256_RED");
  return manifest;
}

function databaseConfig(): ClientConfig {
  const connectionString = argument("database-url", process.env.BATCH006_DATABASE_URL ?? "");
  if (!connectionString) throw new Error("BATCH006_DATABASE_URL_REQUIRED");
  const url = new URL(connectionString);
  if (!new Set(["localhost", "127.0.0.1", "::1"]).has(url.hostname)) throw new Error("BATCH006_IMPORT_LOCAL_DISPOSABLE_DATABASE_REQUIRED");
  if (/prod/i.test(`${url.hostname}${url.pathname}`)) throw new Error("BATCH006_PRODUCTION_IMPORT_FORBIDDEN");
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const expected = process.env.BATCH006_EXPECTED_DATABASE_NAME;
  if (!expected || database !== expected || !/^batch006_water_r5_a1_[ab]$/.test(database)) {
    throw new Error(`BATCH006_EXACT_DISPOSABLE_DATABASE_REQUIRED:${database}:${expected ?? "MISSING"}`);
  }
  return { connectionString, application_name: IMPORTER_VERSION, statement_timeout: 300_000 };
}

async function *jsonLineBatches(path: string, batchSize: number): AsyncGenerator<JsonRecord[]> {
  const input = createInterface({ input: createReadStream(path, { encoding: "utf8" }), crlfDelay: Infinity });
  let batch: JsonRecord[] = [];
  for await (const raw of input) {
    if (!raw.trim()) continue;
    batch.push(JSON.parse(raw) as JsonRecord);
    if (batch.length >= batchSize) {
      yield batch;
      batch = [];
    }
  }
  if (batch.length) yield batch;
}

async function assertProgramControl(client: Client, manifest: Manifest): Promise<void> {
  const result = await client.query(`
    select denominator_total, admitted_global_count, queue_remaining, external_reference_count,
           batch006_started, water_domain_complete, water_domain_remaining,
           global_content_complete, batch007_selected, batch007_execution_started,
           program_state_version, state_sha256
    from public.estimate_program_control_state where singleton = true
  `);
  const state = result.rows[0];
  if (!state || Number(state.denominator_total) !== manifest.programControl.denominator
    || Number(state.admitted_global_count) !== manifest.programControl.admittedBefore
    || Number(state.queue_remaining) !== manifest.programControl.remainingBefore
    || Number(state.external_reference_count) !== manifest.programControl.externalBeforeAfter
    || state.batch006_started !== false || state.water_domain_complete !== false
    || Number(state.water_domain_remaining) !== manifest.waterDelta.definitions
    || state.global_content_complete !== false || state.batch007_selected !== false
    || state.batch007_execution_started !== false
    || !/^[0-9a-f]{64}$/.test(String(state.state_sha256))) {
    throw new Error(`WATER_PROGRAM_CONTROL_PRE_IMPORT_RED:${JSON.stringify(state ?? null)}`);
  }
}

async function insertWorks(client: Client, path: string, releaseId: string): Promise<void> {
  for await (const batch of jsonLineBatches(path, 250)) {
    for (const work of batch) {
      work.definitionSha256 = sha256({ passport: work.passport, applicability: work.applicability, sourceMetadata: work.sourceMetadata });
    }
    await client.query(`
      with input as (
        select * from jsonb_to_recordset($1::jsonb) as x(
          "catalogId" text, namespace text, domain text, "sourceIdentity" text, "workKey" text,
          "titleRu" text, "denominatorEligible" boolean, "definitionVersion" integer,
          passport jsonb, applicability jsonb, "sourceMetadata" jsonb, "definitionSha256" text
        )
      ), identities as (
        insert into public.estimate_work_identity (
          catalog_id, namespace, domain, source_identity, work_key, title_ru, denominator_eligible
        ) select "catalogId", namespace, domain, "sourceIdentity", "workKey", "titleRu", "denominatorEligible" from input
        on conflict (catalog_id) do nothing returning catalog_id
      )
      insert into public.estimate_definition_version (
        release_id, catalog_id, definition_version, passport, applicability, definition_sha256, source_metadata
      ) select $2::uuid, "catalogId", "definitionVersion", passport, applicability, "definitionSha256", "sourceMetadata" from input
    `, [JSON.stringify(batch), releaseId]);
    const mismatch = await client.query(`
      select count(*)::integer count
      from jsonb_to_recordset($1::jsonb) as x(
        "catalogId" text, namespace text, domain text, "sourceIdentity" text, "workKey" text,
        "titleRu" text, "denominatorEligible" boolean
      ) join public.estimate_work_identity w on w.catalog_id = x."catalogId"
      where (w.namespace,w.domain,w.source_identity,w.work_key,w.title_ru,w.denominator_eligible)
        is distinct from (x.namespace,x.domain,x."sourceIdentity",x."workKey",x."titleRu",x."denominatorEligible")
    `, [JSON.stringify(batch)]);
    if (Number(mismatch.rows[0].count) !== 0) throw new Error("WATER_IDENTITY_CONFLICT");
  }
}

async function insertParameters(client: Client, path: string, releaseId: string): Promise<void> {
  for await (const batch of jsonLineBatches(path, 750)) {
    await client.query(`
      insert into public.estimate_parameter_definition (
        definition_version_id, parameter_id, ordinal, value_type, unit_id, title_ru,
        required, default_value, constraints_json
      ) select v.id, x."parameterId", x.ordinal, x."valueType", x."unitId", x."titleRu",
        x.required, x."defaultValue", x.constraints
      from jsonb_to_recordset($1::jsonb) as x(
        "catalogId" text, "parameterId" text, ordinal integer, "valueType" text,
        "unitId" text, "titleRu" text, required boolean, "defaultValue" jsonb, constraints jsonb
      ) join public.estimate_definition_version v on v.release_id=$2::uuid and v.catalog_id=x."catalogId"
    `, [JSON.stringify(batch), releaseId]);
  }
}

async function insertFormulas(client: Client, path: string, releaseId: string): Promise<void> {
  for await (const batch of jsonLineBatches(path, 500)) {
    for (const formula of batch) formula.astSha256 = sha256(formula.ast);
    await client.query(`
      insert into public.estimate_formula_graph (
        definition_version_id, formula_id, output_unit_id, expression_source, ast, input_parameter_ids, ast_sha256
      ) select v.id, x."formulaId", x."outputUnitId", x."expressionSource", x.ast, x."inputParameterIds", x."astSha256"
      from jsonb_to_recordset($1::jsonb) as x(
        "catalogId" text, "formulaId" text, "outputUnitId" text, "expressionSource" text,
        ast jsonb, "inputParameterIds" text[], "astSha256" text
      ) join public.estimate_definition_version v on v.release_id=$2::uuid and v.catalog_id=x."catalogId"
    `, [JSON.stringify(batch), releaseId]);
  }
}

async function insertResources(client: Client, path: string, releaseId: string): Promise<void> {
  for await (const batch of jsonLineBatches(path, 150)) {
    for (const resource of batch) resource.rowSha256 = sha256(resource);
    await client.query(`
      insert into public.estimate_resource_spec (
        definition_version_id,row_id,ordinal,section,category,title_ru,row_type,unit_id,formula_id,
        inclusion_ast,resource_graph,semantic_owner,cost_owner_id,procurement_eligible,source_metadata,row_sha256
      ) select v.id,x."rowId",x.ordinal,x.section,x.category,x."titleRu",x."rowType",x."unitId",x."formulaId",
        x."inclusionAst",x."resourceGraph",x."semanticOwner",x."costOwnerId",x."procurementEligible",x."sourceMetadata",x."rowSha256"
      from jsonb_to_recordset($1::jsonb) as x(
        "catalogId" text,"rowId" text,ordinal integer,section text,category text,"titleRu" text,"rowType" text,
        "unitId" text,"formulaId" text,"inclusionAst" jsonb,"resourceGraph" jsonb,"semanticOwner" text,
        "costOwnerId" text,"procurementEligible" boolean,"sourceMetadata" jsonb,"rowSha256" text
      ) join public.estimate_definition_version v on v.release_id=$2::uuid and v.catalog_id=x."catalogId"
    `, [JSON.stringify(batch), releaseId]);
  }
}

async function normalizePassportsNormativesAndPrices(client: Client, releaseId: string, manifest: Manifest): Promise<void> {
  for (const source of manifest.officialSources) {
    await client.query(`
      insert into public.estimate_normative_source (
        source_key,title_ru,authority,official_url,artifact_sha256,effective_from,metadata
      ) values ($1,$2,$3,$4,$5,$6::date,$7::jsonb)
      on conflict (source_key) do update set
        title_ru=excluded.title_ru, authority=excluded.authority, official_url=excluded.official_url,
        artifact_sha256=excluded.artifact_sha256, effective_from=excluded.effective_from, metadata=excluded.metadata
    `, [source.sourceId, source.titleRu, source.authority, source.officialUrl, source.artifactSha256,
      source.effectiveFrom, JSON.stringify({ documentCode: source.documentCode, status: source.status, applicability: source.applicability })]);
  }
  await client.query(`
    insert into public.estimate_professional_passport (
      definition_version_id,release_id,catalog_id,passport_version,passport,
      parameter_cardinality,resource_cardinality,passport_sha256
    )
    select v.id,v.release_id,v.catalog_id,v.passport->>'passportVersion',v.passport,
      (select count(*) from public.estimate_parameter_definition p where p.definition_version_id=v.id)::integer,
      (select count(*) from public.estimate_resource_spec s where s.definition_version_id=v.id)::integer,
      encode(extensions.digest(convert_to(v.passport::text,'UTF8'),'sha256'),'hex')
    from public.estimate_definition_version v
    join public.estimate_work_identity w on w.catalog_id=v.catalog_id
    where v.release_id=$1::uuid and w.domain='water_supply_sewerage'
  `, [releaseId]);
  await client.query(`
    insert into public.estimate_normative_locator (source_id,locator_key,locator)
    select distinct on (ns.id,locator_key) ns.id,locator_key,trace
    from public.estimate_resource_spec s
    join public.estimate_definition_version v on v.id=s.definition_version_id
    cross join lateral jsonb_array_elements(coalesce(s.source_metadata->'normativeTrace','[]'::jsonb)) trace
    join public.estimate_normative_source ns on ns.source_key=trace->>'source_id'
    cross join lateral (select md5(ns.source_key||':'||trace::text) locator_key) k
    where v.release_id=$1::uuid
    order by ns.id,locator_key,s.id
    on conflict (source_id,locator_key) do nothing
  `, [releaseId]);
  await client.query(`
    insert into public.estimate_work_normative_binding (definition_version_id,resource_spec_id,locator_id,applicability)
    select distinct s.definition_version_id,s.id,nl.id,
      jsonb_build_object('text',coalesce(trace->'applicability','null'::jsonb))
    from public.estimate_resource_spec s
    join public.estimate_definition_version v on v.id=s.definition_version_id
    cross join lateral jsonb_array_elements(coalesce(s.source_metadata->'normativeTrace','[]'::jsonb)) trace
    join public.estimate_normative_source ns on ns.source_key=trace->>'source_id'
    join public.estimate_normative_locator nl on nl.source_id=ns.id and nl.locator_key=md5(ns.source_key||':'||trace::text)
    where v.release_id=$1::uuid on conflict do nothing
  `, [releaseId]);
  // Carried predecessor resources retain the exact already-admitted relational
  // locator binding. Matching is identity based; no trace-format reinterpretation
  // and no silent replacement by a water locator is allowed.
  await client.query(`
    insert into public.estimate_work_normative_binding (
      definition_version_id,resource_spec_id,locator_id,applicability
    )
    select nv.id,ns.id,ob.locator_id,ob.applicability
    from public.estimate_definition_version nv
    join public.estimate_work_identity w on w.catalog_id=nv.catalog_id and w.domain<>'water_supply_sewerage'
    join public.estimate_definition_version ov
      on ov.release_id=$2::uuid and ov.catalog_id=nv.catalog_id
    join public.estimate_resource_spec ns on ns.definition_version_id=nv.id
    join public.estimate_resource_spec os
      on os.definition_version_id=ov.id and os.row_id=ns.row_id
    join public.estimate_work_normative_binding ob
      on ob.definition_version_id=ov.id and ob.resource_spec_id=os.id
    where nv.release_id=$1::uuid
    on conflict do nothing
  `, [releaseId, manifest.parentRelease.releaseId]);
  await client.query(`
    insert into public.estimate_price_route (route_key,currency_code,priority,source_kind,metadata)
    select 'release-resource:'||v.release_id::text||':'||s.row_id,'KGS',100,
      case when w.domain='water_supply_sewerage' then 'normative' else 'manual' end,
      jsonb_build_object('costOwnerId',s.cost_owner_id,'sourceRoute',s.source_metadata->'priceRoute','releaseId',v.release_id)
    from public.estimate_resource_spec s
    join public.estimate_definition_version v on v.id=s.definition_version_id
    join public.estimate_work_identity w on w.catalog_id=v.catalog_id
    where v.release_id=$1::uuid and s.cost_owner_id is not null
    on conflict (route_key) do nothing
  `, [releaseId]);
  await client.query(`
    insert into public.estimate_resource_price_route_binding (resource_spec_id,route_id,price_key,priority)
    select s.id,r.id,s.cost_owner_id,r.priority
    from public.estimate_resource_spec s
    join public.estimate_definition_version v on v.id=s.definition_version_id
    join public.estimate_price_route r on r.route_key='release-resource:'||v.release_id::text||':'||s.row_id
    where v.release_id=$1::uuid and s.cost_owner_id is not null
    on conflict do nothing
  `, [releaseId]);
}

async function importPackage(client: Client, packageRoot: string, manifest: Manifest): Promise<JsonRecord> {
  await client.query("begin isolation level serializable");
  try {
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [manifest.releaseKey]);
    await assertProgramControl(client, manifest);
    const existing = await client.query(`
      select mi.status,mi.package_sha256,r.id release_id,r.status release_status
      from public.estimate_migration_import mi join public.estimate_definition_release r on r.id=mi.release_id
      where mi.import_key=$1
    `, [manifest.releaseKey]);
    if (existing.rowCount) {
      const row = existing.rows[0];
      if (row.package_sha256 !== manifest.manifestSha256 || row.status !== "imported"
        || !["prepared", "active"].includes(row.release_status)) throw new Error("WATER_IMPORT_KEY_CONFLICT");
      await client.query("commit");
      return { mode: "replay", releaseId: row.release_id, releaseStatus: row.release_status };
    }
    const predecessor = await client.query(`
      select id,release_key,source_manifest_sha256,source_package_sha256,status,sealed_at
      from public.estimate_definition_release where id=$1 for share
    `, [manifest.parentRelease.releaseId]);
    const parent = predecessor.rows[0];
    if (!parent || parent.release_key !== manifest.parentRelease.releaseKey
      || parent.source_manifest_sha256 !== manifest.parentRelease.sourceManifestSha256
      || parent.source_package_sha256 !== manifest.parentRelease.sourcePackageSha256
      || parent.status !== "active" || parent.sealed_at == null) {
      throw new Error(`WATER_PREDECESSOR_RELEASE_RED:${JSON.stringify(parent ?? null)}`);
    }
    await client.query(`
      insert into public.estimate_definition_release (
        id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
        source_package_sha256,parent_release_id,definition_count,parameter_count,formula_count,
        resource_row_count,metadata
      ) values ($1,$2,5,'draft',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
    `, [manifest.releaseId, manifest.releaseKey, manifest.sourceGit.head, manifest.sourceGit.tree,
      manifest.manifestSha256, manifest.sourcePackageSha256, manifest.parentRelease.releaseId,
      manifest.actual.works, manifest.actual.parameters, manifest.actual.formulas, manifest.actual.resources,
      JSON.stringify({ importerVersion: IMPORTER_VERSION, waterDelta: manifest.waterDelta, contentIdentity: manifest.contentIdentity,
        sourceFingerprintSha256: manifest.sourceGit.worktreeSourceFingerprintSha256, officialSources: manifest.officialSources })]);

    process.stderr.write("[batch006-import] works\n");
    await insertWorks(client, join(packageRoot, "works.jsonl"), manifest.releaseId);
    process.stderr.write("[batch006-import] parameters\n");
    await insertParameters(client, join(packageRoot, "parameters.jsonl"), manifest.releaseId);
    process.stderr.write("[batch006-import] formulas\n");
    await insertFormulas(client, join(packageRoot, "formulas.jsonl"), manifest.releaseId);
    process.stderr.write("[batch006-import] resources\n");
    await insertResources(client, join(packageRoot, "resources.jsonl"), manifest.releaseId);
    process.stderr.write("[batch006-import] normalized-passports-norms-prices\n");
    await normalizePassportsNormativesAndPrices(client, manifest.releaseId, manifest);

    const counts = (await client.query(`
      select
        (select count(*) from public.estimate_definition_version where release_id=$1)::integer definitions,
        (select count(*) from public.estimate_parameter_definition p join public.estimate_definition_version v on v.id=p.definition_version_id where v.release_id=$1)::integer parameters,
        (select count(*) from public.estimate_formula_graph f join public.estimate_definition_version v on v.id=f.definition_version_id where v.release_id=$1)::integer formulas,
        (select count(*) from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id where v.release_id=$1)::integer resources,
        (select count(*) from public.estimate_professional_passport p where p.release_id=$1)::integer water_passports,
        (select count(*) from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id
          left join public.estimate_work_normative_binding b on b.resource_spec_id=s.id
          where v.release_id=$1 and b.resource_spec_id is null)::integer missing_norms,
        (select count(*) from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id
          left join public.estimate_resource_price_route_binding b on b.resource_spec_id=s.id
          where v.release_id=$1 and b.resource_spec_id is null)::integer missing_prices
    `, [manifest.releaseId])).rows[0];
    if (Number(counts.definitions) !== manifest.actual.works || Number(counts.parameters) !== manifest.actual.parameters
      || Number(counts.formulas) !== manifest.actual.formulas || Number(counts.resources) !== manifest.actual.resources
      || Number(counts.water_passports) !== manifest.waterDelta.definitions
      || Number(counts.missing_norms) !== 0 || Number(counts.missing_prices) !== 0) {
      throw new Error(`WATER_DATABASE_IMPORT_COUNT_RED:${JSON.stringify(counts)}`);
    }
    const namespaceCounts = (await client.query(`
      select count(*) filter(where w.denominator_eligible)::integer global_count,
             count(*) filter(where not w.denominator_eligible)::integer external_count,
             count(*) filter(where w.domain='water_supply_sewerage')::integer water_count
      from public.estimate_definition_version v join public.estimate_work_identity w on w.catalog_id=v.catalog_id
      where v.release_id=$1
    `, [manifest.releaseId])).rows[0];
    if (Number(namespaceCounts.global_count) !== manifest.actual.globalWorks
      || Number(namespaceCounts.external_count) !== 8 || Number(namespaceCounts.water_count) !== 845) {
      throw new Error(`WATER_DATABASE_NAMESPACE_RED:${JSON.stringify(namespaceCounts)}`);
    }
    await client.query("update public.estimate_definition_release set status='prepared',sealed_at=now() where id=$1 and status='draft'", [manifest.releaseId]);
    await client.query(`
      insert into public.estimate_migration_import (
        import_key,release_id,domain,package_sha256,work_count,external_count,resource_row_count,status,source_lineage,imported_at
      ) values ($1,$2,'water_supply_sewerage',$3,$4,0,$5,'imported',$6::jsonb,now())
    `, [manifest.releaseKey, manifest.releaseId, manifest.manifestSha256, manifest.waterDelta.definitions,
      manifest.waterDelta.resources, JSON.stringify({ parentRelease: manifest.parentRelease, sourcePackageSha256: manifest.sourcePackageSha256,
        waterIdSetSha256: manifest.waterDelta.admittedCatalogIdSetSha256 })]);
    await client.query(`
      insert into public.estimate_program_event (event_kind,event_key,denominator_delta,queue_delta,payload)
      values ('migration',$1,0,0,$2::jsonb)
    `, [`${manifest.releaseKey}:prepared-import`, JSON.stringify({ releaseId: manifest.releaseId, parentReleaseId: manifest.parentRelease.releaseId,
      waterDefinitions: manifest.waterDelta.definitions, queueMutation: 0, productionDeployed: false })]);
    await assertProgramControl(client, manifest);
    await client.query("commit");
    return { mode: "import", releaseId: manifest.releaseId, releaseStatus: "prepared", counts, namespaceCounts };
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function main(): Promise<void> {
  const packageRoot = resolve(argument("package", DEFAULT_PACKAGE));
  const manifest = await verifyPackage(packageRoot);
  const evidenceOutput = resolve(argument("evidence-output", join(ROOT, ".release-runtime", "batch006-water-backend-r3", "evidence-a1", "A7_IMPORT_REPORT.json")));
  if (hasFlag("dry-run")) {
    process.stdout.write(`${JSON.stringify({ mode: "dry_run", packageRoot, releaseId: manifest.releaseId,
      manifestSha256: manifest.manifestSha256, actual: manifest.actual, waterDelta: manifest.waterDelta })}\n`);
    return;
  }
  const client = new Client(databaseConfig());
  await client.connect();
  try {
    const result = await importPackage(client, packageRoot, manifest);
    const report = {
      schemaVersion: "water-r5-a1-atomic-import-report.v1",
      generatedAt: new Date().toISOString(),
      database: new URL((databaseConfig().connectionString as string)).pathname.replace(/^\//, ""),
      releaseId: manifest.releaseId,
      manifestSha256: manifest.manifestSha256,
      sourcePackageSha256: manifest.sourcePackageSha256,
      sourceFingerprintSha256: manifest.sourceGit.worktreeSourceFingerprintSha256,
      packageRoot,
      result,
      queueMutation: 0,
      productionDeployed: false,
      batch007Started: false,
      status: ["import", "replay"].includes(String(result.mode)) ? "GREEN" : "RED",
    };
    mkdirSync(dirname(evidenceOutput), { recursive: true });
    writeFileSync(evidenceOutput, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
