import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client, type PoolClient } from "pg";

type Json = Record<string, any>;

const MASTER_SHA256 = "bd26ab611f4ea0a63657b664e2a674d317a454da579d71895a766a9bcd943333";
const BACKEND_AGGREGATE_MASTER_SHA256 = "44084dd37cf6c6612e39fdf2aded9a34acef752e7742ee18985a8be316288585";
const BACKEND_AGGREGATE = resolve(
  ".release-runtime/real-useful-estimates-r4/evidence/current-green/11_WORK_GROUP_BACKEND_AGGREGATE_R4.json",
);
const OUTPUT = resolve(
  ".release-runtime/real-useful-estimates-r4/evidence/current-green/17_OFFICIAL_SURFACE_AGGREGATE_CANDIDATE_R41.json",
);
const DATABASE_URL = process.env.R4_OFFICIAL_SURFACE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const ALLOWED_DATABASE_URL_RE = /^postgresql:\/\/postgres@127\.0\.0\.1:55432\/rik_r4_runtime_b5_v2$/u;
const APPLY = process.argv.includes("--apply");
const EXPECTED = {
  batches: 8,
  workGroups: 770,
  manifestEntries: 3_318,
  searchDocuments: 3_426,
  selectableDocuments: 3_318,
  externalDocuments: 108,
  searchGroups: 678,
} as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function deterministicUuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function rowDigest(rows: readonly Json[], fields: readonly string[]): string {
  const hash = createHash("sha256");
  for (const row of rows) {
    hash.update(fields.map((field) => String(row[field] ?? "")).join("\0"));
    hash.update("\n");
  }
  return hash.digest("hex");
}

async function aggregateCounts(
  client: Client | PoolClient,
  releaseId: string,
  searchReleaseId: string,
): Promise<Json> {
  return (await client.query(`
    select
      (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1) manifest_entries,
      (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1
        and baseline_ready and scenario_ready and runtime_publication_state='CANDIDATE') manifest_ready,
      (select count(*)::int from public.estimate_definition_version where release_id=$1) direct_definitions,
      (select count(*)::int from public.estimate_search_document where search_release_id=$2) search_documents,
      (select count(*)::int from public.estimate_search_document where search_release_id=$2 and selectable) selectable_documents,
      (select count(*)::int from public.estimate_search_document where search_release_id=$2 and catalog_origin<>'GLOBAL') external_documents,
      (select count(*)::int from public.estimate_search_group where search_release_id=$2) search_groups,
      (select count(*)::int from public.estimate_search_group_membership where search_release_id=$2) memberships,
      (select count(*)::int from public.estimate_search_typed_relation where search_release_id=$2) typed_relations
  `, [releaseId, searchReleaseId])).rows[0] as Json;
}

async function main(): Promise<void> {
  invariant(ALLOWED_DATABASE_URL_RE.test(DATABASE_URL), "R41_OFFICIAL_SURFACE_NON_DISPOSABLE_DATABASE_DENIED");
  invariant(process.argv.length === 2 || (process.argv.length === 3 && APPLY),
    "R41_OFFICIAL_SURFACE_USAGE_ONLY_OPTIONAL_APPLY");
  const aggregate = JSON.parse(readFileSync(BACKEND_AGGREGATE, "utf8")) as Json;
  invariant(aggregate.master_sha256 === BACKEND_AGGREGATE_MASTER_SHA256,
    "R41_OFFICIAL_SURFACE_BACKEND_AGGREGATE_MASTER_DRIFT");
  invariant(aggregate.status === "GREEN_BACKEND_ALL_BATCHES_SURFACES_PENDING",
    "R41_OFFICIAL_SURFACE_BACKEND_AGGREGATE_STATUS_RED");
  invariant(aggregate.totals?.work_groups === EXPECTED.workGroups,
    "R41_OFFICIAL_SURFACE_WORK_GROUP_DENOMINATOR_RED");
  const batches = aggregate.batches as Json[];
  invariant(batches.length === EXPECTED.batches, "R41_OFFICIAL_SURFACE_BATCH_DENOMINATOR_RED");
  const releaseIds = batches.map((batch) => String(batch.release_id));
  invariant(new Set(releaseIds).size === EXPECTED.batches, "R41_OFFICIAL_SURFACE_RELEASE_DUPLICATE");

  const sourceHead = git(["rev-parse", "HEAD"]);
  const sourceTree = git(["rev-parse", "HEAD^{tree}"]);
  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: APPLY
      ? "r41-official-surface-aggregate-apply"
      : "r41-official-surface-aggregate-dry-run",
    statement_timeout: 120_000,
  });
  await client.connect();
  let evidence: Json;
  try {
    const activeReleaseCountBefore = Number((await client.query(
      "select count(*) count from public.estimate_definition_release where status='active'",
    )).rows[0].count);
    invariant(activeReleaseCountBefore === 0, "R41_OFFICIAL_SURFACE_ACTIVE_RELEASE_DRIFT");

    const sourceBindings = (await client.query(`
      select release.id::text release_id,release.release_key,release.status,
        release.source_manifest_sha256,capability.search_release_id::text,
        search.release_key search_release_key,search.snapshot_sha256
      from public.estimate_definition_release release
      join lateral (
        select candidate.search_release_id
        from public.estimate_candidate_capability_r3 candidate
        where candidate.release_id=release.id and candidate.revoked_at is null
        order by candidate.expires_at desc limit 1
      ) capability on true
      join public.estimate_search_index_release search on search.id=capability.search_release_id
      where release.id=any($1::uuid[])
      order by array_position($1::uuid[],release.id)
    `, [releaseIds])).rows as Json[];
    invariant(sourceBindings.length === EXPECTED.batches
      && sourceBindings.every((row) => row.status === "prepared"),
    "R41_OFFICIAL_SURFACE_SOURCE_RELEASE_BINDING_RED");
    const searchReleaseIds = sourceBindings.map((row) => String(row.search_release_id));
    invariant(new Set(searchReleaseIds).size === EXPECTED.batches,
      "R41_OFFICIAL_SURFACE_SEARCH_RELEASE_DUPLICATE");

    const manifestRows = (await client.query(`
      select manifest.release_id::text,manifest.catalog_id,manifest.definition_version_id::text,
        manifest.source_batch,manifest.source_release_id::text,manifest.domain_id,
        manifest.entry_sha256,manifest.definition_hash,manifest.baseline_ready,
        manifest.scenario_ready,manifest.runtime_publication_state
      from public.estimate_cumulative_manifest_entry manifest
      where manifest.release_id=any($1::uuid[])
      order by manifest.catalog_id
    `, [releaseIds])).rows as Json[];
    invariant(manifestRows.length === EXPECTED.manifestEntries
      && new Set(manifestRows.map((row) => row.catalog_id)).size === EXPECTED.manifestEntries,
    "R41_OFFICIAL_SURFACE_MANIFEST_DENOMINATOR_RED");
    invariant(manifestRows.every((row) => row.baseline_ready === true && row.scenario_ready === true
      && row.runtime_publication_state === "CANDIDATE"),
    "R41_OFFICIAL_SURFACE_SOURCE_MANIFEST_NOT_READY");

    const searchRows = (await client.query(`
      select document.search_release_id::text,document.catalog_id,document.group_id,
        document.domain_id,document.document_sha256,document.selectable,
        document.catalog_origin,document.definition_version_id::text
      from public.estimate_search_document document
      where document.search_release_id=any($1::uuid[])
      order by document.catalog_id
    `, [searchReleaseIds])).rows as Json[];
    invariant(searchRows.length === EXPECTED.searchDocuments
      && new Set(searchRows.map((row) => row.catalog_id)).size === EXPECTED.searchDocuments,
    "R41_OFFICIAL_SURFACE_SEARCH_DOCUMENT_DENOMINATOR_RED");
    const selectableCatalogIds = new Set(
      searchRows.filter((row) => row.selectable === true).map((row) => String(row.catalog_id)),
    );
    invariant(selectableCatalogIds.size === EXPECTED.selectableDocuments
      && searchRows.filter((row) => row.catalog_origin !== "GLOBAL").length === EXPECTED.externalDocuments,
    "R41_OFFICIAL_SURFACE_SEARCH_CLASSIFICATION_RED");
    invariant(manifestRows.every((row) => selectableCatalogIds.has(String(row.catalog_id))),
      "R41_OFFICIAL_SURFACE_MANIFEST_SEARCH_PARITY_RED");

    const groupConflicts = Number((await client.query(`
      with source_group as (
        select search_release_id,group_id,concat_ws('|',group_name_ru,domain_id,system_id,
          subsystem_id,assembly_id,work_family_id,breadcrumb::text) identity
        from public.estimate_search_group where search_release_id=any($1::uuid[])
      ) select count(*)::int count from (
        select group_id from source_group group by group_id having count(distinct identity)>1
      ) conflict
    `, [searchReleaseIds])).rows[0].count);
    invariant(groupConflicts === 0, "R41_OFFICIAL_SURFACE_GROUP_METADATA_CONFLICT");
    const searchGroups = new Set(searchRows.map((row) => String(row.group_id))).size;
    invariant(searchGroups === EXPECTED.searchGroups, "R41_OFFICIAL_SURFACE_SEARCH_GROUP_DENOMINATOR_RED");

    const manifestDigest = rowDigest(manifestRows, [
      "release_id", "catalog_id", "definition_version_id", "entry_sha256", "definition_hash",
    ]);
    const searchDigest = rowDigest(searchRows, [
      "search_release_id", "catalog_id", "group_id", "document_sha256", "definition_version_id",
    ]);
    const aggregateIdentity = sha256(JSON.stringify({
      masterSha256: MASTER_SHA256,
      backendAggregateSha256: sha256(readFileSync(BACKEND_AGGREGATE)),
      sourceHead,
      sourceTree,
      releases: sourceBindings.map((row) => ({
        releaseId: row.release_id,
        manifestSha256: row.source_manifest_sha256,
        searchReleaseId: row.search_release_id,
        searchSnapshotSha256: row.snapshot_sha256,
      })),
      manifestDigest,
      searchDigest,
    }));
    const releaseKey = `r4-official-surface-aggregate-r41-${aggregateIdentity.slice(0, 12)}`;
    const searchReleaseKey = `${releaseKey}-search`;
    const releaseId = deterministicUuid(`definition:${releaseKey}:${aggregateIdentity}`);
    const searchReleaseId = deterministicUuid(`search:${searchReleaseKey}:${aggregateIdentity}`);
    const sourcePackageSha256 = sha256(`${MASTER_SHA256}:${aggregateIdentity}:canonical-data-only`);

    const modelCounts = (await client.query(`
      with definitions as (
        select distinct definition_version_id id
        from public.estimate_cumulative_manifest_entry where release_id=any($1::uuid[])
      ) select
        (select count(*)::int from definitions) definitions,
        (select count(*)::int from public.estimate_parameter_definition row
          where row.definition_version_id in(select id from definitions)) parameters,
        (select count(*)::int from public.estimate_formula_graph row
          where row.definition_version_id in(select id from definitions)) formulas,
        (select count(*)::int from public.estimate_resource_spec row
          where row.definition_version_id in(select id from definitions)) resources
    `, [releaseIds])).rows[0] as Json;
    invariant(modelCounts.definitions === EXPECTED.manifestEntries,
      "R41_OFFICIAL_SURFACE_MODEL_DEFINITION_DENOMINATOR_RED");

    await client.query("begin");
    await client.query("set local lock_timeout='5s'");
    try {
      await client.query(`
        insert into public.estimate_definition_release(
          id,release_key,schema_version,status,source_commit,source_tree,
          source_manifest_sha256,definition_count,resource_row_count,metadata,
          sealed_at,parent_release_id,source_package_sha256,parameter_count,formula_count
        ) values($1,$2,6,'draft',$3,$4,$5,$6,$7,$8::jsonb,null,null,$9,$10,$11)
        on conflict(release_key) do nothing
      `, [releaseId, releaseKey, sourceHead, sourceTree, aggregateIdentity,
        modelCounts.definitions, modelCounts.resources, JSON.stringify({
          contract: "r4.1-official-surface-aggregate-candidate.v1",
          masterSha256: MASTER_SHA256,
          backendAggregateMasterSha256: BACKEND_AGGREGATE_MASTER_SHA256,
          sourceReleaseIds: releaseIds,
          sourceSearchReleaseIds: searchReleaseIds,
          localDisposable: true,
          activationAllowed: false,
          compilerOwner: "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
        }), sourcePackageSha256, modelCounts.parameters, modelCounts.formulas]);
      const boundRelease = (await client.query(
        "select id::text,status,source_manifest_sha256 from public.estimate_definition_release where release_key=$1 for update",
        [releaseKey],
      )).rows[0] as Json;
      invariant(boundRelease.id === releaseId && ["draft", "prepared"].includes(String(boundRelease.status))
        && boundRelease.source_manifest_sha256 === aggregateIdentity,
      "R41_OFFICIAL_SURFACE_AGGREGATE_RELEASE_DRIFT");

      await client.query(`
        insert into public.estimate_search_index_release(
          id,release_key,status,taxonomy_version,group_relation_version,
          ranking_contract_version,source_commit,source_tree,snapshot_sha256,
          global_count,external_count,discovered_count,metadata
        ) values($1,$2,'draft','r4.1-global-aggregate','r4.1-global-aggregate',
          'server-owned-r58',$3,$4,$5,$6,$7,0,$8::jsonb)
        on conflict(release_key) do nothing
      `, [searchReleaseId, searchReleaseKey, sourceHead, sourceTree, searchDigest,
        EXPECTED.selectableDocuments, EXPECTED.externalDocuments, JSON.stringify({
          contract: "r4.1-official-surface-aggregate-search.v1",
          masterSha256: MASTER_SHA256,
          parentSearchReleaseIds: searchReleaseIds,
          aggregateIdentity,
          localDisposable: true,
        })]);
      const boundSearchRelease = (await client.query(
        "select id::text,status,snapshot_sha256 from public.estimate_search_index_release where release_key=$1 for update",
        [searchReleaseKey],
      )).rows[0] as Json;
      invariant(boundSearchRelease.id === searchReleaseId && boundSearchRelease.status === "draft"
        && boundSearchRelease.snapshot_sha256 === searchDigest,
      "R41_OFFICIAL_SURFACE_AGGREGATE_SEARCH_RELEASE_DRIFT");

      await client.query(`
        insert into public.estimate_cumulative_manifest_entry(
          release_id,catalog_id,definition_version_id,source_batch,source_release_id,
          domain_id,publication_state,approved_template_baseline_id,baseline_ready,
          scenario_ready,definition_hash,entry_sha256,runtime_publication_state
        ) select $1::uuid,source.catalog_id,source.definition_version_id,source.source_batch,
          source.source_release_id,source.domain_id,source.publication_state,
          source.approved_template_baseline_id,source.baseline_ready,source.scenario_ready,
          source.definition_hash,
          encode(extensions.digest(convert_to(concat_ws('|',$1::uuid::text,source.catalog_id,
            source.definition_version_id::text,source.entry_sha256),'UTF8'),'sha256'),'hex'),
          'CANDIDATE'
        from public.estimate_cumulative_manifest_entry source
        where source.release_id=any($2::uuid[])
          and exists(select 1 from public.estimate_definition_release target
            where target.id=$1::uuid and target.status='draft')
        on conflict(release_id,catalog_id) do nothing
      `, [releaseId, releaseIds]);

      await client.query(`
        with source_groups as (
          select distinct on(source.group_id) source.*
          from public.estimate_search_group source
          where source.search_release_id=any($2::uuid[])
          order by source.group_id,array_position($2::uuid[],source.search_release_id)
        ),selected_documents as (
          select document.group_id,document.catalog_id
          from public.estimate_search_document document
          where document.search_release_id=any($2::uuid[])
        ),group_counts as (
          select group_id,count(*)::int member_count,
            encode(extensions.digest(convert_to(string_agg(catalog_id,E'\\n' order by catalog_id),
              'UTF8'),'sha256'),'hex') member_set_sha256
          from selected_documents group by group_id
        ) insert into public.estimate_search_group(
          search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,
          assembly_id,work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
        ) select $1,source.group_id,source.group_name_ru,source.domain_id,source.system_id,
          source.subsystem_id,source.assembly_id,source.work_family_id,source.breadcrumb,
          counts.member_count,counts.member_set_sha256,
          jsonb_build_object('decision','AGGREGATED_FROM_BACKEND_GREEN_BATCHES',
            'masterSha256',$3::text,'memberCount',counts.member_count)
        from source_groups source join group_counts counts using(group_id)
        on conflict(search_release_id,group_id) do nothing
      `, [searchReleaseId, searchReleaseIds, MASTER_SHA256]);

      await client.query(`
        insert into public.estimate_search_document(
          search_release_id,catalog_id,domain_id,system_id,subsystem_id,assembly_id,
          work_family_id,group_id,subgroup_id,element_type,operation_kind,
          technology_variant,construction_state,primary_uom,canonical_name_ru,aliases,
          normative_classifiers,applicability_tags,publication_state,catalog_origin,
          definition_release_id,short_scope_ru,key_distinguishing_parameters,
          required_inputs_count,clarification_fields,included_boundaries,excluded_boundaries,
          replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,
          normalized_aliases,normalized_search_terms,normalized_search_blob,
          source_provenance,document_sha256,adjudication_class,selectable,
          canonical_target_catalog_id,definition_version_id
        ) select $1,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
          group_id,subgroup_id,element_type,operation_kind,technology_variant,
          construction_state,primary_uom,canonical_name_ru,aliases,normative_classifiers,
          applicability_tags,publication_state,catalog_origin,definition_release_id,
          short_scope_ru,key_distinguishing_parameters,required_inputs_count,
          clarification_fields,included_boundaries,excluded_boundaries,replacement_catalog_id,
          normalized_catalog_id,normalized_canonical_name,normalized_aliases,
          normalized_search_terms,normalized_search_blob,source_provenance,document_sha256,
          adjudication_class,selectable,canonical_target_catalog_id,definition_version_id
        from public.estimate_search_document
        where search_release_id=any($2::uuid[])
        on conflict(search_release_id,catalog_id) do nothing
      `, [searchReleaseId, searchReleaseIds]);

      await client.query(`
        with selected as (
          select document.search_release_id source_search_release_id,document.group_id,
            document.catalog_id,row_number() over(partition by document.group_id
              order by document.catalog_id)-1 ordinal
          from public.estimate_search_document document
          where document.search_release_id=any($2::uuid[])
        ) insert into public.estimate_search_group_membership(
          search_release_id,group_id,catalog_id,ordinal,independent_disposition
        ) select $1,selected.group_id,selected.catalog_id,selected.ordinal,
          coalesce(source.independent_disposition,
            jsonb_build_object('decision','AGGREGATED_FROM_BACKEND_GREEN_BATCHES'))
        from selected left join public.estimate_search_group_membership source
          on source.search_release_id=selected.source_search_release_id
          and source.group_id=selected.group_id and source.catalog_id=selected.catalog_id
        on conflict(search_release_id,group_id,catalog_id) do nothing
      `, [searchReleaseId, searchReleaseIds]);

      await client.query(`
        insert into public.estimate_search_typed_relation(
          search_release_id,source_catalog_id,target_catalog_id,relationship_type,direction,
          source_locator,applicability_predicate,required_when,mutually_exclusive_with,
          explanation_ru,relation_sha256
        ) select $1,relation.source_catalog_id,relation.target_catalog_id,
          relation.relationship_type,relation.direction,relation.source_locator,
          relation.applicability_predicate,relation.required_when,relation.mutually_exclusive_with,
          relation.explanation_ru,relation.relation_sha256
        from public.estimate_search_typed_relation relation
        where relation.search_release_id=any($2::uuid[])
          and exists(select 1 from public.estimate_search_document source
            where source.search_release_id=$1 and source.catalog_id=relation.source_catalog_id)
          and exists(select 1 from public.estimate_search_document target
            where target.search_release_id=$1 and target.catalog_id=relation.target_catalog_id)
        on conflict(search_release_id,source_catalog_id,target_catalog_id,relationship_type) do nothing
      `, [searchReleaseId, searchReleaseIds]);

      await client.query(`update public.estimate_definition_release
        set status='prepared',sealed_at=coalesce(sealed_at,now())
        where id=$1 and status='draft'`, [releaseId]);

      let capability = (await client.query(`
        select * from public.estimate_candidate_capability_r3
        where release_id=$1 and search_release_id=$2 and revoked_at is null
          and expires_at>now()+interval '24 hours'
        order by expires_at desc limit 1
      `, [releaseId, searchReleaseId])).rows[0] as Json | undefined;
      if (!capability) {
        capability = (await client.query(`
          insert into public.estimate_candidate_capability_r3(
            environment,tenant_id,release_id,search_release_id,expires_at,purpose,
            source_head,source_tree,issued_by
          ) values('r41d11-official-surface-aggregate',
            '22222222-2222-4222-8222-222222222222',$1,$2,now()+interval '7 days',
            'estimate_candidate_admission_r3',$3,$4,
            'prepareR4OfficialSurfaceAggregateCandidate') returning *
        `, [releaseId, searchReleaseId, sourceHead, sourceTree])).rows[0] as Json;
      }

      const counts = await aggregateCounts(client, releaseId, searchReleaseId);
      invariant(counts.manifest_entries === EXPECTED.manifestEntries
        && counts.manifest_ready === EXPECTED.manifestEntries
        && counts.direct_definitions === 0
        && counts.search_documents === EXPECTED.searchDocuments
        && counts.selectable_documents === EXPECTED.selectableDocuments
        && counts.external_documents === EXPECTED.externalDocuments
        && counts.search_groups === EXPECTED.searchGroups
        && counts.memberships === EXPECTED.searchDocuments,
      `R41_OFFICIAL_SURFACE_APPLIED_DENOMINATOR_RED:${JSON.stringify(counts)}`);
      const activeReleaseCountAfter = Number((await client.query(
        "select count(*) count from public.estimate_definition_release where status='active'",
      )).rows[0].count);
      invariant(activeReleaseCountAfter === activeReleaseCountBefore,
        "R41_OFFICIAL_SURFACE_ACTIVE_RELEASE_MUTATED");

      evidence = {
        schemaVersion: "r4.1-official-surface-aggregate-candidate.v1",
        capturedAt: new Date().toISOString(),
        status: APPLY
          ? "GREEN_R41_OFFICIAL_SURFACE_AGGREGATE_CANDIDATE_PREPARED_NOT_ACTIVE"
          : "GREEN_R41_OFFICIAL_SURFACE_AGGREGATE_DRY_RUN_ROLLED_BACK",
        masterSha256: MASTER_SHA256,
        backendAggregateMasterSha256: BACKEND_AGGREGATE_MASTER_SHA256,
        database: new URL(DATABASE_URL).pathname.replace(/^\//u, ""),
        sourceHead,
        sourceTree,
        aggregateIdentity,
        sourceBindings,
        release: {
          id: releaseId,
          key: releaseKey,
          status: "prepared",
          directDefinitionRows: 0,
          activationPerformed: false,
        },
        searchRelease: { id: searchReleaseId, key: searchReleaseKey, status: "draft" },
        capability: {
          id: capability.id,
          environment: capability.environment,
          tenantId: capability.tenant_id,
          releaseId: capability.release_id,
          searchReleaseId: capability.search_release_id,
          expiresAt: capability.expires_at,
          purpose: capability.purpose,
          sourceHead: capability.source_head,
          sourceTree: capability.source_tree,
        },
        modelCounts,
        counts,
        expected: EXPECTED,
        sourceManifestDigest: manifestDigest,
        sourceSearchDigest: searchDigest,
        writesApplied: APPLY,
        productionAccessed: false,
        productionDeployed: false,
        productionReleased: false,
        fallbackCreated: false,
        secondCompilerCreated: false,
        runtimeOwner: "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
      };
      if (APPLY) await client.query("commit");
      else await client.query("rollback");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  } finally {
    await client.end();
  }

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    status: evidence.status,
    database: evidence.database,
    release: evidence.release,
    searchRelease: evidence.searchRelease,
    capability: evidence.capability,
    modelCounts: evidence.modelCounts,
    counts: evidence.counts,
    evidencePath: OUTPUT,
    productionAccessed: false,
    productionDeployed: false,
    productionReleased: false,
  }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
