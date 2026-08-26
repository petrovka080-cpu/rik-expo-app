import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { canonicalEstimateStableJson } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";
import {
  R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS,
  compileR41SurfaceDefinitionRows,
  r41SurfaceContentSha256,
  r41SurfaceDefinitionSha256,
  type R41SurfaceDefinition,
} from "./r41OfficialAndroidSurfaceDefinitions";

type Json = Record<string, any>;

const MASTER_SHA256 = "bd26ab611f4ea0a63657b664e2a674d317a454da579d71895a766a9bcd943333";
const PARENT_EVIDENCE = resolve(
  ".release-runtime/real-useful-estimates-r4/evidence/current-green/17_OFFICIAL_SURFACE_AGGREGATE_CANDIDATE_R41.json",
);
const SUPERSEDED_EVIDENCE = resolve(
  ".release-runtime/real-useful-estimates-r4/evidence/current-green/18_OFFICIAL_ANDROID_SURFACE_CANDIDATE_R41.json",
);
const OUTPUT = resolve(
  ".release-runtime/real-useful-estimates-r4/evidence/current-green/19_OFFICIAL_ANDROID_SURFACE_BASELINE_SUCCESSOR_R41.json",
);
const DATABASE_URL = process.env.R41_ANDROID_SURFACE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const ALLOWED_DATABASE_URL_RE = /^postgresql:\/\/postgres@127\.0\.0\.1:55432\/rik_r4_runtime_b5_v2$/u;
const APPLY = process.argv.includes("--apply");
const CONTRACT = "r4.1-official-android-surface-port.v2";
const DEFINITION_VERSION = 2;
const CAPABILITY_ENVIRONMENT = "r41d11-official-android-surface";
const TENANT_ID = "22222222-2222-4222-8222-222222222222";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: unknown): string {
  return createHash("sha256").update(
    typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : canonicalEstimateStableJson(value),
  ).digest("hex");
}

function deterministicUuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function normalizeSearch(value: string): string {
  return value.toLocaleLowerCase("ru-RU")
    .replace(/ё/gu, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function parameterTruthMetadata(
  definition: R41SurfaceDefinition,
  parameterId: string,
  contentSha256: string,
): Json {
  return {
    semantic_parameter_key: parameterId,
    visibility_role: "USER_INPUT",
    value_source_role: "USER_MEASURED",
    formula_consumers: compileR41SurfaceDefinitionRows(definition)
      .filter((row) => row.inputParameterIds.includes(parameterId))
      .map((row) => row.formulaId),
    resource_branch_consumers: compileR41SurfaceDefinitionRows(definition)
      .filter((row) => row.inputParameterIds.includes(parameterId))
      .map((row) => row.rowId),
    guide: {
      guide_short_ru: `Введите измеренное или подтверждённое проектом значение «${definition.parameters.find((item) => item.parameterId === parameterId)?.titleRu}».`,
      guide_kind: "MEASUREMENT_RULE",
      source_role: "USER_MEASUREMENT_OR_PROJECT",
      guide_version: CONTRACT,
      source_snapshot_hash: contentSha256,
      applicability: definition.shortScopeRu,
      verified_at: "2026-08-23T00:00:00+06:00",
    },
  };
}

function contentPassport(definition: R41SurfaceDefinition, sourceHead: string, sourceTree: string): Json {
  const rows = compileR41SurfaceDefinitionRows(definition);
  const payload = {
    contract: "real-professional-estimates-r3.content-passport.v1",
    allowed: true,
    status: "GREEN",
    portContract: CONTRACT,
    definitionSha256: r41SurfaceDefinitionSha256(definition),
    rowIds: rows.map((row) => row.rowId),
    sourceHead,
    sourceTree,
  };
  return {
    contractVersion: "real-professional-estimates-r3.content-passport.v1",
    identityMode: "WORK",
    physicalResultRu: definition.shortScopeRu,
    includedScopeRu: definition.includedBoundaries,
    excludedScopeRu: definition.excludedBoundaries,
    capabilityMatrix: [
      { surface: "backend", supported: true },
      { surface: "web", supported: true },
      { surface: "android_api34", supported: true },
      { artifact: "pdf_procurement", supported: true },
    ],
    parameterCount: definition.parameters.length,
    formulaCount: rows.length,
    resourceCount: rows.length,
    decision: payload,
    payloadSha256: sha256(payload),
  };
}

async function counts(
  client: Client,
  releaseId: string,
  searchReleaseId: string,
): Promise<Json> {
  return (await client.query(`
    select
      (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1) manifest_entries,
      (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1
        and baseline_ready and scenario_ready and approved_template_baseline_id is not null
        and runtime_publication_state='CANDIDATE') manifest_ready,
      (select count(*)::int from public.estimate_definition_version where release_id=$1) direct_definitions,
      (select count(*)::int from public.estimate_parameter_definition parameter
        join public.estimate_definition_version definition on definition.id=parameter.definition_version_id
        where definition.release_id=$1) direct_parameters,
      (select count(*)::int from public.estimate_formula_graph formula
        join public.estimate_definition_version definition on definition.id=formula.definition_version_id
        where definition.release_id=$1) direct_formulas,
      (select count(*)::int from public.estimate_resource_spec resource
        join public.estimate_definition_version definition on definition.id=resource.definition_version_id
        where definition.release_id=$1) direct_resources,
      (select count(*)::int from public.estimate_content_passport_r3 passport where passport.release_id=$1) direct_passports,
      (select count(*)::int from public.estimate_approved_template_baseline baseline
        where baseline.accepted_release_id=$1) direct_baselines,
      (select count(*)::int from public.estimate_search_document where search_release_id=$2) search_documents,
      (select count(*)::int from public.estimate_search_document where search_release_id=$2 and selectable) selectable_documents,
      (select count(*)::int from public.estimate_search_document where search_release_id=$2 and catalog_origin<>'GLOBAL') external_documents,
      (select count(*)::int from public.estimate_search_group where search_release_id=$2) search_groups,
      (select count(*)::int from public.estimate_search_group_membership where search_release_id=$2) memberships
  `, [releaseId, searchReleaseId])).rows[0] as Json;
}

async function prepareNewCandidate(input: {
  client: Client;
  parentReleaseId: string;
  parentSearchReleaseId: string;
  releaseId: string;
  releaseKey: string;
  searchReleaseId: string;
  searchReleaseKey: string;
  sourceHead: string;
  sourceTree: string;
  candidateIdentity: string;
  contentSha256: string;
  parent: Json;
  supersededReleaseId: string;
}): Promise<void> {
  const {
    client, parentReleaseId, parentSearchReleaseId, releaseId, releaseKey,
    searchReleaseId, searchReleaseKey, sourceHead, sourceTree, candidateIdentity,
    contentSha256, parent,
  } = input;
  const compiled = R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS.map((definition) => ({
    definition,
    definitionId: deterministicUuid(`${releaseId}:${definition.catalogId}:definition:v${DEFINITION_VERSION}`),
    baselineId: deterministicUuid(`${releaseId}:${definition.catalogId}:approved-baseline:v1`),
    definitionSha256: r41SurfaceDefinitionSha256(definition),
    rows: compileR41SurfaceDefinitionRows(definition),
    passport: contentPassport(definition, sourceHead, sourceTree),
  }));
  const directParameterCount = compiled.reduce((sum, item) => sum + item.definition.parameters.length, 0);
  const directRowCount = compiled.reduce((sum, item) => sum + item.rows.length, 0);
  const parentCounts = parent.counts as Json;
  const parentModelCounts = parent.modelCounts as Json;

  await client.query(`
    insert into public.estimate_definition_release(
      id,release_key,schema_version,status,source_commit,source_tree,
      source_manifest_sha256,definition_count,resource_row_count,metadata,
      parent_release_id,source_package_sha256,parameter_count,formula_count
    ) values($1,$2,6,'draft',$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12)
  `, [
    releaseId, releaseKey, sourceHead, sourceTree, candidateIdentity,
    Number(parentModelCounts.definitions) + compiled.length,
    Number(parentModelCounts.resources) + directRowCount,
    JSON.stringify({
      contract: CONTRACT,
      masterSha256: MASTER_SHA256,
      parentReleaseId,
      parentSearchReleaseId,
      surfaceContentSha256: contentSha256,
      supersedesPreparedCandidateReleaseId: input.supersededReleaseId,
      localDisposable: true,
      activationAllowed: false,
      compilerOwner: "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
      dataOwner: "scripts/estimate/r4/r41OfficialAndroidSurfaceDefinitions.ts",
    }),
    parentReleaseId,
    sha256(`${candidateIdentity}:package`),
    Number(parentModelCounts.parameters) + directParameterCount,
    Number(parentModelCounts.formulas) + directRowCount,
  ]);

  await client.query(`
    insert into public.estimate_search_index_release(
      id,release_key,status,taxonomy_version,group_relation_version,
      ranking_contract_version,source_commit,source_tree,snapshot_sha256,
      global_count,external_count,discovered_count,metadata
    ) values($1,$2,'draft','r4.1-global-android-surface','r4.1-global-android-surface',
      'server-owned-r58',$3,$4,$5,$6,$7,0,$8::jsonb)
  `, [
    searchReleaseId, searchReleaseKey, sourceHead, sourceTree,
    sha256(`${candidateIdentity}:search`),
    Number(parentCounts.selectable_documents) + compiled.length,
    Number(parentCounts.external_documents),
    JSON.stringify({
      contract: CONTRACT,
      masterSha256: MASTER_SHA256,
      parentSearchReleaseId,
      surfaceContentSha256: contentSha256,
      localDisposable: true,
    }),
  ]);

  await client.query(`
    insert into public.estimate_cumulative_manifest_entry(
      release_id,catalog_id,definition_version_id,source_batch,source_release_id,
      domain_id,publication_state,approved_template_baseline_id,baseline_ready,
      scenario_ready,definition_hash,entry_sha256,runtime_publication_state
    ) select $1::uuid,catalog_id,definition_version_id,source_batch,source_release_id,
      domain_id,publication_state,approved_template_baseline_id,baseline_ready,
      scenario_ready,definition_hash,
      encode(extensions.digest(convert_to(concat_ws('|',$1::uuid::text,catalog_id,
        definition_version_id::text,entry_sha256),'UTF8'),'sha256'),'hex'),
      'CANDIDATE'
    from public.estimate_cumulative_manifest_entry where release_id=$2::uuid
  `, [releaseId, parentReleaseId]);

  await client.query(`
    insert into public.estimate_search_group(
      search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,
      assembly_id,work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
    ) select $1,group_id,group_name_ru,domain_id,system_id,subsystem_id,
      assembly_id,work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
    from public.estimate_search_group where search_release_id=$2
  `, [searchReleaseId, parentSearchReleaseId]);
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
    ) select $1,catalog_id,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,group_id,subgroup_id,element_type,operation_kind,
      technology_variant,construction_state,primary_uom,canonical_name_ru,aliases,
      normative_classifiers,applicability_tags,publication_state,catalog_origin,
      definition_release_id,short_scope_ru,key_distinguishing_parameters,
      required_inputs_count,clarification_fields,included_boundaries,excluded_boundaries,
      replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,
      normalized_aliases,normalized_search_terms,normalized_search_blob,
      source_provenance,document_sha256,adjudication_class,selectable,
      canonical_target_catalog_id,definition_version_id
    from public.estimate_search_document where search_release_id=$2
  `, [searchReleaseId, parentSearchReleaseId]);
  await client.query(`
    insert into public.estimate_search_group_membership(
      search_release_id,group_id,catalog_id,ordinal,independent_disposition
    ) select $1,group_id,catalog_id,ordinal,independent_disposition
    from public.estimate_search_group_membership where search_release_id=$2
  `, [searchReleaseId, parentSearchReleaseId]);
  await client.query(`
    insert into public.estimate_search_typed_relation(
      search_release_id,source_catalog_id,target_catalog_id,relationship_type,direction,
      source_locator,applicability_predicate,required_when,mutually_exclusive_with,
      explanation_ru,relation_sha256
    ) select $1,source_catalog_id,target_catalog_id,relationship_type,direction,
      source_locator,applicability_predicate,required_when,mutually_exclusive_with,
      explanation_ru,relation_sha256
    from public.estimate_search_typed_relation where search_release_id=$2
  `, [searchReleaseId, parentSearchReleaseId]);

  for (const item of compiled) {
    const { definition, definitionId, baselineId, definitionSha256, rows, passport } = item;
    const sourceMetadata = {
      contract: CONTRACT,
      domain: definition.domain,
      family: definition.workFamilyId,
      operation: definition.operationKind,
      variant: "official_surface_v1",
      sourceIdentity: contentSha256,
      sourceManifestSha256: candidateIdentity,
      contentPassportIdentity: passport.payloadSha256,
      portedFrom: [
        "src/lib/ai/professionalBoq/compileDynamicProfessionalBoq.ts",
        "src/lib/ai/estimateCompiler/expandedEstimateCompiler.ts",
      ],
      compilerOwner: "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
      frontendCompilerReachable: false,
    };
    await client.query(`
      insert into public.estimate_work_identity(
        catalog_id,namespace,domain,source_identity,work_key,title_ru,denominator_eligible
      ) values($1,'global',$2,$3,$4,$5,true)
      on conflict(catalog_id) do nothing
    `, [
      definition.catalogId,
      definition.domain,
      `${contentSha256}:${definition.catalogId}`,
      definition.workKey,
      definition.titleRu,
    ]);
    const identity = (await client.query(`
      select domain,work_key,title_ru from public.estimate_work_identity where catalog_id=$1
    `, [definition.catalogId])).rows[0] as Json | undefined;
    invariant(identity?.domain === definition.domain
      && identity?.work_key === definition.workKey
      && identity?.title_ru === definition.titleRu,
    `R41_ANDROID_SURFACE_WORK_IDENTITY_DRIFT:${definition.catalogId}`);
    await client.query(`
      insert into public.estimate_definition_version(
        id,release_id,catalog_id,definition_version,passport,applicability,
        definition_sha256,source_metadata,content_status,content_gate_status
      ) values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::jsonb,'QUARANTINED','RED')
    `, [
      definitionId, releaseId, definition.catalogId, DEFINITION_VERSION,
      JSON.stringify({
        passportVersion: CONTRACT,
        physicalResultRu: definition.shortScopeRu,
        includedScopeRu: definition.includedBoundaries,
        excludedScopeRu: definition.excludedBoundaries,
      }),
      JSON.stringify({ surface: "android_api34", candidateOnly: true }),
      definitionSha256,
      JSON.stringify(sourceMetadata),
    ]);

    for (const [ordinal, source] of definition.parameters.entries()) {
      await client.query(`
        insert into public.estimate_parameter_definition(
          definition_version_id,parameter_id,ordinal,value_type,unit_id,title_ru,
          required,default_value,constraints_json,truth_metadata
        ) values($1,$2,$3,$4,$5,$6,true,null,$7::jsonb,$8::jsonb)
      `, [
        definitionId, source.parameterId, ordinal, source.valueType, source.unitId,
        source.titleRu, JSON.stringify(source.constraints),
        JSON.stringify(parameterTruthMetadata(definition, source.parameterId, contentSha256)),
      ]);
    }
    for (const [ordinal, source] of rows.entries()) {
      await client.query(`
        insert into public.estimate_formula_graph(
          definition_version_id,formula_id,output_unit_id,expression_source,ast,
          input_parameter_ids,ast_sha256
        ) values($1,$2,$3,$4,$5::jsonb,$6::text[],$7)
      `, [
        definitionId, source.formulaId, source.unitId, source.quantityFormula,
        JSON.stringify(source.ast), source.inputParameterIds, source.astSha256,
      ]);
      await client.query(`
        insert into public.estimate_resource_spec(
          id,definition_version_id,row_id,ordinal,section,category,title_ru,row_type,
          unit_id,formula_id,inclusion_ast,resource_graph,semantic_owner,cost_owner_id,
          procurement_eligible,source_metadata,row_sha256
        ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          '{"kind":"literal","value":true}'::jsonb,$11::jsonb,$12,$13,$14,$15::jsonb,$16)
      `, [
        deterministicUuid(`${definitionId}:${source.rowId}:resource`),
        definitionId, source.rowId, ordinal, source.section, source.category,
        source.titleRu, source.rowType, source.unitId, source.formulaId,
        JSON.stringify({
          contract: CONTRACT,
          physicalRowType: source.rowType,
          quantityFormula: source.quantityFormula,
          referencePrice: {
            amount: source.referenceUnitPriceKgs,
            currencyCode: "KGS",
            priceDate: "2026-08-23",
            status: "LOCAL_CANDIDATE_REFERENCE",
          },
        }),
        `${definition.catalogId}:${source.rowId}`,
        `${definition.catalogId}:${source.rowId}:KGS`,
        source.procurementEligible,
        JSON.stringify({
          truth_contract_version: "R3",
          contract: CONTRACT,
          referenceUnitPriceKgs: source.referenceUnitPriceKgs,
          referencePriceDate: "2026-08-23",
          normativeTrace: [{
            source_id: "R41_OFFICIAL_SURFACE_PORT",
            applicability: source.normativeBasisRu,
            status: "LOCAL_CANDIDATE_ONLY",
          }],
        }),
        source.rowSha256,
      ]);
    }

    const parameterSchemaSha256 = sha256(definition.parameters.map((parameter, ordinal) => ({
      parameterId: parameter.parameterId,
      ordinal,
      valueType: parameter.valueType,
      unitId: parameter.unitId,
      titleRu: parameter.titleRu,
      required: true,
      constraints: parameter.constraints,
    })));
    const baselineValues = Object.fromEntries(definition.parameters.map((parameter) => [
      parameter.parameterId,
      parameter.baselineValue,
    ]));
    const formulaConsumers = Object.fromEntries(definition.parameters.map((parameter) => [
      parameter.parameterId,
      rows.filter((row) => row.inputParameterIds.includes(parameter.parameterId)).map((row) => row.formulaId),
    ]));
    const resourceConsumers = Object.fromEntries(definition.parameters.map((parameter) => [
      parameter.parameterId,
      rows.filter((row) => row.inputParameterIds.includes(parameter.parameterId)).map((row) => row.rowId),
    ]));
    const uomByParameter = Object.fromEntries(definition.parameters.map((parameter) => [
      parameter.parameterId,
      parameter.unitId,
    ]));
    const inputClassification = Object.fromEntries(definition.parameters.map((parameter) => [
      parameter.parameterId,
      "ASSUMPTION",
    ]));
    const normativeSources = Object.fromEntries(definition.parameters.map((parameter) => [
      parameter.parameterId,
      [`R41_OFFICIAL_ANDROID_FIXED_CASE:${definition.catalogId}`],
    ]));
    const guideProvenanceRu = Object.fromEntries(definition.parameters.map((parameter) => [
      parameter.parameterId,
      `Проверьте и замените видимое базовое значение «${parameter.titleRu}: ${parameter.baselineValue} ${parameter.unitId}» фактическим измерением объекта.`,
    ]));
    const acceptanceEvidenceSha256 = sha256({
      contract: CONTRACT,
      definitionId,
      baselineValues,
      parameterSchemaSha256,
      formulaConsumers,
      resourceConsumers,
      contentSha256,
    });
    await client.query(`
      insert into public.estimate_approved_template_baseline(
        id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,
        parameter_schema_sha256,input_values,input_classification,uom_by_parameter,
        formula_consumer_ids,resource_consumer_row_ids,normative_source_ids,
        guide_provenance_ru,proposal_source_refs,validation_scenario_refs,
        acceptance_evidence_sha256,accepted_release_id,accepted_at,contract_version
      ) values($1,$2,$3,$4,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,
        $11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,$15,$16,
        '2026-08-23T00:00:00+06:00','APPROVED_TEMPLATE_BASELINE_R54_V1')
    `, [
      baselineId,
      `${releaseKey}:${definition.catalogId}:official-android-baseline`,
      definition.catalogId,
      definitionId,
      parameterSchemaSha256,
      JSON.stringify(baselineValues),
      JSON.stringify(inputClassification),
      JSON.stringify(uomByParameter),
      JSON.stringify(formulaConsumers),
      JSON.stringify(resourceConsumers),
      JSON.stringify(normativeSources),
      JSON.stringify(guideProvenanceRu),
      JSON.stringify([{
        contract: CONTRACT,
        source: "OFFICIAL_ANDROID_FIXED_CASE_R41",
        catalogId: definition.catalogId,
        contentSha256,
      }]),
      JSON.stringify([{
        contract: CONTRACT,
        case: definition.catalogId,
        validInputs: baselineValues,
        formulaCount: rows.length,
      }]),
      acceptanceEvidenceSha256,
      releaseId,
    ]);

    await client.query(`
      insert into public.estimate_content_passport_r3(
        definition_version_id,release_id,catalog_id,contract_version,identity_mode,
        redirect_catalog_id,physical_result_ru,included_scope_ru,excluded_scope_ru,
        capability_matrix,parameter_count,formula_count,resource_count,decision,
        payload_sha256,source_head,source_tree
      ) values($1,$2,$3,$4,'WORK',null,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11,
        $12::jsonb,$13,$14,$15)
    `, [
      definitionId, releaseId, definition.catalogId, passport.contractVersion,
      passport.physicalResultRu, JSON.stringify(passport.includedScopeRu),
      JSON.stringify(passport.excludedScopeRu), JSON.stringify(passport.capabilityMatrix),
      passport.parameterCount, passport.formulaCount, passport.resourceCount,
      JSON.stringify(passport.decision), passport.payloadSha256, sourceHead, sourceTree,
    ]);
    await client.query(`update public.estimate_definition_version
      set content_status='CANDIDATE_READY',content_gate_status='GREEN'
      where id=$1`, [definitionId]);
    await client.query(`
      insert into public.estimate_cumulative_manifest_entry(
        release_id,catalog_id,definition_version_id,source_batch,source_release_id,
        domain_id,publication_state,approved_template_baseline_id,baseline_ready,
        scenario_ready,definition_hash,entry_sha256,runtime_publication_state
      ) values($1,$2,$3,'R41-OFFICIAL-ANDROID-SURFACE-PORT',$1,$4,
        'CANONICAL_SUCCESSOR',$5,true,true,$6,$7,'CANDIDATE')
    `, [
      releaseId, definition.catalogId, definitionId, definition.domain,
      baselineId,
      definitionSha256,
      sha256({ releaseId, catalogId: definition.catalogId, definitionId, baselineId, definitionSha256, contentSha256 }),
    ]);

    const normalizedName = normalizeSearch(definition.titleRu);
    const normalizedAliases = definition.aliases.map(normalizeSearch);
    const searchTerms = [...new Set([normalizedName, ...normalizedAliases])];
    const documentPayload = {
      catalogId: definition.catalogId,
      definitionId,
      normalizedName,
      normalizedAliases,
      definitionSha256,
      contentSha256,
    };
    await client.query(`
      insert into public.estimate_search_group(
        search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,
        assembly_id,work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
      ) values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,1,$10,$11::jsonb)
    `, [
      searchReleaseId, definition.groupId, definition.groupNameRu, definition.domain,
      definition.systemId, definition.subsystemId, definition.assemblyId,
      definition.workFamilyId,
      JSON.stringify([definition.domain, definition.groupNameRu, definition.titleRu]),
      sha256(definition.catalogId),
      JSON.stringify({ decision: "CANONICAL_SURFACE_PORT", contract: CONTRACT, contentSha256 }),
    ]);
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
      ) values($1,$2,$3,$4,$5,$6,$7,$8,null,$9,$10,'official_surface_v1',
        'existing_or_project_confirmed',$11,$12,$13::text[],ARRAY['R41']::text[],
        ARRAY['android_api34','web']::text[],'ADMITTED_BACKEND','GLOBAL',$14,$15,
        $16::jsonb,$17,$18::jsonb,$19::jsonb,$20::jsonb,null,$21,$22,
        $23::text[],$24::text[],$25,$26::jsonb,$27,'EFFECTIVE_WORK',true,null,$28)
    `, [
      searchReleaseId, definition.catalogId, definition.domain, definition.systemId,
      definition.subsystemId, definition.assemblyId, definition.workFamilyId,
      definition.groupId, definition.elementType, definition.operationKind,
      definition.primaryUom, definition.titleRu, definition.aliases,
      releaseId, definition.shortScopeRu,
      JSON.stringify(definition.parameters.map((parameter) => ({
        parameterId: parameter.parameterId,
        titleRu: parameter.titleRu,
        unitId: parameter.unitId,
      }))),
      definition.parameters.length,
      JSON.stringify(definition.parameters.map((parameter) => ({
        parameterId: parameter.parameterId,
        questionRu: `Укажите ${parameter.titleRu.toLocaleLowerCase("ru-RU")}.`,
      }))),
      JSON.stringify(definition.includedBoundaries),
      JSON.stringify(definition.excludedBoundaries),
      normalizeSearch(definition.catalogId), normalizedName, normalizedAliases,
      searchTerms, searchTerms.join(" "),
      JSON.stringify({ contract: CONTRACT, contentSha256, masterSha256: MASTER_SHA256 }),
      sha256(documentPayload), definitionId,
    ]);
    await client.query(`
      insert into public.estimate_search_group_membership(
        search_release_id,group_id,catalog_id,ordinal,independent_disposition
      ) values($1,$2,$3,0,$4::jsonb)
    `, [
      searchReleaseId, definition.groupId, definition.catalogId,
      JSON.stringify({ decision: "CANONICAL_SURFACE_PORT", contract: CONTRACT }),
    ]);
  }

  await client.query(`update public.estimate_definition_release
    set status='prepared',sealed_at=now() where id=$1 and status='draft'`, [releaseId]);
}

async function main(): Promise<void> {
  invariant(ALLOWED_DATABASE_URL_RE.test(DATABASE_URL), "R41_ANDROID_SURFACE_NON_DISPOSABLE_DATABASE_DENIED");
  invariant(process.argv.length === 2 || (process.argv.length === 3 && APPLY),
    "R41_ANDROID_SURFACE_USAGE_ONLY_OPTIONAL_APPLY");
  const parent = JSON.parse(readFileSync(PARENT_EVIDENCE, "utf8")) as Json;
  invariant(parent.status === "GREEN_R41_OFFICIAL_SURFACE_AGGREGATE_CANDIDATE_PREPARED_NOT_ACTIVE",
    "R41_ANDROID_SURFACE_PARENT_STATUS_RED");
  invariant(parent.masterSha256 === MASTER_SHA256, "R41_ANDROID_SURFACE_PARENT_MASTER_DRIFT");
  invariant(parent.productionAccessed === false && parent.productionDeployed === false
    && parent.productionReleased === false, "R41_ANDROID_SURFACE_PARENT_SCOPE_RED");
  const superseded = JSON.parse(readFileSync(SUPERSEDED_EVIDENCE, "utf8")) as Json;
  invariant(superseded.status === "GREEN_R41_OFFICIAL_ANDROID_SURFACE_CANDIDATE_PREPARED_NOT_ACTIVE"
    && superseded.release?.id === "5dfa943e-b37f-500b-a4c5-4cafcef2e0b0"
    && superseded.release?.activationPerformed === false,
  "R41_ANDROID_SURFACE_SUPERSEDED_CANDIDATE_DRIFT");
  const sourceHead = git(["rev-parse", "HEAD"]);
  const sourceTree = git(["rev-parse", "HEAD^{tree}"]);
  const contentSha256 = r41SurfaceContentSha256();
  const parentReleaseId = String(parent.release.id);
  const parentSearchReleaseId = String(parent.searchRelease.id);
  const candidateIdentity = sha256({
    masterSha256: MASTER_SHA256,
    parentReleaseId,
    parentSearchReleaseId,
    parentIdentity: parent.aggregateIdentity,
    supersededPreparedCandidateReleaseId: superseded.release.id,
    contentSha256,
    sourceHead,
    sourceTree,
    contract: CONTRACT,
  });
  const releaseKey = `r41-official-android-surface-${candidateIdentity.slice(0, 12)}`;
  const searchReleaseKey = `${releaseKey}-search`;
  const releaseId = deterministicUuid(`definition:${releaseKey}:${candidateIdentity}`);
  const searchReleaseId = deterministicUuid(`search:${searchReleaseKey}:${candidateIdentity}`);
  const directParameterCount = R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS
    .reduce((sum, definition) => sum + definition.parameters.length, 0);
  const directRowCount = R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS
    .reduce((sum, definition) => sum + definition.rows.length, 0);
  const expected = {
    manifest_entries: Number(parent.counts.manifest_entries) + R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS.length,
    manifest_ready: Number(parent.counts.manifest_ready) + R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS.length,
    direct_definitions: R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS.length,
    direct_parameters: directParameterCount,
    direct_formulas: directRowCount,
    direct_resources: directRowCount,
    direct_passports: R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS.length,
    direct_baselines: R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS.length,
    search_documents: Number(parent.counts.search_documents) + R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS.length,
    selectable_documents: Number(parent.counts.selectable_documents) + R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS.length,
    external_documents: Number(parent.counts.external_documents),
    search_groups: Number(parent.counts.search_groups) + R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS.length,
    memberships: Number(parent.counts.memberships) + R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS.length,
  };

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: APPLY
      ? "r41-official-android-surface-apply"
      : "r41-official-android-surface-dry-run",
    statement_timeout: 120_000,
  });
  await client.connect();
  let evidence: Json;
  try {
    const activeReleaseCountBefore = Number((await client.query(
      "select count(*) count from public.estimate_definition_release where status='active'",
    )).rows[0].count);
    invariant(activeReleaseCountBefore === 0, "R41_ANDROID_SURFACE_ACTIVE_RELEASE_DRIFT");
    await client.query("begin");
    await client.query("set local lock_timeout='5s'");
    try {
      const parentBinding = (await client.query(`
        select definition.id definition_id,definition.status definition_status,
          search.id search_id,search.status search_status
        from public.estimate_definition_release definition
        join public.estimate_search_index_release search on search.id=$2
        where definition.id=$1
      `, [parentReleaseId, parentSearchReleaseId])).rows[0] as Json | undefined;
      invariant(parentBinding?.definition_status === "prepared"
        && parentBinding?.search_status === "draft", "R41_ANDROID_SURFACE_PARENT_BINDING_RED");
      const existing = (await client.query(
        "select id::text,status from public.estimate_definition_release where release_key=$1",
        [releaseKey],
      )).rows[0] as Json | undefined;
      if (!existing) {
        await prepareNewCandidate({
          client, parentReleaseId, parentSearchReleaseId, releaseId, releaseKey,
          searchReleaseId, searchReleaseKey, sourceHead, sourceTree, candidateIdentity,
          contentSha256, parent,
          supersededReleaseId: superseded.release.id,
        });
      } else {
        invariant(existing.id === releaseId && existing.status === "prepared",
          "R41_ANDROID_SURFACE_EXISTING_RELEASE_DRIFT");
      }

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
          ) values($1,$2,$3,$4,now()+interval '7 days','estimate_candidate_admission_r3',
            $5,$6,'prepareR41OfficialAndroidSurfaceCandidate') returning *
        `, [
          CAPABILITY_ENVIRONMENT, TENANT_ID, releaseId, searchReleaseId,
          sourceHead, sourceTree,
        ])).rows[0] as Json;
      }
      const actual = await counts(client, releaseId, searchReleaseId);
      for (const [key, value] of Object.entries(expected)) {
        invariant(Number(actual[key]) === Number(value),
          `R41_ANDROID_SURFACE_DENOMINATOR_RED:${key}:${actual[key]}:${value}`);
      }
      const admitted = Number((await client.query(`
        select count(*)::int count
        from public.estimate_definition_version definition
        join public.estimate_content_passport_r3 passport
          on passport.definition_version_id=definition.id
        where definition.release_id=$1 and definition.content_status='CANDIDATE_READY'
          and definition.content_gate_status='GREEN'
      `, [releaseId])).rows[0].count);
      invariant(admitted === R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS.length,
        "R41_ANDROID_SURFACE_CONTENT_ADMISSION_RED");
      const activeReleaseCountAfter = Number((await client.query(
        "select count(*) count from public.estimate_definition_release where status='active'",
      )).rows[0].count);
      invariant(activeReleaseCountAfter === activeReleaseCountBefore,
        "R41_ANDROID_SURFACE_ACTIVE_RELEASE_MUTATED");
      evidence = {
        schemaVersion: CONTRACT,
        capturedAt: new Date().toISOString(),
        status: APPLY
          ? "GREEN_R41_OFFICIAL_ANDROID_SURFACE_BASELINE_SUCCESSOR_PREPARED_NOT_ACTIVE"
          : "GREEN_R41_OFFICIAL_ANDROID_SURFACE_BASELINE_SUCCESSOR_DRY_RUN_ROLLED_BACK",
        masterSha256: MASTER_SHA256,
        database: new URL(DATABASE_URL).pathname.replace(/^\//u, ""),
        sourceHead,
        sourceTree,
        parent: {
          releaseId: parentReleaseId,
          searchReleaseId: parentSearchReleaseId,
          aggregateIdentity: parent.aggregateIdentity,
        },
        supersedesPreparedCandidate: {
          releaseId: superseded.release.id,
          searchReleaseId: superseded.searchRelease.id,
          reason: "CUMULATIVE_MANIFEST_APPROVED_BASELINE_REQUIRED",
          mutated: false,
        },
        candidateIdentity,
        contentSha256,
        definitions: R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS.map((definition) => ({
          catalogId: definition.catalogId,
          workKey: definition.workKey,
          titleRu: definition.titleRu,
          definitionSha256: r41SurfaceDefinitionSha256(definition),
          parameterCount: definition.parameters.length,
          formulaCount: definition.rows.length,
          resourceCount: definition.rows.length,
          aliases: definition.aliases,
        })),
        release: { id: releaseId, key: releaseKey, status: "prepared", activationPerformed: false },
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
        counts: actual,
        expected,
        writesApplied: APPLY,
        productionAccessed: false,
        productionDeployed: false,
        productionReleased: false,
        fallbackCreated: false,
        secondCompilerCreated: false,
        runtimeOwner: "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
        dataOwner: "scripts/estimate/r4/r41OfficialAndroidSurfaceDefinitions.ts",
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
  writeFileSync(OUTPUT, `${JSON.stringify(evidence!, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    status: evidence!.status,
    database: evidence!.database,
    release: evidence!.release,
    searchRelease: evidence!.searchRelease,
    capability: evidence!.capability,
    contentSha256: evidence!.contentSha256,
    definitions: evidence!.definitions,
    counts: evidence!.counts,
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
