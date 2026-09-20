import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  PORCELAIN_FLOOR_TILE_INSTALLATION_NORM_ID,
  PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_ID,
  PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_METADATA,
  PORCELAIN_FLOOR_TILE_INSTALLATION_ACCEPTANCE_INPUT,
  PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID,
  PORCELAIN_FLOOR_TILE_INSTALLATION_FORMULAS,
  PORCELAIN_FLOOR_TILE_INSTALLATION_PARAMETERS,
  PORCELAIN_FLOOR_TILE_INSTALLATION_RESOURCES,
  PORCELAIN_FLOOR_TILE_INSTALLATION_SHORT_INPUT,
  compilePorcelainFloorTileInstallationR1,
} from "../../../src/lib/estimate/v4/porcelainFloorTileInstallationR1";
import {
  createCanonicalDefinitionClonePlan,
  preflightCanonicalDefinitionPublishPlans,
  publishCanonicalDefinitionDraft,
  resolveCanonicalApprovedBaselineLeaf,
} from "./canonicalDefinitionPublisherR1";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.master-porcelain-floor-tile-installation-successor.v1";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const MASTER_PATH = resolve(process.env.R4A13_MASTER_PATH
  ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (23).md");
const MASTER_SHA256 = process.env.R4A13_MASTER_SHA256
  ?? "f02577c56d436913fd347a480a9ec45b25d25f25cc2b31eae2d0c2ae29c79fde";
const PARENT_RELEASE_ID = process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
  ?? "f5e4e0dd-47a4-5abd-b234-589a165d2652";
const PARENT_SEARCH_RELEASE_ID = process.env.R4A13_PARENT_SEARCH_RELEASE_ID
  ?? "7f0404d4-96a1-5e12-9677-74342af4de66";
const CURRENT_RELEASE_PATH = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const OUTPUT_ROOT = resolve(process.env.R4A13_OUTPUT_ROOT
  ?? ".release-runtime/r4a13-6/s19-first-estimate/master-porcelain-floor-tile-installation-successor-v1");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const APPLY = process.argv.includes("--apply");
const ALLOW_HASHED_DIRTY_SOURCE = process.env.R4A13_ALLOW_HASHED_DIRTY_SOURCE === "true";
const CONTENT_PASSPORT_CONTRACT = "real-professional-estimates-r3.content-passport.v1";
const BASELINE_CONTRACT = "APPROVED_TEMPLATE_BASELINE_R54_V1";
const SOURCE_PATHS = [
  "src/lib/estimate/v4/porcelainFloorTileInstallationR1.ts",
  "tests/estimateNorms/porcelainFloorTileInstallationR1.contract.test.ts",
  "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
  "scripts/estimate/r4a13/prepareMasterPorcelainFloorTileInstallationSuccessor.ts",
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
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function exactDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
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

async function verifyCore(): Promise<Json> {
  const short = await compilePorcelainFloorTileInstallationR1({
    ...PORCELAIN_FLOOR_TILE_INSTALLATION_SHORT_INPUT,
  });
  const complete = await compilePorcelainFloorTileInstallationR1({
    ...PORCELAIN_FLOOR_TILE_INSTALLATION_ACCEPTANCE_INPUT,
  });
  const conditional = await compilePorcelainFloorTileInstallationR1({
    ...PORCELAIN_FLOOR_TILE_INSTALLATION_ACCEPTANCE_INPUT,
    floor_leveling_mode: "REQUIRED",
    floor_leveling_compound_designation: "Выравнивающий состав по обследованию основания",
    floor_leveling_compound_mass_kg: 1200,
    floor_waterproofing_mode: "REQUIRED",
    floor_waterproofing_designation: "Гидроизоляционная система по проекту мокрой зоны",
    floor_waterproofing_area_m2: 120,
  });
  const shortNeeds = new Map(short.preliminaryNeeds.map((need) => [need.row_id, need]));
  invariant(short.rows.length === 1
    && short.rows.find((row) => row.row_id === "rc09:porcelain_floor_tile_lay")?.quantity === "120"
    && short.preliminaryNeeds.length === 8,
    "STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_SHORT_COMPOSITION");
  for (const rowId of [
    "rc09:porcelain_tile_600x600",
    "rc09:c2te_s1_tile_adhesive",
    "rc09:cement_grout_2mm_joint",
    "rc09:tile_leveling_consumable_clip_2mm",
    "rc09:neutral_silicone_movement_joint",
    "rc09:wet_tile_saw",
    "rc09:floor_leveling_compound",
    "rc09:floor_waterproofing",
  ]) {
    invariant(shortNeeds.has(rowId), `STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_SHORT_NEED:${rowId}`);
  }
  invariant(complete.preliminaryNeeds.length === 0 && complete.rows.length === 7
    && complete.rows.find((row) => row.row_id === "rc09:porcelain_tile_600x600")?.quantity === "129.6"
    && complete.rows.find((row) => row.row_id === "rc09:tile_leveling_consumable_clip_2mm")?.quantity === "1380",
    "STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_COMPLETE_FIXTURE");
  invariant(conditional.preliminaryNeeds.length === 0 && conditional.rows.length === 9,
    "STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_CONDITIONAL_FIXTURE");
  const serialized = JSON.stringify({ short, complete, conditional });
  invariant(!/(generic.tile.leveling.system.m2|unconfirmed.floor.screed)/iu.test(
    [...short.preliminaryNeeds, ...complete.rows, ...conditional.rows]
      .map((row) => `${row.row_id} ${row.title_ru}`).join(" | "),
  ), "STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_ADJACENT_SCOPE");
  return {
    status: "GREEN_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_CORE",
    short: {
      rowCount: short.rows.length,
      preliminaryNeedCount: short.preliminaryNeeds.length,
      knownAreaM2: PORCELAIN_FLOOR_TILE_INSTALLATION_SHORT_INPUT.area_m2,
      visibleRowIds: short.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: short.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: sha256(serialized),
  };
}

async function cloneSearch(client: Client, input: Readonly<{
  releaseId: string;
  searchReleaseId: string;
  releaseKey: string;
  head: string;
  tree: string;
  fingerprint: string;
  definitionId: string;
}>): Promise<Json> {
  await client.query(`insert into public.estimate_search_index_release(
      id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,
      source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata)
    select $1,$2,'draft',taxonomy_version,group_relation_version,ranking_contract_version,
      $3,$4,$5,global_count,external_count,discovered_count,
      metadata||jsonb_build_object('contract',$6::text,'parentSearchReleaseId',$7::uuid::text,
        'definitionReleaseId',$8::uuid::text,'sourceFingerprint',$9::text,
        'lifecycle','PREPARED_NOT_ACTIVE','activationAllowed',false,'productionEligible',false,

        'masterPorcelainFloorTileInstallationTargetCount',1)
    from public.estimate_search_index_release where id=$7`, [
    input.searchReleaseId,
    `${input.releaseKey}-search`,
    input.head,
    input.tree,
    sha256(`${input.searchReleaseId}:draft`),
    CONTRACT,
    PARENT_SEARCH_RELEASE_ID,
    input.releaseId,
    input.fingerprint,
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
        'parentSearchReleaseId',$4::uuid::text,'definitionReleaseId',$2::uuid::text,
        'sourceFingerprint',$5::text),
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

  const canonicalName = "Укладка керамогранита 600×600 мм на пол со швом 2 мм";
  const aliases = [
    "укладка керамогранита на пол",
    "напольная плитка 600×600 со швом 2 мм",
    "керамогранит на клей C2TE S1",
    "porcelain floor tile installation",
  ];
  const normalizedAliases = aliases.map(normalizeSearchText);
  const normalizedName = normalizeSearchText(canonicalName);
  const searchTerms = [normalizedName, ...normalizedAliases, "керамогранит плитка 600 600 клей C2TE S1 затирка клипса силикон водяная резка"].filter(
    (value, index, values) => values.indexOf(value) === index,
  );
  const updated = await client.query(`update public.estimate_search_document set
      primary_uom='m2',canonical_name_ru=$3,aliases=$4::text[],
      short_scope_ru=$5,key_distinguishing_parameters=$6::jsonb,required_inputs_count=4,
      clarification_fields=$7::jsonb,included_boundaries=$8::jsonb,excluded_boundaries=$9::jsonb,
      normalized_canonical_name=$10,normalized_aliases=$11::text[],normalized_search_terms=$12::text[],
      normalized_search_blob=$13,definition_release_id=$2,definition_version_id=$14,
      source_provenance=source_provenance||$15::jsonb,
      document_sha256=encode(extensions.digest(convert_to(
        $3||':'||$2::uuid::text||':'||$14::uuid::text||':'||$16,'UTF8'),'sha256'),'hex')
    where search_release_id=$1 and catalog_id=$17`, [
    input.searchReleaseId,
    input.releaseId,
    canonicalName,
    aliases,
    "Укладка напольного керамогранита 600×600 мм со швом 2 мм; известная площадь, формат и шов сразу дают объём работы, а закупочные количества плиточной системы, швов и резки уточняются по проекту, продуктам и ППР.",
    JSON.stringify(["area_m2", "tile_length_mm", "tile_width_mm", "joint_width_mm"]),
    JSON.stringify(["porcelain_tile_quantity_m2", "tile_adhesive_mass_kg", "tile_grout_mass_kg", "tile_clip_quantity_piece", "movement_joint_silicone_volume_l", "wet_tile_saw_machine_h", "floor_leveling_mode", "floor_waterproofing_mode"]),
    JSON.stringify(["укладка керамогранита 600×600 мм со швом 2 мм", "плитка по утверждённой раскладке", "клей C2TE S1 и затирка по продуктовой системе", "расходуемые клипсы по схеме укладки", "нейтральный силикон по плану деформационных швов", "водяная резка по ППР", "условные выравнивание основания и гидроизоляция"]),
    JSON.stringify(["универсальный площадной ряд системы выравнивания плитки", "неподтверждённая стяжка или выравнивание", "неподтверждённая гидроизоляция", "автоматические нормы расхода плитки, клея, затирки, клипс, силикона или станка"]),
    normalizedName,
    normalizedAliases,
    searchTerms,
    searchTerms.join(" "),
    input.definitionId,
    JSON.stringify({
      contract: CONTRACT,
      exactPorcelainFloorTileInstallationOwner: true,
      knownGeometryFirstEstimate: true,
      exactProjectAndMethodPackageRequiredForNonGeometricQuantities: true,
      conditionalTechnologyFailClosed: true,
      activationAllowed: false,
      productionEligible: false,
    }),
    input.fingerprint,
    PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID,
  ]);
  invariant(updated.rowCount === 1, "STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_SEARCH_TARGET_UPDATE");

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
      masterPorcelainFloorTileInstallationTargetCount: 1,
      masterPorcelainFloorTileInstallationCatalogId: PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID,
    }),
  ]);
  return snapshot;
}

async function auditState(
  client: Client,
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
    releaseId, PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID, definitionId,
  ])).rows[0] as Json;
  const target = (await client.query(`select manifest.catalog_id,manifest.definition_version_id::text,
      manifest.source_batch,manifest.runtime_publication_state,definition.definition_version,
      definition.content_status,definition.content_gate_status,passport.decision,
      (select count(*)::int from public.estimate_parameter_definition p where p.definition_version_id=definition.id) parameters,
      (select count(*)::int from public.estimate_formula_graph f where f.definition_version_id=definition.id) formulas,
      (select count(*)::int from public.estimate_resource_spec r where r.definition_version_id=definition.id) resources,
      (select count(*)::int from public.estimate_resource_spec r where r.definition_version_id=definition.id
        and (lower(r.row_id) similar to '%(generic.tile.leveling.system.m2|unconfirmed.floor.screed)%'
          or lower(r.title_ru) similar to '%(универсальн.*систем.*выравнив.*плит|неподтвержд.*стяж)%')) forbidden_adjacent_rows
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
    join public.estimate_content_passport_r3 passport on passport.definition_version_id=definition.id
    where manifest.release_id=$1 and manifest.catalog_id=$2`, [
    releaseId, PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID,
  ])).rows[0] as Json;
  const search = (await client.query(`select release.status release_status,document.catalog_id,
      document.canonical_name_ru,document.primary_uom,document.definition_release_id::text,
      document.definition_version_id::text,document.selectable,document.adjudication_class,
      (select count(*)::int from public.estimate_search_document d where d.search_release_id=$1) documents,
      release.snapshot_sha256
    from public.estimate_search_index_release release
    join public.estimate_search_document document on document.search_release_id=release.id
    where release.id=$1 and document.catalog_id=$2`, [
    searchReleaseId, PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID,
  ])).rows[0] as Json;
  return { release, manifest, target, search };
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH,
    "STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_BRANCH_DRIFT");
  invariant(existsSync(MASTER_PATH) && sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256,
    "STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_MASTER_SHA256_DRIFT");
  const dirtySourcePaths = SOURCE_PATHS.filter((path) =>
    git("status", "--short", "--", path) !== "");
  invariant(dirtySourcePaths.length === 0 || ALLOW_HASHED_DIRTY_SOURCE,
    `STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_DIRTY_SOURCE_REQUIRES_EXPLICIT_OPT_IN:${dirtySourcePaths.join(",")}`);
  for (const path of SOURCE_PATHS) {
    invariant(existsSync(resolve(path)), `STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_MISSING:${path}`);
  }

  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const sourceHashes = SOURCE_PATHS.map((path) => ({
    path,
    sha256: sha256(readFileSync(resolve(path))),
    trackedState: git("status", "--short", "--", path) || "CLEAN_AT_HEAD",
  }));
  const coreAcceptance = await verifyCore();
  const parameterRows: Json[] = PORCELAIN_FLOOR_TILE_INSTALLATION_PARAMETERS.map(
    (parameter) => ({ ...parameter }),
  );
  const formulaRows: Json[] = PORCELAIN_FLOOR_TILE_INSTALLATION_FORMULAS.map((formula) => ({
    ...formula,
    ast_sha256: sha256(formula.ast),
  }));
  const resourceRows: Json[] = PORCELAIN_FLOOR_TILE_INSTALLATION_RESOURCES.map((resource) => ({
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
    "STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_PARAMETER_WITHOUT_RESOURCE_CONSUMER");

  const fingerprint = sha256({
    contract: CONTRACT,
    head,
    tree,
    masterSha256: MASTER_SHA256,
    parentReleaseId: PARENT_RELEASE_ID,
    parentSearchReleaseId: PARENT_SEARCH_RELEASE_ID,
    sourceHashes,
    parameters: parameterRows,
    formulas: formulaRows,
    resources: resourceRows,
    coreAcceptance,
  });
  const releaseId = uuid(`${CONTRACT}:${fingerprint}:definition-release`);
  const searchReleaseId = uuid(`${CONTRACT}:${fingerprint}:search-release`);
  const definitionId = uuid(`${CONTRACT}:${fingerprint}:definition`);
  const baselineId = uuid(`${CONTRACT}:${fingerprint}:baseline`);
  const sourceId = uuid(`${CONTRACT}:${PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_ID}:source`);
  const locatorId = uuid(`${CONTRACT}:${PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_ID}:locator`);
  const releaseKey = `${CONTRACT}:${fingerprint.slice(0, 20)}`;
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.productionAccessed === false,
    "STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_CURRENT_PRODUCTION_ACCESS_FLAG");
  invariant(
    (current.definitionReleaseId === PARENT_RELEASE_ID
      && current.searchReleaseId === PARENT_SEARCH_RELEASE_ID)
    || (current.definitionReleaseId === releaseId && current.searchReleaseId === searchReleaseId),
    `STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_POINTER_DRIFT:${current.definitionReleaseId}:${current.searchReleaseId}`,
  );

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "r4-a13-6-master-porcelain-floor-tile-installation-successor",
  });
  await client.connect();
  let receipt: Json;
  try {
    const parent = (await client.query(
      "select * from public.estimate_definition_release where id=$1",
      [PARENT_RELEASE_ID],
    )).rows[0] as Json | undefined;
    invariant(parent?.status === "prepared" && parent.activated_at == null,
      "STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_PARENT_NOT_PREPARED_INACTIVE");
    const parentSearch = (await client.query(
      "select * from public.estimate_search_index_release where id=$1",
      [PARENT_SEARCH_RELEASE_ID],
    )).rows[0] as Json | undefined;
    invariant(parentSearch?.status === "draft",
      "STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_PARENT_SEARCH_NOT_DRAFT");
    const old = (await client.query(`select manifest.*,
        definition.definition_version,definition.source_metadata,
        (select count(*)::int from public.estimate_parameter_definition p where p.definition_version_id=definition.id) parameters,
        (select count(*)::int from public.estimate_formula_graph f where f.definition_version_id=definition.id) formulas,
        (select count(*)::int from public.estimate_resource_spec r where r.definition_version_id=definition.id) resources
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      where manifest.release_id=$1 and manifest.catalog_id=$2`, [
      PARENT_RELEASE_ID, PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID,
    ])).rows[0] as Json | undefined;
    invariant(old && Number(old.parameters) === 1 && Number(old.formulas) === 59
      && Number(old.resources) === 59,
      `STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_PARENT_TARGET_SHAPE:${JSON.stringify(old)}`);
    const lineage = await resolveCanonicalApprovedBaselineLeaf(
      client,
      String(old.approved_template_baseline_id),
      PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID,
    );
    const nextDefinitionVersion = Number((await client.query(
      "select coalesce(max(definition_version),0)::int+1 value from public.estimate_definition_version where catalog_id=$1",
      [PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID],
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
      contract: CONTRACT,
      shortInput: PORCELAIN_FLOOR_TILE_INSTALLATION_SHORT_INPUT,
      acceptanceInput: PORCELAIN_FLOOR_TILE_INSTALLATION_ACCEPTANCE_INPUT,
      coreAcceptance,
      parameterSchemaSha256,
      definitionSchemaSha256,
      lineage,
    });
    const targetDefinitionSha256 = sha256({
      contract: CONTRACT,
      catalogId: PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID,
      parameterSchemaSha256,
      definitionSchemaSha256,
    });
    const baselineRepresentative = {
      parameter_schema_sha256: parameterSchemaSha256,
      input_values: PORCELAIN_FLOOR_TILE_INSTALLATION_ACCEPTANCE_INPUT,
      input_classification: Object.fromEntries(parameterRows.map((parameter) => [
        parameter.parameter_id, "VALIDATION_FIXTURE",
      ])),
      uom_by_parameter: Object.fromEntries(parameterRows.map((parameter) => [
        parameter.parameter_id, parameter.unit_id,
      ])),
      formula_consumer_ids: formulaConsumers,
      resource_consumer_row_ids: resourceConsumers,
      normative_source_ids: Object.fromEntries(parameterRows.map((parameter) => [
        parameter.parameter_id, [PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_ID],
      ])),
      guide_provenance_ru: Object.fromEntries(parameterRows.map((parameter) => [
        parameter.parameter_id,
        String((parameter.truth_metadata.guide as Json).guide_short_ru),
      ])),
      proposal_source_refs: [{
        contract: CONTRACT,
        sourceId: PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_ID,
        sourceKind: "PROJECT_DOCUMENTATION_REQUIRED",
        exactLocator: PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_METADATA.exact_locator,
      }],
      contract_version: BASELINE_CONTRACT,
    };
    const plan = createCanonicalDefinitionClonePlan({
      contract: CONTRACT,
      definition: {
        id: definitionId,
        releaseId,
        catalogId: PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID,
        definitionVersion: nextDefinitionVersion,
        passport: {
          catalogId: PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID,
          canonicalRuName: "Укладка керамогранита 600×600 мм на пол со швом 2 мм",
          workKey: "tile_stone_interior_porcelain_tile_lay_standard",
          physicalResultRu: "Напольный керамогранит 600×600 мм уложен по утверждённой раскладке со швом 2 мм",
          projectSourceId: PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_ID,
        },
        applicability: {
          country: "KG",
          operationClass: "LAY_PORCELAIN_FLOOR_TILE",
          materialSystem: "PROJECT_PORCELAIN_TILE_600X600_C2TE_S1_JOINT_2MM_SYSTEM",
          primaryMeasureParameterId: "area_m2",
          geometryParameters: ["area_m2", "tile_length_mm", "tile_width_mm", "joint_width_mm"],
          projectScheduleRequiredForNonGeometricQuantities: true,
          conditionalScopeFailClosed: true,
          universalProductivityClaimed: false,
          universalConsumptionClaimed: false,
          adjacentFinishLayersExcluded: true,
        },
        definitionSha256: targetDefinitionSha256,
        sourceMetadata: {
          contract: CONTRACT,
          masterSha256: MASTER_SHA256,
          sourceFingerprint: fingerprint,
          sourceId: PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_ID,
          normId: PORCELAIN_FLOOR_TILE_INSTALLATION_NORM_ID,
          knownGeometryFirstEstimate: true,
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

          row_id: "rc09:porcelain_floor_tile_lay",
          locator_id: locatorId,
          applicability: {
            technology_class: "PORCELAIN_FLOOR_TILE_INSTALLATION",
            operation_class: "LAY_PORCELAIN_FLOOR_TILE",
            material_system: "PROJECT_PORCELAIN_TILE_600X600_C2TE_S1_JOINT_2MM_SYSTEM",
            scope_mode: "KNOWN_AREA_AND_DIRECT_PROJECT_PRODUCT_METHOD_QUANTITIES",
            source_id: PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_ID,
            norm_id: PORCELAIN_FLOOR_TILE_INSTALLATION_NORM_ID,
            exact_locator: PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_METADATA.exact_locator,
            universal_productivity_claimed: false,
            universal_consumption_claimed: false,
            area_based_consumption_or_productivity_rates_claimed: false,
            quantity_basis: "KNOWN_FLOOR_AREA_TILE_FORMAT_AND_JOINT_PLUS_APPROVED_LAYOUT_PRODUCT_SYSTEM_SURVEY_METHOD_AND_JOINT_PLANS",
          },
        }],
        baseline: baselineRepresentative,
        passport: {
          contract_version: CONTENT_PASSPORT_CONTRACT,
          included_scope_ru: [
            "укладка напольного керамогранита 600×600 мм со швом 2 мм по известной площади пола",
            "плитка, клей C2TE S1, затирка и расходуемые клипсы только по раскладке и утверждённой продуктовой системе",
            "нейтральный силикон деформационных швов и водяная резка только по плану швов и ППР",
            "выравнивающий состав и гидроизоляция только по отдельным условным проектным ветвям",
          ],
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
        contract: CONTRACT,
        semantic_parameter_key: `${PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID}:${parameter.parameter_id}`,
        formula_consumers: formulaConsumers[parameter.parameter_id],
        resource_branch_consumers: resourceConsumers[parameter.parameter_id],
      }),
      resourceId: (resource) => uuid(
        `${CONTRACT}:${fingerprint}:${PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID}:resource:${resource.row_id}`,
      ),
      resourceSemanticOwner: (resource) =>
        `${PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID}:${resource.row_id}`,
      resourceSha256: (resource) => sha256({
        contract: CONTRACT,
        targetCatalogId: PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID,
        resource,
      }),
      baseline: {
        id: baselineId,
        key: `${CONTRACT}:${fingerprint.slice(0, 16)}:${PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID}`,
        sourceDefinitionVersionId: lineage.definitionVersionId,
        validationScenarioRefs: [{
          scenario: "MASTER_BENCHMARK_11_PORCELAIN_FLOOR_TILE_INSTALLATION",
          shortInput: PORCELAIN_FLOOR_TILE_INSTALLATION_SHORT_INPUT,
          fixture: PORCELAIN_FLOOR_TILE_INSTALLATION_ACCEPTANCE_INPUT,
          acceptanceEvidenceSha256,
          coreAcceptance,
        }],
        acceptanceEvidenceSha256,
        acceptedReleaseId: releaseId,
        supersedesBaselineId: lineage.baselineId,
      },
      passport: {
        physicalResultRu: "Напольный керамогранит 600×600 мм уложен по утверждённой раскладке со швом 2 мм",
        excludedScopeRu: [
          "универсальный площадной ряд системы выравнивания плитки и неподтверждённая стяжка",
          "автоматический запас плитки и расход клея или затирки без утверждённой раскладки и продуктовой системы",
          "автоматическое количество клипс, силикона, машино-часов резки, выравнивания или гидроизоляции",
          "неподтверждённые цены и неуказанные условные элементы",
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
      bindingApplicability: (binding) => ({ ...binding.applicability }),
      expectedNormativeBindingCount: 1,
    });

    const existing = (await client.query(
      "select id,status from public.estimate_definition_release where id=$1",
      [releaseId],
    )).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.status === "prepared",
        "STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_EXISTING_RELEASE_NOT_PREPARED");
      receipt = {
        status: "GREEN_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_PREPARED_NOT_ACTIVE",
        idempotent: true,
        mutationPerformed: false,
        predecessor: { releaseId: PARENT_RELEASE_ID, searchReleaseId: PARENT_SEARCH_RELEASE_ID },
        successor: { releaseId, searchReleaseId, releaseKey, definitionId, baselineId, nextCounts },
        coreAcceptance,
        audit: await auditState(client, releaseId, searchReleaseId, definitionId),
      };
    } else {
      await client.query("begin");
      await client.query("set local lock_timeout='5s'");
      await client.query("set local statement_timeout='600s'");
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [CONTRACT]);
      try {
        await client.query(`insert into public.estimate_normative_source(
            id,source_key,title_ru,authority,official_url,artifact_sha256,effective_from,metadata)
          values($1,$2,$3,$4,null,null,null,$5::jsonb)
          on conflict(source_key) do update set
            title_ru=excluded.title_ru,authority=excluded.authority,
            artifact_sha256=excluded.artifact_sha256,metadata=public.estimate_normative_source.metadata||excluded.metadata`, [
          sourceId,
          PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_ID,
          PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_METADATA.source_title,
          PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_METADATA.source_authority,
          JSON.stringify({
            contract: CONTRACT,
            sourceKind: "PROJECT_DOCUMENTATION_REQUIRED",
            useRestriction: PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_METADATA.use_restriction,
            universalProductivityClaimed: false,
            universalConsumptionClaimed: false,
            activationAllowed: false,
          }),
        ]);
        const actualSourceId = String((await client.query(
          "select id::text from public.estimate_normative_source where source_key=$1",
          [PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_ID],
        )).rows[0].id);
        await client.query(`insert into public.estimate_normative_locator(
            id,source_id,locator_key,locator,excerpt_sha256)
          values($1,$2,$3,$4::jsonb,$5)
          on conflict(source_id,locator_key) do nothing`, [
          locatorId,
          actualSourceId,
          "porcelain-floor-tile-installation-project-package-required-v1",
          JSON.stringify({
            kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
            exactLocator: PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_METADATA.exact_locator,
            geometryInputs: ["area_m2", "tile_length_mm", "tile_width_mm", "joint_width_mm"],
            directScheduleInputs: [
              "porcelain_tile_quantity_m2",
              "tile_adhesive_mass_kg",
              "tile_grout_mass_kg",
              "tile_clip_quantity_piece",
              "movement_joint_silicone_volume_l",
              "wet_tile_saw_machine_h",
            ],
            conditionalInputs: [
              "floor_leveling_mode",
              "floor_waterproofing_mode",
            ],
          }),
          sha256(PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_METADATA.exact_locator),
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
          sha256(`${CONTRACT}:${fingerprint}:draft`),
          nextCounts.definitions,
          nextCounts.resources,
          JSON.stringify({
            contract: CONTRACT,
            masterSha256: MASTER_SHA256,
            lifecycle: "DRAFT_FORWARD_ONLY",
            replacedDefinitionCount: 1,
            masterBenchmarkOrdinal: 11,
            activationAllowed: false,
            productionEligible: false,
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
        const persisted = await publishCanonicalDefinitionDraft(client, plan);
        const manifestUpdate = await client.query(`update public.estimate_cumulative_manifest_entry set
            definition_version_id=$3,source_batch=$4,source_release_id=$1,
            publication_state='CANONICAL_SUCCESSOR',approved_template_baseline_id=$5,
            baseline_ready=true,scenario_ready=true,definition_hash=$6,entry_sha256=$7,
            runtime_publication_state='CANDIDATE'
          where release_id=$1 and catalog_id=$2`, [
          releaseId,
          PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID,
          definitionId,
          CONTRACT,
          baselineId,
          targetDefinitionSha256,
          sha256({
            contract: CONTRACT,
            releaseId,
            catalogId: PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID,
            definitionId,
            baselineId,
            targetDefinitionSha256,
          }),
        ]);
        invariant(manifestUpdate.rowCount === 1, "STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_MANIFEST_UPDATE");
        const searchSnapshot = await cloneSearch(client, {
          releaseId, searchReleaseId, releaseKey, head, tree, fingerprint, definitionId,
        });
        const audit = await auditState(client, releaseId, searchReleaseId, definitionId);
        invariant(Number(audit.manifest.identities) === nextCounts.definitions
          && Number(audit.manifest.replaced) === 1,
        `STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_MANIFEST_AUDIT:${JSON.stringify(audit.manifest)}`);
        invariant(audit.target.content_status === "CANDIDATE_READY"
          && audit.target.content_gate_status === "GREEN"
          && Number(audit.target.parameters) === parameterRows.length
          && Number(audit.target.formulas) === formulaRows.length
          && Number(audit.target.resources) === resourceRows.length
          && Number(audit.target.forbidden_adjacent_rows) === 0,
        `STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_TARGET_AUDIT:${JSON.stringify(audit.target)}`);
        invariant(audit.search.release_status === "draft"
          && audit.search.definition_release_id === releaseId
          && audit.search.definition_version_id === definitionId
          && audit.search.primary_uom === "m2"
          && audit.search.canonical_name_ru
            === "Укладка керамогранита 600×600 мм на пол со швом 2 мм",
        `STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_SEARCH_AUDIT:${JSON.stringify(audit.search)}`);
        const unrelated = (await client.query(`select count(*)::int changed
          from public.estimate_cumulative_manifest_entry parent
          join public.estimate_cumulative_manifest_entry successor using(catalog_id)
          where parent.release_id=$1 and successor.release_id=$2
            and parent.catalog_id<>$3
            and (parent.definition_version_id<>successor.definition_version_id
              or parent.source_batch<>successor.source_batch
              or parent.source_release_id<>successor.source_release_id
              or parent.approved_template_baseline_id<>successor.approved_template_baseline_id
              or parent.runtime_publication_state<>successor.runtime_publication_state)`, [
          PARENT_RELEASE_ID, releaseId, PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID,
        ])).rows[0] as Json;
        invariant(Number(unrelated.changed) === 0,
          `STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_UNRELATED_MANIFEST_DRIFT:${unrelated.changed}`);
        const prepared = await client.query(`update public.estimate_definition_release
          set source_manifest_sha256=$2,status='prepared',sealed_at=clock_timestamp(),
            metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
          releaseId,
          audit.manifest.snapshot,
          JSON.stringify({
            lifecycle: "PREPARED_NOT_ACTIVE",
            searchReleaseId,
            searchSnapshotSha256: searchSnapshot.snapshot_sha256,
            masterPorcelainFloorTileInstallationTargetCount: 1,
            sourceCoreAcceptanceSha256: coreAcceptance.serializedSha256,
            parameterCountPerTarget: parameterRows.length,
            formulaCountPerTarget: formulaRows.length,
            resourceDefinitionCountPerTarget: resourceRows.length,
            priceState: "PARTIAL_NEEDS_PRICE",
          }),
        ]);
        invariant(prepared.rowCount === 1,
          "STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_PREPARED_TRANSITION");
        const terminalAudit = await auditState(client, releaseId, searchReleaseId, definitionId);
        invariant(terminalAudit.release.status === "prepared"
          && terminalAudit.release.activated_at == null,
        `STOP_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_TERMINAL_LIFECYCLE:${JSON.stringify(terminalAudit.release)}`);
        if (APPLY) await client.query("commit");
        else await client.query("rollback");
        receipt = {
          status: APPLY
            ? "GREEN_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_PREPARED_NOT_ACTIVE"
            : "DRY_RUN_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_VALIDATED",
          idempotent: false,
          mutationPerformed: APPLY,
          predecessor: {
            releaseId: PARENT_RELEASE_ID,
            searchReleaseId: PARENT_SEARCH_RELEASE_ID,
            catalogId: PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID,
            definitionId: old.definition_version_id,
            shape: [Number(old.parameters), Number(old.formulas), Number(old.resources)],
          },
          successor: {
            releaseId, searchReleaseId, releaseKey, definitionId, baselineId,
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
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    source: {
      branch: EXPECTED_BRANCH,
      head,
      tree,
      fingerprint,
      sourceHashes,
      hashedDirtySourceAccepted: dirtySourcePaths.length > 0 && ALLOW_HASHED_DIRTY_SOURCE,
    },
    master: { path: MASTER_PATH, sha256: MASTER_SHA256 },
    ...receipt!,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  const sealed = { ...body, receiptSha256: sha256(body) };
  if (APPLY && receipt!.mutationPerformed === true) {
    atomicJson(resolve(OUTPUT_ROOT, "acceptance.json"), sealed);
    atomicJson(resolve(OUTPUT_ROOT, `01_MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_${head}.json`), sealed);
    atomicJson(CURRENT_RELEASE_PATH, {
      ...current,
      definitionReleaseId: releaseId,
      searchReleaseId,
      definitionReleaseStatus: "prepared",
      searchReleaseStatus: "draft",
      definitionSnapshotSha256: receipt!.audit.manifest.snapshot,
      manifestHashChainSha256: receipt!.audit.manifest.snapshot,
      searchHashChainSha256: receipt!.audit.search.snapshot_sha256,
      currentRuntimeDefinitions: receipt!.successor.nextCounts.definitions,
      owner: "MASTER_PORCELAIN_FLOOR_TILE_INSTALLATION_SUCCESSOR",
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
