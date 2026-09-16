import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  BIA_TN10_MASONRY_NORM_ID,
  BIA_TN10_MASONRY_PRODUCT_PROFILE_ID,
  BIA_TN10_MASONRY_SOURCE_ID,
  BIA_TN10_MASONRY_SOURCE_METADATA,
} from "../../../src/lib/estimate/v4/domainFactory";
import {
  MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT,
  MASONRY_BRICK_WALL_BIA_TN10_FORMULAS,
  MASONRY_BRICK_WALL_BIA_TN10_NEUTRAL_CATALOG_IDS,
  MASONRY_BRICK_WALL_BIA_TN10_NORMATIVE_PARAMETER_IDS,
  MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS,
  MASONRY_BRICK_WALL_BIA_TN10_RESOURCES,
  MASONRY_BRICK_WALL_BIA_TN10_TITLE_RU,
} from "../../../src/lib/estimate/v4/masonryBrickWallBiaTn10R1";
import { compileCanonicalEstimateCore } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import {
  createCanonicalDefinitionClonePlan,
  preflightCanonicalDefinitionPublishPlans,
  publishCanonicalDefinitionDraft,
} from "./canonicalDefinitionPublisherR1";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.bia-tn10-masonry-full-family-complete-estimate.v4";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (8).md",
);
const MASTER_SHA256 = "50687aa500c59fc01750f5982c4b152150ad1747d7ac8c607ed1e0ef3ba657f4";
const PARENT_RELEASE_ID = "714aadc0-a593-5759-8a12-1973ce14481e";
const PARENT_SEARCH_RELEASE_ID = "cfb134c3-97e8-50e9-8e72-92905303ee38";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_ROOT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/bia-tn10-masonry-conditional-guard",
);
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const APPLY = process.argv.includes("--apply");
const SOURCE_PATHS = [
  "src/lib/estimate/v4/domainFactory/masonryBiaTn10PhysicalNormV1.ts",
  "src/lib/estimate/v4/masonryBrickWallBiaTn10R1.ts",
  "src/lib/estimate/ownedDomain/masonryBiaTn10ProductionBindingV1.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
  "src/lib/estimate/backendPlatform/canonicalMaterialQuantityProjection.ts",
  "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
  "scripts/estimate/r4a13/prepareBiaTn10MasonryFullFamilySuccessor.ts",
] as const;

const TARGETS = Object.freeze([
  {
    key: "standard",
    catalogId: MASONRY_BRICK_WALL_BIA_TN10_NEUTRAL_CATALOG_IDS[0],
    titleRu: MASONRY_BRICK_WALL_BIA_TN10_TITLE_RU,
    contextRu: "стандартный участок",
  },
  {
    key: "large_area",
    catalogId: MASONRY_BRICK_WALL_BIA_TN10_NEUTRAL_CATALOG_IDS[1],
    titleRu: "Кладка стены большой площади из обожжённого глиняного кирпича по BIA TN 10 Table 4",
    contextRu: "участок большой площади",
  },
  {
    key: "small_area",
    catalogId: MASONRY_BRICK_WALL_BIA_TN10_NEUTRAL_CATALOG_IDS[2],
    titleRu: "Кладка небольшого участка стены из обожжённого глиняного кирпича по BIA TN 10 Table 4",
    contextRu: "небольшой участок",
  },
  {
    key: "technical_room",
    catalogId: MASONRY_BRICK_WALL_BIA_TN10_NEUTRAL_CATALOG_IDS[3],
    titleRu: "Кладка стены технического помещения из обожжённого глиняного кирпича по BIA TN 10 Table 4",
    contextRu: "техническое помещение",
  },
] as const);

const NORMATIVE_PARAMETER_IDS = new Set<string>(MASONRY_BRICK_WALL_BIA_TN10_NORMATIVE_PARAMETER_IDS);
const CONTENT_PASSPORT_CONTRACT = "real-professional-estimates-r3.content-passport.v1";
const BASELINE_CONTRACT = "APPROVED_TEMPLATE_BASELINE_R54_V1";

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

function exactDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `STOP_BIA_FULL_FAMILY_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_BIA_FULL_FAMILY_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
}

function resourceRowType(category: string): string {
  if (category === "construction_work") return "labor";
  if (category === "delivery") return "service";
  return category;
}

function rowQuantity(rows: readonly Json[], rowId: string): number {
  const row = rows.find((candidate) => candidate.row_id === rowId);
  invariant(row, `STOP_BIA_FULL_FAMILY_CORE_ROW_MISSING:${rowId}`);
  return Number(row.quantity);
}

async function verifyThroughExistingCore(): Promise<Json> {
  const compilePersistedPayload = (
    parameters: Record<string, unknown>,
    catalogId: string,
  ) => compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.bia-tn10-db-driven-preflight.r1",
    catalogId,
    primaryMeasureParameterId: "measured_net_brick_wall_area_m2",
    parameterDefinitions: [...MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS],
    formulaDefinitions: [...MASONRY_BRICK_WALL_BIA_TN10_FORMULAS],
    resourceDefinitions: [...MASONRY_BRICK_WALL_BIA_TN10_RESOURCES],
    submittedParameters: parameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 40,
    hashJson: async (value) => sha256(value),
  });
  const targetResults: Json[] = [];
  for (const target of TARGETS) {
    const exact = await compilePersistedPayload(
      { ...MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT },
      target.catalogId,
    );
    const sensitivity = await compilePersistedPayload({
      ...MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT,
      measured_net_brick_wall_area_m2: 100,
      wall_layout_length_m: 44,
      gross_wall_area_and_opening_deductions: "GROSS_M2=110; OPENINGS_M2=10; NET_M2=100",
    }, target.catalogId);
    invariant(exact.rows.length === 18 && exact.preliminaryNeeds.length === 0,
      `STOP_BIA_FULL_FAMILY_CORE_EXACT_ROWS:${target.key}:${exact.rows.length}`);
    invariant(exact.rows.every((row) => row.unit_price == null && row.amount == null),
      `STOP_BIA_FULL_FAMILY_UNKNOWN_PRICE_NOT_NULL:${target.key}`);
    invariant(exact.rows.filter((row) => row.category === "material").length === 4
      && exact.rows.filter((row) => row.category === "construction_work").length === 8
      && exact.rows.filter((row) => row.category === "equipment").length === 2
      && exact.rows.filter((row) => row.category === "service").length === 1
      && exact.rows.filter((row) => row.category === "delivery").length === 3,
    `STOP_BIA_FULL_FAMILY_CORE_CATEGORY_SCOPE:${target.key}`);
    invariant(rowQuantity(exact.rows, "material:bia-tn10:fired-clay-brick") === 5_670
      && rowQuantity(exact.rows, "material:bia-tn10:masonry-mortar") === 1.98
      && rowQuantity(exact.rows, "delivery:bia-tn10:fired-clay-brick") === 330
      && rowQuantity(exact.rows, "delivery:bia-tn10:masonry-mortar") === 90
      && rowQuantity(exact.rows, "delivery:bia-tn10:masonry-waste-haul") === 7.5,
    `STOP_BIA_FULL_FAMILY_CORE_EXACT_QUANTITIES:${target.key}`);
    invariant(rowQuantity(sensitivity.rows, "work:bia-tn10:brick-wall-laying") === 100
      && rowQuantity(sensitivity.rows, "work:bia-tn10:gross-wall-geometry-check") === 110
      && rowQuantity(sensitivity.rows, "delivery:bia-tn10:fired-clay-brick") === 357.5
      && rowQuantity(sensitivity.rows, "delivery:bia-tn10:masonry-mortar") === 100,
    `STOP_BIA_FULL_FAMILY_CORE_SENSITIVITY:${target.key}`);
    targetResults.push({
      catalogId: target.catalogId,
      contextKey: target.key,
      exactRows: exact.rows.length,
      exactIncludedRows: exact.totals.includedRowCount,
      exactUnpricedRows: exact.totals.unpricedRowCount,
      sensitivityNetAreaM2: 100,
      deterministicSha256: sha256({ exact, sensitivity }),
    });
  }
  const negativeCases = [
    {
      patch: { wall_connectors_applicable: true, wall_connector_quantity_piece: 0 },
      expectedCode: "MASONRY_FULL_SCOPE_APPLICABLE_QUANTITY_REQUIRED:wall_connector_quantity_piece",
    },
    {
      patch: { dpc_applicable: false, dpc_area_m2: 1 },
      expectedCode: "MASONRY_FULL_SCOPE_NOT_APPLICABLE_QUANTITY_CONFLICT:dpc_area_m2",
    },
    {
      patch: { wall_layout_length_m: 41 },
      expectedCode: "MASONRY_FULL_SCOPE_GROSS_GEOMETRY_CONFLICT",
    },
  ] as const;
  for (const negative of negativeCases) {
    let rejected = false;
    try {
      await compilePersistedPayload({
        ...MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT,
        ...negative.patch,
      }, TARGETS[0].catalogId);
    } catch (error) {
      rejected = String((error as { code?: unknown })?.code ?? "") === negative.expectedCode;
    }
    invariant(rejected, `STOP_BIA_FULL_FAMILY_NEGATIVE_ACCEPTED:${JSON.stringify(negative)}`);
  }
  return {
    compilerOwner: "compileCanonicalEstimateCore",
    targetCount: targetResults.length,
    parameterCount: MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS.length,
    formulaCount: MASONRY_BRICK_WALL_BIA_TN10_FORMULAS.length,
    resourceDefinitionCount: MASONRY_BRICK_WALL_BIA_TN10_RESOURCES.length,
    exactApplicableRowCount: 18,
    negativeCasesRejected: negativeCases.length,
    targets: targetResults,
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
        'fullBiaTargetCount',$10::int)
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

  const clarificationFields = MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS.map((parameter) => ({
    parameterId: parameter.parameter_id,
    titleRu: parameter.title_ru,
    unitId: parameter.unit_id,
  }));
  for (const target of TARGETS) {
    const aliases = [
      `кирпичная кладка ${target.contextRu}`,
      `полная смета кирпичной стены ${target.contextRu}`,
      `BIA TN 10 Table 4 ${target.contextRu}`,
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
        canonical_name_ru=$3,primary_uom='m2',short_scope_ru=$4,
        included_boundaries=$5::jsonb,excluded_boundaries=$6::jsonb,
        required_inputs_count=$7,clarification_fields=$8::jsonb,
        normative_classifiers=array_append(array_remove(coalesce(normative_classifiers,'{}'::text[]),$9),$9),
        applicability_tags=array_append(array_remove(coalesce(applicability_tags,'{}'::text[]),
          'FULL_QUANTITY_SCOPE_PRICE_PARTIAL'),'FULL_APPLICABLE_SCOPE_PRICE_PARTIAL'),
        source_provenance=source_provenance||jsonb_build_object('productProfileId',$10::text,
          'contextKey',$11::text,'fullApplicableScope',true,'exactApplicableRows',18),
        aliases=$12::text[],normalized_canonical_name=$13,normalized_aliases=$14::text[],
        normalized_search_terms=$15::text[],normalized_search_blob=$16,
        definition_version_id=$17::uuid,
        document_sha256=encode(extensions.digest(convert_to(document_sha256||':'||$3||':'||$17::uuid::text,'UTF8'),'sha256'),'hex')
      where search_release_id=$1 and catalog_id=$2`, [
      input.searchReleaseId,
      target.catalogId,
      target.titleRu,
      `Полная применимая смета кирпичной стены: материалы, работы, оборудование, услуга и логистика; ${target.contextRu}.`,
      JSON.stringify([
        "обожжённый глиняный кирпич и кладочный раствор по выбранной строке BIA TN 10 Table 4",
        "проектные соединители и перемычки",
        "применимые работы, оборудование, инженерная приёмка и три логистических потока",
        "отсечная гидроизоляция, армирование и подмости только по явному условию применимости",
      ]),
      JSON.stringify([
        "AAC и тонкослойный клей",
        "неподтверждённые проектом материалы и операции",
        "цены без коммерческого снимка",
        "высокая нагрузка и влажная зона без отдельного проектного подтверждения",
      ]),
      clarificationFields.length,
      JSON.stringify(clarificationFields),
      BIA_TN10_MASONRY_NORM_ID,
      BIA_TN10_MASONRY_PRODUCT_PROFILE_ID,
      target.key,
      aliases,
      normalizedCanonicalName,
      normalizedAliases,
      normalizedSearchTerms,
      normalizedSearchTerms.join("\u001f"),
      input.definitionIds.get(target.catalogId),
    ]);
    invariant(updated.rowCount === 1, `STOP_BIA_FULL_FAMILY_SEARCH_TARGET_MISSING:${target.catalogId}`);
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
      fullBiaTargetCount: TARGETS.length,
      parameterCountPerTarget: MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS.length,
      formulaCountPerTarget: MASONRY_BRICK_WALL_BIA_TN10_FORMULAS.length,
      resourceDefinitionCountPerTarget: MASONRY_BRICK_WALL_BIA_TN10_RESOURCES.length,
      exactApplicableRowsPerTarget: 18,
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
        where r.definition_version_id=definition.id and r.procurement_eligible) procurement_rows
    from public.estimate_definition_version definition
    join public.estimate_content_passport_r3 passport on passport.definition_version_id=definition.id
    where definition.id=any($1::uuid[]) order by definition.catalog_id`, [ids])).rows as Json[];
  const search = (await client.query(`select count(*)::int targets,
      count(*) filter(where required_inputs_count=60 and selectable
        and definition_version_id=any($3::uuid[]))::int valid,
      (select count(*)::int from public.estimate_search_document where search_release_id=$1) documents,
      (select count(*)::int from public.estimate_search_document
        where search_release_id=$1 and selectable and adjudication_class='EFFECTIVE_WORK') visible,
      (select snapshot_sha256 from public.estimate_search_index_release where id=$1) snapshot_sha256
    from public.estimate_search_document
    where search_release_id=$1 and catalog_id=any($2::text[])`, [
    searchReleaseId, catalogIds, ids,
  ])).rows[0] as Json;
  return { release, manifest, targets, search };
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH, "STOP_BIA_FULL_FAMILY_BRANCH_DRIFT");
  invariant(existsSync(MASTER_PATH) && sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256,
    "STOP_BIA_FULL_FAMILY_MASTER_SHA256_DRIFT");
  invariant(TARGETS.length === 4 && new Set(TARGETS.map((target) => target.catalogId)).size === 4,
    "STOP_BIA_FULL_FAMILY_TARGET_SET");
  for (const path of SOURCE_PATHS) {
    invariant(existsSync(resolve(path)), `STOP_BIA_FULL_FAMILY_SOURCE_MISSING:${path}`);
    invariant(git("diff", "--name-only", "HEAD", "--", path) === "",
      `STOP_BIA_FULL_FAMILY_SOURCE_UNCOMMITTED:${path}`);
  }

  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const sourceHashes = SOURCE_PATHS.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) }));
  const coreAcceptance = await verifyThroughExistingCore();
  const parameterSchemaSha256 = sha256(MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS.map((parameter) => ({
    id: parameter.parameter_id,
    type: parameter.value_type,
    unit: parameter.unit_id,
    required: parameter.required,
    constraints: parameter.constraints_json,
  })));
  const definitionSchemaSha256 = sha256({
    parameters: MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS,
    formulas: MASONRY_BRICK_WALL_BIA_TN10_FORMULAS,
    resources: MASONRY_BRICK_WALL_BIA_TN10_RESOURCES,
  });
  const fingerprint = sha256({
    contract: CONTRACT,
    masterSha256: MASTER_SHA256,
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
  const releaseKey = `r4-a13-6-bia-tn10-masonry-conditional-guard-${fingerprint.slice(0, 16)}`;
  const definitionIds = new Map(TARGETS.map((target) => [
    target.catalogId,
    uuid(`${CONTRACT}:${fingerprint}:${target.catalogId}:definition`),
  ]));
  const baselineIds = new Map(TARGETS.map((target) => [
    target.catalogId,
    uuid(`${CONTRACT}:${fingerprint}:${target.catalogId}:baseline`),
  ]));
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.productionAccessed === false, "STOP_BIA_FULL_FAMILY_CURRENT_PRODUCTION_ACCESS_FLAG");
  invariant(
    (current.definitionReleaseId === PARENT_RELEASE_ID && current.searchReleaseId === PARENT_SEARCH_RELEASE_ID)
      || (current.definitionReleaseId === releaseId && current.searchReleaseId === searchReleaseId),
    `STOP_BIA_FULL_FAMILY_CURRENT_RELEASE_DRIFT:${current.definitionReleaseId}:${current.searchReleaseId}`,
  );

  const formulaConsumers = Object.fromEntries(MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS.map((parameter) => [
    parameter.parameter_id,
    MASONRY_BRICK_WALL_BIA_TN10_FORMULAS
      .filter((formula) => formula.input_parameter_ids.includes(parameter.parameter_id))
      .map((formula) => formula.formula_id),
  ]));
  const resourceConsumers = Object.fromEntries(MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS.map((parameter) => [
    parameter.parameter_id,
    MASONRY_BRICK_WALL_BIA_TN10_RESOURCES
      .filter((resource) => formulaConsumers[parameter.parameter_id].includes(resource.formula_id)
        || JSON.stringify(resource.resource_graph).includes(`\"${parameter.parameter_id}\"`)
        || JSON.stringify(resource.inclusion_ast).includes(`\"${parameter.parameter_id}\"`))
      .map((resource) => resource.row_id),
  ]));
  const baselineRepresentative = {
    parameter_schema_sha256: parameterSchemaSha256,
    input_values: MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT,
    input_classification: Object.fromEntries(MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS.map((parameter) => [
      parameter.parameter_id,
      NORMATIVE_PARAMETER_IDS.has(parameter.parameter_id) ? "NORMATIVE" : "VALIDATION_FIXTURE",
    ])),
    uom_by_parameter: Object.fromEntries(MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS.map((parameter) => [
      parameter.parameter_id, parameter.unit_id,
    ])),
    formula_consumer_ids: formulaConsumers,
    resource_consumer_row_ids: resourceConsumers,
    normative_source_ids: Object.fromEntries(MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS.map((parameter) => [
      parameter.parameter_id,
      NORMATIVE_PARAMETER_IDS.has(parameter.parameter_id) ? [BIA_TN10_MASONRY_SOURCE_ID] : [],
    ])),
    guide_provenance_ru: Object.fromEntries(MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS.map((parameter) => [
      parameter.parameter_id, (parameter.truth_metadata.guide as Json).guide_short_ru,
    ])),
    proposal_source_refs: [{
      contract: CONTRACT,
      masterSha256: MASTER_SHA256,
      sourceUrl: BIA_TN10_MASONRY_SOURCE_METADATA.source_url,
      exactLocator: BIA_TN10_MASONRY_SOURCE_METADATA.exact_locator,
    }],
    contract_version: BASELINE_CONTRACT,
  };
  const passportRepresentative = {
    contract_version: CONTENT_PASSPORT_CONTRACT,
    included_scope_ru: [
      "обожжённый глиняный кирпич и кладочный раствор",
      "соединители, перемычки, отсечная гидроизоляция и армирование по условиям проекта",
      "разбивка, кладка, резка, монтаж, контроль, очистка и сдача",
      "оборудование, инженерная приёмка, доставка материалов и вывоз отходов",
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
    application_name: "r4-a13-6-bia-tn10-masonry-conditional-guard-successor",
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
      "STOP_BIA_FULL_FAMILY_PARENT_RELEASE_DRIFT");
    invariant(parentSearch?.status === "draft", "STOP_BIA_FULL_FAMILY_PARENT_SEARCH_DRIFT");
    const existing = (await client.query(
      "select id,status,activated_at from public.estimate_definition_release where id=$1",
      [releaseId],
    )).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.status === "prepared" && existing.activated_at == null,
        "STOP_BIA_FULL_FAMILY_EXISTING_SUCCESSOR_STATE_DRIFT");
      const audit = await auditState(client, releaseId, searchReleaseId, definitionIds);
      invariant(Number(audit.manifest.identities) === 10_331
        && Number(audit.manifest.replaced) === TARGETS.length
        && audit.targets.length === TARGETS.length
        && audit.targets.every((target: Json) => Number(target.parameters) === 60
          && Number(target.formulas) === 19 && Number(target.resources) === 23
          && Number(target.bindings) === 2),
      `STOP_BIA_FULL_FAMILY_EXISTING_AUDIT:${JSON.stringify(audit)}`);
      receipt = {
        status: "GREEN_BIA_TN10_MASONRY_FULL_FAMILY_ALREADY_PREPARED_NOT_ACTIVE",
        idempotent: true,
        mutationPerformed: false,
        successor: { releaseId, searchReleaseId, releaseKey },
        audit,
      };
    } else {
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
      invariant(parentTargets.length === TARGETS.length && parentTargets.every((target) =>
        Number(target.parameters) === MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS.length
          && Number(target.formulas) === MASONRY_BRICK_WALL_BIA_TN10_FORMULAS.length
          && Number(target.resources) === MASONRY_BRICK_WALL_BIA_TN10_RESOURCES.length),
      `STOP_BIA_FULL_FAMILY_PARENT_TARGET_SHAPE:${JSON.stringify(parentTargets)}`);
      const parentByCatalog = new Map(parentTargets.map((target) => [String(target.catalog_id), target]));
      const locator = (await client.query(`select locator.id::text locator_id,locator.locator,source.source_key
        from public.estimate_normative_locator locator
        join public.estimate_normative_source source on source.id=locator.source_id
        where source.source_key=$1 order by locator.id`, [BIA_TN10_MASONRY_SOURCE_ID])).rows
        .find((row: Json) => row.locator?.selectedTable === "Table 4") as Json | undefined;
      invariant(locator?.locator_id, "STOP_BIA_FULL_FAMILY_NORMATIVE_LOCATOR_MISSING");

      const nextCounts = {
        definitions: Number(parent.definition_count),
        parameters: Number(parent.parameter_count) + TARGETS.reduce((sum, target) =>
          sum + MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS.length
            - Number(parentByCatalog.get(target.catalogId)?.parameters), 0),
        formulas: Number(parent.formula_count) + TARGETS.reduce((sum, target) =>
          sum + MASONRY_BRICK_WALL_BIA_TN10_FORMULAS.length
            - Number(parentByCatalog.get(target.catalogId)?.formulas), 0),
        resources: Number(parent.resource_row_count) + TARGETS.reduce((sum, target) =>
          sum + MASONRY_BRICK_WALL_BIA_TN10_RESOURCES.length
            - Number(parentByCatalog.get(target.catalogId)?.resources), 0),
      };
      const parameterRows = MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS.map((parameter) => ({ ...parameter }));
      const formulaRows = MASONRY_BRICK_WALL_BIA_TN10_FORMULAS.map((formula) => ({
        ...formula,
        ast_sha256: sha256(formula.ast),
      }));
      const resourceRows = MASONRY_BRICK_WALL_BIA_TN10_RESOURCES.map((resource) => ({
        ...resource,
        row_type: resourceRowType(resource.category),
      }));
      const bindingRows = MASONRY_BRICK_WALL_BIA_TN10_RESOURCES
        .filter((resource) => Boolean((resource.resource_graph as Json).professionalPhysicalNormBindingV1))
        .map((resource) => ({
          row_id: resource.row_id,
          locator_id: locator.locator_id,
          applicability: {
            ...((resource.resource_graph as Json).professionalPhysicalNormBindingV1 as Json),
            norm_id: BIA_TN10_MASONRY_NORM_ID,
            source_document_version: BIA_TN10_MASONRY_SOURCE_METADATA.source_document_version,
            source_definition_hash: BIA_TN10_MASONRY_SOURCE_METADATA.definition_hash,
            exact_locator: BIA_TN10_MASONRY_SOURCE_METADATA.exact_locator,
          },
        }));
      invariant(bindingRows.length === 2, `STOP_BIA_FULL_FAMILY_BINDING_SHAPE:${bindingRows.length}`);

      const plannedTargets = [];
      for (const target of TARGETS) {
        const old = parentByCatalog.get(target.catalogId)!;
        const definitionId = definitionIds.get(target.catalogId)!;
        const baselineId = baselineIds.get(target.catalogId)!;
        const nextDefinitionVersion = Number((await client.query(
          "select coalesce(max(definition_version),0)::int+1 value from public.estimate_definition_version where catalog_id=$1",
          [target.catalogId],
        )).rows[0].value);
        const targetCoreAcceptance = coreAcceptance.targets.find(
          (result: Json) => result.catalogId === target.catalogId,
        );
        const acceptanceEvidenceSha256 = sha256({
          contract: CONTRACT,
          target,
          exactInput: MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT,
          targetCoreAcceptance,
          parameterSchemaSha256,
          definitionSchemaSha256,
        });
        const targetDefinitionSha256 = sha256({
          contract: CONTRACT,
          target,
          parameterSchemaSha256,
          definitionSchemaSha256,
        });
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
              physicalResultRu: `Полная применимая смета кирпичной стены: ${target.contextRu}`,
              exactNormId: BIA_TN10_MASONRY_NORM_ID,
            },
            applicability: {
              country: "KG",
              operationClass: "MEASURE_AND_LAY_FULL_APPLICABLE_SCOPE",
              materialSystem: "BIA_TN10_FIRED_CLAY_BRICK",
              productProfileId: BIA_TN10_MASONRY_PRODUCT_PROFILE_ID,
              contextKey: target.key,
              contextRu: target.contextRu,
              conditionalScopeFailClosed: true,
              highLoadAndWetZoneRequireSeparateProject: true,
            },
            definitionSha256: targetDefinitionSha256,
            sourceMetadata: {
              contract: CONTRACT,
              predecessorDefinitionId: old.definition_version_id,
              parameterSchemaSha256,
              definitionSchemaSha256,
              acceptanceEvidenceSha256,
              normativeSourceIds: [BIA_TN10_MASONRY_SOURCE_ID],
              synthetic: false,
              fullApplicableScope: true,
              priceState: "PARTIAL_NEEDS_PRICE",
              exactApplicableRows: 18,
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
            sourceDefinitionVersionId: old.definition_version_id,
            validationScenarioRefs: [{
              scenario: `BIA_TN10_FULL_SCOPE_${target.key.toUpperCase()}_90_M2`,
              fixture: MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT,
              acceptanceEvidenceSha256,
              targetCoreAcceptance,
            }],
            acceptanceEvidenceSha256,
            acceptedReleaseId: releaseId,
            supersedesBaselineId: old.approved_template_baseline_id,
          },
          passport: {
            physicalResultRu: target.titleRu,
            excludedScopeRu: [
              "AAC и тонкослойный клей",
              "неподтверждённые проектом материалы и операции",
              "цены без коммерческого снимка",
              "высокая нагрузка и влажная зона без отдельного проектного подтверждения",
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
            context_key: target.key,
          }),
          expectedNormativeBindingCount: 2,
        });
        plannedTargets.push({
          target,
          old,
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
          status: "DRY_RUN_BIA_TN10_MASONRY_FULL_FAMILY_VALIDATED",
          idempotent: false,
          mutationPerformed: false,
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
      } else {
        await client.query("begin");
        await client.query("set local lock_timeout='5s'");
        await client.query("set local statement_timeout='600s'");
        await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [CONTRACT]);
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
              lifecycle: "DRAFT_FORWARD_ONLY",
              replacedDefinitionCount: TARGETS.length,
              activationAllowed: false,
              productionEligible: false,
              fullApplicableScope: true,
              priceState: "PARTIAL_NEEDS_PRICE",
              exactApplicableRowsPerTarget: 18,
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
              contextKey: planned.target.key,
              predecessorDefinitionId: planned.old.definition_version_id,
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
          `STOP_BIA_FULL_FAMILY_MANIFEST_AUDIT:${JSON.stringify(audit.manifest)}`);
          invariant(audit.targets.length === TARGETS.length && audit.targets.every((target: Json) =>
            target.content_status === "CANDIDATE_READY" && target.content_gate_status === "GREEN"
            && target.decision?.quantityScope === "FULL" && target.decision?.priceState === "PARTIAL_NEEDS_PRICE"
            && Number(target.parameters) === 60 && Number(target.formulas) === 19
            && Number(target.resources) === 23 && Number(target.bindings) === 2
            && Number(target.procurement_rows) === 13),
          `STOP_BIA_FULL_FAMILY_TARGET_AUDIT:${JSON.stringify(audit.targets)}`);
          invariant(Number(audit.search.targets) === TARGETS.length
            && Number(audit.search.valid) === TARGETS.length
            && Number(audit.search.documents) === 10_322
            && Number(audit.search.visible) === 10_322,
          `STOP_BIA_FULL_FAMILY_SEARCH_AUDIT:${JSON.stringify(audit.search)}`);
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
            `STOP_BIA_FULL_FAMILY_UNRELATED_MANIFEST_DRIFT:${unrelated.changed}`);
          await client.query(`update public.estimate_definition_release
            set source_manifest_sha256=$2,status='prepared',sealed_at=clock_timestamp(),
              metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
            releaseId,
            audit.manifest.snapshot,
            JSON.stringify({
              lifecycle: "PREPARED_NOT_ACTIVE",
              searchReleaseId,
              searchSnapshotSha256: searchSnapshot.snapshot_sha256,
              fullBiaTargetCount: TARGETS.length,
              sourceCoreAcceptanceSha256: coreAcceptance.deterministicSha256,
              parameterCountPerTarget: 60,
              formulaCountPerTarget: 19,
              resourceDefinitionCountPerTarget: 23,
              exactApplicableRowsPerTarget: 18,
              priceState: "PARTIAL_NEEDS_PRICE",
            }),
          ]);
          await client.query("commit");
          receipt = {
            status: "GREEN_BIA_TN10_MASONRY_FULL_FAMILY_PREPARED_NOT_ACTIVE",
            idempotent: false,
            mutationPerformed: true,
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
            audit: { ...audit, unrelatedManifestChanges: Number(unrelated.changed) },
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
    ...receipt!,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  const sealed = { ...body, receiptSha256: sha256(body) };
  if (APPLY && receipt!.mutationPerformed === true) {
    atomicJson(resolve(OUTPUT_ROOT, `01_BIA_TN10_MASONRY_CONDITIONAL_GUARD_${head}.json`), sealed);
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
      owner: "EXACT_BIA_TN10_MASONRY_CONDITIONAL_GUARD_SUCCESSOR",
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
