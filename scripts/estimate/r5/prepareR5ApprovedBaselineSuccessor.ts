import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { computeReleaseFingerprintPayload } from "../../release/computeReleaseFingerprints";
import { currentHead } from "../../release/releasePipelineRuntime";

type Json = Record<string, any>;

type ParameterRow = {
  parameter_id: string;
  ordinal: number;
  value_type: string;
  unit_id: string | null;
  required: boolean;
  default_value: unknown;
  constraints_json: Json;
  truth_metadata: Json;
};

const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R5_PRODUCTION_GRADE_CONTINUOUS_GLOBAL_GREEN_SINGLE_CANONICAL_CODE_REAL_ESTIMATES_BATCH001_008_RU.md",
);
const MASTER_SHA256 = "45352facf763cd0c628a3e0c8b8bc882821928da5b8eeb9caa386b76e07a3c43";
const DATABASE_URL = process.env.R5_BASELINE_SUCCESSOR_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const PARENT_RELEASE_ID = "be37d1f8-baae-5439-ba71-9b28edb0bb65";
const PARENT_SEARCH_RELEASE_ID = "f94bd479-e84e-556f-9714-a3d19479ea00";
const TENANT_ID = "22222222-2222-4222-8222-222222222222";
const BATCH_RELEASE_KEYS = Object.freeze([
  "r4-batch006-current-candidate-v2",
  "r4-batch007-current-candidate",
  "r4-batch008-current-candidate-v2",
]);
const OUTPUT_PATH = resolve(".release-runtime/r5/evidence/05_R5_BASELINE_INVARIANT.json");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stableJson(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Json;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  const bytes = Buffer.isBuffer(value) || typeof value === "string" ? value : stableJson(value);
  return createHash("sha256").update(bytes).digest("hex");
}

function uuid(value: string): string {
  const bytes = Buffer.from(sha256(value).slice(0, 32), "hex");
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

function exactPathGuard(): void {
  const url = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(url.hostname), `R5_SUCCESSOR_DATABASE_NOT_LOOPBACK:${url.hostname}`);
  invariant(Number(url.port) === 55432 && url.pathname === "/rik_r4_runtime_b5_v2",
    `R5_SUCCESSOR_DATABASE_NOT_EXACT_DISPOSABLE:${url.port}:${url.pathname}`);
}

function successorInputValues(parameters: readonly ParameterRow[], predecessor: Json): Json {
  const values: Json = {};
  for (const parameter of parameters) {
    const constraints = parameter.constraints_json ?? {};
    if (Object.prototype.hasOwnProperty.call(constraints, "admissionSampleValue")) {
      values[parameter.parameter_id] = constraints.admissionSampleValue;
    } else if (Object.prototype.hasOwnProperty.call(predecessor, parameter.parameter_id)) {
      values[parameter.parameter_id] = predecessor[parameter.parameter_id];
    } else if (parameter.default_value != null) {
      values[parameter.parameter_id] = parameter.default_value;
    }
  }
  const enabledExclusiveGroups = new Set<string>();
  for (const parameter of parameters) {
    const group = parameter.constraints_json?.mutuallyExclusiveBooleanGroup;
    if (group == null || values[parameter.parameter_id] !== true) continue;
    if (enabledExclusiveGroups.has(String(group))) values[parameter.parameter_id] = false;
    else enabledExclusiveGroups.add(String(group));
  }
  for (const parameter of parameters) {
    const forbidden = parameter.constraints_json?.forbiddenWhen;
    if (!forbidden || typeof forbidden !== "object" || Array.isArray(forbidden)) continue;
    const controllerId = String(forbidden.parameterId ?? "");
    if (controllerId && values[controllerId] === forbidden.equals) delete values[parameter.parameter_id];
  }
  invariant(Object.keys(values).length > 0, "R5_SUCCESSOR_EMPTY_INPUT_VALUES");
  return values;
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

async function main(): Promise<void> {
  exactPathGuard();
  invariant(sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256, "R5_SUCCESSOR_MASTER_DRIFT");
  const productSource = computeReleaseFingerprintPayload("productSourceHash");
  process.stdout.write(`[${new Date().toISOString()}] R5 successor fingerprints ready\n`);
  const sourceHead = currentHead();
  const sourceTree = productSource.hash.slice(0, 40);
  const successorKey = `r5-global-approved-baseline-successor-${productSource.hash.slice(0, 12)}`;
  const successorReleaseId = uuid(`${successorKey}:definition-release`);
  const successorSearchReleaseId = uuid(`${successorKey}:search-release`);
  const capabilityId = uuid(`${successorKey}:capability:${TENANT_ID}`);
  const acceptedAt = "2026-08-23T18:30:00.000+06:00";
  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "r5-approved-baseline-successor",
    statement_timeout: 0,
  });
  await client.connect();
  try {
    const parentRelease = (await client.query(`select * from public.estimate_definition_release where id=$1`, [PARENT_RELEASE_ID])).rows[0] as Json;
    const parentSearch = (await client.query(`select * from public.estimate_search_index_release where id=$1`, [PARENT_SEARCH_RELEASE_ID])).rows[0] as Json;
    invariant(parentRelease?.status === "prepared" && parentSearch?.status === "draft", "R5_SUCCESSOR_PARENT_STATE_RED");
    process.stdout.write(`[${new Date().toISOString()}] R5 successor parent ready\n`);
    const removedConstraints = Number((await client.query(`
      select count(*)::integer count from pg_constraint
      where conrelid='public.estimate_approved_template_baseline'::regclass
        and conname in (
          'estimate_approved_template_baseline_definition_version_id_key',
          'estimate_approved_template_ba_catalog_id_source_definition__key'
        )
    `)).rows[0].count);
    invariant(removedConstraints === 0, `R5_SUCCESSOR_HISTORY_MIGRATION_MISSING:${removedConstraints}`);

    const targetEntries = (await client.query(`
      select manifest.catalog_id,manifest.definition_version_id::text,source_release.release_key,
        baseline.id::text predecessor_baseline_id,baseline.source_definition_version_id::text,
        baseline.parameter_schema_sha256
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      join public.estimate_definition_release source_release on source_release.id=definition.release_id
      join public.estimate_approved_template_baseline baseline on baseline.id=manifest.approved_template_baseline_id
      where manifest.release_id=$1 and source_release.release_key=any($2::text[])
      order by manifest.catalog_id
    `, [PARENT_RELEASE_ID, BATCH_RELEASE_KEYS])).rows as Json[];
    invariant(targetEntries.length === 2321, `R5_SUCCESSOR_TARGET_DENOMINATOR_RED:${targetEntries.length}/2321`);
    process.stdout.write(`[${new Date().toISOString()}] R5 successor target entries ${targetEntries.length}/2321\n`);
    let changedValues = 0;
    let numericSampleValues = 0;
    const baselineRows: Json[] = [];
    const preparationChunkSize = 240;
    for (let offset = 0; offset < targetEntries.length; offset += preparationChunkSize) {
      const entries = targetEntries.slice(offset, offset + preparationChunkSize);
      process.stdout.write(`[${new Date().toISOString()}] R5 baseline fixture chunk ${offset + 1}-${offset + entries.length}\n`);
      const definitionIds = entries.map((row) => String(row.definition_version_id));
      const predecessorIds = entries.map((row) => String(row.predecessor_baseline_id));
      const predecessorInputs = new Map<string, Json>((await client.query(`
        select id::text,input_values from public.estimate_approved_template_baseline where id=any($1::uuid[])
      `, [predecessorIds])).rows.map((row) => [String(row.id), row.input_values as Json]));
      invariant(predecessorInputs.size === entries.length,
        `R5_SUCCESSOR_PREDECESSOR_INPUT_COUNT_RED:${predecessorInputs.size}/${entries.length}`);
      const parameterRows = (await client.query(`
        select definition_version_id::text,parameter_id,ordinal,value_type,unit_id,required,default_value,
          constraints_json
        from public.estimate_parameter_definition
        where definition_version_id=any($1::uuid[])
        order by definition_version_id,ordinal
      `, [definitionIds])).rows as Json[];
      const parametersByDefinition = new Map<string, ParameterRow[]>();
      for (const row of parameterRows) {
        const definitionId = String(row.definition_version_id);
        const rows = parametersByDefinition.get(definitionId) ?? [];
        rows.push({
          parameter_id: String(row.parameter_id),
          ordinal: Number(row.ordinal),
          value_type: String(row.value_type),
          unit_id: row.unit_id == null ? null : String(row.unit_id),
          required: row.required === true,
          default_value: row.default_value,
          constraints_json: row.constraints_json ?? {},
          truth_metadata: {},
        });
        parametersByDefinition.set(definitionId, rows);
      }
      invariant(parametersByDefinition.size === entries.length,
        `R5_SUCCESSOR_PARAMETER_DEFINITION_COUNT_RED:${parametersByDefinition.size}/${entries.length}`);
      for (const entry of entries) {
        const parameters = parametersByDefinition.get(String(entry.definition_version_id))!;
        const predecessorValues = predecessorInputs.get(String(entry.predecessor_baseline_id))!;
        const inputValues = successorInputValues(parameters, predecessorValues);
        for (const parameter of parameters) {
          if (Object.prototype.hasOwnProperty.call(parameter.constraints_json, "admissionSampleValue")
            && ["decimal", "integer"].includes(parameter.value_type)) numericSampleValues += 1;
          if (stableJson(inputValues[parameter.parameter_id]) !== stableJson(predecessorValues[parameter.parameter_id])) changedValues += 1;
        }
        const inputSha256 = sha256(inputValues);
        const baselineId = uuid(`${successorKey}:baseline:${entry.catalog_id}:${inputSha256}`);
        baselineRows.push({
          id: baselineId,
          predecessorId: String(entry.predecessor_baseline_id),
          baselineKey: `${successorKey}:${entry.catalog_id}:${inputSha256.slice(0, 16)}`,
          catalogId: String(entry.catalog_id),
          definitionVersionId: String(entry.definition_version_id),
          sourceDefinitionVersionId: String(entry.source_definition_version_id),
          parameterSchemaSha256: String(entry.parameter_schema_sha256),
          inputValues,
          acceptanceEvidenceSha256: sha256({
            contract: "R5_APPROVED_BASELINE_SUCCESSOR_V1",
            masterSha256: MASTER_SHA256,
            catalogId: entry.catalog_id,
            definitionVersionId: entry.definition_version_id,
            predecessorBaselineId: entry.predecessor_baseline_id,
            parameterSchemaSha256: entry.parameter_schema_sha256,
            inputSha256,
          }),
        });
      }
      process.stdout.write(`[${new Date().toISOString()}] R5 baseline fixtures ${baselineRows.length}/${targetEntries.length}\n`);
    }
    invariant(changedValues > 0 && numericSampleValues > 0, `R5_SUCCESSOR_NO_MATERIAL_BASELINE_CHANGE:${changedValues}/${numericSampleValues}`);
    const baselineByCatalog = new Map(baselineRows.map((row) => [row.catalogId, row]));

    const parentManifest = (await client.query(`
      select * from public.estimate_cumulative_manifest_entry where release_id=$1 order by catalog_id
    `, [PARENT_RELEASE_ID])).rows as Json[];
    invariant(parentManifest.length === Number(parentRelease.definition_count),
      `R5_SUCCESSOR_PARENT_MANIFEST_RED:${parentManifest.length}/${parentRelease.definition_count}`);
    const manifestRows = parentManifest.map((row) => {
      const successorBaseline = baselineByCatalog.get(String(row.catalog_id));
      const baselineId = successorBaseline?.id ?? String(row.approved_template_baseline_id);
      return {
        releaseId: successorReleaseId,
        catalogId: String(row.catalog_id),
        definitionVersionId: String(row.definition_version_id),
        sourceBatch: String(row.source_batch),
        sourceReleaseId: String(row.source_release_id),
        domainId: String(row.domain_id),
        publicationState: String(row.publication_state),
        approvedTemplateBaselineId: baselineId,
        baselineReady: row.baseline_ready === true,
        scenarioReady: row.scenario_ready === true,
        definitionHash: String(row.definition_hash),
        entrySha256: sha256({
          releaseId: successorReleaseId,
          catalogId: row.catalog_id,
          definitionVersionId: row.definition_version_id,
          approvedTemplateBaselineId: baselineId,
          definitionHash: row.definition_hash,
        }),
        runtimePublicationState: String(row.runtime_publication_state),
      };
    });

    await client.query("begin");
    try {
      await client.query(`insert into public.estimate_definition_release(
        id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
        definition_count,resource_row_count,metadata,created_at,sealed_at,parent_release_id,
        source_package_sha256,parameter_count,formula_count
      ) values($1,$2,$3,'draft',$4,$5,$6,$7,$8,$9::jsonb,$10,null,$11,$12,$13,$14)
      on conflict(id) do nothing`, [
        successorReleaseId,
        successorKey,
        Number(parentRelease.schema_version),
        sourceHead,
        sourceTree,
        productSource.hash,
        Number(parentRelease.definition_count),
        Number(parentRelease.resource_row_count),
        JSON.stringify({
          contract: "rik-expo-app-r5.approved-baseline-successor.v1",
          masterSha256: MASTER_SHA256,
          parentReleaseId: PARENT_RELEASE_ID,
          parentSearchReleaseId: PARENT_SEARCH_RELEASE_ID,
          immutableBaselineSuccessors: baselineRows.length,
          activationAllowed: false,
          localDisposable: true,
          productionAccessed: false,
        }),
        acceptedAt,
        PARENT_RELEASE_ID,
        sha256({ MASTER_SHA256, successorKey, productSourceHash: productSource.hash, baselineRows: baselineRows.map((row) => row.acceptanceEvidenceSha256) }),
        Number(parentRelease.parameter_count),
        Number(parentRelease.formula_count),
      ]);

      await insertJsonRecords(client, `insert into public.estimate_approved_template_baseline(
        id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,parameter_schema_sha256,
        input_values,input_classification,uom_by_parameter,formula_consumer_ids,resource_consumer_row_ids,
        normative_source_ids,guide_provenance_ru,proposal_source_refs,validation_scenario_refs,
        acceptance_evidence_sha256,accepted_release_id,accepted_at,supersedes_baseline_id,contract_version
      ) select x.id::uuid,x."baselineKey",x."catalogId",x."definitionVersionId"::uuid,
        x."sourceDefinitionVersionId"::uuid,x."parameterSchemaSha256",x."inputValues",predecessor.input_classification,
        predecessor.uom_by_parameter,predecessor.formula_consumer_ids,predecessor.resource_consumer_row_ids,
        predecessor.normative_source_ids,predecessor.guide_provenance_ru,
        predecessor.proposal_source_refs || jsonb_build_array(jsonb_build_object(
          'contract','R5.0','reason','ADMISSION_SAMPLE_REPLACES_PERMISSIVE_MINIMUM',
          'predecessorBaselineId',x."predecessorId")),
        predecessor.validation_scenario_refs || jsonb_build_array(jsonb_build_object(
          'contract','R5_BASELINE_POSITIVE_QUANTITY_CANARY_V1','inputSha256',x."inputSha256")),
        x."acceptanceEvidenceSha256",
        '${successorReleaseId}'::uuid,'${acceptedAt}'::timestamptz,x."predecessorId"::uuid,
        'APPROVED_TEMPLATE_BASELINE_R54_V1'
      from jsonb_to_recordset($1::jsonb) as x(
        id text,"baselineKey" text,"catalogId" text,"definitionVersionId" text,"sourceDefinitionVersionId" text,
        "parameterSchemaSha256" text,"inputValues" jsonb,"inputSha256" text,
        "acceptanceEvidenceSha256" text,"predecessorId" text
      ) join public.estimate_approved_template_baseline predecessor on predecessor.id=x."predecessorId"::uuid
      on conflict(id) do nothing`, baselineRows.map((row) => ({ ...row, inputSha256: sha256(row.inputValues) })), 12, "R5 baseline successors");

      await insertJsonRecords(client, `insert into public.estimate_cumulative_manifest_entry(
        release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,publication_state,
        approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,entry_sha256,runtime_publication_state
      ) select x."releaseId"::uuid,x."catalogId",x."definitionVersionId"::uuid,x."sourceBatch",
        x."sourceReleaseId"::uuid,x."domainId",x."publicationState",x."approvedTemplateBaselineId"::uuid,
        x."baselineReady",x."scenarioReady",x."definitionHash",x."entrySha256",x."runtimePublicationState"
      from jsonb_to_recordset($1::jsonb) as x(
        "releaseId" text,"catalogId" text,"definitionVersionId" text,"sourceBatch" text,"sourceReleaseId" text,
        "domainId" text,"publicationState" text,"approvedTemplateBaselineId" text,"baselineReady" boolean,
        "scenarioReady" boolean,"definitionHash" text,"entrySha256" text,"runtimePublicationState" text
      ) on conflict(release_id,catalog_id) do nothing`, manifestRows, 180, "R5 cumulative manifest");

      await client.query(`insert into public.estimate_search_index_release(
        id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,
        source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata,created_at
      ) values($1,$2,'draft',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13)
      on conflict(id) do nothing`, [
        successorSearchReleaseId,
        `${successorKey}-search`,
        String(parentSearch.taxonomy_version),
        String(parentSearch.group_relation_version),
        String(parentSearch.ranking_contract_version),
        sourceHead,
        sourceTree,
        sha256({ successorSearchReleaseId, parentSnapshot: parentSearch.snapshot_sha256, successorReleaseId }),
        Number(parentSearch.global_count),
        Number(parentSearch.external_count),
        Number(parentSearch.discovered_count),
        JSON.stringify({
          contract: "rik-expo-app-r5.approved-baseline-successor.v1",
          masterSha256: MASTER_SHA256,
          parentSearchReleaseId: PARENT_SEARCH_RELEASE_ID,
          definitionReleaseId: successorReleaseId,
          activationAllowed: false,
          localDisposable: true,
        }),
        acceptedAt,
      ]);
      await client.query(`insert into public.estimate_search_group(
        search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
        breadcrumb,member_count,member_set_sha256,oracle_disposition
      ) select $1,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
        breadcrumb,member_count,member_set_sha256,oracle_disposition
      from public.estimate_search_group where search_release_id=$2
      on conflict(search_release_id,group_id) do nothing`, [successorSearchReleaseId, PARENT_SEARCH_RELEASE_ID]);
      await client.query(`insert into public.estimate_search_document(
        search_release_id,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,group_id,subgroup_id,
        element_type,operation_kind,technology_variant,construction_state,primary_uom,canonical_name_ru,aliases,
        normative_classifiers,applicability_tags,publication_state,catalog_origin,definition_release_id,short_scope_ru,
        key_distinguishing_parameters,required_inputs_count,clarification_fields,included_boundaries,excluded_boundaries,
        replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,normalized_aliases,normalized_search_terms,
        normalized_search_blob,source_provenance,document_sha256,adjudication_class,selectable,
        canonical_target_catalog_id,definition_version_id
      ) select $1::uuid,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,group_id,subgroup_id,
        element_type,operation_kind,technology_variant,construction_state,primary_uom,canonical_name_ru,aliases,
        normative_classifiers,applicability_tags,publication_state,catalog_origin,definition_release_id,short_scope_ru,
        key_distinguishing_parameters,required_inputs_count,clarification_fields,included_boundaries,excluded_boundaries,
        replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,normalized_aliases,normalized_search_terms,
        normalized_search_blob,source_provenance || jsonb_build_object('r5BaselineSuccessorReleaseId',$2::text),
        encode(extensions.digest(
          convert_to($1::uuid::text || ':' || catalog_id || ':' || document_sha256, 'UTF8'),
          'sha256'::text
        ), 'hex'),
        adjudication_class,selectable,canonical_target_catalog_id,definition_version_id
      from public.estimate_search_document where search_release_id=$3
      on conflict(search_release_id,catalog_id) do nothing`, [successorSearchReleaseId, successorReleaseId, PARENT_SEARCH_RELEASE_ID]);
      await client.query(`insert into public.estimate_search_group_membership(
        search_release_id,group_id,catalog_id,ordinal,independent_disposition
      ) select $1,group_id,catalog_id,ordinal,independent_disposition
      from public.estimate_search_group_membership where search_release_id=$2
      on conflict(search_release_id,group_id,catalog_id) do nothing`, [successorSearchReleaseId, PARENT_SEARCH_RELEASE_ID]);
      await client.query(`insert into public.estimate_search_clarification_question
        select $1,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,answer_type,unit_id,
          allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence
        from public.estimate_search_clarification_question where search_release_id=$2
        on conflict do nothing`, [successorSearchReleaseId, PARENT_SEARCH_RELEASE_ID]);
      await client.query(`insert into public.estimate_search_typed_relation
        select $1,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
          applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256
        from public.estimate_search_typed_relation where search_release_id=$2
        on conflict do nothing`, [successorSearchReleaseId, PARENT_SEARCH_RELEASE_ID]);
      await client.query(`insert into public.estimate_candidate_capability_r3(
        id,environment,tenant_id,release_id,search_release_id,expires_at,purpose,source_head,source_tree,issued_by
      ) values($1,'r5-global-baseline-successor',$2,$3,$4,$5,'estimate_candidate_admission_r3',$6,$7,$8)
      on conflict(id) do nothing`, [
        capabilityId,
        TENANT_ID,
        successorReleaseId,
        successorSearchReleaseId,
        new Date(Date.now() + 72 * 60 * 60_000).toISOString(),
        sourceHead,
        sourceTree,
        "prepareR5ApprovedBaselineSuccessor",
      ]);
      const sealed = await client.query(`update public.estimate_definition_release
        set status='prepared',sealed_at=$2
        where id=$1 and status='draft' and sealed_at is null`, [successorReleaseId, acceptedAt]);
      invariant(sealed.rowCount === 1, `R5_SUCCESSOR_SEAL_TRANSITION_RED:${sealed.rowCount}`);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }

    const counts = (await client.query(`
      select
        (select count(*)::integer from public.estimate_cumulative_manifest_entry where release_id=$1) manifest,
        (select count(*)::integer from public.estimate_cumulative_manifest_entry
          where release_id=$1 and baseline_ready and approved_template_baseline_id is not null) ready_with_baseline,
        (select count(*)::integer from public.estimate_approved_template_baseline where accepted_release_id=$1) successor_baselines,
        (select count(*)::integer from public.estimate_search_document where search_release_id=$2) search_documents,
        (select count(*)::integer from public.estimate_search_document where search_release_id=$2 and selectable) selectable,
        (select count(*)::integer from public.estimate_search_group where search_release_id=$2) search_groups,
        (select count(*)::integer from public.estimate_search_group_membership where search_release_id=$2) memberships,
        (select count(*)::integer from public.estimate_cumulative_manifest_entry manifest
          where manifest.release_id=$1 and public.estimate_content_passport_software_ready_r4($1,manifest.catalog_id,$3)) software_ready
    `, [successorReleaseId, successorSearchReleaseId, TENANT_ID])).rows[0] as Json;
    invariant(Number(counts.manifest) === Number(parentRelease.definition_count)
      && Number(counts.ready_with_baseline) === Number(parentRelease.definition_count)
      && Number(counts.successor_baselines) === targetEntries.length
      && Number(counts.search_documents) === 3430 && Number(counts.selectable) === 3322
      && Number(counts.search_groups) === 682 && Number(counts.memberships) === 3430
      && Number(counts.software_ready) === Number(parentRelease.definition_count),
    `R5_SUCCESSOR_FINAL_COUNTS_RED:${JSON.stringify(counts)}`);
    const payload = {
      contract: "rik-expo-app-r5.approved-baseline-successor.v1",
      status: "GREEN_IMMUTABLE_BASELINE_SUCCESSOR_PREPARED_NO_RELEASE",
      master_sha256: MASTER_SHA256,
      source: {
        head: sourceHead,
        product_source_sha256: productSource.hash,
        product_source_files: productSource.files.length,
      },
      parent: { release_id: PARENT_RELEASE_ID, search_release_id: PARENT_SEARCH_RELEASE_ID },
      successor: {
        release_id: successorReleaseId,
        release_key: successorKey,
        search_release_id: successorSearchReleaseId,
        capability_id: capabilityId,
        status: "prepared",
        search_status: "draft",
      },
      baseline_repair: {
        batches: ["BATCH-006", "BATCH-007", "BATCH-008"],
        immutable_successor_baselines: baselineRows.length,
        predecessor_baselines_updated: 0,
        definition_versions_rewritten: 0,
        numeric_admission_sample_values: numericSampleValues,
        changed_parameter_values: changedValues,
      },
      invariant: {
        ready_iff_approved_baseline_id_present: Number(counts.ready_with_baseline) === Number(counts.manifest),
        all_content_passports_software_ready: Number(counts.software_ready) === Number(counts.manifest),
        one_direct_successor_constraint: true,
      },
      counts,
      production_accessed: false,
      activation_performed: false,
      deploy_performed: false,
      release_performed: false,
    };
    atomicJson(OUTPUT_PATH, { ...payload, payload_sha256: sha256(payload) });
    process.stdout.write(`${JSON.stringify({
      status: payload.status,
      releaseId: successorReleaseId,
      searchReleaseId: successorSearchReleaseId,
      capabilityId,
      successorBaselines: baselineRows.length,
      changedValues,
      counts,
      output: OUTPUT_PATH.replace(/\\/gu, "/"),
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
