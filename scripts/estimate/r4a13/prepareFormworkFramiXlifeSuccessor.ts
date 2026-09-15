import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  RICS_NRM2_FORMWORK_NORM_ID,
  RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
  RICS_NRM2_FORMWORK_SOURCE_ID,
  RICS_NRM2_FORMWORK_SOURCE_METADATA,
} from "../../../src/lib/estimate/v4/domainFactory/formworkRicsNrm2PhysicalNormV1";
import {
  FORMWORK_FRAMI_XLIFE_EXACT_INPUT,
  FORMWORK_FRAMI_XLIFE_FORMULAS,
  FORMWORK_FRAMI_XLIFE_PARAMETERS,
  FORMWORK_FRAMI_XLIFE_PILE_CAP_WET_ZONE_CATALOG_ID,
  FORMWORK_FRAMI_XLIFE_RESOURCES,
  FORMWORK_FRAMI_XLIFE_SENSITIVITY_INPUT,
  FORMWORK_FRAMI_XLIFE_SOURCE_ID,
  FORMWORK_FRAMI_XLIFE_SOURCE_METADATA,
  FORMWORK_FRAMI_XLIFE_SYSTEM_PROFILE_ID,
  FORMWORK_FRAMI_XLIFE_TITLE_RU,
  compileFormworkFramiXlifeProjectKitR1,
} from "../../../src/lib/estimate/v4/formworkFramiXlifeProjectKitR1";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.formwork-frami-xlife-pile-cap-wet-zone-complete-estimate.v1";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (7).md",
);
const MASTER_SHA256 = "c03f3fbefa010d78b1313bd8491c6cea82778b2a75ccf594e6e3a29cde230a57";
const PREDECESSOR_RELEASE_ID = "97e1125d-24f3-513f-b203-d96fd54ecb83";
const PREDECESSOR_SEARCH_RELEASE_ID = "14c18717-0c98-5c2d-b61c-bc4132809d6f";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_ROOT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/formwork-frami-xlife-pile-cap-wet-zone-full-project-kit",
);
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const APPLY = process.argv.includes("--apply");
const TARGET_CATALOG_ID = FORMWORK_FRAMI_XLIFE_PILE_CAP_WET_ZONE_CATALOG_ID;
const TARGET_GROUP_ID = "wg:base:concrete_foundation_interior_pile_cap_form";
const TARGET_GROUP_NAME_RU = "опалубка свайного ростверка";
const SOURCE_PATHS = [
  "data/estimate-norms/professional/formwork.json",
  "src/lib/estimate/v4/formworkFramiXlifeProjectKitR1.ts",
  "scripts/estimate/r4a13/prepareFormworkFramiXlifeSuccessor.ts",
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
    `STOP_FORMWORK_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_FORMWORK_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
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
      invariant(row.length === columns.length, `STOP_FORMWORK_INSERT_SHAPE:${table}`);
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

function row(rows: readonly Json[], rowId: string): Json {
  const found = rows.find((candidate) => candidate.row_id === rowId);
  invariant(found, `STOP_FORMWORK_CORE_ROW_MISSING:${rowId}`);
  return found;
}

function databaseRowType(category: string): string {
  if (category === "construction_work") return "labor";
  if (category === "delivery") return "service";
  return category;
}

async function verifyThroughExistingCore(): Promise<Json> {
  const exact = await compileFormworkFramiXlifeProjectKitR1({ ...FORMWORK_FRAMI_XLIFE_EXACT_INPUT });
  const areaOnly = await compileFormworkFramiXlifeProjectKitR1({
    ...FORMWORK_FRAMI_XLIFE_EXACT_INPUT,
    measured_formwork_contact_area_m2: 120,
  });
  const sensitivity = await compileFormworkFramiXlifeProjectKitR1({ ...FORMWORK_FRAMI_XLIFE_SENSITIVITY_INPUT });
  invariant(exact.rows.length === 24 && exact.preliminaryNeeds.length === 0,
    `STOP_FORMWORK_CORE_EXACT_ROWS:${exact.rows.length}:${exact.preliminaryNeeds.length}`);
  invariant(exact.totals.includedRowCount === 17 && exact.totals.unpricedRowCount === 17,
    `STOP_FORMWORK_SCOPE_OR_PRICE_STATE:${JSON.stringify(exact.totals)}`);
  invariant(exact.rows.filter((item) => item.included_in_procurement).length === 14,
    "STOP_FORMWORK_PROCUREMENT_ROW_COUNT");
  invariant(exact.rows.every((item) => item.unit_price == null && item.amount == null),
    "STOP_FORMWORK_UNKNOWN_PRICE_NOT_NULL");
  invariant(new Set(exact.rows.map((item) => item.category)).size === 5,
    "STOP_FORMWORK_REQUIRED_CATEGORIES_MISSING");
  for (const exactRow of exact.rows.filter((item) => item.row_id !== "information:formwork:measured-contact-area")) {
    invariant(row(areaOnly.rows, exactRow.row_id).quantity === exactRow.quantity,
      `STOP_FORMWORK_AREA_DERIVED_UNIVERSAL_KIT:${exactRow.row_id}`);
  }
  invariant(row(sensitivity.rows, "equipment:formwork:frami-xlife-panels-rental").quantity === "392"
    && row(sensitivity.rows, "material:formwork:perforated-tape-50x2").quantity === "60"
    && row(sensitivity.rows, "work:formwork:assemble-install-align").quantity === "86"
    && row(sensitivity.rows, "delivery:formwork:outbound-kit").quantity === "70",
  "STOP_FORMWORK_SENSITIVITY_PROJECT_SCHEDULE");
  const negativeCases: readonly Json[] = [
    { formwork_system_profile_id: "standard-profile:generic-formwork" },
    { project_formwork_layout_reference: undefined },
    { foundation_wall_thickness_cm: 81 },
    { single_or_double_sided_scope: "UNDECLARED" },
  ];
  for (const patch of negativeCases) {
    let rejected = false;
    try {
      await compileFormworkFramiXlifeProjectKitR1({ ...FORMWORK_FRAMI_XLIFE_EXACT_INPUT, ...patch });
    } catch (error) {
      rejected = ["PARAMETER_VALIDATION_FAILED", "PHYSICAL_NORM_APPLICABILITY_FAILED"]
        .includes(String((error as { code?: unknown })?.code ?? ""));
    }
    invariant(rejected, `STOP_FORMWORK_NEGATIVE_ACCEPTED:${JSON.stringify(patch)}`);
  }
  return {
    compilerOwner: "compileCanonicalEstimateCore",
    exact: {
      measuredContactAreaM2: 100,
      rows: exact.rows.length,
      includedRows: exact.totals.includedRowCount,
      excludedInformationRows: exact.totals.excludedRowCount,
      procurementRows: exact.rows.filter((item) => item.included_in_procurement).length,
      unpricedRows: exact.totals.unpricedRowCount,
      categories: [...new Set(exact.rows.map((item) => item.category))].sort(),
    },
    sensitivity: {
      measuredContactAreaM2: 120,
      scheduleRevision: "ACCEPTANCE-FW-LAYOUT-001-REV-B",
      panelRentalPieceDays: 392,
      perforatedTapeM: 60,
      assemblyWorkerHours: 86,
      outboundTransportTKm: 70,
    },
    areaOnlyDoesNotDeriveCommercialKit: true,
    negativeCasesRejected: negativeCases.length,
    deterministicSha256: sha256(exact),
  };
}

async function cloneSearch(client: Client, input: {
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
    sha256(`${input.searchReleaseId}:draft`), CONTRACT, PREDECESSOR_SEARCH_RELEASE_ID,
    input.releaseId, input.fingerprint,
  ]);
  await client.query(`insert into public.estimate_search_group(
      search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition)
    select $1,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
    from public.estimate_search_group where search_release_id=$2`, [
    input.searchReleaseId, PREDECESSOR_SEARCH_RELEASE_ID,
  ]);
  const normalizedGroup = await client.query(`update public.estimate_search_group set
      group_name_ru=$3,breadcrumb=jsonb_build_array($3::text)
    where search_release_id=$1 and group_id=$2`, [
    input.searchReleaseId, TARGET_GROUP_ID, TARGET_GROUP_NAME_RU,
  ]);
  invariant(normalizedGroup.rowCount === 1, `STOP_FORMWORK_SEARCH_GROUP_AUDIT:${normalizedGroup.rowCount}`);
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
  const aliases = [
    "опалубка свайного ростверка",
    "опалубка ростверка во влажной зоне",
    "аренда Doka Frami Xlife для фундамента",
    "полный комплект опалубки ростверка",
    "Frami Xlife foundation formwork",
  ];
  const normalizedCanonicalName = normalizeSearchText(FORMWORK_FRAMI_XLIFE_TITLE_RU);
  const normalizedAliases = aliases.map(normalizeSearchText);
  const normalizedSearchTerms = unique([
    normalizeSearchText(TARGET_CATALOG_ID),
    normalizedCanonicalName,
    ...normalizedCanonicalName.split(" "),
    ...normalizedAliases,
    ...normalizedAliases.flatMap((alias) => alias.split(" ")),
  ]);
  const clarificationFields = FORMWORK_FRAMI_XLIFE_PARAMETERS.map((parameter) => ({
    parameterId: parameter.parameter_id,
    titleRu: parameter.title_ru,
    unitId: parameter.unit_id,
  }));
  await client.query(`update public.estimate_search_document set
      canonical_name_ru=$3,primary_uom='m2',short_scope_ru=$4,
      included_boundaries=$5::jsonb,excluded_boundaries=$6::jsonb,
      required_inputs_count=$7,clarification_fields=$8::jsonb,
      normative_classifiers=$9::text[],applicability_tags=$10::text[],
      source_provenance=source_provenance||jsonb_build_object('exactPhysicalNormProfile',$11::text,
        'formworkSystemProfile',$12::text),aliases=$13::text[],
      normalized_canonical_name=$14,normalized_aliases=$15::text[],
      normalized_search_terms=$16::text[],normalized_search_blob=$17,
      definition_version_id=$18::uuid,
      document_sha256=encode(extensions.digest(convert_to(document_sha256||':'||$11||':'||$12,'UTF8'),'sha256'),'hex')
    where search_release_id=$1 and catalog_id=$2`, [
    input.searchReleaseId, TARGET_CATALOG_ID, FORMWORK_FRAMI_XLIFE_TITLE_RU,
    "Полная смета съёмной опалубки ростверка: измеренная площадь, возвратный комплект, расходники, работы, механизм, услуга и доставка с возвратом.",
    JSON.stringify([
      "измеренная площадь контакта по RICS NRM 2",
      "утверждённая раскладка Doka Frami Xlife",
      "возвратные щиты, углы, соединители, стяжки, зажимы и подкосы",
      "расходные материалы, монтаж, распалубка и очистка",
      "инженерная проверка, кран, доставка и возврат",
    ]),
    JSON.stringify([
      "универсальные коэффициенты комплекта на м²",
      "неподтверждённая оборачиваемость",
      "цены без коммерческого снимка",
      "односторонняя схема и отдельная рабочая площадка для этого приёмочного проекта",
    ]),
    clarificationFields.length, JSON.stringify(clarificationFields),
    [RICS_NRM2_FORMWORK_NORM_ID, RICS_NRM2_FORMWORK_SOURCE_ID, FORMWORK_FRAMI_XLIFE_SOURCE_ID],
    ["EXACT_RICS_NRM2_CONTACT_AREA", "DOKA_FRAMI_XLIFE_FOUNDATION", "PROJECT_SCHEDULE_REQUIRED",
      "RENTAL_RETURNABLE", "FULL_QUANTITY_SCOPE_PRICE_PARTIAL"],
    RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID, FORMWORK_FRAMI_XLIFE_SYSTEM_PROFILE_ID,
    aliases, normalizedCanonicalName, normalizedAliases, normalizedSearchTerms,
    normalizedSearchTerms.join("\u001f"), input.definitionId,
  ]);
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
      targetCatalogId: TARGET_CATALOG_ID,
      exactPhysicalNormProfile: RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
      formworkSystemProfile: FORMWORK_FRAMI_XLIFE_SYSTEM_PROFILE_ID,
    }),
  ]);
  return snapshot;
}

async function upsertSourcesAndBindings(
  client: Client,
  input: { definitionId: string; resourceIds: Map<string, string> },
): Promise<number> {
  await client.query(`insert into public.estimate_normative_source(
      id,source_key,title_ru,authority,official_url,artifact_sha256,effective_from,metadata)
    values($1,$2,$3,'Royal Institution of Chartered Surveyors',$4,null,'2021-12-01',$5::jsonb)
    on conflict(source_key) do update set official_url=excluded.official_url,
      metadata=(public.estimate_normative_source.metadata-'targetCatalogId')||excluded.metadata`, [
    uuid(`${CONTRACT}:source:${RICS_NRM2_FORMWORK_SOURCE_ID}`),
    RICS_NRM2_FORMWORK_SOURCE_ID, RICS_NRM2_FORMWORK_SOURCE_METADATA.source_title,
    RICS_NRM2_FORMWORK_SOURCE_METADATA.source_url,
    JSON.stringify({
      contract: CONTRACT,
      verifiedAt: "2026-09-15",
      sourceDefinitionHash: RICS_NRM2_FORMWORK_SOURCE_METADATA.definition_hash,
      useRestriction: "MEASURED_CONTACT_AREA_ONLY_NO_AUTOMATIC_PRODUCTION_RATE",
      automaticGenericBinding: false,
    }),
  ]);
  await client.query(`insert into public.estimate_normative_source(
      id,source_key,title_ru,authority,official_url,artifact_sha256,effective_from,metadata)
    values($1,$2,$3,'Doka GmbH',$4,null,'2023-11-01',$5::jsonb)
    on conflict(source_key) do update set official_url=excluded.official_url,
      metadata=(public.estimate_normative_source.metadata-'targetCatalogId')||excluded.metadata`, [
    uuid(`${CONTRACT}:source:${FORMWORK_FRAMI_XLIFE_SOURCE_ID}`),
    FORMWORK_FRAMI_XLIFE_SOURCE_ID, FORMWORK_FRAMI_XLIFE_SOURCE_METADATA.source_title,
    FORMWORK_FRAMI_XLIFE_SOURCE_METADATA.source_url,
    JSON.stringify({
      contract: CONTRACT,
      verifiedAt: "2026-09-15",
      sourceDefinitionHash: FORMWORK_FRAMI_XLIFE_SOURCE_METADATA.definition_hash,
      useRestriction: "SYSTEM_COMPONENTS_AND_APPLICABILITY_ONLY_PROJECT_SCHEDULE_REQUIRED",
      universalBomOrTurnoverFactor: false,
    }),
  ]);
  const sourceRows = await client.query(
    "select id::text,source_key from public.estimate_normative_source where source_key=any($1::text[])",
    [[RICS_NRM2_FORMWORK_SOURCE_ID, FORMWORK_FRAMI_XLIFE_SOURCE_ID]],
  );
  const sourceIds = new Map(sourceRows.rows.map((item: Json) => [String(item.source_key), String(item.id)]));
  invariant(sourceIds.size === 2, "STOP_FORMWORK_NORMATIVE_SOURCE_UPSERT");
  const ricsLocator = {
    documentCode: "RICS NRM 2, second edition",
    exactLocator: RICS_NRM2_FORMWORK_SOURCE_METADATA.exact_locator,
    measurementUnit: "m2 actual contact area",
    measurementOnly: true,
    automaticProductionRate: false,
  };
  const dokaLocator = {
    documentCode: "Doka 999810202-2023-11",
    exactLocator: FORMWORK_FRAMI_XLIFE_SOURCE_METADATA.exact_locator,
    formworkSystemProfileId: FORMWORK_FRAMI_XLIFE_SYSTEM_PROFILE_ID,
    projectLayoutAndScheduleRequired: true,
    universalBomOrTurnoverFactor: false,
  };
  for (const [sourceKey, locator] of [
    [RICS_NRM2_FORMWORK_SOURCE_ID, ricsLocator],
    [FORMWORK_FRAMI_XLIFE_SOURCE_ID, dokaLocator],
  ] as const) {
    const locatorKey = sha256(locator);
    await client.query(`insert into public.estimate_normative_locator(
        id,source_id,locator_key,locator,excerpt_sha256)
      values($1,$2,$3,$4::jsonb,$5) on conflict(source_id,locator_key) do nothing`, [
      uuid(`${CONTRACT}:locator:${sourceKey}:${locatorKey}`),
      sourceIds.get(sourceKey), locatorKey, JSON.stringify(locator), sha256(locator),
    ]);
  }
  const locators = await client.query(`select source.source_key,locator.id::text
    from public.estimate_normative_locator locator
    join public.estimate_normative_source source on source.id=locator.source_id
    where source.source_key=any($1::text[])`, [[RICS_NRM2_FORMWORK_SOURCE_ID, FORMWORK_FRAMI_XLIFE_SOURCE_ID]]);
  const locatorBySource = new Map(locators.rows.map((item: Json) => [String(item.source_key), String(item.id)]));
  invariant(locatorBySource.size === 2, "STOP_FORMWORK_NORMATIVE_LOCATOR_UPSERT");
  const measurement = FORMWORK_FRAMI_XLIFE_RESOURCES.find(
    (resource) => resource.row_id === "information:formwork:measured-contact-area",
  );
  invariant(measurement, "STOP_FORMWORK_MEASUREMENT_RESOURCE_MISSING");
  const bindings: unknown[][] = [[
    input.definitionId,
    input.resourceIds.get(measurement.row_id),
    locatorBySource.get(RICS_NRM2_FORMWORK_SOURCE_ID),
    {
      ...(measurement.resource_graph.professionalPhysicalNormBindingV1 as Json),
      norm_id: RICS_NRM2_FORMWORK_NORM_ID,
      source_document_version: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_document_version,
      source_definition_hash: RICS_NRM2_FORMWORK_SOURCE_METADATA.definition_hash,
      exact_locator: RICS_NRM2_FORMWORK_SOURCE_METADATA.exact_locator,
    },
  ]];
  for (const resource of FORMWORK_FRAMI_XLIFE_RESOURCES.filter((candidate) => (
    JSON.stringify(candidate.source_metadata?.normativeTrace ?? []).includes(FORMWORK_FRAMI_XLIFE_SOURCE_ID)
  ))) {
    bindings.push([
      input.definitionId,
      input.resourceIds.get(resource.row_id),
      locatorBySource.get(FORMWORK_FRAMI_XLIFE_SOURCE_ID),
      {
        formwork_system_profile_id: FORMWORK_FRAMI_XLIFE_SYSTEM_PROFILE_ID,
        manufacturer_document_reference: FORMWORK_FRAMI_XLIFE_SOURCE_ID,
        project_layout_and_schedule_required: true,
        quantity_source: "APPROVED_PROJECT_SCHEDULE_DIRECT",
        universal_area_rate_applied: false,
        universal_turnover_factor_applied: false,
      },
    ]);
  }
  await insertRows(client, "estimate_work_normative_binding", [
    "definition_version_id", "resource_spec_id", "locator_id", "applicability",
  ], bindings);
  return bindings.length;
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH, "STOP_FORMWORK_BRANCH_DRIFT");
  invariant(existsSync(MASTER_PATH) && sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256,
    "STOP_FORMWORK_MASTER_SHA256_DRIFT");
  for (const path of SOURCE_PATHS) {
    invariant(existsSync(resolve(path)), `STOP_FORMWORK_SOURCE_MISSING:${path}`);
    invariant(git("diff", "--name-only", "HEAD", "--", path) === "", `STOP_FORMWORK_SOURCE_UNCOMMITTED:${path}`);
  }
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const sourceHashes = SOURCE_PATHS.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) }));
  const coreAcceptance = await verifyThroughExistingCore();
  const parameterSchemaSha256 = sha256(FORMWORK_FRAMI_XLIFE_PARAMETERS.map((parameter) => ({
    id: parameter.parameter_id,
    type: parameter.value_type,
    unit: parameter.unit_id,
    required: parameter.required,
    constraints: parameter.constraints_json,
  })));
  const definitionSha256 = sha256({
    contract: CONTRACT,
    parameters: FORMWORK_FRAMI_XLIFE_PARAMETERS,
    formulas: FORMWORK_FRAMI_XLIFE_FORMULAS.map((formula) => ({
      id: formula.formula_id,
      source: formula.expression_source,
      ast: formula.ast,
    })),
    resources: FORMWORK_FRAMI_XLIFE_RESOURCES,
  });
  const fingerprint = sha256({
    contract: CONTRACT,
    masterSha256: MASTER_SHA256,
    head,
    tree,
    predecessorReleaseId: PREDECESSOR_RELEASE_ID,
    predecessorSearchReleaseId: PREDECESSOR_SEARCH_RELEASE_ID,
    sourceHashes,
    parameterSchemaSha256,
    definitionSha256,
    coreAcceptance,
  });
  const releaseId = uuid(`${CONTRACT}:${fingerprint}:definition-release`);
  const searchReleaseId = uuid(`${CONTRACT}:${fingerprint}:search-release`);
  const definitionId = uuid(`${CONTRACT}:${fingerprint}:${TARGET_CATALOG_ID}:definition`);
  const baselineId = uuid(`${CONTRACT}:${fingerprint}:${TARGET_CATALOG_ID}:baseline`);
  const releaseKey = `r4-a13-6-formwork-frami-xlife-pile-cap-${fingerprint.slice(0, 16)}`;
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.productionAccessed === false, "STOP_FORMWORK_CURRENT_PRODUCTION_ACCESS_FLAG");
  invariant(
    (current.definitionReleaseId === PREDECESSOR_RELEASE_ID
      && current.searchReleaseId === PREDECESSOR_SEARCH_RELEASE_ID)
      || (current.definitionReleaseId === releaseId && current.searchReleaseId === searchReleaseId),
    "STOP_FORMWORK_CURRENT_RELEASE_DRIFT",
  );
  const formulaConsumers = Object.fromEntries(FORMWORK_FRAMI_XLIFE_PARAMETERS.map((parameter) => [
    parameter.parameter_id,
    FORMWORK_FRAMI_XLIFE_FORMULAS
      .filter((formula) => formula.input_parameter_ids.includes(parameter.parameter_id))
      .map((formula) => formula.formula_id),
  ]));
  const resourceConsumers = Object.fromEntries(FORMWORK_FRAMI_XLIFE_PARAMETERS.map((parameter) => [
    parameter.parameter_id,
    FORMWORK_FRAMI_XLIFE_RESOURCES
      .filter((resource) => formulaConsumers[parameter.parameter_id].includes(resource.formula_id)
        || JSON.stringify(resource.resource_graph).includes(`"${parameter.parameter_id}"`))
      .map((resource) => resource.row_id),
  ]));
  const parametersWithoutConsumers = Object.entries(resourceConsumers)
    .filter(([, consumers]) => (consumers as string[]).length === 0)
    .map(([parameterId]) => parameterId);
  invariant(parametersWithoutConsumers.length === 0,
    `STOP_FORMWORK_PARAMETERS_WITHOUT_RESOURCE_CONSUMERS:${parametersWithoutConsumers.join(",")}`);
  const acceptanceEvidenceSha256 = sha256({
    contract: CONTRACT,
    coreAcceptance,
    parameterSchemaSha256,
    definitionSha256,
    formulaConsumers,
    resourceConsumers,
  });

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "r4-a13-6-formwork-frami-xlife-successor",
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
      "STOP_FORMWORK_PREDECESSOR_RELEASE_DRIFT");
    invariant(predecessorSearch?.status === "draft", "STOP_FORMWORK_PREDECESSOR_SEARCH_DRIFT");
    const existing = (await client.query(
      "select id,status,activated_at from public.estimate_definition_release where id=$1",
      [releaseId],
    )).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.status === "prepared" && existing.activated_at == null,
        "STOP_FORMWORK_EXISTING_SUCCESSOR_STATE_DRIFT");
      const audit = (await client.query(`select count(*)::int identities,
          count(*) filter(where catalog_id=$2 and definition_version_id=$3)::int replaced
        from public.estimate_cumulative_manifest_entry where release_id=$1`, [
        releaseId, TARGET_CATALOG_ID, definitionId,
      ])).rows[0] as Json;
      receipt = {
        status: "GREEN_FORMWORK_FRAMI_XLIFE_SUCCESSOR_ALREADY_PREPARED_NOT_ACTIVE",
        idempotent: true,
        successor: { releaseId, searchReleaseId, definitionId, baselineId, releaseKey },
        coreAcceptance,
        audit,
      };
    } else {
      const target = (await client.query(`select manifest.*,definition.definition_version,
          (select count(*)::int from public.estimate_parameter_definition where definition_version_id=manifest.definition_version_id) parameters,
          (select count(*)::int from public.estimate_formula_graph where definition_version_id=manifest.definition_version_id) formulas,
          (select count(*)::int from public.estimate_resource_spec where definition_version_id=manifest.definition_version_id) resources
        from public.estimate_cumulative_manifest_entry manifest
        join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
        where manifest.release_id=$1 and manifest.catalog_id=$2`, [
        PREDECESSOR_RELEASE_ID, TARGET_CATALOG_ID,
      ])).rows[0] as Json;
      invariant(target, "STOP_FORMWORK_PREDECESSOR_TARGET_MISSING");
      const nextDefinitionVersion = Number((await client.query(
        "select coalesce(max(definition_version),0)::int+1 value from public.estimate_definition_version where catalog_id=$1",
        [TARGET_CATALOG_ID],
      )).rows[0].value);
      const nextCounts = {
        definitions: Number(predecessor.definition_count),
        parameters: Number(predecessor.parameter_count) - Number(target.parameters)
          + FORMWORK_FRAMI_XLIFE_PARAMETERS.length,
        formulas: Number(predecessor.formula_count) - Number(target.formulas)
          + FORMWORK_FRAMI_XLIFE_FORMULAS.length,
        resources: Number(predecessor.resource_row_count) - Number(target.resources)
          + FORMWORK_FRAMI_XLIFE_RESOURCES.length,
      };
      if (!APPLY) {
        receipt = {
          status: "GREEN_FORMWORK_FRAMI_XLIFE_SUCCESSOR_PRECHECK_NO_MUTATION",
          idempotent: false,
          predecessor: {
            releaseId: PREDECESSOR_RELEASE_ID,
            searchReleaseId: PREDECESSOR_SEARCH_RELEASE_ID,
            definitionId: target.definition_version_id,
            parameters: target.parameters,
            formulas: target.formulas,
            resources: target.resources,
          },
          successor: {
            releaseId,
            searchReleaseId,
            definitionId,
            baselineId,
            releaseKey,
            definitionVersion: nextDefinitionVersion,
            nextCounts,
          },
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
            JSON.stringify({
              contract: CONTRACT,
              masterSha256: MASTER_SHA256,
              lifecycle: "DRAFT_FORWARD_ONLY",
              replacedDefinitionCount: 1,
              targetCatalogId: TARGET_CATALOG_ID,
              activationAllowed: false,
              productionEligible: false,
              fullQuantityScope: true,
              priceState: "PARTIAL_NEEDS_PRICE",
              universalAreaRateApplied: false,
              universalTurnoverFactorApplied: false,
            }),
            PREDECESSOR_RELEASE_ID, sha256({ contract: CONTRACT, fingerprint, definitionSha256 }),
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
          await client.query(`insert into public.estimate_definition_version(
              id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,
              source_metadata,content_status,content_gate_status)
            values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::jsonb,'QUARANTINED','RED')`, [
            definitionId, releaseId, TARGET_CATALOG_ID, nextDefinitionVersion,
            JSON.stringify({
              catalogId: TARGET_CATALOG_ID,
              canonicalRuName: FORMWORK_FRAMI_XLIFE_TITLE_RU,
              workKey: TARGET_CATALOG_ID.split(":").at(-1),
              physicalResultRu: "Полная проектная смета съёмной опалубки ростверка",
              measurementNormId: RICS_NRM2_FORMWORK_NORM_ID,
              formworkSystemProfileId: FORMWORK_FRAMI_XLIFE_SYSTEM_PROFILE_ID,
            }),
            JSON.stringify({
              country: "KG",
              operationClass: "MEASURE_ASSEMBLE_STRIP_RETURN",
              materialSystem: "DOKA_FRAMI_XLIFE_FOUNDATION",
              productProfileId: RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
              formworkSystemProfileId: FORMWORK_FRAMI_XLIFE_SYSTEM_PROFILE_ID,
              foundationWallThicknessCmRange: [10, 80],
              projectLayoutRequired: true,
              projectScheduleRequired: true,
              failClosed: true,
            }),
            definitionSha256,
            JSON.stringify({
              contract: CONTRACT,
              predecessorDefinitionId: target.definition_version_id,
              parameterSchemaSha256,
              acceptanceEvidenceSha256,
              sourceIds: [RICS_NRM2_FORMWORK_SOURCE_ID, FORMWORK_FRAMI_XLIFE_SOURCE_ID],
              synthetic: false,
              fullQuantityScope: true,
              priceState: "PARTIAL_NEEDS_PRICE",
            }),
          ]);
          await insertRows(client, "estimate_parameter_definition", [
            "definition_version_id", "parameter_id", "ordinal", "value_type", "unit_id", "title_ru", "required",
            "default_value", "constraints_json", "truth_metadata", "approved_template_baseline_id",
          ], FORMWORK_FRAMI_XLIFE_PARAMETERS.map((parameter) => [
            definitionId, parameter.parameter_id, parameter.ordinal, parameter.value_type, parameter.unit_id,
            parameter.title_ru, parameter.required, null, parameter.constraints_json,
            {
              ...parameter.truth_metadata,
              contract: CONTRACT,
              semantic_parameter_key: `${TARGET_CATALOG_ID}:${parameter.parameter_id}`,
              formula_consumers: formulaConsumers[parameter.parameter_id],
              resource_branch_consumers: resourceConsumers[parameter.parameter_id],
            },
            null,
          ]));
          await insertRows(client, "estimate_formula_graph", [
            "definition_version_id", "formula_id", "output_unit_id", "expression_source", "ast", "input_parameter_ids", "ast_sha256",
          ], FORMWORK_FRAMI_XLIFE_FORMULAS.map((formula) => [
            definitionId, formula.formula_id, formula.output_unit_id, formula.expression_source,
            formula.ast, formula.input_parameter_ids, sha256(formula.ast),
          ]));
          const resourceIds = new Map<string, string>();
          const resources = FORMWORK_FRAMI_XLIFE_RESOURCES.map((resource) => {
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
            resource.title_ru, databaseRowType(resource.category),
            resource.unit_id, resource.formula_id, resource.inclusion_ast, resource.resource_graph,
            `${TARGET_CATALOG_ID}:${resource.row_id}`, resource.cost_owner_id,
            resource.procurement_eligible, resource.source_metadata, resource.row_sha256,
          ]));
          await client.query(`insert into public.estimate_approved_template_baseline(
              id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,parameter_schema_sha256,
              input_values,input_classification,uom_by_parameter,formula_consumer_ids,resource_consumer_row_ids,
              normative_source_ids,guide_provenance_ru,proposal_source_refs,validation_scenario_refs,
              acceptance_evidence_sha256,accepted_release_id,accepted_at,supersedes_baseline_id,contract_version)
            values($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,
              $12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,$16,$17,clock_timestamp(),$18,$19)`, [
            baselineId, `${CONTRACT}:${fingerprint.slice(0, 16)}:${TARGET_CATALOG_ID}`,
            TARGET_CATALOG_ID, definitionId, target.definition_version_id, parameterSchemaSha256,
            JSON.stringify({
              product_profile_id: RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
              formwork_system_profile_id: FORMWORK_FRAMI_XLIFE_SYSTEM_PROFILE_ID,
              manufacturer_document_reference: FORMWORK_FRAMI_XLIFE_SOURCE_ID,
            }),
            JSON.stringify({
              product_profile_id: "NORMATIVE",
              formwork_system_profile_id: "NORMATIVE",
              manufacturer_document_reference: "NORMATIVE",
            }),
            JSON.stringify({
              product_profile_id: null,
              formwork_system_profile_id: null,
              manufacturer_document_reference: null,
            }),
            JSON.stringify(formulaConsumers), JSON.stringify(resourceConsumers),
            JSON.stringify(Object.fromEntries(FORMWORK_FRAMI_XLIFE_PARAMETERS.map((parameter) => [
              parameter.parameter_id,
              parameter.parameter_id === "product_profile_id"
                ? [RICS_NRM2_FORMWORK_SOURCE_ID]
                : ["formwork_system_profile_id", "manufacturer_document_reference", "foundation_wall_thickness_cm"]
                    .includes(parameter.parameter_id)
                  ? [FORMWORK_FRAMI_XLIFE_SOURCE_ID]
                  : [],
            ]))),
            JSON.stringify(Object.fromEntries(FORMWORK_FRAMI_XLIFE_PARAMETERS.map((parameter) => [
              parameter.parameter_id, (parameter.truth_metadata.guide as Json).guide_short_ru,
            ]))),
            JSON.stringify([
              { sourceUrl: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_url,
                exactLocator: RICS_NRM2_FORMWORK_SOURCE_METADATA.exact_locator },
              { sourceUrl: FORMWORK_FRAMI_XLIFE_SOURCE_METADATA.source_url,
                exactLocator: FORMWORK_FRAMI_XLIFE_SOURCE_METADATA.exact_locator },
            ]),
            JSON.stringify([{ scenario: "FORMWORK_FRAMI_XLIFE_100_M2_FULL_PROJECT_SCHEDULE",
              fixture: FORMWORK_FRAMI_XLIFE_EXACT_INPUT, acceptanceEvidenceSha256, coreAcceptance }]),
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
            definitionId, releaseId, TARGET_CATALOG_ID, FORMWORK_FRAMI_XLIFE_TITLE_RU,
            JSON.stringify([
              "измеренная площадь",
              "возвратный комплект Doka Frami Xlife",
              "расходные материалы",
              "монтаж, выверка, распалубка и очистка",
              "инженерная услуга, кран, доставка и возврат",
              "явные неприменимые позиции",
            ]),
            JSON.stringify([
              "универсальная ведомость на м²",
              "универсальная оборачиваемость",
              "неподтверждённые цены",
              "release, deploy, activation и OTA",
            ]),
            JSON.stringify([
              { capability: "PARAMETERS", status: "GREEN" },
              { capability: "FORMULAS_AND_PHYSICAL_PARITY", status: "GREEN" },
              { capability: "FULL_QUANTITY_SCOPE", status: "GREEN" },
              { capability: "PROCUREMENT_WITH_RENTAL_SERVICE_AND_LOGISTICS", status: "GREEN" },
              { capability: "PRICE", status: "PARTIAL_NEEDS_PRICE" },
            ]),
            FORMWORK_FRAMI_XLIFE_PARAMETERS.length,
            FORMWORK_FRAMI_XLIFE_FORMULAS.length,
            FORMWORK_FRAMI_XLIFE_RESOURCES.length,
            JSON.stringify({
              status: "GREEN_QUANTITY_SCOPE_PRICE_PARTIAL",
              allowed: true,
              waveContract: CONTRACT,
              activationAllowed: false,
              productionEligible: false,
            }),
            sha256({ definitionSha256, parameterSchemaSha256, acceptanceEvidenceSha256 }), head, tree,
          ]);
          await client.query(`update public.estimate_definition_version
            set content_status='CANDIDATE_READY',content_gate_status='GREEN'
            where id=$1 and release_id=$2 and catalog_id=$3`, [
            definitionId, releaseId, TARGET_CATALOG_ID,
          ]);
          const normalizedBindingCount = await upsertSourcesAndBindings(client, { definitionId, resourceIds });
          await client.query(`update public.estimate_cumulative_manifest_entry set
              definition_version_id=$3,source_batch=$4,source_release_id=$1,publication_state='CANONICAL_SUCCESSOR',
              approved_template_baseline_id=$5,baseline_ready=true,scenario_ready=true,definition_hash=$6,
              entry_sha256=$7,runtime_publication_state='CANDIDATE'
            where release_id=$1 and catalog_id=$2`, [
            releaseId, TARGET_CATALOG_ID, definitionId, CONTRACT, baselineId,
            definitionSha256, sha256({
              contract: CONTRACT,
              releaseId,
              catalogId: TARGET_CATALOG_ID,
              definitionId,
              baselineId,
              definitionSha256,
            }),
          ]);
          const search = await cloneSearch(client, {
            releaseId, searchReleaseId, releaseKey, head, tree, fingerprint, definitionId,
          });
          const manifestAudit = (await client.query(`select count(*)::int identities,
              count(*) filter(where catalog_id=$2 and definition_version_id=$3)::int replaced,
              encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot
            from public.estimate_cumulative_manifest_entry where release_id=$1`, [
            releaseId, TARGET_CATALOG_ID, definitionId,
          ])).rows[0] as Json;
          const targetAudit = (await client.query(`select
              (select count(*)::int from public.estimate_parameter_definition where definition_version_id=$1) parameters,
              (select count(*)::int from public.estimate_parameter_definition where definition_version_id=$1 and default_value is not null) defaults,
              (select count(*)::int from public.estimate_formula_graph where definition_version_id=$1) formulas,
              (select count(*)::int from public.estimate_resource_spec where definition_version_id=$1) resources,
              (select count(*)::int from public.estimate_resource_spec where definition_version_id=$1 and source_metadata->>'synthetic'='true') synthetic_rows,
              (select count(*)::int from public.estimate_resource_price_route_binding b join public.estimate_resource_spec r on r.id=b.resource_spec_id where r.definition_version_id=$1) price_bindings,
              (select count(*)::int from public.estimate_work_normative_binding where definition_version_id=$1) normalized_bindings,
              (select count(*)::int from public.estimate_resource_spec where definition_version_id=$1 and procurement_eligible) procurement_rows,
              (select count(distinct category)::int from public.estimate_resource_spec where definition_version_id=$1) categories,
              (select count(*)::int from public.estimate_resource_spec where definition_version_id=$1 and resource_graph->>'costTreatment'='INFORMATIONAL_SCOPE') informational_rows,
              (select count(*)::int from public.estimate_resource_spec where definition_version_id=$1
                and resource_graph#>>'{professionalPhysicalNormBindingV1,source_id}'=$2
                and resource_graph#>>'{professionalPhysicalNormBindingV1,quantity_output_parameter_id}' is not null
                and resource_graph#>>'{professionalPhysicalNormBindingV1,quantity_output_formula_id}' is not null) physical_quantity_owner_rows`, [
            definitionId, RICS_NRM2_FORMWORK_SOURCE_ID,
          ])).rows[0] as Json;
          const searchTarget = (await client.query(`select document.definition_version_id,
              document.required_inputs_count,document.selectable,document.canonical_name_ru,
              group_row.group_name_ru,group_row.breadcrumb
            from public.estimate_search_document document
            join public.estimate_search_group group_row
              on group_row.search_release_id=document.search_release_id and group_row.group_id=document.group_id
            where document.search_release_id=$1 and document.catalog_id=$2`, [
            searchReleaseId, TARGET_CATALOG_ID,
          ])).rows[0] as Json;
          invariant(Number(manifestAudit.identities) === 10_331 && Number(manifestAudit.replaced) === 1,
            `STOP_FORMWORK_MANIFEST_AUDIT:${JSON.stringify(manifestAudit)}`);
          invariant(Number(targetAudit.parameters) === 52 && Number(targetAudit.defaults) === 0
            && Number(targetAudit.formulas) === 20 && Number(targetAudit.resources) === 24
            && Number(targetAudit.synthetic_rows) === 0 && Number(targetAudit.price_bindings) === 0
            && Number(targetAudit.normalized_bindings) === normalizedBindingCount
            && normalizedBindingCount === 9 && Number(targetAudit.procurement_rows) === 14
            && Number(targetAudit.categories) === 5 && Number(targetAudit.informational_rows) === 7
            && Number(targetAudit.physical_quantity_owner_rows) === 1,
          `STOP_FORMWORK_TARGET_AUDIT:${JSON.stringify(targetAudit)}:${normalizedBindingCount}`);
          invariant(String(searchTarget.definition_version_id) === definitionId
            && Number(searchTarget.required_inputs_count) === 52 && searchTarget.selectable === true
            && searchTarget.canonical_name_ru === FORMWORK_FRAMI_XLIFE_TITLE_RU
            && searchTarget.group_name_ru === TARGET_GROUP_NAME_RU
            && JSON.stringify(searchTarget.breadcrumb) === JSON.stringify([TARGET_GROUP_NAME_RU]),
          `STOP_FORMWORK_SEARCH_TARGET_AUDIT:${JSON.stringify(searchTarget)}`);
          await client.query(`update public.estimate_definition_release
            set source_manifest_sha256=$2,status='prepared',sealed_at=clock_timestamp(),
              metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
            releaseId, manifestAudit.snapshot,
            JSON.stringify({
              lifecycle: "PREPARED_NOT_ACTIVE",
              searchReleaseId,
              searchSnapshotSha256: search.snapshot_sha256,
              exactResourceRowCount: 24,
              normalizedSourceBindingCount: normalizedBindingCount,
              sourceCoreAcceptanceSha256: coreAcceptance.deterministicSha256,
              priceState: "PARTIAL_NEEDS_PRICE",
            }),
          ]);
          await client.query("commit");
          receipt = {
            status: "GREEN_FORMWORK_FRAMI_XLIFE_SUCCESSOR_PREPARED_NOT_ACTIVE",
            idempotent: false,
            predecessor: {
              releaseId: PREDECESSOR_RELEASE_ID,
              searchReleaseId: PREDECESSOR_SEARCH_RELEASE_ID,
              definitionId: target.definition_version_id,
              parameters: target.parameters,
              formulas: target.formulas,
              resources: target.resources,
            },
            successor: {
              releaseId,
              searchReleaseId,
              definitionId,
              baselineId,
              releaseKey,
              definitionVersion: nextDefinitionVersion,
              nextCounts,
            },
            coreAcceptance,
            audit: { manifest: manifestAudit, target: targetAudit, search, searchTarget },
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
    targetCatalogId: TARGET_CATALOG_ID,
    systemProfileId: FORMWORK_FRAMI_XLIFE_SYSTEM_PROFILE_ID,
    sourceIds: [RICS_NRM2_FORMWORK_SOURCE_ID, FORMWORK_FRAMI_XLIFE_SOURCE_ID],
    ...receipt!,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  const sealed = { ...body, receiptSha256: sha256(body) };
  if (APPLY && !receipt!.idempotent) {
    atomicJson(resolve(OUTPUT_ROOT, `01_FORMWORK_FRAMI_XLIFE_SUCCESSOR_${head}.json`), sealed);
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
      owner: "EXACT_FORMWORK_FRAMI_XLIFE_FULL_PROJECT_KIT_SUCCESSOR",
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
