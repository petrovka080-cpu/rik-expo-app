import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const SPEC_PATH = resolve("C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (11).md");
const SPEC_SHA256 = "21bdd2cf79185cbcf2a6621005f32d6eaf47e653dd88e5b006fcdc6797854138";
const BASE_COMMIT = "18c6b3a90ba6ab9ed044cf9fe982b9a98469da7c";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const DEFINITION_RELEASE_ID = "94443669-8f5b-5cc7-b364-2f8e9f9e3506";
const PARENT_SEARCH_RELEASE_ID = "367c2439-df83-5f27-bedd-89247b50caae";
const CONTRACT = "p0-one-monolith-r5.8.3-professional-search-successor.v1";
const LEDGER_PATH = resolve(
  ".release-runtime/p0-one-monolith-r58/evidence/13-r583/R583_PARAMETER_SEMANTIC_DEFECT_LEDGER.json",
);
const OUTPUT = resolve(
  ".release-runtime/p0-one-monolith-r58/evidence/13-r583/R583_PROFESSIONAL_SEARCH_SUCCESSOR.json",
);
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const APPLY = process.argv.includes("--apply");

const REQUIRED_CATALOG_IDS = [
  "built-in-ai-1000:0702",
  "work_catalog_roadworks_paving_roads_landscape_interior_asphalt_drain_large_area_professional_expanded_v1",
  "r58-real:bridge-bored-pile-installation",
];

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function git(args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
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

function stableJson(value: unknown): string {
  return JSON.stringify(stable(value));
}

function uuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, file);
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
  invariant(sha256(readFileSync(SPEC_PATH)) === SPEC_SHA256, "R583_PROFESSIONAL_SEARCH_SPEC_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === EXPECTED_BRANCH, `R583_PROFESSIONAL_SEARCH_BRANCH:${branch}`);
  invariant(git(["status", "--porcelain=v1"]) === "", "R583_PROFESSIONAL_SEARCH_DIRTY_WORKTREE");
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);

  const ledger = JSON.parse(readFileSync(LEDGER_PATH, "utf8")) as Json;
  invariant(ledger.specSha256 === SPEC_SHA256, "R583_PROFESSIONAL_SEARCH_LEDGER_SPEC_DRIFT");
  invariant(ledger.source?.head === head && ledger.source?.tree === tree,
    "R583_PROFESSIONAL_SEARCH_LEDGER_SOURCE_DRIFT");
  invariant(ledger.release?.id === DEFINITION_RELEASE_ID && ledger.summary?.audited === 4_282,
    "R583_PROFESSIONAL_SEARCH_LEDGER_DENOMINATOR_RED");
  const readyEntries = (ledger.entries as Json[]).filter((entry) => entry.status === "PROFESSIONAL_READY");
  const quarantinedEntries = (ledger.entries as Json[]).filter((entry) => entry.status === "QUARANTINED");
  const repairEntries = (ledger.entries as Json[]).filter((entry) => entry.status === "REPAIR_REQUIRED");
  invariant(readyEntries.length >= 50, `R583_PROFESSIONAL_SEARCH_READY_DENOMINATOR:${readyEntries.length}`);
  invariant(repairEntries.length === 0, `R583_PROFESSIONAL_SEARCH_UNRESOLVED_REPAIR_QUEUE:${repairEntries.length}`);
  const readyCatalogIds = readyEntries.map((entry) => String(entry.catalogId));
  invariant(REQUIRED_CATALOG_IDS.every((catalogId) => readyCatalogIds.includes(catalogId)),
    "R583_PROFESSIONAL_SEARCH_REQUIRED_CATALOG_QUARANTINED");

  const ledgerFingerprintSha256 = sha256(stableJson(ledger.entries.map((entry: Json) => [
    entry.catalogId,
    entry.definitionId,
    entry.status,
    entry.dispositionReason,
  ])));
  const searchReleaseId = uuid(`${CONTRACT}:${head}:${tree}:${DEFINITION_RELEASE_ID}:${PARENT_SEARCH_RELEASE_ID}:${ledgerFingerprintSha256}`);
  const releaseKey = `p0-r583-professional-search-${head.slice(0, 16)}`;
  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: APPLY ? "r583-professional-search-apply" : "r583-professional-search-dry-run",
  });
  await client.connect();
  let idempotent = false;
  let snapshotSha256 = "";
  try {
    await client.query("begin");
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='180s'");
    const definitionRelease = (await client.query(
      "select * from public.estimate_definition_release where id=$1",
      [DEFINITION_RELEASE_ID],
    )).rows[0] as Json | undefined;
    const parentSearch = (await client.query(
      "select * from public.estimate_search_index_release where id=$1",
      [PARENT_SEARCH_RELEASE_ID],
    )).rows[0] as Json | undefined;
    invariant(definitionRelease?.status === "prepared" && Number(definitionRelease.definition_count) === 4_282,
      "R583_PROFESSIONAL_SEARCH_DEFINITION_RELEASE_RED");
    invariant(parentSearch?.status === "draft", "R583_PROFESSIONAL_SEARCH_PARENT_RED");

    const existing = (await client.query(
      "select * from public.estimate_search_index_release where id=$1 or release_key=$2",
      [searchReleaseId, releaseKey],
    )).rows[0] as Json | undefined;
    if (!existing) {
      const placeholder = sha256(stableJson({ contract: CONTRACT, head, tree, phase: "BUILDING" }));
      await client.query(`insert into public.estimate_search_index_release(
        id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,source_commit,source_tree,
        snapshot_sha256,global_count,external_count,discovered_count,metadata
      ) values($1,$2,'draft',$3,$4,$5,$6,$7,$8,$9,$10,0,$11::jsonb)`, [
        searchReleaseId,
        releaseKey,
        parentSearch.taxonomy_version,
        parentSearch.group_relation_version,
        parentSearch.ranking_contract_version,
        head,
        tree,
        placeholder,
        parentSearch.global_count,
        parentSearch.external_count,
        JSON.stringify({
          authority: "P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5.8.3",
          specSha256: SPEC_SHA256,
          contract: CONTRACT,
          definitionReleaseId: DEFINITION_RELEASE_ID,
          parentSearchReleaseId: PARENT_SEARCH_RELEASE_ID,
          ledgerFingerprintSha256,
          professionalReadyCatalogCount: readyEntries.length,
          quarantinedCatalogCount: quarantinedEntries.length,
          activeSearchSwitched: false,
          runtime8081Switched: false,
          terminalGreenClaimed: false,
        }),
      ]);
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

      await client.query(`update public.estimate_search_document document set
        selectable=false,publication_state='RETIRED',adjudication_class='QUARANTINED',
        source_provenance=document.source_provenance||$3::jsonb
        where document.search_release_id=$1 and document.adjudication_class='EFFECTIVE_WORK'
          and document.selectable and not(document.catalog_id=any($2::text[]))`, [
        searchReleaseId,
        readyCatalogIds,
        JSON.stringify({
          r583Disposition: "QUARANTINED",
          r583DispositionContract: CONTRACT,
          r583LedgerFingerprintSha256: ledgerFingerprintSha256,
        }),
      ]);
      await client.query(`update public.estimate_search_document document set
        source_provenance=document.source_provenance||$3::jsonb
        where document.search_release_id=$1 and document.adjudication_class='EFFECTIVE_WORK'
          and document.selectable and document.catalog_id=any($2::text[])`, [
        searchReleaseId,
        readyCatalogIds,
        JSON.stringify({
          r583Disposition: "PROFESSIONAL_READY",
          r583DispositionContract: CONTRACT,
          r583LedgerFingerprintSha256: ledgerFingerprintSha256,
        }),
      ]);
      await client.query(`update public.estimate_search_document document set document_sha256=
        encode(extensions.digest(convert_to((to_jsonb(document)-'search_release_id'-'document_sha256')::text,'UTF8'),'sha256'),'hex')
        where document.search_release_id=$1`, [searchReleaseId]);
      const corpus = await corpusFingerprint(client, searchReleaseId);
      snapshotSha256 = sha256(stableJson({
        specSha256: SPEC_SHA256,
        contract: CONTRACT,
        head,
        tree,
        definitionReleaseId: DEFINITION_RELEASE_ID,
        parentSearchSnapshot: parentSearch.snapshot_sha256,
        ledgerFingerprintSha256,
        corpus,
      }));
      await client.query(
        "update public.estimate_search_index_release set snapshot_sha256=$2,metadata=metadata||$3::jsonb where id=$1",
        [searchReleaseId, snapshotSha256, JSON.stringify({ corpus, snapshotContract: CONTRACT })],
      );
    } else {
      invariant(existing.id === searchReleaseId && existing.status === "draft"
        && existing.source_commit === head && existing.source_tree === tree,
      "R583_PROFESSIONAL_SEARCH_EXISTING_RELEASE_DRIFT");
      idempotent = true;
      const corpus = await corpusFingerprint(client, searchReleaseId);
      snapshotSha256 = sha256(stableJson({
        specSha256: SPEC_SHA256,
        contract: CONTRACT,
        head,
        tree,
        definitionReleaseId: DEFINITION_RELEASE_ID,
        parentSearchSnapshot: parentSearch.snapshot_sha256,
        ledgerFingerprintSha256,
        corpus,
      }));
      invariant(existing.snapshot_sha256 === snapshotSha256,
        "R583_PROFESSIONAL_SEARCH_EXISTING_SNAPSHOT_DRIFT");
    }

    const observed = (await client.query(`select
      (select count(*)::int from public.estimate_search_document where search_release_id=$1) documents,
      (select count(*)::int from public.estimate_search_group where search_release_id=$1) groups,
      (select count(*)::int from public.estimate_search_group_membership where search_release_id=$1) memberships,
      (select count(*)::int from public.estimate_search_typed_relation where search_release_id=$1) relations,
      (select count(*)::int from public.estimate_search_document where search_release_id=$1 and selectable) selectable,
      (select count(*)::int from public.estimate_search_document where search_release_id=$1
        and selectable and adjudication_class='EFFECTIVE_WORK') professional_ready_selectable,
      (select count(*)::int from public.estimate_search_document where search_release_id=$1
        and adjudication_class='QUARANTINED') quarantined_documents,
      (select count(*)::int from public.estimate_search_document document
        join public.estimate_cumulative_manifest_entry manifest
          on manifest.release_id=$2 and manifest.catalog_id=document.catalog_id
        where document.search_release_id=$1 and document.selectable
          and (document.definition_release_id<>$2 or document.definition_version_id<>manifest.definition_version_id
            or not(document.catalog_id=any($3::text[])))) selectable_definition_mismatch,
      (select count(*)::int from public.estimate_search_document where search_release_id=$1
        and catalog_id=any($4::text[]) and selectable and adjudication_class='EFFECTIVE_WORK'
        and definition_release_id=$2 and definition_version_id is not null) required_ready,
      (select count(*)::int from public.estimate_search_index_release where status='active') active_search_releases`, [
      searchReleaseId,
      DEFINITION_RELEASE_ID,
      readyCatalogIds,
      REQUIRED_CATALOG_IDS,
    ])).rows[0] as Json;
    invariant(Number(observed.documents) === 12_278 && Number(observed.groups) === 4_326
      && Number(observed.memberships) === 12_278 && Number(observed.relations) === 2_236,
    `R583_PROFESSIONAL_SEARCH_PARENT_PARITY:${stableJson(observed)}`);
    invariant(Number(observed.selectable) === Number(observed.professional_ready_selectable)
      && Number(observed.selectable) >= 50 && Number(observed.quarantined_documents) >= quarantinedEntries.length
      && Number(observed.selectable_definition_mismatch) === 0
      && Number(observed.required_ready) === REQUIRED_CATALOG_IDS.length
      && Number(observed.active_search_releases) === 0,
    `R583_PROFESSIONAL_SEARCH_INVARIANTS_RED:${stableJson(observed)}`);

    const proof = {
      schemaVersion: CONTRACT,
      capturedAt: new Date().toISOString(),
      specSha256: SPEC_SHA256,
      source: { branch, head, tree, descendantOf18c6b3a9: true },
      definitionReleaseId: DEFINITION_RELEASE_ID,
      parentSearchReleaseId: PARENT_SEARCH_RELEASE_ID,
      ledgerFingerprintSha256,
      ledger: {
        audited: ledger.summary.audited,
        professionalReady: readyEntries.length,
        repairRequired: repairEntries.length,
        quarantined: quarantinedEntries.length,
      },
      searchRelease: { id: searchReleaseId, key: releaseKey, status: "draft", snapshotSha256 },
      observed,
      requiredCatalogIds: REQUIRED_CATALOG_IDS,
      activeSearchSwitched: false,
      activeDefinitionReleaseSwitched: false,
      runtime8081Switched: false,
      idempotent,
      writesApplied: APPLY && !idempotent ? 1 : 0,
      terminalGreenClaimed: false,
      status: APPLY
        ? "GREEN_R583_PROFESSIONAL_SEARCH_SUCCESSOR_DRAFT_NOT_ACTIVE"
        : "GREEN_R583_PROFESSIONAL_SEARCH_DRY_RUN_ROLLED_BACK",
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
