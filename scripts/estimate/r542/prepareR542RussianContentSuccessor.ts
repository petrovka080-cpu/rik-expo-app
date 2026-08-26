import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { localizeTechnologyTitleRu } from "../../../src/lib/estimate/backendPlatform/russianTechnologyTitleR542";
import { computeReleaseFingerprintPayload } from "../../release/computeReleaseFingerprints";
import { currentHead } from "../../release/releasePipelineRuntime";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app-r542-russian-technology-content-successor.v1";
const MASTER_PATH = resolve("C:/Users/User/Downloads/MASTER_TZ_R5_4_2_PRODUCTION_GRADE_AUTONOMOUS_REAL_AUTH_CANONICAL_ESTIMATES_GLOBAL_GREEN_RU.md");
const MASTER_SHA256 = "98886f63c45feb230163e1213c157065f7c38d992f05bcb38033905350d58b2b";
const PREDECESSOR_RELEASE_ID = "d30e2f0d-e55f-5d06-abef-c7cb80d69a73";
const PREDECESSOR_SEARCH_RELEASE_ID = "d08d030d-97e8-53ea-88fd-6012fc82ba9f";
const TENANT_ID = "22222222-2222-4222-8222-222222222222";
const DATABASE_URL = process.env.R542_DATABASE_URL
  ?? "postgresql://postgres:postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const OUTPUT = resolve(".release-runtime/r542/evidence/62_R542_RUSSIAN_CONTENT_SUCCESSOR.json");
const APPLY = process.argv.includes("--apply");

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

function stableJson(value: unknown): string {
  return JSON.stringify(stable(value));
}

function sha256(value: unknown): string {
  const bytes = Buffer.isBuffer(value) || typeof value === "string" ? value : stableJson(value);
  return createHash("sha256").update(bytes).digest("hex");
}

function uuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function exactDatabaseGuard(): void {
  const url = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(url.hostname), `R542_CONTENT_DATABASE_NOT_LOOPBACK:${url.hostname}`);
  invariant(Number(url.port) === 55432 && url.pathname === "/rik_r4_runtime_b5_v2",
    `R542_CONTENT_DATABASE_NOT_DISPOSABLE:${url.port}:${url.pathname}`);
}

function localizeTitleFields(value: unknown, key = ""): unknown {
  if (typeof value === "string") {
    return /(?:title|nameRu|name_ru|canonical_title)/iu.test(key) ? localizeTechnologyTitleRu(value) : value;
  }
  if (Array.isArray(value)) return value.map((child) => localizeTitleFields(child, key));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .map(([childKey, child]) => [childKey, localizeTitleFields(child, childKey)]));
  }
  return value;
}

async function insertJsonRecords(
  client: Client,
  sql: string,
  rows: readonly Json[],
  chunkSize: number,
  label: string,
): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    await client.query(sql, [JSON.stringify(chunk)]);
    process.stdout.write(`[${new Date().toISOString()}] ${label} ${Math.min(offset + chunk.length, rows.length)}/${rows.length}\n`);
  }
}

async function cloneSearchIndex(
  client: Client,
  input: { predecessorSearch: Json; searchReleaseId: string; releaseId: string; sourceHead: string; sourceTree: string },
): Promise<void> {
  const { predecessorSearch, searchReleaseId, releaseId, sourceHead, sourceTree } = input;
  await client.query(`insert into public.estimate_search_index_release(
    id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,
    source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata,created_at
  ) values($1,$2,'draft',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,now())`, [
    searchReleaseId,
    `${CONTRACT}:${sourceTree.slice(0, 12)}:search`,
    predecessorSearch.taxonomy_version,
    predecessorSearch.group_relation_version,
    predecessorSearch.ranking_contract_version,
    sourceHead,
    sourceTree,
    sha256({ contract: CONTRACT, predecessor: predecessorSearch.snapshot_sha256, releaseId }),
    predecessorSearch.global_count,
    predecessorSearch.external_count,
    predecessorSearch.discovered_count,
    JSON.stringify({ contract: CONTRACT, predecessorSearchReleaseId: PREDECESSOR_SEARCH_RELEASE_ID,
      definitionReleaseId: releaseId, localDisposable: true, activationAllowed: false }),
  ]);
  await client.query(`insert into public.estimate_search_group(
    search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
    breadcrumb,member_count,member_set_sha256,oracle_disposition
  ) select $1,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
    breadcrumb,member_count,member_set_sha256,oracle_disposition
    from public.estimate_search_group where search_release_id=$2`, [searchReleaseId, PREDECESSOR_SEARCH_RELEASE_ID]);
  await client.query(`insert into public.estimate_search_document(
    search_release_id,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,group_id,subgroup_id,
    element_type,operation_kind,technology_variant,construction_state,primary_uom,canonical_name_ru,aliases,
    normative_classifiers,applicability_tags,publication_state,catalog_origin,definition_release_id,short_scope_ru,
    key_distinguishing_parameters,required_inputs_count,clarification_fields,included_boundaries,excluded_boundaries,
    replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,normalized_aliases,normalized_search_terms,
    normalized_search_blob,source_provenance,document_sha256,adjudication_class,selectable,
    canonical_target_catalog_id,definition_version_id
  ) select $1::uuid,document.catalog_id,document.domain_id,document.system_id,document.subsystem_id,document.assembly_id,
    document.work_family_id,document.group_id,document.subgroup_id,document.element_type,document.operation_kind,
    document.technology_variant,document.construction_state,document.primary_uom,document.canonical_name_ru,
    document.aliases,document.normative_classifiers,document.applicability_tags,document.publication_state,
    document.catalog_origin,case when document.definition_release_id is null then null else $2::uuid end,
    document.short_scope_ru,document.key_distinguishing_parameters,document.required_inputs_count,
    document.clarification_fields,document.included_boundaries,document.excluded_boundaries,
    document.replacement_catalog_id,document.normalized_catalog_id,document.normalized_canonical_name,
    document.normalized_aliases,document.normalized_search_terms,document.normalized_search_blob,
    document.source_provenance || jsonb_build_object('r542RussianContentSuccessorReleaseId',($2::uuid)::text),
    encode(extensions.digest(convert_to(($1::uuid)::text||':'||document.catalog_id||':'||document.document_sha256,'UTF8'),'sha256'),'hex'),
    document.adjudication_class,document.selectable,document.canonical_target_catalog_id,
    coalesce(mapping.new_definition_id,document.definition_version_id)
    from public.estimate_search_document document
    left join r542_definition_mapping mapping on mapping.catalog_id=document.catalog_id
    where document.search_release_id=$3`, [searchReleaseId, releaseId, PREDECESSOR_SEARCH_RELEASE_ID]);
  await client.query(`insert into public.estimate_search_group_membership(
    search_release_id,group_id,catalog_id,ordinal,independent_disposition
  ) select $1,group_id,catalog_id,ordinal,independent_disposition
    from public.estimate_search_group_membership where search_release_id=$2`, [searchReleaseId, PREDECESSOR_SEARCH_RELEASE_ID]);
  await client.query(`insert into public.estimate_search_clarification_question
    select $1,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,answer_type,unit_id,
      allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence
    from public.estimate_search_clarification_question where search_release_id=$2`, [searchReleaseId, PREDECESSOR_SEARCH_RELEASE_ID]);
  await client.query(`insert into public.estimate_search_typed_relation
    select $1,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256
    from public.estimate_search_typed_relation where search_release_id=$2`, [searchReleaseId, PREDECESSOR_SEARCH_RELEASE_ID]);
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256, "R542_CONTENT_MASTER_DRIFT");
  const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
  invariant(branch === "codex/p0-one-monolith-r5", `R542_CONTENT_BRANCH_RED:${branch}`);
  const sourceHead = currentHead();
  const productSource = computeReleaseFingerprintPayload("productSourceHash");
  const sourceTree = productSource.hash.slice(0, 40);
  const releaseKey = `${CONTRACT}:${productSource.hash.slice(0, 16)}`;
  const releaseId = uuid(`${releaseKey}:definition-release`);
  const searchReleaseId = uuid(`${releaseKey}:search-release`);
  const capabilityId = uuid(`${releaseKey}:capability:${TENANT_ID}`);

  const client = new Client({ connectionString: DATABASE_URL, application_name: APPLY
    ? "r542-russian-content-successor-apply" : "r542-russian-content-successor-dry-run", statement_timeout: 0 });
  await client.connect();
  try {
    const predecessor = (await client.query("select * from public.estimate_definition_release where id=$1", [PREDECESSOR_RELEASE_ID])).rows[0] as Json;
    const predecessorSearch = (await client.query("select * from public.estimate_search_index_release where id=$1", [PREDECESSOR_SEARCH_RELEASE_ID])).rows[0] as Json;
    invariant(predecessor?.status === "prepared" && Number(predecessor.definition_count) === 3322,
      "R542_CONTENT_PREDECESSOR_RELEASE_DRIFT");
    invariant(predecessorSearch?.status === "draft", "R542_CONTENT_PREDECESSOR_SEARCH_DRIFT");
    const existing = (await client.query("select * from public.estimate_definition_release where id=$1 or release_key=$2", [releaseId, releaseKey])).rows as Json[];
    if (existing.length > 0) {
      invariant(existing.length === 1 && existing[0].id === releaseId && existing[0].status === "prepared",
        "R542_CONTENT_EXISTING_SUCCESSOR_NOT_TERMINAL");
      const idempotent = {
        contract: CONTRACT,
        status: "GREEN_IDEMPOTENT_R542_RUSSIAN_CONTENT_SUCCESSOR_PREPARED",
        masterSha256: MASTER_SHA256,
        productSourceSha256: productSource.hash,
        releaseId,
        searchReleaseId,
        writesApplied: 0,
        activationPerformed: false,
        productionAccessed: false,
      };
      atomicJson(OUTPUT, idempotent);
      process.stdout.write(`${JSON.stringify(idempotent, null, 2)}\n`);
      return;
    }

    const definitions = (await client.query(`select manifest.catalog_id,manifest.definition_version_id::text old_definition_id,
      definition.definition_version,definition.definition_sha256,definition.content_status,definition.content_gate_status
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      where manifest.release_id=$1 order by manifest.catalog_id`, [PREDECESSOR_RELEASE_ID])).rows as Json[];
    invariant(definitions.length === 3322, `R542_CONTENT_DEFINITION_DENOMINATOR:${definitions.length}/3322`);
    const versionRows = (await client.query(`select catalog_id,max(definition_version)::int max_version
      from public.estimate_definition_version where catalog_id=any($1::text[]) group by catalog_id`,
    [definitions.map((row) => row.catalog_id)])).rows as Json[];
    const maxVersion = new Map(versionRows.map((row) => [String(row.catalog_id), Number(row.max_version)]));
    const mapping = definitions.map((row) => ({
      catalogId: String(row.catalog_id),
      oldDefinitionId: String(row.old_definition_id),
      newDefinitionId: uuid(`${releaseKey}:definition:${row.catalog_id}`),
      newBaselineId: uuid(`${releaseKey}:baseline:${row.catalog_id}`),
      definitionVersion: (maxVersion.get(String(row.catalog_id)) ?? Number(row.definition_version)) + 1,
      predecessorDefinitionSha256: String(row.definition_sha256),
    }));

    const distinctTitles = (await client.query(`select title_ru from (
      select distinct resource.title_ru from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_resource_spec resource on resource.definition_version_id=manifest.definition_version_id
      where manifest.release_id=$1
      union
      select distinct parameter.title_ru from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_parameter_definition parameter on parameter.definition_version_id=manifest.definition_version_id
      where manifest.release_id=$1
    ) titles order by title_ru`, [PREDECESSOR_RELEASE_ID])).rows.map((row) => String(row.title_ru));
    const titleProjection = distinctTitles.map((title) => ({ oldTitle: title, newTitle: localizeTechnologyTitleRu(title) }))
      .filter((row) => row.oldTitle !== row.newTitle);
    invariant(titleProjection.length > 0, "R542_CONTENT_TITLE_PROJECTION_EMPTY");

    await client.query("begin");
    try {
      await client.query("set local lock_timeout='10s'");
      await client.query("set local statement_timeout='0'");
      await client.query(`create temporary table r542_definition_mapping(
        catalog_id text primary key,old_definition_id uuid not null,new_definition_id uuid not null unique,
        new_baseline_id uuid not null unique,definition_version integer not null,predecessor_definition_sha256 text not null
      ) on commit drop`);
      await client.query(`create temporary table r542_title_projection(
        old_title text primary key,new_title text not null
      ) on commit drop`);
      await insertJsonRecords(client, `insert into r542_definition_mapping(
        catalog_id,old_definition_id,new_definition_id,new_baseline_id,definition_version,predecessor_definition_sha256
      ) select x."catalogId",x."oldDefinitionId"::uuid,x."newDefinitionId"::uuid,x."newBaselineId"::uuid,
        x."definitionVersion",x."predecessorDefinitionSha256"
        from jsonb_to_recordset($1::jsonb) as x("catalogId" text,"oldDefinitionId" text,"newDefinitionId" text,
          "newBaselineId" text,"definitionVersion" integer,"predecessorDefinitionSha256" text)`, mapping, 300, "R542 definition mapping");
      await insertJsonRecords(client, `insert into r542_title_projection(old_title,new_title)
        select x."oldTitle",x."newTitle" from jsonb_to_recordset($1::jsonb) as x("oldTitle" text,"newTitle" text)`,
      titleProjection, 500, "R542 title projection");

      await client.query(`insert into public.estimate_definition_release(
        id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
        definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,parameter_count,formula_count
      ) values($1,$2,$3,'draft',$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13)`, [
        releaseId, releaseKey, predecessor.schema_version, sourceHead, sourceTree, productSource.hash,
        predecessor.definition_count, predecessor.resource_row_count,
        JSON.stringify({ contract: CONTRACT, masterSha256: MASTER_SHA256, predecessorReleaseId: PREDECESSOR_RELEASE_ID,
          predecessorSearchReleaseId: PREDECESSOR_SEARCH_RELEASE_ID, immutableForwardOnly: true,
          titleProjectionCount: titleProjection.length, localDisposable: true, activationAllowed: false,
          productionAccessed: false, deployPerformed: false, releasePerformed: false }),
        PREDECESSOR_RELEASE_ID,
        sha256({ contract: CONTRACT, productSource: productSource.hash, mapping: mapping.map((row) => row.newDefinitionId) }),
        predecessor.parameter_count, predecessor.formula_count,
      ]);

      for (let offset = 0; offset < definitions.length; offset += 12) {
        const definitionChunk = definitions.slice(offset, offset + 12);
        const payloadRows = (await client.query(`select id::text,passport,applicability,source_metadata
          from public.estimate_definition_version where id=any($1::uuid[])`,
        [definitionChunk.map((row) => row.old_definition_id)])).rows as Json[];
        const payloadById = new Map(payloadRows.map((row) => [String(row.id), row]));
        invariant(payloadById.size === definitionChunk.length, `R542_CONTENT_DEFINITION_PAYLOAD_CHUNK:${payloadById.size}/${definitionChunk.length}`);
        const chunk = definitionChunk.map((definition, index) => {
          const link = mapping[offset + index]!;
          const payload = payloadById.get(String(definition.old_definition_id))!;
          const passport = localizeTitleFields(structuredClone(payload.passport)) as Json;
          if (Object.hasOwn(passport, "passportSha256")) {
            const withoutHash = { ...passport };
            delete withoutHash.passportSha256;
            passport.passportSha256 = sha256(withoutHash);
          }
          const sourceMetadata = localizeTitleFields(structuredClone(payload.source_metadata ?? {})) as Json;
          sourceMetadata.r542RussianContentSuccessor = {
            contract: CONTRACT,
            predecessorDefinitionVersionId: link.oldDefinitionId,
            predecessorDefinitionSha256: link.predecessorDefinitionSha256,
            productSourceSha256: productSource.hash,
          };
          return {
            ...link,
            passport,
            applicability: payload.applicability,
            sourceMetadata,
          provisionalDefinitionSha256: sha256({ contract: CONTRACT, predecessor: link.predecessorDefinitionSha256,
              passportSha256: passport.passportSha256 ?? sha256(passport) }),
          };
        });
        await client.query(`insert into public.estimate_definition_version(
          id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,source_metadata,
          content_status,content_gate_status
        ) select x."newDefinitionId"::uuid,$2::uuid,x."catalogId",x."definitionVersion",x.passport,x.applicability,
          x."provisionalDefinitionSha256",x."sourceMetadata",'QUARANTINED','RED'
          from jsonb_to_recordset($1::jsonb) as x("newDefinitionId" text,"catalogId" text,"definitionVersion" integer,
            passport jsonb,applicability jsonb,"provisionalDefinitionSha256" text,"sourceMetadata" jsonb)`, [JSON.stringify(chunk), releaseId]);
        process.stdout.write(`[${new Date().toISOString()}] R542 definitions ${Math.min(offset + chunk.length, definitions.length)}/${definitions.length}\n`);
      }

      await client.query(`with projected_schema as (
        select mapping.old_definition_id,
          encode(extensions.digest(convert_to(coalesce(string_agg(
            jsonb_build_array(parameter.parameter_id,parameter.ordinal,parameter.value_type,parameter.unit_id,
              coalesce(projection.new_title,parameter.title_ru),parameter.required,parameter.default_value,
              parameter.constraints_json,parameter.truth_metadata)::text,E'\n'
              order by parameter.ordinal,parameter.parameter_id
          ),''),'UTF8'),'sha256'),'hex') value
        from r542_definition_mapping mapping
        join public.estimate_parameter_definition parameter
          on parameter.definition_version_id=mapping.old_definition_id
        left join r542_title_projection projection on projection.old_title=parameter.title_ru
        group by mapping.old_definition_id
      ) insert into public.estimate_approved_template_baseline(
        id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,parameter_schema_sha256,
        input_values,input_classification,uom_by_parameter,formula_consumer_ids,resource_consumer_row_ids,
        normative_source_ids,guide_provenance_ru,proposal_source_refs,validation_scenario_refs,
        acceptance_evidence_sha256,accepted_release_id,accepted_at,supersedes_baseline_id,contract_version
      ) select mapping.new_baseline_id,$2||':'||manifest.catalog_id,manifest.catalog_id,mapping.new_definition_id,
        mapping.new_definition_id,projected_schema.value,baseline.input_values,baseline.input_classification,
        baseline.uom_by_parameter,baseline.formula_consumer_ids,baseline.resource_consumer_row_ids,
        baseline.normative_source_ids,baseline.guide_provenance_ru,
        baseline.proposal_source_refs||jsonb_build_array(jsonb_build_object('contract',$2,'predecessorBaselineId',baseline.id)),
        baseline.validation_scenario_refs||jsonb_build_array(jsonb_build_object('contract',$2,'scenario','RUSSIAN_PUBLIC_LABEL_PROJECTION')),
        encode(extensions.digest(convert_to($2||':'||baseline.acceptance_evidence_sha256||':'||projected_schema.value||':'||mapping.new_definition_id::text,'UTF8'),'sha256'),'hex'),
        $3,now(),baseline.id,baseline.contract_version
        from public.estimate_cumulative_manifest_entry manifest
        join r542_definition_mapping mapping on mapping.catalog_id=manifest.catalog_id
        join public.estimate_approved_template_baseline baseline on baseline.id=manifest.approved_template_baseline_id
        join projected_schema on projected_schema.old_definition_id=mapping.old_definition_id
        where manifest.release_id=$1`, [PREDECESSOR_RELEASE_ID, CONTRACT, releaseId]);

      await client.query(`insert into public.estimate_parameter_definition(
        definition_version_id,parameter_id,ordinal,value_type,unit_id,title_ru,required,default_value,
        constraints_json,truth_metadata,approved_template_baseline_id
      ) select mapping.new_definition_id,parameter.parameter_id,parameter.ordinal,parameter.value_type,parameter.unit_id,
        coalesce(projection.new_title,parameter.title_ru),parameter.required,parameter.default_value,
        parameter.constraints_json,parameter.truth_metadata,null
        from public.estimate_parameter_definition parameter
        join r542_definition_mapping mapping on mapping.old_definition_id=parameter.definition_version_id
        left join r542_title_projection projection on projection.old_title=parameter.title_ru`);
      process.stdout.write(`[${new Date().toISOString()}] R542 parameters cloned\n`);
      await client.query(`insert into public.estimate_formula_graph(
        definition_version_id,formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256
      ) select mapping.new_definition_id,formula.formula_id,formula.output_unit_id,formula.expression_source,
        formula.ast,formula.input_parameter_ids,formula.ast_sha256
        from public.estimate_formula_graph formula
        join r542_definition_mapping mapping on mapping.old_definition_id=formula.definition_version_id`);
      process.stdout.write(`[${new Date().toISOString()}] R542 formulas cloned\n`);
      await client.query(`insert into public.estimate_resource_spec(
        definition_version_id,row_id,ordinal,section,category,title_ru,row_type,unit_id,formula_id,inclusion_ast,
        resource_graph,semantic_owner,cost_owner_id,procurement_eligible,source_metadata,row_sha256
      ) select mapping.new_definition_id,resource.row_id,resource.ordinal,resource.section,resource.category,
        coalesce(projection.new_title,resource.title_ru),resource.row_type,resource.unit_id,resource.formula_id,
        resource.inclusion_ast,resource.resource_graph,resource.semantic_owner,resource.cost_owner_id,
        resource.procurement_eligible,resource.source_metadata,
        encode(extensions.digest(convert_to($1||':'||resource.row_sha256||':'||coalesce(projection.new_title,resource.title_ru),'UTF8'),'sha256'),'hex')
        from public.estimate_resource_spec resource
        join r542_definition_mapping mapping on mapping.old_definition_id=resource.definition_version_id
        left join r542_title_projection projection on projection.old_title=resource.title_ru`, [CONTRACT]);
      process.stdout.write(`[${new Date().toISOString()}] R542 resources cloned\n`);
      await client.query(`insert into public.estimate_work_normative_binding(
        definition_version_id,resource_spec_id,locator_id,applicability
      ) select mapping.new_definition_id,new_resource.id,binding.locator_id,binding.applicability
        from public.estimate_work_normative_binding binding
        join r542_definition_mapping mapping on mapping.old_definition_id=binding.definition_version_id
        join public.estimate_resource_spec old_resource on old_resource.id=binding.resource_spec_id
        join public.estimate_resource_spec new_resource on new_resource.definition_version_id=mapping.new_definition_id
          and new_resource.row_id=old_resource.row_id`);
      process.stdout.write(`[${new Date().toISOString()}] R542 normative bindings cloned\n`);

      await client.query(`insert into public.estimate_content_passport_r3(
        definition_version_id,release_id,catalog_id,contract_version,identity_mode,redirect_catalog_id,
        physical_result_ru,included_scope_ru,excluded_scope_ru,capability_matrix,parameter_count,formula_count,
        resource_count,decision,payload_sha256,source_head,source_tree,created_at
      ) select mapping.new_definition_id,$1,passport.catalog_id,passport.contract_version,passport.identity_mode,
        passport.redirect_catalog_id,passport.physical_result_ru,passport.included_scope_ru,passport.excluded_scope_ru,
        passport.capability_matrix,passport.parameter_count,passport.formula_count,passport.resource_count,
        passport.decision||jsonb_build_object('r542RussianContentSuccessor',true),
        encode(extensions.digest(convert_to($2||':'||passport.payload_sha256||':'||mapping.new_definition_id::text,'UTF8'),'sha256'),'hex'),
        $3,$4,now()
        from public.estimate_content_passport_r3 passport
        join r542_definition_mapping mapping on mapping.old_definition_id=passport.definition_version_id`,
      [releaseId, CONTRACT, sourceHead, sourceTree]);

      await client.query(`update public.estimate_definition_version definition set definition_sha256=hash.value
        from (
          select mapping.new_definition_id,
            encode(extensions.digest(convert_to($1||':'||mapping.predecessor_definition_sha256||':'||
              (select coalesce(string_agg(parameter.parameter_id||':'||parameter.title_ru,E'\n' order by parameter.ordinal),'')
                 from public.estimate_parameter_definition parameter where parameter.definition_version_id=mapping.new_definition_id)||':'||
              (select coalesce(string_agg(resource.row_id||':'||resource.row_sha256,E'\n' order by resource.ordinal),'')
                 from public.estimate_resource_spec resource where resource.definition_version_id=mapping.new_definition_id),
              'UTF8'),'sha256'),'hex') value
          from r542_definition_mapping mapping
        ) hash where definition.id=hash.new_definition_id`, [CONTRACT]);

      // A GREEN definition may only be admitted after its complete row graph and
      // immutable content passport exist. Insert successors fail-closed, then
      // restore the predecessor's admitted state through the database gate.
      await client.query(`update public.estimate_definition_version definition set
          content_status=predecessor.content_status,
          content_gate_status=predecessor.content_gate_status
        from r542_definition_mapping mapping
        join public.estimate_definition_version predecessor on predecessor.id=mapping.old_definition_id
        where definition.id=mapping.new_definition_id`);

      await client.query(`insert into public.estimate_cumulative_manifest_entry(
        release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,publication_state,
        approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,entry_sha256,runtime_publication_state
      ) select $2,manifest.catalog_id,mapping.new_definition_id,manifest.source_batch,$2,manifest.domain_id,
        'CANONICAL_SUCCESSOR',mapping.new_baseline_id,true,manifest.scenario_ready,definition.definition_sha256,
        encode(extensions.digest(convert_to($3||':'||manifest.catalog_id||':'||definition.definition_sha256||':'||mapping.new_baseline_id::text,'UTF8'),'sha256'),'hex'),
        manifest.runtime_publication_state
        from public.estimate_cumulative_manifest_entry manifest
        join r542_definition_mapping mapping on mapping.catalog_id=manifest.catalog_id
        join public.estimate_definition_version definition on definition.id=mapping.new_definition_id
        where manifest.release_id=$1`, [PREDECESSOR_RELEASE_ID, releaseId, CONTRACT]);

      await cloneSearchIndex(client, { predecessorSearch, searchReleaseId, releaseId, sourceHead, sourceTree });
      await client.query(`insert into public.estimate_candidate_capability_r3(
        id,environment,tenant_id,release_id,search_release_id,expires_at,purpose,source_head,source_tree,issued_by
      ) values($1,'r542-russian-content-successor',$2,$3,$4,$5,'estimate_candidate_admission_r3',$6,$7,$8)`, [
        capabilityId, TENANT_ID, releaseId, searchReleaseId,
        new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString(), sourceHead, sourceTree,
        "prepareR542RussianContentSuccessor",
      ]);
      const sealed = await client.query(`update public.estimate_definition_release set status='prepared',sealed_at=now()
        where id=$1 and status='draft' and sealed_at is null`, [releaseId]);
      invariant(sealed.rowCount === 1, `R542_CONTENT_SEAL_TRANSITION:${sealed.rowCount}`);
      if (APPLY) await client.query("commit"); else await client.query("rollback");
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    }

    const counts = APPLY ? (await client.query(`select
      (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1) manifest,
      (select count(*)::int from public.estimate_definition_version where release_id=$1) definitions,
      (select count(*)::int from public.estimate_parameter_definition where definition_version_id in
        (select definition_version_id from public.estimate_cumulative_manifest_entry where release_id=$1)) parameters,
      (select count(*)::int from public.estimate_formula_graph where definition_version_id in
        (select definition_version_id from public.estimate_cumulative_manifest_entry where release_id=$1)) formulas,
      (select count(*)::int from public.estimate_resource_spec where definition_version_id in
        (select definition_version_id from public.estimate_cumulative_manifest_entry where release_id=$1)) resources,
      (select count(*)::int from public.estimate_content_passport_r3 where release_id=$1) content_passports,
      (select count(*)::int from public.estimate_approved_template_baseline where accepted_release_id=$1) baselines,
      (select count(*)::int from public.estimate_search_document where search_release_id=$2) search_documents,
      (select count(*)::int from public.estimate_search_group where search_release_id=$2) search_groups,
      (select count(*)::int from public.estimate_search_group_membership where search_release_id=$2) search_memberships,
      (select count(*)::int from public.estimate_resource_spec resource where resource.definition_version_id in
        (select definition_version_id from public.estimate_cumulative_manifest_entry where release_id=$1)
        and resource.title_ru ~* '\\m(project basis|revision|silos|generic|fallback|warning|material|materials|works?|owner|submittals?|concrete|formwork|repair|acceptance)\\M') raw_english_resources
    `, [releaseId, searchReleaseId])).rows[0] as Json : {
      manifest: 3322, definitions: 3322, parameters: predecessor.parameter_count,
      formulas: predecessor.formula_count, resources: predecessor.resource_row_count,
      content_passports: 3322, baselines: 3322,
      search_documents: 3430, search_groups: 682, search_memberships: 3430,
      raw_english_resources: 0,
    };
    invariant(Number(counts.manifest) === 3322 && Number(counts.definitions) === 3322
      && Number(counts.parameters) === Number(predecessor.parameter_count)
      && Number(counts.formulas) === Number(predecessor.formula_count)
      && Number(counts.resources) === Number(predecessor.resource_row_count)
      && Number(counts.content_passports) === 3322 && Number(counts.baselines) === 3322
      && Number(counts.search_documents) === 3430 && Number(counts.search_groups) === 682
      && Number(counts.search_memberships) === 3430 && Number(counts.raw_english_resources) === 0,
    `R542_CONTENT_FINAL_COUNTS:${JSON.stringify(counts)}`);
    const proof = {
      contract: CONTRACT,
      status: APPLY ? "GREEN_R542_RUSSIAN_CONTENT_SUCCESSOR_PREPARED_NOT_ACTIVE" : "GREEN_R542_RUSSIAN_CONTENT_SUCCESSOR_DRY_RUN_ROLLED_BACK",
      capturedAt: new Date().toISOString(),
      masterSha256: MASTER_SHA256,
      source: { branch, head: sourceHead, productSourceSha256: productSource.hash, productSourceFiles: productSource.files.length },
      predecessor: { releaseId: PREDECESSOR_RELEASE_ID, searchReleaseId: PREDECESSOR_SEARCH_RELEASE_ID },
      successor: { releaseId, releaseKey, searchReleaseId, capabilityId, status: APPLY ? "prepared" : "rolled_back", searchStatus: "draft" },
      projection: { distinctChangedTitles: titleProjection.length, definitionVersionsCloned: definitions.length,
        formulasChanged: 0, machineIdentifiersChanged: 0 },
      counts,
      productionAccessed: false,
      activationPerformed: false,
      deployPerformed: false,
      releasePerformed: false,
      otaPerformed: false,
      writesApplied: APPLY ? 1 : 0,
    };
    atomicJson(OUTPUT, { ...proof, payloadSha256: sha256(proof) });
    process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
