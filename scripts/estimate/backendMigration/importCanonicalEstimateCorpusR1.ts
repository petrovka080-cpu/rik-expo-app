import { createHash } from "node:crypto";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { createInterface } from "node:readline";
import { Client, type ClientConfig } from "pg";

const IMPORTER_VERSION = "master11610-backend-canonical-import.r2";
const DEFAULT_PACKAGE = ".release-runtime/master11610-backend-canonical-r2/02-canonical-export";

type ManifestFile = { file: string; rows: number; bytes: number; sha256: string };
type Manifest = {
  schemaVersion: string;
  releaseId: string;
  releaseKey: string;
  sourcePackageSha256: string;
  predecessorRelease: { releaseId: string; releaseKey: string; manifestSha256: string };
  expected: Record<string, unknown>;
  actual: {
    works: number;
    globalWorks: number;
    externalReferences: number;
    parameters: number;
    formulas: number;
    resources: number;
    byDomain: Record<string, { works: number; resources: number }>;
  };
  programControl: {
    denominator: number;
    admittedGlobalBeforeMigration: number;
    queueRemainingBeforeMigration: number;
    migrationAdmissionDelta: number;
    batch006Started: boolean;
  };
  sourceGit: { commit: string; tree: string; predecessor: string };
  sourceArtifacts: Array<{ path: string; sha256: string; bytes: number }>;
  files: ManifestFile[];
  manifestSha256: string;
};

function cliValue(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function hasFlag(name: string): boolean { return process.argv.includes(`--${name}`); }

function stableJson(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function hash(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : stableJson(value)).digest("hex");
}

async function hashFile(path: string): Promise<string> {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(path)) digest.update(chunk as Buffer);
  return digest.digest("hex");
}

async function countJsonLines(path: string): Promise<number> {
  let count = 0;
  const lines = createInterface({ input: createReadStream(path, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const rawLine of lines) if (rawLine.trim()) count += 1;
  return count;
}

async function verifyPackage(packageRoot: string): Promise<Manifest> {
  const manifestPath = join(packageRoot, "manifest.json");
  if (!existsSync(manifestPath)) throw new Error(`MANIFEST_NOT_FOUND:${manifestPath}`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
  const { manifestSha256, ...withoutHash } = manifest;
  if (!/^[0-9a-f]{64}$/.test(manifestSha256) || hash(withoutHash) !== manifestSha256) throw new Error("MANIFEST_SHA256_MISMATCH");
  if (manifest.schemaVersion !== "master11610-backend-canonical-export.r2") throw new Error("MANIFEST_SCHEMA_UNSUPPORTED");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(manifest.releaseId)
    || !/^[0-9a-f]{64}$/.test(manifest.sourcePackageSha256)
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(manifest.predecessorRelease?.releaseId)
    || !/^[0-9a-f]{64}$/.test(manifest.predecessorRelease?.manifestSha256)) {
    throw new Error("MANIFEST_RELEASE_LINEAGE_INVALID");
  }
  if (
    manifest.actual.works !== 1_168 || manifest.actual.globalWorks !== 1_160 ||
    manifest.actual.externalReferences !== 8 || manifest.actual.resources !== 101_416 ||
    manifest.actual.byDomain.asphalt?.resources !== 3_709 ||
    manifest.actual.byDomain.drywall?.resources !== 27_984 ||
    manifest.actual.byDomain.electrical?.resources !== 69_723
  ) throw new Error("MANIFEST_EXACT_CARDINALITY_MISMATCH");
  if (
    manifest.programControl.denominator !== 11_610 ||
    manifest.programControl.admittedGlobalBeforeMigration !== 1_160 ||
    manifest.programControl.queueRemainingBeforeMigration !== 10_450 ||
    manifest.programControl.migrationAdmissionDelta !== 0 ||
    manifest.programControl.batch006Started !== false
  ) throw new Error("MANIFEST_PROGRAM_CONTROL_MISMATCH");
  for (const file of manifest.files) {
    const path = join(packageRoot, file.file);
    if (!existsSync(path) || statSync(path).size !== file.bytes) throw new Error(`PACKAGE_FILE_SIZE_MISMATCH:${file.file}`);
    const [sha256, rows] = await Promise.all([hashFile(path), countJsonLines(path)]);
    if (sha256 !== file.sha256) throw new Error(`PACKAGE_FILE_SHA256_MISMATCH:${file.file}`);
    if (rows !== file.rows) throw new Error(`PACKAGE_FILE_ROW_COUNT_MISMATCH:${file.file}:${rows}:${file.rows}`);
  }
  for (const source of manifest.sourceArtifacts) {
    if (!existsSync(source.path) || statSync(source.path).size !== source.bytes || await hashFile(source.path) !== source.sha256) {
      throw new Error(`SOURCE_ARTIFACT_DRIFT:${source.path}`);
    }
  }
  const expectedSourcePackageSha256 = hash({
    schemaVersion: manifest.schemaVersion,
    releaseId: manifest.releaseId,
    releaseKey: manifest.releaseKey,
    predecessorReleaseId: manifest.predecessorRelease.releaseId,
    files: manifest.files.map((file) => ({ file: file.file, rows: file.rows, bytes: file.bytes, sha256: file.sha256 })),
    sourceArtifacts: manifest.sourceArtifacts.map((artifact) => ({ path: artifact.path, bytes: artifact.bytes, sha256: artifact.sha256 })),
    correctionContract: "BOOLEAN_ENUM_PARAMETER_SEMANTICS_AND_CONSTRAINT_AWARE_ADMISSION_R2",
  });
  if (expectedSourcePackageSha256 !== manifest.sourcePackageSha256) throw new Error("SOURCE_PACKAGE_SHA256_MISMATCH");
  return manifest;
}

async function* jsonLineBatches(path: string, batchSize: number): AsyncGenerator<Record<string, any>[]> {
  let batch: Record<string, any>[] = [];
  const lines = createInterface({ input: createReadStream(path, { encoding: "utf8" }), crlfDelay: Infinity });
  let lineNumber = 0;
  for await (const rawLine of lines) {
    lineNumber += 1;
    const line = rawLine.trim();
    if (!line) continue;
    try { batch.push(JSON.parse(line)); }
    catch { throw new Error(`PACKAGE_JSONL_INVALID:${path}:${lineNumber}`); }
    if (batch.length >= batchSize) {
      yield batch;
      batch = [];
    }
  }
  if (batch.length) yield batch;
}

function databaseConfig(): ClientConfig {
  const connectionString = cliValue("database-url") ?? process.env.ESTIMATE_MIGRATION_DATABASE_URL ?? "";
  if (!connectionString) throw new Error("ESTIMATE_MIGRATION_DATABASE_URL_REQUIRED");
  const allowRemote = hasFlag("allow-remote-nonproduction");
  const url = new URL(connectionString);
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (!localHosts.has(url.hostname) && !allowRemote) throw new Error("REMOTE_DATABASE_REQUIRES_EXPLICIT_NONPRODUCTION_FLAG");
  if (/prod/i.test(url.hostname + url.pathname) && !hasFlag("i-understand-production-is-forbidden")) {
    throw new Error("PRODUCTION_DATABASE_IMPORT_FORBIDDEN");
  }
  return { connectionString, application_name: IMPORTER_VERSION, statement_timeout: 120_000 };
}

async function assertProgramControl(client: Client, expected: Manifest["programControl"]) {
  const result = await client.query(`
    select denominator_total, admitted_global_count, queue_remaining, external_reference_count, batch006_started
    from public.estimate_program_control_state where singleton = true
  `);
  const state = result.rows[0];
  if (!state || Number(state.denominator_total) !== expected.denominator ||
    Number(state.admitted_global_count) !== expected.admittedGlobalBeforeMigration ||
    Number(state.queue_remaining) !== expected.queueRemainingBeforeMigration ||
    state.batch006_started !== false) {
    throw new Error(`PROGRAM_CONTROL_STATE_DRIFT:${JSON.stringify(state ?? null)}`);
  }
}

async function insertWorks(client: Client, path: string, releaseId: string) {
  for await (const batch of jsonLineBatches(path, 250)) {
    for (const work of batch) work.definitionSha256 = hash({ passport: work.passport, applicability: work.applicability, sourceMetadata: work.sourceMetadata });
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
      select count(*)::integer as count
      from jsonb_to_recordset($1::jsonb) as x(
        "catalogId" text, namespace text, domain text, "sourceIdentity" text, "workKey" text,
        "titleRu" text, "denominatorEligible" boolean
      )
      join public.estimate_work_identity w on w.catalog_id = x."catalogId"
      where (w.namespace, w.domain, w.source_identity, w.work_key, w.title_ru, w.denominator_eligible)
        is distinct from (x.namespace, x.domain, x."sourceIdentity", x."workKey", x."titleRu", x."denominatorEligible")
    `, [JSON.stringify(batch)]);
    if (Number(mismatch.rows[0].count) !== 0) throw new Error("CANONICAL_IDENTITY_CONFLICT");
  }
}

async function insertParameters(client: Client, path: string, releaseId: string) {
  for await (const batch of jsonLineBatches(path, 500)) {
    await client.query(`
      insert into public.estimate_parameter_definition (
        definition_version_id, parameter_id, ordinal, value_type, unit_id, title_ru,
        required, default_value, constraints_json
      )
      select v.id, x."parameterId", x.ordinal, x."valueType", x."unitId", x."titleRu",
        x.required, x."defaultValue", x.constraints
      from jsonb_to_recordset($1::jsonb) as x(
        "catalogId" text, "parameterId" text, ordinal integer, "valueType" text,
        "unitId" text, "titleRu" text, required boolean, "defaultValue" jsonb, constraints jsonb
      )
      join public.estimate_definition_version v on v.release_id = $2::uuid and v.catalog_id = x."catalogId"
    `, [JSON.stringify(batch), releaseId]);
  }
}

async function insertFormulas(client: Client, path: string, releaseId: string) {
  for await (const batch of jsonLineBatches(path, 300)) {
    for (const entry of batch) entry.astSha256 = hash(entry.ast);
    await client.query(`
      insert into public.estimate_formula_graph (
        definition_version_id, formula_id, output_unit_id, expression_source, ast,
        input_parameter_ids, ast_sha256
      )
      select v.id, x."formulaId", x."outputUnitId", x."expressionSource", x.ast,
        x."inputParameterIds", x."astSha256"
      from jsonb_to_recordset($1::jsonb) as x(
        "catalogId" text, "formulaId" text, "outputUnitId" text, "expressionSource" text,
        ast jsonb, "inputParameterIds" text[], "astSha256" text
      )
      join public.estimate_definition_version v on v.release_id = $2::uuid and v.catalog_id = x."catalogId"
    `, [JSON.stringify(batch), releaseId]);
  }
}

async function insertResources(client: Client, path: string, releaseId: string) {
  for await (const batch of jsonLineBatches(path, 75)) {
    for (const entry of batch) entry.rowSha256 = hash(entry);
    await client.query(`
      insert into public.estimate_resource_spec (
        definition_version_id, row_id, ordinal, section, category, title_ru, row_type,
        unit_id, formula_id, inclusion_ast, resource_graph, semantic_owner, cost_owner_id,
        procurement_eligible, source_metadata, row_sha256
      )
      select v.id, x."rowId", x.ordinal, x.section, x.category, x."titleRu", x."rowType",
        x."unitId", x."formulaId", x."inclusionAst", x."resourceGraph", x."semanticOwner",
        x."costOwnerId", x."procurementEligible", x."sourceMetadata", x."rowSha256"
      from jsonb_to_recordset($1::jsonb) as x(
        "catalogId" text, "rowId" text, ordinal integer, section text, category text,
        "titleRu" text, "rowType" text, "unitId" text, "formulaId" text,
        "inclusionAst" jsonb, "resourceGraph" jsonb, "semanticOwner" text,
        "costOwnerId" text, "procurementEligible" boolean, "sourceMetadata" jsonb, "rowSha256" text
      )
      join public.estimate_definition_version v on v.release_id = $2::uuid and v.catalog_id = x."catalogId"
    `, [JSON.stringify(batch), releaseId]);
  }
}

async function normalizeNormativesAndPrices(client: Client, releaseId: string) {
  await client.query(`
    insert into public.estimate_normative_source (source_key, title_ru, authority, metadata)
    select distinct on (source_key) source_key,
      coalesce(nullif(trace ->> 'document_code', ''), source_key),
      coalesce(nullif(trace ->> 'authority', ''), 'SOURCE_CORPUS'),
      jsonb_build_object('edition', trace -> 'edition', 'sourceRole', coalesce(trace -> 'source_role', trace -> 'role'))
    from public.estimate_resource_spec s
    join public.estimate_definition_version v on v.id = s.definition_version_id
    cross join lateral jsonb_array_elements(coalesce(s.source_metadata -> 'normativeTrace', '[]'::jsonb)) trace
    cross join lateral (select coalesce(nullif(trace ->> 'source_id', ''), nullif(trace ->> 'sourceId', '')) source_key) k
    where v.release_id = $1::uuid and source_key is not null
    order by source_key, s.id
    on conflict (source_key) do nothing
  `, [releaseId]);
  await client.query(`
    insert into public.estimate_normative_locator (source_id, locator_key, locator)
    select distinct on (ns.id, locator_key) ns.id, locator_key, trace
    from public.estimate_resource_spec s
    join public.estimate_definition_version v on v.id = s.definition_version_id
    cross join lateral jsonb_array_elements(coalesce(s.source_metadata -> 'normativeTrace', '[]'::jsonb)) trace
    join public.estimate_normative_source ns
      on ns.source_key = coalesce(nullif(trace ->> 'source_id', ''), nullif(trace ->> 'sourceId', ''))
    cross join lateral (select md5(ns.source_key || ':' || trace::text) locator_key) k
    where v.release_id = $1::uuid
    order by ns.id, locator_key, s.id
    on conflict (source_id, locator_key) do nothing
  `, [releaseId]);
  await client.query(`
    insert into public.estimate_work_normative_binding (
      definition_version_id, resource_spec_id, locator_id, applicability
    )
    select distinct s.definition_version_id, s.id, nl.id,
      jsonb_build_object('text', coalesce(trace -> 'applicability', 'null'::jsonb))
    from public.estimate_resource_spec s
    join public.estimate_definition_version v on v.id = s.definition_version_id
    cross join lateral jsonb_array_elements(coalesce(s.source_metadata -> 'normativeTrace', '[]'::jsonb)) trace
    join public.estimate_normative_source ns
      on ns.source_key = coalesce(nullif(trace ->> 'source_id', ''), nullif(trace ->> 'sourceId', ''))
    join public.estimate_normative_locator nl
      on nl.source_id = ns.id and nl.locator_key = md5(ns.source_key || ':' || trace::text)
    where v.release_id = $1::uuid
    on conflict do nothing
  `, [releaseId]);
  await client.query(`
    insert into public.estimate_price_route (
      route_key, currency_code, priority, source_kind, metadata
    )
    select 'canonical-resource:' || s.id::text, 'KGS', 100, 'manual',
      jsonb_build_object('costOwnerId', s.cost_owner_id, 'sourceRoute', s.source_metadata -> 'priceRoute')
    from public.estimate_resource_spec s
    join public.estimate_definition_version v on v.id = s.definition_version_id
    where v.release_id = $1::uuid and s.cost_owner_id is not null
    on conflict (route_key) do nothing
  `, [releaseId]);
  await client.query(`
    insert into public.estimate_resource_price_route_binding (resource_spec_id, route_id, price_key, priority)
    select s.id, r.id, s.cost_owner_id, r.priority
    from public.estimate_resource_spec s
    join public.estimate_definition_version v on v.id = s.definition_version_id
    join public.estimate_price_route r on r.route_key = 'canonical-resource:' || s.id::text
    where v.release_id = $1::uuid and s.cost_owner_id is not null
    on conflict do nothing
  `, [releaseId]);
}

async function importPackage(client: Client, packageRoot: string, manifest: Manifest) {
  await client.query("begin isolation level serializable");
  try {
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [manifest.releaseKey]);
    await assertProgramControl(client, manifest.programControl);
    const existing = await client.query(`
      select mi.status, mi.package_sha256, r.id as release_id, r.status as release_status
      from public.estimate_migration_import mi
      join public.estimate_definition_release r on r.id = mi.release_id
      where mi.import_key = $1
    `, [manifest.releaseKey]);
    if (existing.rowCount) {
      const row = existing.rows[0];
      if (row.package_sha256 !== manifest.manifestSha256 || row.status !== "imported" || row.release_status !== "prepared") {
        throw new Error("IMPORT_KEY_CONFLICT");
      }
      await assertProgramControl(client, manifest.programControl);
      await client.query("commit");
      return { mode: "replay", releaseId: row.release_id, manifestSha256: manifest.manifestSha256 };
    }
    const predecessor = await client.query(`
      select id, release_key, source_manifest_sha256, status, sealed_at
      from public.estimate_definition_release where id = $1 for share
    `, [manifest.predecessorRelease.releaseId]);
    const predecessorRow = predecessor.rows[0];
    if (!predecessorRow || predecessorRow.release_key !== manifest.predecessorRelease.releaseKey
      || predecessorRow.source_manifest_sha256 !== manifest.predecessorRelease.manifestSha256
      || predecessorRow.status !== "active" || predecessorRow.sealed_at == null) {
      throw new Error(`PREDECESSOR_RELEASE_MISMATCH:${JSON.stringify(predecessorRow ?? null)}`);
    }
    const releaseResult = await client.query(`
      insert into public.estimate_definition_release (
        id, release_key, schema_version, status, source_commit, source_tree,
        source_manifest_sha256, source_package_sha256, parent_release_id,
        definition_count, parameter_count, formula_count, resource_row_count, metadata
      ) values ($1, $2, 2, 'draft', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
      returning id
    `, [
      manifest.releaseId, manifest.releaseKey, manifest.sourceGit.commit, manifest.sourceGit.tree,
      manifest.manifestSha256, manifest.sourcePackageSha256, manifest.predecessorRelease.releaseId,
      manifest.actual.works, manifest.actual.parameters, manifest.actual.formulas, manifest.actual.resources,
      JSON.stringify({
        importerVersion: IMPORTER_VERSION,
        sourceArtifacts: manifest.sourceArtifacts,
        correctionContract: "BOOLEAN_ENUM_PARAMETER_SEMANTICS_AND_CONSTRAINT_AWARE_ADMISSION_R2",
        predecessorRelease: manifest.predecessorRelease,
      }),
    ]);
    const releaseId = releaseResult.rows[0].id as string;
    await insertWorks(client, join(packageRoot, "works.jsonl"), releaseId);
    await insertParameters(client, join(packageRoot, "parameters.jsonl"), releaseId);
    await insertFormulas(client, join(packageRoot, "formulas.jsonl"), releaseId);
    await insertResources(client, join(packageRoot, "resources.jsonl"), releaseId);
    await normalizeNormativesAndPrices(client, releaseId);

    const counts = await client.query(`
      select
        (select count(*) from public.estimate_definition_version where release_id = $1)::integer definitions,
        (select count(*) from public.estimate_parameter_definition p join public.estimate_definition_version v on v.id = p.definition_version_id where v.release_id = $1)::integer parameters,
        (select count(*) from public.estimate_formula_graph f join public.estimate_definition_version v on v.id = f.definition_version_id where v.release_id = $1)::integer formulas,
        (select count(*) from public.estimate_resource_spec s join public.estimate_definition_version v on v.id = s.definition_version_id where v.release_id = $1)::integer resources
    `, [releaseId]);
    const actual = counts.rows[0];
    if (Number(actual.definitions) !== manifest.actual.works || Number(actual.parameters) !== manifest.actual.parameters ||
      Number(actual.formulas) !== manifest.actual.formulas || Number(actual.resources) !== manifest.actual.resources) {
      throw new Error(`DATABASE_IMPORT_COUNT_MISMATCH:${JSON.stringify(actual)}`);
    }
    const globalExternal = await client.query(`
      select count(*) filter (where w.denominator_eligible)::integer global_count,
        count(*) filter (where not w.denominator_eligible)::integer external_count
      from public.estimate_definition_version v join public.estimate_work_identity w on w.catalog_id = v.catalog_id
      where v.release_id = $1
    `, [releaseId]);
    if (Number(globalExternal.rows[0].global_count) !== 1_160 || Number(globalExternal.rows[0].external_count) !== 8) {
      throw new Error("DATABASE_DENOMINATOR_MEMBERSHIP_MISMATCH");
    }
    await client.query(`
      update public.estimate_definition_release
      set status = 'prepared', sealed_at = now()
      where id = $1 and status = 'draft'
    `, [releaseId]);
    await client.query(`
      insert into public.estimate_migration_import (
        import_key, release_id, domain, package_sha256, work_count, external_count,
        resource_row_count, status, source_lineage, imported_at
      ) values ($1, $2, 'asphalt_drywall_electrical', $3, $4, 8, $5, 'imported', $6::jsonb, now())
    `, [manifest.releaseKey, releaseId, manifest.manifestSha256, 1_160, 101_416, JSON.stringify({
      sourceGit: manifest.sourceGit,
      sourcePackageSha256: manifest.sourcePackageSha256,
      predecessorRelease: manifest.predecessorRelease,
    })]);
    await client.query(`
      insert into public.estimate_program_event (
        event_kind, event_key, catalog_id, denominator_delta, queue_delta, payload
      )
      select 'migration', $1::text || ':' || v.catalog_id, v.catalog_id, 0, 0,
        jsonb_build_object('releaseId', $2::uuid, 'packageSha256', $3::text)
      from public.estimate_definition_version v where v.release_id = $2::uuid
    `, [manifest.releaseKey, releaseId, manifest.manifestSha256]);
    await assertProgramControl(client, manifest.programControl);
    await client.query("commit");
    return { mode: "import", releaseId, manifestSha256: manifest.manifestSha256, counts: actual };
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function rollbackImport(client: Client, manifest: Manifest) {
  await client.query("begin isolation level serializable");
  try {
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [manifest.releaseKey]);
    const result = await client.query(`
      select mi.id import_id, mi.status, r.id release_id, r.status release_status
      from public.estimate_migration_import mi
      join public.estimate_definition_release r on r.id = mi.release_id
      where mi.import_key = $1 for update of mi, r
    `, [manifest.releaseKey]);
    if (!result.rowCount) throw new Error("IMPORT_NOT_FOUND");
    const row = result.rows[0];
    if (row.status === "rolled_back") {
      await client.query("commit");
      return { mode: "rollback_replay", releaseId: row.release_id };
    }
    if (row.release_status !== "active") throw new Error("IMPORT_RELEASE_NOT_ACTIVE");
    await client.query("update public.estimate_definition_release set status = 'retired' where id = $1", [row.release_id]);
    await client.query("update public.estimate_migration_import set status = 'rolled_back', rolled_back_at = now() where id = $1", [row.import_id]);
    await client.query(`
      insert into public.estimate_program_event (event_kind, event_key, denominator_delta, queue_delta, payload)
      values ('rollback', $1, 0, 0, jsonb_build_object('releaseId', $2::uuid))
      on conflict (event_key) do nothing
    `, [`${manifest.releaseKey}:rollback`, row.release_id]);
    await assertProgramControl(client, manifest.programControl);
    await client.query("commit");
    return { mode: "rollback", releaseId: row.release_id };
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function main() {
  const packageRoot = resolve(cliValue("package") ?? DEFAULT_PACKAGE);
  const manifest = await verifyPackage(packageRoot);
  if (hasFlag("dry-run") && !cliValue("database-url") && !process.env.ESTIMATE_MIGRATION_DATABASE_URL) {
    process.stdout.write(`${JSON.stringify({ mode: "dry_run", packageRoot, manifestSha256: manifest.manifestSha256, actual: manifest.actual }, null, 2)}\n`);
    return;
  }
  const client = new Client(databaseConfig());
  await client.connect();
  try {
    if (hasFlag("dry-run")) {
      await assertProgramControl(client, manifest.programControl);
      process.stdout.write(`${JSON.stringify({ mode: "database_dry_run", packageRoot, manifestSha256: manifest.manifestSha256 }, null, 2)}\n`);
      return;
    }
    const result = hasFlag("rollback") ? await rollbackImport(client, manifest) : await importPackage(client, packageRoot, manifest);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
