import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;
const MASTER_PATH = resolve("C:/Users/User/Downloads/MASTER_TZ_R5_5_5_PRODUCTION_GRADE_SINGLE_CANONICAL_MATERIAL_FIRST_CLEAR_RUSSIAN_NAMES_FULL_CATALOG_ASPHALT_WEB_ANDROID_50_PER_GROUP_GLOBAL_GREEN_RU.md");
const MASTER_SHA256 = "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const CONTRACT = "rik-expo-app-r555.full-cumulative-asphalt-lineage-reconciliation.v1";
const DATABASE_URL = process.env.R555_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const FULL_APPLY = resolve(".release-runtime/r555/evidence/20D_R555_CUMULATIVE_SUCCESSOR_APPLY.json");
const ASPHALT_RELEASE_ID = "fe1357b1-d031-5011-8016-f03cb77916ab";
const ASPHALT_SEARCH_RELEASE_ID = "a5314296-c402-5c8e-9a30-883b1a1fac18";
const SPECIALIZED_IDS = [
  "built-in-ai-1000:0670", "built-in-ai-1000:0702", "built-in-ai-1000:0703", "built-in-ai-1000:0704",
  "built-in-ai-1000:0705", "built-in-ai-1000:0706", "built-in-ai-1000:0707",
] as const;
const EXPANDED_ALIAS_MAPPING = [
  { full: "canonical-work:expanded:asphalt_concrete_pavement", asphalt: "asphalt_concrete_pavement_preliminary_boq_expanded_complex_v1" },
  { full: "canonical-work:expanded:bridge_asphalt", asphalt: "bridge_asphalt_preliminary_boq_expanded_complex_v1" },
] as const;
const EXTERNAL_GROUP_ID = "wg:external:asphalt_specialized_operations";
const APPLY = process.argv.includes("--apply");
const DRY_RECEIPT = resolve(".release-runtime/r555/evidence/20F_R555_FULL_CUMULATIVE_ASPHALT_RECONCILIATION_DRY_RUN.json");
const APPLY_RECEIPT = resolve(".release-runtime/r555/evidence/20G_R555_FULL_CUMULATIVE_ASPHALT_RECONCILIATION_APPLY.json");
const OUTPUT = APPLY ? APPLY_RECEIPT : DRY_RECEIPT;

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const row = value as Json;
  return `{${Object.keys(row).sort().map((key) => `${JSON.stringify(key)}:${stable(row[key])}`).join(",")}}`;
}
function sha256(value: unknown): string { return createHash("sha256").update(Buffer.isBuffer(value) || typeof value === "string" ? value : stable(value)).digest("hex"); }
function uuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex"); bytes[6] = (bytes[6]! & 0x0f) | 0x50; bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex"); return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function invariant(value: unknown, code: string): asserts value { if (!value) throw new Error(`R555_ASPHALT_RECONCILIATION:${code}`); }
function normalize(value: string): string { return value.toLocaleLowerCase("ru-RU").replace(/ё/gu, "е").replace(/[^0-9a-zа-я]+/giu, " ").trim().replace(/\s+/gu, " "); }
function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true }); const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8"); renameSync(temporary, path);
}
function assertLocal(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname) && parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2", "DATABASE_BOUNDARY_RED");
}
async function activeState(client: Client): Promise<Json> {
  return {
    definition: (await client.query("select id::text from public.estimate_definition_release where status='active' order by id")).rows.map((row) => row.id),
    search: (await client.query("select id::text from public.estimate_search_index_release where status='active' order by id")).rows.map((row) => row.id),
  };
}
async function residue(client: Client, releaseId: string, searchReleaseId: string): Promise<Json> {
  return (await client.query(`select
    (select count(*)::int from public.estimate_definition_release where id=$1) releases,
    (select count(*)::int from public.estimate_search_index_release where id=$2) searches,
    (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1) manifest,
    (select count(*)::int from public.estimate_search_document where search_release_id=$2) documents,
    (select count(*)::int from public.estimate_candidate_capability_r3 where release_id=$1 or search_release_id=$2) capabilities`, [releaseId, searchReleaseId])).rows[0] as Json;
}
async function measured(client: Client, releaseId: string, searchReleaseId: string): Promise<Json> {
  const state = (await client.query(`select
    (select status from public.estimate_definition_release where id=$1) release_status,
    (select status from public.estimate_search_index_release where id=$2) search_status,
    (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1) manifest_count,
    (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1 and source_release_id=$3 and catalog_id=any($4::text[])) specialized_manifest_count,
    (select count(*)::int from public.estimate_parameter_definition p join public.estimate_cumulative_manifest_entry m on m.definition_version_id=p.definition_version_id where m.release_id=$1) effective_parameter_count,
    (select count(*)::int from public.estimate_formula_graph f join public.estimate_cumulative_manifest_entry m on m.definition_version_id=f.definition_version_id where m.release_id=$1) effective_formula_count,
    (select count(*)::int from public.estimate_resource_spec r join public.estimate_cumulative_manifest_entry m on m.definition_version_id=r.definition_version_id where m.release_id=$1) effective_resource_count,
    (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1 and (not baseline_ready or not scenario_ready or approved_template_baseline_id is null or runtime_publication_state<>'CANDIDATE')) unready_manifest,
    (select count(*)::int from public.estimate_search_document where search_release_id=$2) search_document_count,
    (select count(*)::int from public.estimate_search_document where search_release_id=$2 and catalog_id=any($4::text[]) and selectable and adjudication_class='EFFECTIVE_WORK') specialized_search_count,
    (select count(*)::int from public.estimate_search_group where search_release_id=$2) search_group_count,
    (select count(*)::int from public.estimate_search_group_membership where search_release_id=$2) membership_count,
    (select count(*)::int from public.estimate_candidate_capability_r3 where release_id=$1 or search_release_id=$2) capability_count,
    (select count(*)::int from public.estimate_resource_spec r join public.estimate_cumulative_manifest_entry m on m.definition_version_id=r.definition_version_id left join public.estimate_resource_price_route_binding b on b.resource_spec_id=r.id where m.release_id=$1 and b.resource_spec_id is null) resources_without_price_route`, [releaseId, searchReleaseId, ASPHALT_RELEASE_ID, [...SPECIALIZED_IDS]])).rows[0] as Json;
  const requiredQueries = ["асф", "асфа", "асфальт", "асфальтобетон", "дорожное покрытие", "парковка", "демонтаж асфальта", "фрезерование", "ямочный ремонт"];
  const searchChecks: Json[] = [];
  for (const query of requiredQueries) {
    const result = await client.query(`select count(*)::int count,(array_agg(catalog_id order by canonical_name_ru,catalog_id))[1:5] catalog_ids
      from public.estimate_search_document where search_release_id=$1 and selectable and normalized_search_blob like '%'||$2||'%'`, [searchReleaseId, normalize(query)]);
    searchChecks.push({ query, normalized: normalize(query), count: Number(result.rows[0].count), catalogIds: result.rows[0].catalog_ids ?? [] });
  }
  return { ...state, search_checks: searchChecks };
}
function assertMeasured(value: Json): void {
  invariant(value.release_status === "prepared" && value.search_status === "draft", `STATUS:${value.release_status}:${value.search_status}`);
  invariant(Number(value.manifest_count) === 10_329, `MANIFEST:${value.manifest_count}`);
  invariant(Number(value.specialized_manifest_count) === 7, `SPECIALIZED_MANIFEST:${value.specialized_manifest_count}`);
  invariant(Number(value.effective_parameter_count) === 12_841, `PARAMETERS:${value.effective_parameter_count}`);
  invariant(Number(value.effective_formula_count) === 615_879 && Number(value.effective_resource_count) === 615_879, `FORMULA_RESOURCE:${value.effective_formula_count}:${value.effective_resource_count}`);
  invariant(Number(value.unready_manifest) === 0, `UNREADY:${value.unready_manifest}`);
  invariant(Number(value.search_document_count) === 10_329 && Number(value.specialized_search_count) === 7, `SEARCH:${value.search_document_count}:${value.specialized_search_count}`);
  invariant(Number(value.search_group_count) === 2_369 && Number(value.membership_count) === 10_329, `GROUPS:${value.search_group_count}:${value.membership_count}`);
  invariant(Number(value.capability_count) === 0 && Number(value.resources_without_price_route) === 0, `EARLY_CAPABILITY_OR_PRICE_GAP:${value.capability_count}:${value.resources_without_price_route}`);
  for (const row of value.search_checks as Json[]) invariant(Number(row.count) > 0, `EMPTY_REQUIRED_SEARCH:${row.query}`);
  for (const row of (value.search_checks as Json[]).slice(0, 3)) invariant(Number(row.count) === 44, `ASPHALT_TECHNOLOGY_COUNT:${row.query}:${row.count}`);
}

async function main(): Promise<void> {
  assertLocal(); invariant(sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256, "MASTER_SHA_DRIFT");
  const full = JSON.parse(readFileSync(FULL_APPLY, "utf8")) as Json;
  invariant(full.status === "GREEN_R555_FULL_CUMULATIVE_SUCCESSOR_PREPARED_NOT_ACTIVE", "FULL_PREDECESSOR_NOT_GREEN");
  const parentReleaseId = String(full.candidate_release_id);
  const parentSearchReleaseId = String(full.candidate_search_release_id);
  const lineage = { parentReleaseId, parentSearchReleaseId, asphaltReleaseId: ASPHALT_RELEASE_ID, asphaltSearchReleaseId: ASPHALT_SEARCH_RELEASE_ID, specializedIds: [...SPECIALIZED_IDS], expandedAliasMapping: [...EXPANDED_ALIAS_MAPPING] };
  const sourceTree = sha256({ contract: CONTRACT, masterSha256: MASTER_SHA256, parentSourceTree: full.source_tree, lineage });
  const releaseId = uuid(`${CONTRACT}:release:${sourceTree}`);
  const searchReleaseId = uuid(`${CONTRACT}:search:${releaseId}:${sourceTree}`);
  const releaseKey = `r555-full-asphalt-reconciled-${sourceTree.slice(0, 12)}`;
  if (APPLY) {
    const dry = JSON.parse(readFileSync(DRY_RECEIPT, "utf8")) as Json;
    invariant(dry.status === "GREEN_R555_FULL_CUMULATIVE_ASPHALT_RECONCILIATION_DRY_RUN_ROLLED_BACK" && dry.candidate_release_id === releaseId && dry.candidate_search_release_id === searchReleaseId, "DRY_RUN_RECEIPT_DRIFT");
  }
  const client = new Client({ connectionString: DATABASE_URL, application_name: APPLY ? "r555-asphalt-reconciliation-apply" : "r555-asphalt-reconciliation-dry-run" });
  let transaction = false; const started = Date.now(); let activeBefore: Json = {}; let proof: Json = {};
  try {
    await client.connect(); activeBefore = await activeState(client);
    const pre = await residue(client, releaseId, searchReleaseId); invariant(Object.values(pre).every((value) => Number(value) === 0), `PREEXISTING:${JSON.stringify(pre)}`);
    const parent = (await client.query("select * from public.estimate_definition_release where id=$1", [parentReleaseId])).rows[0] as Json;
    const parentSearch = (await client.query("select * from public.estimate_search_index_release where id=$1", [parentSearchReleaseId])).rows[0] as Json;
    invariant(parent?.status === "prepared" && parentSearch?.status === "draft", "PARENT_STATUS_RED");
    const specialized = (await client.query(`select m.catalog_id,m.definition_version_id::text,m.approved_template_baseline_id::text,m.definition_hash,
      (select count(*)::int from public.estimate_parameter_definition p where p.definition_version_id=m.definition_version_id) parameters,
      (select count(*)::int from public.estimate_formula_graph f where f.definition_version_id=m.definition_version_id) formulas,
      (select count(*)::int from public.estimate_resource_spec r where r.definition_version_id=m.definition_version_id) resources
      from public.estimate_cumulative_manifest_entry m where m.release_id=$1 and m.catalog_id=any($2::text[]) order by m.catalog_id`, [ASPHALT_RELEASE_ID, [...SPECIALIZED_IDS]])).rows as Json[];
    invariant(specialized.length === 7 && specialized.reduce((sum, row) => sum + Number(row.parameters), 0) === 832 && specialized.reduce((sum, row) => sum + Number(row.resources), 0) === 427, "SPECIALIZED_LINEAGE_RED");
    await client.query("begin"); transaction = true; await client.query("set local statement_timeout=0"); await client.query("set local lock_timeout='5s'");
    invariant((await client.query("select pg_try_advisory_xact_lock(hashtext($1)) locked", [CONTRACT])).rows[0]?.locked === true, "WRITER_LOCK_BUSY");
    await client.query(`insert into public.estimate_definition_release(id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,parameter_count,formula_count)
      values($1,$2,$3,'draft',$4,$5,$6,10329,615879,$7::jsonb,$8,$9,12841,615879)`, [
      releaseId, releaseKey, parent.schema_version, execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), sourceTree,
      parent.source_manifest_sha256, JSON.stringify({ contract: CONTRACT, masterSha256: MASTER_SHA256, sourceIdentityManifest: "11610/11610", sourceVisibleDefinitions: 10322, externalAsphaltTechnologies: 7, asphaltLineage: "35 source identities / 63 catalog records / 44 technologies", lineage, localDisposable: true, productionEligible: false, activationAllowed: false }), parentReleaseId, sha256({ parent: parent.source_package_sha256, lineage }),
    ]);
    await client.query(`insert into public.estimate_cumulative_manifest_entry(release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,entry_sha256,runtime_publication_state)
      select $1::uuid,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,'ACCEPTED_INHERITED',approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,
        encode(extensions.digest(convert_to($1::text||':'||catalog_id||':'||definition_version_id::text||':'||entry_sha256,'UTF8'),'sha256'),'hex'),'CANDIDATE'
      from public.estimate_cumulative_manifest_entry where release_id=$2::uuid`, [releaseId, parentReleaseId]);
    await client.query(`insert into public.estimate_cumulative_manifest_entry(release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,entry_sha256,runtime_publication_state)
      select $1::uuid,catalog_id,definition_version_id,'R555_ASPHALT_EXTERNAL_RECONCILIATION',$2::uuid,domain_id,'ACCEPTED_INHERITED',approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,
        encode(extensions.digest(convert_to($1::text||':'||catalog_id||':'||definition_version_id::text||':'||entry_sha256,'UTF8'),'sha256'),'hex'),'CANDIDATE'
      from public.estimate_cumulative_manifest_entry where release_id=$2::uuid and catalog_id=any($3::text[])`, [releaseId, ASPHALT_RELEASE_ID, [...SPECIALIZED_IDS]]);
    await client.query("update public.estimate_definition_release set status='prepared',sealed_at=now() where id=$1", [releaseId]);

    await client.query(`insert into public.estimate_search_index_release(id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata,created_at)
      values($1,$2,'draft',$3,$4,$5,$6,$7,$8,10322,7,7,$9::jsonb,now())`, [searchReleaseId, `${releaseKey}:search`, parentSearch.taxonomy_version, `${parentSearch.group_relation_version}:asphalt-r44`, parentSearch.ranking_contract_version, parentSearch.source_commit, createHash("sha1").update(sourceTree).digest("hex"), sha256({ parent: parentSearch.snapshot_sha256, lineage }), JSON.stringify({ contract: CONTRACT, parentSearchReleaseId, parent_search_release_id: parentSearchReleaseId, definitionReleaseId: releaseId, sourceIdentityManifest: "11610/11610", sourceVisibleDocuments: 10322, externalAsphaltTechnologies: 7, asphaltTechnologyCount: 44, activationAllowed: false, productionEligible: false })]);
    await client.query(`insert into public.estimate_search_group select $1::uuid,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition from public.estimate_search_group where search_release_id=$2::uuid`, [searchReleaseId, parentSearchReleaseId]);
    await client.query(`insert into public.estimate_search_group(search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition)
      values($1,$2,'Специализированные асфальтобетонные работы','roadworks','roads','asphalt_pavement','asphalt_specialized','asphalt_specialized',$3::jsonb,7,$4,$5::jsonb)`, [searchReleaseId, EXTERNAL_GROUP_ID, JSON.stringify(["Дорожные работы", "Специализированные асфальтобетонные работы"]), sha256([...SPECIALIZED_IDS].sort()), JSON.stringify({ contract: CONTRACT, disposition: "EXTERNAL_SPECIALIZED_TECHNOLOGY_GROUP", memberCatalogIds: [...SPECIALIZED_IDS] })]);
    await client.query(`insert into public.estimate_search_document(search_release_id,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,group_id,subgroup_id,element_type,operation_kind,technology_variant,construction_state,primary_uom,canonical_name_ru,aliases,normative_classifiers,applicability_tags,publication_state,catalog_origin,definition_release_id,short_scope_ru,key_distinguishing_parameters,required_inputs_count,clarification_fields,included_boundaries,excluded_boundaries,replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,normalized_aliases,normalized_search_terms,normalized_search_blob,source_provenance,document_sha256,adjudication_class,selectable,canonical_target_catalog_id,definition_version_id)
      select $1::uuid,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,group_id,subgroup_id,element_type,operation_kind,technology_variant,construction_state,primary_uom,canonical_name_ru,aliases,normative_classifiers,applicability_tags,publication_state,catalog_origin,$2::uuid,short_scope_ru,key_distinguishing_parameters,required_inputs_count,clarification_fields,included_boundaries,excluded_boundaries,replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,normalized_aliases,normalized_search_terms,normalized_search_blob,source_provenance||jsonb_build_object('contract',$3::text,'parentSearchReleaseId',$4::text),encode(extensions.digest(convert_to($1::text||':'||catalog_id||':'||document_sha256,'UTF8'),'sha256'),'hex'),adjudication_class,selectable,canonical_target_catalog_id,definition_version_id
      from public.estimate_search_document where search_release_id=$4::uuid`, [searchReleaseId, releaseId, CONTRACT, parentSearchReleaseId]);
    await client.query(`insert into public.estimate_search_document(search_release_id,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,group_id,subgroup_id,element_type,operation_kind,technology_variant,construction_state,primary_uom,canonical_name_ru,aliases,normative_classifiers,applicability_tags,publication_state,catalog_origin,definition_release_id,short_scope_ru,key_distinguishing_parameters,required_inputs_count,clarification_fields,included_boundaries,excluded_boundaries,replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,normalized_aliases,normalized_search_terms,normalized_search_blob,source_provenance,document_sha256,adjudication_class,selectable,canonical_target_catalog_id,definition_version_id)
      select $1::uuid,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,$2,subgroup_id,element_type,operation_kind,technology_variant,construction_state,primary_uom,canonical_name_ru,aliases,normative_classifiers,applicability_tags,'ADMITTED_BACKEND','EXTERNAL_D',$3::uuid,short_scope_ru,key_distinguishing_parameters,required_inputs_count,clarification_fields,included_boundaries,excluded_boundaries,null,normalized_catalog_id,normalized_canonical_name,normalized_aliases,normalized_search_terms,normalized_search_blob,source_provenance||jsonb_build_object('contract',$4::text,'parentAsphaltSearchReleaseId',$5::text,'definitionReleaseId',$3::text),encode(extensions.digest(convert_to($1::text||':'||catalog_id||':'||document_sha256,'UTF8'),'sha256'),'hex'),'EFFECTIVE_WORK',true,null,definition_version_id
      from public.estimate_search_document where search_release_id=$5::uuid and catalog_id=any($6::text[])`, [searchReleaseId, EXTERNAL_GROUP_ID, releaseId, CONTRACT, ASPHALT_SEARCH_RELEASE_ID, [...SPECIALIZED_IDS]]);
    for (const mapping of EXPANDED_ALIAS_MAPPING) {
      const source = (await client.query("select aliases from public.estimate_search_document where search_release_id=$1 and catalog_id=$2", [ASPHALT_SEARCH_RELEASE_ID, mapping.asphalt])).rows[0] as Json;
      const target = (await client.query("select canonical_name_ru,aliases,normalized_search_terms,document_sha256 from public.estimate_search_document where search_release_id=$1 and catalog_id=$2", [searchReleaseId, mapping.full])).rows[0] as Json;
      invariant(source && target, `EXPANDED_ALIAS_SOURCE_MISSING:${mapping.full}`);
      const aliases = [...new Set([...(target.aliases as string[]), ...(source.aliases as string[])])];
      const normalizedAliases = [...new Set(aliases.map(normalize).filter(Boolean))];
      const terms = [...new Set([...(target.normalized_search_terms as string[]), normalize(target.canonical_name_ru), ...normalizedAliases, ...normalizedAliases.flatMap((value) => value.split(" "))].filter((value) => value.length >= 2))].sort((left, right) => left.localeCompare(right, "ru"));
      await client.query(`update public.estimate_search_document set aliases=$3::text[],normalized_aliases=$4::text[],normalized_search_terms=$5::text[],normalized_search_blob=$6,source_provenance=source_provenance||$7::jsonb,document_sha256=$8 where search_release_id=$1 and catalog_id=$2`, [searchReleaseId, mapping.full, aliases, normalizedAliases, terms, terms.join(" "), JSON.stringify({ asphaltAliasLineageSourceCatalogId: mapping.asphalt, asphaltAliasLineageSearchReleaseId: ASPHALT_SEARCH_RELEASE_ID }), sha256({ searchReleaseId, catalogId: mapping.full, previous: target.document_sha256, aliases, terms })]);
    }
    await client.query(`insert into public.estimate_search_group_membership select $1::uuid,group_id,catalog_id,ordinal,independent_disposition from public.estimate_search_group_membership where search_release_id=$2::uuid`, [searchReleaseId, parentSearchReleaseId]);
    for (const [ordinal, catalogId] of SPECIALIZED_IDS.entries()) await client.query(`insert into public.estimate_search_group_membership(search_release_id,group_id,catalog_id,ordinal,independent_disposition) values($1,$2,$3,$4,$5::jsonb)`, [searchReleaseId, EXTERNAL_GROUP_ID, catalogId, ordinal, JSON.stringify({ contract: CONTRACT, classification: "EXTERNAL_SPECIALIZED_EFFECTIVE_WORK", exactTechnologyIdentity: true })]);
    proof = await measured(client, releaseId, searchReleaseId); assertMeasured(proof);
    if (APPLY) await client.query("commit"); else await client.query("rollback"); transaction = false;
    const activeAfter = await activeState(client); invariant(JSON.stringify(activeAfter) === JSON.stringify(activeBefore), "ACTIVE_STATE_CHANGED");
    let rollbackResidue: Json | null = null;
    if (!APPLY) { rollbackResidue = await residue(client, releaseId, searchReleaseId); invariant(Object.values(rollbackResidue).every((value) => Number(value) === 0), `ROLLBACK_RESIDUE:${JSON.stringify(rollbackResidue)}`); }
    else { const persisted = await measured(client, releaseId, searchReleaseId); assertMeasured(persisted); }
    const receipt = { schema_version: CONTRACT, generated_utc: new Date().toISOString(), status: APPLY ? "GREEN_R555_FULL_CUMULATIVE_ASPHALT_RECONCILIATION_PREPARED_NOT_ACTIVE" : "GREEN_R555_FULL_CUMULATIVE_ASPHALT_RECONCILIATION_DRY_RUN_ROLLED_BACK", mode: APPLY ? "APPLY" : "DRY_RUN_ROLLED_BACK", master_sha256: MASTER_SHA256, source_tree: sourceTree, predecessor_release_id: parentReleaseId, predecessor_search_release_id: parentSearchReleaseId, candidate_release_id: releaseId, candidate_search_release_id: searchReleaseId, source_identity_manifest: "11610/11610", asphalt_lineage: { sourceIdentities: 35, catalogRecords: 63, technologies: 44, inheritedSpecializedTechnologies: 7 }, measured: proof, rollback_residue: rollbackResidue, active_before: activeBefore, active_after: activeAfter, capability_created: false, elapsed_ms: Date.now() - started, database_changed: APPLY, production_accessed: false, deployed: false, merged: false, released: false, ota: false };
    atomicJson(OUTPUT, { ...receipt, payload_sha256: sha256(receipt) }); process.stdout.write(`${JSON.stringify({ status: receipt.status, candidate_release_id: releaseId, candidate_search_release_id: searchReleaseId, measured: proof })}\n`);
  } catch (error) {
    if (transaction) try { await client.query("rollback"); } catch { /* preserve original */ }
    const receipt = { schema_version: CONTRACT, generated_utc: new Date().toISOString(), status: "RED_R555_FULL_CUMULATIVE_ASPHALT_RECONCILIATION", mode: APPLY ? "APPLY_FAILED_ROLLED_BACK" : "DRY_RUN_FAILED_ROLLED_BACK", candidate_release_id: releaseId, candidate_search_release_id: searchReleaseId, error: error instanceof Error ? error.stack ?? error.message : String(error), database_changed: false, production_accessed: false };
    atomicJson(OUTPUT, { ...receipt, payload_sha256: sha256(receipt) }); throw error;
  } finally { await client.end().catch(() => undefined); }
}

void main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`); process.exitCode = 1; });
