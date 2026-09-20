import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  createCanonicalDefinitionClonePlan,
  preflightCanonicalDefinitionPublishPlans,
  publishCanonicalDefinitionDraft,
  resolveCanonicalApprovedBaselineLeaf,
} from "./canonicalDefinitionPublisherR1";

type Json = Record<string, any>;

export type MasterSingleDefinitionSuccessorConfig = Readonly<{
  contract: string;
  stopCode: string;
  applicationName: string;
  expectedBranch: string;
  masterPath: string;
  masterSha256: string;
  parentReleaseId: string;
  parentSearchReleaseId: string;
  currentReleasePath: string;
  outputRoot: string;
  sourcePaths: readonly string[];
  catalogId: string;
  sourceId: string;
  normId: string;
  sourceMetadata: Readonly<{
    source_title: string;
    source_authority: string;
    exact_locator: string;
    use_restriction: string;
  }>;
  parameterDefinitions: readonly Json[];
  formulaDefinitions: readonly Json[];
  resourceDefinitions: readonly Json[];
  shortInput: Readonly<Json>;
  acceptanceInput: Readonly<Json>;
  verifyCore: () => Promise<Json>;
  expectedParentShape: readonly [number, number, number];
  benchmarkOrdinal: number;
  validationScenario: string;
  passport: Readonly<{
    canonicalRuName: string;
    workKey: string;
    physicalResultRu: string;
    includedScopeRu: readonly string[];
    excludedScopeRu: readonly string[];
  }>;
  applicability: Json;
  binding: Readonly<{
    rowId: string;
    applicability: Json;
  }>;
  locator: Readonly<{
    key: string;
    payload: Json;
  }>;
  search: Readonly<{
    primaryUom: string;
    canonicalNameRu: string;
    aliases: readonly string[];
    shortScopeRu: string;
    keyDistinguishingParameters: readonly string[];
    clarificationFields: readonly string[];
    includedBoundaries: readonly string[];
    excludedBoundaries: readonly string[];
    extraSearchTermsRu: string;
    sourceProvenance: Json;
  }>;
  forbiddenAdjacentMatchers: readonly RegExp[];
  owner: string;
  receiptFileStem: string;
}>;

const CONTENT_PASSPORT_CONTRACT = "real-professional-estimates-r3.content-passport.v1";
const BASELINE_CONTRACT = "APPROVED_TEMPLATE_BASELINE_R54_V1";
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";

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
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function normalizeSearchText(value: string): string {
  return value.toLocaleLowerCase("ru-RU")
    .replace(/ё/gu, "е")
    .replace(/[^a-zа-я0-9]+/giu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function resourceRowType(category: string): string {
  if (category === "material") return "material";
  if (category === "equipment") return "equipment";
  if (category === "service") return "service";
  if (category === "construction_work") return "labor";
  return "other";
}

function stop(config: MasterSingleDefinitionSuccessorConfig, suffix: string): string {
  return `STOP_${config.stopCode}_${suffix}`;
}

function exactDatabaseGuard(config: MasterSingleDefinitionSuccessorConfig): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `${stop(config, "DATABASE_NOT_LOOPBACK")}:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `${stop(config, "DATABASE_NOT_CANONICAL_LOCAL")}:${parsed.port}:${parsed.pathname}`);
}

async function cloneSearch(
  client: Client,
  config: MasterSingleDefinitionSuccessorConfig,
  input: Readonly<{
    releaseId: string;
    searchReleaseId: string;
    releaseKey: string;
    head: string;
    tree: string;
    fingerprint: string;
    definitionId: string;
  }>,
): Promise<Json> {
  await client.query(`insert into public.estimate_search_index_release(
      id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,
      source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata)
    select $1,$2,'draft',taxonomy_version,group_relation_version,ranking_contract_version,
      $3,$4,$5,global_count,external_count,discovered_count,
      metadata||jsonb_build_object('contract',$6::text,'parentSearchReleaseId',$7::uuid::text,
        'definitionReleaseId',$8::uuid::text,'sourceFingerprint',$9::text,
        'lifecycle','PREPARED_NOT_ACTIVE','activationAllowed',false,'productionEligible',false,
        'masterSingleDefinitionTargetCount',1)
    from public.estimate_search_index_release where id=$7`, [
    input.searchReleaseId,
    `${input.releaseKey}-search`,
    input.head,
    input.tree,
    sha256(`${input.searchReleaseId}:draft`),
    config.contract,
    config.parentSearchReleaseId,
    input.releaseId,
    input.fingerprint,
  ]);
  await client.query(`insert into public.estimate_search_group(
      search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition)
    select $1,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
    from public.estimate_search_group where search_release_id=$2`, [
    input.searchReleaseId, config.parentSearchReleaseId,
  ]);
  await client.query(`insert into public.estimate_search_clarification_question(
      search_release_id,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence)
    select $1,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence
    from public.estimate_search_clarification_question where search_release_id=$2`, [
    input.searchReleaseId, config.parentSearchReleaseId,
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
    config.contract,
    config.parentSearchReleaseId,
    input.fingerprint,
  ]);
  await client.query(`insert into public.estimate_search_group_membership(
      search_release_id,group_id,catalog_id,ordinal,independent_disposition)
    select $1,group_id,catalog_id,ordinal,independent_disposition
    from public.estimate_search_group_membership where search_release_id=$2`, [
    input.searchReleaseId, config.parentSearchReleaseId,
  ]);
  await client.query(`insert into public.estimate_search_typed_relation(
      search_release_id,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256)
    select $1,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256
    from public.estimate_search_typed_relation where search_release_id=$2`, [
    input.searchReleaseId, config.parentSearchReleaseId,
  ]);

  const aliases = [...config.search.aliases];
  const normalizedAliases = aliases.map(normalizeSearchText);
  const normalizedName = normalizeSearchText(config.search.canonicalNameRu);
  const searchTerms = [
    normalizedName,
    ...normalizedAliases,
    normalizeSearchText(config.search.extraSearchTermsRu),
  ].filter((value, index, values) => values.indexOf(value) === index);
  const updated = await client.query(`update public.estimate_search_document set
      primary_uom=$3,canonical_name_ru=$4,aliases=$5::text[],short_scope_ru=$6,
      key_distinguishing_parameters=$7::jsonb,required_inputs_count=$8,
      clarification_fields=$9::jsonb,included_boundaries=$10::jsonb,excluded_boundaries=$11::jsonb,
      normalized_canonical_name=$12,normalized_aliases=$13::text[],normalized_search_terms=$14::text[],
      normalized_search_blob=$15,definition_release_id=$2,definition_version_id=$16,
      source_provenance=source_provenance||$17::jsonb,
      document_sha256=encode(extensions.digest(convert_to(
        $4||':'||$2::uuid::text||':'||$16::uuid::text||':'||$18,'UTF8'),'sha256'),'hex')
    where search_release_id=$1 and catalog_id=$19`, [
    input.searchReleaseId,
    input.releaseId,
    config.search.primaryUom,
    config.search.canonicalNameRu,
    aliases,
    config.search.shortScopeRu,
    JSON.stringify(config.search.keyDistinguishingParameters),
    config.search.keyDistinguishingParameters.length,
    JSON.stringify(config.search.clarificationFields),
    JSON.stringify(config.search.includedBoundaries),
    JSON.stringify(config.search.excludedBoundaries),
    normalizedName,
    normalizedAliases,
    searchTerms,
    searchTerms.join(" "),
    input.definitionId,
    JSON.stringify({
      contract: config.contract,
      knownWorkScopeFirstEstimate: true,
      conditionalTechnologyFailClosed: true,
      activationAllowed: false,
      productionEligible: false,
      ...config.search.sourceProvenance,
    }),
    input.fingerprint,
    config.catalogId,
  ]);
  invariant(updated.rowCount === 1, stop(config, "SEARCH_TARGET_UPDATE"));

  const snapshot = (await client.query(`select count(*)::int documents,
      count(*) filter(where selectable and adjudication_class='EFFECTIVE_WORK')::int visible,
      encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot_sha256
    from public.estimate_search_document where search_release_id=$1`, [input.searchReleaseId])).rows[0] as Json;
  await client.query(`update public.estimate_search_index_release set snapshot_sha256=$2,
    metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
    input.searchReleaseId,
    snapshot.snapshot_sha256,
    JSON.stringify({
      documentCount: snapshot.documents,
      visibleCount: snapshot.visible,
      masterSingleDefinitionTargetCount: 1,
      masterSingleDefinitionCatalogId: config.catalogId,
    }),
  ]);
  return snapshot;
}

async function auditState(
  client: Client,
  config: MasterSingleDefinitionSuccessorConfig,
  releaseId: string,
  searchReleaseId: string,
  definitionId: string,
): Promise<Json> {
  const release = (await client.query(`select id::text,status,activated_at,definition_count,
      parameter_count,formula_count,resource_row_count,source_manifest_sha256
    from public.estimate_definition_release where id=$1`, [releaseId])).rows[0] as Json;
  const manifest = (await client.query(`select count(*)::int identities,
      count(*) filter(where catalog_id=$2 and definition_version_id=$3)::int replaced,
      encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot
    from public.estimate_cumulative_manifest_entry where release_id=$1`, [
    releaseId, config.catalogId, definitionId,
  ])).rows[0] as Json;
  const target = (await client.query(`select manifest.catalog_id,manifest.definition_version_id::text,
      manifest.source_batch,manifest.runtime_publication_state,definition.definition_version,
      definition.content_status,definition.content_gate_status,passport.decision,
      (select count(*)::int from public.estimate_parameter_definition p where p.definition_version_id=definition.id) parameters,
      (select count(*)::int from public.estimate_formula_graph f where f.definition_version_id=definition.id) formulas,
      (select count(*)::int from public.estimate_resource_spec r where r.definition_version_id=definition.id) resources
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
    join public.estimate_content_passport_r3 passport on passport.definition_version_id=definition.id
    where manifest.release_id=$1 and manifest.catalog_id=$2`, [
    releaseId, config.catalogId,
  ])).rows[0] as Json;
  const resourceRows = (await client.query(`select row_id,title_ru
    from public.estimate_resource_spec where definition_version_id=$1 order by ordinal`, [
    definitionId,
  ])).rows as Json[];
  const forbiddenAdjacentRows = resourceRows.filter((row) =>
    config.forbiddenAdjacentMatchers.some((matcher) => {
      matcher.lastIndex = 0;
      return matcher.test(`${row.row_id} ${row.title_ru}`);
    }));
  const search = (await client.query(`select release.status release_status,document.catalog_id,
      document.canonical_name_ru,document.primary_uom,document.definition_release_id::text,
      document.definition_version_id::text,document.selectable,document.adjudication_class,
      (select count(*)::int from public.estimate_search_document d where d.search_release_id=$1) documents,
      release.snapshot_sha256
    from public.estimate_search_index_release release
    join public.estimate_search_document document on document.search_release_id=release.id
    where release.id=$1 and document.catalog_id=$2`, [
    searchReleaseId, config.catalogId,
  ])).rows[0] as Json;
  return {
    release,
    manifest,
    target: { ...target, forbidden_adjacent_rows: forbiddenAdjacentRows.length },
    search,
  };
}

export async function runMasterSingleDefinitionSuccessorR1(
  config: MasterSingleDefinitionSuccessorConfig,
): Promise<void> {
  const apply = process.argv.includes("--apply");
  const allowHashedDirtySource = process.env.R4A13_ALLOW_HASHED_DIRTY_SOURCE === "true";
  exactDatabaseGuard(config);
  invariant(git("branch", "--show-current") === config.expectedBranch, stop(config, "BRANCH_DRIFT"));
  invariant(existsSync(config.masterPath)
    && sha256(readFileSync(config.masterPath)) === config.masterSha256,
  stop(config, "MASTER_SHA256_DRIFT"));
  const dirtySourcePaths = config.sourcePaths.filter((path) =>
    git("status", "--short", "--", path) !== "");
  invariant(dirtySourcePaths.length === 0 || allowHashedDirtySource,
    `${stop(config, "DIRTY_SOURCE_REQUIRES_EXPLICIT_OPT_IN")}:${dirtySourcePaths.join(",")}`);
  for (const path of config.sourcePaths) {
    invariant(existsSync(resolve(path)), `${stop(config, "SOURCE_MISSING")}:${path}`);
  }

  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const sourceHashes = config.sourcePaths.map((path) => ({
    path,
    sha256: sha256(readFileSync(resolve(path))),
    trackedState: git("status", "--short", "--", path) || "CLEAN_AT_HEAD",
  }));
  const coreAcceptance = await config.verifyCore();
  const parameterRows: Json[] = config.parameterDefinitions.map((parameter) => ({ ...parameter }));
  const formulaRows: Json[] = config.formulaDefinitions.map((formula) => ({
    ...formula,
    ast_sha256: sha256(formula.ast),
  }));
  const resourceRows: Json[] = config.resourceDefinitions.map((resource) => ({
    ...resource,
    row_type: resourceRowType(resource.category),
  }));
  const formulaConsumers: Record<string, string[]> = Object.fromEntries(parameterRows.map(
    (parameter) => [
      parameter.parameter_id,
      formulaRows.filter((formula) => formula.input_parameter_ids.includes(parameter.parameter_id))
        .map((formula) => formula.formula_id),
    ],
  ));
  const resourceConsumers: Record<string, string[]> = Object.fromEntries(parameterRows.map(
    (parameter) => [
      parameter.parameter_id,
      resourceRows.filter((resource) =>
        formulaConsumers[parameter.parameter_id]!.includes(resource.formula_id)
        || JSON.stringify(resource.resource_graph).includes(`"${parameter.parameter_id}"`)
        || JSON.stringify(resource.inclusion_ast).includes(`"${parameter.parameter_id}"`))
        .map((resource) => resource.row_id),
    ],
  ));
  invariant(parameterRows.every((parameter) => resourceConsumers[parameter.parameter_id]!.length > 0),
    stop(config, "PARAMETER_WITHOUT_RESOURCE_CONSUMER"));

  const fingerprint = sha256({
    contract: config.contract,
    head,
    tree,
    masterSha256: config.masterSha256,
    parentReleaseId: config.parentReleaseId,
    parentSearchReleaseId: config.parentSearchReleaseId,
    sourceHashes,
    parameters: parameterRows,
    formulas: formulaRows,
    resources: resourceRows,
    coreAcceptance,
  });
  const releaseId = uuid(`${config.contract}:${fingerprint}:definition-release`);
  const searchReleaseId = uuid(`${config.contract}:${fingerprint}:search-release`);
  const definitionId = uuid(`${config.contract}:${fingerprint}:definition`);
  const baselineId = uuid(`${config.contract}:${fingerprint}:baseline`);
  const sourceId = uuid(`${config.contract}:${config.sourceId}:source`);
  const locatorId = uuid(`${config.contract}:${config.sourceId}:locator`);
  const releaseKey = `${config.contract}:${fingerprint.slice(0, 20)}`;
  const current = JSON.parse(readFileSync(config.currentReleasePath, "utf8")) as Json;
  invariant(current.productionAccessed === false, stop(config, "CURRENT_PRODUCTION_ACCESS_FLAG"));
  invariant(
    (current.definitionReleaseId === config.parentReleaseId
      && current.searchReleaseId === config.parentSearchReleaseId)
    || (current.definitionReleaseId === releaseId && current.searchReleaseId === searchReleaseId),
    `${stop(config, "POINTER_DRIFT")}:${current.definitionReleaseId}:${current.searchReleaseId}`,
  );

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: config.applicationName,
  });
  await client.connect();
  let receipt: Json;
  try {
    const parent = (await client.query(
      "select * from public.estimate_definition_release where id=$1",
      [config.parentReleaseId],
    )).rows[0] as Json | undefined;
    invariant(parent?.status === "prepared" && parent.activated_at == null,
      stop(config, "PARENT_NOT_PREPARED_INACTIVE"));
    const parentSearch = (await client.query(
      "select * from public.estimate_search_index_release where id=$1",
      [config.parentSearchReleaseId],
    )).rows[0] as Json | undefined;
    invariant(parentSearch?.status === "draft", stop(config, "PARENT_SEARCH_NOT_DRAFT"));
    const old = (await client.query(`select manifest.*,
        definition.definition_version,definition.source_metadata,
        (select count(*)::int from public.estimate_parameter_definition p where p.definition_version_id=definition.id) parameters,
        (select count(*)::int from public.estimate_formula_graph f where f.definition_version_id=definition.id) formulas,
        (select count(*)::int from public.estimate_resource_spec r where r.definition_version_id=definition.id) resources
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      where manifest.release_id=$1 and manifest.catalog_id=$2`, [
      config.parentReleaseId, config.catalogId,
    ])).rows[0] as Json | undefined;
    invariant(old
      && Number(old.parameters) === config.expectedParentShape[0]
      && Number(old.formulas) === config.expectedParentShape[1]
      && Number(old.resources) === config.expectedParentShape[2],
    `${stop(config, "PARENT_TARGET_SHAPE")}:${JSON.stringify(old)}`);
    const lineage = await resolveCanonicalApprovedBaselineLeaf(
      client,
      String(old.approved_template_baseline_id),
      config.catalogId,
    );
    const nextDefinitionVersion = Number((await client.query(
      "select coalesce(max(definition_version),0)::int+1 value from public.estimate_definition_version where catalog_id=$1",
      [config.catalogId],
    )).rows[0].value);
    const nextCounts = {
      definitions: Number(parent.definition_count),
      parameters: Number(parent.parameter_count) - Number(old.parameters) + parameterRows.length,
      formulas: Number(parent.formula_count) - Number(old.formulas) + formulaRows.length,
      resources: Number(parent.resource_row_count) - Number(old.resources) + resourceRows.length,
    };
    const parameterSchemaSha256 = sha256(parameterRows);
    const definitionSchemaSha256 = sha256({ formulaRows, resourceRows });
    const acceptanceEvidenceSha256 = sha256({
      contract: config.contract,
      shortInput: config.shortInput,
      acceptanceInput: config.acceptanceInput,
      coreAcceptance,
      parameterSchemaSha256,
      definitionSchemaSha256,
      lineage,
    });
    const targetDefinitionSha256 = sha256({
      contract: config.contract,
      catalogId: config.catalogId,
      parameterSchemaSha256,
      definitionSchemaSha256,
    });
    const baselineRepresentative = {
      parameter_schema_sha256: parameterSchemaSha256,
      input_values: config.acceptanceInput,
      input_classification: Object.fromEntries(parameterRows.map((parameter) => [
        parameter.parameter_id, "VALIDATION_FIXTURE",
      ])),
      uom_by_parameter: Object.fromEntries(parameterRows.map((parameter) => [
        parameter.parameter_id, parameter.unit_id,
      ])),
      formula_consumer_ids: formulaConsumers,
      resource_consumer_row_ids: resourceConsumers,
      normative_source_ids: Object.fromEntries(parameterRows.map((parameter) => [
        parameter.parameter_id, [config.sourceId],
      ])),
      guide_provenance_ru: Object.fromEntries(parameterRows.map((parameter) => [
        parameter.parameter_id,
        String((parameter.truth_metadata.guide as Json).guide_short_ru),
      ])),
      proposal_source_refs: [{
        contract: config.contract,
        sourceId: config.sourceId,
        sourceKind: "PROJECT_DOCUMENTATION_REQUIRED",
        exactLocator: config.sourceMetadata.exact_locator,
      }],
      contract_version: BASELINE_CONTRACT,
    };
    const plan = createCanonicalDefinitionClonePlan({
      contract: config.contract,
      definition: {
        id: definitionId,
        releaseId,
        catalogId: config.catalogId,
        definitionVersion: nextDefinitionVersion,
        passport: {
          catalogId: config.catalogId,
          canonicalRuName: config.passport.canonicalRuName,
          workKey: config.passport.workKey,
          physicalResultRu: config.passport.physicalResultRu,
          projectSourceId: config.sourceId,
        },
        applicability: config.applicability,
        definitionSha256: targetDefinitionSha256,
        sourceMetadata: {
          contract: config.contract,
          masterSha256: config.masterSha256,
          sourceFingerprint: fingerprint,
          sourceId: config.sourceId,
          normId: config.normId,
          knownWorkScopeFirstEstimate: true,
          missingProjectQuantityPolicy: "PRELIMINARY_NEED",
          invalidSuppliedValuePolicy: "REJECT",
          activationAllowed: false,
          productionEligible: false,
        },
      },
      representative: {
        parameters: parameterRows,
        formulas: formulaRows,
        resources: resourceRows,
        bindings: [{
          row_id: config.binding.rowId,
          locator_id: locatorId,
          applicability: config.binding.applicability,
        }],
        baseline: baselineRepresentative,
        passport: {
          contract_version: CONTENT_PASSPORT_CONTRACT,
          included_scope_ru: config.passport.includedScopeRu,
          capability_matrix: [
            { capability: "PARAMETERS", status: "GREEN" },
            { capability: "FORMULAS_AND_PHYSICAL_PARITY", status: "GREEN" },
            { capability: "FULL_APPLICABLE_SCOPE", status: "GREEN" },
            { capability: "PRICE", status: "GREEN_UNKNOWN_IS_NULL" },
          ],
        },
      },
      parameterTruthMetadata: (parameter) => ({
        ...parameter.truth_metadata,
        contract: config.contract,
        semantic_parameter_key: `${config.catalogId}:${parameter.parameter_id}`,
        formula_consumers: formulaConsumers[parameter.parameter_id],
        resource_branch_consumers: resourceConsumers[parameter.parameter_id],
      }),
      resourceId: (resource) => uuid(
        `${config.contract}:${fingerprint}:${config.catalogId}:resource:${resource.row_id}`,
      ),
      resourceSemanticOwner: (resource) => `${config.catalogId}:${resource.row_id}`,
      resourceSha256: (resource) => sha256({
        contract: config.contract,
        targetCatalogId: config.catalogId,
        resource,
      }),
      baseline: {
        id: baselineId,
        key: `${config.contract}:${fingerprint.slice(0, 16)}:${config.catalogId}`,
        sourceDefinitionVersionId: lineage.definitionVersionId,
        validationScenarioRefs: [{
          scenario: config.validationScenario,
          shortInput: config.shortInput,
          fixture: config.acceptanceInput,
          acceptanceEvidenceSha256,
          coreAcceptance,
        }],
        acceptanceEvidenceSha256,
        acceptedReleaseId: releaseId,
        supersedesBaselineId: lineage.baselineId,
      },
      passport: {
        physicalResultRu: config.passport.physicalResultRu,
        excludedScopeRu: config.passport.excludedScopeRu,
        decision: {
          contract: CONTENT_PASSPORT_CONTRACT,
          status: "GREEN",
          allowed: true,
          waveContract: config.contract,
          quantityScope: "FULL",
          priceState: "PARTIAL_NEEDS_PRICE",
          activationAllowed: false,
          productionEligible: false,
        },
        payloadSha256: sha256({ targetDefinitionSha256, acceptanceEvidenceSha256 }),
        sourceHead: head,
        sourceTree: tree,
      },
      bindingApplicability: (binding) => ({ ...binding.applicability }),
      expectedNormativeBindingCount: 1,
    });

    const existing = (await client.query(
      "select id,status from public.estimate_definition_release where id=$1",
      [releaseId],
    )).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.status === "prepared", stop(config, "EXISTING_RELEASE_NOT_PREPARED"));
      receipt = {
        status: `GREEN_${config.stopCode}_PREPARED_NOT_ACTIVE`,
        idempotent: true,
        mutationPerformed: false,
        predecessor: {
          releaseId: config.parentReleaseId,
          searchReleaseId: config.parentSearchReleaseId,
        },
        successor: { releaseId, searchReleaseId, releaseKey, definitionId, baselineId, nextCounts },
        coreAcceptance,
        audit: await auditState(client, config, releaseId, searchReleaseId, definitionId),
      };
    } else {
      await client.query("begin");
      await client.query("set local lock_timeout='5s'");
      await client.query("set local statement_timeout='600s'");
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [config.contract]);
      try {
        await client.query(`insert into public.estimate_normative_source(
            id,source_key,title_ru,authority,official_url,artifact_sha256,effective_from,metadata)
          values($1,$2,$3,$4,null,null,null,$5::jsonb)
          on conflict(source_key) do update set title_ru=excluded.title_ru,
            authority=excluded.authority,artifact_sha256=excluded.artifact_sha256,
            metadata=public.estimate_normative_source.metadata||excluded.metadata`, [
          sourceId,
          config.sourceId,
          config.sourceMetadata.source_title,
          config.sourceMetadata.source_authority,
          JSON.stringify({
            contract: config.contract,
            sourceKind: "PROJECT_DOCUMENTATION_REQUIRED",
            useRestriction: config.sourceMetadata.use_restriction,
            universalProductivityClaimed: false,
            universalConsumptionClaimed: false,
            activationAllowed: false,
          }),
        ]);
        const actualSourceId = String((await client.query(
          "select id::text from public.estimate_normative_source where source_key=$1",
          [config.sourceId],
        )).rows[0].id);
        await client.query(`insert into public.estimate_normative_locator(
            id,source_id,locator_key,locator,excerpt_sha256)
          values($1,$2,$3,$4::jsonb,$5)
          on conflict(source_id,locator_key) do nothing`, [
          locatorId,
          actualSourceId,
          config.locator.key,
          JSON.stringify(config.locator.payload),
          sha256(config.sourceMetadata.exact_locator),
        ]);
        const publisherPreflight = await preflightCanonicalDefinitionPublishPlans(client, [plan]);
        await client.query(`insert into public.estimate_definition_release(
            id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
            definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,
            parameter_count,formula_count)
          select $1,$2,schema_version,'draft',$3,$4,$5,$6,$7,metadata||$8::jsonb,$9,$10,$11,$12
          from public.estimate_definition_release where id=$9`, [
          releaseId,
          releaseKey,
          head,
          tree,
          sha256(`${config.contract}:${fingerprint}:draft`),
          nextCounts.definitions,
          nextCounts.resources,
          JSON.stringify({
            contract: config.contract,
            masterSha256: config.masterSha256,
            lifecycle: "DRAFT_FORWARD_ONLY",
            replacedDefinitionCount: 1,
            masterBenchmarkOrdinal: config.benchmarkOrdinal,
            activationAllowed: false,
            productionEligible: false,
            priceState: "PARTIAL_NEEDS_PRICE",
          }),
          config.parentReleaseId,
          sha256({ contract: config.contract, fingerprint, definitionSchemaSha256 }),
          nextCounts.parameters,
          nextCounts.formulas,
        ]);
        await client.query(`insert into public.estimate_cumulative_manifest_entry(
            release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
            publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,
            definition_hash,entry_sha256,runtime_publication_state)
          select $1,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
            publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,
            encode(extensions.digest(convert_to($2||':'||$1::uuid::text||':'||catalog_id||':'||entry_sha256,'UTF8'),'sha256'),'hex'),
            runtime_publication_state
          from public.estimate_cumulative_manifest_entry where release_id=$3`, [
          releaseId, config.contract, config.parentReleaseId,
        ]);
        const persisted = await publishCanonicalDefinitionDraft(client, plan);
        const manifestUpdate = await client.query(`update public.estimate_cumulative_manifest_entry set
            definition_version_id=$3,source_batch=$4,source_release_id=$1,
            publication_state='CANONICAL_SUCCESSOR',approved_template_baseline_id=$5,
            baseline_ready=true,scenario_ready=true,definition_hash=$6,entry_sha256=$7,
            runtime_publication_state='CANDIDATE'
          where release_id=$1 and catalog_id=$2`, [
          releaseId,
          config.catalogId,
          definitionId,
          config.contract,
          baselineId,
          targetDefinitionSha256,
          sha256({
            contract: config.contract,
            releaseId,
            catalogId: config.catalogId,
            definitionId,
            baselineId,
            targetDefinitionSha256,
          }),
        ]);
        invariant(manifestUpdate.rowCount === 1, stop(config, "MANIFEST_UPDATE"));
        const searchSnapshot = await cloneSearch(client, config, {
          releaseId,
          searchReleaseId,
          releaseKey,
          head,
          tree,
          fingerprint,
          definitionId,
        });
        const audit = await auditState(client, config, releaseId, searchReleaseId, definitionId);
        invariant(Number(audit.manifest.identities) === nextCounts.definitions
          && Number(audit.manifest.replaced) === 1,
        `${stop(config, "MANIFEST_AUDIT")}:${JSON.stringify(audit.manifest)}`);
        invariant(audit.target.content_status === "CANDIDATE_READY"
          && audit.target.content_gate_status === "GREEN"
          && Number(audit.target.parameters) === parameterRows.length
          && Number(audit.target.formulas) === formulaRows.length
          && Number(audit.target.resources) === resourceRows.length
          && Number(audit.target.forbidden_adjacent_rows) === 0,
        `${stop(config, "TARGET_AUDIT")}:${JSON.stringify(audit.target)}`);
        invariant(audit.search.release_status === "draft"
          && audit.search.definition_release_id === releaseId
          && audit.search.definition_version_id === definitionId
          && audit.search.primary_uom === config.search.primaryUom
          && audit.search.canonical_name_ru === config.search.canonicalNameRu,
        `${stop(config, "SEARCH_AUDIT")}:${JSON.stringify(audit.search)}`);
        const unrelated = (await client.query(`select count(*)::int changed
          from public.estimate_cumulative_manifest_entry parent
          join public.estimate_cumulative_manifest_entry successor using(catalog_id)
          where parent.release_id=$1 and successor.release_id=$2 and parent.catalog_id<>$3
            and (parent.definition_version_id<>successor.definition_version_id
              or parent.source_batch<>successor.source_batch
              or parent.source_release_id<>successor.source_release_id
              or parent.approved_template_baseline_id<>successor.approved_template_baseline_id
              or parent.runtime_publication_state<>successor.runtime_publication_state)`, [
          config.parentReleaseId, releaseId, config.catalogId,
        ])).rows[0] as Json;
        invariant(Number(unrelated.changed) === 0,
          `${stop(config, "UNRELATED_MANIFEST_DRIFT")}:${unrelated.changed}`);
        const prepared = await client.query(`update public.estimate_definition_release
          set source_manifest_sha256=$2,status='prepared',sealed_at=clock_timestamp(),
            metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
          releaseId,
          audit.manifest.snapshot,
          JSON.stringify({
            lifecycle: "PREPARED_NOT_ACTIVE",
            searchReleaseId,
            searchSnapshotSha256: searchSnapshot.snapshot_sha256,
            masterSingleDefinitionTargetCount: 1,
            sourceCoreAcceptanceSha256: coreAcceptance.serializedSha256,
            parameterCountPerTarget: parameterRows.length,
            formulaCountPerTarget: formulaRows.length,
            resourceDefinitionCountPerTarget: resourceRows.length,
            priceState: "PARTIAL_NEEDS_PRICE",
          }),
        ]);
        invariant(prepared.rowCount === 1, stop(config, "PREPARED_TRANSITION"));
        const terminalAudit = await auditState(
          client,
          config,
          releaseId,
          searchReleaseId,
          definitionId,
        );
        invariant(terminalAudit.release.status === "prepared"
          && terminalAudit.release.activated_at == null,
        `${stop(config, "TERMINAL_LIFECYCLE")}:${JSON.stringify(terminalAudit.release)}`);
        if (apply) await client.query("commit");
        else await client.query("rollback");
        receipt = {
          status: apply
            ? `GREEN_${config.stopCode}_PREPARED_NOT_ACTIVE`
            : `DRY_RUN_${config.stopCode}_VALIDATED`,
          idempotent: false,
          mutationPerformed: apply,
          predecessor: {
            releaseId: config.parentReleaseId,
            searchReleaseId: config.parentSearchReleaseId,
            catalogId: config.catalogId,
            definitionId: old.definition_version_id,
            shape: [Number(old.parameters), Number(old.formulas), Number(old.resources)],
          },
          successor: {
            releaseId,
            searchReleaseId,
            releaseKey,
            definitionId,
            baselineId,
            definitionVersion: nextDefinitionVersion,
            shape: [parameterRows.length, formulaRows.length, resourceRows.length],
            nextCounts,
          },
          coreAcceptance,
          publisherPreflight,
          publisherPersistedSelfAudit: persisted,
          audit: { ...terminalAudit, unrelatedManifestChanges: Number(unrelated.changed) },
        };
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    await client.end();
  }

  const body = {
    schemaVersion: `${config.contract}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    source: {
      branch: config.expectedBranch,
      head,
      tree,
      fingerprint,
      sourceHashes,
      hashedDirtySourceAccepted: dirtySourcePaths.length > 0 && allowHashedDirtySource,
    },
    master: { path: config.masterPath, sha256: config.masterSha256 },
    ...receipt!,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  const sealed = { ...body, receiptSha256: sha256(body) };
  if (apply && receipt!.mutationPerformed === true) {
    atomicJson(resolve(config.outputRoot, "acceptance.json"), sealed);
    atomicJson(resolve(config.outputRoot, `01_${config.receiptFileStem}_${head}.json`), sealed);
    atomicJson(config.currentReleasePath, {
      ...current,
      definitionReleaseId: releaseId,
      searchReleaseId,
      definitionReleaseStatus: "prepared",
      searchReleaseStatus: "draft",
      definitionSnapshotSha256: receipt!.audit.manifest.snapshot,
      manifestHashChainSha256: receipt!.audit.manifest.snapshot,
      searchHashChainSha256: receipt!.audit.search.snapshot_sha256,
      currentRuntimeDefinitions: receipt!.successor.nextCounts.definitions,
      owner: config.owner,
      productionAccessed: false,
      fakeGreenClaimed: false,
    });
  }
  process.stdout.write(`${JSON.stringify(sealed, null, 2)}\n`);
}
