import { createHash } from "node:crypto";
import { readFileSync, renameSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Json = Record<string, unknown>;
type ManifestRow = Json & {
  source_identity_id: string;
  source_corpus: string;
  source_locator: string;
  source_row_sha256: string;
  source_family_id: string;
  source_level: string | null;
  classification: string;
  canonical_work_id: string;
  redirect_target_source_identity_id: string | null;
  semantic_tuple_sha256: string;
  row_sha256: string;
};

const MASTER_SHA256 = "5a9e373f94441c8e39d6f0feff7a2ba8e7773a95d0807aff6c89f6535bde11ee";
const BASE_PATH = "data/estimate-templates/estimate-10000-readiness-manifest.json";
const EXPANDED_PATH = "data/estimate-catalog/expanded-complex/templates.json";
const MANIFEST_PATH = ".release-runtime/r553/catalog/FULL_CATALOG_IDENTITY_MANIFEST.jsonl";
const SEARCH_PATH = ".release-runtime/r553/catalog/FULL_CATALOG_VISIBLE_SEARCH_DOCUMENTS.jsonl";
const BUILD_SUMMARY_PATH = ".release-runtime/r553/catalog/FULL_CATALOG_IDENTITY_SUMMARY.json";
const RECEIPT_PATH = ".release-runtime/r553/evidence/13_R553_FULL_CATALOG_IDENTITY_INDEPENDENT_VALIDATION.json";
const SENTINELS = [
  "асфа", "асфальт", "дорож", "парков", "демонтаж", "бет", "бетон",
  "монолит", "фундамент", "водо", "канал", "труба", "элект", "кабел",
  "щит", "отоп", "вент", "воздух", "кров", "череп", "мембран", "клад",
  "кирпич", "блок", "штукат", "шпакл", "плит", "покрас", "монтаж",
  "ремонт",
] as const;

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const record = value as Json;
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${stable(record[key])}`
  ).join(",")}}`;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function shaObject(value: unknown): string {
  return sha256(stable(value));
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(path), "utf8")) as T;
}

function readJsonl<T>(path: string): T[] {
  return readFileSync(resolve(path), "utf8").split(/\r?\n/u).filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function atomicJson(path: string, value: unknown): void {
  const absolute = resolve(path);
  mkdirSync(dirname(absolute), { recursive: true });
  const temporary = `${absolute}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, absolute);
}

function normalize(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("ru-RU").replace(/ё/gu, "е")
    .replace(/[\p{P}\p{S}_]+/gu, " ").replace(/\s+/gu, " ").trim();
}

function withoutHash(row: ManifestRow): Json {
  const copy: Json = { ...row };
  delete copy.row_sha256;
  return copy;
}

function main(): void {
  const base = readJson<{ templates: Json[] }>(BASE_PATH).templates;
  const expanded = readJson<Json[]>(EXPANDED_PATH);
  const manifest = readJsonl<ManifestRow>(MANIFEST_PATH);
  const search = readJsonl<Json>(SEARCH_PATH);
  const buildSummary = readJson<Json>(BUILD_SUMMARY_PATH);
  const failures: string[] = [];
  const sourceIds = new Set<string>();
  const rowById = new Map<string, ManifestRow>();
  const expectedSourceHashes = new Map<string, string>();

  base.forEach((row, index) => {
    const workKey = String(row.work_key ?? "");
    expectedSourceHashes.set(`base-work:${workKey}`, shaObject(row));
    if (!workKey) failures.push(`base_work_key_missing:${index}`);
  });
  expanded.forEach((row, index) => {
    const templateId = String(row.template_id ?? "");
    expectedSourceHashes.set(`expanded-template:${templateId}`, shaObject(row));
    if (!templateId) failures.push(`expanded_template_id_missing:${index}`);
  });

  for (const row of manifest) {
    if (sourceIds.has(row.source_identity_id)) failures.push(`duplicate_source_identity:${row.source_identity_id}`);
    sourceIds.add(row.source_identity_id);
    rowById.set(row.source_identity_id, row);
    if (expectedSourceHashes.get(row.source_identity_id) !== row.source_row_sha256) {
      failures.push(`source_hash_mismatch:${row.source_identity_id}`);
    }
    if (shaObject(withoutHash(row)) !== row.row_sha256) failures.push(`row_hash_mismatch:${row.source_identity_id}`);
    if (!["CANONICAL_VISIBLE", "REDIRECT_TO_CANONICAL", "TOMBSTONED_NOT_APPLICABLE"].includes(row.classification)) {
      failures.push(`classification_invalid:${row.source_identity_id}:${row.classification}`);
    }
    if (row.source_corpus === "BASE_WORK_CATALOG_10000" && row.classification !== "CANONICAL_VISIBLE") {
      failures.push(`base_not_visible:${row.source_identity_id}`);
    }
    if (row.source_corpus === "EXPANDED_COMPLEX_TEMPLATES_1610") {
      const expected = row.source_level === "PRELIMINARY_BOQ"
        ? "CANONICAL_VISIBLE"
        : "REDIRECT_TO_CANONICAL";
      if (row.classification !== expected) failures.push(`expanded_classification:${row.source_identity_id}`);
    }
  }

  for (const expectedId of expectedSourceHashes.keys()) {
    if (!sourceIds.has(expectedId)) failures.push(`source_identity_missing:${expectedId}`);
  }
  for (const row of manifest.filter((candidate) => candidate.classification === "REDIRECT_TO_CANONICAL")) {
    const target = row.redirect_target_source_identity_id
      ? rowById.get(row.redirect_target_source_identity_id)
      : null;
    if (!target) failures.push(`redirect_target_missing:${row.source_identity_id}`);
    else {
      if (target.classification !== "CANONICAL_VISIBLE") failures.push(`redirect_target_not_visible:${row.source_identity_id}`);
      if (target.canonical_work_id !== row.canonical_work_id) failures.push(`redirect_canonical_mismatch:${row.source_identity_id}`);
      if (target.source_family_id !== row.source_family_id) failures.push(`redirect_family_mismatch:${row.source_identity_id}`);
      if (target.semantic_tuple_sha256 !== row.semantic_tuple_sha256) failures.push(`redirect_semantics_mismatch:${row.source_identity_id}`);
    }
  }

  const visible = manifest.filter((row) => row.classification === "CANONICAL_VISIBLE");
  const redirects = manifest.filter((row) => row.classification === "REDIRECT_TO_CANONICAL");
  const tombstones = manifest.filter((row) => row.classification === "TOMBSTONED_NOT_APPLICABLE");
  const visibleCanonicalIds = new Set(visible.map((row) => row.canonical_work_id));
  if (manifest.length !== 11_610) failures.push(`manifest_count:${manifest.length}`);
  if (sourceIds.size !== 11_610) failures.push(`source_unique:${sourceIds.size}`);
  if (base.length !== 10_000) failures.push(`base_count:${base.length}`);
  if (expanded.length !== 1_610) failures.push(`expanded_count:${expanded.length}`);
  if (visible.length !== 10_322) failures.push(`visible_count:${visible.length}`);
  if (redirects.length !== 1_288) failures.push(`redirect_count:${redirects.length}`);
  if (tombstones.length !== 0) failures.push(`tombstone_count:${tombstones.length}`);
  if (visibleCanonicalIds.size !== visible.length) failures.push(`visible_canonical_duplicate:${visibleCanonicalIds.size}`);
  if (search.length !== visible.length) failures.push(`search_document_count:${search.length}`);
  const searchIds = new Set(search.map((row) => String(row.canonical_work_id)));
  if (searchIds.size !== search.length) failures.push(`search_document_duplicates:${searchIds.size}`);
  for (const id of visibleCanonicalIds) if (!searchIds.has(id)) failures.push(`visible_search_missing:${id}`);
  for (const row of search) {
    if (row.internal_ids_visible !== false) failures.push(`internal_id_visibility:${String(row.canonical_work_id)}`);
    if (!String(row.public_title_ru ?? "").trim()) failures.push(`public_title_missing:${String(row.canonical_work_id)}`);
    if (!String(row.search_text_normalized ?? "").trim()) failures.push(`search_text_missing:${String(row.canonical_work_id)}`);
  }

  const baseTupleSet = new Set(base.map((row) => shaObject({
    title: normalize(String(row.localized_name_ru ?? "")),
    unit_policy_id: row.unit_policy_id,
    category: row.category,
    work_type: row.work_type,
    work_family_id: row.work_family_id,
  })));
  if (baseTupleSet.size !== 10_000) failures.push(`base_semantic_tuple_unique:${baseTupleSet.size}`);

  const sentinel = Object.fromEntries(SENTINELS.map((query) => {
    const queryNormalized = normalize(query);
    const ids = search.filter((row) =>
      String(row.search_text_normalized).includes(queryNormalized)
    ).map((row) => String(row.canonical_work_id));
    if (ids.length === 0) failures.push(`sentinel_zero:${query}`);
    return [query, { count: ids.length, identity_set_sha256: shaObject(ids), sample: ids.slice(0, 5) }];
  }));

  const checks = {
    source_equation: manifest.length === 11_610 && visible.length + redirects.length + tombstones.length === 11_610,
    exact_source_coverage: sourceIds.size === expectedSourceHashes.size && expectedSourceHashes.size === 11_610,
    source_hash_parity: !failures.some((failure) => failure.startsWith("source_hash_mismatch:")),
    per_row_hash_parity: !failures.some((failure) => failure.startsWith("row_hash_mismatch:")),
    base_semantic_tuple_unique: baseTupleSet.size === 10_000,
    expanded_family_owner_rule: !failures.some((failure) => failure.startsWith("expanded_classification:")),
    redirect_targets_total: !failures.some((failure) => failure.startsWith("redirect_")),
    one_visible_search_document_each: search.length === visible.length && searchIds.size === visible.length,
    sentinel_nonzero_all: !failures.some((failure) => failure.startsWith("sentinel_zero:")),
    tombstone_domain_hiding_zero: tombstones.length === 0,
  };
  const green = failures.length === 0 && Object.values(checks).every(Boolean);
  const receiptBase = {
    schema_version: "rik-expo-app-r553.full-catalog-identity-independent-validation.v1",
    master_sha256: MASTER_SHA256,
    generated_utc: new Date().toISOString(),
    status: green
      ? "GREEN_R553_FULL_CATALOG_IDENTITY_MANIFEST_11610_OF_11610"
      : "RED_R553_FULL_CATALOG_IDENTITY_MANIFEST",
    validator_actor: "independent-r553-catalog-identity-validator",
    generator_actor: "r553-catalog-identity-builder",
    actor_separation: true,
    equation: {
      source_total: manifest.length,
      canonical_visible: visible.length,
      redirect_to_canonical: redirects.length,
      tombstoned_not_applicable: tombstones.length,
      classification_sum: visible.length + redirects.length + tombstones.length,
    },
    checks,
    failures,
    sentinel_oracle: sentinel,
    artifacts: {
      manifest: { path: MANIFEST_PATH, bytes: readFileSync(resolve(MANIFEST_PATH)).length, sha256: sha256(readFileSync(resolve(MANIFEST_PATH))) },
      search_documents: { path: SEARCH_PATH, bytes: readFileSync(resolve(SEARCH_PATH)).length, sha256: sha256(readFileSync(resolve(SEARCH_PATH))) },
      build_summary: { path: BUILD_SUMMARY_PATH, sha256: sha256(readFileSync(resolve(BUILD_SUMMARY_PATH))), status: buildSummary.status },
    },
    active_release_changed: false,
    production_accessed: false,
    terminal_catalog_release_green_claimed: false,
  };
  const receipt = { ...receiptBase, payload_sha256: shaObject(receiptBase) };
  atomicJson(RECEIPT_PATH, receipt);
  process.stdout.write(`${JSON.stringify({
    status: receipt.status,
    equation: receipt.equation,
    checks: receipt.checks,
    failures: failures.slice(0, 20),
    payload_sha256: receipt.payload_sha256,
  })}\n`);
  if (!green) process.exitCode = 1;
}

main();
