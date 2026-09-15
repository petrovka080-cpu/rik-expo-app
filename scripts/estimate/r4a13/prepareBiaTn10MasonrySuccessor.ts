import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { canonicalMaterialQuantityBasisFromRow } from "../../../src/lib/estimate/backendPlatform/canonicalMaterialQuantityProjection";
import {
  BIA_TN10_MASONRY_NORM_ID,
  BIA_TN10_MASONRY_PRODUCT_PROFILE_ID,
  BIA_TN10_MASONRY_SOURCE_ID,
  BIA_TN10_MASONRY_SOURCE_METADATA,
} from "../../../src/lib/estimate/v4/domainFactory";
import {
  MASONRY_BRICK_WALL_BIA_TN10_CATALOG_ID,
  MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT,
  MASONRY_BRICK_WALL_BIA_TN10_FORMULAS,
  MASONRY_BRICK_WALL_BIA_TN10_NEUTRAL_CATALOG_IDS,
  MASONRY_BRICK_WALL_BIA_TN10_NORMATIVE_PARAMETER_IDS,
  MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS,
  MASONRY_BRICK_WALL_BIA_TN10_RESOURCES,
  MASONRY_BRICK_WALL_BIA_TN10_TITLE_RU,
  compileMasonryBrickWallBiaTn10R1,
} from "../../../src/lib/estimate/v4/masonryBrickWallBiaTn10R1";

type Json = Record<string, any>;

const cliValue = (name: string): string | null => {
  const prefix = `${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) ?? null;
};

const TARGETS = Object.freeze({
  standard: Object.freeze({
    catalogId: MASONRY_BRICK_WALL_BIA_TN10_CATALOG_ID,
    titleRu: MASONRY_BRICK_WALL_BIA_TN10_TITLE_RU,
    contextRu: "стандартный участок",
    searchAliasesRu: ["кирпичная кладка", "кладка кирпичной стены", "стена из глиняного кирпича"],
  }),
  large_area: Object.freeze({
    catalogId: "canonical-work:base:masonry_interior_brick_wall_lay_large_area",
    titleRu: "Кладка стены большой площади из обожжённого глиняного кирпича по BIA TN 10 Table 4",
    contextRu: "участок большой площади",
    searchAliasesRu: ["кирпичная кладка большой площади", "кладка большой кирпичной стены"],
  }),
  small_area: Object.freeze({
    catalogId: "canonical-work:base:masonry_interior_brick_wall_lay_small_area",
    titleRu: "Кладка небольшого участка стены из обожжённого глиняного кирпича по BIA TN 10 Table 4",
    contextRu: "небольшой участок",
    searchAliasesRu: ["кирпичная кладка малого объема", "кладка небольшого участка кирпичной стены"],
  }),
  technical_room: Object.freeze({
    catalogId: "canonical-work:base:masonry_interior_brick_wall_lay_technical_room",
    titleRu: "Кладка стены технического помещения из обожжённого глиняного кирпича по BIA TN 10 Table 4",
    contextRu: "техническое помещение",
    searchAliasesRu: ["кирпичная кладка технического помещения", "кирпичная стена технического помещения"],
  }),
} as const);
type TargetKey = keyof typeof TARGETS;
const TARGET_KEY = (cliValue("--target") ?? "standard") as TargetKey;
const TARGET = TARGETS[TARGET_KEY];
if (!TARGET) throw new Error(`STOP_BIA_TN10_UNSUPPORTED_TARGET:${TARGET_KEY}`);
if (!(MASONRY_BRICK_WALL_BIA_TN10_NEUTRAL_CATALOG_IDS as readonly string[]).includes(TARGET.catalogId)) {
  throw new Error(`STOP_BIA_TN10_NON_NEUTRAL_TARGET:${TARGET.catalogId}`);
}

const CONTRACT = `rik-expo-app.r4-a13-6.bia-tn10-masonry-complete-estimate.${TARGET_KEY}.v2`;
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (6).md",
);
const MASTER_SHA256 = "4b3188fed623913b76b9ced3c7784bbfc4c60002af7868038f01b819c58ed41d";
const DEFAULT_PREDECESSOR_RELEASE_ID = "cf7f3504-3b30-5cc9-9230-114b409f9ddb";
const DEFAULT_PREDECESSOR_SEARCH_RELEASE_ID = "16217704-4a47-5138-a19b-dae1e8301e82";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_ROOT = resolve(`.release-runtime/r4a13-6/exact-physical-norm-successors/bia-tn10-masonry-${TARGET_KEY}`);
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const APPLY = process.argv.includes("--apply");
const NORMATIVE_PARAMETER_IDS = new Set<string>(MASONRY_BRICK_WALL_BIA_TN10_NORMATIVE_PARAMETER_IDS);
const SOURCE_PATHS = [
  "data/estimate-norms/professional/masonry.json",
  "src/lib/estimate/v4/domainFactory/masonryBiaTn10PhysicalNormV1.ts",
  "src/lib/estimate/ownedDomain/masonryBiaTn10ProductionBindingV1.ts",
  "src/lib/estimate/v4/masonryBrickWallBiaTn10R1.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimatePhysicalNormProjection.ts",
  "src/lib/estimate/backendPlatform/canonicalMaterialQuantityProjection.ts",
  "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
  "scripts/estimate/r4a13/prepareBiaTn10MasonrySuccessor.ts",
] as const;
const FORBIDDEN_LEGACY_SOURCE_IDS = [
  "src_professional_norm_pack_masonry_brick_pcs_m2_wall_v1",
  "src_professional_norm_pack_masonry_mortar_m3_m2_masonry_v1",
  "src_professional_norm_pack_masonry_aac_block_pcs_m3_wall_v1",
  "src_professional_norm_pack_masonry_mesh_kg_m3_wall_v1",
  "src_professional_norm_pack_masonry_thin_bed_adhesive_kg_m3_aac_wall_v1",
  "src_professional_norm_pack_masonry_brick_250_120_65_piece_m2_half_brick_v1",
  "src_professional_norm_pack_masonry_cement_lime_mortar_m3_m2_brick_v1",
  "src_professional_norm_pack_masonry_aac_block_600_200_200_piece_m2_wall_v1",
  "src_professional_norm_pack_masonry_reinforcement_mesh_m2_m2_wall_v1",
  "src_professional_norm_pack_masonry_thin_bed_block_adhesive_kg_m2_200mm_v1",
] as const;

const argValue = cliValue;

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
    `STOP_BIA_TN10_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_BIA_TN10_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
}

async function insertRows(
  client: Client,
  table: string,
  columns: readonly string[],
  rows: readonly unknown[][],
): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    const values: unknown[] = [];
    const tuples = batch.map((row) => {
      invariant(row.length === columns.length, `STOP_BIA_TN10_INSERT_SHAPE:${table}`);
      return `(${row.map((value) => {
        values.push(value);
        return `$${values.length}`;
      }).join(",")})`;
    });
    if (tuples.length > 0) {
      await client.query(`insert into public.${table}(${columns.join(",")}) values ${tuples.join(",")}`, values);
    }
  }
}

function materialBasis(row: Json) {
  return canonicalMaterialQuantityBasisFromRow({
    rowId: String(row.row_id),
    quantity: Number(row.quantity),
    sourceParameters: {
      smartEstimateProjectionV2: { formulaExplanation: row.calculation_trace },
    },
  });
}

async function verifyThroughExistingCore(): Promise<Json> {
  const exact = await compileMasonryBrickWallBiaTn10R1(
    { ...MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT },
    { catalogId: TARGET.catalogId },
  );
  const sensitivity = await compileMasonryBrickWallBiaTn10R1({
    ...MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT,
    measured_net_brick_wall_area_m2: 100,
    gross_wall_area_and_opening_deductions: "GROSS_M2=110; OPENINGS_M2=10; NET_M2=100",
  }, { catalogId: TARGET.catalogId });
  invariant(exact.rows.length === 5 && exact.preliminaryNeeds.length === 0,
    `STOP_BIA_TN10_CORE_EXACT_ROWS:${exact.rows.length}:${exact.preliminaryNeeds.length}`);
  invariant(exact.rows.every((row) => row.unit_price == null && row.amount == null),
    "STOP_BIA_TN10_UNKNOWN_PRICE_NOT_NULL");
  const exactBrick = exact.rows.find((row) => row.row_id === "material:bia-tn10:fired-clay-brick") as Json;
  const exactMortar = exact.rows.find((row) => row.row_id === "material:bia-tn10:masonry-mortar") as Json;
  const sensitivityBrick = sensitivity.rows.find((row) => row.row_id === "material:bia-tn10:fired-clay-brick") as Json;
  const sensitivityMortar = sensitivity.rows.find((row) => row.row_id === "material:bia-tn10:masonry-mortar") as Json;
  const exactBrickBasis = materialBasis(exactBrick);
  const exactMortarBasis = materialBasis(exactMortar);
  const sensitivityBrickBasis = materialBasis(sensitivityBrick);
  const sensitivityMortarBasis = materialBasis(sensitivityMortar);
  invariant(Number(exactBrick.quantity) === 5_670 && exactBrickBasis?.grossQuantity === 5_840.1
    && exactBrickBasis.procurementQuantity === 6_000,
  "STOP_BIA_TN10_BRICK_NEED_PROCUREMENT_SPLIT");
  invariant(Number(exactMortar.quantity) === 1.98 && exactMortarBasis?.grossQuantity === 2.079
    && exactMortarBasis.procurementQuantity === 2.25,
  "STOP_BIA_TN10_MORTAR_NEED_PROCUREMENT_SPLIT");
  invariant(Number(sensitivityBrick.quantity) === 6_300 && sensitivityBrickBasis?.procurementQuantity === 6_500
    && Number(sensitivityMortar.quantity) === 2.2 && sensitivityMortarBasis?.procurementQuantity === 2.5,
  "STOP_BIA_TN10_SENSITIVITY_QUANTITIES");
  const negativeCases: readonly Json[] = [
    { fired_clay_brick_confirmed: false },
    { gross_wall_area_and_opening_deductions: "GROSS_M2=100; OPENINGS_M2=5; NET_M2=90" },
    { brick_bond_correction_factor: 1 },
  ];
  for (const patch of negativeCases) {
    let rejected = false;
    try {
      await compileMasonryBrickWallBiaTn10R1(
        { ...MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT, ...patch },
        { catalogId: TARGET.catalogId },
      );
    } catch (error) {
      rejected = ["PHYSICAL_NORM_APPLICABILITY_FAILED", "PHYSICAL_NORM_QUANTITY_MISMATCH"]
        .includes(String((error as { code?: unknown })?.code ?? ""));
    }
    invariant(rejected, `STOP_BIA_TN10_NEGATIVE_ACCEPTED:${JSON.stringify(patch)}`);
  }
  return {
    compilerOwner: "compileCanonicalEstimateCore",
    exact: {
      wallAreaM2: 90,
      rows: exact.rows.length,
      brick: { netNeedPiece: 5_670, grossNeedPiece: 5_840.1, procurementPiece: 6_000 },
      mortar: { netNeedM3: 1.98, grossNeedM3: 2.079, procurementM3: 2.25 },
      unpricedRows: exact.totals.unpricedRowCount,
    },
    sensitivity: {
      wallAreaM2: 100,
      brick: { netNeedPiece: 6_300, procurementPiece: 6_500 },
      mortar: { netNeedM3: 2.2, procurementM3: 2.5 },
    },
    negativeCasesRejected: negativeCases.length,
    deterministicSha256: sha256(exact),
  };
}

async function cloneSearch(client: Client, input: {
  predecessorSearchReleaseId: string;
  releaseId: string;
  searchReleaseId: string;
  releaseKey: string;
  head: string;
  tree: string;
  fingerprint: string;
  definitionId: string;
}): Promise<Json> {
  await client.query(`insert into public.estimate_search_index_release(
      id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,
      source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata)
    select $1,$2,'draft',taxonomy_version,group_relation_version,ranking_contract_version,
      $3,$4,$5,global_count,external_count,discovered_count,
      metadata||jsonb_build_object('contract',$6::text,'parentSearchReleaseId',$7::uuid::text,
        'definitionReleaseId',$8::uuid::text,'sourceFingerprint',$9::text,
        'lifecycle','PREPARED_NOT_ACTIVE','activationAllowed',false,'productionEligible',false)
    from public.estimate_search_index_release where id=$7`, [
    input.searchReleaseId, `${input.releaseKey}-search`, input.head, input.tree,
    sha256(`${input.searchReleaseId}:draft`), CONTRACT, input.predecessorSearchReleaseId,
    input.releaseId, input.fingerprint,
  ]);
  await client.query(`insert into public.estimate_search_group(
      search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition)
    select $1,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
    from public.estimate_search_group where search_release_id=$2`, [input.searchReleaseId, input.predecessorSearchReleaseId]);
  await client.query(`insert into public.estimate_search_clarification_question(
      search_release_id,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence)
    select $1,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence
    from public.estimate_search_clarification_question where search_release_id=$2`, [input.searchReleaseId, input.predecessorSearchReleaseId]);
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
    input.searchReleaseId, input.releaseId, CONTRACT, input.predecessorSearchReleaseId, input.fingerprint,
  ]);
  await client.query(`insert into public.estimate_search_group_membership(
      search_release_id,group_id,catalog_id,ordinal,independent_disposition)
    select $1,group_id,catalog_id,ordinal,independent_disposition
    from public.estimate_search_group_membership where search_release_id=$2`, [input.searchReleaseId, input.predecessorSearchReleaseId]);
  await client.query(`insert into public.estimate_search_typed_relation(
      search_release_id,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256)
    select $1,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256
    from public.estimate_search_typed_relation where search_release_id=$2`, [input.searchReleaseId, input.predecessorSearchReleaseId]);
  const clarificationFields = MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS.map((parameter) => ({
    parameterId: parameter.parameter_id,
    titleRu: parameter.title_ru,
    unitId: parameter.unit_id,
  }));
  const aliases = [...TARGET.searchAliasesRu, "BIA TN 10 Table 4"];
  const normalizedCanonicalName = normalizeSearchText(TARGET.titleRu);
  const normalizedAliases = aliases.map(normalizeSearchText);
  const normalizedSearchTerms = unique([
    normalizeSearchText(TARGET.catalogId),
    normalizedCanonicalName,
    ...normalizedCanonicalName.split(" "),
    ...normalizedAliases,
    ...normalizedAliases.flatMap((alias) => alias.split(" ")),
  ]);
  await client.query(`update public.estimate_search_document set
      canonical_name_ru=$3,primary_uom='m2',short_scope_ru=$4,
      included_boundaries=$5::jsonb,excluded_boundaries=$6::jsonb,
      required_inputs_count=$7,clarification_fields=$8::jsonb,
      normative_classifiers=$9::text[],applicability_tags=$10::text[],
      source_provenance=source_provenance||jsonb_build_object('exactPhysicalNormProfile',$11::text),
      aliases=$12::text[],normalized_canonical_name=$13,normalized_aliases=$14::text[],
      normalized_search_terms=$15::text[],normalized_search_blob=$16,
      definition_version_id=$17::uuid,
      document_sha256=encode(extensions.digest(convert_to(document_sha256||':'||$11,'UTF8'),'sha256'),'hex')
    where search_release_id=$1 and catalog_id=$2`, [
    input.searchReleaseId, TARGET.catalogId,
    TARGET.titleRu,
    `Полная смета кладки (${TARGET.contextRu}) из выбранного обожжённого глиняного кирпича: потребность, закупка, работы и контроль.`,
    JSON.stringify([TARGET.contextRu, "кирпич по выбранной строке BIA TN 10", "кладочный раствор", "кладка", "контроль швов и геометрии", "очистка и сдача"]),
    JSON.stringify(["AAC и иные неглиняные блоки", "тонкослойный клей", "кладочная сетка без проекта", "неподтверждённые масса и транспорт", "режим высокой нагрузки и влажная зона без отдельного проектного подтверждения"]),
    clarificationFields.length, JSON.stringify(clarificationFields),
    [BIA_TN10_MASONRY_NORM_ID, BIA_TN10_MASONRY_SOURCE_ID],
    ["EXACT_BIA_TN10_TABLE4", "FIRED_CLAY_BRICK_ONLY", `CONTEXT_${TARGET_KEY.toUpperCase()}`, "NEED_SEPARATED_FROM_PROCUREMENT", "UNKNOWN_PRICE_IS_NOT_ZERO"],
    BIA_TN10_MASONRY_PRODUCT_PROFILE_ID, aliases, normalizedCanonicalName, normalizedAliases,
    normalizedSearchTerms, normalizedSearchTerms.join("\u001f"), input.definitionId,
  ]);
  const snapshot = (await client.query(`select count(*)::int documents,
      count(*) filter(where selectable and adjudication_class='EFFECTIVE_WORK')::int visible,
      encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot_sha256
    from public.estimate_search_document where search_release_id=$1`, [input.searchReleaseId])).rows[0] as Json;
  await client.query(`update public.estimate_search_index_release set snapshot_sha256=$2,
    metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
    input.searchReleaseId, snapshot.snapshot_sha256,
    JSON.stringify({ documentCount: snapshot.documents, visibleCount: snapshot.visible,
      targetCatalogId: TARGET.catalogId,
      exactPhysicalNormProfile: BIA_TN10_MASONRY_PRODUCT_PROFILE_ID }),
  ]);
  return snapshot;
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH, "STOP_BIA_TN10_BRANCH_DRIFT");
  invariant(existsSync(MASTER_PATH) && sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256,
    "STOP_BIA_TN10_MASTER_SHA256_DRIFT");
  for (const path of SOURCE_PATHS) invariant(existsSync(resolve(path)), `STOP_BIA_TN10_SOURCE_MISSING:${path}`);
  const predecessorReleaseId = argValue("--predecessor-release-id") ?? DEFAULT_PREDECESSOR_RELEASE_ID;
  const predecessorSearchReleaseId = argValue("--predecessor-search-release-id")
    ?? DEFAULT_PREDECESSOR_SEARCH_RELEASE_ID;
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
  const definitionSha256 = sha256({
    contract: CONTRACT,
    parameters: MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS,
    formulas: MASONRY_BRICK_WALL_BIA_TN10_FORMULAS.map((formula) => ({
      id: formula.formula_id,
      source: formula.expression_source,
      ast: formula.ast,
    })),
    resources: MASONRY_BRICK_WALL_BIA_TN10_RESOURCES,
  });
  const fingerprint = sha256({ contract: CONTRACT, masterSha256: MASTER_SHA256, head, tree,
    predecessorReleaseId, predecessorSearchReleaseId, sourceHashes, parameterSchemaSha256,
    definitionSha256, coreAcceptance });
  const releaseId = uuid(`${CONTRACT}:${fingerprint}:definition-release`);
  const searchReleaseId = uuid(`${CONTRACT}:${fingerprint}:search-release`);
  const definitionId = uuid(`${CONTRACT}:${fingerprint}:${TARGET.catalogId}:definition`);
  const baselineId = uuid(`${CONTRACT}:${fingerprint}:${TARGET.catalogId}:baseline`);
  const releaseKey = `r4-a13-6-bia-tn10-masonry-${TARGET_KEY}-${fingerprint.slice(0, 16)}`;
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.productionAccessed === false, "STOP_BIA_TN10_CURRENT_PRODUCTION_ACCESS_FLAG");
  invariant(
    (current.definitionReleaseId === predecessorReleaseId && current.searchReleaseId === predecessorSearchReleaseId)
      || (current.definitionReleaseId === releaseId && current.searchReleaseId === searchReleaseId),
    "STOP_BIA_TN10_CURRENT_RELEASE_DRIFT",
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
        || JSON.stringify(resource.resource_graph).includes(`\"${parameter.parameter_id}\"`))
      .map((resource) => resource.row_id),
  ]));
  const acceptanceEvidenceSha256 = sha256({ contract: CONTRACT, coreAcceptance,
    parameterSchemaSha256, definitionSha256, formulaConsumers, resourceConsumers });

  const client = new Client({ connectionString: DATABASE_URL, application_name: "r4-a13-6-bia-tn10-masonry-successor" });
  await client.connect();
  let receipt: Json;
  try {
    const predecessor = (await client.query(
      "select * from public.estimate_definition_release where id=$1",
      [predecessorReleaseId],
    )).rows[0] as Json;
    const predecessorSearch = (await client.query(
      "select * from public.estimate_search_index_release where id=$1",
      [predecessorSearchReleaseId],
    )).rows[0] as Json;
    invariant(predecessor?.status === "prepared" && Number(predecessor.definition_count) === 10_331,
      "STOP_BIA_TN10_PREDECESSOR_RELEASE_DRIFT");
    invariant(predecessorSearch?.status === "draft", "STOP_BIA_TN10_PREDECESSOR_SEARCH_DRIFT");
    const existing = (await client.query(
      "select id,status,activated_at from public.estimate_definition_release where id=$1",
      [releaseId],
    )).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.status === "prepared" && existing.activated_at == null,
        "STOP_BIA_TN10_EXISTING_SUCCESSOR_STATE_DRIFT");
      const audit = (await client.query(`select count(*)::int identities,
          count(*) filter(where catalog_id=$2 and definition_version_id=$3)::int replaced
        from public.estimate_cumulative_manifest_entry where release_id=$1`, [
        releaseId, TARGET.catalogId, definitionId,
      ])).rows[0] as Json;
      receipt = { status: "GREEN_BIA_TN10_MASONRY_SUCCESSOR_ALREADY_PREPARED_NOT_ACTIVE",
        idempotent: true, successor: { releaseId, searchReleaseId, definitionId, baselineId, releaseKey }, audit };
    } else {
      const target = (await client.query(`select manifest.*,definition.definition_version,
          (select count(*)::int from public.estimate_parameter_definition where definition_version_id=manifest.definition_version_id) parameters,
          (select count(*)::int from public.estimate_formula_graph where definition_version_id=manifest.definition_version_id) formulas,
          (select count(*)::int from public.estimate_resource_spec where definition_version_id=manifest.definition_version_id) resources
        from public.estimate_cumulative_manifest_entry manifest
        join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
        where manifest.release_id=$1 and manifest.catalog_id=$2`, [
        predecessorReleaseId, TARGET.catalogId,
      ])).rows[0] as Json;
      const predecessorTargetShape = target == null ? "missing" :
        `${Number(target.parameters)}:${Number(target.formulas)}:${Number(target.resources)}`;
      invariant(target && ["1:59:59", "22:5:5"].includes(predecessorTargetShape),
        `STOP_BIA_TN10_PREDECESSOR_TARGET_DRIFT:${JSON.stringify(target)}`);
      const nextDefinitionVersion = Number((await client.query(
        "select coalesce(max(definition_version),0)::int+1 value from public.estimate_definition_version where catalog_id=$1",
        [TARGET.catalogId],
      )).rows[0].value);
      const nextCounts = {
        definitions: Number(predecessor.definition_count),
        parameters: Number(predecessor.parameter_count) - Number(target.parameters) + MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS.length,
        formulas: Number(predecessor.formula_count) - Number(target.formulas) + MASONRY_BRICK_WALL_BIA_TN10_FORMULAS.length,
        resources: Number(predecessor.resource_row_count) - Number(target.resources) + MASONRY_BRICK_WALL_BIA_TN10_RESOURCES.length,
      };
      if (!APPLY) {
        receipt = {
          status: "GREEN_BIA_TN10_MASONRY_SUCCESSOR_PRECHECK_NO_MUTATION",
          idempotent: false,
          predecessor: { releaseId: predecessorReleaseId, searchReleaseId: predecessorSearchReleaseId,
            definitionId: target.definition_version_id, parameters: target.parameters,
            formulas: target.formulas, resources: target.resources },
          successor: { releaseId, searchReleaseId, definitionId, baselineId, releaseKey,
            definitionVersion: nextDefinitionVersion, nextCounts },
          coreAcceptance,
        };
      } else {
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
            JSON.stringify({ contract: CONTRACT, masterSha256: MASTER_SHA256,
              lifecycle: "DRAFT_FORWARD_ONLY", replacedDefinitionCount: 1,
              targetCatalogId: TARGET.catalogId,
              activationAllowed: false, productionEligible: false,
              netNeedSeparatedFromProcurement: true, unknownPriceIsNull: true }),
            predecessorReleaseId, sha256({ contract: CONTRACT, fingerprint, definitionSha256 }),
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
            from public.estimate_cumulative_manifest_entry where release_id=$3`, [releaseId, CONTRACT, predecessorReleaseId]);
          await client.query(`insert into public.estimate_definition_version(
              id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,
              source_metadata,content_status,content_gate_status)
            values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::jsonb,'QUARANTINED','RED')`, [
            definitionId, releaseId, TARGET.catalogId, nextDefinitionVersion,
            JSON.stringify({ catalogId: TARGET.catalogId,
              canonicalRuName: TARGET.titleRu,
              workKey: TARGET.catalogId.split(":").at(-1),
              physicalResultRu: "Полная смета кирпичной стены с раздельными потребностью и закупкой",
              exactNormId: BIA_TN10_MASONRY_NORM_ID }),
            JSON.stringify({ country: "KG", operationClass: "MEASURE_AND_LAY",
              materialSystem: "BIA_TN10_FIRED_CLAY_BRICK", productProfileId: BIA_TN10_MASONRY_PRODUCT_PROFILE_ID,
              contextKey: TARGET_KEY, contextRu: TARGET.contextRu,
              firedClayBrickOnly: true, aacAdhesiveAndMeshExcluded: true, failClosed: true }),
            definitionSha256,
            JSON.stringify({ contract: CONTRACT, predecessorDefinitionId: target.definition_version_id,
              parameterSchemaSha256, acceptanceEvidenceSha256, normativeSourceIds: [BIA_TN10_MASONRY_SOURCE_ID],
              synthetic: false, netNeedSeparatedFromProcurement: true, unknownPriceIsNull: true }),
          ]);
          await insertRows(client, "estimate_parameter_definition", [
            "definition_version_id", "parameter_id", "ordinal", "value_type", "unit_id", "title_ru", "required",
            "default_value", "constraints_json", "truth_metadata", "approved_template_baseline_id",
          ], MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS.map((parameter) => [
            definitionId, parameter.parameter_id, parameter.ordinal, parameter.value_type, parameter.unit_id,
            parameter.title_ru, parameter.required, null, parameter.constraints_json,
            { ...parameter.truth_metadata, contract: CONTRACT,
              semantic_parameter_key: `${TARGET.catalogId}:${parameter.parameter_id}`,
              formula_consumers: formulaConsumers[parameter.parameter_id],
              resource_branch_consumers: resourceConsumers[parameter.parameter_id] },
            null,
          ]));
          await insertRows(client, "estimate_formula_graph", [
            "definition_version_id", "formula_id", "output_unit_id", "expression_source", "ast", "input_parameter_ids", "ast_sha256",
          ], MASONRY_BRICK_WALL_BIA_TN10_FORMULAS.map((formula) => [
            definitionId, formula.formula_id, formula.output_unit_id, formula.expression_source,
            formula.ast, formula.input_parameter_ids, sha256(formula.ast),
          ]));
          const resourceIds = new Map<string, string>();
          const resources = MASONRY_BRICK_WALL_BIA_TN10_RESOURCES.map((resource) => {
            const id = uuid(`${CONTRACT}:${fingerprint}:resource:${resource.row_id}`);
            resourceIds.set(resource.row_id, id);
            return { ...resource, id, row_sha256: sha256({ contract: CONTRACT, resource }) };
          });
          await insertRows(client, "estimate_resource_spec", [
            "id", "definition_version_id", "row_id", "ordinal", "section", "category", "title_ru", "row_type",
            "unit_id", "formula_id", "inclusion_ast", "resource_graph", "semantic_owner", "cost_owner_id",
            "procurement_eligible", "source_metadata", "row_sha256",
          ], resources.map((resource) => [
            resource.id, definitionId, resource.row_id, resource.ordinal, resource.section, resource.category,
            resource.title_ru, resource.category === "construction_work" ? "labor" : resource.category,
            resource.unit_id, resource.formula_id,
            resource.inclusion_ast, resource.resource_graph,
            `${TARGET.catalogId}:${resource.row_id}`,
            resource.cost_owner_id, resource.procurement_eligible, resource.source_metadata, resource.row_sha256,
          ]));
          await client.query(`insert into public.estimate_approved_template_baseline(
              id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,parameter_schema_sha256,
              input_values,input_classification,uom_by_parameter,formula_consumer_ids,resource_consumer_row_ids,
              normative_source_ids,guide_provenance_ru,proposal_source_refs,validation_scenario_refs,
              acceptance_evidence_sha256,accepted_release_id,accepted_at,supersedes_baseline_id,contract_version)
            values($1,$2,$3,$4,$5,$6,
              '{"product_profile_id":"standard-profile:bia-tn10:selected-table-4-fired-clay-brick:v1"}'::jsonb,
              '{"product_profile_id":"NORMATIVE"}'::jsonb,'{"product_profile_id":null}'::jsonb,
              $7::jsonb,$8::jsonb,
              $9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13,$14,clock_timestamp(),$15,$16)`, [
            baselineId, `${CONTRACT}:${fingerprint.slice(0, 16)}:${TARGET.catalogId}`,
            TARGET.catalogId, definitionId, target.definition_version_id,
            parameterSchemaSha256, JSON.stringify(formulaConsumers), JSON.stringify(resourceConsumers),
            JSON.stringify(Object.fromEntries(MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS.map((parameter) => [
              parameter.parameter_id,
              NORMATIVE_PARAMETER_IDS.has(parameter.parameter_id) ? [BIA_TN10_MASONRY_SOURCE_ID] : [],
            ]))),
            JSON.stringify(Object.fromEntries(MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS.map((parameter) => [
              parameter.parameter_id, (parameter.truth_metadata.guide as Json).guide_short_ru,
            ]))),
            JSON.stringify([{ contract: CONTRACT, masterSha256: MASTER_SHA256,
              sourceUrl: BIA_TN10_MASONRY_SOURCE_METADATA.source_url,
              exactLocator: BIA_TN10_MASONRY_SOURCE_METADATA.exact_locator }]),
            JSON.stringify([{ scenario: "BIA_TN10_90_M2_NEED_AND_PROCUREMENT",
              fixture: MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT,
              acceptanceEvidenceSha256, coreAcceptance }]),
            acceptanceEvidenceSha256, releaseId, target.approved_template_baseline_id,
            "APPROVED_TEMPLATE_BASELINE_R54_V1",
          ]);
          await client.query(
            "update public.estimate_parameter_definition set approved_template_baseline_id=$2 where definition_version_id=$1",
            [definitionId, baselineId],
          );
          await client.query(`insert into public.estimate_content_passport_r3(
              definition_version_id,release_id,catalog_id,contract_version,identity_mode,redirect_catalog_id,
              physical_result_ru,included_scope_ru,excluded_scope_ru,capability_matrix,parameter_count,
              formula_count,resource_count,decision,payload_sha256,source_head,source_tree)
            values($1,$2,$3,'real-professional-estimates-r3.content-passport.v1','WORK',null,$4,$5::jsonb,$6::jsonb,
              $7::jsonb,$8,$9,$10,$11::jsonb,$12,$13,$14)`, [
            definitionId, releaseId, TARGET.catalogId,
            TARGET.titleRu,
            JSON.stringify([TARGET.contextRu, "кирпич", "раствор", "кладка", "контроль геометрии и швов", "очистка и сдача"]),
            JSON.stringify(["AAC", "тонкослойный клей", "кладочная сетка без проекта", "неподтверждённый транспорт", "высокая нагрузка и влажная зона без отдельного проектного подтверждения"]),
            JSON.stringify([
              { capability: "PARAMETERS", status: "GREEN" },
              { capability: "FORMULAS_AND_PHYSICAL_PARITY", status: "GREEN" },
              { capability: "NEED_AND_PROCUREMENT", status: "GREEN" },
              { capability: "PRICE", status: "GREEN_UNKNOWN_IS_NULL" },
            ]),
            MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS.length,
            MASONRY_BRICK_WALL_BIA_TN10_FORMULAS.length,
            MASONRY_BRICK_WALL_BIA_TN10_RESOURCES.length,
            JSON.stringify({ status: "GREEN", allowed: true, waveContract: CONTRACT,
              exactNormativeWave: true, activationAllowed: false, productionEligible: false }),
            sha256({ definitionSha256, parameterSchemaSha256, acceptanceEvidenceSha256 }), head, tree,
          ]);
          await client.query(`update public.estimate_definition_version
            set content_status='CANDIDATE_READY',content_gate_status='GREEN'
            where id=$1 and release_id=$2 and catalog_id=$3`, [
            definitionId, releaseId, TARGET.catalogId,
          ]);
          await client.query(`insert into public.estimate_normative_source(
              id,source_key,title_ru,authority,official_url,artifact_sha256,effective_from,metadata)
            values($1,$2,$3,'Brick Industry Association',$4,null,'2017-01-01',$5::jsonb)
            on conflict(source_key) do update set official_url=excluded.official_url,
              metadata=(public.estimate_normative_source.metadata-'targetCatalogId')||excluded.metadata`, [
            uuid(`${CONTRACT}:source:${BIA_TN10_MASONRY_SOURCE_ID}`),
            BIA_TN10_MASONRY_SOURCE_ID, BIA_TN10_MASONRY_SOURCE_METADATA.source_title,
            BIA_TN10_MASONRY_SOURCE_METADATA.source_url,
            JSON.stringify({ contract: CONTRACT, verifiedAt: "2026-09-15",
              targetFamily: "masonry_interior_brick_wall_lay",
              sourceDefinitionHash: BIA_TN10_MASONRY_SOURCE_METADATA.definition_hash,
              useRestriction: "EXACT_SELECTED_BIA_TN10_TABLE4_FIRED_CLAY_BRICK_ONLY",
              automaticGenericBinding: false }),
          ]);
          const sourceId = String((await client.query(
            "select id::text from public.estimate_normative_source where source_key=$1",
            [BIA_TN10_MASONRY_SOURCE_ID],
          )).rows[0].id);
          const locatorPayload = {
            documentCode: "BIA Technical Notes 10",
            exactLocator: BIA_TN10_MASONRY_SOURCE_METADATA.exact_locator,
            selectedTable: "Table 4",
            measurementUnit: "selected brick piece and mortar m3 per net wall m2",
            firedClayBrickOnly: true,
            wasteAndSupplierPackagesProjectSpecific: true,
            unsupportedAacAdhesiveAndMeshExcluded: true,
          };
          const locatorKey = sha256(locatorPayload);
          await client.query(`insert into public.estimate_normative_locator(
              id,source_id,locator_key,locator,excerpt_sha256)
            values($1,$2,$3,$4::jsonb,$5) on conflict(source_id,locator_key) do nothing`, [
            uuid(`${CONTRACT}:locator:${BIA_TN10_MASONRY_SOURCE_ID}:${locatorKey}`),
            sourceId, locatorKey, JSON.stringify(locatorPayload), sha256(locatorPayload),
          ]);
          const locatorId = String((await client.query(
            "select id::text from public.estimate_normative_locator where source_id=$1 and locator_key=$2",
            [sourceId, locatorKey],
          )).rows[0].id);
          await insertRows(client, "estimate_work_normative_binding", [
            "definition_version_id", "resource_spec_id", "locator_id", "applicability",
          ], [
            [definitionId, resourceIds.get("material:bia-tn10:fired-clay-brick"), locatorId, {
              ...((MASONRY_BRICK_WALL_BIA_TN10_RESOURCES[0]!.resource_graph.professionalPhysicalNormBindingV1) as Json),
              norm_id: BIA_TN10_MASONRY_NORM_ID,
              source_document_version: BIA_TN10_MASONRY_SOURCE_METADATA.source_document_version,
              source_definition_hash: BIA_TN10_MASONRY_SOURCE_METADATA.definition_hash,
              exact_locator: BIA_TN10_MASONRY_SOURCE_METADATA.exact_locator,
            }],
            [definitionId, resourceIds.get("material:bia-tn10:masonry-mortar"), locatorId, {
              ...((MASONRY_BRICK_WALL_BIA_TN10_RESOURCES[1]!.resource_graph.professionalPhysicalNormBindingV1) as Json),
              norm_id: BIA_TN10_MASONRY_NORM_ID,
              source_document_version: BIA_TN10_MASONRY_SOURCE_METADATA.source_document_version,
              source_definition_hash: BIA_TN10_MASONRY_SOURCE_METADATA.definition_hash,
              exact_locator: BIA_TN10_MASONRY_SOURCE_METADATA.exact_locator,
            }],
          ]);
          await client.query(`update public.estimate_cumulative_manifest_entry set
              definition_version_id=$3,source_batch=$4,source_release_id=$1,publication_state='CANONICAL_SUCCESSOR',
              approved_template_baseline_id=$5,baseline_ready=true,scenario_ready=true,definition_hash=$6,
              entry_sha256=$7,runtime_publication_state='CANDIDATE'
            where release_id=$1 and catalog_id=$2`, [
            releaseId, TARGET.catalogId, definitionId, CONTRACT, baselineId,
            definitionSha256, sha256({ contract: CONTRACT, releaseId,
              catalogId: TARGET.catalogId, definitionId, baselineId, definitionSha256 }),
          ]);
          const search = await cloneSearch(client, { predecessorSearchReleaseId, releaseId, searchReleaseId,
            releaseKey, head, tree, fingerprint, definitionId });
          const manifestAudit = (await client.query(`select count(*)::int identities,
              count(*) filter(where catalog_id=$2 and definition_version_id=$3)::int replaced,
              encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot
            from public.estimate_cumulative_manifest_entry where release_id=$1`, [
            releaseId, TARGET.catalogId, definitionId,
          ])).rows[0] as Json;
          const targetAudit = (await client.query(`select
              (select count(*)::int from public.estimate_parameter_definition where definition_version_id=$1) parameters,
              (select count(*)::int from public.estimate_parameter_definition where definition_version_id=$1 and default_value is not null) defaults,
              (select count(*)::int from public.estimate_formula_graph where definition_version_id=$1) formulas,
              (select count(*)::int from public.estimate_resource_spec where definition_version_id=$1) resources,
              (select count(*)::int from public.estimate_resource_spec where definition_version_id=$1 and source_metadata->>'synthetic'='true') synthetic_rows,
              (select count(*)::int from public.estimate_resource_price_route_binding b join public.estimate_resource_spec r on r.id=b.resource_spec_id where r.definition_version_id=$1) price_bindings,
              (select count(*)::int from public.estimate_work_normative_binding where definition_version_id=$1) normalized_bindings,
              (select count(*)::int from public.estimate_resource_spec where definition_version_id=$1
                and resource_graph#>>'{professionalPhysicalNormBindingV1,source_id}'=$2
                and resource_graph#>>'{professionalPhysicalNormBindingV1,quantity_output_parameter_id}' is not null
                and resource_graph#>>'{professionalPhysicalNormBindingV1,quantity_output_formula_id}' is not null) physical_quantity_owner_rows,
              (select count(*)::int from public.estimate_resource_spec resource where resource.definition_version_id=$1
                and exists(select 1 from jsonb_array_elements(coalesce(resource.source_metadata->'normativeTrace','[]'::jsonb)) trace
                  where coalesce(trace->>'source_id',trace->>'sourceId',trace->>'document_code')=any($3::text[]))) forbidden_legacy_rows`, [
            definitionId, BIA_TN10_MASONRY_SOURCE_ID, FORBIDDEN_LEGACY_SOURCE_IDS,
          ])).rows[0] as Json;
          const searchTarget = (await client.query(`select definition_version_id,required_inputs_count,selectable,canonical_name_ru
            from public.estimate_search_document where search_release_id=$1 and catalog_id=$2`, [
            searchReleaseId, TARGET.catalogId,
          ])).rows[0] as Json;
          invariant(Number(manifestAudit.identities) === 10_331 && Number(manifestAudit.replaced) === 1,
            `STOP_BIA_TN10_MANIFEST_AUDIT:${JSON.stringify(manifestAudit)}`);
          invariant(Number(targetAudit.parameters) === 22 && Number(targetAudit.defaults) === 0
            && Number(targetAudit.formulas) === 5 && Number(targetAudit.resources) === 5
            && Number(targetAudit.synthetic_rows) === 0 && Number(targetAudit.price_bindings) === 0
            && Number(targetAudit.normalized_bindings) === 2
            && Number(targetAudit.physical_quantity_owner_rows) === 2
            && Number(targetAudit.forbidden_legacy_rows) === 0,
          `STOP_BIA_TN10_TARGET_AUDIT:${JSON.stringify(targetAudit)}`);
          invariant(String(searchTarget.definition_version_id) === definitionId
            && Number(searchTarget.required_inputs_count) === 22 && searchTarget.selectable === true
            && searchTarget.canonical_name_ru === TARGET.titleRu,
          `STOP_BIA_TN10_SEARCH_TARGET_AUDIT:${JSON.stringify(searchTarget)}`);
          await client.query(`update public.estimate_definition_release
            set source_manifest_sha256=$2,status='prepared',sealed_at=clock_timestamp(),
              metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
            releaseId, manifestAudit.snapshot,
            JSON.stringify({ lifecycle: "PREPARED_NOT_ACTIVE", searchReleaseId,
              searchSnapshotSha256: search.snapshot_sha256, exactResourceRowCount: 5,
              normalizedBiaBindingCount: 2, sourceCoreAcceptanceSha256: coreAcceptance.deterministicSha256 }),
          ]);
          await client.query("commit");
          receipt = {
            status: "GREEN_BIA_TN10_MASONRY_SUCCESSOR_PREPARED_NOT_ACTIVE",
            idempotent: false,
            predecessor: { releaseId: predecessorReleaseId, searchReleaseId: predecessorSearchReleaseId,
              definitionId: target.definition_version_id, parameters: target.parameters,
              formulas: target.formulas, resources: target.resources },
            successor: { releaseId, searchReleaseId, definitionId, baselineId, releaseKey,
              definitionVersion: nextDefinitionVersion, nextCounts },
            coreAcceptance,
            audit: { manifest: manifestAudit, target: targetAudit, search, searchTarget,
              forbiddenLegacySourceIds: FORBIDDEN_LEGACY_SOURCE_IDS },
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
    targetCatalogId: TARGET.catalogId,
    targetKey: TARGET_KEY,
    targetContextRu: TARGET.contextRu,
    ...receipt!,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
  };
  const sealed = { ...body, receiptSha256: sha256(body) };
  if (APPLY && !receipt!.idempotent) {
    atomicJson(resolve(OUTPUT_ROOT, `01_BIA_TN10_MASONRY_SUCCESSOR_${head}.json`), sealed);
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
      owner: "EXACT_BIA_TN10_FIRED_CLAY_MASONRY_COMPLETE_ESTIMATE_SUCCESSOR",
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
