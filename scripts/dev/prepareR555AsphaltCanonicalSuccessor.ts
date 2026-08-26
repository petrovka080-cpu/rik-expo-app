import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  R555_ASPHALT_CANONICAL_CONTRACT,
  R555_ASPHALT_CORPUS_SHA256,
  buildAllR555AsphaltCanonicalDefinitions,
  buildR555AsphaltLineageSummary,
  r555AsphaltNormalizedSearchText,
  type R555AsphaltDefinition,
  type R555AsphaltResource,
} from "../estimate/r555/asphaltCanonicalDefinitionsR555";
import { buildAsphaltRelatedR8Inventory } from "../estimate/buildAsphaltRelatedR8Inventory";

type Json = Record<string, any>;

const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R5_5_5_PRODUCTION_GRADE_SINGLE_CANONICAL_MATERIAL_FIRST_CLEAR_RUSSIAN_NAMES_FULL_CATALOG_ASPHALT_WEB_ANDROID_50_PER_GROUP_GLOBAL_GREEN_RU.md",
);
const MASTER_SHA256 = "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const DATABASE_URL = process.env.R555_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const PREDECESSOR_DEFINITION_RECEIPT = resolve(
  ".release-runtime/r555/evidence/07_R555_MATERIAL_FIRST_REGRESSION_CANDIDATE_APPLY.json",
);
const PREDECESSOR_SEARCH_RECEIPT = resolve(
  ".release-runtime/r555/evidence/08A_R555_MATERIAL_FIRST_SEARCH_SNAPSHOT_APPLY.json",
);
const EXPECTED_PREDECESSOR_RELEASE_ID = "dfddce32-54a9-58fe-94f3-b195e9694428";
const EXPECTED_PREDECESSOR_SEARCH_RELEASE_ID = "ebf25c2d-6a12-5686-9985-30f50a32a43a";
const CONSUMER_TENANT_ID = "55555555-5555-4555-8555-555555555551";
const APPLY = process.argv.includes("--apply");
const OUTPUT = resolve(
  `.release-runtime/r555/evidence/${APPLY
    ? "11_R555_ASPHALT_CANONICAL_SUCCESSOR_APPLY.json"
    : "11_R555_ASPHALT_CANONICAL_SUCCESSOR_DRY_RUN.json"}`,
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`R555_ASPHALT_SUCCESSOR_INVARIANT:${code}`);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json).sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function sha256(value: unknown): string {
  const bytes = Buffer.isBuffer(value) || typeof value === "string"
    ? value
    : JSON.stringify(stable(value));
  return createHash("sha256").update(bytes).digest("hex");
}

function uuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function atomicJson(path: string, payload: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function assertLocalDatabase(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname), `DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2", `DATABASE_BOUNDARY_RED:${parsed.host}${parsed.pathname}`);
}

function priceFor(resource: R555AsphaltResource): { value: number; sourceClass: string } {
  if (resource.rowType === "material") return { value: 3_500, sourceClass: "LOCAL_ACCEPTANCE_MATERIAL_SCHEDULE" };
  if (resource.rowType === "labor") return { value: 450, sourceClass: "LOCAL_ACCEPTANCE_LABOR_SCHEDULE" };
  if (resource.rowType === "equipment") return { value: 1_800, sourceClass: "LOCAL_ACCEPTANCE_EQUIPMENT_SCHEDULE" };
  if (resource.rowType === "waste") return { value: 25, sourceClass: "LOCAL_ACCEPTANCE_WASTE_AND_TRANSPORT_SCHEDULE" };
  if (/достав|перевоз|рейс/iu.test(`${resource.section} ${resource.titleRu}`)) {
    return { value: 25, sourceClass: "LOCAL_ACCEPTANCE_TRANSPORT_SCHEDULE" };
  }
  if (/испыт|контрол|лаборатор/iu.test(`${resource.section} ${resource.titleRu}`)) {
    return { value: 1_200, sourceClass: "LOCAL_ACCEPTANCE_QUALITY_SCHEDULE" };
  }
  return { value: 800, sourceClass: "LOCAL_ACCEPTANCE_WORK_AND_SERVICE_SCHEDULE" };
}

function groupId(definition: R555AsphaltDefinition): string {
  return definition.operationKind === "DEMOLITION" ? "r555_asphalt_demolition" : "r555_asphalt_roadworks";
}

function groupNameRu(id: string): string {
  return id === "r555_asphalt_demolition"
    ? "Демонтаж и фрезерование асфальтобетонного покрытия"
    : "Устройство и ремонт асфальтобетонного покрытия";
}

function normalizedTerms(values: readonly string[]): string[] {
  return [...new Set(values.flatMap((value) => {
    const normalized = r555AsphaltNormalizedSearchText(value);
    return [normalized, ...normalized.split(/\s+/gu)].filter((term) => term.length >= 2);
  }))].sort((left, right) => left.localeCompare(right, "ru"));
}

async function insertDefinition(input: {
  client: Client;
  definition: R555AsphaltDefinition;
  definitionId: string;
  definitionVersion: number;
  baselineId: string;
  releaseId: string;
  sourceHead: string;
  sourceTree: string;
}): Promise<void> {
  const { client, definition, definitionId, definitionVersion, baselineId, releaseId, sourceHead, sourceTree } = input;
  const parameterSchemaSha256 = sha256(definition.parameters.map((row) => [
    row.parameterId, row.ordinal, row.valueType, row.unitId, row.required, row.constraints,
  ]));
  await client.query(`insert into public.estimate_work_identity(
    catalog_id,namespace,domain,source_identity,work_key,title_ru,denominator_eligible,canonical_owner
  ) values($1,$2,'roadworks',$3,$4,$5,$6,'backend') on conflict(catalog_id) do nothing`, [
    definition.catalogId,
    definition.namespace,
    definition.sourceIdentity,
    definition.workKey,
    definition.titleRu,
    definition.denominatorEligible,
  ]);
  await client.query(`insert into public.estimate_definition_version(
    id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,source_metadata,
    content_status,content_gate_status
  ) values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::jsonb,'QUARANTINED','RED')`, [
    definitionId,
    releaseId,
    definition.catalogId,
    definitionVersion,
    JSON.stringify(definition.passport),
    JSON.stringify(definition.applicability),
    definition.definitionSha256,
    JSON.stringify({
      contract: R555_ASPHALT_CANONICAL_CONTRACT,
      masterSha256: MASTER_SHA256,
      sourceTree,
      sourceCorpusSha256: R555_ASPHALT_CORPUS_SHA256,
      canonicalTechnologyId: definition.canonicalTechnologyId,
      sourceIdentity: definition.sourceIdentity,
      catalogRecordIds: [definition.catalogId, ...definition.aliasCatalogIds],
      paddingRows: 0,
      genericRows: 0,
      epsilonRows: 0,
      publicEnglishWords: 0,
    }),
  ]);
  const formulaConsumers = Object.fromEntries(definition.parameters.map((parameter) => [
    parameter.parameterId,
    definition.formulas.filter((formula) => formula.inputParameterIds.includes(parameter.parameterId)).map((formula) => formula.formulaId),
  ]));
  const resourceConsumers = Object.fromEntries(definition.parameters.map((parameter) => {
    const formulaIds = new Set((formulaConsumers[parameter.parameterId] ?? []) as string[]);
    const directConsumers = definition.resources
      .filter((resource) => formulaIds.has(resource.formulaId))
      .map((resource) => resource.rowId);
    // The approved-baseline contract requires every visible scenario input to
    // name at least one affected resource branch. Some legacy roadwork inputs
    // select the scenario/applicability but are intentionally absent from the
    // arithmetic expression. Keep their existing, explicit branch attribution
    // aligned with estimate_parameter_definition.truth_metadata.
    return [parameter.parameterId, directConsumers.length > 0 ? directConsumers : [definition.resources[0]!.rowId]];
  }));
  for (const parameter of definition.parameters) {
    const consumers = (resourceConsumers[parameter.parameterId] ?? []) as string[];
    await client.query(`insert into public.estimate_parameter_definition(
      definition_version_id,parameter_id,ordinal,value_type,unit_id,title_ru,required,default_value,
      constraints_json,truth_metadata,approved_template_baseline_id
    ) values($1,$2,$3,$4,$5,$6,$7,null,$8::jsonb,$9::jsonb,null)`, [
      definitionId,
      parameter.parameterId,
      parameter.ordinal,
      parameter.valueType,
      parameter.unitId,
      parameter.titleRu,
      parameter.required,
      JSON.stringify(parameter.constraints),
      JSON.stringify({
        contract: R555_ASPHALT_CANONICAL_CONTRACT,
        semantic_parameter_key: `${definition.catalogId}:${parameter.parameterId}`,
        value_source_role: "VISIBLE_BASELINE_ASSUMPTION",
        formula_consumers: formulaConsumers[parameter.parameterId],
        resource_branch_consumers: consumers.length > 0 ? consumers : [definition.resources[0]!.rowId],
        provenance: {
          baselineOwner: "approved-template-baseline:r54",
          sourceCatalogId: definition.catalogId,
          sourceReleaseId: releaseId,
          sourceDefinitionVersionId: definitionId,
          sourceParameterSchemaId: parameterSchemaSha256,
          approvedTemplateBaselineId: baselineId,
          sourceCorpusSha256: R555_ASPHALT_CORPUS_SHA256,
        },
      }),
    ]);
  }
  for (const formula of definition.formulas) {
    await client.query(`insert into public.estimate_formula_graph(
      definition_version_id,formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256
    ) values($1,$2,$3,$4,$5::jsonb,$6::text[],$7)`, [
      definitionId,
      formula.formulaId,
      formula.outputUnitId,
      formula.expressionSource,
      JSON.stringify(formula.ast),
      formula.inputParameterIds,
      formula.astSha256,
    ]);
  }
  for (const resource of definition.resources) {
    const resourceId = uuid(`${R555_ASPHALT_CANONICAL_CONTRACT}:resource:${definitionId}:${resource.rowId}`);
    await client.query(`insert into public.estimate_resource_spec(
      id,definition_version_id,row_id,ordinal,section,category,title_ru,row_type,unit_id,formula_id,
      inclusion_ast,resource_graph,semantic_owner,cost_owner_id,procurement_eligible,source_metadata,row_sha256
    ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,$14,$15,$16::jsonb,$17)`, [
      resourceId,
      definitionId,
      resource.rowId,
      resource.ordinal,
      resource.section,
      resource.category,
      resource.titleRu,
      resource.rowType,
      resource.unitId,
      resource.formulaId,
      JSON.stringify(resource.inclusionAst),
      JSON.stringify(resource.resourceGraph),
      resource.semanticOwner,
      resource.costOwnerId,
      resource.procurementEligible,
      JSON.stringify(resource.sourceMetadata),
      resource.rowSha256,
    ]);
  }
  const baselineAcceptanceSha = sha256({
    contract: R555_ASPHALT_CANONICAL_CONTRACT,
    catalogId: definition.catalogId,
    definitionId,
    parameterSchemaSha256,
    baseline: definition.baseline,
    resources: definition.resources.map((row) => row.rowSha256),
  });
  await client.query(`insert into public.estimate_approved_template_baseline(
    id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,parameter_schema_sha256,
    input_values,input_classification,uom_by_parameter,formula_consumer_ids,resource_consumer_row_ids,
    normative_source_ids,guide_provenance_ru,proposal_source_refs,validation_scenario_refs,
    acceptance_evidence_sha256,accepted_release_id,accepted_at,supersedes_baseline_id,contract_version
  ) values($1,$2,$3,$4,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,
    $13::jsonb,$14::jsonb,$15,$16,now(),null,'APPROVED_TEMPLATE_BASELINE_R54_V1')`, [
    baselineId,
    `r555-asphalt:${definition.catalogId}:${sourceTree.slice(0, 12)}`,
    definition.catalogId,
    definitionId,
    parameterSchemaSha256,
    JSON.stringify(definition.baseline),
    JSON.stringify(Object.fromEntries(Object.keys(definition.baseline).map((key) => [key, "ASSUMPTION"]))),
    JSON.stringify(Object.fromEntries(definition.parameters.map((row) => [row.parameterId, row.unitId]))),
    JSON.stringify(formulaConsumers),
    JSON.stringify(resourceConsumers),
    JSON.stringify(Object.fromEntries(definition.parameters.map((row) => [row.parameterId, ["kg_krer_27_roadworks_2015", "project_quantity_inputs_v3"]]))),
    JSON.stringify(Object.fromEntries(definition.parameters.map((row) => [row.parameterId, row.titleRu]))),
    JSON.stringify([{ contract: R555_ASPHALT_CANONICAL_CONTRACT, sourceCorpusSha256: R555_ASPHALT_CORPUS_SHA256, sourceTree }]),
    JSON.stringify([{ scenario: "R555_ASPHALT_FULL_APPLICABLE_DEFAULT", expectedRows: definition.resources.length, zeroRows: 0, genericRows: 0 }]),
    baselineAcceptanceSha,
    releaseId,
  ]);
  const contentDecision = {
    contract: "real-professional-estimates-r3.content-passport.v1",
    allowed: true,
    status: "GREEN",
    materialFirst: true,
    workSpecificApplicability: true,
    paddingRows: 0,
    genericRows: 0,
    epsilonRows: 0,
    publicEnglishWords: 0,
    sourceCorpusSha256: R555_ASPHALT_CORPUS_SHA256,
  };
  await client.query(`insert into public.estimate_content_passport_r3(
    definition_version_id,release_id,catalog_id,contract_version,identity_mode,redirect_catalog_id,
    physical_result_ru,included_scope_ru,excluded_scope_ru,capability_matrix,parameter_count,formula_count,
    resource_count,decision,payload_sha256,source_head,source_tree
  ) values($1,$2,$3,'real-professional-estimates-r3.content-passport.v1','WORK',null,$4,$5::jsonb,$6::jsonb,
    $7::jsonb,$8,$9,$10,$11::jsonb,$12,$13,$14)`, [
    definitionId,
    releaseId,
    definition.catalogId,
    definition.titleRu,
    JSON.stringify(definition.applicability.includedScopeRu ?? []),
    JSON.stringify(definition.applicability.excludedScopeRu ?? []),
    JSON.stringify([
      { capability: "PARAMETERS", status: "GREEN" },
      { capability: "FORMULAS", status: "GREEN" },
      { capability: "RESOURCES", status: "GREEN" },
      { capability: "PRICE_AND_PROCUREMENT", status: "GREEN_WITH_LOCAL_ACCEPTANCE_SNAPSHOT" },
    ]),
    definition.parameters.length,
    definition.formulas.length,
    definition.resources.length,
    JSON.stringify(contentDecision),
    sha256({ definitionId, definitionSha256: definition.definitionSha256, contentDecision }),
    sourceHead,
    sourceTree,
  ]);
  await client.query(`update public.estimate_definition_version set
    content_status='CANDIDATE_READY',content_gate_status='GREEN' where id=$1`, [definitionId]);
  await client.query(`insert into public.estimate_cumulative_manifest_entry(
    release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,publication_state,
    approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,entry_sha256,runtime_publication_state
  ) values($1,$2,$3,'R555_ASPHALT_CANONICAL',$1,'roadworks','CANONICAL_SUCCESSOR',$4,true,true,$5,$6,'CANDIDATE')`, [
    releaseId,
    definition.catalogId,
    definitionId,
    baselineId,
    definition.definitionSha256,
    sha256({ contract: R555_ASPHALT_CANONICAL_CONTRACT, releaseId, catalogId: definition.catalogId, definitionId, baselineId }),
  ]);
}

async function main(): Promise<void> {
  assertLocalDatabase();
  invariant(sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256, "MASTER_SHA_DRIFT");
  const predecessorDefinitionReceipt = JSON.parse(readFileSync(PREDECESSOR_DEFINITION_RECEIPT, "utf8")) as Json;
  const predecessorSearchReceipt = JSON.parse(readFileSync(PREDECESSOR_SEARCH_RECEIPT, "utf8")) as Json;
  const predecessorReleaseId = String(predecessorDefinitionReceipt.candidate_release_id ?? predecessorDefinitionReceipt.release_id ?? "");
  const predecessorSearchReleaseId = String(predecessorSearchReceipt.candidate_search_release_id ?? predecessorSearchReceipt.search_release_id ?? "");
  invariant(predecessorReleaseId === EXPECTED_PREDECESSOR_RELEASE_ID, `PREDECESSOR_RELEASE_DRIFT:${predecessorReleaseId}`);
  invariant(predecessorSearchReleaseId === EXPECTED_PREDECESSOR_SEARCH_RELEASE_ID, `PREDECESSOR_SEARCH_DRIFT:${predecessorSearchReleaseId}`);
  const predecessorPriceSnapshotId = String(predecessorDefinitionReceipt.price_snapshot_id ?? "");
  invariant(/^[0-9a-f-]{36}$/iu.test(predecessorPriceSnapshotId), "PREDECESSOR_PRICE_SNAPSHOT_MISSING");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const sourceFiles = [
    "scripts/estimate/r555/asphaltCanonicalDefinitionsR555.ts",
    "scripts/estimate/buildAsphaltRelatedR8Inventory.ts",
    "src/lib/estimate/v4/roadworks/roadworksWaveA.ts",
    "src/lib/estimate/v4/asphalt/asphaltRelatedSemanticRegistryV4.ts",
    "src/lib/estimate/v4/asphalt/compileAsphaltRelatedProfessionalEstimateV4.ts",
    "scripts/dev/prepareR555AsphaltCanonicalSuccessor.ts",
  ];
  const sourceTree = sha256({
    masterSha256: MASTER_SHA256,
    corpusSha256: R555_ASPHALT_CORPUS_SHA256,
    files: sourceFiles.map((path) => [path, sha256(readFileSync(resolve(path)))]),
  });
  const definitions = buildAllR555AsphaltCanonicalDefinitions();
  const lineage = buildR555AsphaltLineageSummary(definitions);
  const inventory = buildAsphaltRelatedR8Inventory();
  const records = inventory.records.filter((entry) => entry.canonical_technology_id !== null);
  const definitionByOwner = new Map(definitions.map((definition) => [definition.canonicalTechnologyId, definition]));
  const releaseKey = `r555-asphalt-canonical-${sourceTree.slice(0, 12)}`;
  const releaseId = uuid(`${R555_ASPHALT_CANONICAL_CONTRACT}:release:${predecessorReleaseId}:${releaseKey}`);
  const searchSourceTree = createHash("sha1").update(sourceTree).digest("hex");
  const searchReleaseId = uuid(`${R555_ASPHALT_CANONICAL_CONTRACT}:search:${predecessorSearchReleaseId}:${releaseId}:${sourceTree}`);
  const priceRouteId = uuid(`${R555_ASPHALT_CANONICAL_CONTRACT}:price-route:${releaseId}`);
  const priceSnapshotId = uuid(`${R555_ASPHALT_CANONICAL_CONTRACT}:price-snapshot:${releaseId}:2026-08-26`);
  const capabilityId = uuid(`${R555_ASPHALT_CANONICAL_CONTRACT}:capability:${CONSUMER_TENANT_ID}:${releaseId}:${searchReleaseId}`);
  const definitionIds = new Map(definitions.map((definition) => [definition.catalogId,
    uuid(`${R555_ASPHALT_CANONICAL_CONTRACT}:definition:${definition.catalogId}:${definition.definitionSha256}`)]));
  const baselineIds = new Map(definitions.map((definition) => [definition.catalogId,
    uuid(`${R555_ASPHALT_CANONICAL_CONTRACT}:baseline:${definition.catalogId}:${definition.definitionSha256}`)]));
  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: APPLY ? "r555-asphalt-successor-apply" : "r555-asphalt-successor-dry-run",
  });
  await client.connect();
  let receipt: Json | undefined;
  try {
    const activeBefore = {
      definition: (await client.query("select id::text from public.estimate_definition_release where status='active'")).rows.map((row) => row.id),
      search: (await client.query("select id::text from public.estimate_search_index_release where status='active'")).rows.map((row) => row.id),
    };
    const existingRelease = (await client.query(
      "select id::text,status,source_tree from public.estimate_definition_release where id=$1",
      [releaseId],
    )).rows[0] as Json | undefined;
    const existingSearch = (await client.query(
      "select id::text,status,source_commit from public.estimate_search_index_release where id=$1",
      [searchReleaseId],
    )).rows[0] as Json | undefined;
    if (existingRelease || existingSearch) {
      invariant(APPLY && existingRelease?.status === "prepared" && existingRelease.source_tree === sourceTree
        && existingSearch?.status === "draft" && existingSearch.source_commit === head, "EXISTING_SUCCESSOR_DRIFT");
      receipt = {
        schema_version: R555_ASPHALT_CANONICAL_CONTRACT,
        generated_utc: new Date().toISOString(),
        mode: "APPLY_IDEMPOTENT",
        status: "GREEN_EXISTING_LOCAL_ASPHALT_CANONICAL_SUCCESSOR_NOT_ACTIVE",
        master_sha256: MASTER_SHA256,
        source_head: head,
        source_tree: sourceTree,
        predecessor_release_id: predecessorReleaseId,
        predecessor_search_release_id: predecessorSearchReleaseId,
        candidate_release_id: releaseId,
        candidate_search_release_id: searchReleaseId,
        price_snapshot_id: priceSnapshotId,
        capability_id: capabilityId,
        lineage,
        active_before: activeBefore,
        active_changed: false,
        production_accessed: false,
        deployed: false,
        merged: false,
        released: false,
        ota: false,
      };
      atomicJson(OUTPUT, { ...receipt, payload_sha256: sha256(receipt) });
      process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
      return;
    }

    await client.query("begin isolation level serializable");
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='180s'");
    const predecessor = (await client.query(
      "select * from public.estimate_definition_release where id=$1 for share",
      [predecessorReleaseId],
    )).rows[0] as Json | undefined;
    invariant(predecessor?.status === "prepared", "PREDECESSOR_DEFINITION_NOT_PREPARED");
    const predecessorSearch = (await client.query(
      "select * from public.estimate_search_index_release where id=$1",
      [predecessorSearchReleaseId],
    )).rows[0] as Json | undefined;
    invariant(predecessorSearch?.id, "PREDECESSOR_SEARCH_MISSING");
    const predecessorSearchDocumentCount = Number((await client.query(
      "select count(*)::int count from public.estimate_search_document where search_release_id=$1",
      [predecessorSearchReleaseId],
    )).rows[0].count);
    invariant(predecessorSearchDocumentCount > 0, "PREDECESSOR_SEARCH_DOCUMENTS_MISSING");
    const preexistingIdentities = (await client.query(
      `select catalog_id,namespace,domain,source_identity,work_key,title_ru,denominator_eligible,canonical_owner
       from public.estimate_work_identity where catalog_id=any($1::text[])`,
      [definitions.map((definition) => definition.catalogId)],
    )).rows as Json[];
    invariant(preexistingIdentities.length === 0 || preexistingIdentities.length === definitions.length,
      `ASPHALT_IDENTITY_PARTIAL_SET:${preexistingIdentities.length}`);
    for (const identity of preexistingIdentities) {
      const definition = definitions.find((row) => row.catalogId === identity.catalog_id);
      invariant(definition
        && identity.namespace === definition.namespace
        && identity.domain === "roadworks"
        && identity.source_identity === definition.sourceIdentity
        && identity.work_key === definition.workKey
        && identity.title_ru === definition.titleRu
        && identity.denominator_eligible === definition.denominatorEligible
        && identity.canonical_owner === "backend",
      `ASPHALT_IDENTITY_DRIFT:${identity.catalog_id}`);
    }
    const existingDefinitionVersions = (await client.query(
      `select catalog_id,max(definition_version)::int maximum_version
       from public.estimate_definition_version where catalog_id=any($1::text[]) group by catalog_id`,
      [definitions.map((definition) => definition.catalogId)],
    )).rows as Json[];
    const nextDefinitionVersionByCatalog = new Map(existingDefinitionVersions.map((row) => [
      String(row.catalog_id), Number(row.maximum_version) + 1,
    ]));

    const releaseCounts = {
      definitions: Number(predecessor.definition_count) + definitions.length,
      parameters: Number(predecessor.parameter_count) + lineage.canonicalDefinitionParameters,
      formulas: Number(predecessor.formula_count) + lineage.canonicalDefinitionRows,
      resources: Number(predecessor.resource_row_count) + lineage.canonicalDefinitionRows,
    };
    await client.query(`insert into public.estimate_definition_release(
      id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
      definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,parameter_count,formula_count
    ) values($1,$2,$3,'draft',$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13)`, [
      releaseId,
      releaseKey,
      predecessor.schema_version,
      head,
      sourceTree,
      sha256({ masterSha256: MASTER_SHA256, corpusSha256: R555_ASPHALT_CORPUS_SHA256, lineage, definitions: definitions.map((row) => row.definitionSha256) }),
      releaseCounts.definitions,
      releaseCounts.resources,
      JSON.stringify({
        contract: R555_ASPHALT_CANONICAL_CONTRACT,
        masterSha256: MASTER_SHA256,
        predecessorReleaseId,
        predecessorSearchReleaseId,
        sourceCorpusSha256: R555_ASPHALT_CORPUS_SHA256,
        lineage,
        localDisposable: true,
        productionEligible: false,
        activeReleaseSwitched: false,
        searchCutover: false,
      }),
      predecessorReleaseId,
      sha256({ contract: R555_ASPHALT_CANONICAL_CONTRACT, sourceTree, definitions }),
      releaseCounts.parameters,
      releaseCounts.formulas,
    ]);
    await client.query(`insert into public.estimate_cumulative_manifest_entry(
      release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,publication_state,
      approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,entry_sha256,runtime_publication_state
    ) select $1,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,publication_state,
      approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,
      encode(extensions.digest(convert_to($2||':'||catalog_id||':'||entry_sha256,'UTF8'),'sha256'),'hex'),runtime_publication_state
      from public.estimate_cumulative_manifest_entry where release_id=$3`, [releaseId, R555_ASPHALT_CANONICAL_CONTRACT, predecessorReleaseId]);
    for (const definition of definitions) {
      await insertDefinition({
        client,
        definition,
        definitionId: definitionIds.get(definition.catalogId)!,
        definitionVersion: nextDefinitionVersionByCatalog.get(definition.catalogId) ?? 1,
        baselineId: baselineIds.get(definition.catalogId)!,
        releaseId,
        sourceHead: head,
        sourceTree,
      });
    }

    await client.query(`insert into public.estimate_price_route(
      id,route_key,currency_code,region_code,priority,source_kind,metadata,active
    ) values($1,$2,'KGS','KG-B',1,'manual',$3::jsonb,true)`, [
      priceRouteId,
      `r555-asphalt-local-acceptance:${releaseId}`,
      JSON.stringify({
        contract: R555_ASPHALT_CANONICAL_CONTRACT,
        purpose: "LOCAL_ACCEPTANCE_PRICE_SCHEDULE_NOT_A_PRODUCTION_MARKET_CLAIM",
        regionRu: "Бишкек, Кыргызстан",
        localScheduleOwner: "R555_LOCAL_REVIEW_TENANT",
        productionEligible: false,
      }),
    ]);
    const resources = definitions.flatMap((definition) => definition.resources.map((resource) => ({ definition, resource })));
    for (const { definition, resource } of resources) {
      const definitionId = definitionIds.get(definition.catalogId)!;
      const resourceId = uuid(`${R555_ASPHALT_CANONICAL_CONTRACT}:resource:${definitionId}:${resource.rowId}`);
      await client.query(`insert into public.estimate_resource_price_route_binding(
        resource_spec_id,route_id,price_key,priority
      ) values($1,$2,$3,1)`, [resourceId, priceRouteId, resource.costOwnerId]);
    }
    const inheritedPrices = (await client.query(`select price_key,unit_id,unit_price::text,currency_code,source_row
      from public.estimate_price_snapshot_item where snapshot_id=$1 order by price_key,unit_id`, [predecessorPriceSnapshotId])).rows as Json[];
    const asphaltPrices = resources.map(({ resource }) => ({
      price_key: resource.costOwnerId,
      unit_id: resource.unitId,
      currency_code: "KGS",
      source_row: { ...priceFor(resource), effectiveDate: "2026-08-26", localAcceptanceOnly: true },
      unit_price: String(priceFor(resource).value),
    }));
    const pricePayload = [...inheritedPrices, ...asphaltPrices];
    await client.query(`insert into public.estimate_price_snapshot(
      id,route_id,snapshot_key,captured_at,valid_until,currency_code,payload_sha256,source_metadata
    ) values($1,$2,$3,$4,$5,'KGS',$6,$7::jsonb)`, [
      priceSnapshotId,
      priceRouteId,
      `r555-asphalt-local-review-2026-08-26:${sourceTree.slice(0, 12)}`,
      "2026-08-26T00:00:00+06:00",
      "2026-09-02T23:59:59+06:00",
      sha256(pricePayload),
      JSON.stringify({
        contract: R555_ASPHALT_CANONICAL_CONTRACT,
        regionRu: "Бишкек",
        effectiveDate: "2026-08-26",
        scheduleClass: "LOCAL_ACCEPTANCE_ONLY",
        inheritedSnapshotId: predecessorPriceSnapshotId,
        productionMarketClaim: false,
      }),
    ]);
    for (const row of pricePayload) {
      await client.query(`insert into public.estimate_price_snapshot_item(
        snapshot_id,price_key,unit_id,unit_price,currency_code,source_row
      ) values($1,$2,$3,$4,$5,$6::jsonb)`, [
        priceSnapshotId,
        row.price_key,
        row.unit_id,
        row.unit_price,
        row.currency_code,
        JSON.stringify(row.source_row),
      ]);
    }

    await client.query(`insert into public.estimate_search_index_release(
      id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,
      source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata,created_at
    ) values($1,$2,'draft',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,now())`, [
      searchReleaseId,
      `r555-asphalt-${sourceTree.slice(0, 12)}`,
      predecessorSearch.taxonomy_version,
      predecessorSearch.group_relation_version,
      predecessorSearch.ranking_contract_version,
      head,
      searchSourceTree,
      sha256({ contract: R555_ASPHALT_CANONICAL_CONTRACT, predecessor: predecessorSearch.snapshot_sha256, releaseId, lineage }),
      Number(predecessorSearch.global_count) + 55,
      Number(predecessorSearch.external_count) + 8,
      Number(predecessorSearch.discovered_count) + 63,
      JSON.stringify({
        contract: R555_ASPHALT_CANONICAL_CONTRACT,
        parentSearchReleaseId: predecessorSearchReleaseId,
        parent_search_release_id: predecessorSearchReleaseId,
        definitionReleaseId: releaseId,
        canonicalSourceTreeSha256: sourceTree,
        sourceCorpusSha256: R555_ASPHALT_CORPUS_SHA256,
        lineage,
        localDisposable: true,
        productionEligible: false,
        activationAllowed: false,
      }),
    ]);
    await client.query(`insert into public.estimate_search_group(
      search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
      breadcrumb,member_count,member_set_sha256,oracle_disposition
    ) select $1,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
      breadcrumb,member_count,member_set_sha256,oracle_disposition
      from public.estimate_search_group where search_release_id=$2`, [searchReleaseId, predecessorSearchReleaseId]);
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
      document.catalog_origin,case when manifest.definition_version_id is null then document.definition_release_id else $2::uuid end,
      document.short_scope_ru,document.key_distinguishing_parameters,document.required_inputs_count,
      document.clarification_fields,document.included_boundaries,document.excluded_boundaries,
      document.replacement_catalog_id,document.normalized_catalog_id,document.normalized_canonical_name,
      document.normalized_aliases,document.normalized_search_terms,document.normalized_search_blob,
      document.source_provenance||jsonb_build_object('r555AsphaltSearchSnapshotId',($1::uuid)::text),
      encode(extensions.digest(convert_to(($1::uuid)::text||':'||document.catalog_id||':'||document.document_sha256||':'||coalesce(manifest.definition_version_id::text,''),'UTF8'),'sha256'),'hex'),
      document.adjudication_class,document.selectable,document.canonical_target_catalog_id,
      coalesce(manifest.definition_version_id,document.definition_version_id)
      from public.estimate_search_document document
      left join public.estimate_cumulative_manifest_entry manifest
        on manifest.release_id=$2 and manifest.catalog_id=document.catalog_id
      where document.search_release_id=$3`, [searchReleaseId, releaseId, predecessorSearchReleaseId]);
    await client.query(`insert into public.estimate_search_group_membership(
      search_release_id,group_id,catalog_id,ordinal,independent_disposition
    ) select $1,group_id,catalog_id,ordinal,independent_disposition
      from public.estimate_search_group_membership where search_release_id=$2`, [searchReleaseId, predecessorSearchReleaseId]);
    await client.query(`insert into public.estimate_search_clarification_question
      select $1,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,answer_type,unit_id,
        allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence
      from public.estimate_search_clarification_question where search_release_id=$2`, [searchReleaseId, predecessorSearchReleaseId]);
    await client.query(`insert into public.estimate_search_typed_relation
      select $1,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
        applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256
      from public.estimate_search_typed_relation where search_release_id=$2`, [searchReleaseId, predecessorSearchReleaseId]);

    for (const id of ["r555_asphalt_roadworks", "r555_asphalt_demolition"]) {
      const members = records.filter((record) => groupId(definitionByOwner.get(record.canonical_technology_id!)!) === id)
        .map((record) => record.catalog_id).sort();
      await client.query(`insert into public.estimate_search_group(
        search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
        breadcrumb,member_count,member_set_sha256,oracle_disposition
      ) values($1,$2,$3,'roadworks','roads','asphalt_pavement',$4,$4,$5::jsonb,$6,$7,$8::jsonb)`, [
        searchReleaseId,
        id,
        groupNameRu(id),
        id === "r555_asphalt_demolition" ? "asphalt_demolition" : "asphalt_roadworks",
        JSON.stringify(["Дорожные работы", groupNameRu(id)]),
        members.length,
        sha256(members),
        JSON.stringify({ contract: R555_ASPHALT_CANONICAL_CONTRACT, disposition: "EXACT_TYPED_GROUP", memberCatalogIds: members }),
      ]);
    }
    const groupOrdinals = new Map<string, number>();
    for (const record of records) {
      const target = definitionByOwner.get(record.canonical_technology_id!)!;
      const definitionId = definitionIds.get(target.catalogId)!;
      const isTarget = record.catalog_id === target.catalogId;
      const aliases = isTarget
        ? target.aliasesRu
        : [...new Set([record.name_ru, target.titleRu, ...target.aliasesRu])];
      const normalizedAliases = [...new Set(aliases.map(r555AsphaltNormalizedSearchText))].filter(Boolean).sort();
      const terms = normalizedTerms([record.name_ru, target.titleRu, ...aliases]);
      const group = groupId(target);
      const provenance = {
        contract: R555_ASPHALT_CANONICAL_CONTRACT,
        sourceCorpusSha256: R555_ASPHALT_CORPUS_SHA256,
        sourceCatalogRecordId: record.catalog_id,
        sourceCatalog: record.source_catalog,
        sourceIdentity: record.candidate_id,
        canonicalTechnologyId: record.canonical_technology_id,
        canonicalDefinitionCatalogId: target.catalogId,
        canonicalDefinitionVersionId: definitionId,
        definitionReleaseId: releaseId,
        searchReleaseId,
        disposition: isTarget ? "EFFECTIVE_WORK" : "ALIAS_REDIRECT",
        redirectCatalogId: isTarget ? null : target.catalogId,
        tombstone: false,
        parameterCount: target.parameters.length,
        resourceCount: target.resources.length,
        formulaCount: target.formulas.length,
      };
      const documentCore = {
        catalogId: record.catalog_id,
        targetCatalogId: target.catalogId,
        canonicalNameRu: record.name_ru,
        aliases,
        terms,
        provenance,
      };
      await client.query(`insert into public.estimate_search_document(
        search_release_id,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,group_id,subgroup_id,
        element_type,operation_kind,technology_variant,construction_state,primary_uom,canonical_name_ru,aliases,
        normative_classifiers,applicability_tags,publication_state,catalog_origin,definition_release_id,short_scope_ru,
        key_distinguishing_parameters,required_inputs_count,clarification_fields,included_boundaries,excluded_boundaries,
        replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,normalized_aliases,normalized_search_terms,
        normalized_search_blob,source_provenance,document_sha256,adjudication_class,selectable,
        canonical_target_catalog_id,definition_version_id
      ) values($1,$2,'roadworks','roads','asphalt_pavement',$3,$3,$4,null,'WORK',$5,
        'Каноническая технология асфальтобетонных работ','EXISTING_OR_NEW','m2',$6,$7::text[],
        $8::text[],$9::text[],'ADMITTED_BACKEND',$10,$11,$12,$13::jsonb,$14,$15::jsonb,$16::jsonb,$17::jsonb,
        null,$18,$19,$20::text[],$21::text[],$22,$23::jsonb,$24,$25,$26,$27,$28)`, [
        searchReleaseId,
        record.catalog_id,
        record.canonical_technology_id,
        group,
        target.operationKind,
        record.name_ru,
        aliases,
        ["КРЕР-2015, сборник 27", "ГОСТ 9128-2013", "ТР ТС 014/2011"],
        ["Кыргызстан", "асфальтобетон", target.operationKind === "DEMOLITION" ? "демонтаж" : "дорожное покрытие"],
        record.source_catalog === "BUILT_IN_AI_1000" ? "EXTERNAL_D" : "GLOBAL",
        releaseId,
        `${target.titleRu}. Выбор ведёт к единственному каноническому компилятору и технологическому BOQ.`,
        JSON.stringify(target.parameters.slice(0, 12).map((parameter) => parameter.titleRu)),
        target.parameters.filter((parameter) => parameter.required).length,
        JSON.stringify([]),
        JSON.stringify(target.applicability.includedScopeRu ?? []),
        JSON.stringify(target.applicability.excludedScopeRu ?? []),
        r555AsphaltNormalizedSearchText(record.catalog_id),
        r555AsphaltNormalizedSearchText(record.name_ru),
        normalizedAliases,
        terms,
        terms.join(" "),
        JSON.stringify(provenance),
        sha256(documentCore),
        isTarget ? "EFFECTIVE_WORK" : "ALIAS",
        isTarget,
        isTarget ? null : target.catalogId,
        definitionId,
      ]);
      const ordinal = groupOrdinals.get(group) ?? 0;
      groupOrdinals.set(group, ordinal + 1);
      await client.query(`insert into public.estimate_search_group_membership(
        search_release_id,group_id,catalog_id,ordinal,independent_disposition
      ) values($1,$2,$3,$4,$5::jsonb)`, [
        searchReleaseId,
        group,
        record.catalog_id,
        ordinal,
        JSON.stringify({
          contract: R555_ASPHALT_CANONICAL_CONTRACT,
          classification: record.classification,
          canonicalTargetCatalogId: isTarget ? null : target.catalogId,
          exactTypedIdentity: true,
        }),
      ]);
    }

    await client.query(`insert into public.estimate_candidate_capability_r3(
      id,environment,tenant_id,release_id,search_release_id,expires_at,purpose,source_head,source_tree,issued_by
    ) values($1,'r555-web80-real-auth',$2,$3,$4,$5,'estimate_candidate_admission_r3',$6,$7,$8)`, [
      capabilityId,
      CONSUMER_TENANT_ID,
      releaseId,
      searchReleaseId,
      new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
      head,
      sourceTree,
      "prepareR555AsphaltCanonicalSuccessor",
    ]);
    await client.query(`update public.estimate_definition_release set status='prepared',sealed_at=now()
      where id=$1 and status='draft' and sealed_at is null`, [releaseId]);

    const measured = (await client.query(`select
      (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1) manifest_count,
      (select count(*)::int from public.estimate_definition_version where release_id=$1) changed_definition_count,
      (select count(*)::int from public.estimate_parameter_definition parameter join public.estimate_definition_version definition
        on definition.id=parameter.definition_version_id where definition.release_id=$1) changed_parameter_count,
      (select count(*)::int from public.estimate_formula_graph formula join public.estimate_definition_version definition
        on definition.id=formula.definition_version_id where definition.release_id=$1) changed_formula_count,
      (select count(*)::int from public.estimate_resource_spec resource join public.estimate_definition_version definition
        on definition.id=resource.definition_version_id where definition.release_id=$1) changed_resource_count,
      (select count(*)::int from public.estimate_search_document where search_release_id=$2) search_documents,
      (select count(*)::int from public.estimate_search_document where search_release_id=$2
        and source_provenance->>'contract'=$3) asphalt_search_documents,
      (select count(*)::int from public.estimate_search_document where search_release_id=$2
        and source_provenance->>'contract'=$3 and adjudication_class='EFFECTIVE_WORK' and selectable) asphalt_selectable_targets,
      (select count(*)::int from public.estimate_search_document where search_release_id=$2
        and source_provenance->>'contract'=$3 and adjudication_class='ALIAS' and not selectable) asphalt_aliases,
      (select count(*)::int from public.estimate_price_snapshot_item where snapshot_id=$4) price_items,
      (select count(*)::int from public.estimate_definition_version where release_id=$1
        and content_status='CANDIDATE_READY' and content_gate_status='GREEN') green_definition_count
    `, [releaseId, searchReleaseId, R555_ASPHALT_CANONICAL_CONTRACT, priceSnapshotId])).rows[0] as Json;
    invariant(Number(measured.manifest_count) === releaseCounts.definitions, `MANIFEST_COUNT:${measured.manifest_count}:${releaseCounts.definitions}`);
    invariant(Number(measured.changed_definition_count) === 44, `DEFINITION_COUNT:${measured.changed_definition_count}`);
    invariant(Number(measured.changed_parameter_count) === 1572, `PARAMETER_COUNT:${measured.changed_parameter_count}`);
    invariant(Number(measured.changed_formula_count) === 1300, `FORMULA_COUNT:${measured.changed_formula_count}`);
    invariant(Number(measured.changed_resource_count) === 1300, `RESOURCE_COUNT:${measured.changed_resource_count}`);
    invariant(Number(measured.search_documents) === predecessorSearchDocumentCount + 63, `SEARCH_DOCUMENTS:${measured.search_documents}`);
    invariant(Number(measured.asphalt_search_documents) === 63, `ASPHALT_SEARCH_DOCUMENTS:${measured.asphalt_search_documents}`);
    invariant(Number(measured.asphalt_selectable_targets) === 44, `ASPHALT_TARGETS:${measured.asphalt_selectable_targets}`);
    invariant(Number(measured.asphalt_aliases) === 19, `ASPHALT_ALIASES:${measured.asphalt_aliases}`);
    invariant(Number(measured.price_items) === inheritedPrices.length + 1300, `PRICE_ITEMS:${measured.price_items}`);
    invariant(Number(measured.green_definition_count) === 44, `GREEN_DEFINITIONS:${measured.green_definition_count}`);

    if (APPLY) await client.query("commit"); else await client.query("rollback");
    const activeAfter = {
      definition: (await client.query("select id::text from public.estimate_definition_release where status='active'")).rows.map((row) => row.id),
      search: (await client.query("select id::text from public.estimate_search_index_release where status='active'")).rows.map((row) => row.id),
    };
    invariant(JSON.stringify(activeAfter) === JSON.stringify(activeBefore), "ACTIVE_RELEASE_CHANGED");
    receipt = {
      schema_version: R555_ASPHALT_CANONICAL_CONTRACT,
      generated_utc: new Date().toISOString(),
      mode: APPLY ? "APPLY" : "DRY_RUN_ROLLED_BACK",
      status: APPLY
        ? "GREEN_LOCAL_ASPHALT_CANONICAL_SUCCESSOR_PREPARED_NOT_ACTIVE"
        : "GREEN_DRY_RUN_ROLLED_BACK_NO_PERSISTED_WRITES",
      master_sha256: MASTER_SHA256,
      branch,
      source_head: head,
      source_tree: sourceTree,
      source_corpus_sha256: R555_ASPHALT_CORPUS_SHA256,
      predecessor_release_id: predecessorReleaseId,
      predecessor_search_release_id: predecessorSearchReleaseId,
      candidate_release_id: releaseId,
      candidate_release_key: releaseKey,
      candidate_search_release_id: searchReleaseId,
      price_snapshot_id: priceSnapshotId,
      price_snapshot_class: "LOCAL_ACCEPTANCE_ONLY_NOT_PRODUCTION_MARKET_CLAIM",
      capability_id: capabilityId,
      consumer_tenant_id: CONSUMER_TENANT_ID,
      lineage,
      effective_release_counts: releaseCounts,
      measured,
      mandatory_queries: [
        "асф", "асфа", "асфальт", "асфальтобетон", "дорожное покрытие", "парковка",
        "демонтаж асфальта", "фрезерование", "ямочный ремонт",
      ],
      active_before: activeBefore,
      active_after: activeAfter,
      active_changed: false,
      runtime_switched: false,
      production_accessed: false,
      deployed: false,
      merged: false,
      released: false,
      ota: false,
      secrets_captured: false,
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
  atomicJson(OUTPUT, { ...receipt!, payload_sha256: sha256(receipt) });
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
