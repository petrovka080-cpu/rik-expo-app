import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  ANCHOR_GROUP_PROJECT_SCHEDULE_NORM_ID,
  ANCHOR_GROUP_PROJECT_SCHEDULE_PRODUCT_PROFILE_ID,
  ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID,
  ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_METADATA,
} from "../../../src/lib/estimate/v4/anchorGroupInstallationR1";
import {
  ANCHOR_GROUP_INSTALLATION_FORMULAS,
  ANCHOR_GROUP_INSTALLATION_NORMATIVE_PARAMETER_IDS,
  ANCHOR_GROUP_INSTALLATION_PARAMETERS,
  ANCHOR_GROUP_INSTALLATION_RESOURCES,
  ANCHOR_GROUP_INSTALLATION_TARGETS,
  compileAnchorGroupInstallationR1,
  anchorGroupInstallationAcceptanceInputR1,
} from "../../../src/lib/estimate/v4/anchorGroupInstallationR1";
import {
  createCanonicalDefinitionClonePlan,
  preflightCanonicalDefinitionPublishPlans,
  publishCanonicalDefinitionDraft,
  resolveCanonicalApprovedBaselineLeaf,
} from "./canonicalDefinitionPublisherR1";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.anchor-group-installation-family.v2";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (10).md",
);
const MASTER_SHA256 = "d4b0af610619d877cc65d26534ce391d2c37e7d196a5feb03c20d4f81e298f01";
const PARENT_RELEASE_ID = "11b33e36-e42b-54e1-b177-91be7d2018cd";
const PARENT_SEARCH_RELEASE_ID = "99fd54a5-30c1-544a-84b4-883fa6b854de";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_ROOT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/anchor-group-installation-family-source-role-r2",
);
const RESIDUAL_SUMMARY_PATH = resolve(
  ".release-runtime/ai-estimate-real-professional-norm-packs/2026-09-17T05-52-01-470Z/candidate-summary.json",
);
const RESIDUAL_RECEIPT_SHA256 = "b8581dafc1cf6f99e9b0ad8a064570c687dc2e39b223b8053bcef0499d1538d2";
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const APPLY = process.argv.includes("--apply");
const CONTENT_PASSPORT_CONTRACT = "real-professional-estimates-r3.content-passport.v1";
const BASELINE_CONTRACT = "APPROVED_TEMPLATE_BASELINE_R54_V1";
const TARGETS = ANCHOR_GROUP_INSTALLATION_TARGETS;
const NORMATIVE_PARAMETER_IDS = new Set<string>(
  ANCHOR_GROUP_INSTALLATION_NORMATIVE_PARAMETER_IDS,
);
const SOURCE_PATHS = [
  "src/lib/estimate/v4/anchorGroupInstallationR1.ts",
  "tests/estimateNorms/anchorGroupInstallationR1.contract.test.ts",
  "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
  "scripts/estimate/r4a13/prepareAnchorGroupInstallationFamilySuccessor.ts",
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
    .update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(stable(value)))
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
  return value.toLocaleLowerCase("ru-RU").replace(/ё/gu, "е")
    .replace(/[^0-9a-zа-я]+/gu, " ").trim();
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function resourceRowType(category: string): string {
  if (category === "construction_work") return "labor";
  if (category === "delivery") return "service";
  return category;
}

function exactDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `STOP_ANCHOR_GROUP_INSTALLATION_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_ANCHOR_GROUP_INSTALLATION_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
}

async function verifyThroughExistingCore(): Promise<Json> {
  const targetResults: Json[] = [];
  for (const target of TARGETS) {
    const fixture = anchorGroupInstallationAcceptanceInputR1(target.contextKey);
    const compiled = await compileAnchorGroupInstallationR1(
      { ...fixture },
      { catalogId: target.catalogId },
    );
    const anchors = compiled.rows.find(
      (row) => row.row_id === "material:anchor-group:anchor-bolts",
    );
    invariant(compiled.preliminaryNeeds.length === 0,
      `STOP_ANCHOR_GROUP_INSTALLATION_CORE_PRELIMINARY:${target.contextKey}`);
    invariant(Number(anchors?.quantity) === Number(fixture.anchor_bolt_quantity_piece),
      `STOP_ANCHOR_GROUP_INSTALLATION_CORE_ANCHOR_COUNT:${target.contextKey}`);
    invariant(compiled.totals.unpricedRowCount === compiled.totals.includedRowCount,
      `STOP_ANCHOR_GROUP_INSTALLATION_CORE_PRICE_STATE:${target.contextKey}`);
    invariant(compiled.rows.some((row) => row.row_id === "material:anchor-group:nuts")
      && compiled.rows.some((row) => row.row_id === "material:anchor-group:washers")
      && compiled.rows.some((row) => row.row_id === "material:anchor-group:installation-template")
      && compiled.rows.some((row) => row.row_id === "material:anchor-group:fixing-accessories")
      && compiled.rows.some((row) => row.row_id === "work:anchor-group:install-align")
      && compiled.rows.some((row) => row.row_id === "service:anchor-group:geometry-control")
      && compiled.rows.some((row) => row.row_id === "delivery:anchor-group:supply"),
    `STOP_ANCHOR_GROUP_INSTALLATION_CORE_SCOPE:${target.contextKey}`);
    targetResults.push({
      contextKey: target.contextKey,
      catalogId: target.catalogId,
      includedRows: compiled.rows.length,
      procurementRows: compiled.rows.filter((row) => row.included_in_procurement).length,
      anchorBoltQuantityPiece: anchors?.quantity,
      inputSha256: sha256(fixture),
      compiledSha256: sha256(compiled),
    });
  }
  invariant(new Set(targetResults.map((result) => result.includedRows)).size >= 3,
    "STOP_ANCHOR_GROUP_INSTALLATION_CONTEXTS_CLONED_BLINDLY");
  const serialized = JSON.stringify({
    resources: ANCHOR_GROUP_INSTALLATION_RESOURCES,
    formulas: ANCHOR_GROUP_INSTALLATION_FORMULAS,
  });
  for (const forbidden of [
    "src_professional_norm_pack_concrete_ready_mix_m3_m3_placed_v1",
    "src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1",
    "src_professional_norm_pack_formwork_contact_area_m2_m3_concrete_element_v1",
    "q * 95 * 1.05",
    "q * 2.4",
    "1.02",
  ]) invariant(!serialized.includes(forbidden), `STOP_ANCHOR_GROUP_INSTALLATION_LEGACY:${forbidden}`);
  return {
    compilerOwner: "compileCanonicalEstimateCore",
    targetCount: targetResults.length,
    parameterCount: ANCHOR_GROUP_INSTALLATION_PARAMETERS.length,
    formulaCount: ANCHOR_GROUP_INSTALLATION_FORMULAS.length,
    resourceDefinitionCount: ANCHOR_GROUP_INSTALLATION_RESOURCES.length,
    targetResults,
    deterministicSha256: sha256(targetResults),
  };
}

async function cloneSearch(client: Client, input: {
  releaseId: string;
  searchReleaseId: string;
  releaseKey: string;
  head: string;
  tree: string;
  fingerprint: string;
  definitionIds: ReadonlyMap<string, string>;
}): Promise<Json> {
  await client.query(`insert into public.estimate_search_index_release(
      id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,
      source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata)
    select $1,$2,'draft',taxonomy_version,group_relation_version,ranking_contract_version,
      $3,$4,$5,global_count,external_count,discovered_count,
      metadata||jsonb_build_object('contract',$6::text,'parentSearchReleaseId',$7::uuid::text,
        'definitionReleaseId',$8::uuid::text,'sourceFingerprint',$9::text,
        'lifecycle','PREPARED_NOT_ACTIVE','activationAllowed',false,'productionEligible',false,
        'anchorGroupInstallationTargetCount',$10::int)
    from public.estimate_search_index_release where id=$7`, [
    input.searchReleaseId, `${input.releaseKey}-search`, input.head, input.tree,
    sha256(`${input.searchReleaseId}:draft`), CONTRACT, PARENT_SEARCH_RELEASE_ID,
    input.releaseId, input.fingerprint, TARGETS.length,
  ]);
  await client.query(`insert into public.estimate_search_group(
      search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition)
    select $1,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
    from public.estimate_search_group where search_release_id=$2`, [
    input.searchReleaseId, PARENT_SEARCH_RELEASE_ID,
  ]);
  await client.query(`insert into public.estimate_search_clarification_question(
      search_release_id,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence)
    select $1,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence
    from public.estimate_search_clarification_question where search_release_id=$2`, [
    input.searchReleaseId, PARENT_SEARCH_RELEASE_ID,
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
        'parentSearchReleaseId',$4::uuid::text,'definitionReleaseId',$2::uuid::text,'sourceFingerprint',$5::text),
      encode(extensions.digest(convert_to(source.document_sha256||':'||$3||':'||$2::uuid::text,'UTF8'),'sha256'),'hex'),
      source.adjudication_class,source.selectable,source.canonical_target_catalog_id,manifest.definition_version_id
    from public.estimate_search_document source
    join public.estimate_cumulative_manifest_entry manifest
      on manifest.release_id=$2 and manifest.catalog_id=source.catalog_id
    where source.search_release_id=$4`, [
    input.searchReleaseId, input.releaseId, CONTRACT, PARENT_SEARCH_RELEASE_ID, input.fingerprint,
  ]);
  await client.query(`insert into public.estimate_search_group_membership(
      search_release_id,group_id,catalog_id,ordinal,independent_disposition)
    select $1,group_id,catalog_id,ordinal,independent_disposition
    from public.estimate_search_group_membership where search_release_id=$2`, [
    input.searchReleaseId, PARENT_SEARCH_RELEASE_ID,
  ]);
  await client.query(`insert into public.estimate_search_typed_relation(
      search_release_id,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256)
    select $1,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256
    from public.estimate_search_typed_relation where search_release_id=$2`, [
    input.searchReleaseId, PARENT_SEARCH_RELEASE_ID,
  ]);

  const clarificationFields = ANCHOR_GROUP_INSTALLATION_PARAMETERS.map((parameter) => ({
    parameterId: parameter.parameter_id,
    titleRu: parameter.title_ru,
    unitId: parameter.unit_id,
  }));
  for (const target of TARGETS) {
    const aliases = [
      `монтаж анкерной группы ${target.contextRu}`,
      `установка анкерных болтов по шаблону ${target.contextRu}`,
      `анкеры гайки шайбы шаблон фиксаторы ${target.contextRu}`,
    ];
    const normalizedCanonicalName = normalizeSearchText(target.titleRu);
    const normalizedAliases = aliases.map(normalizeSearchText);
    const normalizedSearchTerms = unique([
      normalizeSearchText(target.catalogId),
      normalizedCanonicalName,
      ...normalizedCanonicalName.split(" "),
      ...normalizedAliases,
      ...normalizedAliases.flatMap((alias) => alias.split(" ")),
    ]);
    const updated = await client.query(`update public.estimate_search_document set
        canonical_name_ru=$3,primary_uom='piece',short_scope_ru=$4,
        included_boundaries=$5::jsonb,excluded_boundaries=$6::jsonb,
        required_inputs_count=$7,clarification_fields=$8::jsonb,
        normative_classifiers=array_append(array_remove(coalesce(normative_classifiers,'{}'::text[]),$9),$9),
        applicability_tags=array_append(array_remove(coalesce(applicability_tags,'{}'::text[]),
          'FULL_QUANTITY_SCOPE_PRICE_PARTIAL'),'FULL_APPLICABLE_SCOPE_PRICE_PARTIAL'),
        source_provenance=source_provenance||jsonb_build_object('productProfileId',$10::text,
          'contextKey',$11::text,'fullApplicableScope',true,'projectScheduleRequired',true),
        aliases=$12::text[],normalized_canonical_name=$13,normalized_aliases=$14::text[],
        normalized_search_terms=$15::text[],normalized_search_blob=$16,
        definition_version_id=$17::uuid,
        document_sha256=encode(extensions.digest(convert_to(document_sha256||':'||$3||':'||$17::uuid::text,'UTF8'),'sha256'),'hex')
      where search_release_id=$1 and catalog_id=$2`, [
      input.searchReleaseId,
      target.catalogId,
      target.titleRu,
      `Полная применимая смета установки анкерной группы: анкеры, гайки, шайбы, шаблон, фиксаторы, защита, работы, техника, контроль и доставка; ${target.contextRu}.`,
      JSON.stringify([
        "анкерные болты, гайки, шайбы, установочный шаблон и фиксаторы по утверждённой спецификации",
        "защитная система и сварочная фиксация только когда они предусмотрены проектом и ППР",
        "разбивка, сборка шаблона, установка, выверка, фиксация и защитная обработка",
        "применимая техника, геодезический контроль, приёмка, документы и отдельная доставка",
      ]),
      JSON.stringify([
        "бетонное основание, арматурный каркас и опалубка как отдельные технологические семьи",
        "автоматические нормы из объёма бетона и универсальные проценты запаса",
        "автоматические нормы производительности труда и оборудования",
        "скрытое расстояние доставки и неподтверждённые цены",
      ]),
      clarificationFields.length,
      JSON.stringify(clarificationFields),
      ANCHOR_GROUP_PROJECT_SCHEDULE_NORM_ID,
      ANCHOR_GROUP_PROJECT_SCHEDULE_PRODUCT_PROFILE_ID,
      target.contextKey,
      aliases,
      normalizedCanonicalName,
      normalizedAliases,
      normalizedSearchTerms,
      normalizedSearchTerms.join("\u001f"),
      input.definitionIds.get(target.catalogId),
    ]);
    invariant(updated.rowCount === 1,
      `STOP_ANCHOR_GROUP_INSTALLATION_SEARCH_TARGET_MISSING:${target.catalogId}`);
  }
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
      masterSha256: MASTER_SHA256,
      sourceFingerprint: input.fingerprint,
      parentSearchReleaseId: PARENT_SEARCH_RELEASE_ID,
      projectInputSourceRole: "PROJECT_OR_ENGINEERING_INPUT",
      targetCatalogIds: TARGETS.map((target) => target.catalogId),
      anchorGroupInstallationTargetCount: TARGETS.length,
      parameterCountPerTarget: ANCHOR_GROUP_INSTALLATION_PARAMETERS.length,
      formulaCountPerTarget: ANCHOR_GROUP_INSTALLATION_FORMULAS.length,
      resourceDefinitionCountPerTarget: ANCHOR_GROUP_INSTALLATION_RESOURCES.length,
    }),
  ]);
  return snapshot;
}

async function auditState(
  client: Client,
  releaseId: string,
  searchReleaseId: string,
  definitionIds: ReadonlyMap<string, string>,
): Promise<Json> {
  const ids = [...definitionIds.values()];
  const catalogIds = TARGETS.map((target) => target.catalogId);
  const release = (await client.query(`select id,status,activated_at,definition_count,parameter_count,
      formula_count,resource_row_count,source_manifest_sha256,parent_release_id
    from public.estimate_definition_release where id=$1`, [releaseId])).rows[0] as Json;
  const manifest = (await client.query(`select count(*)::int identities,
      count(*) filter(where catalog_id=any($2::text[]) and definition_version_id=any($3::uuid[]))::int replaced,
      encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot
    from public.estimate_cumulative_manifest_entry where release_id=$1`, [
    releaseId, catalogIds, ids,
  ])).rows[0] as Json;
  const targets = (await client.query(`select definition.id definition_id,definition.catalog_id,
      definition.content_status,definition.content_gate_status,passport.decision,
      (select count(*)::int from public.estimate_parameter_definition p where p.definition_version_id=definition.id) parameters,
      (select count(*)::int from public.estimate_formula_graph f where f.definition_version_id=definition.id) formulas,
      (select count(*)::int from public.estimate_resource_spec r where r.definition_version_id=definition.id) resources,
      (select count(*)::int from public.estimate_work_normative_binding b where b.definition_version_id=definition.id) bindings,
      (select count(*)::int from public.estimate_resource_spec r
        where r.definition_version_id=definition.id and r.procurement_eligible) procurement_rows,
      (select count(*)::int from public.estimate_resource_spec r
        where r.definition_version_id=definition.id and r.source_metadata::text ~
          'src_professional_norm_pack_(concrete_ready_mix|reinforcement_rebar|formwork_contact_area)') forbidden_legacy_rows
    from public.estimate_definition_version definition
    join public.estimate_content_passport_r3 passport on passport.definition_version_id=definition.id
    where definition.id=any($1::uuid[]) order by definition.catalog_id`, [ids])).rows as Json[];
  const search = (await client.query(`select count(*)::int targets,
      count(*) filter(where required_inputs_count=$4 and selectable
        and definition_version_id=any($3::uuid[]))::int valid,
      (select count(*)::int from public.estimate_search_document where search_release_id=$1) documents,
      (select count(*)::int from public.estimate_search_document
        where search_release_id=$1 and selectable and adjudication_class='EFFECTIVE_WORK') visible,
      (select snapshot_sha256 from public.estimate_search_index_release where id=$1) snapshot_sha256
    from public.estimate_search_document
    where search_release_id=$1 and catalog_id=any($2::text[])`, [
    searchReleaseId, catalogIds, ids, ANCHOR_GROUP_INSTALLATION_PARAMETERS.length,
  ])).rows[0] as Json;
  return { release, manifest, targets, search };
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH,
    "STOP_ANCHOR_GROUP_INSTALLATION_BRANCH_DRIFT");
  invariant(existsSync(MASTER_PATH) && sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256,
    "STOP_ANCHOR_GROUP_INSTALLATION_MASTER_SHA256_DRIFT");
  invariant(existsSync(RESIDUAL_SUMMARY_PATH), "STOP_ANCHOR_GROUP_INSTALLATION_RESIDUAL_MISSING");
  const residual = JSON.parse(readFileSync(RESIDUAL_SUMMARY_PATH, "utf8")) as Json;
  invariant(residual.receipt_sha256 === RESIDUAL_RECEIPT_SHA256
    && residual.candidate?.definition_release_id === PARENT_RELEASE_ID
    && residual.candidate?.search_release_id === PARENT_SEARCH_RELEASE_ID
    && residual.current_residual?.legacy_pack_source_id_count === 8,
  "STOP_ANCHOR_GROUP_INSTALLATION_RESIDUAL_DRIFT");
  invariant(TARGETS.length === 6 && new Set(TARGETS.map((target) => target.catalogId)).size === 6,
    "STOP_ANCHOR_GROUP_INSTALLATION_TARGET_SET");
  for (const path of SOURCE_PATHS) {
    invariant(existsSync(resolve(path)), `STOP_ANCHOR_GROUP_INSTALLATION_SOURCE_MISSING:${path}`);
    invariant(git("diff", "--name-only", "HEAD", "--", path) === "",
      `STOP_ANCHOR_GROUP_INSTALLATION_SOURCE_UNCOMMITTED:${path}`);
  }

  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const sourceHashes = SOURCE_PATHS.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) }));
  const coreAcceptance = await verifyThroughExistingCore();
  const parameterSchemaSha256 = sha256(ANCHOR_GROUP_INSTALLATION_PARAMETERS.map((parameter) => ({
    id: parameter.parameter_id,
    type: parameter.value_type,
    unit: parameter.unit_id,
    required: parameter.required,
    constraints: parameter.constraints_json,
  })));
  const definitionSchemaSha256 = sha256({
    parameters: ANCHOR_GROUP_INSTALLATION_PARAMETERS,
    formulas: ANCHOR_GROUP_INSTALLATION_FORMULAS,
    resources: ANCHOR_GROUP_INSTALLATION_RESOURCES,
  });
  const fingerprint = sha256({
    contract: CONTRACT,
    masterSha256: MASTER_SHA256,
    residualReceiptSha256: RESIDUAL_RECEIPT_SHA256,
    head,
    tree,
    parentReleaseId: PARENT_RELEASE_ID,
    parentSearchReleaseId: PARENT_SEARCH_RELEASE_ID,
    sourceHashes,
    parameterSchemaSha256,
    definitionSchemaSha256,
    coreAcceptance,
    targets: TARGETS,
  });
  const releaseId = uuid(`${CONTRACT}:${fingerprint}:definition-release`);
  const searchReleaseId = uuid(`${CONTRACT}:${fingerprint}:search-release`);
  const releaseKey = `r4-a13-6-anchor-group-installation-${fingerprint.slice(0, 16)}`;
  const definitionIds = new Map(TARGETS.map((target) => [
    target.catalogId,
    uuid(`${CONTRACT}:${fingerprint}:${target.catalogId}:definition`),
  ]));
  const baselineIds = new Map(TARGETS.map((target) => [
    target.catalogId,
    uuid(`${CONTRACT}:${fingerprint}:${target.catalogId}:baseline`),
  ]));
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.productionAccessed === false,
    "STOP_ANCHOR_GROUP_INSTALLATION_CURRENT_PRODUCTION_ACCESS_FLAG");
  invariant(
    (current.definitionReleaseId === PARENT_RELEASE_ID
      && current.searchReleaseId === PARENT_SEARCH_RELEASE_ID)
      || (current.definitionReleaseId === releaseId && current.searchReleaseId === searchReleaseId),
    `STOP_ANCHOR_GROUP_INSTALLATION_CURRENT_RELEASE_DRIFT:${current.definitionReleaseId}:${current.searchReleaseId}`,
  );

  const formulaConsumers = Object.fromEntries(ANCHOR_GROUP_INSTALLATION_PARAMETERS.map((parameter) => [
    parameter.parameter_id,
    ANCHOR_GROUP_INSTALLATION_FORMULAS
      .filter((formula) => formula.input_parameter_ids.includes(parameter.parameter_id))
      .map((formula) => formula.formula_id),
  ]));
  const resourceConsumers = Object.fromEntries(ANCHOR_GROUP_INSTALLATION_PARAMETERS.map((parameter) => [
    parameter.parameter_id,
    ANCHOR_GROUP_INSTALLATION_RESOURCES
      .filter((resource) => formulaConsumers[parameter.parameter_id].includes(resource.formula_id)
        || JSON.stringify(resource.resource_graph).includes(`\"${parameter.parameter_id}\"`)
        || JSON.stringify(resource.inclusion_ast).includes(`\"${parameter.parameter_id}\"`)
        || (NORMATIVE_PARAMETER_IDS.has(parameter.parameter_id)
          && resource.row_id === "material:anchor-group:anchor-bolts"))
      .map((resource) => resource.row_id),
  ]));
  const passportRepresentative = {
    contract_version: CONTENT_PASSPORT_CONTRACT,
    included_scope_ru: [
      "анкерные болты, гайки, шайбы, установочный шаблон и фиксаторы по утверждённой спецификации",
      "проектная защитная система и проектная сварочная фиксация только при применимости",
      "разбивка, сборка шаблона, установка, выверка, фиксация и защитная обработка",
      "применимая техника, контроль, документы и отдельная доставка",
    ],
    capability_matrix: [
      { capability: "PARAMETERS", status: "GREEN" },
      { capability: "FORMULAS_AND_PHYSICAL_PARITY", status: "GREEN" },
      { capability: "FULL_APPLICABLE_SCOPE", status: "GREEN" },
      { capability: "PRICE", status: "GREEN_UNKNOWN_IS_NULL" },
    ],
  };

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "r4-a13-6-anchor-group-installation-family-successor",
  });
  await client.connect();
  let receipt: Json;
  try {
    const parent = (await client.query(
      "select * from public.estimate_definition_release where id=$1",
      [PARENT_RELEASE_ID],
    )).rows[0] as Json;
    const parentSearch = (await client.query(
      "select * from public.estimate_search_index_release where id=$1",
      [PARENT_SEARCH_RELEASE_ID],
    )).rows[0] as Json;
    invariant(parent?.status === "prepared" && Number(parent.definition_count) === 10_331,
      "STOP_ANCHOR_GROUP_INSTALLATION_PARENT_RELEASE_DRIFT");
    invariant(parentSearch?.status === "draft", "STOP_ANCHOR_GROUP_INSTALLATION_PARENT_SEARCH_DRIFT");
    const existing = (await client.query(
      "select id,status,activated_at from public.estimate_definition_release where id=$1",
      [releaseId],
    )).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.status === "prepared" && existing.activated_at == null,
        "STOP_ANCHOR_GROUP_INSTALLATION_EXISTING_SUCCESSOR_STATE_DRIFT");
      const audit = await auditState(client, releaseId, searchReleaseId, definitionIds);
      receipt = {
        status: "GREEN_ANCHOR_GROUP_INSTALLATION_ALREADY_PREPARED_NOT_ACTIVE",
        idempotent: true,
        mutationPerformed: false,
        successor: { releaseId, searchReleaseId, releaseKey },
        coreAcceptance,
        audit,
      };
    } else {
      await client.query("begin");
      await client.query("set local lock_timeout='5s'");
      await client.query("set local statement_timeout='600s'");
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [CONTRACT]);
      await client.query(`insert into public.estimate_normative_source(
          id,source_key,title_ru,authority,official_url,artifact_sha256,effective_from,metadata)
        values($1,$2,$3,$4,null,null,null,$5::jsonb)
        on conflict(source_key) do update set title_ru=excluded.title_ru,
          authority=excluded.authority,metadata=excluded.metadata`, [
        uuid(`${CONTRACT}:source:${ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID}`),
        ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID,
        ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_METADATA.source_title,
        ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_METADATA.source_authority,
        JSON.stringify({
          contract: CONTRACT,
          candidateOnly: true,
          verifiedAt: "2026-09-17",
          useRestriction: ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_METADATA.use_restriction,
          sourceDefinitionHash: ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_METADATA.definition_hash,
          universalQuantityRate: false,
          automaticProductivity: false,
        }),
      ]);
      const projectLocator = {
        locatorType: "PROJECT_DOCUMENT_REFERENCE_SET",
        requiredReferences: [
          "approved_anchor_group_schedule_reference",
          "structural_drawing_revision_reference",
          "method_statement_reference",
        ],
        exactLocator: ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_METADATA.exact_locator,
        useRestriction: ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_METADATA.use_restriction,
      };
      const projectLocatorKey = sha256(projectLocator);
      const sourceId = String((await client.query(
        "select id from public.estimate_normative_source where source_key=$1",
        [ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID],
      )).rows[0]?.id ?? "");
      invariant(sourceId, "STOP_ANCHOR_GROUP_INSTALLATION_SOURCE_INSERT");
      await client.query(`insert into public.estimate_normative_locator(
          id,source_id,locator_key,locator,excerpt_sha256)
        values($1,$2,$3,$4::jsonb,$5)
        on conflict(source_id,locator_key) do nothing`, [
        uuid(`${CONTRACT}:locator:${projectLocatorKey}`), sourceId, projectLocatorKey,
        JSON.stringify(projectLocator), sha256(projectLocator),
      ]);
      const parentTargets = (await client.query(`select manifest.*,
          definition.definition_version,definition.passport,definition.applicability,definition.source_metadata,
          (select count(*)::int from public.estimate_parameter_definition p
            where p.definition_version_id=manifest.definition_version_id) parameters,
          (select count(*)::int from public.estimate_formula_graph f
            where f.definition_version_id=manifest.definition_version_id) formulas,
          (select count(*)::int from public.estimate_resource_spec r
            where r.definition_version_id=manifest.definition_version_id) resources
        from public.estimate_cumulative_manifest_entry manifest
        join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
        where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])
        order by manifest.catalog_id`, [
        PARENT_RELEASE_ID, TARGETS.map((target) => target.catalogId),
      ])).rows as Json[];
      invariant(parentTargets.length === TARGETS.length,
        `STOP_ANCHOR_GROUP_INSTALLATION_PARENT_TARGETS:${parentTargets.length}`);
      const parentByCatalog = new Map(parentTargets.map((target) => [String(target.catalog_id), target]));
      const lineageByCatalog = new Map<string, Awaited<ReturnType<typeof resolveCanonicalApprovedBaselineLeaf>>>();
      for (const target of TARGETS) {
        const old = parentByCatalog.get(target.catalogId);
        invariant(old, `STOP_ANCHOR_GROUP_INSTALLATION_PARENT_TARGET_MISSING:${target.catalogId}`);
        lineageByCatalog.set(target.catalogId, await resolveCanonicalApprovedBaselineLeaf(
          client,
          String(old.approved_template_baseline_id),
          target.catalogId,
        ));
      }
      const locator = (await client.query(`select locator.id::text locator_id,locator.locator,source.source_key
        from public.estimate_normative_locator locator
        join public.estimate_normative_source source on source.id=locator.source_id
        where source.source_key=$1 order by locator.id`, [ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID])).rows[0] as Json;
      invariant(locator?.locator_id, "STOP_ANCHOR_GROUP_INSTALLATION_NORMATIVE_LOCATOR_MISSING");

      const nextCounts = {
        definitions: Number(parent.definition_count),
        parameters: Number(parent.parameter_count) + TARGETS.reduce((sum, target) =>
          sum + ANCHOR_GROUP_INSTALLATION_PARAMETERS.length
            - Number(parentByCatalog.get(target.catalogId)?.parameters), 0),
        formulas: Number(parent.formula_count) + TARGETS.reduce((sum, target) =>
          sum + ANCHOR_GROUP_INSTALLATION_FORMULAS.length
            - Number(parentByCatalog.get(target.catalogId)?.formulas), 0),
        resources: Number(parent.resource_row_count) + TARGETS.reduce((sum, target) =>
          sum + ANCHOR_GROUP_INSTALLATION_RESOURCES.length
            - Number(parentByCatalog.get(target.catalogId)?.resources), 0),
      };
      const parameterRows = ANCHOR_GROUP_INSTALLATION_PARAMETERS.map((parameter) => ({ ...parameter }));
      const formulaRows = ANCHOR_GROUP_INSTALLATION_FORMULAS.map((formula) => ({
        ...formula,
        ast_sha256: sha256(formula.ast),
      }));
      const resourceRows = ANCHOR_GROUP_INSTALLATION_RESOURCES.map((resource) => ({
        ...resource,
        row_type: resourceRowType(resource.category),
      }));
      const anchorOwner = resourceRows.find(
        (resource) => resource.row_id === "material:anchor-group:anchor-bolts",
      );
      invariant(anchorOwner, "STOP_ANCHOR_GROUP_INSTALLATION_NORMATIVE_OWNER_MISSING");
      const bindingRows = [{
        row_id: anchorOwner.row_id,
        locator_id: locator.locator_id,
        applicability: {
          technology_class: "ANCHOR_GROUP_PROJECT_SCHEDULE",
          operation_class: "INSTALL_AND_ALIGN",
          material_system: "PROJECT_SPECIFIED_ANCHOR_GROUP",
          scope_mode: "FULL_APPLICABLE_SCOPE",
          product_profile_id: ANCHOR_GROUP_PROJECT_SCHEDULE_PRODUCT_PROFILE_ID,
          source_id: ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID,
          norm_id: ANCHOR_GROUP_PROJECT_SCHEDULE_NORM_ID,
          source_document_version: ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_METADATA.source_document_version,
          source_definition_hash: ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_METADATA.definition_hash,
          exact_locator: ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_METADATA.exact_locator,
        },
      }];

      const plannedTargets = [];
      for (const target of TARGETS) {
        const old = parentByCatalog.get(target.catalogId)!;
        const lineage = lineageByCatalog.get(target.catalogId)!;
        const fixture = anchorGroupInstallationAcceptanceInputR1(target.contextKey);
        const definitionId = definitionIds.get(target.catalogId)!;
        const baselineId = baselineIds.get(target.catalogId)!;
        const nextDefinitionVersion = Number((await client.query(
          "select coalesce(max(definition_version),0)::int+1 value from public.estimate_definition_version where catalog_id=$1",
          [target.catalogId],
        )).rows[0].value);
        const targetCoreAcceptance = coreAcceptance.targetResults.find(
          (result: Json) => result.catalogId === target.catalogId,
        );
        const acceptanceEvidenceSha256 = sha256({
          contract: CONTRACT,
          residualReceiptSha256: RESIDUAL_RECEIPT_SHA256,
          target,
          fixture,
          targetCoreAcceptance,
          parameterSchemaSha256,
          definitionSchemaSha256,
          lineage,
        });
        const targetDefinitionSha256 = sha256({
          contract: CONTRACT,
          target,
          parameterSchemaSha256,
          definitionSchemaSha256,
        });
        const baselineRepresentative = {
          parameter_schema_sha256: parameterSchemaSha256,
          input_values: fixture,
          input_classification: Object.fromEntries(parameterRows.map((parameter) => [
            parameter.parameter_id,
            NORMATIVE_PARAMETER_IDS.has(parameter.parameter_id) ? "NORMATIVE" : "VALIDATION_FIXTURE",
          ])),
          uom_by_parameter: Object.fromEntries(parameterRows.map((parameter) => [
            parameter.parameter_id, parameter.unit_id,
          ])),
          formula_consumer_ids: formulaConsumers,
          resource_consumer_row_ids: resourceConsumers,
          normative_source_ids: Object.fromEntries(parameterRows.map((parameter) => [
            parameter.parameter_id,
            NORMATIVE_PARAMETER_IDS.has(parameter.parameter_id)
              ? [ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID]
              : [],
          ])),
          guide_provenance_ru: Object.fromEntries(parameterRows.map((parameter) => [
            parameter.parameter_id,
            String((parameter.truth_metadata.guide as Json).guide_short_ru),
          ])),
          proposal_source_refs: [{
            contract: CONTRACT,
            masterSha256: MASTER_SHA256,
            residualReceiptSha256: RESIDUAL_RECEIPT_SHA256,
            sourceReference: "APPROVED_PROJECT_SCHEDULE_DRAWING_AND_METHOD_STATEMENT",
            exactLocator: ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_METADATA.exact_locator,
          }],
          contract_version: BASELINE_CONTRACT,
        };
        const plan = createCanonicalDefinitionClonePlan({
          contract: CONTRACT,
          definition: {
            id: definitionId,
            releaseId,
            catalogId: target.catalogId,
            definitionVersion: nextDefinitionVersion,
            passport: {
              catalogId: target.catalogId,
              canonicalRuName: target.titleRu,
              workKey: target.catalogId.split(":").at(-1),
              physicalResultRu: `Полная применимая смета установки анкерной группы: ${target.contextRu}`,
              exactNormId: ANCHOR_GROUP_PROJECT_SCHEDULE_NORM_ID,
            },
            applicability: {
              country: "KG",
              operationClass: "ANCHOR_GROUP_INSTALLATION_FULL_APPLICABLE_SCOPE",
              materialSystem: "PROJECT_SPECIFIED_ANCHOR_GROUP",
              productProfileId: ANCHOR_GROUP_PROJECT_SCHEDULE_PRODUCT_PROFILE_ID,
              contextKey: target.contextKey,
              contextRu: target.contextRu,
              projectScheduleRequired: true,
              conditionalScopeFailClosed: true,
            },
            definitionSha256: targetDefinitionSha256,
            sourceMetadata: {
              contract: CONTRACT,
              predecessorDefinitionId: old.definition_version_id,
              predecessorBaselineLeafId: lineage.baselineId,
              parameterSchemaSha256,
              definitionSchemaSha256,
              acceptanceEvidenceSha256,
              residualReceiptSha256: RESIDUAL_RECEIPT_SHA256,
              normativeSourceIds: [ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID],
              synthetic: false,
              fullApplicableScope: true,
              priceState: "PARTIAL_NEEDS_PRICE",
            },
          },
          representative: {
            parameters: parameterRows,
            formulas: formulaRows,
            resources: resourceRows,
            bindings: bindingRows,
            baseline: baselineRepresentative,
            passport: passportRepresentative,
          },
          parameterTruthMetadata: (parameter) => ({
            ...parameter.truth_metadata,
            contract: CONTRACT,
            semantic_parameter_key: `${target.catalogId}:${parameter.parameter_id}`,
            formula_consumers: formulaConsumers[parameter.parameter_id],
            resource_branch_consumers: resourceConsumers[parameter.parameter_id],
          }),
          resourceId: (resource) => uuid(
            `${CONTRACT}:${fingerprint}:${target.catalogId}:resource:${resource.row_id}`,
          ),
          resourceSemanticOwner: (resource) => `${target.catalogId}:${resource.row_id}`,
          resourceSha256: (resource) => sha256({ contract: CONTRACT, targetCatalogId: target.catalogId, resource }),
          baseline: {
            id: baselineId,
            key: `${CONTRACT}:${fingerprint.slice(0, 16)}:${target.catalogId}`,
            sourceDefinitionVersionId: lineage.definitionVersionId,
            validationScenarioRefs: [{
              scenario: `ANCHOR_GROUP_INSTALLATION_${target.contextKey.toUpperCase()}`,
              fixture,
              acceptanceEvidenceSha256,
              targetCoreAcceptance,
            }],
            acceptanceEvidenceSha256,
            acceptedReleaseId: releaseId,
            supersedesBaselineId: lineage.baselineId,
          },
          passport: {
            physicalResultRu: target.titleRu,
            excludedScopeRu: [
              "бетонное основание, арматурный каркас и опалубка как отдельные технологические семьи",
              "автоматические нормы товарного бетона, арматуры и опалубки из объёма основания",
              "автоматически выдуманная производительность труда или оборудования",
              "цены без коммерческого снимка и скрытое расстояние доставки",
            ],
            decision: {
              contract: CONTENT_PASSPORT_CONTRACT,
              status: "GREEN",
              allowed: true,
              waveContract: CONTRACT,
              quantityScope: "FULL",
              priceState: "PARTIAL_NEEDS_PRICE",
              activationAllowed: false,
              productionEligible: false,
            },
            payloadSha256: sha256({ targetDefinitionSha256, acceptanceEvidenceSha256 }),
            sourceHead: head,
            sourceTree: tree,
          },
          bindingApplicability: (binding) => ({
            ...binding.applicability,
            context_key: target.contextKey,
          }),
          expectedNormativeBindingCount: 1,
        });
        plannedTargets.push({
          target,
          old,
          lineage,
          definitionId,
          baselineId,
          nextDefinitionVersion,
          targetDefinitionSha256,
          acceptanceEvidenceSha256,
          plan,
        });
      }
      const publisherPreflight = await preflightCanonicalDefinitionPublishPlans(
        client,
        plannedTargets.map((target) => target.plan),
      );

      if (!APPLY) {
        receipt = {
          status: "DRY_RUN_ANCHOR_GROUP_INSTALLATION_VALIDATED",
          idempotent: false,
          mutationPerformed: false,
          residual: {
            path: RESIDUAL_SUMMARY_PATH,
            receiptSha256: RESIDUAL_RECEIPT_SHA256,
            unresolvedSourceIdsBefore: residual.current_residual.unresolved_normative_source_id_count,
            legacyPackSourceIdsBefore: residual.current_residual.legacy_pack_source_id_count,
          },
          predecessor: {
            releaseId: PARENT_RELEASE_ID,
            searchReleaseId: PARENT_SEARCH_RELEASE_ID,
            targets: parentTargets.map((target) => ({
              catalogId: target.catalog_id,
              definitionId: target.definition_version_id,
              shape: [Number(target.parameters), Number(target.formulas), Number(target.resources)],
            })),
          },
          successor: { releaseId, searchReleaseId, releaseKey, nextCounts },
          coreAcceptance,
          publisherPreflight,
        };
        await client.query("rollback");
      } else {
        try {
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
            sha256(`${CONTRACT}:${fingerprint}:draft`),
            nextCounts.definitions,
            nextCounts.resources,
            JSON.stringify({
              contract: CONTRACT,
              masterSha256: MASTER_SHA256,
              sourceHashes,
              sourceFingerprint: fingerprint,
              parentReleaseId: PARENT_RELEASE_ID,
              projectInputSourceRole: "PROJECT_OR_ENGINEERING_INPUT",
              targetCatalogIds: TARGETS.map((target) => target.catalogId),
              residualReceiptSha256: RESIDUAL_RECEIPT_SHA256,
              lifecycle: "DRAFT_FORWARD_ONLY",
              replacedDefinitionCount: TARGETS.length,
              activationAllowed: false,
              productionEligible: false,
              fullApplicableScope: true,
              priceState: "PARTIAL_NEEDS_PRICE",
            }),
            PARENT_RELEASE_ID,
            sha256({ contract: CONTRACT, fingerprint, definitionSchemaSha256 }),
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
            releaseId, CONTRACT, PARENT_RELEASE_ID,
          ]);
          const perTargetAudit: Json[] = [];
          for (const planned of plannedTargets) {
            const persisted = await publishCanonicalDefinitionDraft(client, planned.plan);
            await client.query(`update public.estimate_cumulative_manifest_entry set
                definition_version_id=$3,source_batch=$4,source_release_id=$1,
                publication_state='CANONICAL_SUCCESSOR',approved_template_baseline_id=$5,
                baseline_ready=true,scenario_ready=true,definition_hash=$6,entry_sha256=$7,
                runtime_publication_state='CANDIDATE'
              where release_id=$1 and catalog_id=$2`, [
              releaseId,
              planned.target.catalogId,
              planned.definitionId,
              CONTRACT,
              planned.baselineId,
              planned.targetDefinitionSha256,
              sha256({
                contract: CONTRACT,
                releaseId,
                catalogId: planned.target.catalogId,
                definitionId: planned.definitionId,
                baselineId: planned.baselineId,
                targetDefinitionSha256: planned.targetDefinitionSha256,
              }),
            ]);
            perTargetAudit.push({
              catalogId: planned.target.catalogId,
              contextKey: planned.target.contextKey,
              predecessorDefinitionId: planned.old.definition_version_id,
              predecessorBaselineLeafId: planned.lineage.baselineId,
              definitionId: planned.definitionId,
              baselineId: planned.baselineId,
              definitionVersion: planned.nextDefinitionVersion,
              acceptanceEvidenceSha256: planned.acceptanceEvidenceSha256,
              publisherPersistedSelfAudit: persisted,
            });
          }
          const searchSnapshot = await cloneSearch(client, {
            releaseId, searchReleaseId, releaseKey, head, tree, fingerprint, definitionIds,
          });
          const audit = await auditState(client, releaseId, searchReleaseId, definitionIds);
          invariant(Number(audit.manifest.identities) === nextCounts.definitions
            && Number(audit.manifest.replaced) === TARGETS.length,
          `STOP_ANCHOR_GROUP_INSTALLATION_MANIFEST_AUDIT:${JSON.stringify(audit.manifest)}`);
          invariant(audit.targets.length === TARGETS.length && audit.targets.every((target: Json) =>
            target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN"
            && target.decision?.quantityScope === "FULL" && target.decision?.priceState === "PARTIAL_NEEDS_PRICE"
            && Number(target.parameters) === ANCHOR_GROUP_INSTALLATION_PARAMETERS.length
            && Number(target.formulas) === ANCHOR_GROUP_INSTALLATION_FORMULAS.length
            && Number(target.resources) === ANCHOR_GROUP_INSTALLATION_RESOURCES.length
            && Number(target.bindings) === 1 && Number(target.procurement_rows) === 16
            && Number(target.forbidden_legacy_rows) === 0),
          `STOP_ANCHOR_GROUP_INSTALLATION_TARGET_AUDIT:${JSON.stringify(audit.targets)}`);
          invariant(Number(audit.search.targets) === TARGETS.length
            && Number(audit.search.valid) === TARGETS.length
            && Number(audit.search.documents) === 10_322
            && Number(audit.search.visible) === 10_322,
          `STOP_ANCHOR_GROUP_INSTALLATION_SEARCH_AUDIT:${JSON.stringify(audit.search)}`);
          const unrelated = (await client.query(`select count(*)::int changed
            from public.estimate_cumulative_manifest_entry parent
            join public.estimate_cumulative_manifest_entry successor using(catalog_id)
            where parent.release_id=$1 and successor.release_id=$2
              and parent.catalog_id<>all($3::text[])
              and (parent.definition_version_id<>successor.definition_version_id
                or parent.source_batch<>successor.source_batch
                or parent.source_release_id<>successor.source_release_id
                or parent.approved_template_baseline_id<>successor.approved_template_baseline_id
                or parent.runtime_publication_state<>successor.runtime_publication_state)`, [
            PARENT_RELEASE_ID, releaseId, TARGETS.map((target) => target.catalogId),
          ])).rows[0] as Json;
          invariant(Number(unrelated.changed) === 0,
            `STOP_ANCHOR_GROUP_INSTALLATION_UNRELATED_MANIFEST_DRIFT:${unrelated.changed}`);
          await client.query(`update public.estimate_definition_release
            set source_manifest_sha256=$2,status='prepared',sealed_at=clock_timestamp(),
              metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
            releaseId,
            audit.manifest.snapshot,
            JSON.stringify({
              lifecycle: "PREPARED_NOT_ACTIVE",
              searchReleaseId,
              searchSnapshotSha256: searchSnapshot.snapshot_sha256,
              anchorGroupInstallationTargetCount: TARGETS.length,
              sourceCoreAcceptanceSha256: coreAcceptance.deterministicSha256,
              residualReceiptSha256: RESIDUAL_RECEIPT_SHA256,
              parameterCountPerTarget: ANCHOR_GROUP_INSTALLATION_PARAMETERS.length,
              formulaCountPerTarget: ANCHOR_GROUP_INSTALLATION_FORMULAS.length,
              resourceDefinitionCountPerTarget: ANCHOR_GROUP_INSTALLATION_RESOURCES.length,
              priceState: "PARTIAL_NEEDS_PRICE",
            }),
          ]);
          const preparedAudit = await auditState(client, releaseId, searchReleaseId, definitionIds);
          invariant(preparedAudit.release?.status === "prepared"
            && preparedAudit.release?.activated_at == null,
          `STOP_ANCHOR_GROUP_INSTALLATION_FINAL_RELEASE_LIFECYCLE:${JSON.stringify(preparedAudit.release)}`);
          await client.query("commit");
          receipt = {
            status: "GREEN_ANCHOR_GROUP_INSTALLATION_PREPARED_NOT_ACTIVE",
            idempotent: false,
            mutationPerformed: true,
            residual: {
              path: RESIDUAL_SUMMARY_PATH,
              receiptSha256: RESIDUAL_RECEIPT_SHA256,
              unresolvedSourceIdsBefore: residual.current_residual.unresolved_normative_source_id_count,
              legacyPackSourceIdsBefore: residual.current_residual.legacy_pack_source_id_count,
            },
            predecessor: { releaseId: PARENT_RELEASE_ID, searchReleaseId: PARENT_SEARCH_RELEASE_ID },
            successor: {
              releaseId,
              searchReleaseId,
              releaseKey,
              nextCounts,
              targets: perTargetAudit,
            },
            coreAcceptance,
            publisherPreflight,
            audit: { ...preparedAudit, unrelatedManifestChanges: Number(unrelated.changed) },
          };
        } catch (error) {
          await client.query("rollback");
          throw error;
        }
      }
    }
  } finally {
    await client.end();
  }

  const body = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    source: { branch: EXPECTED_BRANCH, head, tree, fingerprint, sourceHashes },
    masterSha256: MASTER_SHA256,
    targetCatalogIds: TARGETS.map((target) => target.catalogId),
    canonicalCompilerOwner: "compileCanonicalEstimateCore",
    canonicalPublisherOwner: "canonicalDefinitionPublisherR1",
    ...receipt!,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  const sealed = { ...body, receiptSha256: sha256(body) };
  if (APPLY && receipt!.mutationPerformed === true) {
    atomicJson(resolve(OUTPUT_ROOT, `01_ANCHOR_GROUP_INSTALLATION_${head}.json`), sealed);
    atomicJson(resolve(OUTPUT_ROOT, "acceptance.json"), sealed);
    atomicJson(CURRENT_RELEASE_PATH, {
      ...current,
      definitionReleaseId: releaseId,
      searchReleaseId,
      definitionReleaseStatus: "prepared",
      searchReleaseStatus: "draft",
      definitionSnapshotSha256: receipt!.audit.manifest.snapshot,
      manifestHashChainSha256: receipt!.audit.manifest.snapshot,
      searchHashChainSha256: receipt!.audit.search.snapshot_sha256,
      currentRuntimeDefinitions: 10_331,
      owner: "EXACT_ANCHOR_GROUP_INSTALLATION_FAMILY_SUCCESSOR",
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
