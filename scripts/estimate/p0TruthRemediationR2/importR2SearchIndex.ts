import { createHash } from "node:crypto";
import path from "node:path";
import { Client } from "pg";
import {
  EVIDENCE,
  PACKAGE_A,
  PACKAGE_B,
  ensureDir,
  invariant,
  producer,
  readJson,
  readJsonl,
  sha256File,
  writeJson,
} from "./support";

const target = String(process.env.P0_R2_PACKAGE_TARGET ?? "A").toUpperCase();
invariant(target === "A" || target === "B", `INVALID_PACKAGE_TARGET:${target}`);
const packageRoot = target === "A" ? PACKAGE_A : PACKAGE_B;
const databaseUrl = String(process.env.P0_R2_SEARCH_DATABASE_URL
  ?? `postgresql://postgres@127.0.0.1:55432/p0_r2_search_${target.toLocaleLowerCase("en")}`);
const command = `P0_R2_PACKAGE_TARGET=${target} P0_R2_SEARCH_DATABASE_URL=<disposable> npx tsx scripts/estimate/p0TruthRemediationR2/importR2SearchIndex.ts`;
const manifestPath = path.join(packageRoot, "FINAL_SEARCH_INDEX_MANIFEST.json");
const manifest = readJson<Record<string, any>>(manifestPath);
const searchRoot = path.join(packageRoot, "search-index");
const groupPath = path.join(searchRoot, "groups.jsonl");
const documentPath = path.join(searchRoot, "search-documents.jsonl");
const membershipPath = path.join(searchRoot, "group-memberships.jsonl");
const relationPath = path.join(searchRoot, "typed-relations.jsonl");
const inputs = [manifestPath, groupPath, documentPath, membershipPath, relationPath];

function deterministicUuid(value: string): string {
  const bytes = Buffer.from(createHash("sha256").update(value).digest("hex").slice(0, 32), "hex");
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function batches<T>(rows: T[], size: number, run: (batch: T[]) => Promise<void>) {
  for (let offset = 0; offset < rows.length; offset += size) await run(rows.slice(offset, offset + size));
}

const groups = readJsonl<Record<string, any>>(groupPath);
const documents = readJsonl<Record<string, any>>(documentPath);
const memberships = readJsonl<Record<string, any>>(membershipPath);
const relations = readJsonl<Record<string, any>>(relationPath);
const releaseId = deterministicUuid(`${manifest.manifest_sha256}:${target}`);
const releaseKey = `p0-estimate-truth-r2-search-${target.toLocaleLowerCase("en")}-${String(manifest.manifest_sha256).slice(0, 16)}`;
async function main() {
  const client = new Client({ connectionString: databaseUrl });
  const startedAt = Date.now();
  await client.connect();
  try {
  await client.query("begin");
  await client.query(`insert into public.estimate_search_index_release(
    id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,
    source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,
    metadata,sealed_at,activated_at
  ) values($1,$2,'active',$3,$4,$5,$6,$7,$8,$9,$10,0,$11::jsonb,now(),now())`, [
    releaseId,
    releaseKey,
    manifest.taxonomy_version,
    manifest.group_relation_version,
    manifest.ranking_contract_version,
    manifest.source_head,
    manifest.source_tree,
    manifest.manifest_sha256,
    manifest.counts.global,
    manifest.counts.external_total,
    JSON.stringify({
      disposable_test_only: true,
      corrected_cumulative_activation: false,
      discovery_oracle_complete: false,
      package_target: target,
      package_manifest_sha256: sha256File(manifestPath),
    }),
  ]);

  await batches(groups, 250, async (batch) => {
    await client.query(`insert into public.estimate_search_group(
      search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,
      assembly_id,work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
    ) select $1,x.group_id,x.group_name_ru,x.domain_id,x.system_id,x.subsystem_id,
      x.assembly_id,x.work_family_id,x.breadcrumb,x.member_count,x.member_set_sha256,x.oracle_disposition
    from jsonb_to_recordset($2::jsonb) as x(
      group_id text,group_name_ru text,domain_id text,system_id text,subsystem_id text,
      assembly_id text,work_family_id text,breadcrumb jsonb,member_count integer,
      member_set_sha256 text,oracle_disposition jsonb
    )`, [releaseId, JSON.stringify(batch)]);
  });

  await batches(documents, 150, async (batch) => {
    await client.query(`insert into public.estimate_search_document(
      search_release_id,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
      group_id,subgroup_id,element_type,operation_kind,technology_variant,construction_state,
      primary_uom,canonical_name_ru,aliases,normative_classifiers,applicability_tags,
      publication_state,catalog_origin,definition_release_id,short_scope_ru,
      key_distinguishing_parameters,required_inputs_count,clarification_fields,
      included_boundaries,excluded_boundaries,replacement_catalog_id,normalized_catalog_id,
      normalized_canonical_name,normalized_aliases,normalized_search_terms,normalized_search_blob,source_provenance,document_sha256
    ) select $1,x.catalog_id,x.domain_id,x.system_id,x.subsystem_id,x.assembly_id,x.work_family_id,
      x.group_id,x.subgroup_id,x.element_type,x.operation_kind,x.technology_variant,x.construction_state,
      x.primary_uom,x.canonical_name_ru,x.aliases,x.normative_classifiers,x.applicability_tags,
      x.publication_state,x.catalog_origin,null,x.short_scope_ru,x.key_distinguishing_parameters,
      x.required_inputs_count,x.clarification_fields,x.included_boundaries,x.excluded_boundaries,
      x.replacement_catalog_id,x.normalized_catalog_id,x.normalized_canonical_name,
      x.normalized_aliases,x.normalized_search_terms,x.normalized_search_blob,x.source_provenance,x.document_sha256
    from jsonb_to_recordset($2::jsonb) as x(
      catalog_id text,domain_id text,system_id text,subsystem_id text,assembly_id text,
      work_family_id text,group_id text,subgroup_id text,element_type text,operation_kind text,
      technology_variant text,construction_state text,primary_uom text,canonical_name_ru text,
      aliases text[],normative_classifiers text[],applicability_tags text[],publication_state text,
      catalog_origin text,short_scope_ru text,key_distinguishing_parameters jsonb,
      required_inputs_count integer,clarification_fields jsonb,included_boundaries jsonb,
      excluded_boundaries jsonb,replacement_catalog_id text,normalized_catalog_id text,
      normalized_canonical_name text,normalized_aliases text[],normalized_search_terms text[],normalized_search_blob text,
      source_provenance jsonb,document_sha256 text
    )`, [releaseId, JSON.stringify(batch)]);
  });

  await batches(memberships, 300, async (batch) => {
    await client.query(`insert into public.estimate_search_group_membership(
      search_release_id,group_id,catalog_id,ordinal,independent_disposition
    ) select $1,x.group_id,x.catalog_id,x.ordinal,x.independent_disposition
    from jsonb_to_recordset($2::jsonb) as x(
      group_id text,catalog_id text,ordinal integer,independent_disposition jsonb
    )`, [releaseId, JSON.stringify(batch)]);
  });

  await batches(relations, 300, async (batch) => {
    await client.query(`insert into public.estimate_search_typed_relation(
      search_release_id,source_catalog_id,target_catalog_id,relationship_type,direction,
      source_locator,applicability_predicate,required_when,mutually_exclusive_with,
      explanation_ru,relation_sha256
    ) select $1,x.source_catalog_id,x.target_catalog_id,x.relationship_type,x.direction,
      x.source_locator,x.applicability_predicate,x.required_when,x.mutually_exclusive_with,
      x.explanation_ru,x.relation_sha256
    from jsonb_to_recordset($2::jsonb) as x(
      source_catalog_id text,target_catalog_id text,relationship_type text,direction text,
      source_locator text,applicability_predicate jsonb,required_when jsonb,
      mutually_exclusive_with text[],explanation_ru text,relation_sha256 text
    )`, [releaseId, JSON.stringify(batch)]);
  });
  await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }

const observed = (await client.query(`select
  (select count(*) from public.estimate_search_document where search_release_id=$1)::integer documents,
  (select count(*) from public.estimate_search_group where search_release_id=$1)::integer groups,
  (select count(*) from public.estimate_search_group_membership where search_release_id=$1)::integer memberships,
  (select count(*) from public.estimate_search_typed_relation where search_release_id=$1)::integer relations,
  (select count(*) from public.estimate_search_document where search_release_id=$1 and catalog_origin='GLOBAL')::integer global_count,
  (select count(*) from public.estimate_search_document where search_release_id=$1 and catalog_origin<>'GLOBAL')::integer external_count
`, [releaseId])).rows[0];
await client.end();

const exact = Number(observed.documents) === 12_270
  && Number(observed.memberships) === 12_270
  && Number(observed.groups) === groups.length
  && Number(observed.relations) === relations.length
  && Number(observed.global_count) === 11_610
  && Number(observed.external_count) === 660;
invariant(exact, `SEARCH_IMPORT_COUNT_MISMATCH:${JSON.stringify(observed)}`);
ensureDir(EVIDENCE);
const evidencePath = path.join(EVIDENCE, `SEARCH_DB_${target}_IMPORT.json`);
writeJson(evidencePath, {
  ...producer(command, `Disposable search DB ${target} import; not corrected cumulative activation`, inputs),
  database_role: `DISPOSABLE_SEARCH_DB_${target}`,
  database_url_redacted: databaseUrl.replace(/:\/\/[^@]+@/u, "://<redacted>@"),
  release_id: releaseId,
  release_key: releaseKey,
  observed,
  expected: { documents: 12_270, memberships: 12_270, groups: groups.length, relations: relations.length, global_count: 11_610, external_count: 660 },
  duration_ms: Date.now() - startedAt,
  disposable_test_activation: true,
  corrected_cumulative_activation: false,
  status: "GREEN_DISPOSABLE_SEARCH_IMPORT_COUNTS_EXACT_CONTENT_DISCOVERY_STILL_RED",
});
  console.info(JSON.stringify({ status: "GREEN_DISPOSABLE_SEARCH_IMPORT_COUNTS_EXACT", target, releaseId, observed, evidencePath }, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
