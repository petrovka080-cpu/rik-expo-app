import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  FORMWORK_FRAMI_XLIFE_PARAMETERS,
  FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_TARGETS,
  FORMWORK_FRAMI_XLIFE_SOURCE_ID,
  FORMWORK_FRAMI_XLIFE_SYSTEM_PROFILE_ID,
  compileFormworkFramiXlifeProjectKitR1,
  formworkFramiXlifeParametersForCatalogR1,
  formworkFramiXlifeResourcesForCatalogR1,
  formworkFramiXlifeSlabFoundationAcceptanceInputR1,
} from "../../../src/lib/estimate/v4/formworkFramiXlifeProjectKitR1";
import {
  createCanonicalDefinitionClonePlan,
  preflightCanonicalDefinitionPublishPlans,
  publishCanonicalDefinitionDraft,
} from "./canonicalDefinitionPublisherR1";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.formwork-frami-xlife-slab-foundation-family-complete-estimate.v2";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (8).md",
);
const MASTER_SHA256 = "50687aa500c59fc01750f5982c4b152150ad1747d7ac8c607ed1e0ef3ba657f4";
const PREDECESSOR_RELEASE_ID = "c8162da2-0487-5363-a6be-f72401eb8934";
const PREDECESSOR_SEARCH_RELEASE_ID = "6e7799db-5cc0-57a9-8fb5-dca5101dd0b7";
const REJECTED_INTERMEDIATE_RELEASE_ID = "9c2736ac-deec-532b-aab5-ddfc51bb31dd";
const REPRESENTATIVE_CATALOG_ID =
  "canonical-work:base:concrete_foundation_interior_pile_cap_form_wet_zone";
const TARGETS = FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_TARGETS;
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_ROOT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/formwork-frami-xlife-slab-foundation-family",
);
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const APPLY = process.argv.includes("--apply");
const SOURCE_PATHS = [
  "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
  "src/lib/estimate/v4/formworkFramiXlifeProjectKitR1.ts",
  "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
  "scripts/estimate/r4a13/prepareFormworkFramiXlifeSlabFoundationFamilySuccessor.ts",
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
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

function exactDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `STOP_FORMWORK_FAMILY_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_FORMWORK_FAMILY_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
}

async function verifyThroughExistingCore(): Promise<Json> {
  const targets: Json[] = [];
  for (const target of TARGETS) {
    const fixture = formworkFramiXlifeSlabFoundationAcceptanceInputR1(target.contextKey);
    const craneApplicable = fixture.crane_supply_mode === "RENTAL_SEPARATE";
    const resourceDefinitions = formworkFramiXlifeResourcesForCatalogR1(target.catalogId);
    const expectedRowIds = resourceDefinitions
      .filter((resource) => resource.row_id !== "equipment:formwork:crane-handling" || craneApplicable)
      .map((resource) => resource.row_id)
      .sort();
    const expectedProcurementRowIds = resourceDefinitions
      .filter((resource) => resource.procurement_eligible)
      .filter((resource) => resource.row_id !== "equipment:formwork:crane-handling" || craneApplicable)
      .map((resource) => resource.row_id)
      .sort();
    const compiled = await compileFormworkFramiXlifeProjectKitR1(
      { ...fixture },
      { catalogId: target.catalogId },
    );
    invariant(compiled.rows.length === expectedRowIds.length && compiled.preliminaryNeeds.length === 0,
      `STOP_FORMWORK_FAMILY_CORE_ROWS:${target.contextKey}`);
    const expectedIncludedRows = craneApplicable ? 17 : 16;
    invariant(compiled.totals.includedRowCount === expectedIncludedRows
      && compiled.totals.unpricedRowCount === expectedIncludedRows,
      `STOP_FORMWORK_FAMILY_CORE_SCOPE:${target.contextKey}`);
    invariant(compiled.rows.filter((row) => row.included_in_procurement).length === expectedProcurementRowIds.length,
      `STOP_FORMWORK_FAMILY_CORE_PROCUREMENT:${target.contextKey}`);
    const actualRowIds = compiled.rows.map((row) => row.row_id).sort();
    const actualProcurementRowIds = compiled.rows
      .filter((row) => row.included_in_procurement)
      .map((row) => row.row_id)
      .sort();
    invariant(JSON.stringify(actualRowIds) === JSON.stringify(expectedRowIds),
      `STOP_FORMWORK_FAMILY_CORE_ROW_SET:${target.contextKey}`);
    invariant(JSON.stringify(actualProcurementRowIds) === JSON.stringify(expectedProcurementRowIds),
      `STOP_FORMWORK_FAMILY_CORE_PROCUREMENT_SET:${target.contextKey}`);
    invariant(String(fixture.element_type).includes(target.contextRu),
      `STOP_FORMWORK_FAMILY_CONTEXT_FIXTURE:${target.contextKey}`);
    targets.push({
      contextKey: target.contextKey,
      catalogId: target.catalogId,
      titleRu: target.titleRu,
      rows: compiled.rows.length,
      procurementRows: compiled.rows.filter((row) => row.included_in_procurement).length,
      craneApplicable,
      projectScheduleSha256: sha256(fixture),
      rowIds: actualRowIds,
      procurementRowIds: actualProcurementRowIds,
      deterministicSha256: sha256(compiled),
    });
  }
  return {
    compilerOwner: "compileCanonicalEstimateCore",
    representativeCatalogId: REPRESENTATIVE_CATALOG_ID,
    scaledTargetCount: targets.length,
    targetResults: targets,
    quantitiesRemainProjectScheduleInputs: true,
    contextMultiplierApplied: false,
    deterministicSha256: sha256(targets),
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
        'scaledSlabFoundationTargetCount',$10::int)
    from public.estimate_search_index_release where id=$7`, [
    input.searchReleaseId, `${input.releaseKey}-search`, input.head, input.tree,
    sha256(`${input.searchReleaseId}:draft`), CONTRACT, PREDECESSOR_SEARCH_RELEASE_ID,
    input.releaseId, input.fingerprint, TARGETS.length,
  ]);
  await client.query(`insert into public.estimate_search_group(
      search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition)
    select $1,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
    from public.estimate_search_group where search_release_id=$2`, [
    input.searchReleaseId, PREDECESSOR_SEARCH_RELEASE_ID,
  ]);
  await client.query(`insert into public.estimate_search_clarification_question(
      search_release_id,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence)
    select $1,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence
    from public.estimate_search_clarification_question where search_release_id=$2`, [
    input.searchReleaseId, PREDECESSOR_SEARCH_RELEASE_ID,
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
    input.searchReleaseId, input.releaseId, CONTRACT, PREDECESSOR_SEARCH_RELEASE_ID, input.fingerprint,
  ]);
  await client.query(`insert into public.estimate_search_group_membership(
      search_release_id,group_id,catalog_id,ordinal,independent_disposition)
    select $1,group_id,catalog_id,ordinal,independent_disposition
    from public.estimate_search_group_membership where search_release_id=$2`, [
    input.searchReleaseId, PREDECESSOR_SEARCH_RELEASE_ID,
  ]);
  await client.query(`insert into public.estimate_search_typed_relation(
      search_release_id,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256)
    select $1,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256
    from public.estimate_search_typed_relation where search_release_id=$2`, [
    input.searchReleaseId, PREDECESSOR_SEARCH_RELEASE_ID,
  ]);
  const clarificationFields = FORMWORK_FRAMI_XLIFE_PARAMETERS.map((parameter) => ({
    parameterId: parameter.parameter_id,
    titleRu: parameter.title_ru,
    unitId: parameter.unit_id,
  }));
  for (const target of TARGETS) {
    const aliases = [
      `опалубка плитного фундамента ${target.contextRu}`,
      `полный комплект опалубки периметральных рёбер плитного фундамента ${target.contextRu}`,
      `Doka Frami Xlife плитный фундамент ${target.contextRu}`,
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
    await client.query(`update public.estimate_search_document set
        canonical_name_ru=$3,primary_uom='m2',short_scope_ru=$4,
        included_boundaries=$5::jsonb,excluded_boundaries=$6::jsonb,
        required_inputs_count=$7,clarification_fields=$8::jsonb,
        normative_classifiers=array_append(array_remove(coalesce(normative_classifiers,'{}'::text[]),$9),$9),
        applicability_tags=$10::text[],
        source_provenance=source_provenance||jsonb_build_object('formworkSystemProfile',$11::text,
          'projectScheduleRequired',true,'contextKey',$12::text),aliases=$13::text[],
        normalized_canonical_name=$14,normalized_aliases=$15::text[],
        normalized_search_terms=$16::text[],normalized_search_blob=$17,
        definition_version_id=$18::uuid,
        document_sha256=encode(extensions.digest(convert_to(document_sha256||':'||$11||':'||$12,'UTF8'),'sha256'),'hex')
      where search_release_id=$1 and catalog_id=$2`, [
      input.searchReleaseId, target.catalogId, target.titleRu,
      `Полная проектная смета съёмной опалубки плитного фундамента: ${target.contextRu}; без универсальных коэффициентов комплекта.`,
      JSON.stringify([
        "измеренная площадь контакта",
        "возвратный комплект Doka Frami Xlife",
        "расходники, работы, кран, инженерная услуга",
        "доставка и возврат арендного комплекта",
      ]),
      JSON.stringify([
        "универсальные нормы комплекта на м²",
        "автоматическая оборачиваемость",
        "цены без коммерческого снимка",
        "другие типы фундаментных элементов",
      ]),
      clarificationFields.length, JSON.stringify(clarificationFields), FORMWORK_FRAMI_XLIFE_SOURCE_ID,
      ["DOKA_FRAMI_XLIFE_FOUNDATION", "PROJECT_SCHEDULE_REQUIRED", "RENTAL_RETURNABLE",
        `SLAB_FOUNDATION_CONTEXT_${target.contextKey.toUpperCase()}`, "FULL_QUANTITY_SCOPE_PRICE_PARTIAL"],
      FORMWORK_FRAMI_XLIFE_SYSTEM_PROFILE_ID, target.contextKey, aliases,
      normalizedCanonicalName, normalizedAliases, normalizedSearchTerms,
      normalizedSearchTerms.join("\u001f"), input.definitionIds.get(target.catalogId),
    ]);
  }
  const snapshot = (await client.query(`select count(*)::int documents,
      count(*) filter(where selectable and adjudication_class='EFFECTIVE_WORK')::int visible,
      encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot_sha256
    from public.estimate_search_document where search_release_id=$1`, [input.searchReleaseId])).rows[0] as Json;
  await client.query(`update public.estimate_search_index_release set snapshot_sha256=$2,
    metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
    input.searchReleaseId, snapshot.snapshot_sha256,
    JSON.stringify({
      documentCount: snapshot.documents,
      visibleCount: snapshot.visible,
      slabFoundationFamilyTargetCount: FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_TARGETS.length,
      scaledTargetCount: TARGETS.length,
      formworkSystemProfile: FORMWORK_FRAMI_XLIFE_SYSTEM_PROFILE_ID,
    }),
  ]);
  return snapshot;
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH, "STOP_FORMWORK_FAMILY_BRANCH_DRIFT");
  invariant(existsSync(MASTER_PATH) && sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256,
    "STOP_FORMWORK_FAMILY_MASTER_SHA256_DRIFT");
  for (const path of SOURCE_PATHS) {
    invariant(existsSync(resolve(path)), `STOP_FORMWORK_FAMILY_SOURCE_MISSING:${path}`);
    invariant(git("diff", "--name-only", "HEAD", "--", path) === "",
      `STOP_FORMWORK_FAMILY_SOURCE_UNCOMMITTED:${path}`);
  }
  invariant(TARGETS.length === 7, `STOP_FORMWORK_FAMILY_TARGET_COUNT:${TARGETS.length}`);
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const sourceHashes = SOURCE_PATHS.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) }));
  const coreAcceptance = await verifyThroughExistingCore();
  const fingerprint = sha256({
    contract: CONTRACT,
    masterSha256: MASTER_SHA256,
    head,
    tree,
    predecessorReleaseId: PREDECESSOR_RELEASE_ID,
    predecessorSearchReleaseId: PREDECESSOR_SEARCH_RELEASE_ID,
    sourceHashes,
    coreAcceptance,
    targets: TARGETS,
  });
  const releaseId = uuid(`${CONTRACT}:${fingerprint}:definition-release`);
  const searchReleaseId = uuid(`${CONTRACT}:${fingerprint}:search-release`);
  const releaseKey = `r4-a13-6-formwork-frami-xlife-slab-foundation-family-${fingerprint.slice(0, 16)}`;
  const definitionIds = new Map(TARGETS.map((target) => [
    target.catalogId,
    uuid(`${CONTRACT}:${fingerprint}:${target.catalogId}:definition`),
  ]));
  const baselineIds = new Map(TARGETS.map((target) => [
    target.catalogId,
    uuid(`${CONTRACT}:${fingerprint}:${target.catalogId}:baseline`),
  ]));
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.productionAccessed === false, "STOP_FORMWORK_FAMILY_CURRENT_PRODUCTION_ACCESS_FLAG");
  invariant(
    (current.definitionReleaseId === PREDECESSOR_RELEASE_ID
      && current.searchReleaseId === PREDECESSOR_SEARCH_RELEASE_ID)
      || (current.definitionReleaseId === releaseId && current.searchReleaseId === searchReleaseId),
    "STOP_FORMWORK_FAMILY_CURRENT_RELEASE_DRIFT",
  );

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "r4-a13-6-formwork-frami-xlife-slab-foundation-family-successor",
  });
  await client.connect();
  let receipt: Json;
  try {
    const predecessor = (await client.query(
      "select * from public.estimate_definition_release where id=$1",
      [PREDECESSOR_RELEASE_ID],
    )).rows[0] as Json;
    const predecessorSearch = (await client.query(
      "select * from public.estimate_search_index_release where id=$1",
      [PREDECESSOR_SEARCH_RELEASE_ID],
    )).rows[0] as Json;
    invariant(predecessor?.status === "prepared" && Number(predecessor.definition_count) === 10_331,
      "STOP_FORMWORK_FAMILY_PREDECESSOR_RELEASE_DRIFT");
    invariant(predecessorSearch?.status === "draft", "STOP_FORMWORK_FAMILY_PREDECESSOR_SEARCH_DRIFT");
    const representative = (await client.query(`select definition.*,manifest.approved_template_baseline_id
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      where manifest.release_id=$1 and manifest.catalog_id=$2`, [
      PREDECESSOR_RELEASE_ID, REPRESENTATIVE_CATALOG_ID,
    ])).rows[0] as Json;
    invariant(representative, "STOP_FORMWORK_FAMILY_REPRESENTATIVE_MISSING");
    const representativeShape = (await client.query(`select
        (select count(*)::int from public.estimate_parameter_definition where definition_version_id=$1) parameters,
        (select count(*)::int from public.estimate_formula_graph where definition_version_id=$1) formulas,
        (select count(*)::int from public.estimate_resource_spec where definition_version_id=$1) resources,
        (select count(*)::int from public.estimate_work_normative_binding where definition_version_id=$1) bindings`, [
      representative.id,
    ])).rows[0] as Json;
    invariant(Number(representativeShape.parameters) === 52 && Number(representativeShape.formulas) === 20
      && Number(representativeShape.resources) === 24 && Number(representativeShape.bindings) === 9,
    `STOP_FORMWORK_FAMILY_REPRESENTATIVE_SHAPE:${JSON.stringify(representativeShape)}`);
    const targetRows = (await client.query(`select manifest.*,definition.definition_version,
        (select count(*)::int from public.estimate_parameter_definition where definition_version_id=manifest.definition_version_id) parameters,
        (select count(*)::int from public.estimate_formula_graph where definition_version_id=manifest.definition_version_id) formulas,
        (select count(*)::int from public.estimate_resource_spec where definition_version_id=manifest.definition_version_id) resources,
        (select count(*)::int from public.estimate_work_normative_binding where definition_version_id=manifest.definition_version_id) bindings
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])`, [
      PREDECESSOR_RELEASE_ID, TARGETS.map((target) => target.catalogId),
    ])).rows as Json[];
    invariant(targetRows.length === TARGETS.length, `STOP_FORMWORK_FAMILY_PREDECESSOR_TARGETS:${targetRows.length}`);
    invariant(targetRows.every((target) => Number(target.parameters) === 13
      && Number(target.formulas) === 1 && Number(target.resources) === 2
      && Number(target.bindings) === 1),
    `STOP_FORMWORK_FAMILY_PREDECESSOR_TARGET_SHAPE:${JSON.stringify(targetRows)}`);
    const targetByCatalog = new Map(targetRows.map((target) => [String(target.catalog_id), target]));
    const intermediateRows = (await client.query(`select manifest.*,
        definition.content_status,definition.content_gate_status,
        baseline.supersedes_baseline_id,
        (select count(*)::int from public.estimate_parameter_definition where definition_version_id=manifest.definition_version_id) parameters,
        (select count(*)::int from public.estimate_formula_graph where definition_version_id=manifest.definition_version_id) formulas,
        (select count(*)::int from public.estimate_resource_spec where definition_version_id=manifest.definition_version_id) resources,
        (select count(*)::int from public.estimate_work_normative_binding where definition_version_id=manifest.definition_version_id) bindings
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      join public.estimate_approved_template_baseline baseline on baseline.id=manifest.approved_template_baseline_id
      where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])`, [
      REJECTED_INTERMEDIATE_RELEASE_ID, TARGETS.map((target) => target.catalogId),
    ])).rows as Json[];
    invariant(intermediateRows.length === TARGETS.length,
      `STOP_FORMWORK_FAMILY_INTERMEDIATE_TARGETS:${intermediateRows.length}`);
    const intermediateByCatalog = new Map(
      intermediateRows.map((target) => [String(target.catalog_id), target]),
    );
    invariant(intermediateRows.every((target) => {
      const currentTarget = targetByCatalog.get(String(target.catalog_id));
      return currentTarget
        && target.supersedes_baseline_id === currentTarget.approved_template_baseline_id
        && target.content_status === "CANDIDATE_READY"
        && target.content_gate_status === "GREEN"
        && Number(target.parameters) === 52 && Number(target.formulas) === 20
        && Number(target.resources) === 24 && Number(target.bindings) === 9;
    }), `STOP_FORMWORK_FAMILY_INTERMEDIATE_LINEAGE:${JSON.stringify(intermediateRows)}`);
    const inheritedFullScopeOpenCatalogIds = Array.isArray(predecessor.metadata?.fullScopeOpenCatalogIds)
      ? predecessor.metadata.fullScopeOpenCatalogIds.map(String)
      : [];
    const remainingFullScopeOpenCatalogIds = inheritedFullScopeOpenCatalogIds.filter(
      (catalogId: string) => !TARGETS.some((target) => target.catalogId === catalogId),
    );
    const nextCounts = {
      definitions: Number(predecessor.definition_count),
      parameters: Number(predecessor.parameter_count),
      formulas: Number(predecessor.formula_count),
      resources: Number(predecessor.resource_row_count),
    };
    for (const target of TARGETS) {
      const old = targetByCatalog.get(target.catalogId)!;
      nextCounts.parameters += formworkFramiXlifeParametersForCatalogR1(target.catalogId).length
        - Number(old.parameters);
      nextCounts.formulas += 20 - Number(old.formulas);
      nextCounts.resources += formworkFramiXlifeResourcesForCatalogR1(target.catalogId).length
        - Number(old.resources);
    }
    const existing = (await client.query(
      "select id,status,activated_at from public.estimate_definition_release where id=$1",
      [releaseId],
    )).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.status === "prepared" && existing.activated_at == null,
        "STOP_FORMWORK_FAMILY_EXISTING_SUCCESSOR_STATE_DRIFT");
      const audit = (await client.query(`select count(*)::int identities,
          count(*) filter(where catalog_id=any($2::text[]) and definition_version_id=any($3::uuid[]))::int replaced
        from public.estimate_cumulative_manifest_entry where release_id=$1`, [
        releaseId, TARGETS.map((target) => target.catalogId), [...definitionIds.values()],
      ])).rows[0] as Json;
      receipt = {
        status: "GREEN_FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_FAMILY_ALREADY_PREPARED_NOT_ACTIVE",
        idempotent: true,
        successor: { releaseId, searchReleaseId, releaseKey },
        coreAcceptance,
        audit,
      };
    } else if (!APPLY) {
      receipt = {
        status: "GREEN_FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_FAMILY_PRECHECK_NO_MUTATION",
        idempotent: false,
        predecessor: {
          releaseId: PREDECESSOR_RELEASE_ID,
          searchReleaseId: PREDECESSOR_SEARCH_RELEASE_ID,
          representativeDefinitionId: representative.id,
          representativeShape,
          targetShapes: targetRows.map((target) => ({
            catalogId: target.catalog_id,
            definitionId: target.definition_version_id,
            parameters: Number(target.parameters),
            formulas: Number(target.formulas),
            resources: Number(target.resources),
            bindings: Number(target.bindings),
          })),
          rejectedIntermediateReleaseId: REJECTED_INTERMEDIATE_RELEASE_ID,
          intermediateTargets: intermediateRows.map((target) => ({
            catalogId: target.catalog_id,
            definitionId: target.definition_version_id,
            baselineId: target.approved_template_baseline_id,
            supersedesBaselineId: target.supersedes_baseline_id,
          })),
        },
        successor: {
          releaseId,
          searchReleaseId,
          releaseKey,
          targetCount: TARGETS.length,
          definitionIds: Object.fromEntries(definitionIds),
          baselineIds: Object.fromEntries(baselineIds),
          nextCounts,
        },
        coreAcceptance,
      };
    } else {
      const representativeParameters = (await client.query(
        "select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal",
        [representative.id],
      )).rows as Json[];
      const representativeFormulas = (await client.query(
        "select * from public.estimate_formula_graph where definition_version_id=$1 order by formula_id",
        [representative.id],
      )).rows as Json[];
      const representativeResources = (await client.query(
        "select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal",
        [representative.id],
      )).rows as Json[];
      const representativeBindings = (await client.query(`select binding.*,resource.row_id
        from public.estimate_work_normative_binding binding
        join public.estimate_resource_spec resource on resource.id=binding.resource_spec_id
        where binding.definition_version_id=$1 order by resource.ordinal`, [
        representative.id,
      ])).rows as Json[];
      const representativeBaseline = (await client.query(
        "select * from public.estimate_approved_template_baseline where id=$1",
        [representative.approved_template_baseline_id],
      )).rows[0] as Json;
      const representativePassport = (await client.query(
        "select * from public.estimate_content_passport_r3 where definition_version_id=$1",
        [representative.id],
      )).rows[0] as Json;
      invariant(representativeBaseline && representativePassport,
        "STOP_FORMWORK_FAMILY_REPRESENTATIVE_EVIDENCE_MISSING");
      const representativeParameterById = new Map(
        representativeParameters.map((parameter) => [String(parameter.parameter_id), parameter]),
      );
      const representativeResourceByRowId = new Map(
        representativeResources.map((resource) => [String(resource.row_id), resource]),
      );

      const plannedTargets = [];
      for (const target of TARGETS) {
        const old = targetByCatalog.get(target.catalogId)!;
        const intermediate = intermediateByCatalog.get(target.catalogId)!;
        const definitionId = definitionIds.get(target.catalogId)!;
        const baselineId = baselineIds.get(target.catalogId)!;
        const nextDefinitionVersion = Number((await client.query(
          "select coalesce(max(definition_version),0)::int+1 value from public.estimate_definition_version where catalog_id=$1",
          [target.catalogId],
        )).rows[0].value);
        const fixture = formworkFramiXlifeSlabFoundationAcceptanceInputR1(target.contextKey);
        const parameterDeclarations = formworkFramiXlifeParametersForCatalogR1(target.catalogId);
        const resourceDeclarations = formworkFramiXlifeResourcesForCatalogR1(target.catalogId);
        const targetParameters = parameterDeclarations.map((declaration) => {
          const stored = representativeParameterById.get(declaration.parameter_id);
          invariant(stored, `STOP_FORMWORK_FAMILY_PARAMETER_TEMPLATE_MISSING:${declaration.parameter_id}`);
          return {
            ...stored,
            parameter_id: declaration.parameter_id,
            ordinal: declaration.ordinal,
            value_type: declaration.value_type,
            unit_id: declaration.unit_id,
            title_ru: declaration.title_ru,
            required: declaration.required,
            constraints_json: declaration.constraints_json,
            truth_metadata: declaration.truth_metadata,
          };
        });
        const targetResources = resourceDeclarations.map((declaration) => {
          const stored = representativeResourceByRowId.get(declaration.row_id);
          invariant(stored, `STOP_FORMWORK_FAMILY_RESOURCE_TEMPLATE_MISSING:${declaration.row_id}`);
          return {
            ...stored,
            row_id: declaration.row_id,
            ordinal: declaration.ordinal,
            section: declaration.section,
            category: declaration.category,
            title_ru: declaration.title_ru,
            unit_id: declaration.unit_id,
            formula_id: declaration.formula_id,
            inclusion_ast: declaration.inclusion_ast,
            resource_graph: declaration.resource_graph,
            procurement_eligible: declaration.procurement_eligible,
            cost_owner_id: declaration.cost_owner_id,
            source_metadata: declaration.source_metadata,
          };
        });
        invariant(targetParameters.length === 52 && targetResources.length === 24,
          `STOP_FORMWORK_FAMILY_SPECIALIZED_SHAPE:${target.catalogId}:${targetParameters.length}:${targetResources.length}`);
        const targetDefinitionSha256 = sha256({
          representativeDefinitionSha256: representative.definition_sha256,
          contract: CONTRACT,
          targetCatalogId: target.catalogId,
          titleRu: target.titleRu,
          parameters: parameterDeclarations,
          resources: resourceDeclarations,
          fixture,
        });
        const targetEvidenceSha256 = sha256({
          contract: CONTRACT,
          target,
          fixture,
          coreAcceptance: coreAcceptance.targetResults.find(
            (result: Json) => result.catalogId === target.catalogId,
          ),
        });
        const plan = createCanonicalDefinitionClonePlan({
          contract: CONTRACT,
          definition: {
            id: definitionId,
            releaseId,
            catalogId: target.catalogId,
            definitionVersion: nextDefinitionVersion,
            passport: {
              ...representative.passport,
              catalogId: target.catalogId,
              canonicalRuName: target.titleRu,
              workKey: target.catalogId.split(":").at(-1),
              physicalResultRu: `Полная проектная смета съёмной опалубки плитного фундамента: ${target.contextRu}`,
            },
            applicability: {
              ...representative.applicability,
              slabFoundationContextKey: target.contextKey,
              slabFoundationContextRu: target.contextRu,
              projectLayoutRequired: true,
              projectScheduleRequired: true,
              contextMultiplierApplied: false,
            },
            definitionSha256: targetDefinitionSha256,
            sourceMetadata: {
              ...representative.source_metadata,
              contract: CONTRACT,
              predecessorDefinitionId: intermediate.definition_version_id,
              measurementOnlyPredecessorDefinitionId: old.definition_version_id,
              rejectedIntermediateReleaseId: REJECTED_INTERMEDIATE_RELEASE_ID,
              representativeDefinitionId: representative.id,
              representativeCatalogId: REPRESENTATIVE_CATALOG_ID,
              acceptanceEvidenceSha256: targetEvidenceSha256,
              fullQuantityScope: true,
              priceState: "PARTIAL_NEEDS_PRICE",
            },
          },
          representative: {
            parameters: targetParameters,
            formulas: representativeFormulas,
            resources: targetResources,
            bindings: representativeBindings,
            baseline: representativeBaseline,
            passport: representativePassport,
          },
          parameterTruthMetadata: (parameter) => ({
            ...parameter.truth_metadata,
            contract: CONTRACT,
            semantic_parameter_key: `${target.catalogId}:${parameter.parameter_id}`,
          }),
          resourceId: (resource) => uuid(
            `${CONTRACT}:${fingerprint}:${target.catalogId}:resource:${resource.row_id}`,
          ),
          resourceSemanticOwner: (resource) => `${target.catalogId}:${resource.row_id}`,
          resourceSha256: (resource) => sha256({
            contract: CONTRACT,
            targetCatalogId: target.catalogId,
            resource,
          }),
          baseline: {
            id: baselineId,
            key: `${CONTRACT}:${fingerprint.slice(0, 16)}:${target.catalogId}`,
            sourceDefinitionVersionId: intermediate.definition_version_id,
            validationScenarioRefs: [{
              scenario: `FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_${target.contextKey.toUpperCase()}`,
              fixture,
              targetEvidenceSha256,
            }],
            acceptanceEvidenceSha256: targetEvidenceSha256,
            acceptedReleaseId: releaseId,
            supersedesBaselineId: intermediate.approved_template_baseline_id,
          },
          passport: {
            physicalResultRu: target.titleRu,
            excludedScopeRu: [
              "универсальная ведомость на м²",
              "автоматическая оборачиваемость",
              "неподтверждённые цены",
              "другие типы фундаментных элементов",
            ],
            decision: {
              ...representativePassport.decision,
              status: "GREEN",
              allowed: true,
              waveContract: CONTRACT,
              quantityScope: "FULL",
              priceState: "PARTIAL_NEEDS_PRICE",
              activationAllowed: false,
              productionEligible: false,
            },
            payloadSha256: sha256({ targetDefinitionSha256, targetEvidenceSha256 }),
            sourceHead: head,
            sourceTree: tree,
          },
          bindingApplicability: (binding) => ({
            ...binding.applicability,
            slab_foundation_context_key: target.contextKey,
          }),
          expectedNormativeBindingCount: 9,
        });
        plannedTargets.push({
          target,
          old,
          intermediate,
          definitionId,
          baselineId,
          nextDefinitionVersion,
          targetDefinitionSha256,
          targetEvidenceSha256,
          plan,
        });
      }
      const publisherPreflight = await preflightCanonicalDefinitionPublishPlans(
        client,
        plannedTargets.map((target) => target.plan),
      );

      await client.query("begin");
      await client.query("set local lock_timeout='5s'");
      await client.query("set local statement_timeout='600s'");
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [CONTRACT]);
      try {
        await client.query(`insert into public.estimate_definition_release(
            id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
            definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,parameter_count,formula_count)
          select $1,$2,schema_version,'draft',$3,$4,$5,$6,$7,metadata||$8::jsonb,$9,$10,$11,$12
          from public.estimate_definition_release where id=$9`, [
          releaseId, releaseKey, head, tree, sha256(`${CONTRACT}:${fingerprint}:draft`),
          nextCounts.definitions, nextCounts.resources,
          JSON.stringify({
            contract: CONTRACT,
            masterSha256: MASTER_SHA256,
            lifecycle: "DRAFT_FORWARD_ONLY",
            replacedDefinitionCount: TARGETS.length,
            representativeCatalogId: REPRESENTATIVE_CATALOG_ID,
            activationAllowed: false,
            productionEligible: false,
            fullQuantityScope: true,
            priceState: "PARTIAL_NEEDS_PRICE",
            fullScopeOpenCatalogIds: remainingFullScopeOpenCatalogIds,
            resolvedFullScopeCatalogIds: TARGETS.map((target) => target.catalogId),
            resolvedRejectedIntermediateReleaseId: REJECTED_INTERMEDIATE_RELEASE_ID,
          }),
          PREDECESSOR_RELEASE_ID, sha256({ contract: CONTRACT, fingerprint }),
          nextCounts.parameters, nextCounts.formulas,
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
          releaseId, CONTRACT, PREDECESSOR_RELEASE_ID,
        ]);
        const perTargetAudit: Json[] = [];
        for (const planned of plannedTargets) {
          const persisted = await publishCanonicalDefinitionDraft(client, planned.plan);
          await client.query(`update public.estimate_cumulative_manifest_entry set
              definition_version_id=$3,source_batch=$4,source_release_id=$1,publication_state='CANONICAL_SUCCESSOR',
              approved_template_baseline_id=$5,baseline_ready=true,scenario_ready=true,definition_hash=$6,
              entry_sha256=$7,runtime_publication_state='CANDIDATE'
            where release_id=$1 and catalog_id=$2`, [
            releaseId, planned.target.catalogId, planned.definitionId, CONTRACT, planned.baselineId,
            planned.targetDefinitionSha256,
            sha256({ contract: CONTRACT, releaseId, catalogId: planned.target.catalogId,
              definitionId: planned.definitionId, baselineId: planned.baselineId,
              targetDefinitionSha256: planned.targetDefinitionSha256 }),
          ]);
          perTargetAudit.push({
            catalogId: planned.target.catalogId,
            contextKey: planned.target.contextKey,
            predecessorDefinitionId: planned.intermediate.definition_version_id,
            measurementOnlyPredecessorDefinitionId: planned.old.definition_version_id,
            predecessorBaselineId: planned.intermediate.approved_template_baseline_id,
            definitionId: planned.definitionId,
            baselineId: planned.baselineId,
            definitionVersion: planned.nextDefinitionVersion,
            targetDefinitionSha256: planned.targetDefinitionSha256,
            targetEvidenceSha256: planned.targetEvidenceSha256,
            publisherPersistedSelfAudit: persisted,
          });
        }
        const search = await cloneSearch(client, {
          releaseId, searchReleaseId, releaseKey, head, tree, fingerprint, definitionIds,
        });
        const manifestAudit = (await client.query(`select count(*)::int identities,
            count(*) filter(where catalog_id=any($2::text[]) and definition_version_id=any($3::uuid[]))::int replaced,
            encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot
          from public.estimate_cumulative_manifest_entry where release_id=$1`, [
          releaseId, TARGETS.map((target) => target.catalogId), [...definitionIds.values()],
        ])).rows[0] as Json;
        const targetAudit = (await client.query(`select definition.id definition_id,
            (select count(*)::int from public.estimate_parameter_definition parameter
              where parameter.definition_version_id=definition.id) parameters,
            (select count(*)::int from public.estimate_formula_graph formula
              where formula.definition_version_id=definition.id) formulas,
            (select count(*)::int from public.estimate_resource_spec resource
              where resource.definition_version_id=definition.id) resources,
            (select count(*)::int from public.estimate_work_normative_binding binding
              where binding.definition_version_id=definition.id) binding_rows,
            (select count(*)::int from public.estimate_resource_spec resource
              where resource.definition_version_id=definition.id and resource.procurement_eligible) procurement_rows
          from public.estimate_definition_version definition
          where definition.id=any($1::uuid[])
          order by definition.id`, [[...definitionIds.values()]])).rows as Json[];
        const searchAudit = (await client.query(`select count(*)::int targets,
            count(*) filter(where required_inputs_count=52 and selectable and definition_version_id=any($3::uuid[]))::int valid
          from public.estimate_search_document
          where search_release_id=$1 and catalog_id=any($2::text[])`, [
          searchReleaseId, TARGETS.map((target) => target.catalogId), [...definitionIds.values()],
        ])).rows[0] as Json;
        invariant(Number(manifestAudit.identities) === 10_331 && Number(manifestAudit.replaced) === TARGETS.length,
          `STOP_FORMWORK_FAMILY_MANIFEST_AUDIT:${JSON.stringify(manifestAudit)}`);
        invariant(targetAudit.length === TARGETS.length && targetAudit.every((target) =>
          Number(target.parameters) === 52 && Number(target.formulas) === 20
          && Number(target.resources) === 24 && Number(target.binding_rows) === 9
          && Number(target.procurement_rows) === 14),
        `STOP_FORMWORK_FAMILY_TARGET_AUDIT:${JSON.stringify(targetAudit)}`);
        invariant(Number(searchAudit.targets) === TARGETS.length && Number(searchAudit.valid) === TARGETS.length,
          `STOP_FORMWORK_FAMILY_SEARCH_AUDIT:${JSON.stringify(searchAudit)}`);
        await client.query(`update public.estimate_definition_release
          set source_manifest_sha256=$2,status='prepared',sealed_at=clock_timestamp(),
            metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
          releaseId, manifestAudit.snapshot,
          JSON.stringify({
            lifecycle: "PREPARED_NOT_ACTIVE",
            searchReleaseId,
            searchSnapshotSha256: search.snapshot_sha256,
            representativeCatalogId: REPRESENTATIVE_CATALOG_ID,
            slabFoundationFamilyTargetCount: FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_TARGETS.length,
            scaledTargetCount: TARGETS.length,
            sourceCoreAcceptanceSha256: coreAcceptance.deterministicSha256,
            priceState: "PARTIAL_NEEDS_PRICE",
            fullScopeOpenCatalogIds: remainingFullScopeOpenCatalogIds,
            resolvedFullScopeCatalogIds: TARGETS.map((target) => target.catalogId),
            resolvedRejectedIntermediateReleaseId: REJECTED_INTERMEDIATE_RELEASE_ID,
          }),
        ]);
        await client.query("commit");
        receipt = {
          status: "GREEN_FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_FAMILY_PREPARED_NOT_ACTIVE",
          idempotent: false,
          predecessor: {
            releaseId: PREDECESSOR_RELEASE_ID,
            searchReleaseId: PREDECESSOR_SEARCH_RELEASE_ID,
            representativeDefinitionId: representative.id,
            targetShapes: targetRows.map((target) => ({
              catalogId: target.catalog_id,
              definitionId: target.definition_version_id,
              parameters: Number(target.parameters),
              formulas: Number(target.formulas),
              resources: Number(target.resources),
              bindings: Number(target.bindings),
            })),
            rejectedIntermediateReleaseId: REJECTED_INTERMEDIATE_RELEASE_ID,
            intermediateTargets: intermediateRows.map((target) => ({
              catalogId: target.catalog_id,
              definitionId: target.definition_version_id,
              baselineId: target.approved_template_baseline_id,
              supersedesBaselineId: target.supersedes_baseline_id,
            })),
          },
          successor: {
            releaseId,
            searchReleaseId,
            releaseKey,
            targetCount: TARGETS.length,
            nextCounts,
            targets: perTargetAudit,
          },
          coreAcceptance,
          publisherPreflight,
          audit: { manifest: manifestAudit, target: targetAudit, search: { ...search, ...searchAudit } },
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
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    source: { branch: EXPECTED_BRANCH, head, tree, fingerprint, sourceHashes },
    masterSha256: MASTER_SHA256,
    representativeCatalogId: REPRESENTATIVE_CATALOG_ID,
    scaledTargetCatalogIds: TARGETS.map((target) => target.catalogId),
    systemProfileId: FORMWORK_FRAMI_XLIFE_SYSTEM_PROFILE_ID,
    ...receipt!,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  const sealed = { ...body, receiptSha256: sha256(body) };
  if (APPLY && !receipt!.idempotent) {
    atomicJson(resolve(OUTPUT_ROOT, `01_FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_FAMILY_${head}.json`), sealed);
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
      owner: "EXACT_FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_FAMILY_SUCCESSOR",
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
