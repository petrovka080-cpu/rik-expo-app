import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const SPEC_PATH = resolve("C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (11).md");
const SPEC_SHA256 = "21bdd2cf79185cbcf2a6621005f32d6eaf47e653dd88e5b006fcdc6797854138";
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const DEFINITION_RELEASE_ID = "94443669-8f5b-5cc7-b364-2f8e9f9e3506";
const PARENT_SEARCH_RELEASE_ID = "67a40ccc-9ae1-5727-a01f-7d4272fba77b";
const CONTRACT = "p0-one-monolith-r58-mandatory-search-successor.v1";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const OUTPUT = resolve(".release-runtime/p0-one-monolith-r58/evidence/09-search/R58_MANDATORY_SEARCH_SUCCESSOR.json");
const APPLY = process.argv.includes("--apply");

type Journey = {
  ordinal: number;
  catalogId: string;
  aliases: string[];
  existing: boolean;
  operationKind?: "NEW_INSTALLATION" | "DEMOLITION";
};

const JOURNEYS: Journey[] = [
  { ordinal: 1, catalogId: "flooring_interior_laminate_install_large_area", existing: true,
    aliases: ["ламинат", "монтаж ламината", "укладка ламината"] },
  { ordinal: 2, catalogId: "r58-real:reinforced-concrete-equipment-pedestal", existing: false,
    aliases: ["бетонные тумбы", "железобетонная тумба", "тумба под оборудование", "бетонный постамент"] },
  { ordinal: 3, catalogId: "built-in-ai-1000:0702", existing: true,
    aliases: ["асфальтирование парковки", "асфальтовая парковка", "устройство покрытия парковки"] },
  { ordinal: 4, catalogId: "built-in-ai-1000:0670", existing: true, operationKind: "DEMOLITION",
    aliases: ["демонтаж асфальта", "разборка асфальта", "снятие асфальтобетонного покрытия"] },
  { ordinal: 5, catalogId: "concrete_foundation_interior_reinforcement_frame_reinforce_wet_zone", existing: true,
    aliases: ["армокаркас во влажной зоне", "армирование во влажной зоне", "арматурный каркас влажная зона"] },
  { ordinal: 6, catalogId: "r58-real:bridge-bored-pile-installation", existing: false,
    aliases: ["свайный фундамент моста", "мостовая свая", "сваи моста", "буронабивные сваи опоры"] },
  { ordinal: 7, catalogId: "drywall_ceiling_interior_drywall_partition_install_large_area", existing: true,
    aliases: ["гкл перегородка", "гипсокартонная перегородка", "монтаж перегородки гкл"] },
  { ordinal: 8, catalogId: "electrical_interior_power_cable_lay_large_area", existing: true,
    aliases: ["электромонтаж кабеля", "прокладка силового кабеля", "силовой кабель"] },
  { ordinal: 9, catalogId: "expanded-template:village_water_supply_preliminary_boq_expanded_complex_v1", existing: true,
    aliases: ["водоснабжение", "наружный водопровод", "водоснабжение села", "водопровод 5 км"] },
  { ordinal: 10, catalogId: "expanded-template:HVAC_plant_room_preliminary_boq_expanded_complex_v1", existing: true,
    aliases: ["hvac помещения", "хвак помещения", "вентиляция помещения", "система овик"] },
  { ordinal: 11, catalogId: "r58-real:wall-plaster-application", existing: false,
    aliases: ["штукатурка", "штукатурка стен", "оштукатуривание стен"] },
  { ordinal: 12, catalogId: "r58-real:gabion-wall-construction", existing: false,
    aliases: ["габионная стена", "устройство габиона", "подпорная стена из габионов"] },
  { ordinal: 13, catalogId: "r58-real:masonry-wall-openings-lintels", existing: false,
    aliases: ["кладка стены с проемами", "кладка с перемычками", "перемычки над проемами"] },
  { ordinal: 14, catalogId: "r58-real:roofing-membrane-system", existing: false,
    aliases: ["кровельная система", "мембранная кровля", "кровля с уклоном и водоотводом"] },
  { ordinal: 15, catalogId: "r58-real:monolithic-reinforced-concrete", existing: false,
    aliases: ["железобетонный элемент", "монолитный железобетон", "опалубка арматура бетон"] },
  { ordinal: 16, catalogId: "r58-real:finish-coating-application", existing: false,
    aliases: ["отделочное покрытие", "финишное покрытие", "защитно декоративное покрытие"] },
];

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Json)
    .sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, stable(child)]));
  return value;
}

function stableJson(value: unknown): string { return JSON.stringify(stable(value)); }
function sha256(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
function shaObject(value: unknown): string { return sha256(stableJson(value)); }
function uuid(value: string): string {
  const bytes = Buffer.from(sha256(value).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000 }).trim();
}
function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, file);
}
function normalize(value: unknown): string {
  return String(value ?? "").normalize("NFC").toLocaleLowerCase("ru")
    .replace(/ё/gu, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/gu, " ");
}
function unique(values: unknown[]): string[] {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "ru"));
}
function searchTerms(name: string, aliases: string[], catalogId: string): string[] {
  const normalizedAliases = aliases.map(normalize);
  return unique([
    normalize(catalogId), normalize(name), ...normalize(name).split(" "),
    ...normalizedAliases, ...normalizedAliases.flatMap((alias) => alias.split(" ")),
  ]);
}

async function updateExistingJourney(client: Client, searchReleaseId: string, journey: Journey): Promise<void> {
  const row = (await client.query("select * from public.estimate_search_document where search_release_id=$1 and catalog_id=$2",
    [searchReleaseId, journey.catalogId])).rows[0] as Json | undefined;
  invariant(row, `R58_SEARCH_EXISTING_JOURNEY_MISSING:${journey.ordinal}:${journey.catalogId}`);
  const definition = (await client.query(`select definition_version_id::text
    from public.estimate_cumulative_manifest_entry where release_id=$1 and catalog_id=$2`,
  [DEFINITION_RELEASE_ID, journey.catalogId])).rows[0] as Json | undefined;
  invariant(definition, `R58_SEARCH_EXISTING_JOURNEY_DEFINITION_MISSING:${journey.ordinal}:${journey.catalogId}`);
  const aliases = unique([...(row.aliases ?? []), ...journey.aliases]);
  const normalizedAliases = unique(aliases.map(normalize));
  const terms = unique([...(row.normalized_search_terms ?? []), ...searchTerms(row.canonical_name_ru, aliases, journey.catalogId)]);
  await client.query(`update public.estimate_search_document set
    aliases=$3::text[],normalized_aliases=$4::text[],normalized_search_terms=$5::text[],normalized_search_blob=$6,
    adjudication_class='EFFECTIVE_WORK',selectable=true,publication_state='ADMITTED_BACKEND',
    definition_release_id=$9,definition_version_id=$10,
    operation_kind=coalesce($7,operation_kind),canonical_target_catalog_id=null,replacement_catalog_id=null,
    source_provenance=source_provenance||$8::jsonb
    where search_release_id=$1 and catalog_id=$2`, [searchReleaseId, journey.catalogId, aliases, normalizedAliases,
    terms, terms.join("\u001f"), journey.operationKind ?? null,
    JSON.stringify({ r58MandatoryJourney: journey.ordinal, r58MandatorySearchContract: CONTRACT,
      r58DefinitionReleaseId: DEFINITION_RELEASE_ID }), DEFINITION_RELEASE_ID, definition.definition_version_id]);
}

async function insertNewJourney(client: Client, searchReleaseId: string, journey: Journey): Promise<void> {
  const definition = (await client.query(`select d.id::text definition_version_id,d.catalog_id,d.passport,d.applicability,
      d.source_metadata,w.domain,
      coalesce((select jsonb_agg(jsonb_build_object('id',p.parameter_id,'titleRu',p.title_ru,'unit',p.unit_id,
        'required',p.required,'guide',p.truth_metadata->'guide') order by p.ordinal)
        from public.estimate_parameter_definition p where p.definition_version_id=d.id),'[]'::jsonb) parameters
    from public.estimate_definition_version d
    join public.estimate_cumulative_manifest_entry m on m.definition_version_id=d.id and m.release_id=$1
    join public.estimate_work_identity w on w.catalog_id=d.catalog_id
    where d.catalog_id=$2`, [DEFINITION_RELEASE_ID, journey.catalogId])).rows[0] as Json | undefined;
  invariant(definition, `R58_SEARCH_NEW_JOURNEY_DEFINITION_MISSING:${journey.catalogId}`);
  const name = String(definition.passport?.professionalNameRu ?? "").trim();
  invariant(name && definition.passport?.baselineWithoutUserInput === true,
    `R58_SEARCH_NEW_JOURNEY_PASSPORT_RED:${journey.catalogId}`);
  const aliases = unique([...(definition.applicability?.aliases ?? []), ...journey.aliases]);
  const normalizedAliases = unique(aliases.map(normalize));
  const terms = searchTerms(name, aliases, journey.catalogId);
  const slug = journey.catalogId.replace(/^r58-real:/u, "").replace(/[^a-z0-9]+/giu, "-").replace(/^-|-$/gu, "").toLocaleLowerCase();
  const groupId = `r58-mandatory:${slug}`;
  const parameters = definition.parameters as Json[];
  const included = definition.passport?.scope?.included ?? [];
  const excluded = definition.passport?.scope?.excluded ?? [];
  const group = {
    groupId, groupNameRu: name, domainId: definition.domain, systemId: "r58_real",
    subsystemId: definition.domain, assemblyId: slug, workFamilyId: slug,
    breadcrumb: [definition.domain, name], memberCount: 1,
    memberSetSha256: shaObject([journey.catalogId]),
    oracleDisposition: { contract: CONTRACT, mandatoryJourney: journey.ordinal, independentWork: true },
  };
  await client.query(`insert into public.estimate_search_group(
    search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
    breadcrumb,member_count,member_set_sha256,oracle_disposition
  ) values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12::jsonb)`, [searchReleaseId, group.groupId,
    group.groupNameRu, group.domainId, group.systemId, group.subsystemId, group.assemblyId, group.workFamilyId,
    JSON.stringify(group.breadcrumb), group.memberCount, group.memberSetSha256, JSON.stringify(group.oracleDisposition)]);
  const body: Json = {
    catalog_id: journey.catalogId,
    domain_id: definition.domain,
    system_id: "r58_real",
    subsystem_id: definition.domain,
    assembly_id: slug,
    work_family_id: slug,
    group_id: groupId,
    subgroup_id: null,
    element_type: "construction_work",
    operation_kind: journey.operationKind ?? "NEW_INSTALLATION",
    technology_variant: "work_specific",
    construction_state: "new",
    primary_uom: definition.passport?.baselineUnit ?? "set",
    canonical_name_ru: name,
    aliases,
    normative_classifiers: unique([definition.applicability?.standard, definition.source_metadata?.normativeSource?.sourceKey]),
    applicability_tags: ["R58_MANDATORY_JOURNEY", `JOURNEY_${journey.ordinal}`],
    publication_state: "ADMITTED_BACKEND",
    catalog_origin: "GLOBAL",
    definition_release_id: DEFINITION_RELEASE_ID,
    short_scope_ru: `Расчётная работа: ${name}. Исходная смета доступна до ввода параметров; уточнение создаёт новую revision.`,
    key_distinguishing_parameters: parameters.map((row) => ({ id: row.id, titleRu: row.titleRu, unit: row.unit })),
    required_inputs_count: parameters.length,
    clarification_fields: parameters,
    included_boundaries: included,
    excluded_boundaries: excluded,
    replacement_catalog_id: null,
    normalized_catalog_id: normalize(journey.catalogId),
    normalized_canonical_name: normalize(name),
    normalized_aliases: normalizedAliases,
    normalized_search_terms: terms,
    normalized_search_blob: terms.join("\u001f"),
    source_provenance: {
      authority: "P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5.8", specSha256: SPEC_SHA256,
      contract: CONTRACT, mandatoryJourney: journey.ordinal, definitionReleaseId: DEFINITION_RELEASE_ID,
      normativeSource: definition.source_metadata?.normativeSource, generatedTemplate: false,
      universalEstimator: false, artificialPrice: false,
    },
    adjudication_class: "EFFECTIVE_WORK",
    selectable: true,
    canonical_target_catalog_id: null,
    definition_version_id: definition.definition_version_id,
  };
  const documentSha256 = shaObject(body);
  await client.query(`insert into public.estimate_search_document(
    search_release_id,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,group_id,subgroup_id,
    element_type,operation_kind,technology_variant,construction_state,primary_uom,canonical_name_ru,aliases,
    normative_classifiers,applicability_tags,publication_state,catalog_origin,definition_release_id,short_scope_ru,
    key_distinguishing_parameters,required_inputs_count,clarification_fields,included_boundaries,excluded_boundaries,
    replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,normalized_aliases,normalized_search_terms,
    normalized_search_blob,source_provenance,document_sha256,adjudication_class,selectable,canonical_target_catalog_id,
    definition_version_id
  ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::text[],$17::text[],$18::text[],$19,$20,$21,
    $22,$23::jsonb,$24,$25::jsonb,$26::jsonb,$27::jsonb,$28,$29,$30,$31::text[],$32::text[],$33,$34::jsonb,$35,$36,$37,$38,$39)`, [
    searchReleaseId, body.catalog_id, body.domain_id, body.system_id, body.subsystem_id, body.assembly_id,
    body.work_family_id, body.group_id, body.subgroup_id, body.element_type, body.operation_kind,
    body.technology_variant, body.construction_state, body.primary_uom, body.canonical_name_ru, body.aliases,
    body.normative_classifiers, body.applicability_tags, body.publication_state, body.catalog_origin,
    body.definition_release_id, body.short_scope_ru, JSON.stringify(body.key_distinguishing_parameters),
    body.required_inputs_count, JSON.stringify(body.clarification_fields), JSON.stringify(body.included_boundaries),
    JSON.stringify(body.excluded_boundaries), body.replacement_catalog_id, body.normalized_catalog_id,
    body.normalized_canonical_name, body.normalized_aliases, body.normalized_search_terms, body.normalized_search_blob,
    JSON.stringify(body.source_provenance), documentSha256, body.adjudication_class, body.selectable,
    body.canonical_target_catalog_id, body.definition_version_id,
  ]);
  await client.query(`insert into public.estimate_search_group_membership(
    search_release_id,group_id,catalog_id,ordinal,independent_disposition
  ) values($1,$2,$3,0,$4::jsonb)`, [searchReleaseId, groupId, journey.catalogId,
    JSON.stringify({ contract: CONTRACT, mandatoryJourney: journey.ordinal, selectable: true, independentWork: true })]);
}

async function corpusFingerprint(client: Client, searchReleaseId: string): Promise<Json> {
  return (await client.query(`select
    (select encode(extensions.digest(convert_to(coalesce(string_agg(document_sha256,E'\\n' order by catalog_id),''),'UTF8'),'sha256'),'hex')
      from public.estimate_search_document where search_release_id=$1) document_hash,
    (select encode(extensions.digest(convert_to(coalesce(string_agg(member_set_sha256,E'\\n' order by group_id),''),'UTF8'),'sha256'),'hex')
      from public.estimate_search_group where search_release_id=$1) group_hash,
    (select encode(extensions.digest(convert_to(coalesce(string_agg(group_id||E'\\u001f'||catalog_id||E'\\u001f'||ordinal::text,E'\\n' order by group_id,catalog_id),''),'UTF8'),'sha256'),'hex')
      from public.estimate_search_group_membership where search_release_id=$1) membership_hash,
    (select encode(extensions.digest(convert_to(coalesce(string_agg(relation_sha256,E'\\n' order by source_catalog_id,target_catalog_id,relationship_type),''),'UTF8'),'sha256'),'hex')
      from public.estimate_search_typed_relation where search_release_id=$1) relation_hash`, [searchReleaseId])).rows[0] as Json;
}

async function main(): Promise<void> {
  invariant(sha256(readFileSync(SPEC_PATH)) === SPEC_SHA256, "R58_MANDATORY_SEARCH_SPEC_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === EXPECTED_BRANCH, `R58_MANDATORY_SEARCH_BRANCH:${branch}`);
  invariant(git(["status", "--porcelain=v1"]) === "", "R58_MANDATORY_SEARCH_DIRTY_WORKTREE");
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);
  invariant(JOURNEYS.length === 16 && new Set(JOURNEYS.map((row) => row.catalogId)).size === 16,
    "R58_MANDATORY_SEARCH_JOURNEY_SET_RED");
  const searchReleaseId = uuid(`${CONTRACT}:${head}:${tree}:${DEFINITION_RELEASE_ID}:${PARENT_SEARCH_RELEASE_ID}`);
  const releaseKey = `p0-r58-mandatory-search-${head.slice(0, 16)}`;
  const client = new Client({ connectionString: DATABASE_URL, application_name: APPLY ? "r58-mandatory-search-apply" : "r58-mandatory-search-dry-run" });
  await client.connect();
  let idempotent = false;
  let snapshotSha256 = "";
  try {
    await client.query("begin");
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='180s'");
    const definitionRelease = (await client.query("select * from public.estimate_definition_release where id=$1", [DEFINITION_RELEASE_ID])).rows[0] as Json;
    const parentSearch = (await client.query("select * from public.estimate_search_index_release where id=$1", [PARENT_SEARCH_RELEASE_ID])).rows[0] as Json;
    invariant(definitionRelease?.status === "prepared" && Number(definitionRelease.definition_count) === 4282,
      "R58_MANDATORY_SEARCH_DEFINITION_RELEASE_RED");
    invariant(parentSearch?.status === "draft" && Number(parentSearch.global_count) === 11610 && Number(parentSearch.external_count) === 660,
      "R58_MANDATORY_SEARCH_PARENT_RED");
    const existing = (await client.query("select * from public.estimate_search_index_release where id=$1 or release_key=$2",
      [searchReleaseId, releaseKey])).rows[0] as Json | undefined;
    if (!existing) {
      const placeholder = shaObject({ contract: CONTRACT, head, tree, phase: "BUILDING" });
      await client.query(`insert into public.estimate_search_index_release(
        id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,source_commit,source_tree,
        snapshot_sha256,global_count,external_count,discovered_count,metadata
      ) values($1,$2,'draft','estimate-search-taxonomy-r58-mandatory.v1','estimate-search-group-relation-r58.v1',
        'estimate-search-ranking-r58-any-all-phrase.v1',$3,$4,$5,11618,660,0,$6::jsonb)`, [searchReleaseId,
        releaseKey, head, tree, placeholder, JSON.stringify({ authority: "P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5.8",
          specSha256: SPEC_SHA256, contract: CONTRACT, definitionReleaseId: DEFINITION_RELEASE_ID,
          parentSearchReleaseId: PARENT_SEARCH_RELEASE_ID, inventoryCount: 11610, successorRealWorksAdded: 8,
          mandatoryJourneys: 16, activeSearchSwitched: false, runtime8081Switched: false, terminalGreenClaimed: false })]);
      await client.query(`insert into public.estimate_search_group select $1,group_id,group_name_ru,domain_id,system_id,
        subsystem_id,assembly_id,work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
        from public.estimate_search_group where search_release_id=$2`, [searchReleaseId, PARENT_SEARCH_RELEASE_ID]);
      await client.query(`insert into public.estimate_search_document select $1,catalog_id,domain_id,system_id,subsystem_id,
        assembly_id,work_family_id,group_id,subgroup_id,element_type,operation_kind,technology_variant,construction_state,
        primary_uom,canonical_name_ru,aliases,normative_classifiers,applicability_tags,publication_state,catalog_origin,
        definition_release_id,short_scope_ru,key_distinguishing_parameters,required_inputs_count,clarification_fields,
        included_boundaries,excluded_boundaries,replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,
        normalized_aliases,normalized_search_terms,normalized_search_blob,source_provenance,document_sha256,
        adjudication_class,selectable,canonical_target_catalog_id,definition_version_id
        from public.estimate_search_document where search_release_id=$2`, [searchReleaseId, PARENT_SEARCH_RELEASE_ID]);
      await client.query(`insert into public.estimate_search_group_membership select $1,group_id,catalog_id,ordinal,
        independent_disposition from public.estimate_search_group_membership where search_release_id=$2`,
      [searchReleaseId, PARENT_SEARCH_RELEASE_ID]);
      await client.query(`insert into public.estimate_search_typed_relation select $1,source_catalog_id,target_catalog_id,
        relationship_type,direction,source_locator,applicability_predicate,required_when,mutually_exclusive_with,
        explanation_ru,relation_sha256 from public.estimate_search_typed_relation where search_release_id=$2`,
      [searchReleaseId, PARENT_SEARCH_RELEASE_ID]);
      const rebind = await client.query(`update public.estimate_search_document document set
        definition_release_id=$2,definition_version_id=manifest.definition_version_id,
        source_provenance=document.source_provenance||$3::jsonb
        from public.estimate_cumulative_manifest_entry manifest
        where document.search_release_id=$1 and document.selectable
          and manifest.release_id=$2 and manifest.catalog_id=document.catalog_id`, [searchReleaseId, DEFINITION_RELEASE_ID,
        JSON.stringify({ r58SearchSuccessor: CONTRACT, r58DefinitionReleaseId: DEFINITION_RELEASE_ID })]);
      invariant(rebind.rowCount === 3356, `R58_MANDATORY_SEARCH_REBIND_COUNT:${rebind.rowCount}`);
      for (const journey of JOURNEYS.filter((row) => row.existing)) await updateExistingJourney(client, searchReleaseId, journey);
      for (const journey of JOURNEYS.filter((row) => !row.existing)) await insertNewJourney(client, searchReleaseId, journey);
      await client.query(`update public.estimate_search_document document set document_sha256=
        encode(extensions.digest(convert_to((to_jsonb(document)-'search_release_id'-'document_sha256')::text,'UTF8'),'sha256'),'hex')
        where document.search_release_id=$1`, [searchReleaseId]);
      const corpus = await corpusFingerprint(client, searchReleaseId);
      snapshotSha256 = shaObject({ specSha256: SPEC_SHA256, contract: CONTRACT, head, tree,
        definitionReleaseId: DEFINITION_RELEASE_ID, parentSearchSnapshot: parentSearch.snapshot_sha256, corpus });
      await client.query("update public.estimate_search_index_release set snapshot_sha256=$2,metadata=metadata||$3::jsonb where id=$1",
        [searchReleaseId, snapshotSha256, JSON.stringify({ corpus, snapshotContract: CONTRACT })]);
    } else {
      invariant(existing.id === searchReleaseId && existing.status === "draft" && existing.source_commit === head
        && existing.source_tree === tree, "R58_MANDATORY_SEARCH_EXISTING_RELEASE_DRIFT");
      idempotent = true;
      const corpus = await corpusFingerprint(client, searchReleaseId);
      snapshotSha256 = shaObject({ specSha256: SPEC_SHA256, contract: CONTRACT, head, tree,
        definitionReleaseId: DEFINITION_RELEASE_ID, parentSearchSnapshot: parentSearch.snapshot_sha256, corpus });
      invariant(existing.snapshot_sha256 === snapshotSha256, "R58_MANDATORY_SEARCH_EXISTING_SNAPSHOT_DRIFT");
    }
    const observed = (await client.query(`select
      (select count(*)::int from public.estimate_search_document where search_release_id=$1) documents,
      (select count(*)::int from public.estimate_search_group where search_release_id=$1) groups,
      (select count(*)::int from public.estimate_search_group_membership where search_release_id=$1) memberships,
      (select count(*)::int from public.estimate_search_typed_relation where search_release_id=$1) relations,
      (select count(*)::int from public.estimate_search_document where search_release_id=$1 and selectable) selectable,
      (select count(*)::int from public.estimate_search_document where search_release_id=$1 and adjudication_class='EFFECTIVE_WORK') effective,
      (select count(*)::int from public.estimate_search_document where search_release_id=$1 and adjudication_class='EXTERNAL_REFERENCE') external_references,
      (select count(*)::int from public.estimate_search_document where search_release_id=$1 and selectable
        and (definition_release_id<>$2 or definition_version_id is null)) selectable_without_target_definition,
      (select count(*)::int from public.estimate_search_document where search_release_id=$1 and catalog_id=any($3::text[])
        and selectable and adjudication_class='EFFECTIVE_WORK' and publication_state='ADMITTED_BACKEND'
        and definition_release_id=$2 and definition_version_id is not null) mandatory_ready,
      (select count(*)::int from public.estimate_search_index_release where status='active') active_search_releases`,
    [searchReleaseId, DEFINITION_RELEASE_ID, JOURNEYS.map((row) => row.catalogId)])).rows[0] as Json;
    invariant(observed.documents === 12278 && observed.groups === 4326 && observed.memberships === 12278
      && observed.relations === 2236 && observed.selectable === 3366 && observed.effective === 3366
      && observed.external_references === 658 && observed.selectable_without_target_definition === 0
      && observed.mandatory_ready === 16 && observed.active_search_releases === 0,
    `R58_MANDATORY_SEARCH_COUNTS_RED:${stableJson(observed)}`);
    const proof = {
      schemaVersion: CONTRACT, capturedAt: new Date().toISOString(), specSha256: SPEC_SHA256,
      source: { branch, head, tree, descendantOf691acb78: true },
      definitionReleaseId: DEFINITION_RELEASE_ID, parentSearchReleaseId: PARENT_SEARCH_RELEASE_ID,
      searchRelease: { id: searchReleaseId, key: releaseKey, status: "draft", snapshotSha256 },
      observed, mandatoryJourneys: JOURNEYS, denominator: `${observed.mandatory_ready}/16`,
      inventoryIsNotTargetCount: true, inventoryCount: 11610, successorRealWorksAdded: 8,
      activeSearchSwitched: false, activeDefinitionReleaseSwitched: false, runtime8081Switched: false,
      batch009Included: false, idempotent, writesApplied: APPLY && !idempotent ? 1 : 0,
      terminalGreenClaimed: false,
      status: APPLY ? "GREEN_R58_MANDATORY_SEARCH_SUCCESSOR_DRAFT_NOT_ACTIVE" : "GREEN_R58_MANDATORY_SEARCH_DRY_RUN_ROLLED_BACK",
    };
    if (APPLY) await client.query("commit"); else await client.query("rollback");
    writeJson(OUTPUT, proof);
    process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
