import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  buildAllBatch003R56CanonicalSuccessorDefinitions,
  type Batch003R56CanonicalSuccessorDefinition,
} from "../r5/batch003R56SharedCoreProjection";
import { batch003R56FixtureValues } from "../r5/batch003R56Fixtures";
import { buildBatch001DrywallSuccessorR3 } from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadSuccessorR3";

type Json = Record<string, any>;

const MASTER_PATH = resolve(process.env.R4A13_MASTER_PATH
  ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_4_ONE_PLATFORM_CORE_EXISTING_NORMS_GLOBAL_ESTIMATES_RU.md");
const MASTER_SHA256 = process.env.R4A13_MASTER_SHA256
  ?? "0ff759893b3660c64e094de5763b443e35fa9ec8cb861132a7bed455d763e3ac";
const ADDENDUM_SHA256 = process.env.R4A13_ADDENDUM_SHA256 ?? "";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const EXPECTED_PARENT_RELEASE_ID = process.env.R4A13_PARENT_RELEASE_ID
  ?? "09334d6c-f14b-5eb7-a1e5-018959107591";
const EXPECTED_PARENT_SEARCH_RELEASE_ID = process.env.R4A13_PARENT_SEARCH_RELEASE_ID
  ?? "6567fdb4-1634-5dd0-a426-d444f749e0ea";
const BATCH003_SOURCE_RELEASE_ID = process.env.R4A13_BATCH003_SOURCE_RELEASE_ID
  ?? "f03a106c-1d41-46d0-a6a6-f2cc11b28d43";
const BATCH001_SOURCE_RELEASE_ID = process.env.R4A13_BATCH001_SOURCE_RELEASE_ID
  ?? "4f354c06-746c-4ad8-9fe6-3e3d1983f7a2";
const CONTRACT = process.env.R4A13_SUCCESSOR_CONTRACT
  ?? "rik-expo-app.r568.r4-a13-4-existing-norm-successor.v1";
const EXPECTED_BRANCH = process.env.R4A13_EXPECTED_BRANCH ?? "codex/r4-a5-clean-08b18902";
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const APPLY = process.argv.includes("--apply");
const ALLOW_DIRTY_SOURCE = process.env.R4A13_ALLOW_DIRTY_SOURCE === "true";
const OUTPUT_ROOT = resolve(
  process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r4a13-4/platform-core-global/existing-norm-successor",
);
const MANAGED_SOURCE_PATHS = [
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
  "scripts/estimate/r4a8/prepareR4A8DrywallScopeSuccessor.contract.test.ts",
  "scripts/estimate/r4a8/prepareR4A8DrywallScopeSuccessor.ts",
  "scripts/estimate/r5/batch003R56Fixtures.ts",
  "scripts/estimate/r5/batch003R56SharedCoreProjection.ts",
  "src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsProfessionalV4.ts",
  "src/lib/estimate/v4/domains/interiorFinishesComplete/drywallFlatCeilingExpectedScopeV6.ts",
  "src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadSuccessorR3.ts",
] as const;

const W3_SOURCE_ID = "drywall_ceiling_interior_drywall_ceiling_align_large_area";
const W4_SOURCE_ID = "drywall_ceiling_interior_drywall_ceiling_frame_standard";
const W12_SOURCE_ID = "drywall_ceiling_interior_drywall_ceiling_prepare_large_area";
const BULKHEAD_FRAME_SOURCE_ID = "drywall_ceiling_interior_bulkhead_frame_standard";
const ASPHALT_DRAIN_CATALOG_ID = "canonical-work:base:paving_roads_landscape_interior_asphalt_drain_large_area";
const BULKHEAD_FRAME_SOURCE_DEFINITION_SHA256 = "be7d901f1a2b3efdd50766187df63d7f229de6b59c2f664b6a2d02717ee106b1";
const OMITTED_PRICE_INPUT = /^(?:unit_price_|price_basis_(?:date|reference)$)/u;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Json;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function sha256(value: string | Buffer | unknown): string {
  const bytes = typeof value === "string" || Buffer.isBuffer(value) ? value : stableJson(value);
  return createHash("sha256").update(bytes).digest("hex");
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
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function exactDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `STOP_R4_A8_DRYWALL_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_R4_A8_DRYWALL_DATABASE_NOT_DISPOSABLE:${parsed.port}:${parsed.pathname}`);
}

function targetCatalogId(sourceCatalogId: string): string {
  return sourceCatalogId.startsWith("canonical-work:")
    ? sourceCatalogId
    : `canonical-work:base:${sourceCatalogId}`;
}

function expectedPublishedParameterIds(definition: Batch003R56CanonicalSuccessorDefinition): string[] {
  return definition.parameters
    .map((parameter) => parameter.parameterId)
    .filter((parameterId) => !OMITTED_PRICE_INPUT.test(parameterId))
    .sort();
}

function publishedResourceCategory(category: string): string {
  if (category === "labor") return "construction_work";
  if (category === "equipment") return "machine_equipment";
  if (category === "material") return "material";
  return "delivery";
}

async function verifyBatch003Source(client: Client, definitions: readonly Batch003R56CanonicalSuccessorDefinition[]): Promise<Json> {
  const sourceCatalogIds = definitions.map((definition) => definition.catalogId);
  const sourceDefinitions = (await client.query(`select definition.id::text,definition.catalog_id,
      definition.definition_sha256,definition.content_status,definition.content_gate_status,
      baseline.id::text baseline_id,baseline.input_values,passport.definition_version_id::text passport_definition_id
    from public.estimate_definition_version definition
    join public.estimate_approved_template_baseline baseline on baseline.definition_version_id=definition.id
    join public.estimate_content_passport_r3 passport on passport.definition_version_id=definition.id
    where definition.release_id=$1 and definition.catalog_id=any($2::text[])
    order by definition.catalog_id`, [BATCH003_SOURCE_RELEASE_ID, sourceCatalogIds])).rows as Json[];
  invariant(sourceDefinitions.length === 36, `STOP_R4_A8_DRYWALL_SOURCE_DEFINITIONS:${sourceDefinitions.length}/36`);
  const sourceByCatalog = new Map(sourceDefinitions.map((row) => [String(row.catalog_id), row]));
  let formulaCount = 0;
  let resourceCount = 0;
  let parameterCount = 0;

  for (const definition of definitions) {
    const source = sourceByCatalog.get(definition.catalogId);
    invariant(source && source.content_status === "CANDIDATE_READY" && source.content_gate_status === "GREEN",
      `STOP_R4_A8_DRYWALL_SOURCE_NOT_GREEN:${definition.catalogId}`);
    const parameters = (await client.query(`select parameter_id from public.estimate_parameter_definition
      where definition_version_id=$1 order by parameter_id`, [source.id])).rows.map((row) => String(row.parameter_id));
    const expectedParameters = expectedPublishedParameterIds(definition);
    invariant(stableJson(parameters) === stableJson(expectedParameters),
      `STOP_R4_A8_DRYWALL_PARAMETER_OWNER_DRIFT:${definition.catalogId}`);
    const fixture = batch003R56FixtureValues(definition);
    const expectedBaseline = Object.fromEntries(expectedParameters.map((parameterId) => [parameterId, fixture[parameterId]]));
    invariant(stableJson(source.input_values) === stableJson(expectedBaseline),
      `STOP_R4_A8_DRYWALL_BASELINE_DRIFT:${definition.catalogId}`);

    const formulas = (await client.query(`select formula_id,expression_source,input_parameter_ids,output_unit_id
      from public.estimate_formula_graph where definition_version_id=$1 order by formula_id`, [source.id])).rows as Json[];
    const expectedFormulas = [...definition.formulas]
      .sort((left, right) => left.formulaId.localeCompare(right.formulaId))
      .map((formula) => ({
        formula_id: formula.formulaId,
        expression_source: formula.expressionSource,
        input_parameter_ids: [...formula.inputParameterIds].sort(),
        output_unit_id: formula.outputUnitId,
      }));
    const normalizedFormulas = formulas.map((formula) => ({
      formula_id: formula.formula_id,
      expression_source: formula.expression_source,
      input_parameter_ids: [...formula.input_parameter_ids].sort(),
      output_unit_id: formula.output_unit_id,
    }));
    invariant(stableJson(normalizedFormulas) === stableJson(expectedFormulas),
      `STOP_R4_A8_DRYWALL_FORMULA_OWNER_DRIFT:${definition.catalogId}`);

    const resources = (await client.query(`select row_id,ordinal,category,title_ru,unit_id,formula_id,
        semantic_owner,cost_owner_id,procurement_eligible
      from public.estimate_resource_spec where definition_version_id=$1 order by ordinal`, [source.id])).rows as Json[];
    const expectedResources = definition.resources.map((resource) => ({
      row_id: resource.rowId,
      ordinal: resource.ordinal,
      category: publishedResourceCategory(resource.category),
      title_ru: resource.titleRu,
      unit_id: resource.outputUnitId,
      formula_id: resource.formulaId,
      semantic_owner: resource.semanticOwnerId,
      cost_owner_id: resource.costOwnerId,
      procurement_eligible: resource.procurementEligible,
    }));
    invariant(stableJson(resources) === stableJson(expectedResources),
      `STOP_R4_A8_DRYWALL_RESOURCE_OWNER_DRIFT:${definition.catalogId}`);
    parameterCount += parameters.length;
    formulaCount += formulas.length;
    resourceCount += resources.length;
  }
  const w3 = definitions.find((definition) => definition.catalogId === W3_SOURCE_ID);
  const w4 = definitions.find((definition) => definition.catalogId === W4_SOURCE_ID);
  const w12 = definitions.find((definition) => definition.catalogId === W12_SOURCE_ID);
  invariant(w3?.resources.length === 11 && w4?.resources.length === 31,
    `STOP_R4_A8_DRYWALL_W3_W4_SCOPE_COUNTS:${w3?.resources.length}/${w4?.resources.length}`);
  invariant(w12?.resources.length === 29
    && w12.resources.every((resource) => !/:operation_work|:incoming_delivery|:waste_haul|:access_delivery_return$/u.test(resource.rowId)),
  `STOP_R4_A13_DRYWALL_W12_SCOPE:${w12?.resources.length}`);
  const forbiddenW4 = /(?:cladding_boards|insulation_mat|joint_(?:compound|reinforcement_tape|finish)|sheet|board_waste)/iu;
  invariant(w4.resources.every((resource) => !forbiddenW4.test(`${resource.rowId} ${resource.titleRu}`)),
    "STOP_R4_A8_DRYWALL_W4_NEIGHBOR_SCOPE_PRESENT");
  return {
    definitionCount: definitions.length,
    parameterCount,
    formulaCount,
    resourceCount,
    w3Rows: w3.resources.length,
    w4Rows: w4.resources.length,
    w12Rows: w12.resources.length,
    sourceReleaseId: BATCH003_SOURCE_RELEASE_ID,
  };
}

async function verifyBulkheadFrameSource(client: Client): Promise<Json> {
  const definition = buildBatch001DrywallSuccessorR3(BULKHEAD_FRAME_SOURCE_ID);
  invariant(definition.contentDecision.allowed && definition.domainDecision.allowed,
    "STOP_R4_A13_BULKHEAD_SOURCE_CODE_NOT_ADMITTED");
  invariant(definition.resources.length === 16,
    `STOP_R4_A13_BULKHEAD_SOURCE_CODE_ROWS:${definition.resources.length}/16`);
  const forbidden = /(?:лист.*гипс|изоляц|шпаклев|лент.*шв|обшив|заделк.*шв|шлифов|налогов)/iu;
  invariant(definition.resources.every((resource) => !forbidden.test(`${resource.rowId} ${resource.titleRu}`)),
    "STOP_R4_A13_BULKHEAD_SOURCE_CODE_NEIGHBOR_SCOPE_PRESENT");

  const source = (await client.query(`select definition.id::text,definition.definition_sha256,
      definition.content_status,definition.content_gate_status,baseline.id::text baseline_id,
      baseline.input_values,baseline.input_classification,
      (select count(*)::int from public.estimate_parameter_definition parameter
        where parameter.definition_version_id=definition.id) parameter_count,
      (select count(*)::int from public.estimate_formula_graph formula
        where formula.definition_version_id=definition.id) formula_count,
      (select count(*)::int from public.estimate_resource_spec resource
        where resource.definition_version_id=definition.id) resource_count,
      (select count(*)::int from public.estimate_resource_spec resource
        where resource.definition_version_id=definition.id
          and lower(resource.title_ru)~'(лист.*гипс|изоляц|шпаклев|лент.*шв|обшив|заделк.*шв|шлифов|налогов)') forbidden_rows
    from public.estimate_definition_version definition
    join public.estimate_approved_template_baseline baseline on baseline.definition_version_id=definition.id
    where definition.release_id=$1 and definition.catalog_id=$2`, [
    BATCH001_SOURCE_RELEASE_ID,
    BULKHEAD_FRAME_SOURCE_ID,
  ])).rows[0] as Json | undefined;
  invariant(source && source.content_status === "CANDIDATE_READY" && source.content_gate_status === "GREEN",
    "STOP_R4_A13_BULKHEAD_SOURCE_DB_NOT_GREEN");
  invariant(source.definition_sha256 === BULKHEAD_FRAME_SOURCE_DEFINITION_SHA256,
    "STOP_R4_A13_BULKHEAD_SOURCE_SHA_DRIFT");
  invariant(Number(source.parameter_count) === 40 && Number(source.formula_count) === 17
    && Number(source.resource_count) === 16 && Number(source.forbidden_rows) === 0,
  `STOP_R4_A13_BULKHEAD_SOURCE_DB_COUNTS:${source.parameter_count}/${source.formula_count}/${source.resource_count}/${source.forbidden_rows}`);
  return {
    sourceReleaseId: BATCH001_SOURCE_RELEASE_ID,
    sourceDefinitionId: source.id,
    sourceDefinitionSha256: source.definition_sha256,
    sourceBaselineId: source.baseline_id,
    parameterCount: Number(source.parameter_count),
    formulaCount: Number(source.formula_count),
    resourceCount: Number(source.resource_count),
    targetCatalogId: targetCatalogId(BULKHEAD_FRAME_SOURCE_ID),
  };
}

async function verifyAsphaltDrainSource(client: Client): Promise<Json> {
  const source = (await client.query(`select definition.id::text,definition.definition_sha256,
      definition.content_status,definition.content_gate_status,baseline.id::text baseline_id,
      baseline.input_values,baseline.input_classification,
      (select count(*)::int from public.estimate_parameter_definition parameter
        where parameter.definition_version_id=definition.id) parameter_count,
      (select count(*)::int from public.estimate_parameter_definition parameter
        where parameter.definition_version_id=definition.id
          and parameter.truth_metadata->>'visibility_role'='USER_INPUT') user_input_count,
      (select count(*)::int from public.estimate_formula_graph formula
        where formula.definition_version_id=definition.id) formula_count,
      (select count(*)::int from public.estimate_resource_spec resource
        where resource.definition_version_id=definition.id) resource_count
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
    join public.estimate_approved_template_baseline baseline on baseline.definition_version_id=definition.id
    where manifest.release_id=$1 and manifest.catalog_id=$2`, [
    EXPECTED_PARENT_RELEASE_ID,
    ASPHALT_DRAIN_CATALOG_ID,
  ])).rows[0] as Json | undefined;
  invariant(source && source.content_status === "CANDIDATE_READY" && source.content_gate_status === "GREEN",
    "STOP_R4_A13_DRAIN_SOURCE_DB_NOT_GREEN");
  invariant(Number(source.parameter_count) === 61 && Number(source.user_input_count) === 61
    && Number(source.formula_count) === 34 && Number(source.resource_count) === 61,
  `STOP_R4_A13_DRAIN_SOURCE_DB_COUNTS:${source.parameter_count}/${source.user_input_count}/${source.formula_count}/${source.resource_count}`);
  invariant(Object.keys(source.input_values ?? {}).every((parameterId) =>
    source.input_classification?.[parameterId] === "FIXTURE_ONLY"),
  "STOP_R4_A13_DRAIN_SOURCE_RUNTIME_BASELINE_PRESENT");
  return {
    sourceReleaseId: EXPECTED_PARENT_RELEASE_ID,
    sourceDefinitionId: source.id,
    sourceDefinitionSha256: source.definition_sha256,
    sourceBaselineId: source.baseline_id,
    parameterCount: Number(source.parameter_count),
    formulaCount: Number(source.formula_count),
    resourceCount: Number(source.resource_count),
    targetCatalogId: ASPHALT_DRAIN_CATALOG_ID,
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
      metadata||jsonb_build_object('contract',$6::text,'parentSearchReleaseId',$7::uuid::text,
        'definitionReleaseId',$8::uuid::text,'sourceFingerprint',$9::text,
        'lifecycle','FROZEN_NOT_ACTIVE','activationAllowed',false,'productionEligible',false)
    from public.estimate_search_index_release where id=$7`, [
    input.searchReleaseId,
    `${input.releaseKey}-search`,
    input.head,
    input.tree,
    sha256(`${input.searchReleaseId}:draft`),
    CONTRACT,
    EXPECTED_PARENT_SEARCH_RELEASE_ID,
    input.releaseId,
    input.fingerprint,
  ]);
  await client.query(`insert into public.estimate_search_group(
      search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition)
    select $1,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
    from public.estimate_search_group where search_release_id=$2`, [input.searchReleaseId, EXPECTED_PARENT_SEARCH_RELEASE_ID]);
  await client.query(`insert into public.estimate_search_clarification_question(
      search_release_id,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence)
    select $1,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence
    from public.estimate_search_clarification_question where search_release_id=$2`, [
    input.searchReleaseId,
    EXPECTED_PARENT_SEARCH_RELEASE_ID,
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
      source.catalog_origin,$2::uuid,source.short_scope_ru,source.key_distinguishing_parameters,
      source.required_inputs_count,source.clarification_fields,source.included_boundaries,
      source.excluded_boundaries,source.replacement_catalog_id,source.normalized_catalog_id,
      source.normalized_canonical_name,source.normalized_aliases,source.normalized_search_terms,
      source.normalized_search_blob,
      source.source_provenance||jsonb_build_object('contract',$3::text,
        'parentSearchReleaseId',$4::uuid::text,'definitionReleaseId',$2::uuid::text,
        'sourceFingerprint',$5::text),
      encode(extensions.digest(convert_to(source.document_sha256||':'||$3||':'||$2::uuid::text,
        'UTF8'),'sha256'),'hex'),source.adjudication_class,source.selectable,
      source.canonical_target_catalog_id,manifest.definition_version_id
    from public.estimate_search_document source
    join public.estimate_cumulative_manifest_entry manifest
      on manifest.release_id=$2 and manifest.catalog_id=source.catalog_id
    where source.search_release_id=$4`, [
    input.searchReleaseId,
    input.releaseId,
    CONTRACT,
    EXPECTED_PARENT_SEARCH_RELEASE_ID,
    input.fingerprint,
  ]);
  await client.query(`insert into public.estimate_search_group_membership(
      search_release_id,group_id,catalog_id,ordinal,independent_disposition)
    select $1,group_id,catalog_id,ordinal,independent_disposition
    from public.estimate_search_group_membership where search_release_id=$2`, [
    input.searchReleaseId,
    EXPECTED_PARENT_SEARCH_RELEASE_ID,
  ]);
  await client.query(`insert into public.estimate_search_typed_relation(
      search_release_id,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256)
    select $1,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256
    from public.estimate_search_typed_relation where search_release_id=$2`, [
    input.searchReleaseId,
    EXPECTED_PARENT_SEARCH_RELEASE_ID,
  ]);
  await client.query(`with scope as (
      select manifest.catalog_id,passport.physical_result_ru,passport.included_scope_ru,
        passport.excluded_scope_ru,
        count(*) filter(where parameter.truth_metadata->>'visibility_role'='USER_INPUT')::int required_inputs,
        coalesce(jsonb_agg(jsonb_build_object('parameterId',parameter.parameter_id,
          'titleRu',parameter.title_ru,'unitId',parameter.unit_id) order by parameter.ordinal)
          filter(where parameter.truth_metadata->>'visibility_role'='USER_INPUT'),'[]'::jsonb) fields
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_content_passport_r3 passport
        on passport.definition_version_id=manifest.definition_version_id
      join public.estimate_parameter_definition parameter
        on parameter.definition_version_id=manifest.definition_version_id
      where manifest.release_id=$2 and manifest.source_batch=$3
      group by manifest.catalog_id,passport.physical_result_ru,passport.included_scope_ru,passport.excluded_scope_ru
    ) update public.estimate_search_document document set
      short_scope_ru=scope.physical_result_ru,included_boundaries=scope.included_scope_ru,
      excluded_boundaries=scope.excluded_scope_ru,required_inputs_count=scope.required_inputs,
      clarification_fields=scope.fields,
      source_provenance=document.source_provenance||jsonb_build_object('operationScopeOwner',$3::text),
      document_sha256=encode(extensions.digest(convert_to(document.document_sha256||':'||$3||':'||scope.catalog_id,
        'UTF8'),'sha256'),'hex')
    from scope where document.search_release_id=$1 and document.catalog_id=scope.catalog_id`, [
    input.searchReleaseId,
    input.releaseId,
    CONTRACT,
  ]);
  const bulkheadPromptAlias = "устройство каркаса потолочного короба из гипсокартона";
  await client.query(`update public.estimate_search_document set
      aliases=case when $3=any(aliases) then aliases else aliases||array[$3]::text[] end,
      normalized_aliases=case when $3=any(normalized_aliases) then normalized_aliases
        else normalized_aliases||array[$3]::text[] end,
      normalized_search_terms=case when $3=any(normalized_search_terms) then normalized_search_terms
        else normalized_search_terms||array[$3]::text[] end,
      normalized_search_blob=trim(normalized_search_blob||' '||$3),
      source_provenance=source_provenance||jsonb_build_object('r4A13OwnerPromptAlias',$3::text),
      document_sha256=encode(extensions.digest(convert_to(document_sha256||':'||$3,
        'UTF8'),'sha256'),'hex')
    where search_release_id=$1 and catalog_id=$2`, [
    input.searchReleaseId,
    targetCatalogId(BULKHEAD_FRAME_SOURCE_ID),
    bulkheadPromptAlias,
  ]);
  const asphaltDrainPromptAlias = "устройство системы водоотвода асфальтированного покрытия";
  await client.query(`update public.estimate_search_document set
      aliases=case when $3=any(aliases) then aliases else aliases||array[$3]::text[] end,
      normalized_aliases=case when $3=any(normalized_aliases) then normalized_aliases
        else normalized_aliases||array[$3]::text[] end,
      normalized_search_terms=case when $3=any(normalized_search_terms) then normalized_search_terms
        else normalized_search_terms||array[$3]::text[] end,
      normalized_search_blob=case when position($3 in normalized_search_blob)>0 then normalized_search_blob
        else trim(normalized_search_blob||' '||$3) end,
      source_provenance=source_provenance||jsonb_build_object('r4A13DrainPromptAlias',$3::text),
      document_sha256=encode(extensions.digest(convert_to(document_sha256||':'||$3,
        'UTF8'),'sha256'),'hex')
    where search_release_id=$1 and catalog_id=$2`, [
    input.searchReleaseId,
    ASPHALT_DRAIN_CATALOG_ID,
    asphaltDrainPromptAlias,
  ]);
  const snapshot = (await client.query(`select count(*)::int documents,
      count(*) filter(where selectable and adjudication_class='EFFECTIVE_WORK')::int visible,
      encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),
        'UTF8'),'sha256'),'hex') snapshot_sha256
    from public.estimate_search_document where search_release_id=$1`, [input.searchReleaseId])).rows[0] as Json;
  await client.query(`update public.estimate_search_index_release set snapshot_sha256=$2,
      metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
    input.searchReleaseId,
    snapshot.snapshot_sha256,
    JSON.stringify({ documentCount: snapshot.documents, visibleCount: snapshot.visible }),
  ]);
  return snapshot;
}

async function audit(client: Client, releaseId: string, searchReleaseId: string): Promise<Json> {
  const expectedDefinitions = buildAllBatch003R56CanonicalSuccessorDefinitions();
  const affectedDefinitions = expectedDefinitions.filter((definition) =>
    definition.operation === "PREPARE" || definition.operation === "FRAME");
  const expectedParameters = 40 + affectedDefinitions.reduce((sum, definition) =>
    sum + expectedPublishedParameterIds(definition).length, 0);
  const expectedFormulas = 17 + affectedDefinitions.reduce((sum, definition) => sum + definition.formulas.length, 0);
  const expectedResources = 16 + affectedDefinitions.reduce((sum, definition) => sum + definition.resources.length, 0);
  const expectedUserInputs = 11 + affectedDefinitions.reduce((sum, definition) =>
    sum + expectedPublishedParameterIds(definition)
      .filter((parameterId) => parameterId !== "work_included" && parameterId !== "estimate_scope_mode").length, 0);
  const expectedBackendInputs = expectedParameters - expectedUserInputs;
  const expectedW3Resources = expectedDefinitions.find((definition) => definition.catalogId === W3_SOURCE_ID)?.resources.length ?? 0;
  const expectedW4Resources = expectedDefinitions.find((definition) => definition.catalogId === W4_SOURCE_ID)?.resources.length ?? 0;
  const release = (await client.query("select * from public.estimate_definition_release where id=$1", [releaseId])).rows[0] as Json;
  const counts = (await client.query(`select count(*)::int definitions,
      count(approved_template_baseline_id)::int baselines,
      count(*) filter(where baseline_ready and scenario_ready)::int ready,
      count(*) filter(where source_batch=$2)::int drywall_scope_definitions,
      encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),
        'UTF8'),'sha256'),'hex') manifest_snapshot_sha256
    from public.estimate_cumulative_manifest_entry where release_id=$1`, [releaseId, CONTRACT])).rows[0] as Json;
  const target = (await client.query(`select
      count(distinct manifest.catalog_id)::int definitions,
      count(distinct baseline.id)::int baselines,
      count(distinct passport.definition_version_id)::int passports,
      count(distinct parameter.definition_version_id||':'||parameter.parameter_id)::int parameters,
      count(distinct parameter.definition_version_id||':'||parameter.parameter_id)
        filter(where parameter.truth_metadata->>'preliminary_compilation_allowed'='true')::int preliminary_parameters,
      count(distinct parameter.definition_version_id||':'||parameter.parameter_id)
        filter(where parameter.truth_metadata->>'visibility_role'='USER_INPUT'
          and parameter.truth_metadata->>'value_source_role'='USER_INPUT')::int user_owned_inputs,
      count(distinct parameter.definition_version_id||':'||parameter.parameter_id)
        filter(where parameter.truth_metadata->>'visibility_role'='INTERNAL_ONLY'
          and parameter.truth_metadata->>'value_source_role'='BACKEND_DERIVED')::int backend_owned_inputs,
      count(distinct formula.definition_version_id||':'||formula.formula_id)::int formulas,
      count(distinct resource.definition_version_id||':'||resource.row_id)::int resources,
      count(distinct resource.semantic_owner)::int semantic_owners,
      count(distinct resource.cost_owner_id)::int cost_owners
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_approved_template_baseline baseline on baseline.id=manifest.approved_template_baseline_id
    join public.estimate_content_passport_r3 passport on passport.definition_version_id=manifest.definition_version_id
    join public.estimate_parameter_definition parameter on parameter.definition_version_id=manifest.definition_version_id
    join public.estimate_formula_graph formula on formula.definition_version_id=manifest.definition_version_id
    join public.estimate_resource_spec resource on resource.definition_version_id=manifest.definition_version_id
    where manifest.release_id=$1 and manifest.source_batch=$2`, [releaseId, CONTRACT])).rows[0] as Json;
  const live = (await client.query(`select manifest.catalog_id,count(resource.*)::int resources,
      count(*) filter(where lower(resource.title_ru)~'(лист.*гипс|изоляц|шпаклев|лент.*шв|обшив|заделк.*шв|шлифов|налогов)')::int forbidden_neighbor_rows
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_resource_spec resource on resource.definition_version_id=manifest.definition_version_id
    where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])
    group by manifest.catalog_id order by manifest.catalog_id`, [releaseId, [
      targetCatalogId(W3_SOURCE_ID),
      targetCatalogId(W4_SOURCE_ID),
      targetCatalogId(W12_SOURCE_ID),
      targetCatalogId(BULKHEAD_FRAME_SOURCE_ID),
      ASPHALT_DRAIN_CATALOG_ID,
    ]])).rows as Json[];
  const search = (await client.query(`select count(*)::int documents,
      count(*) filter(where selectable and adjudication_class='EFFECTIVE_WORK')::int visible,
      count(*) filter(where definition_release_id<>$2)::int release_binding_drift,
      encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),
        'UTF8'),'sha256'),'hex') snapshot_sha256
    from public.estimate_search_document where search_release_id=$1`, [searchReleaseId, releaseId])).rows[0] as Json;
  invariant(release.status === "prepared" && Number(release.definition_count) === 10_331,
    `STOP_R4_A8_DRYWALL_RELEASE_AUDIT:${stableJson(release)}`);
  invariant(Number(counts.definitions) === 10_331 && Number(counts.baselines) === 10_331
    && Number(counts.ready) === 10_331 && Number(counts.drywall_scope_definitions) === 11,
  `STOP_R4_A8_DRYWALL_MANIFEST_AUDIT:${stableJson(counts)}`);
  invariant(Number(target.definitions) === 11
    && Number(target.baselines) === 11
    && Number(target.passports) === 11
    && Number(target.parameters) === expectedParameters
    && Number(target.preliminary_parameters) === expectedParameters
    && Number(target.user_owned_inputs) === expectedUserInputs
    && Number(target.backend_owned_inputs) === expectedBackendInputs
    && Number(target.formulas) === expectedFormulas
    && Number(target.resources) === expectedResources
    && Number(target.semantic_owners) === expectedResources
    && Number(target.cost_owners) === expectedResources,
  `STOP_R4_A8_DRYWALL_TARGET_AUDIT:${stableJson(target)}`);
  const byCatalog = new Map(live.map((row) => [String(row.catalog_id), row]));
  invariant(Number(byCatalog.get(targetCatalogId(W3_SOURCE_ID))?.resources) === expectedW3Resources
    && Number(byCatalog.get(targetCatalogId(W4_SOURCE_ID))?.resources) === expectedW4Resources
    && Number(byCatalog.get(targetCatalogId(W4_SOURCE_ID))?.forbidden_neighbor_rows) === 0
    && Number(byCatalog.get(targetCatalogId(W12_SOURCE_ID))?.resources) === 29
    && Number(byCatalog.get(targetCatalogId(BULKHEAD_FRAME_SOURCE_ID))?.resources) === 16
    && Number(byCatalog.get(targetCatalogId(BULKHEAD_FRAME_SOURCE_ID))?.forbidden_neighbor_rows) === 0
    && Number(byCatalog.get(ASPHALT_DRAIN_CATALOG_ID)?.resources) === 61,
  `STOP_R4_A13_DRYWALL_W3_W4_BULKHEAD_AUDIT:${stableJson(live)}`);
  invariant(Number(search.documents) === 10_322 && Number(search.visible) === 10_322
    && Number(search.release_binding_drift) === 0,
  `STOP_R4_A8_DRYWALL_SEARCH_AUDIT:${stableJson(search)}`);
  return { release, counts, target, live, search };
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(existsSync(MASTER_PATH) && sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256,
    "STOP_R4_A8_DRYWALL_MASTER_SHA256_DRIFT");
  const currentRelease = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(currentRelease.definitionReleaseId === EXPECTED_PARENT_RELEASE_ID
    && currentRelease.searchReleaseId === EXPECTED_PARENT_SEARCH_RELEASE_ID,
  "STOP_R4_A8_DRYWALL_CURRENT_RELEASE_DRIFT");
  const branch = git("branch", "--show-current");
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  invariant(branch === EXPECTED_BRANCH, `STOP_R4_A8_DRYWALL_BRANCH:${branch}`);
  const dirty = git("status", "--porcelain=v1", "--untracked-files=all", "--", ...MANAGED_SOURCE_PATHS);
  invariant(!dirty || ALLOW_DIRTY_SOURCE, `STOP_R4_A8_DRYWALL_MANAGED_SOURCE_DRIFT:${dirty}`);
  const definitions = buildAllBatch003R56CanonicalSuccessorDefinitions();
  invariant(definitions.length === 36, `STOP_R4_A8_DRYWALL_DEFINITION_DENOMINATOR:${definitions.length}/36`);
  const bulkheadDefinition = buildBatch001DrywallSuccessorR3(BULKHEAD_FRAME_SOURCE_ID);
  const fingerprint = sha256({
    contract: CONTRACT,
    masterSha256: MASTER_SHA256,
    addendumSha256: ADDENDUM_SHA256 || null,
    head,
    tree,
    dirtySourceSha256: dirty ? sha256(dirty) : null,
    definitionHashes: definitions.map((definition) => definition.definitionSha256),
    bulkheadFrameSourceDefinitionSha256: BULKHEAD_FRAME_SOURCE_DEFINITION_SHA256,
    bulkheadFrameResourceIdentities: bulkheadDefinition.resources.map((resource) => resource.rowId),
    asphaltDrainCatalogId: ASPHALT_DRAIN_CATALOG_ID,
    predecessorReleaseId: EXPECTED_PARENT_RELEASE_ID,
    sources: MANAGED_SOURCE_PATHS.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) })),
  });
  const releaseId = uuid(`${CONTRACT}:${fingerprint}:release`);
  const searchReleaseId = uuid(`${CONTRACT}:${fingerprint}:search`);
  const releaseKey = `r568-r4-a8-drywall-scope-${fingerprint.slice(0, 16)}`;
  const client = new Client({ connectionString: DATABASE_URL, application_name: "r4-a8-drywall-scope-successor" });
  await client.connect();
  let receipt: Json | undefined;
  try {
    const predecessor = (await client.query("select * from public.estimate_definition_release where id=$1", [EXPECTED_PARENT_RELEASE_ID])).rows[0] as Json;
    const predecessorSearch = (await client.query("select * from public.estimate_search_index_release where id=$1", [EXPECTED_PARENT_SEARCH_RELEASE_ID])).rows[0] as Json;
    invariant(predecessor?.status === "prepared" && Number(predecessor.definition_count) === 10_331,
      "STOP_R4_A8_DRYWALL_PREDECESSOR_RELEASE");
    invariant(predecessorSearch?.status === "draft" && Number(predecessorSearch.global_count) === 10_322,
      "STOP_R4_A8_DRYWALL_PREDECESSOR_SEARCH");
    const sourceWitness = await verifyBatch003Source(client, definitions);
    const bulkheadSourceWitness = await verifyBulkheadFrameSource(client);
    const asphaltDrainSourceWitness = await verifyAsphaltDrainSource(client);
    const bulkheadSourceRows = (await client.query(`select source.id::text source_definition_id,
        source.catalog_id source_catalog_id,source.definition_sha256 source_definition_sha256,
        baseline.id::text source_baseline_id,
        (select manifest.approved_template_baseline_id::text
          from public.estimate_cumulative_manifest_entry manifest
          where manifest.release_id=$3
            and manifest.catalog_id='canonical-work:base:'||source.catalog_id) predecessor_baseline_id,
        (select count(*)::int from public.estimate_parameter_definition parameter
          where parameter.definition_version_id=source.id) source_parameters,
        (select count(*)::int from public.estimate_formula_graph formula
          where formula.definition_version_id=source.id) source_formulas,
        (select count(*)::int from public.estimate_resource_spec resource
          where resource.definition_version_id=source.id) source_resources,
        (select coalesce(max(peer.definition_version),0)::int+1 from public.estimate_definition_version peer
          where peer.catalog_id='canonical-work:base:'||source.catalog_id) next_definition_version
      from public.estimate_definition_version source
      join public.estimate_approved_template_baseline baseline on baseline.definition_version_id=source.id
       where source.release_id=$1 and source.catalog_id=$2
       order by source.catalog_id`, [
      BATCH001_SOURCE_RELEASE_ID,
      BULKHEAD_FRAME_SOURCE_ID,
      EXPECTED_PARENT_RELEASE_ID,
    ])).rows as Json[];
    const batch003TargetSourceIds = definitions
      .filter((definition) => definition.operation === "PREPARE" || definition.operation === "FRAME")
      .map((definition) => definition.catalogId);
    const batch003SourceRows = (await client.query(`select source.id::text source_definition_id,
        source.catalog_id source_catalog_id,source.definition_sha256 source_definition_sha256,
        baseline.id::text source_baseline_id,
        (select manifest.approved_template_baseline_id::text
          from public.estimate_cumulative_manifest_entry manifest
          where manifest.release_id=$3
            and manifest.catalog_id='canonical-work:base:'||source.catalog_id) predecessor_baseline_id,
        (select count(*)::int from public.estimate_parameter_definition parameter
          where parameter.definition_version_id=source.id) source_parameters,
        (select count(*)::int from public.estimate_formula_graph formula
          where formula.definition_version_id=source.id) source_formulas,
        (select count(*)::int from public.estimate_resource_spec resource
          where resource.definition_version_id=source.id) source_resources,
        (select coalesce(max(peer.definition_version),0)::int+1 from public.estimate_definition_version peer
          where peer.catalog_id='canonical-work:base:'||source.catalog_id) next_definition_version
      from public.estimate_definition_version source
      join public.estimate_approved_template_baseline baseline on baseline.definition_version_id=source.id
      where source.release_id=$1 and source.catalog_id=any($2::text[])
      order by source.catalog_id`, [
      BATCH003_SOURCE_RELEASE_ID,
      batch003TargetSourceIds,
      EXPECTED_PARENT_RELEASE_ID,
    ])).rows as Json[];
    const sourceRows = [...bulkheadSourceRows, ...batch003SourceRows];
    invariant(sourceRows.length === 11, `STOP_R4_A13_EXISTING_NORM_SOURCE_ROWS:${sourceRows.length}/11`);
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
        sourceDefinitionId: source.source_definition_id,
        sourceCatalogId: source.source_catalog_id,
        sourceBaselineId: source.source_baseline_id,
        predecessorBaselineId: source.predecessor_baseline_id,
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
        entrySha256: sha256({ contract: CONTRACT, releaseId, targetCatalog, definitionId, baselineId, definitionSha256 }),
        sourceParameters: Number(source.source_parameters),
        sourceFormulas: Number(source.source_formulas),
        sourceResources: Number(source.source_resources),
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
      EXPECTED_PARENT_RELEASE_ID,
      targetCatalogIds,
    ])).rows[0] as Json;
    invariant(Number(predecessorTarget.definitions) === 11,
      `STOP_R4_A13_EXISTING_NORM_PREDECESSOR_TARGETS:${predecessorTarget.definitions}/11`);
    const sourceTotals = sourceRows.reduce((sum, source) => ({
      parameters: sum.parameters + Number(source.source_parameters),
      formulas: sum.formulas + Number(source.source_formulas),
      resources: sum.resources + Number(source.source_resources),
    }), { parameters: 0, formulas: 0, resources: 0 });
    const nextCounts = {
      definitions: Number(predecessor.definition_count),
      parameters: Number(predecessor.parameter_count) - Number(predecessorTarget.parameters)
        + sourceTotals.parameters,
      formulas: Number(predecessor.formula_count) - Number(predecessorTarget.formulas)
        + sourceTotals.formulas,
      resources: Number(predecessor.resource_row_count) - Number(predecessorTarget.resources)
        + sourceTotals.resources,
    };
    const existing = (await client.query("select id::text,status from public.estimate_definition_release where id=$1", [releaseId])).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.status === "prepared", "STOP_R4_A8_DRYWALL_EXISTING_RELEASE_DRIFT");
      receipt = {
        status: "GREEN_R4_A8_DRYWALL_SCOPE_SUCCESSOR_ALREADY_PREPARED_NOT_ACTIVE",
        idempotent: true,
        source: { branch, head, tree, fingerprint },
        predecessor: { releaseId: EXPECTED_PARENT_RELEASE_ID, searchReleaseId: EXPECTED_PARENT_SEARCH_RELEASE_ID },
        successor: { releaseId, searchReleaseId, releaseKey },
        sourceWitness,
        bulkheadSourceWitness,
        asphaltDrainSourceWitness,
        audit: await audit(client, releaseId, searchReleaseId),
      };
    } else if (!APPLY) {
      receipt = {
        status: "GREEN_R4_A8_DRYWALL_SCOPE_PRECHECK_NO_MUTATION",
        idempotent: false,
        source: { branch, head, tree, fingerprint },
        predecessor: { releaseId: EXPECTED_PARENT_RELEASE_ID, searchReleaseId: EXPECTED_PARENT_SEARCH_RELEASE_ID, targetCounts: predecessorTarget },
        successor: { releaseId, searchReleaseId, releaseKey, nextCounts },
        sourceWitness,
        bulkheadSourceWitness,
        asphaltDrainSourceWitness,
      };
    } else {
      await client.query("begin");
      await client.query("set local lock_timeout='5s'");
      await client.query("set local statement_timeout='600s'");
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [CONTRACT]);
      try {
        await client.query(`create temporary table r4a8_drywall_map(
          source_definition_id uuid primary key,source_catalog_id text not null unique,source_baseline_id uuid not null,
          predecessor_baseline_id uuid not null,
          target_catalog_id text not null unique,definition_id uuid not null unique,baseline_id uuid not null unique,
          next_definition_version int not null,definition_sha256 text not null,
          baseline_acceptance_sha256 text not null,entry_sha256 text not null) on commit drop`);
        await client.query(`insert into r4a8_drywall_map select
          x."sourceDefinitionId"::uuid,x."sourceCatalogId",x."sourceBaselineId"::uuid,
          x."predecessorBaselineId"::uuid,
          x."targetCatalogId",x."definitionId"::uuid,x."baselineId"::uuid,
          x."nextDefinitionVersion",x."definitionSha256",x."baselineAcceptanceSha256",x."entrySha256"
          from jsonb_to_recordset($1::jsonb) as x(
            "sourceDefinitionId" text,"sourceCatalogId" text,"sourceBaselineId" text,
            "predecessorBaselineId" text,
            "targetCatalogId" text,"definitionId" text,"baselineId" text,
            "nextDefinitionVersion" int,"definitionSha256" text,
            "baselineAcceptanceSha256" text,"entrySha256" text)`, [JSON.stringify(mappings)]);
        await client.query(`insert into public.estimate_definition_release(
            id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
            definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,
            parameter_count,formula_count)
          select $1,$2,schema_version,'draft',$3,$4,$5,$6,$7,
            metadata||$8::jsonb,$9::uuid,$10,$11,$12
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
            addendumSha256: ADDENDUM_SHA256 || null,
            dirtySourceSha256: dirty ? sha256(dirty) : null,
            lifecycle: "DRAFT_FORWARD_ONLY",
            parentReleaseId: EXPECTED_PARENT_RELEASE_ID,
            sourceBatch003ReleaseId: BATCH003_SOURCE_RELEASE_ID,
            sourceFingerprint: fingerprint,
            replacedDefinitionCount: 11,
            bulkheadFrameSourceReleaseId: BATCH001_SOURCE_RELEASE_ID,
            asphaltDrainSourceReleaseId: EXPECTED_PARENT_RELEASE_ID,
            activationAllowed: false,
            productionEligible: false,
          }),
          EXPECTED_PARENT_RELEASE_ID,
          sha256({ contract: CONTRACT, fingerprint, definitions: mappings.map((mapping) => mapping.definitionSha256) }),
          nextCounts.parameters,
          nextCounts.formulas,
        ]);
        await client.query(`insert into public.estimate_cumulative_manifest_entry(
            release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
            publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,
            definition_hash,entry_sha256,runtime_publication_state)
          select $1,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
            publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,
            encode(extensions.digest(convert_to($2||':'||$1::uuid::text||':'||catalog_id||':'||entry_sha256,
              'UTF8'),'sha256'),'hex'),runtime_publication_state
          from public.estimate_cumulative_manifest_entry where release_id=$3`, [
          releaseId,
          CONTRACT,
          EXPECTED_PARENT_RELEASE_ID,
        ]);
        await client.query(`insert into public.estimate_definition_version(
            id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,
            source_metadata,content_status,content_gate_status)
          select map.definition_id,$1,map.target_catalog_id,map.next_definition_version,
            source.passport||jsonb_build_object('r4A8CanonicalCatalogId',map.target_catalog_id,
              'r4A8OperationScopeContract',$2::text),source.applicability,map.definition_sha256,
            source.source_metadata||jsonb_build_object('r4A8OperationScopeContract',$2::text,
              'sourceDefinitionVersionId',source.id::text,'sourceCatalogId',source.catalog_id,
              'sourceFingerprint',$3::text),'QUARANTINED','RED'
          from r4a8_drywall_map map join public.estimate_definition_version source
            on source.id=map.source_definition_id`, [releaseId, CONTRACT, fingerprint]);
        await client.query(`insert into public.estimate_approved_template_baseline(
            id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,
            parameter_schema_sha256,input_values,input_classification,uom_by_parameter,
            formula_consumer_ids,resource_consumer_row_ids,normative_source_ids,guide_provenance_ru,
            proposal_source_refs,validation_scenario_refs,acceptance_evidence_sha256,
            accepted_release_id,accepted_at,supersedes_baseline_id,contract_version)
          select map.baseline_id,$2||':'||substr($3,1,16)||':'||map.target_catalog_id,
            map.target_catalog_id,map.definition_id,map.definition_id,source.parameter_schema_sha256,
            case when map.source_catalog_id=$5 then jsonb_build_object('system_type','linear_tray')
              else source.input_values end,
            case when map.source_catalog_id=$5 then jsonb_build_object('system_type','FIXTURE_ONLY')
              when map.source_catalog_id=$4 then coalesce((
              select jsonb_object_agg(parameter_id,to_jsonb('FIXTURE_ONLY'::text))
              from jsonb_object_keys(source.input_values) parameter_id
            ),'{}'::jsonb) else source.input_classification end,
            case when map.source_catalog_id=$5 then jsonb_build_object('system_type',null) else source.uom_by_parameter end,
            case when map.source_catalog_id=$5 then jsonb_build_object('system_type',coalesce((
              select parameter.truth_metadata->'formula_consumers'
              from public.estimate_parameter_definition parameter
              where parameter.definition_version_id=map.source_definition_id and parameter.parameter_id='system_type'
            ),'[]'::jsonb)) else source.formula_consumer_ids end,
            case when map.source_catalog_id=$5 then jsonb_build_object('system_type',coalesce((
              select parameter.truth_metadata->'resource_branch_consumers'
              from public.estimate_parameter_definition parameter
              where parameter.definition_version_id=map.source_definition_id and parameter.parameter_id='system_type'
            ),'[]'::jsonb)) else source.resource_consumer_row_ids end,
            case when map.source_catalog_id=$5 then jsonb_build_object('system_type',jsonb_build_array('r4-a10-asphalt-drainage-successor'))
              else source.normative_source_ids end,
            case when map.source_catalog_id=$5 then jsonb_build_object('system_type',coalesce((
              select parameter.truth_metadata->'guide'->>'guide_short_ru'
              from public.estimate_parameter_definition parameter
              where parameter.definition_version_id=map.source_definition_id and parameter.parameter_id='system_type'
            ),'Тип системы водоотвода')) else source.guide_provenance_ru end,
            source.proposal_source_refs||jsonb_build_array(jsonb_build_object('contract',$2::text,
              'sourceBaselineId',source.id::text,'sourceCatalogId',source.catalog_id,
              'sourceFingerprint',$3::text)),
            source.validation_scenario_refs||jsonb_build_array(jsonb_build_object('contract',$2::text,
              'scenario','R4_A13_W3_W4_BULKHEAD_FRAME_ONLY_SCOPE')),
            map.baseline_acceptance_sha256,$1,clock_timestamp(),map.predecessor_baseline_id,source.contract_version
          from r4a8_drywall_map map join public.estimate_approved_template_baseline source
            on source.id=map.source_baseline_id`, [releaseId, CONTRACT, fingerprint, BULKHEAD_FRAME_SOURCE_ID, ASPHALT_DRAIN_CATALOG_ID]);
        await client.query(`insert into public.estimate_parameter_definition(
            definition_version_id,parameter_id,ordinal,value_type,unit_id,title_ru,required,
            default_value,constraints_json,truth_metadata,approved_template_baseline_id)
          select map.definition_id,source.parameter_id,source.ordinal,source.value_type,source.unit_id,
            source.title_ru,source.required,source.default_value,source.constraints_json,
            source.truth_metadata||jsonb_build_object(
              'r4A8OperationScopeContract',$1::text,
              'preliminary_compilation_allowed',true,
              'value_source_role',case
                when source.truth_metadata->>'visibility_role'='USER_INPUT' then 'USER_INPUT'
                else 'BACKEND_DERIVED'
              end),map.baseline_id
          from r4a8_drywall_map map join public.estimate_parameter_definition source
            on source.definition_version_id=map.source_definition_id`, [CONTRACT]);
        await client.query(`insert into public.estimate_formula_graph(
            definition_version_id,formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256)
          select map.definition_id,source.formula_id,source.output_unit_id,source.expression_source,
            source.ast,source.input_parameter_ids,source.ast_sha256
          from r4a8_drywall_map map join public.estimate_formula_graph source
            on source.definition_version_id=map.source_definition_id`);
        await client.query(`create temporary table r4a8_drywall_resource_map(
          source_resource_id uuid primary key,target_resource_id uuid not null unique,
          definition_id uuid not null,row_id text not null) on commit drop`);
        const sourceResources = (await client.query(`select resource.id::text source_resource_id,
            map.definition_id::text,resource.row_id
          from r4a8_drywall_map map join public.estimate_resource_spec resource
            on resource.definition_version_id=map.source_definition_id
          order by map.target_catalog_id,resource.ordinal`)).rows as Json[];
        const resourceMappings = sourceResources.map((resource) => ({
          sourceResourceId: resource.source_resource_id,
          targetResourceId: uuid(`${CONTRACT}:${fingerprint}:resource:${resource.definition_id}:${resource.row_id}`),
          definitionId: resource.definition_id,
          rowId: resource.row_id,
        }));
        await client.query(`insert into r4a8_drywall_resource_map select
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
            source.inclusion_ast,
            case when jsonb_typeof(source.resource_graph->'titleSpecificationParameterIds')='array'
              then source.resource_graph-'titleSpecificationParameterId'
              else source.resource_graph end,
            source.semantic_owner,source.cost_owner_id,
            source.procurement_eligible,
            source.source_metadata||jsonb_build_object('r4A8OperationScopeContract',$1::text,
              'sourceResourceId',source.id::text,'sourceFingerprint',$2::text),
            encode(extensions.digest(convert_to(source.row_sha256||':'||$1||':'||resource_map.target_resource_id::text,
              'UTF8'),'sha256'),'hex')
          from r4a8_drywall_resource_map resource_map join public.estimate_resource_spec source
            on source.id=resource_map.source_resource_id`, [CONTRACT, fingerprint]);
        await client.query(`insert into public.estimate_work_normative_binding(
            definition_version_id,resource_spec_id,locator_id,applicability)
          select resource_map.definition_id,resource_map.target_resource_id,source.locator_id,
            source.applicability||jsonb_build_object('r4A8OperationScopeContract',$1::text)
          from r4a8_drywall_resource_map resource_map
          join public.estimate_work_normative_binding source
            on source.resource_spec_id=resource_map.source_resource_id`, [CONTRACT]);
        await client.query(`insert into public.estimate_resource_price_route_binding(
            resource_spec_id,route_id,price_key,priority)
          select resource_map.target_resource_id,source.route_id,source.price_key,source.priority
          from r4a8_drywall_resource_map resource_map
          join public.estimate_resource_price_route_binding source
            on source.resource_spec_id=resource_map.source_resource_id`);
        await client.query(`insert into public.estimate_content_passport_r3(
            definition_version_id,release_id,catalog_id,contract_version,identity_mode,redirect_catalog_id,
            physical_result_ru,included_scope_ru,excluded_scope_ru,capability_matrix,parameter_count,
            formula_count,resource_count,decision,payload_sha256,source_head,source_tree)
          select map.definition_id,$1,map.target_catalog_id,source.contract_version,source.identity_mode,
            source.redirect_catalog_id,source.physical_result_ru,source.included_scope_ru,source.excluded_scope_ru,
            source.capability_matrix,source.parameter_count,source.formula_count,source.resource_count,
            source.decision||jsonb_build_object('r4A8OperationScopeContract',$2::text),
            encode(extensions.digest(convert_to(source.payload_sha256||':'||$2||':'||map.definition_id::text,
              'UTF8'),'sha256'),'hex'),$3,$4
          from r4a8_drywall_map map join public.estimate_content_passport_r3 source
            on source.definition_version_id=map.source_definition_id`, [releaseId, CONTRACT, head, tree]);
        await client.query(`update public.estimate_definition_version target set
            content_status=source.content_status,content_gate_status=source.content_gate_status
          from r4a8_drywall_map map join public.estimate_definition_version source
            on source.id=map.source_definition_id
          where target.id=map.definition_id`);
        await client.query(`update public.estimate_cumulative_manifest_entry target set
            definition_version_id=map.definition_id,approved_template_baseline_id=map.baseline_id,
            source_batch=$2,source_release_id=$1,publication_state='CANONICAL_SUCCESSOR',
            baseline_ready=true,scenario_ready=true,definition_hash=map.definition_sha256,
            entry_sha256=map.entry_sha256,runtime_publication_state='CANDIDATE'
          from r4a8_drywall_map map
          where target.release_id=$1 and target.catalog_id=map.target_catalog_id`, [releaseId, CONTRACT]);
        const search = await cloneSearch(client, { releaseId, searchReleaseId, releaseKey, head, tree, fingerprint });
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
            operationScopeDefinitions: "11/11",
            w3Rows: 11,
            w4Rows: 31,
            w12Rows: 29,
            bulkheadFrameRows: 16,
          }),
        ]);
        const result = await audit(client, releaseId, searchReleaseId);
        await client.query("commit");
        receipt = {
          status: "GREEN_R4_A13_4_EXISTING_NORM_SUCCESSOR_PREPARED_NOT_ACTIVE",
          idempotent: false,
          source: { branch, head, tree, fingerprint, managedPaths: MANAGED_SOURCE_PATHS },
          predecessor: { releaseId: EXPECTED_PARENT_RELEASE_ID, searchReleaseId: EXPECTED_PARENT_SEARCH_RELEASE_ID, targetCounts: predecessorTarget },
          successor: { releaseId, searchReleaseId, releaseKey, nextCounts },
          sourceWitness,
          bulkheadSourceWitness,
          asphaltDrainSourceWitness,
          audit: result,
        };
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    await client.end();
  }
  invariant(receipt, "STOP_R4_A8_DRYWALL_RECEIPT_MISSING");
  const body = {
    schemaVersion: "r568-r4-a13-4-existing-norm-successor-receipt.v1",
    capturedAt: new Date().toISOString(),
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    ...receipt,
    productionAccessed: false,
    deployPerformed: false,
    releasePerformed: false,
    activationPerformed: false,
  };
  const sealed = { ...body, receiptSha256: sha256(body) };
  if (APPLY) {
    const output = resolve(
      OUTPUT_ROOT,
      `04_EXISTING_NORM_SUCCESSOR_${receipt.successor.releaseId}_${head}.json`,
    );
    invariant(!existsSync(output), "STOP_R4_A8_DRYWALL_EVIDENCE_EXISTS");
    atomicJson(output, sealed);
    process.stdout.write(`${JSON.stringify({ output, ...sealed }, null, 2)}\n`);
  } else {
    process.stdout.write(`${JSON.stringify(sealed, null, 2)}\n`);
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
