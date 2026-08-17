import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const SPEC_PATH = resolve(
  "C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (10).md",
);
const SPEC_SHA256 = "4cf42813e8a94816867ec62e63909fe0624a12d6955f598599deb0a92338e318";
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const CANDIDATE_RELEASE_ID = "34a707dc-954c-547d-ba88-27c15dba58d7";
const LAMINATE_CATALOG_ID = "flooring_interior_laminate_install_large_area";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const SEARCH_PACKAGE = resolve(".release-runtime/p0-estimate-truth-remediation-r2/package-a");
const SEARCH_MANIFEST_PATH = join(SEARCH_PACKAGE, "FINAL_SEARCH_INDEX_MANIFEST.json");
const SEARCH_ROOT = join(SEARCH_PACKAGE, "search-index");
const ADJUDICATION_ROOT = resolve(".release-runtime/p0-one-monolith-r58/evidence/08-adjudication");
const ADJUDICATION_PATH = join(ADJUDICATION_ROOT, "CATALOG_ADJUDICATION_LEDGER.jsonl");
const ADJUDICATION_SUMMARY_PATH = join(ADJUDICATION_ROOT, "CATALOG_ADJUDICATION_SUMMARY.json");
const OUTPUT_ROOT = resolve(".release-runtime/p0-one-monolith-r58/evidence/09-search");
const OUTPUT_PATH = join(OUTPUT_ROOT, "R58_ADJUDICATED_SEARCH_CANDIDATE_12270_LAMINATE_SUCCESSOR.json");
const DELTA_PATH = join(OUTPUT_ROOT, "R58_SEARCH_TITLE_ORACLE_BEFORE_AFTER.json");
const REPAIR_QUEUE_PATH = join(OUTPUT_ROOT, "R58_SEARCH_REPAIR_QUEUE.jsonl");
const LAMINATE_PROMOTION_PATH = join(
  ADJUDICATION_ROOT, "R58_LAMINATE_FORWARD_PROMOTION.json",
);
const LAMINATE_BACKEND_LEDGER_PATH = resolve(
  ".release-runtime/p0-one-monolith-r58/evidence/06-backend/BATCH001_008_BACKEND_ADMISSION_4272_PROBE_4059ffd4.jsonl",
);
const LAMINATE_BACKEND_SUMMARY_PATH = resolve(
  ".release-runtime/p0-one-monolith-r58/evidence/06-backend/BATCH001_008_BACKEND_ADMISSION_4272_PROBE_4059ffd4.json",
);
const EXPECTED_ORACLE = Object.freeze({ "ла": 3_523, "ро": 3_293, "со": 1_107, "др": 600 });

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

function stableJson(value: unknown): string {
  return JSON.stringify(stable(value));
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function shaObject(value: unknown): string {
  return sha256(stableJson(value));
}

function deterministicUuid(value: string): string {
  const bytes = Buffer.from(sha256(value).slice(0, 32), "hex");
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function readJsonl(file: string): Json[] {
  return readFileSync(file, "utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Json);
}

function atomicWrite(file: string, contents: string): void {
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  writeFileSync(temporary, contents, "utf8");
  renameSync(temporary, file);
}

function writeJson(file: string, value: unknown): void {
  atomicWrite(file, `${JSON.stringify(value, null, 2)}\n`);
}

function normalize(value: unknown): string {
  return String(value ?? "").normalize("NFC").toLocaleLowerCase("ru")
    .replace(/ё/gu, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function unique(values: unknown[]): string[] {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
}

function visibleName(adjudication: Json): string {
  if (adjudication.source_kind === "EXPANDED_1610") {
    return String(adjudication.source_title_ru).split(" — ")[0].trim();
  }
  return String(adjudication.source_title_ru).trim();
}

function sourceCatalogId(document: Json): string {
  return String(document.source_provenance?.global_ledger_catalog_id ?? "").trim();
}

async function batches<T>(rows: readonly T[], size: number, run: (batch: readonly T[]) => Promise<void>): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += size) await run(rows.slice(offset, offset + size));
}

function oracleCounts(documents: readonly Json[], field: "before" | "after"): Record<string, number> {
  return Object.fromEntries(Object.keys(EXPECTED_ORACLE).map((query) => [query, documents.filter((document) => {
    const value = field === "before" ? String(document.__before_normalized_name) : String(document.normalized_canonical_name);
    return value.includes(query);
  }).length]));
}

async function main(): Promise<void> {
  invariant(sha256(readFileSync(SPEC_PATH)) === SPEC_SHA256, "R58_SEARCH_SPEC_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === EXPECTED_BRANCH, `R58_SEARCH_BRANCH_DRIFT:${branch}`);
  invariant(git(["status", "--porcelain=v1"]) === "", "R58_SEARCH_DIRTY_WORKTREE");
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);

  const manifest = JSON.parse(readFileSync(SEARCH_MANIFEST_PATH, "utf8")) as Json;
  const packageFiles = new Map((manifest.files as Json[]).map((row) => [String(row.file), row]));
  for (const relative of ["search-index/search-documents.jsonl", "search-index/groups.jsonl", "search-index/group-memberships.jsonl", "search-index/typed-relations.jsonl"]) {
    const file = join(SEARCH_PACKAGE, relative);
    const expected = packageFiles.get(relative);
    invariant(expected && statSync(file).size === Number(expected.bytes)
      && sha256(readFileSync(file)) === expected.sha256,
    `R58_SEARCH_PACKAGE_FILE_DRIFT:${relative}`);
  }
  const adjudicationSummary = JSON.parse(readFileSync(ADJUDICATION_SUMMARY_PATH, "utf8")) as Json;
  invariant(adjudicationSummary.status === "GREEN_R58_CATALOG_11610_CLASSIFIED_EFFECTIVE_3355_NOT_TERMINAL",
    "R58_SEARCH_ADJUDICATION_NOT_GREEN");
  const adjudicationContents = readFileSync(ADJUDICATION_PATH, "utf8");
  invariant(sha256(adjudicationContents) === adjudicationSummary.immutableEvidence.ledger.sha256,
    "R58_SEARCH_ADJUDICATION_SHA_DRIFT");
  const adjudications = adjudicationContents.split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Json);
  const adjudicationBySource = new Map(adjudications.map((row) => [String(row.source_catalog_id), row]));
  invariant(adjudications.length === 11_610 && adjudicationBySource.size === 11_610,
    "R58_SEARCH_ADJUDICATION_DENOMINATOR");
  const laminatePromotionContents = readFileSync(LAMINATE_PROMOTION_PATH,"utf8");
  const laminatePromotion = JSON.parse(laminatePromotionContents) as Json;
  const laminateBackendLedgerContents = readFileSync(LAMINATE_BACKEND_LEDGER_PATH,"utf8");
  const laminateBackendLedger = laminateBackendLedgerContents.split(/\r?\n/u).filter(Boolean)
    .map((line) => JSON.parse(line) as Json);
  const laminateBackendSummary = JSON.parse(readFileSync(LAMINATE_BACKEND_SUMMARY_PATH,"utf8")) as Json;
  invariant(laminatePromotion.specSha256 === SPEC_SHA256
    && laminatePromotion.candidateReleaseId === CANDIDATE_RELEASE_ID
    && laminatePromotion.catalogId === LAMINATE_CATALOG_ID
    && laminatePromotion.businessSemanticsUnchanged === true
    && Object.values(laminatePromotion.parity ?? {}).every(Boolean),
  "R58_SEARCH_LAMINATE_PROMOTION_PROOF_RED");
  invariant(laminateBackendLedger.length === 1
    && laminateBackendLedger[0]?.catalogId === LAMINATE_CATALOG_ID
    && laminateBackendLedger[0]?.status === "GREEN"
    && laminateBackendLedger[0]?.history?.immutableParentLink === true
    && laminateBackendLedger[0]?.artifacts?.pdf?.status === "ready"
    && laminateBackendLedger[0]?.artifacts?.procurement?.status === "ready"
    && laminateBackendSummary.status === "GREEN_R58_CUMULATIVE_BACKEND_PROBE_CLEANED",
  "R58_SEARCH_LAMINATE_BACKEND_PROOF_RED");
  const laminatePromotionSha256 = shaObject({
    priorAdjudicationSha256:adjudicationBySource.get(LAMINATE_CATALOG_ID)?.adjudication_sha256,
    promotionEvidenceSha256:sha256(laminatePromotionContents),
    backendLedgerSha256:sha256(laminateBackendLedgerContents),
    backendSummarySha256:sha256(readFileSync(LAMINATE_BACKEND_SUMMARY_PATH)),
  });

  const groups = readJsonl(join(SEARCH_ROOT, "groups.jsonl"));
  const sourceDocuments = readJsonl(join(SEARCH_ROOT, "search-documents.jsonl"));
  const memberships = readJsonl(join(SEARCH_ROOT, "group-memberships.jsonl"));
  const relations = readJsonl(join(SEARCH_ROOT, "typed-relations.jsonl"));
  invariant(sourceDocuments.length === 12_270 && groups.length === 4_318
    && memberships.length === 12_270 && relations.length === 2_236,
  "R58_SEARCH_PACKAGE_COUNTS_DRIFT");
  const globalDocuments = sourceDocuments.filter((row) => row.catalog_origin === "GLOBAL");
  const externalDocuments = sourceDocuments.filter((row) => row.catalog_origin !== "GLOBAL");
  invariant(globalDocuments.length === 11_610 && externalDocuments.length === 660,
    "R58_SEARCH_ORIGIN_COUNTS_DRIFT");
  const sourceToRuntimeCatalog = new Map(globalDocuments.map((document) => [sourceCatalogId(document), String(document.catalog_id)]));
  invariant(sourceToRuntimeCatalog.size === 11_610
    && [...sourceToRuntimeCatalog.keys()].every((sourceId) => adjudicationBySource.has(sourceId)),
  "R58_SEARCH_GLOBAL_SOURCE_CROSSWALK_RED");

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "r58-import-adjudicated-search-12270",
    statement_timeout: 180_000,
  });
  await client.connect();
  let candidateDefinitions: Json[];
  try {
    candidateDefinitions = (await client.query(`
      select m.catalog_id,m.definition_version_id,d.definition_sha256
      from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      where m.release_id=$1 order by m.catalog_id
    `, [CANDIDATE_RELEASE_ID])).rows as Json[];
  } catch (error) {
    await client.end();
    throw error;
  }
  invariant(candidateDefinitions.length === 4_273, "R58_SEARCH_CANDIDATE_DEFINITION_COUNT");
  const definitionByCatalog = new Map(candidateDefinitions.map((row) => [String(row.catalog_id), row]));

  const documents = sourceDocuments.map((sourceDocument) => {
    const beforeName = String(sourceDocument.normalized_canonical_name);
    let adjudicationClass: string;
    let selectable = false;
    let canonicalTargetCatalogId: string | null = null;
    let definitionVersionId: string | null = null;
    let definitionReleaseId: string | null = null;
    let publicationState: string;
    let displayName = String(sourceDocument.canonical_name_ru);
    let shortScopeRu = String(sourceDocument.short_scope_ru);
    let adjudicationSha: string | null = null;
    let sourceId: string | null = null;
    if (sourceDocument.catalog_origin === "GLOBAL") {
      sourceId = sourceCatalogId(sourceDocument);
      const decision = adjudicationBySource.get(sourceId);
      invariant(decision, `R58_SEARCH_DECISION_MISSING:${sourceId}`);
      const laminatePromotionApplied = sourceId === LAMINATE_CATALOG_ID;
      adjudicationClass = laminatePromotionApplied ? "EFFECTIVE_WORK" : String(decision.classification);
      adjudicationSha = laminatePromotionApplied ? laminatePromotionSha256 : String(decision.adjudication_sha256);
      displayName = visibleName(decision);
      if (adjudicationClass === "EFFECTIVE_WORK") {
        selectable = true;
        publicationState = "ADMITTED_BACKEND";
        definitionVersionId = laminatePromotionApplied
          ? String(definitionByCatalog.get(String(sourceDocument.catalog_id))?.definition_version_id ?? "")
          : String(decision.definition_version_id);
        definitionReleaseId = CANDIDATE_RELEASE_ID;
        shortScopeRu = `Расчётная работа: ${displayName}. Исходная смета и уточнение выполняются одним canonical backend.`;
        invariant(definitionByCatalog.get(String(sourceDocument.catalog_id))?.definition_version_id === definitionVersionId,
          `R58_SEARCH_EFFECTIVE_DEFINITION_CROSSWALK:${sourceId}:${sourceDocument.catalog_id}`);
      } else if (adjudicationClass === "DUPLICATE") {
        publicationState = "RETIRED";
        const targetSourceId = String(decision.canonical_target_catalog_id);
        canonicalTargetCatalogId = sourceToRuntimeCatalog.get(targetSourceId) ?? null;
        invariant(canonicalTargetCatalogId, `R58_SEARCH_DUPLICATE_TARGET_MISSING:${sourceId}`);
        definitionVersionId = String(adjudicationBySource.get(targetSourceId)?.definition_version_id ?? "") || null;
        definitionReleaseId = CANDIDATE_RELEASE_ID;
        shortScopeRu = `Прежний уровень сметы перенаправляется на одну работу «${visibleName(adjudicationBySource.get(targetSourceId)!)}»; отдельная стоимость не создаётся.`;
      } else {
        publicationState = "RETIRED";
        shortScopeRu = `Запись изолирована от пользовательского каталога: ${decision.reason_ru}`;
      }
    } else {
      adjudicationClass = "EXTERNAL_REFERENCE";
      publicationState = "PRELIMINARY_NOT_CANONICAL";
      const definition = definitionByCatalog.get(String(sourceDocument.catalog_id));
      definitionVersionId = definition ? String(definition.definition_version_id) : null;
      definitionReleaseId = definition ? CANDIDATE_RELEASE_ID : null;
      shortScopeRu = `Внешняя справочная запись: ${displayName}. Не является selectable профессиональной работой.`;
    }
    const aliases = unique([
      ...(sourceDocument.aliases ?? []),
      sourceDocument.canonical_name_ru,
      sourceId,
      canonicalTargetCatalogId,
    ]).filter((alias) => normalize(alias) !== normalize(displayName));
    const normalizedAliases = unique(aliases.map(normalize));
    const normalizedTerms = unique([
      ...(sourceDocument.normalized_search_terms ?? []),
      normalize(displayName),
      ...normalize(displayName).split(" "),
      ...normalizedAliases,
      ...normalizedAliases.flatMap((alias) => alias.split(" ")),
    ]);
    const body: Json = {
      ...sourceDocument,
      schema_version: "p0-one-monolith-r58-adjudicated-search.v1",
      producer_command: "npx tsx scripts/estimate/p0TruthRemediationR5/importR58AdjudicatedSearchCandidate12270.ts",
      producer_actor: "r58-adjudicated-search-candidate-builder",
      source_head: head,
      source_tree: tree,
      canonical_name_ru: displayName,
      aliases,
      publication_state: publicationState,
      definition_release_id: definitionReleaseId,
      definition_version_id: definitionVersionId,
      adjudication_class: adjudicationClass,
      selectable,
      canonical_target_catalog_id: canonicalTargetCatalogId,
      replacement_catalog_id: canonicalTargetCatalogId,
      short_scope_ru: shortScopeRu,
      normalized_canonical_name: normalize(displayName),
      normalized_aliases: normalizedAliases,
      normalized_search_terms: normalizedTerms,
      normalized_search_blob: normalizedTerms.join("\u001f"),
      source_provenance: {
        ...sourceDocument.source_provenance,
        r58_spec_sha256: SPEC_SHA256,
        r58_adjudication_source_catalog_id: sourceId,
        r58_adjudication_sha256: adjudicationSha,
        r58_candidate_release_id: definitionReleaseId,
        r58_batch009_definition_source: false,
        ...(sourceId === LAMINATE_CATALOG_ID ? {
          r58_forward_promotion_sha256:laminatePromotionSha256,
          r58_prior_adjudication_classification:String(adjudicationBySource.get(sourceId)?.classification),
          r58_forward_adjudication_classification:"EFFECTIVE_WORK",
          r58_backend_gate_status:"GREEN",
        } : {}),
      },
    };
    delete body.document_sha256;
    return {
      ...body,
      document_sha256: shaObject(body),
      __before_normalized_name: beforeName,
    } as Json;
  }).sort((left, right) => String(left.catalog_id).localeCompare(String(right.catalog_id)));
  invariant(new Set(documents.map((row) => row.catalog_id)).size === 12_270,
    "R58_SEARCH_DOCUMENT_ID_DUPLICATE");
  const classCounts = Object.fromEntries([...new Set(documents.map((row) => row.adjudication_class))]
    .sort().map((classification) => [classification, documents.filter((row) => row.adjudication_class === classification).length]));
  invariant(classCounts.EFFECTIVE_WORK === 3_356 && classCounts.DUPLICATE === 400
    && classCounts.QUARANTINED === 7_854 && classCounts.EXTERNAL_REFERENCE === 660,
  `R58_SEARCH_CLASS_COUNTS:${JSON.stringify(classCounts)}`);
  invariant(documents.filter((row) => row.selectable).length === 3_356
    && documents.filter((row) => row.selectable && !row.definition_version_id).length === 0,
  "R58_SEARCH_SELECTABLE_GATE_RED");
  invariant(documents.filter((row) => row.adjudication_class === "DUPLICATE" && !row.canonical_target_catalog_id).length === 0,
    "R58_SEARCH_DUPLICATE_REDIRECT_RED");

  const beforeOracle = oracleCounts(documents, "before");
  invariant(Object.entries(EXPECTED_ORACLE).every(([query, expected]) => beforeOracle[query] === expected),
    `R58_SEARCH_FROZEN_ORACLE_INPUT_DRIFT:${JSON.stringify(beforeOracle)}`);
  const afterOracle = oracleCounts(documents, "after");
  const oracleDelta = Object.fromEntries(Object.keys(EXPECTED_ORACLE).map((query) => [query, {
    before: beforeOracle[query],
    after: afterOracle[query],
    delta: afterOracle[query] - beforeOracle[query],
    reason: "R58 Russian display-name normalization for adjudicated global records; source identity retained in aliases/provenance",
  }]));
  const snapshotSha256 = shaObject({
    specSha256: SPEC_SHA256,
    adjudicationSha256: adjudicationSummary.immutableEvidence.ledger.sha256,
    laminatePromotionSha256,
    documents: documents.map((row) => row.document_sha256),
    groups: groups.map((row) => row.group_sha256),
    memberships: memberships.map((row) => row.independent_disposition),
    relations: relations.map((row) => row.relation_sha256),
  });
  const searchReleaseId = deterministicUuid(`r58-search:${snapshotSha256}`);
  const searchReleaseKey = `p0-r58-adjudicated-search-${snapshotSha256.slice(0, 16)}`;

  const importedDocuments = documents.map(({ __before_normalized_name: _before, ...row }) => row);
  let idempotent = false;
  try {
    await client.query("begin");
    await client.query("set local lock_timeout='5s'");
    const existingAdjudication = Number((await client.query(
      "select count(*)::int count from public.estimate_catalog_adjudication_r58",
    )).rows[0].count);
    if (existingAdjudication === 0) {
      await batches(adjudications, 200, async (batch) => {
        await client.query(`insert into public.estimate_catalog_adjudication_r58(
          source_catalog_id,source_title_ru,source_group_id,classification,reason_code,reason_ru,
          evidence_refs,canonical_target_catalog_id,historical_revision_policy,search_visibility,
          selectable,definition_version_id,before_fingerprint,after_fingerprint,reviewer_verdict,
          reviewed_at,source_kind,source_status,source_family_id,source_level,legacy_runtime_catalog_id,
          legacy_definition_version_id,source_content_changed,eligibility_proof,adjudication_sha256
        ) select x.source_catalog_id,x.source_title_ru,x.source_group_id,x.classification,x.reason_code,x.reason_ru,
          x.evidence_refs,x.canonical_target_catalog_id,x.historical_revision_policy,x.search_visibility,
          x.selectable,x.definition_version_id,x.before_fingerprint,x.after_fingerprint,x.reviewer_verdict,
          x.reviewed_at,x.source_kind,x.source_status,x.source_family_id,x.source_level,x.legacy_runtime_catalog_id,
          x.legacy_definition_version_id,x.source_content_changed,x.eligibility_proof,x.adjudication_sha256
        from jsonb_to_recordset($1::jsonb) as x(
          source_catalog_id text,source_title_ru text,source_group_id text,classification text,
          reason_code text,reason_ru text,evidence_refs jsonb,canonical_target_catalog_id text,
          historical_revision_policy text,search_visibility text,selectable boolean,definition_version_id uuid,
          before_fingerprint text,after_fingerprint text,reviewer_verdict jsonb,reviewed_at timestamptz,
          source_kind text,source_status text,source_family_id text,source_level text,
          legacy_runtime_catalog_id text,legacy_definition_version_id uuid,source_content_changed boolean,
          eligibility_proof jsonb,adjudication_sha256 text
        )`, [JSON.stringify(batch)]);
      });
    } else {
      invariant(existingAdjudication === 11_610, `R58_SEARCH_EXISTING_ADJUDICATION_COUNT:${existingAdjudication}`);
      const existingHashSet = (await client.query(
        "select encode(extensions.digest(convert_to(string_agg(adjudication_sha256,E'\\n' order by source_catalog_id),'UTF8'),'sha256'),'hex') hash from public.estimate_catalog_adjudication_r58",
      )).rows[0].hash;
      const expectedHashSet = sha256(`${adjudications.map((row) => row.adjudication_sha256).join("\n")}\n`);
      invariant(existingHashSet === expectedHashSet, "R58_SEARCH_EXISTING_ADJUDICATION_HASH_DRIFT");
    }

    const existingRelease = (await client.query(
      "select * from public.estimate_search_index_release where id=$1 or release_key=$2",
      [searchReleaseId, searchReleaseKey],
    )).rows[0] as Json | undefined;
    if (!existingRelease) {
      await client.query(`insert into public.estimate_search_index_release(
        id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,
        source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata
      ) values($1,$2,'draft',$3,$4,$5,$6,$7,$8,11610,660,0,$9::jsonb)`, [
        searchReleaseId,
        searchReleaseKey,
        "estimate-search-taxonomy-r58-adjudicated.v1",
        "estimate-search-group-relation-r58.v1",
        "estimate-search-ranking-r58-any-all-phrase.v1",
        head,
        tree,
        snapshotSha256,
        JSON.stringify({
          specSha256: SPEC_SHA256,
          definitionReleaseId: CANDIDATE_RELEASE_ID,
          adjudicationLedgerSha256: adjudicationSummary.immutableEvidence.ledger.sha256,
          classifications: classCounts,
          effectiveWork: 3_356,
          laminatePromotionSha256,
          batch009Active: false,
          stagingOnly: true,
          runtime8081Switched: false,
        }),
      ]);
      await batches(groups, 200, async (batch) => {
        await client.query(`insert into public.estimate_search_group(
          search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
          work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
        ) select $1,x.group_id,x.group_name_ru,x.domain_id,x.system_id,x.subsystem_id,x.assembly_id,
          x.work_family_id,x.breadcrumb,x.member_count,x.member_set_sha256,x.oracle_disposition
        from jsonb_to_recordset($2::jsonb) as x(
          group_id text,group_name_ru text,domain_id text,system_id text,subsystem_id text,
          assembly_id text,work_family_id text,breadcrumb jsonb,member_count integer,
          member_set_sha256 text,oracle_disposition jsonb
        )`, [searchReleaseId, JSON.stringify(batch)]);
      });
      await batches(importedDocuments, 120, async (batch) => {
        await client.query(`insert into public.estimate_search_document(
          search_release_id,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
          group_id,subgroup_id,element_type,operation_kind,technology_variant,construction_state,
          primary_uom,canonical_name_ru,aliases,normative_classifiers,applicability_tags,
          publication_state,catalog_origin,definition_release_id,short_scope_ru,
          key_distinguishing_parameters,required_inputs_count,clarification_fields,
          included_boundaries,excluded_boundaries,replacement_catalog_id,normalized_catalog_id,
          normalized_canonical_name,normalized_aliases,normalized_search_terms,normalized_search_blob,
          source_provenance,document_sha256,adjudication_class,selectable,canonical_target_catalog_id,
          definition_version_id
        ) select $1,x.catalog_id,x.domain_id,x.system_id,x.subsystem_id,x.assembly_id,x.work_family_id,
          x.group_id,x.subgroup_id,x.element_type,x.operation_kind,x.technology_variant,x.construction_state,
          x.primary_uom,x.canonical_name_ru,x.aliases,x.normative_classifiers,x.applicability_tags,
          x.publication_state,x.catalog_origin,x.definition_release_id,x.short_scope_ru,
          x.key_distinguishing_parameters,x.required_inputs_count,x.clarification_fields,
          x.included_boundaries,x.excluded_boundaries,x.replacement_catalog_id,x.normalized_catalog_id,
          x.normalized_canonical_name,x.normalized_aliases,x.normalized_search_terms,x.normalized_search_blob,
          x.source_provenance,x.document_sha256,x.adjudication_class,x.selectable,x.canonical_target_catalog_id,
          x.definition_version_id
        from jsonb_to_recordset($2::jsonb) as x(
          catalog_id text,domain_id text,system_id text,subsystem_id text,assembly_id text,
          work_family_id text,group_id text,subgroup_id text,element_type text,operation_kind text,
          technology_variant text,construction_state text,primary_uom text,canonical_name_ru text,
          aliases text[],normative_classifiers text[],applicability_tags text[],publication_state text,
          catalog_origin text,definition_release_id uuid,short_scope_ru text,key_distinguishing_parameters jsonb,
          required_inputs_count integer,clarification_fields jsonb,included_boundaries jsonb,
          excluded_boundaries jsonb,replacement_catalog_id text,normalized_catalog_id text,
          normalized_canonical_name text,normalized_aliases text[],normalized_search_terms text[],
          normalized_search_blob text,source_provenance jsonb,document_sha256 text,
          adjudication_class text,selectable boolean,canonical_target_catalog_id text,definition_version_id uuid
        )`, [searchReleaseId, JSON.stringify(batch)]);
      });
      await batches(memberships, 250, async (batch) => {
        await client.query(`insert into public.estimate_search_group_membership(
          search_release_id,group_id,catalog_id,ordinal,independent_disposition
        ) select $1,x.group_id,x.catalog_id,x.ordinal,x.independent_disposition
        from jsonb_to_recordset($2::jsonb) as x(
          group_id text,catalog_id text,ordinal integer,independent_disposition jsonb
        )`, [searchReleaseId, JSON.stringify(batch)]);
      });
      await batches(relations, 250, async (batch) => {
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
        )`, [searchReleaseId, JSON.stringify(batch)]);
      });
    } else {
      invariant(existingRelease.status === "draft" && existingRelease.snapshot_sha256 === snapshotSha256,
        "R58_SEARCH_EXISTING_RELEASE_DRIFT");
      idempotent = true;
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    await client.end().catch(() => undefined);
    throw error;
  }

  const observed = (await client.query(`select
    (select count(*)::int from public.estimate_catalog_adjudication_r58) adjudications,
    (select count(*)::int from public.estimate_search_document where search_release_id=$1) documents,
    (select count(*)::int from public.estimate_search_group where search_release_id=$1) groups,
    (select count(*)::int from public.estimate_search_group_membership where search_release_id=$1) memberships,
    (select count(*)::int from public.estimate_search_typed_relation where search_release_id=$1) relations,
    (select count(*)::int from public.estimate_search_document where search_release_id=$1 and selectable) selectable,
    (select count(*)::int from public.estimate_search_document where search_release_id=$1 and adjudication_class='DUPLICATE' and canonical_target_catalog_id is null) orphan_redirects,
    (select count(*)::int from public.estimate_search_document where search_release_id=$1 and selectable and (definition_version_id is null or definition_release_id<>$2)) selectable_without_definition,
    (select count(*)::int from public.estimate_search_index_release where status='active') active_search_releases
  `, [searchReleaseId, CANDIDATE_RELEASE_ID])).rows[0] as Json;
  await client.end();
  invariant(observed.adjudications === 11_610 && observed.documents === 12_270
    && observed.groups === 4_318 && observed.memberships === 12_270 && observed.relations === 2_236
    && observed.selectable === 3_356 && observed.orphan_redirects === 0
    && observed.selectable_without_definition === 0 && observed.active_search_releases === 0,
  `R58_SEARCH_IMPORT_OBSERVED_RED:${JSON.stringify(observed)}`);

  writeJson(DELTA_PATH, {
    schemaVersion: "p0-one-monolith-r58-search-title-oracle-before-after.v1",
    specSha256: SPEC_SHA256,
    sourcePackageSnapshotSha256: manifest.manifest_sha256,
    candidateSnapshotSha256: snapshotSha256,
    frozenBefore: beforeOracle,
    adjudicatedAfterFullCorpus: afterOracle,
    delta: oracleDelta,
    sourceRowsRemoved: 0,
    sourceRowsAdded: 0,
    classificationsChanged: 11_610,
    status: "GREEN_EXPLAINED_DISPLAY_AND_ADJUDICATION_DELTA",
  });
  atomicWrite(REPAIR_QUEUE_PATH, "");
  const evidence = {
    schemaVersion: "p0-one-monolith-r58-adjudicated-search-candidate-12270.v1",
    capturedAt: new Date().toISOString(),
    specSha256: SPEC_SHA256,
    source: { branch, head, tree, descendantOf691acb78: true },
    database: new URL(DATABASE_URL).pathname.replace(/^\//u, ""),
    searchRelease: {
      id: searchReleaseId,
      key: searchReleaseKey,
      status: "draft",
      snapshotSha256,
      definitionReleaseId: CANDIDATE_RELEASE_ID,
    },
    observed,
    classifications: classCounts,
    frozenBeforeOracle: beforeOracle,
    adjudicatedAfterFullCorpusOracle: afterOracle,
    titleOracleDeltaPath: DELTA_PATH,
    idempotent,
    activeSearchReleaseSwitched: false,
    activeDefinitionReleaseSwitched: false,
    runtime8081Switched: false,
    terminalGreenClaimed: false,
    status: "GREEN_R58_ADJUDICATED_SEARCH_CANDIDATE_12270_DRAFT_NOT_ACTIVE",
  };
  writeJson(OUTPUT_PATH, evidence);
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
