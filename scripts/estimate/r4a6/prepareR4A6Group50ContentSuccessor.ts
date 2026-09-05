import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  isGenericPublicBoqResourceName,
  isPublicBoqNameStructurallyValid,
} from "../../../src/lib/estimate/semanticBoqGate";

const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R5_6_8_RC09_R4_A6_CANONICAL_MONOLITH_PROFESSIONAL_ESTIMATE_PRINT_PDF_FORMULA_REMEDIATION_ANDROID_API34_GROUP50_71040_GLOBAL_GREEN_RU.md",
);
const MASTER_SHA256 = "11e671dd5c376c577fa4f64017e3ccdc7cc9acfd59f064c343627345334275e6";
const PREDECESSOR_RELEASE_ID = "ad825133-a41e-527d-a2f2-e1dd0e65ea86";
const PREDECESSOR_SEARCH_RELEASE_ID = "0a1f5b96-24c1-5e2f-8ac4-edecab5ed3b6";
const CONTRACT = "rik-expo-app.r568.r4-a6-group50-content-remediation.v1";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const EXPECTED_VISIBLE_RESOURCES = 615_438;
const EXPECTED_GENERIC_APPLICABLE = 10_750;
const EXPECTED_SEMANTIC_APPLICABLE = 2;
const EXPECTED_BASELINE_DEFECTS = 85;
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const APPLY = process.argv.includes("--apply");
const MANAGED_SOURCE_PATHS = [
  "scripts/estimate/r4a6/auditR4A6Group50Blockers.ts",
  "scripts/estimate/r4a6/group50ScenarioContract.test.ts",
  "scripts/estimate/r4a6/group50ScenarioContract.ts",
  "scripts/estimate/r4a6/prepareR4A6Group50ContentSuccessor.contract.test.ts",
  "scripts/estimate/r4a6/prepareR4A6Group50ContentSuccessor.ts",
  "scripts/estimate/r4a6/runR4A6Group50.ts",
  "src/lib/estimate/semanticBoqGate.ts",
] as const;

type Json = Record<string, any>;

type DefinitionMap = {
  catalogId: string;
  oldDefinitionId: string;
  newDefinitionId: string;
  oldBaselineId: string;
  newBaselineId: string;
};

type ResourceFailure = {
  resourceId: string;
  catalogId: string;
  rowId: string;
  reason: "GENERIC_PUBLIC_NAME" | "STRUCTURAL_PUBLIC_NAME" | "GENERIC_AND_STRUCTURAL_PUBLIC_NAME";
};

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Json;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function shaObject(value: unknown): string {
  return sha256(stableJson(value));
}

function uuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function isApplicable(row: Json): boolean {
  return !(row.inclusion_ast?.kind === "literal" && row.inclusion_ast?.value === false)
    && row.resource_graph?.r4A6ProfessionalBoq?.applicable !== false;
}

async function insertChunks(client: Client, statement: string, rows: readonly Json[], size = 500): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += size) {
    await client.query(statement, [JSON.stringify(rows.slice(offset, offset + size))]);
  }
}

async function sourceSnapshot(client: Client): Promise<Json> {
  return (await client.query(`select
      release.id::text release_id,release.status,release.release_key,release.schema_version,
      release.definition_count,release.parameter_count,release.formula_count,release.resource_row_count,
      (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1) manifest_count,
      (select encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex')
        from public.estimate_cumulative_manifest_entry where release_id=$1) manifest_hash,
      (select encode(extensions.digest(convert_to(string_agg(resource.row_sha256,'' order by manifest.catalog_id,resource.ordinal),'UTF8'),'sha256'),'hex')
        from public.estimate_cumulative_manifest_entry manifest join public.estimate_resource_spec resource
          on resource.definition_version_id=manifest.definition_version_id where manifest.release_id=$1) resource_hash,
      (select encode(extensions.digest(convert_to(string_agg(baseline.acceptance_evidence_sha256,'' order by manifest.catalog_id),'UTF8'),'sha256'),'hex')
        from public.estimate_cumulative_manifest_entry manifest join public.estimate_approved_template_baseline baseline
          on baseline.id=manifest.approved_template_baseline_id where manifest.release_id=$1) baseline_hash
    from public.estimate_definition_release release where release.id=$1`, [PREDECESSOR_RELEASE_ID])).rows[0] as Json;
}

async function preflight(client: Client, fingerprint: string): Promise<{
  predecessor: Json;
  maps: DefinitionMap[];
  failures: ResourceFailure[];
  counters: Json;
}> {
  const predecessor = await sourceSnapshot(client);
  invariant(predecessor && predecessor.manifest_count === 10_331, "STOP_GROUP50_SUCCESSOR_PREDECESSOR");
  const resourceRows = (await client.query(`select
      manifest.catalog_id,document.canonical_name_ru work_title_ru,
      resource.id::text resource_id,resource.row_id,resource.title_ru,
      resource.inclusion_ast,resource.resource_graph
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_search_document document
      on document.search_release_id=$2 and document.catalog_id=manifest.catalog_id
      and document.definition_version_id=manifest.definition_version_id
      and document.selectable and document.adjudication_class='EFFECTIVE_WORK'
    join public.estimate_resource_spec resource on resource.definition_version_id=manifest.definition_version_id
    where manifest.release_id=$1 order by manifest.catalog_id,resource.ordinal`, [
    PREDECESSOR_RELEASE_ID,
    PREDECESSOR_SEARCH_RELEASE_ID,
  ])).rows as Json[];
  invariant(resourceRows.length === EXPECTED_VISIBLE_RESOURCES, "STOP_GROUP50_SUCCESSOR_VISIBLE_RESOURCE_DENOMINATOR");
  const failures: ResourceFailure[] = [];
  let genericApplicable = 0;
  let semanticApplicable = 0;
  for (const row of resourceRows) {
    if (!isApplicable(row)) continue;
    const generic = isGenericPublicBoqResourceName(String(row.title_ru));
    const semantic = !isPublicBoqNameStructurallyValid(String(row.title_ru), String(row.work_title_ru));
    if (generic) genericApplicable += 1;
    if (semantic) semanticApplicable += 1;
    if (!generic && !semantic) continue;
    failures.push({
      resourceId: String(row.resource_id),
      catalogId: String(row.catalog_id),
      rowId: String(row.row_id),
      reason: generic && semantic
        ? "GENERIC_AND_STRUCTURAL_PUBLIC_NAME"
        : generic ? "GENERIC_PUBLIC_NAME" : "STRUCTURAL_PUBLIC_NAME",
    });
  }
  invariant(genericApplicable === EXPECTED_GENERIC_APPLICABLE, "STOP_GROUP50_SUCCESSOR_GENERIC_DENOMINATOR");
  invariant(semanticApplicable === EXPECTED_SEMANTIC_APPLICABLE, "STOP_GROUP50_SUCCESSOR_SEMANTIC_DENOMINATOR");
  const baselineCatalogs = (await client.query(`select manifest.catalog_id
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_approved_template_baseline baseline on baseline.id=manifest.approved_template_baseline_id
    join public.estimate_parameter_definition parameter on parameter.definition_version_id=manifest.definition_version_id
    where manifest.release_id=$1
    group by manifest.catalog_id,baseline.id,baseline.input_values
    having count(*) filter(where parameter.value_type='text' and not parameter.required
      and coalesce(baseline.input_values->>parameter.parameter_id,'')='')>0
    order by manifest.catalog_id`, [PREDECESSOR_RELEASE_ID])).rows.map((row) => String(row.catalog_id));
  invariant(baselineCatalogs.length === EXPECTED_BASELINE_DEFECTS, "STOP_GROUP50_SUCCESSOR_BASELINE_DENOMINATOR");
  const affectedCatalogs = new Set([...failures.map((row) => row.catalogId), ...baselineCatalogs]);
  const manifestRows = (await client.query(`select catalog_id,definition_version_id::text,
      approved_template_baseline_id::text
    from public.estimate_cumulative_manifest_entry
    where release_id=$1 and catalog_id=any($2::text[]) order by catalog_id`, [
    PREDECESSOR_RELEASE_ID,
    [...affectedCatalogs],
  ])).rows as Json[];
  invariant(manifestRows.length === affectedCatalogs.size, "STOP_GROUP50_SUCCESSOR_AFFECTED_MANIFEST");
  const maps = manifestRows.map((row) => ({
    catalogId: String(row.catalog_id),
    oldDefinitionId: String(row.definition_version_id),
    newDefinitionId: uuid(`${CONTRACT}:${fingerprint}:definition:${row.catalog_id}`),
    oldBaselineId: String(row.approved_template_baseline_id),
    newBaselineId: uuid(`${CONTRACT}:${fingerprint}:baseline:${row.catalog_id}`),
  }));
  invariant(maps.every((row) => row.oldBaselineId && row.oldBaselineId !== "null"), "STOP_GROUP50_SUCCESSOR_BASELINE_MISSING");
  return {
    predecessor,
    maps,
    failures,
    counters: {
      visibleResources: resourceRows.length,
      genericApplicable,
      semanticApplicable,
      failingResources: failures.length,
      affectedContentDefinitions: new Set(failures.map((row) => row.catalogId)).size,
      baselineDefects: baselineCatalogs.length,
      affectedDefinitions: maps.length,
    },
  };
}

async function cloneSearch(client: Client, input: {
  releaseId: string;
  searchReleaseId: string;
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
      metadata||jsonb_build_object('contract',$6::text,'parentSearchReleaseId',$7::text,
        'definitionReleaseId',$8::text,'sourceFingerprint',$9::text,
        'activationAllowed',false,'productionEligible',false)
    from public.estimate_search_index_release where id=$7`, [
    input.searchReleaseId,
    `${input.releaseKey}-search`,
    input.head,
    input.tree,
    sha256(`${input.searchReleaseId}:draft`),
    CONTRACT,
    PREDECESSOR_SEARCH_RELEASE_ID,
    input.releaseId,
    input.fingerprint,
  ]);
  await client.query(`insert into public.estimate_search_group(
      search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition)
    select $1,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
    from public.estimate_search_group where search_release_id=$2`, [input.searchReleaseId, PREDECESSOR_SEARCH_RELEASE_ID]);
  await client.query(`insert into public.estimate_search_clarification_question(
      search_release_id,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence)
    select $1,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence
    from public.estimate_search_clarification_question where search_release_id=$2`, [
    input.searchReleaseId,
    PREDECESSOR_SEARCH_RELEASE_ID,
  ]);
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
      source.catalog_origin,$2,source.short_scope_ru,source.key_distinguishing_parameters,
      source.required_inputs_count,source.clarification_fields,source.included_boundaries,
      source.excluded_boundaries,source.replacement_catalog_id,source.normalized_catalog_id,
      source.normalized_canonical_name,source.normalized_aliases,source.normalized_search_terms,
      source.normalized_search_blob,
      source.source_provenance||jsonb_build_object('contract',$3::text,
        'parentSearchReleaseId',$4::text,'definitionReleaseId',$2::text,'sourceFingerprint',$5::text),
      encode(extensions.digest(convert_to(source.document_sha256||':'||$3||':'||manifest.definition_version_id::text,
        'UTF8'),'sha256'),'hex'),source.adjudication_class,source.selectable,
      source.canonical_target_catalog_id,manifest.definition_version_id
    from public.estimate_search_document source
    join public.estimate_cumulative_manifest_entry manifest
      on manifest.release_id=$2 and manifest.catalog_id=source.catalog_id
    where source.search_release_id=$4`, [
    input.searchReleaseId,
    input.releaseId,
    CONTRACT,
    PREDECESSOR_SEARCH_RELEASE_ID,
    input.fingerprint,
  ]);
  await client.query(`insert into public.estimate_search_group_membership(
      search_release_id,group_id,catalog_id,ordinal,independent_disposition)
    select $1,group_id,catalog_id,ordinal,independent_disposition
    from public.estimate_search_group_membership where search_release_id=$2`, [
    input.searchReleaseId,
    PREDECESSOR_SEARCH_RELEASE_ID,
  ]);
  await client.query(`insert into public.estimate_search_typed_relation(
      search_release_id,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256)
    select $1,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256
    from public.estimate_search_typed_relation where search_release_id=$2`, [
    input.searchReleaseId,
    PREDECESSOR_SEARCH_RELEASE_ID,
  ]);
  const snapshot = (await client.query(`select
      count(*)::int documents,count(*) filter(where selectable and adjudication_class='EFFECTIVE_WORK')::int visible,
      encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot_sha256
    from public.estimate_search_document where search_release_id=$1`, [input.searchReleaseId])).rows[0] as Json;
  await client.query(`update public.estimate_search_index_release set status='prepared',sealed_at=clock_timestamp(),
      snapshot_sha256=$2,metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
    input.searchReleaseId,
    snapshot.snapshot_sha256,
    JSON.stringify({ lifecycle: "PREPARED_NOT_ACTIVE", documentCount: snapshot.documents, visibleCount: snapshot.visible }),
  ]);
  return snapshot;
}

async function applySuccessor(client: Client, input: {
  predecessor: Json;
  maps: DefinitionMap[];
  failures: ResourceFailure[];
  counters: Json;
  releaseId: string;
  searchReleaseId: string;
  releaseKey: string;
  head: string;
  tree: string;
  fingerprint: string;
}): Promise<Json> {
  await client.query("begin");
  try {
    await client.query(`create temporary table r4a6_group50_definition_map(
      catalog_id text primary key,old_definition_id uuid not null,new_definition_id uuid not null,
      old_baseline_id uuid not null,new_baseline_id uuid not null) on commit drop`);
    await insertChunks(client, `insert into r4a6_group50_definition_map(
        catalog_id,old_definition_id,new_definition_id,old_baseline_id,new_baseline_id)
      select x."catalogId",x."oldDefinitionId",x."newDefinitionId",x."oldBaselineId",x."newBaselineId"
      from jsonb_to_recordset($1::jsonb) as x(
        "catalogId" text,"oldDefinitionId" uuid,"newDefinitionId" uuid,"oldBaselineId" uuid,"newBaselineId" uuid)`, input.maps);
    await client.query(`create temporary table r4a6_group50_resource_failure(
      resource_id uuid primary key,catalog_id text not null,row_id text not null,reason text not null) on commit drop`);
    await insertChunks(client, `insert into r4a6_group50_resource_failure(resource_id,catalog_id,row_id,reason)
      select x."resourceId",x."catalogId",x."rowId",x.reason
      from jsonb_to_recordset($1::jsonb) as x(
        "resourceId" uuid,"catalogId" text,"rowId" text,reason text)`, input.failures);

    await client.query(`insert into public.estimate_definition_release(
        id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
        definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,
        parameter_count,formula_count)
      values($1,$2,$3,'draft',$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13)`, [
      input.releaseId,
      input.releaseKey,
      input.predecessor.schema_version,
      input.head,
      input.tree,
      sha256(`${CONTRACT}:${input.fingerprint}:draft`),
      input.predecessor.definition_count,
      input.predecessor.resource_row_count,
      JSON.stringify({
        contract: CONTRACT,
        masterSha256: MASTER_SHA256,
        lifecycle: "DRAFT_FORWARD_ONLY",
        parentReleaseId: PREDECESSOR_RELEASE_ID,
        sourceFingerprint: input.fingerprint,
        ...input.counters,
        activationAllowed: false,
        productionEligible: false,
      }),
      PREDECESSOR_RELEASE_ID,
      shaObject({ contract: CONTRACT, fingerprint: input.fingerprint }),
      input.predecessor.parameter_count,
      input.predecessor.formula_count,
    ]);
    await client.query(`insert into public.estimate_definition_version(
        id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,
        source_metadata,content_status,content_gate_status)
      select map.new_definition_id,$1,source.catalog_id,
        (select max(peer.definition_version)+1 from public.estimate_definition_version peer
          where peer.catalog_id=source.catalog_id),
        source.passport,source.applicability,source.definition_sha256,
        source.source_metadata||jsonb_build_object('contract',$2::text,
          'predecessorDefinitionVersionId',source.id::text,'sourceFingerprint',$3::text,
          'legacyGenericRowsDisposition','EXPLICITLY_EXCLUDED'),
        'QUARANTINED','RED'
      from r4a6_group50_definition_map map
      join public.estimate_definition_version source on source.id=map.old_definition_id`, [
      input.releaseId,
      CONTRACT,
      input.fingerprint,
    ]);
    await client.query(`insert into public.estimate_approved_template_baseline(
        id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,
        parameter_schema_sha256,input_values,input_classification,uom_by_parameter,
        formula_consumer_ids,resource_consumer_row_ids,normative_source_ids,guide_provenance_ru,
        proposal_source_refs,validation_scenario_refs,acceptance_evidence_sha256,
        accepted_release_id,accepted_at,supersedes_baseline_id,contract_version)
      select map.new_baseline_id,$2||':'||substr($3,1,16)||':'||map.catalog_id,
        source.catalog_id,map.new_definition_id,source.source_definition_version_id,
        source.parameter_schema_sha256,
        source.input_values-coalesce(blank.optional_keys,array[]::text[]),
        source.input_classification-coalesce(blank.optional_keys,array[]::text[]),
        source.uom_by_parameter-coalesce(blank.optional_keys,array[]::text[]),
        source.formula_consumer_ids-coalesce(blank.optional_keys,array[]::text[]),
        source.resource_consumer_row_ids-coalesce(blank.optional_keys,array[]::text[]),
        source.normative_source_ids-coalesce(blank.optional_keys,array[]::text[]),
        source.guide_provenance_ru-coalesce(blank.optional_keys,array[]::text[]),
        source.proposal_source_refs||jsonb_build_array(jsonb_build_object(
          'contract',$2::text,'sourceBaselineId',source.id::text,'sourceFingerprint',$3::text)),
        source.validation_scenario_refs||jsonb_build_array(jsonb_build_object(
          'scenario','GROUP50_EMPTY_OPTIONAL_TEXT_REMOVED','sourceBaselineId',source.id::text)),
        encode(extensions.digest(convert_to(source.acceptance_evidence_sha256||':'||$2||':'||map.new_baseline_id::text,
          'UTF8'),'sha256'),'hex'),$1,clock_timestamp(),source.id,source.contract_version
      from r4a6_group50_definition_map map
      join public.estimate_approved_template_baseline source on source.id=map.old_baseline_id
      left join lateral(select array_agg(parameter.parameter_id)::text[] optional_keys
        from public.estimate_parameter_definition parameter
        where parameter.definition_version_id=map.old_definition_id
          and parameter.value_type='text' and not parameter.required
          and coalesce(source.input_values->>parameter.parameter_id,'')='') blank on true`, [
      input.releaseId,
      CONTRACT,
      input.fingerprint,
    ]);
    await client.query(`insert into public.estimate_parameter_definition(
        definition_version_id,parameter_id,ordinal,value_type,unit_id,title_ru,required,
        default_value,constraints_json,truth_metadata,approved_template_baseline_id)
      select map.new_definition_id,source.parameter_id,source.ordinal,source.value_type,source.unit_id,
        source.title_ru,source.required,source.default_value,source.constraints_json,
        case when source.default_value is not null
          and source.truth_metadata#>>'{provenance,baselineOwner}'='approved-template-baseline:r54'
        then jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(
          source.truth_metadata||jsonb_build_object('r4A6Group50RemediationContract',$2::text),
          '{baseline_assumption_id}',to_jsonb(map.new_baseline_id::text||':'||source.parameter_id),true),
          '{provenance,approvedTemplateBaselineId}',to_jsonb(map.new_baseline_id::text),true),
          '{provenance,acceptanceEvidenceSha256}',to_jsonb(baseline.acceptance_evidence_sha256),true),
          '{provenance,approvedTemplateBinding,baselineId}',to_jsonb(map.new_baseline_id::text),true),
          '{provenance,approvedTemplateBinding,acceptanceEvidenceSha256}',
          to_jsonb(baseline.acceptance_evidence_sha256),true)
        else source.truth_metadata||jsonb_build_object('r4A6Group50RemediationContract',$2::text) end,
        case when source.approved_template_baseline_id is not null then map.new_baseline_id else null end
      from r4a6_group50_definition_map map
      join public.estimate_parameter_definition source on source.definition_version_id=map.old_definition_id
      join public.estimate_approved_template_baseline baseline on baseline.id=map.new_baseline_id`, [
      input.releaseId,
      CONTRACT,
    ]);
    await client.query(`insert into public.estimate_formula_graph(
        definition_version_id,formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256)
      select map.new_definition_id,source.formula_id,source.output_unit_id,source.expression_source,
        source.ast,source.input_parameter_ids,source.ast_sha256
      from r4a6_group50_definition_map map
      join public.estimate_formula_graph source on source.definition_version_id=map.old_definition_id`);
    await client.query(`create temporary table r4a6_group50_resource_map on commit drop as
      select source.id old_resource_id,
        (substr(md5($1||':resource:'||source.id::text),1,8)||'-'||
         substr(md5($1||':resource:'||source.id::text),9,4)||'-'||
         substr(md5($1||':resource:'||source.id::text),13,4)||'-'||
         substr(md5($1||':resource:'||source.id::text),17,4)||'-'||
         substr(md5($1||':resource:'||source.id::text),21,12))::uuid new_resource_id,
        map.new_definition_id,failure.reason
      from r4a6_group50_definition_map map
      join public.estimate_resource_spec source on source.definition_version_id=map.old_definition_id
      left join r4a6_group50_resource_failure failure on failure.resource_id=source.id`, [input.fingerprint]);
    await client.query("create unique index on r4a6_group50_resource_map(old_resource_id); create unique index on r4a6_group50_resource_map(new_resource_id)");
    await client.query(`insert into public.estimate_resource_spec(
        id,definition_version_id,row_id,ordinal,section,category,title_ru,row_type,unit_id,
        formula_id,inclusion_ast,resource_graph,semantic_owner,cost_owner_id,
        procurement_eligible,source_metadata,row_sha256)
      select resource_map.new_resource_id,resource_map.new_definition_id,source.row_id,source.ordinal,
        source.section,source.category,source.title_ru,source.row_type,source.unit_id,source.formula_id,
        case when resource_map.reason is not null then jsonb_build_object('kind','literal','value',false)
          else source.inclusion_ast end,
        source.resource_graph||jsonb_build_object('r4A6Group50Remediation',jsonb_build_object(
          'contract',$1::text,'disposition',case when resource_map.reason is null
            then 'PRESERVED' else 'LEGACY_NON_PROFESSIONAL_EXCLUDED' end,
          'reason',resource_map.reason,'sourceResourceId',source.id::text)),
        source.semantic_owner,source.cost_owner_id,
        case when resource_map.reason is not null then false else source.procurement_eligible end,
        source.source_metadata||jsonb_build_object('contract',$1::text,
          'sourceResourceId',source.id::text,'sourceRowSha256',source.row_sha256),
        encode(extensions.digest(convert_to(source.row_sha256||':'||$1||':'||
          resource_map.new_definition_id::text||':'||coalesce(resource_map.reason,'PRESERVED'),
          'UTF8'),'sha256'),'hex')
      from r4a6_group50_resource_map resource_map
      join public.estimate_resource_spec source on source.id=resource_map.old_resource_id`, [CONTRACT]);
    await client.query(`insert into public.estimate_work_normative_binding(
        definition_version_id,resource_spec_id,locator_id,applicability)
      select resource_map.new_definition_id,resource_map.new_resource_id,binding.locator_id,binding.applicability
      from r4a6_group50_resource_map resource_map
      join public.estimate_work_normative_binding binding on binding.resource_spec_id=resource_map.old_resource_id`);
    await client.query(`insert into public.estimate_resource_price_route_binding(
        resource_spec_id,route_id,price_key,priority)
      select resource_map.new_resource_id,binding.route_id,binding.price_key,binding.priority
      from r4a6_group50_resource_map resource_map
      join public.estimate_resource_price_route_binding binding on binding.resource_spec_id=resource_map.old_resource_id`);
    await client.query(`update public.estimate_definition_version target set
        definition_sha256=hash.definition_sha256
      from(select map.new_definition_id,
        encode(extensions.digest(convert_to(source.definition_sha256||':'||$1||':'||
          string_agg(resource.row_sha256,'' order by resource.ordinal),'UTF8'),'sha256'),'hex') definition_sha256
        from r4a6_group50_definition_map map
        join public.estimate_definition_version source on source.id=map.old_definition_id
        join public.estimate_resource_spec resource on resource.definition_version_id=map.new_definition_id
        group by map.new_definition_id,source.definition_sha256) hash
      where target.id=hash.new_definition_id`, [CONTRACT]);
    await client.query(`insert into public.estimate_content_passport_r3(
        definition_version_id,release_id,catalog_id,contract_version,identity_mode,redirect_catalog_id,
        physical_result_ru,included_scope_ru,excluded_scope_ru,capability_matrix,parameter_count,
        formula_count,resource_count,decision,payload_sha256,source_head,source_tree)
      select map.new_definition_id,$1,source.catalog_id,source.contract_version,source.identity_mode,
        source.redirect_catalog_id,source.physical_result_ru,source.included_scope_ru,
        source.excluded_scope_ru||jsonb_build_array('Legacy generic resource rows are excluded by Group50 remediation'),
        source.capability_matrix,source.parameter_count,source.formula_count,source.resource_count,
        source.decision||jsonb_build_object('group50RemediationContract',$2::text),
        encode(extensions.digest(convert_to(source.payload_sha256||':'||$2||':'||map.new_definition_id::text,
          'UTF8'),'sha256'),'hex'),$3,$4
      from r4a6_group50_definition_map map
      join public.estimate_content_passport_r3 source on source.definition_version_id=map.old_definition_id`, [
      input.releaseId,
      CONTRACT,
      input.head,
      input.tree,
    ]);
    await client.query(`update public.estimate_definition_version target set
        content_status=source.content_status,content_gate_status=source.content_gate_status
      from r4a6_group50_definition_map map
      join public.estimate_definition_version source on source.id=map.old_definition_id
      where target.id=map.new_definition_id and (source.content_gate_status<>'GREEN' or exists(
        select 1 from public.estimate_content_passport_r3 passport
        where passport.definition_version_id=map.new_definition_id))`);
    await client.query(`insert into public.estimate_cumulative_manifest_entry(
        release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
        publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,
        definition_hash,entry_sha256,runtime_publication_state)
      select $1,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
        publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,
        encode(extensions.digest(convert_to($2||':'||($1::uuid)::text||':'||catalog_id||':'||entry_sha256,
          'UTF8'),'sha256'),'hex'),runtime_publication_state
      from public.estimate_cumulative_manifest_entry where release_id=$3`, [
      input.releaseId,
      CONTRACT,
      PREDECESSOR_RELEASE_ID,
    ]);
    await client.query(`update public.estimate_cumulative_manifest_entry target set
        definition_version_id=map.new_definition_id,source_batch=$2,source_release_id=$1,
        publication_state='CANONICAL_SUCCESSOR',approved_template_baseline_id=map.new_baseline_id,
        baseline_ready=true,scenario_ready=true,definition_hash=definition.definition_sha256,
        entry_sha256=encode(extensions.digest(convert_to($2||':'||($1::uuid)::text||':'||
          target.catalog_id||':'||definition.definition_sha256||':'||map.new_baseline_id::text,
          'UTF8'),'sha256'),'hex'),runtime_publication_state='CANDIDATE'
      from r4a6_group50_definition_map map
      join public.estimate_definition_version definition on definition.id=map.new_definition_id
      where target.release_id=$1 and target.catalog_id=map.catalog_id`, [input.releaseId, CONTRACT]);
    const search = await cloneSearch(client, input);
    const manifest = (await client.query(`select count(*)::int definitions,
        count(*) filter(where baseline_ready and scenario_ready)::int ready,
        encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') manifest_sha256
      from public.estimate_cumulative_manifest_entry where release_id=$1`, [input.releaseId])).rows[0] as Json;
    await client.query(`update public.estimate_definition_release set
        source_manifest_sha256=$2,status='prepared',sealed_at=clock_timestamp(),
        metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
      input.releaseId,
      manifest.manifest_sha256,
      JSON.stringify({
        lifecycle: "PREPARED_NOT_ACTIVE",
        searchReleaseId: input.searchReleaseId,
        searchSnapshotSha256: search.snapshot_sha256,
        manifestCounts: manifest,
      }),
    ]);

    const targetResources = (await client.query(`select document.canonical_name_ru work_title_ru,
        resource.title_ru,resource.inclusion_ast,resource.resource_graph
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_search_document document on document.search_release_id=$2
        and document.catalog_id=manifest.catalog_id and document.definition_version_id=manifest.definition_version_id
        and document.selectable and document.adjudication_class='EFFECTIVE_WORK'
      join public.estimate_resource_spec resource on resource.definition_version_id=manifest.definition_version_id
      where manifest.release_id=$1`, [input.releaseId, input.searchReleaseId])).rows as Json[];
    let genericApplicable = 0;
    let semanticApplicable = 0;
    for (const row of targetResources) {
      if (!isApplicable(row)) continue;
      if (isGenericPublicBoqResourceName(String(row.title_ru))) genericApplicable += 1;
      if (!isPublicBoqNameStructurallyValid(String(row.title_ru), String(row.work_title_ru))) semanticApplicable += 1;
    }
    const baselineDefects = Number((await client.query(`select count(*) value from(
        select manifest.catalog_id
        from public.estimate_cumulative_manifest_entry manifest
        join public.estimate_approved_template_baseline baseline on baseline.id=manifest.approved_template_baseline_id
        join public.estimate_parameter_definition parameter on parameter.definition_version_id=manifest.definition_version_id
        where manifest.release_id=$1 group by manifest.catalog_id,baseline.id,baseline.input_values
        having count(*) filter(where parameter.value_type='text' and not parameter.required
          and coalesce(baseline.input_values->>parameter.parameter_id,'')='')>0) defect`, [input.releaseId])).rows[0].value);
    const linkage = (await client.query(`select
        (select count(*)::int from r4a6_group50_resource_map map
          join public.estimate_work_normative_binding binding on binding.resource_spec_id=map.old_resource_id) normative_before,
        (select count(*)::int from r4a6_group50_resource_map map
          join public.estimate_work_normative_binding binding on binding.resource_spec_id=map.new_resource_id) normative_after,
        (select count(*)::int from r4a6_group50_resource_map map
          join public.estimate_resource_price_route_binding binding on binding.resource_spec_id=map.old_resource_id) price_before,
        (select count(*)::int from r4a6_group50_resource_map map
          join public.estimate_resource_price_route_binding binding on binding.resource_spec_id=map.new_resource_id) price_after,
        (select count(*)::int from public.estimate_cumulative_manifest_entry manifest
          join public.estimate_resource_spec resource on resource.definition_version_id=manifest.definition_version_id
          left join public.estimate_formula_graph formula on formula.definition_version_id=resource.definition_version_id
            and formula.formula_id=resource.formula_id
          where manifest.release_id=$1 and formula.formula_id is null) orphan_formulas`, [input.releaseId])).rows[0] as Json;
    const predecessorAfter = await sourceSnapshot(client);
    const audit = {
      manifest,
      search,
      targetVisibleResources: targetResources.length,
      genericApplicable,
      semanticApplicable,
      baselineDefects,
      linkage,
      predecessorUnchanged: shaObject(predecessorAfter) === shaObject(input.predecessor),
      blockingCounters: {
        genericFillerRed: genericApplicable,
        semanticNameRed: semanticApplicable,
        baselineValidationRed: baselineDefects,
        normativeBindingDrift: Number(linkage.normative_before) - Number(linkage.normative_after),
        priceBindingDrift: Number(linkage.price_before) - Number(linkage.price_after),
        formulaOrphanRed: Number(linkage.orphan_formulas),
        predecessorMutationRed: shaObject(predecessorAfter) === shaObject(input.predecessor) ? 0 : 1,
      },
    };
    invariant(manifest.definitions === 10_331 && manifest.ready === 10_331, "STOP_GROUP50_SUCCESSOR_MANIFEST_AUDIT");
    invariant(search.visible === 10_322 && targetResources.length === EXPECTED_VISIBLE_RESOURCES,
      "STOP_GROUP50_SUCCESSOR_SEARCH_AUDIT");
    invariant(Object.values(audit.blockingCounters).every((value) => Number(value) === 0),
      `STOP_GROUP50_SUCCESSOR_BLOCKING_COUNTER:${stableJson(audit.blockingCounters)}`);
    await client.query("commit");
    return audit;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function main(): Promise<void> {
  invariant(sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256, "STOP_MASTER_SHA256_DRIFT");
  const branch = git("branch", "--show-current");
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  invariant(branch === EXPECTED_BRANCH, "STOP_GROUP50_SUCCESSOR_BRANCH");
  const dirty = git("status", "--porcelain=v1", "--untracked-files=all", "--", ...MANAGED_SOURCE_PATHS);
  invariant(!dirty, `STOP_GROUP50_SUCCESSOR_SOURCE_DRIFT:${dirty}`);
  const fingerprint = shaObject({
    contract: CONTRACT,
    masterSha256: MASTER_SHA256,
    head,
    tree,
    sources: MANAGED_SOURCE_PATHS.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) })),
  });
  const releaseId = uuid(`${CONTRACT}:${fingerprint}:release`);
  const searchReleaseId = uuid(`${CONTRACT}:${fingerprint}:search`);
  const releaseKey = `r568-r4-a6-group50-content-${fingerprint.slice(0, 16)}`;
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const existing = (await client.query("select id::text,status from public.estimate_definition_release where id=$1", [releaseId])).rows[0] as Json | undefined;
    invariant(!existing, "STOP_GROUP50_SUCCESSOR_ALREADY_EXISTS");
    const plan = await preflight(client, fingerprint);
    if (!APPLY) {
      process.stdout.write(`${JSON.stringify({
        status: "GREEN_R4_A6_GROUP50_CONTENT_SUCCESSOR_PRECHECK_NO_MUTATION",
        source: { branch, head, tree, fingerprint },
        predecessorReleaseId: PREDECESSOR_RELEASE_ID,
        successor: { releaseId, searchReleaseId, releaseKey },
        counters: plan.counters,
      }, null, 2)}\n`);
      return;
    }
    const audit = await applySuccessor(client, { ...plan, releaseId, searchReleaseId, releaseKey, head, tree, fingerprint });
    const body = {
      schemaVersion: "r568-r4-a6-group50-content-successor-receipt.v1",
      capturedAt: new Date().toISOString(),
      status: "GREEN_R4_A6_GROUP50_CONTENT_SUCCESSOR_PREPARED_NOT_ACTIVE",
      globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
      source: { branch, head, tree, fingerprint, managedPaths: MANAGED_SOURCE_PATHS },
      predecessor: { definitionReleaseId: PREDECESSOR_RELEASE_ID, searchReleaseId: PREDECESSOR_SEARCH_RELEASE_ID },
      successor: { releaseId, searchReleaseId, releaseKey },
      remediation: plan.counters,
      audit,
      productionAccessed: false,
      deployPerformed: false,
      releasePerformed: false,
      activationPerformed: false,
    };
    const receipt = { ...body, receiptSha256: shaObject(body) };
    const output = resolve(
      ".release-runtime/r568/rc09-r4-production-closeout/r4-a6-canonical-monolith-professional-estimate-print-formula-global-closeout-1",
      `16_GROUP50_CONTENT_SUCCESSOR_${head}.json`,
    );
    invariant(!existsSync(output), "STOP_GROUP50_SUCCESSOR_EVIDENCE_EXISTS");
    atomicJson(output, receipt);
    process.stdout.write(`${JSON.stringify({ output, ...receipt }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
