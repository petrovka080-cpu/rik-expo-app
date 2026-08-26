import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app-r555-material-first-search-snapshot.v1";
const MASTER_PATH = resolve("C:/Users/User/Downloads/MASTER_TZ_R5_5_5_PRODUCTION_GRADE_SINGLE_CANONICAL_MATERIAL_FIRST_CLEAR_RUSSIAN_NAMES_FULL_CATALOG_ASPHALT_WEB_ANDROID_50_PER_GROUP_GLOBAL_GREEN_RU.md");
const MASTER_SHA256 = "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const DATABASE_URL = process.env.R555_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CANDIDATE_RECEIPT = resolve(".release-runtime/r555/evidence/07_R555_MATERIAL_FIRST_REGRESSION_CANDIDATE_APPLY.json");
const PREDECESSOR_SEARCH_RELEASE_ID = "d08d030d-97e8-53ea-88fd-6012fc82ba9f";
const TARGET_CATALOG_IDS = [
  "concrete_foundation_interior_anchor_group_pour_high_load",
  "concrete_foundation_interior_belt_pour_repair",
] as const;
const APPLY = process.argv.includes("--apply");
const OUTPUT = resolve(`.release-runtime/r555/evidence/08A_R555_MATERIAL_FIRST_SEARCH_SNAPSHOT_${APPLY ? "APPLY" : "DRY_RUN"}.json`);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function uuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function exactDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname), `R555_SEARCH_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2", `R555_SEARCH_DATABASE_BOUNDARY_RED:${parsed.host}${parsed.pathname}`);
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256, "R555_MASTER_SHA_DRIFT");
  const candidate = JSON.parse(readFileSync(CANDIDATE_RECEIPT, "utf8")) as Json;
  invariant(candidate.status === "GREEN_LOCAL_REGRESSION_CANDIDATE_PREPARED_NOT_ACTIVE", "R555_CANDIDATE_RECEIPT_RED");
  const definitionReleaseId = String(candidate.candidate_release_id);
  const sourceHead = String(candidate.source_head);
  const sourceTree = String(candidate.source_tree);
  const searchSourceTree = createHash("sha1").update(sourceTree).digest("hex");
  const consumerTenantId = String(candidate.consumer_tenant_id ?? candidate.tenant_id ?? "");
  invariant(/^[0-9a-f-]{36}$/iu.test(consumerTenantId), "R555_CONSUMER_TENANT_ID_MISSING");
  const searchReleaseId = uuid(`${CONTRACT}:search:${PREDECESSOR_SEARCH_RELEASE_ID}:${definitionReleaseId}:${sourceTree}`);
  const capabilityId = uuid(`${CONTRACT}:capability:${consumerTenantId}:${definitionReleaseId}:${searchReleaseId}`);
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const predecessor = (await client.query(
      "select * from public.estimate_search_index_release where id=$1",
      [PREDECESSOR_SEARCH_RELEASE_ID],
    )).rows[0] as Json | undefined;
    invariant(predecessor, "R555_PREDECESSOR_SEARCH_MISSING");
    const release = (await client.query(
      "select id::text,status from public.estimate_definition_release where id=$1",
      [definitionReleaseId],
    )).rows[0] as Json | undefined;
    invariant(release?.status === "prepared", "R555_DEFINITION_CANDIDATE_NOT_PREPARED");

    const existing = (await client.query(
      "select id::text from public.estimate_search_index_release where id=$1",
      [searchReleaseId],
    )).rows[0];
    if (existing) {
      invariant(APPLY, "R555_SEARCH_SNAPSHOT_ALREADY_EXISTS_BEFORE_DRY_RUN");
    } else {
      await client.query("begin");
      try {
        await client.query(`insert into public.estimate_search_index_release(
          id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,
          source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata,created_at
        ) values($1,$2,'draft',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,now())`, [
          searchReleaseId,
          `r555-material-first-${sourceTree.slice(0, 12)}`,
          predecessor.taxonomy_version,
          predecessor.group_relation_version,
          predecessor.ranking_contract_version,
          sourceHead,
          searchSourceTree,
          sha256(`${CONTRACT}:${predecessor.snapshot_sha256}:${definitionReleaseId}:${sourceTree}`),
          predecessor.global_count,
          predecessor.external_count,
          predecessor.discovered_count,
          JSON.stringify({
            contract: CONTRACT,
            parentSearchReleaseId: PREDECESSOR_SEARCH_RELEASE_ID,
            parent_search_release_id: PREDECESSOR_SEARCH_RELEASE_ID,
            definitionReleaseId,
            canonicalSourceTreeSha256: sourceTree,
            targetCatalogIds: TARGET_CATALOG_IDS,
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
          from public.estimate_search_group where search_release_id=$2`, [searchReleaseId, PREDECESSOR_SEARCH_RELEASE_ID]);
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
          document.technology_variant,document.construction_state,document.primary_uom,
          case when document.catalog_id=any($4::text[]) then identity.title_ru else document.canonical_name_ru end,
          document.aliases,document.normative_classifiers,document.applicability_tags,document.publication_state,
          document.catalog_origin,case when manifest.definition_version_id is null then document.definition_release_id else $2::uuid end,
          document.short_scope_ru,document.key_distinguishing_parameters,document.required_inputs_count,
          document.clarification_fields,document.included_boundaries,document.excluded_boundaries,
          document.replacement_catalog_id,document.normalized_catalog_id,
          case when document.catalog_id=any($4::text[]) then lower(regexp_replace(identity.title_ru,'[^[:alnum:]а-яё]+',' ','gi')) else document.normalized_canonical_name end,
          document.normalized_aliases,
          case when document.catalog_id=any($4::text[]) then (
            select array_agg(distinct term order by term) from unnest(
              document.normalized_search_terms || regexp_split_to_array(lower(regexp_replace(identity.title_ru,'[^[:alnum:]а-яё]+',' ','gi')),'\\s+')
            ) term where length(term)>=2
          ) else document.normalized_search_terms end,
          case when document.catalog_id=any($4::text[]) then document.normalized_search_blob||' '||lower(regexp_replace(identity.title_ru,'[^[:alnum:]а-яё]+',' ','gi')) else document.normalized_search_blob end,
          document.source_provenance||jsonb_build_object('r555MaterialFirstSearchSnapshotId',($1::uuid)::text),
          encode(extensions.digest(convert_to(($1::uuid)::text||':'||document.catalog_id||':'||document.document_sha256||':'||coalesce(manifest.definition_version_id::text,''),'UTF8'),'sha256'),'hex'),
          document.adjudication_class,document.selectable,document.canonical_target_catalog_id,
          coalesce(manifest.definition_version_id,document.definition_version_id)
          from public.estimate_search_document document
          left join public.estimate_cumulative_manifest_entry manifest
            on manifest.release_id=$2 and manifest.catalog_id=document.catalog_id
          left join public.estimate_work_identity identity on identity.catalog_id=document.catalog_id
          where document.search_release_id=$3`, [searchReleaseId, definitionReleaseId, PREDECESSOR_SEARCH_RELEASE_ID, TARGET_CATALOG_IDS]);
        await client.query(`insert into public.estimate_search_group_membership(
          search_release_id,group_id,catalog_id,ordinal,independent_disposition
        ) select $1,group_id,catalog_id,ordinal,independent_disposition
          from public.estimate_search_group_membership where search_release_id=$2`, [searchReleaseId, PREDECESSOR_SEARCH_RELEASE_ID]);
        await client.query(`insert into public.estimate_search_clarification_question
          select $1,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,answer_type,unit_id,
            allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence
          from public.estimate_search_clarification_question where search_release_id=$2`, [searchReleaseId, PREDECESSOR_SEARCH_RELEASE_ID]);
        await client.query(`insert into public.estimate_search_typed_relation
          select $1,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
            applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256
          from public.estimate_search_typed_relation where search_release_id=$2`, [searchReleaseId, PREDECESSOR_SEARCH_RELEASE_ID]);
        await client.query(`insert into public.estimate_candidate_capability_r3(
          id,environment,tenant_id,release_id,search_release_id,expires_at,purpose,source_head,source_tree,issued_by
        ) values($1,'r555-web80-real-auth',$2,$3,$4,$5,'estimate_candidate_admission_r3',$6,$7,$8)`, [
          capabilityId,
          consumerTenantId,
          definitionReleaseId,
          searchReleaseId,
          new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
          sourceHead,
          sourceTree,
          "prepareR555MaterialFirstSearchSnapshot",
        ]);
        if (APPLY) await client.query("commit"); else await client.query("rollback");
      } catch (error) {
        await client.query("rollback").catch(() => undefined);
        throw error;
      }
    }

    const measured = APPLY ? (await client.query(`select
      (select count(*)::int from public.estimate_search_document where search_release_id=$1) documents,
      (select count(*)::int from public.estimate_search_group where search_release_id=$1) groups,
      (select count(*)::int from public.estimate_search_group_membership where search_release_id=$1) memberships,
      (select count(*)::int from public.estimate_search_document document
        join public.estimate_cumulative_manifest_entry manifest on manifest.release_id=$2 and manifest.catalog_id=document.catalog_id
        where document.search_release_id=$1 and document.definition_version_id=manifest.definition_version_id
          and document.definition_release_id=$2) manifest_aligned,
      (select count(*)::int from public.estimate_search_document document
        join public.estimate_cumulative_manifest_entry manifest on manifest.release_id=$2 and manifest.catalog_id=document.catalog_id
        where document.search_release_id=$1) manifest_visible,
      (select count(*)::int from public.estimate_search_document where search_release_id=$1
        and catalog_id=any($3::text[]) and definition_release_id=$2) target_release_aligned,
      (select count(*)::int from public.estimate_search_document document
        join public.estimate_work_identity identity on identity.catalog_id=document.catalog_id
        where document.search_release_id=$1 and document.catalog_id=any($3::text[])
          and document.canonical_name_ru=identity.title_ru) target_title_aligned
    `, [searchReleaseId, definitionReleaseId, TARGET_CATALOG_IDS])).rows[0] as Json : {
      documents: Number(predecessor.discovered_count),
      groups: "ROLLED_BACK",
      memberships: "ROLLED_BACK",
      manifest_aligned: "ROLLED_BACK",
      manifest_visible: "ROLLED_BACK",
      target_release_aligned: TARGET_CATALOG_IDS.length,
      target_title_aligned: TARGET_CATALOG_IDS.length,
    };
    if (APPLY) {
      invariant(Number(measured.documents) === 3430, `R555_SEARCH_DOCUMENT_COUNT:${measured.documents}`);
      invariant(Number(measured.manifest_aligned) === Number(measured.manifest_visible), "R555_SEARCH_MANIFEST_ALIGNMENT_RED");
      invariant(Number(measured.target_release_aligned) === TARGET_CATALOG_IDS.length, "R555_SEARCH_TARGET_RELEASE_ALIGNMENT_RED");
      invariant(Number(measured.target_title_aligned) === TARGET_CATALOG_IDS.length, "R555_SEARCH_TARGET_TITLE_ALIGNMENT_RED");
    }
    atomicJson(OUTPUT, {
      schema_version: CONTRACT,
      generated_utc: new Date().toISOString(),
      status: APPLY ? "GREEN_LOCAL_SEARCH_SNAPSHOT_APPLIED_NOT_ACTIVE" : "GREEN_DRY_RUN_ROLLED_BACK_NO_WRITES",
      master_sha256: MASTER_SHA256,
      predecessor_search_release_id: PREDECESSOR_SEARCH_RELEASE_ID,
      candidate_release_id: definitionReleaseId,
      candidate_search_release_id: searchReleaseId,
      capability_id: capabilityId,
      consumer_tenant_id: consumerTenantId,
      price_snapshot_id: candidate.price_snapshot_id,
      source_head: sourceHead,
      source_tree: sourceTree,
      search_source_tree_sha1_compatibility: searchSourceTree,
      target_catalog_ids: TARGET_CATALOG_IDS,
      measured,
      active_search_changed: false,
      production_accessed: false,
      deployed: false,
      merged: false,
      released: false,
      ota: false,
      secrets_captured: false,
    });
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
