import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.batch001-measured-area-cumulative-successor.v1";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const MASTER_PATH = resolve(process.env.R4A13_MASTER_PATH
  ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (23).md");
const MASTER_SHA256 = process.env.R4A13_MASTER_SHA256
  ?? "f02577c56d436913fd347a480a9ec45b25d25f25cc2b31eae2d0c2ae29c79fde";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const SOURCE_RECEIPT_PATH = resolve(process.env.R4A13_BATCH001_SOURCE_RECEIPT
  ?? ".release-runtime/r4a13-6/s19-first-estimate/batch001-bulkhead-measured-area-source-v1/BATCH001_BACKEND_REVISION_PARITY_R56.json");
const OUTPUT_ROOT = resolve(process.env.R4A13_OUTPUT_ROOT
  ?? ".release-runtime/r4a13-6/s19-first-estimate/batch001-bulkhead-measured-area-cumulative-v1");
const APPLY = process.argv.includes("--apply");
const ALLOW_HASHED_DIRTY_SOURCE = process.env.R4A13_ALLOW_HASHED_DIRTY_SOURCE === "true";
const SOURCE_PATHS = [
  "src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadSuccessorR3.ts",
  "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
  "scripts/estimate/batch001008R3/batch001DrywallGoldFixtureR3.ts",
  "scripts/estimate/r4a13/prepareBatch001MeasuredAreaCumulativeSuccessor.ts",
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : JSON.stringify(stable(value)))
    .digest("hex");
}

function uuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function git(...args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const pending = `${path}.pending-${process.pid}`;
  writeFileSync(pending, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(pending, path);
}

function exactDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `STOP_BATCH001_CUMULATIVE_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_BATCH001_CUMULATIVE_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
}

function targetCatalogId(sourceCatalogId: string): string {
  return sourceCatalogId.startsWith("canonical-work:")
    ? sourceCatalogId
    : `canonical-work:base:${sourceCatalogId}`;
}

async function cloneSearch(client: Client, input: {
  releaseId: string;
  searchReleaseId: string;
  parentSearchReleaseId: string;
  sourceSearchReleaseId: string;
  releaseKey: string;
  head: string;
  tree: string;
  fingerprint: string;
}): Promise<Json> {
  await client.query(`insert into public.estimate_search_index_release(
      id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,
      source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata)
    select $1,$2,'draft',taxonomy_version,group_relation_version,ranking_contract_version,
      $3,$4,$5,global_count,external_count,discovered_count,
      metadata||jsonb_build_object('contract',$6::text,'parentSearchReleaseId',$7::uuid::text,
        'definitionReleaseId',$8::uuid::text,'sourceFingerprint',$9::text,
        'batch001SourceSearchReleaseId',$10::uuid::text,'lifecycle','PREPARED_NOT_ACTIVE',
        'activationAllowed',false,'productionEligible',false)
    from public.estimate_search_index_release where id=$7`, [
    input.searchReleaseId,
    `${input.releaseKey}-search`,
    input.head,
    input.tree,
    sha256(`${input.searchReleaseId}:draft`),
    CONTRACT,
    input.parentSearchReleaseId,
    input.releaseId,
    input.fingerprint,
    input.sourceSearchReleaseId,
  ]);
  for (const [table, columns] of [
    ["estimate_search_group", "group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition"],
    ["estimate_search_clarification_question", "question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence"],
  ] as const) {
    await client.query(`insert into public.${table}(search_release_id,${columns})
      select $1,${columns} from public.${table} where search_release_id=$2`, [
      input.searchReleaseId,
      input.parentSearchReleaseId,
    ]);
  }
  await client.query(`insert into public.estimate_search_document(
      search_release_id,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
      group_id,subgroup_id,element_type,operation_kind,technology_variant,construction_state,
      primary_uom,canonical_name_ru,aliases,normative_classifiers,applicability_tags,publication_state,
      catalog_origin,definition_release_id,short_scope_ru,key_distinguishing_parameters,
      required_inputs_count,clarification_fields,included_boundaries,excluded_boundaries,
      replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,normalized_aliases,
      normalized_search_terms,normalized_search_blob,source_provenance,document_sha256,
      adjudication_class,selectable,canonical_target_catalog_id,definition_version_id)
    select $1,source.catalog_id,source.domain_id,source.system_id,source.subsystem_id,source.assembly_id,
      source.work_family_id,source.group_id,source.subgroup_id,source.element_type,source.operation_kind,
      source.technology_variant,source.construction_state,source.primary_uom,source.canonical_name_ru,
      source.aliases,source.normative_classifiers,source.applicability_tags,source.publication_state,
      source.catalog_origin,$2::uuid,source.short_scope_ru,source.key_distinguishing_parameters,
      source.required_inputs_count,source.clarification_fields,source.included_boundaries,
      source.excluded_boundaries,source.replacement_catalog_id,source.normalized_catalog_id,
      source.normalized_canonical_name,source.normalized_aliases,source.normalized_search_terms,
      source.normalized_search_blob,source.source_provenance||jsonb_build_object('contract',$3::text,
        'parentSearchReleaseId',$4::uuid::text,'definitionReleaseId',$2::uuid::text,
        'sourceFingerprint',$5::text),
      encode(extensions.digest(convert_to(source.document_sha256||':'||$3||':'||$2::uuid::text,'UTF8'),'sha256'),'hex'),
      source.adjudication_class,source.selectable,source.canonical_target_catalog_id,manifest.definition_version_id
    from public.estimate_search_document source
    join public.estimate_cumulative_manifest_entry manifest
      on manifest.release_id=$2 and manifest.catalog_id=source.catalog_id
    where source.search_release_id=$4`, [
    input.searchReleaseId,
    input.releaseId,
    CONTRACT,
    input.parentSearchReleaseId,
    input.fingerprint,
  ]);
  for (const [table, columns] of [
    ["estimate_search_group_membership", "group_id,catalog_id,ordinal,independent_disposition"],
    ["estimate_search_typed_relation", "source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256"],
  ] as const) {
    await client.query(`insert into public.${table}(search_release_id,${columns})
      select $1,${columns} from public.${table} where search_release_id=$2`, [
      input.searchReleaseId,
      input.parentSearchReleaseId,
    ]);
  }
  await client.query(`update public.estimate_search_document target set
      domain_id=source.domain_id,system_id=source.system_id,subsystem_id=source.subsystem_id,
      assembly_id=source.assembly_id,work_family_id=source.work_family_id,
      subgroup_id=source.subgroup_id,element_type=source.element_type,
      operation_kind=source.operation_kind,technology_variant=source.technology_variant,
      construction_state=source.construction_state,primary_uom=source.primary_uom,
      canonical_name_ru=source.canonical_name_ru,aliases=source.aliases,
      normative_classifiers=source.normative_classifiers,applicability_tags=source.applicability_tags,
      short_scope_ru=source.short_scope_ru,key_distinguishing_parameters=source.key_distinguishing_parameters,
      required_inputs_count=source.required_inputs_count,clarification_fields=source.clarification_fields,
      included_boundaries=source.included_boundaries,excluded_boundaries=source.excluded_boundaries,
      normalized_canonical_name=source.normalized_canonical_name,
      normalized_aliases=source.normalized_aliases,normalized_search_terms=source.normalized_search_terms,
      normalized_search_blob=source.normalized_search_blob,
      source_provenance=target.source_provenance||jsonb_build_object(
        'batch001SourceSearchReleaseId',$2::uuid::text,'batch001SourceCatalogId',source.catalog_id),
      document_sha256=encode(extensions.digest(convert_to(
        source.document_sha256||':'||$3||':'||target.definition_version_id::text,'UTF8'),'sha256'),'hex')
    from public.estimate_search_document source
    where target.search_release_id=$1 and source.search_release_id=$2
      and target.catalog_id='canonical-work:base:'||source.catalog_id`, [
    input.searchReleaseId,
    input.sourceSearchReleaseId,
    CONTRACT,
  ]);
  const snapshot = (await client.query(`select count(*)::int documents,
      encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot_sha256
    from public.estimate_search_document where search_release_id=$1`, [input.searchReleaseId])).rows[0] as Json;
  await client.query(`update public.estimate_search_index_release set snapshot_sha256=$2,
    metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
    input.searchReleaseId,
    snapshot.snapshot_sha256,
    JSON.stringify({ documentCount: snapshot.documents, batch001MeasuredAreaTargetCount: 16 }),
  ]);
  return snapshot;
}

async function auditCandidate(client: Client, input: {
  releaseId: string;
  predecessorReleaseId: string;
  searchReleaseId: string;
  targetCatalogIds: readonly string[];
}): Promise<Json> {
  const release = (await client.query(`select id::text,status,activated_at,definition_count,
      parameter_count,formula_count,resource_row_count,source_manifest_sha256,metadata
    from public.estimate_definition_release where id=$1`, [input.releaseId])).rows[0] as Json;
  const manifest = (await client.query(`select count(*)::int identities,
      count(*) filter(where catalog_id=any($2::text[]) and source_batch=$3)::int targets,
      encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot
    from public.estimate_cumulative_manifest_entry where release_id=$1`, [
    input.releaseId,
    input.targetCatalogIds,
    CONTRACT,
  ])).rows[0] as Json;
  const unrelated = (await client.query(`select count(*)::int changed
    from public.estimate_cumulative_manifest_entry parent
    join public.estimate_cumulative_manifest_entry successor using(catalog_id)
    where parent.release_id=$1 and successor.release_id=$2 and not(parent.catalog_id=any($3::text[]))
      and (parent.definition_version_id<>successor.definition_version_id
        or parent.source_batch<>successor.source_batch
        or parent.source_release_id<>successor.source_release_id
        or parent.approved_template_baseline_id<>successor.approved_template_baseline_id
        or parent.runtime_publication_state<>successor.runtime_publication_state)`, [
    input.predecessorReleaseId,
    input.releaseId,
    input.targetCatalogIds,
  ])).rows[0] as Json;
  const measuredArea = (await client.query(`select
      count(distinct manifest.catalog_id)::int definitions,
      count(distinct definition.id) filter(where parameter.parameter_id='area_m2'
        and parameter.truth_metadata->>'visibility_role'='USER_INPUT'
        and parameter.truth_metadata->>'value_source_role'='USER_MEASURED')::int measured_parameters,
      count(distinct definition.id) filter(where formula.expression_source='area_m2'
        and formula.input_parameter_ids=array['area_m2']::text[])::int direct_work_formulas,
      count(distinct definition.id) filter(where resource.category='construction_work'
        and formula.expression_source='area_m2')::int measured_work_rows
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
    join public.estimate_parameter_definition parameter on parameter.definition_version_id=definition.id
      and parameter.parameter_id='area_m2'
    join public.estimate_formula_graph formula on formula.definition_version_id=definition.id
      and formula.expression_source='area_m2'
    join public.estimate_resource_spec resource on resource.definition_version_id=definition.id
      and resource.formula_id=formula.formula_id
    where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])`, [
    input.releaseId,
    input.targetCatalogIds,
  ])).rows[0] as Json;
  const search = (await client.query(`select release.status,release.snapshot_sha256,
      release.metadata->>'definitionReleaseId' definition_release_id,
      release.global_count,release.external_count,
      count(document.*)::int documents,
      count(*) filter(where document.catalog_id=any($2::text[])
        and document.definition_version_id=manifest.definition_version_id)::int target_bindings
    from public.estimate_search_index_release release
    join public.estimate_search_document document on document.search_release_id=release.id
    join public.estimate_cumulative_manifest_entry manifest
      on manifest.release_id=$3 and manifest.catalog_id=document.catalog_id
    where release.id=$1 group by release.id`, [
    input.searchReleaseId,
    input.targetCatalogIds,
    input.releaseId,
  ])).rows[0] as Json;
  invariant(release?.status === "prepared" && release.activated_at == null,
    `STOP_BATCH001_CUMULATIVE_RELEASE_AUDIT:${JSON.stringify(release)}`);
  invariant(Number(manifest.identities) === Number(release.definition_count)
    && Number(manifest.targets) === 16,
  `STOP_BATCH001_CUMULATIVE_MANIFEST_AUDIT:${JSON.stringify(manifest)}`);
  invariant(Number(unrelated.changed) === 0,
    `STOP_BATCH001_CUMULATIVE_UNRELATED_DRIFT:${unrelated.changed}`);
  invariant(Number(measuredArea.definitions) === 16
    && Number(measuredArea.measured_parameters) === 16
    && Number(measuredArea.direct_work_formulas) === 16
    && Number(measuredArea.measured_work_rows) === 16,
  `STOP_BATCH001_CUMULATIVE_MEASURED_AREA_AUDIT:${JSON.stringify(measuredArea)}`);
  invariant(search?.status === "draft" && search.definition_release_id === input.releaseId
    && Number(search.documents) === Number(search.global_count)
    && Number(search.target_bindings) === 16,
  `STOP_BATCH001_CUMULATIVE_SEARCH_AUDIT:${JSON.stringify(search)}`);
  return {
    release,
    manifest,
    unrelatedManifestChanges: Number(unrelated.changed),
    measuredArea,
    search,
  };
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(existsSync(MASTER_PATH) && sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256,
    "STOP_BATCH001_CUMULATIVE_MASTER_SHA256_DRIFT");
  invariant(existsSync(CURRENT_RELEASE_PATH) && existsSync(SOURCE_RECEIPT_PATH),
    "STOP_BATCH001_CUMULATIVE_REQUIRED_INPUT_MISSING");
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH,
    "STOP_BATCH001_CUMULATIVE_BRANCH_DRIFT");
  for (const path of SOURCE_PATHS) {
    invariant(existsSync(resolve(path)), `STOP_BATCH001_CUMULATIVE_SOURCE_MISSING:${path}`);
  }
  const dirtySourcePaths = SOURCE_PATHS.filter((path) => git("status", "--short", "--", path) !== "");
  invariant(dirtySourcePaths.length === 0 || ALLOW_HASHED_DIRTY_SOURCE,
    `STOP_BATCH001_CUMULATIVE_DIRTY_SOURCE_REQUIRES_EXPLICIT_OPT_IN:${dirtySourcePaths.join(",")}`);
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const sourceHashes = SOURCE_PATHS.map((path) => ({
    path,
    sha256: sha256(readFileSync(resolve(path))),
    trackedState: git("status", "--short", "--", path) || "CLEAN_AT_HEAD",
  }));
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  const sourceReceipt = JSON.parse(readFileSync(SOURCE_RECEIPT_PATH, "utf8")) as Json;
  invariant(current.productionAccessed === false,
    "STOP_BATCH001_CUMULATIVE_PRODUCTION_ACCESS_FLAG");
  invariant(sourceReceipt.status === "GREEN_R4_BATCH001_CANDIDATE_SOURCE_PREPARED_NOT_ACTIVE"
    && Number(sourceReceipt.counts?.definitions) === 16
    && Number(sourceReceipt.counts?.parameters) === 502
    && Number(sourceReceipt.counts?.formulas) === 219
    && Number(sourceReceipt.counts?.resources) === 220,
  "STOP_BATCH001_CUMULATIVE_SOURCE_RECEIPT_INVALID");
  const sourceReleaseId = String(sourceReceipt.releaseId);
  const sourceSearchReleaseId = String(sourceReceipt.searchReleaseId);
  const predecessorReleaseId = String(current.definitionReleaseId);
  const predecessorSearchReleaseId = String(current.searchReleaseId);
  const fingerprint = sha256({
    contract: CONTRACT,
    masterSha256: MASTER_SHA256,
    predecessorReleaseId,
    predecessorSearchReleaseId,
    sourceReleaseId,
    sourceSearchReleaseId,
    sourceReceiptSha256: sha256(readFileSync(SOURCE_RECEIPT_PATH)),
    sourceHashes,
  });
  const releaseId = uuid(`${CONTRACT}:${fingerprint}:definition-release`);
  const searchReleaseId = uuid(`${CONTRACT}:${fingerprint}:search-release`);
  const releaseKey = `${CONTRACT}:${fingerprint.slice(0, 20)}`;

  const client = new Client({ connectionString: DATABASE_URL,
    application_name: "r4-a13-6-batch001-measured-area-cumulative-successor" });
  await client.connect();
  let receipt: Json;
  try {
    const predecessor = (await client.query(
      "select * from public.estimate_definition_release where id=$1",
      [predecessorReleaseId],
    )).rows[0] as Json | undefined;
    const predecessorSearch = (await client.query(
      "select * from public.estimate_search_index_release where id=$1",
      [predecessorSearchReleaseId],
    )).rows[0] as Json | undefined;
    const sourceRelease = (await client.query(
      "select * from public.estimate_definition_release where id=$1",
      [sourceReleaseId],
    )).rows[0] as Json | undefined;
    const sourceSearch = (await client.query(
      "select * from public.estimate_search_index_release where id=$1",
      [sourceSearchReleaseId],
    )).rows[0] as Json | undefined;
    invariant(predecessor?.status === "prepared" && predecessor.activated_at == null,
      "STOP_BATCH001_CUMULATIVE_PREDECESSOR_NOT_PREPARED_INACTIVE");
    invariant(predecessorSearch?.status === "draft"
      && predecessorSearch.metadata?.definitionReleaseId === predecessorReleaseId,
    "STOP_BATCH001_CUMULATIVE_PREDECESSOR_SEARCH_DRIFT");
    invariant(sourceRelease?.status === "prepared" && sourceRelease.activated_at == null
      && Number(sourceRelease.definition_count) === 16,
    "STOP_BATCH001_CUMULATIVE_SOURCE_RELEASE_DRIFT");
    invariant(sourceSearch?.status === "draft" && Number(sourceSearch.global_count) === 16,
      "STOP_BATCH001_CUMULATIVE_SOURCE_SEARCH_DRIFT");

    const sourceRows = (await client.query(`select source.id::text source_definition_id,
        source.catalog_id source_catalog_id,source.definition_sha256 source_definition_sha256,
        baseline.id::text source_baseline_id,
        (select manifest.approved_template_baseline_id::text
          from public.estimate_cumulative_manifest_entry manifest
          where manifest.release_id=$2 and manifest.catalog_id='canonical-work:base:'||source.catalog_id)
          predecessor_baseline_id,
        (select count(*)::int from public.estimate_parameter_definition parameter
          where parameter.definition_version_id=source.id) source_parameters,
        (select count(*)::int from public.estimate_formula_graph formula
          where formula.definition_version_id=source.id) source_formulas,
        (select count(*)::int from public.estimate_resource_spec resource
          where resource.definition_version_id=source.id) source_resources,
        (select coalesce(max(peer.definition_version),0)::int+1
          from public.estimate_definition_version peer
          where peer.catalog_id='canonical-work:base:'||source.catalog_id) next_definition_version
      from public.estimate_definition_version source
      join public.estimate_approved_template_baseline baseline on baseline.definition_version_id=source.id
      where source.release_id=$1 order by source.catalog_id`, [
      sourceReleaseId,
      predecessorReleaseId,
    ])).rows as Json[];
    invariant(sourceRows.length === 16
      && sourceRows.every((row) => row.predecessor_baseline_id != null),
    `STOP_BATCH001_CUMULATIVE_SOURCE_ROWS:${sourceRows.length}/16`);
    const sourceTotals = sourceRows.reduce((sum, row) => ({
      parameters: sum.parameters + Number(row.source_parameters),
      formulas: sum.formulas + Number(row.source_formulas),
      resources: sum.resources + Number(row.source_resources),
    }), { parameters: 0, formulas: 0, resources: 0 });
    invariant(sourceTotals.parameters === 502 && sourceTotals.formulas === 219
      && sourceTotals.resources === 220,
    `STOP_BATCH001_CUMULATIVE_SOURCE_TOTALS:${JSON.stringify(sourceTotals)}`);
    const mappings = sourceRows.map((source) => {
      const targetCatalog = targetCatalogId(String(source.source_catalog_id));
      const definitionId = uuid(`${CONTRACT}:${fingerprint}:definition:${targetCatalog}`);
      const baselineId = uuid(`${CONTRACT}:${fingerprint}:baseline:${targetCatalog}`);
      const definitionSha256 = sha256({
        contract: CONTRACT,
        targetCatalogId: targetCatalog,
        sourceDefinitionSha256: source.source_definition_sha256,
        sourceFingerprint: fingerprint,
      });
      return {
        sourceDefinitionId: String(source.source_definition_id),
        sourceCatalogId: String(source.source_catalog_id),
        sourceBaselineId: String(source.source_baseline_id),
        predecessorBaselineId: String(source.predecessor_baseline_id),
        targetCatalogId: targetCatalog,
        definitionId,
        baselineId,
        nextDefinitionVersion: Number(source.next_definition_version),
        definitionSha256,
        baselineAcceptanceSha256: sha256({
          contract: CONTRACT,
          targetCatalogId: targetCatalog,
          sourceBaselineId: source.source_baseline_id,
          definitionId,
          fingerprint,
        }),
        entrySha256: sha256({
          contract: CONTRACT,
          releaseId,
          targetCatalog,
          definitionId,
          baselineId,
          definitionSha256,
        }),
      };
    });
    const targetCatalogIds = mappings.map((mapping) => mapping.targetCatalogId);
    const predecessorTarget = (await client.query(`select count(*)::int definitions,
        coalesce(sum((select count(*) from public.estimate_parameter_definition parameter
          where parameter.definition_version_id=manifest.definition_version_id)),0)::int parameters,
        coalesce(sum((select count(*) from public.estimate_formula_graph formula
          where formula.definition_version_id=manifest.definition_version_id)),0)::int formulas,
        coalesce(sum((select count(*) from public.estimate_resource_spec resource
          where resource.definition_version_id=manifest.definition_version_id)),0)::int resources
      from public.estimate_cumulative_manifest_entry manifest
      where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])`, [
      predecessorReleaseId,
      targetCatalogIds,
    ])).rows[0] as Json;
    invariant(Number(predecessorTarget.definitions) === 16,
      `STOP_BATCH001_CUMULATIVE_PREDECESSOR_TARGETS:${predecessorTarget.definitions}/16`);
    const nextCounts = {
      definitions: Number(predecessor.definition_count),
      parameters: Number(predecessor.parameter_count) - Number(predecessorTarget.parameters)
        + sourceTotals.parameters,
      formulas: Number(predecessor.formula_count) - Number(predecessorTarget.formulas)
        + sourceTotals.formulas,
      resources: Number(predecessor.resource_row_count) - Number(predecessorTarget.resources)
        + sourceTotals.resources,
    };
    const existing = (await client.query(
      "select id::text,status from public.estimate_definition_release where id=$1",
      [releaseId],
    )).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.status === "prepared",
        "STOP_BATCH001_CUMULATIVE_EXISTING_SUCCESSOR_NOT_PREPARED");
      receipt = {
        status: "GREEN_BATCH001_MEASURED_AREA_CUMULATIVE_ALREADY_PREPARED_NOT_ACTIVE",
        idempotent: true,
        mutationPerformed: false,
        predecessor: { releaseId: predecessorReleaseId, searchReleaseId: predecessorSearchReleaseId },
        sourceCandidate: { releaseId: sourceReleaseId, searchReleaseId: sourceSearchReleaseId },
        successor: { releaseId, searchReleaseId, releaseKey, nextCounts },
        mappings,
        audit: await auditCandidate(client, {
          releaseId,
          predecessorReleaseId,
          searchReleaseId,
          targetCatalogIds,
        }),
      };
    } else {
      await client.query("begin");
      await client.query("set local lock_timeout='5s'");
      await client.query("set local statement_timeout='900s'");
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [CONTRACT]);
      try {
        await client.query(`create temporary table batch001_measured_area_map(
          source_definition_id uuid primary key,source_catalog_id text not null unique,
          source_baseline_id uuid not null,predecessor_baseline_id uuid not null,
          target_catalog_id text not null unique,definition_id uuid not null unique,
          baseline_id uuid not null unique,next_definition_version int not null,
          definition_sha256 text not null,baseline_acceptance_sha256 text not null,
          entry_sha256 text not null) on commit drop`);
        await client.query(`insert into batch001_measured_area_map select
          x."sourceDefinitionId"::uuid,x."sourceCatalogId",x."sourceBaselineId"::uuid,
          x."predecessorBaselineId"::uuid,x."targetCatalogId",x."definitionId"::uuid,
          x."baselineId"::uuid,x."nextDefinitionVersion",x."definitionSha256",
          x."baselineAcceptanceSha256",x."entrySha256"
          from jsonb_to_recordset($1::jsonb) as x(
            "sourceDefinitionId" text,"sourceCatalogId" text,"sourceBaselineId" text,
            "predecessorBaselineId" text,"targetCatalogId" text,"definitionId" text,
            "baselineId" text,"nextDefinitionVersion" int,"definitionSha256" text,
            "baselineAcceptanceSha256" text,"entrySha256" text)`, [JSON.stringify(mappings)]);
        await client.query(`insert into public.estimate_definition_release(
            id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
            definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,
            parameter_count,formula_count)
          select $1,$2,schema_version,'draft',$3,$4,$5,$6,$7,metadata||$8::jsonb,$9::uuid,$10,$11,$12
          from public.estimate_definition_release where id=$9`, [
          releaseId,
          releaseKey,
          head,
          tree,
          sha256(`${CONTRACT}:${fingerprint}:draft`),
          nextCounts.definitions,
          nextCounts.resources,
          JSON.stringify({
            contract: CONTRACT,
            masterSha256: MASTER_SHA256,
            lifecycle: "DRAFT_FORWARD_ONLY",
            parentReleaseId: predecessorReleaseId,
            sourceBatch001ReleaseId: sourceReleaseId,
            sourceFingerprint: fingerprint,
            sourceHashes,
            replacedDefinitionCount: 16,
            activationAllowed: false,
            productionEligible: false,
          }),
          predecessorReleaseId,
          sha256({ contract: CONTRACT, fingerprint, mappings }),
          nextCounts.parameters,
          nextCounts.formulas,
        ]);
        await client.query(`insert into public.estimate_cumulative_manifest_entry(
            release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
            publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,
            definition_hash,entry_sha256,runtime_publication_state)
          select $1,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
            publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,
            definition_hash,encode(extensions.digest(convert_to(
              $2||':'||$1::uuid::text||':'||catalog_id||':'||entry_sha256,'UTF8'),'sha256'),'hex'),
            runtime_publication_state
          from public.estimate_cumulative_manifest_entry where release_id=$3`, [
          releaseId,
          CONTRACT,
          predecessorReleaseId,
        ]);
        await client.query(`insert into public.estimate_definition_version(
            id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,
            source_metadata,content_status,content_gate_status)
          select map.definition_id,$1,map.target_catalog_id,map.next_definition_version,
            source.passport||jsonb_build_object('canonicalCatalogId',map.target_catalog_id,
              'batch001MeasuredAreaContract',$2::text),source.applicability,map.definition_sha256,
            source.source_metadata||jsonb_build_object('batch001MeasuredAreaContract',$2::text,
              'sourceDefinitionVersionId',source.id::text,'sourceCatalogId',source.catalog_id,
              'sourceFingerprint',$3::text),'QUARANTINED','RED'
          from batch001_measured_area_map map join public.estimate_definition_version source
            on source.id=map.source_definition_id`, [releaseId, CONTRACT, fingerprint]);
        await client.query(`insert into public.estimate_approved_template_baseline(
            id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,
            parameter_schema_sha256,input_values,input_classification,uom_by_parameter,
            formula_consumer_ids,resource_consumer_row_ids,normative_source_ids,guide_provenance_ru,
            proposal_source_refs,validation_scenario_refs,acceptance_evidence_sha256,
            accepted_release_id,accepted_at,supersedes_baseline_id,contract_version)
          select map.baseline_id,$2||':'||substr($3,1,16)||':'||map.target_catalog_id,
            map.target_catalog_id,map.definition_id,map.definition_id,source.parameter_schema_sha256,
            source.input_values,
            coalesce((select jsonb_object_agg(parameter_id,to_jsonb('FIXTURE_ONLY'::text))
              from jsonb_object_keys(source.input_values) parameter_id),'{}'::jsonb),
            source.uom_by_parameter,source.formula_consumer_ids,source.resource_consumer_row_ids,
            source.normative_source_ids,source.guide_provenance_ru,
            source.proposal_source_refs||jsonb_build_array(jsonb_build_object('contract',$2::text,
              'sourceBaselineId',source.id::text,'sourceCatalogId',map.source_catalog_id,
              'sourceFingerprint',$3::text)),
            source.validation_scenario_refs||jsonb_build_array(jsonb_build_object('contract',$2::text,
              'scenario','KNOWN_MEASURED_AREA_USEFUL_PRELIMINARY_WORK_ROW')),
            map.baseline_acceptance_sha256,$1,clock_timestamp(),map.predecessor_baseline_id,
            source.contract_version
          from batch001_measured_area_map map join public.estimate_approved_template_baseline source
            on source.id=map.source_baseline_id`, [releaseId, CONTRACT, fingerprint]);
        await client.query(`insert into public.estimate_parameter_definition(
            definition_version_id,parameter_id,ordinal,value_type,unit_id,title_ru,required,
            default_value,constraints_json,truth_metadata,approved_template_baseline_id)
          select map.definition_id,source.parameter_id,source.ordinal,source.value_type,source.unit_id,
            source.title_ru,source.required,source.default_value,source.constraints_json,
            source.truth_metadata||jsonb_build_object(
              'contract',$1::text,
              'semantic_parameter_key',map.target_catalog_id||':'||source.parameter_id,
              'batch001MeasuredAreaContract',$1::text,
              'preliminary_compilation_allowed',
                case when source.truth_metadata->>'visibility_role'='USER_INPUT' then true
                  else coalesce((source.truth_metadata->>'preliminary_compilation_allowed')::boolean,false) end,
              'value_source_role',case
                when source.parameter_id='area_m2' then 'USER_MEASURED'
                when source.truth_metadata->>'visibility_role'='USER_INPUT' then 'PROJECT_DOCUMENTATION'
                else coalesce(source.truth_metadata->>'value_source_role','BACKEND_DERIVED') end),map.baseline_id
          from batch001_measured_area_map map join public.estimate_parameter_definition source
            on source.definition_version_id=map.source_definition_id`, [CONTRACT]);
        await client.query(`insert into public.estimate_formula_graph(
            definition_version_id,formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256)
          select map.definition_id,source.formula_id,source.output_unit_id,source.expression_source,
            source.ast,source.input_parameter_ids,source.ast_sha256
          from batch001_measured_area_map map join public.estimate_formula_graph source
            on source.definition_version_id=map.source_definition_id`);
        await client.query(`create temporary table batch001_measured_area_resource_map(
          source_resource_id uuid primary key,target_resource_id uuid not null unique,
          definition_id uuid not null,row_id text not null) on commit drop`);
        const sourceResources = (await client.query(`select resource.id::text source_resource_id,
            map.definition_id::text,resource.row_id
          from batch001_measured_area_map map join public.estimate_resource_spec resource
            on resource.definition_version_id=map.source_definition_id
          order by map.target_catalog_id,resource.ordinal`)).rows as Json[];
        const resourceMappings = sourceResources.map((resource) => ({
          sourceResourceId: String(resource.source_resource_id),
          targetResourceId: uuid(`${CONTRACT}:${fingerprint}:resource:${resource.definition_id}:${resource.row_id}`),
          definitionId: String(resource.definition_id),
          rowId: String(resource.row_id),
        }));
        invariant(resourceMappings.length === 220,
          `STOP_BATCH001_CUMULATIVE_RESOURCE_MAPPINGS:${resourceMappings.length}/220`);
        await client.query(`insert into batch001_measured_area_resource_map select
          x."sourceResourceId"::uuid,x."targetResourceId"::uuid,x."definitionId"::uuid,x."rowId"
          from jsonb_to_recordset($1::jsonb) as x(
            "sourceResourceId" text,"targetResourceId" text,"definitionId" text,"rowId" text)`, [
          JSON.stringify(resourceMappings),
        ]);
        await client.query(`insert into public.estimate_resource_spec(
            id,definition_version_id,row_id,ordinal,section,category,title_ru,row_type,unit_id,
            formula_id,inclusion_ast,resource_graph,semantic_owner,cost_owner_id,
            procurement_eligible,source_metadata,row_sha256)
          select resource_map.target_resource_id,resource_map.definition_id,source.row_id,source.ordinal,
            source.section,source.category,source.title_ru,source.row_type,source.unit_id,source.formula_id,
            source.inclusion_ast,source.resource_graph,source.semantic_owner,source.cost_owner_id,
            source.procurement_eligible,
            source.source_metadata||jsonb_build_object('batch001MeasuredAreaContract',$1::text,
              'sourceResourceId',source.id::text,'sourceFingerprint',$2::text),
            encode(extensions.digest(convert_to(source.row_sha256||':'||$1||':'||resource_map.target_resource_id::text,
              'UTF8'),'sha256'),'hex')
          from batch001_measured_area_resource_map resource_map join public.estimate_resource_spec source
            on source.id=resource_map.source_resource_id`, [CONTRACT, fingerprint]);
        await client.query(`insert into public.estimate_work_normative_binding(
            definition_version_id,resource_spec_id,locator_id,applicability)
          select resource_map.definition_id,resource_map.target_resource_id,source.locator_id,
            source.applicability||jsonb_build_object('batch001MeasuredAreaContract',$1::text)
          from batch001_measured_area_resource_map resource_map
          join public.estimate_work_normative_binding source
            on source.resource_spec_id=resource_map.source_resource_id`, [CONTRACT]);
        await client.query(`insert into public.estimate_resource_price_route_binding(
            resource_spec_id,route_id,price_key,priority)
          select resource_map.target_resource_id,source.route_id,source.price_key,source.priority
          from batch001_measured_area_resource_map resource_map
          join public.estimate_resource_price_route_binding source
            on source.resource_spec_id=resource_map.source_resource_id`);
        await client.query(`insert into public.estimate_content_passport_r3(
            definition_version_id,release_id,catalog_id,contract_version,identity_mode,redirect_catalog_id,
            physical_result_ru,included_scope_ru,excluded_scope_ru,capability_matrix,parameter_count,
            formula_count,resource_count,decision,payload_sha256,source_head,source_tree)
          select map.definition_id,$1,map.target_catalog_id,source.contract_version,source.identity_mode,
            source.redirect_catalog_id,source.physical_result_ru,source.included_scope_ru,
            source.excluded_scope_ru,source.capability_matrix,source.parameter_count,source.formula_count,
            source.resource_count,source.decision||jsonb_build_object(
              'batch001MeasuredAreaContract',$2::text,'quantityScope','FULL',
              'priceState','PARTIAL_NEEDS_PRICE','waveContract',$2::text,
              'activationAllowed',false,'productionEligible',false),
            encode(extensions.digest(convert_to(source.payload_sha256||':'||$2||':'||map.definition_id::text,
              'UTF8'),'sha256'),'hex'),$3,$4
          from batch001_measured_area_map map join public.estimate_content_passport_r3 source
            on source.definition_version_id=map.source_definition_id`, [releaseId, CONTRACT, head, tree]);
        await client.query(`update public.estimate_definition_version target set
            content_status=source.content_status,content_gate_status=source.content_gate_status
          from batch001_measured_area_map map join public.estimate_definition_version source
            on source.id=map.source_definition_id
          where target.id=map.definition_id`);
        await client.query(`update public.estimate_cumulative_manifest_entry target set
            definition_version_id=map.definition_id,approved_template_baseline_id=map.baseline_id,
            source_batch=$2,source_release_id=$1,publication_state='CANONICAL_SUCCESSOR',
            baseline_ready=true,scenario_ready=true,definition_hash=map.definition_sha256,
            entry_sha256=map.entry_sha256,runtime_publication_state='CANDIDATE'
          from batch001_measured_area_map map
          where target.release_id=$1 and target.catalog_id=map.target_catalog_id`, [releaseId, CONTRACT]);
        const search = await cloneSearch(client, {
          releaseId,
          searchReleaseId,
          parentSearchReleaseId: predecessorSearchReleaseId,
          sourceSearchReleaseId,
          releaseKey,
          head,
          tree,
          fingerprint,
        });
        const manifest = (await client.query(`select encode(extensions.digest(convert_to(
            string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') manifest_snapshot_sha256
          from public.estimate_cumulative_manifest_entry where release_id=$1`, [releaseId])).rows[0] as Json;
        await client.query(`update public.estimate_definition_release set
            source_manifest_sha256=$2,status='prepared',sealed_at=clock_timestamp(),
            metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
          releaseId,
          manifest.manifest_snapshot_sha256,
          JSON.stringify({
            lifecycle: "PREPARED_NOT_ACTIVE",
            searchReleaseId,
            searchSnapshotSha256: search.snapshot_sha256,
            batch001MeasuredAreaDefinitions: "16/16",
            areaMeasuredWorkRows: "16/16",
          }),
        ]);
        const terminalAudit = await auditCandidate(client, {
          releaseId,
          predecessorReleaseId,
          searchReleaseId,
          targetCatalogIds,
        });
        if (APPLY) await client.query("commit");
        else await client.query("rollback");
        receipt = {
          status: APPLY
            ? "GREEN_BATCH001_MEASURED_AREA_CUMULATIVE_PREPARED_NOT_ACTIVE"
            : "DRY_RUN_BATCH001_MEASURED_AREA_CUMULATIVE_VALIDATED",
          idempotent: false,
          mutationPerformed: APPLY,
          predecessor: {
            releaseId: predecessorReleaseId,
            searchReleaseId: predecessorSearchReleaseId,
            targetCounts: predecessorTarget,
          },
          sourceCandidate: { releaseId: sourceReleaseId, searchReleaseId: sourceSearchReleaseId },
          successor: { releaseId, searchReleaseId, releaseKey, nextCounts },
          mappings,
          audit: terminalAudit,
        };
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
      if (!APPLY) {
        const residue = Number((await client.query(`select
            (select count(*) from public.estimate_definition_release where id=$1)+
            (select count(*) from public.estimate_search_index_release where id=$2) value`, [
          releaseId,
          searchReleaseId,
        ])).rows[0].value);
        invariant(residue === 0, `STOP_BATCH001_CUMULATIVE_DRY_RUN_RESIDUE:${residue}`);
        receipt.dryRunResidue = residue;
      }
    }
  } finally {
    await client.end();
  }

  const body = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    source: {
      branch: EXPECTED_BRANCH,
      head,
      tree,
      sourceHashes,
      hashedDirtySourceAccepted: dirtySourcePaths.length > 0 && ALLOW_HASHED_DIRTY_SOURCE,
    },
    master: { path: MASTER_PATH, sha256: MASTER_SHA256 },
    sourceReceipt: {
      path: SOURCE_RECEIPT_PATH.replaceAll("\\", "/"),
      sha256: sha256(readFileSync(SOURCE_RECEIPT_PATH)),
      sourceStateId: sourceReceipt.sourceStateId,
    },
    ...receipt!,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  const sealed = { ...body, receiptSha256: sha256(body) };
  if (APPLY && (receipt!.mutationPerformed === true || receipt!.idempotent === true)) {
    atomicJson(resolve(OUTPUT_ROOT, "acceptance.json"), sealed);
    atomicJson(CURRENT_RELEASE_PATH, {
      ...current,
      definitionReleaseId: receipt!.successor.releaseId,
      searchReleaseId: receipt!.successor.searchReleaseId,
      definitionReleaseStatus: "prepared",
      searchReleaseStatus: "draft",
      definitionSnapshotSha256: receipt!.audit.manifest.snapshot,
      manifestHashChainSha256: receipt!.audit.manifest.snapshot,
      searchHashChainSha256: receipt!.audit.search.snapshot_sha256,
      owner: "R4_A13_6_BATCH001_MEASURED_AREA_CUMULATIVE_SUCCESSOR_V1",
      productionAccessed: false,
      fakeGreenClaimed: false,
    });
  }
  process.stdout.write(`${JSON.stringify(sealed, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
