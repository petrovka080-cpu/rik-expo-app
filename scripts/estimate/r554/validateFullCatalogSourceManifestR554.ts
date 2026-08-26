import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  PUBLIC_RUSSIAN_LEXICON_VERSION_R555,
  resolveExpandedPublicRussianIdentityR555,
} from "../../../src/lib/estimate/publicRussianLexiconR555";

type Json = Record<string, unknown>;
type ManifestRow = Json & {
  source_identity_id: string;
  source_corpus: string;
  source_row_sha256: string;
  source_family_id: string;
  classification: string;
  canonical_work_id: string;
  redirect_target_source_identity_id: string | null;
  source_group: string;
  source_uom_ru: string;
  source_uom_policy: string;
  parameter_schema_sha256: string;
  formula_resource_sha256: string;
  review_status: string;
  public_title_ru: string;
  public_aliases: string[];
  public_russian_lexicon_version?: string | null;
  row_sha256: string;
};

const R555_MODE = process.env.R555_FULL_CATALOG_MANIFEST === "true";
const R555_CONTENT_SUCCESSOR = process.env.R555_PUBLIC_RUSSIAN_CONTENT_SUCCESSOR === "true";
if (R555_CONTENT_SUCCESSOR && !R555_MODE) throw new Error("R555_PUBLIC_RUSSIAN_CONTENT_SUCCESSOR_REQUIRES_R555_MODE");
const RUN_ID = R555_MODE ? "r555" : "r554";
const RUN_LABEL = RUN_ID.toUpperCase();
const MASTER_SHA256 = R555_MODE
  ? "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007"
  : "a875aa334eba28d4b7c654a05b3d19d21cb508a87015bbffcfd4f3d81805aa0b";
const R555_MASTER_PATH = "C:/Users/User/Downloads/MASTER_TZ_R5_5_5_PRODUCTION_GRADE_SINGLE_CANONICAL_MATERIAL_FIRST_CLEAR_RUSSIAN_NAMES_FULL_CATALOG_ASPHALT_WEB_ANDROID_50_PER_GROUP_GLOBAL_GREEN_RU.md";
const BASE_PATH = "data/estimate-templates/estimate-10000-readiness-manifest.json";
const EXPANDED_PATH = "data/estimate-catalog/expanded-complex/templates.json";
const FAMILY_PATH = "data/estimate-catalog/expanded-complex/work-families.json";
const OUTPUT_ROOT = R555_CONTENT_SUCCESSOR
  ? ".release-runtime/r555/catalog-russian-v1"
  : `.release-runtime/${RUN_ID}/catalog`;
const MANIFEST_PATH = `${OUTPUT_ROOT}/FULL_CATALOG_SOURCE_MANIFEST.jsonl`;
const SEARCH_PATH = `${OUTPUT_ROOT}/FULL_CATALOG_VISIBLE_SEARCH_DOCUMENTS.jsonl`;
const SUMMARY_PATH = `${OUTPUT_ROOT}/FULL_CATALOG_SOURCE_MANIFEST_SUMMARY.json`;
const RECEIPT_PATH = R555_MODE
  ? R555_CONTENT_SUCCESSOR
    ? ".release-runtime/r555/evidence/16A_R555_PUBLIC_RUSSIAN_CATALOG_SUCCESSOR_VALIDATION.json"
    : ".release-runtime/r555/evidence/16_R555_FULL_CATALOG_SOURCE_MANIFEST_INDEPENDENT_VALIDATION.json"
  : ".release-runtime/r554/evidence/08_R554_FULL_CATALOG_SOURCE_MANIFEST_INDEPENDENT_VALIDATION.json";
const SENTINELS = [
  "асфа", "асфальт", "дорож", "парков", "демонтаж", "бет", "бетон", "монолит", "фундамент",
  "водо", "канал", "труба", "элект", "кабел", "щит", "отоп", "вент", "воздух", "кров",
  "череп", "мембран", "клад", "кирпич", "блок", "штукат", "шпакл", "плит", "покрас",
  "монтаж", "ремонт",
] as const;

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Json;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
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
  return readFileSync(resolve(path), "utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as T);
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

function without(row: Json, key: string): Json {
  const copy = { ...row };
  delete copy[key];
  return copy;
}

function containsForbiddenPublicEnglish(value: string): boolean {
  return /[A-Za-z]{2,}/u.test(value.replace(/ВВГнг-LS/gu, ""));
}

function baseParameterSource(row: Json): Json {
  return { parameter_schema_id: row.parameter_schema_id, parameter_schema_status: row.parameter_schema_status };
}

function baseFormulaResourceSource(row: Json): Json {
  return {
    calculator_family_id: row.calculator_family_id,
    formula_status: row.formula_status,
    material_recipe_id: row.material_recipe_id,
    material_recipe_status: row.material_recipe_status,
    labor_recipe_id: row.labor_recipe_id,
    labor_recipe_status: row.labor_recipe_status,
    service_recipe_id: row.service_recipe_id,
    equipment_recipe_id: row.equipment_recipe_id,
    norm_pack_id: row.norm_pack_id,
    norm_version: row.norm_version,
    norm_source_status: row.norm_source_status,
    price_policy_id: row.price_policy_id,
    price_source_status: row.price_source_status,
    row_count: row.row_count,
    source_backed_row_count: row.source_backed_row_count,
  };
}

function expandedFormulaResourceSource(family: Json): Json {
  return {
    calculator_id: family.calculatorId,
    formula_family: family.formulaFamily,
    material_recipe: family.materialRecipe,
    labor_recipe: family.laborRecipe,
    equipment_recipe: family.equipmentRecipe,
    service_recipe: family.serviceRecipe,
    norm_source: family.normSource,
    price_policy: family.pricePolicy,
  };
}

function main(): void {
  if (R555_MODE && sha256(readFileSync(R555_MASTER_PATH)) !== MASTER_SHA256) throw new Error("R555_MASTER_SHA256_DRIFT");
  const base = readJson<{ templates: Json[] }>(BASE_PATH).templates;
  const expanded = readJson<Json[]>(EXPANDED_PATH);
  const families = readJson<Json[]>(FAMILY_PATH);
  const familyById = new Map(families.map((row) => [String(row.work_family_id), row]));
  const baseById = new Map(base.map((row) => [`base-work:${String(row.work_key)}`, row]));
  const expandedById = new Map(expanded.map((row) => [`expanded-template:${String(row.template_id)}`, row]));
  const expectedSourceHashes = new Map<string, string>();
  base.forEach((row) => expectedSourceHashes.set(`base-work:${String(row.work_key)}`, shaObject(row)));
  expanded.forEach((row) => expectedSourceHashes.set(`expanded-template:${String(row.template_id)}`, shaObject(row)));

  const manifest = readJsonl<ManifestRow>(MANIFEST_PATH);
  const search = readJsonl<Json>(SEARCH_PATH);
  const summary = readJson<Json>(SUMMARY_PATH);
  const failures: string[] = [];
  const byId = new Map(manifest.map((row) => [row.source_identity_id, row]));
  const visible = manifest.filter((row) => row.classification === "CANONICAL_VISIBLE");
  const redirects = manifest.filter((row) => row.classification === "REDIRECT_TO_CANONICAL");
  const tombstones = manifest.filter((row) => row.classification === "TOMBSTONED_NOT_APPLICABLE");

  if (manifest.length !== 11_610 || expectedSourceHashes.size !== 11_610 || byId.size !== 11_610) failures.push("SOURCE_EQUATION_OR_UNIQUENESS_RED");
  if (visible.length !== 10_322 || redirects.length !== 1_288 || tombstones.length !== 0) failures.push("DISPOSITION_EQUATION_RED");
  const missing = [...expectedSourceHashes.keys()].filter((id) => !byId.has(id));
  const extra = [...byId.keys()].filter((id) => !expectedSourceHashes.has(id));
  if (missing.length || extra.length) failures.push(`SOURCE_COVERAGE_RED:missing=${missing.length}:extra=${extra.length}`);

  let sourceHashFailures = 0;
  let rowHashFailures = 0;
  let requiredFieldFailures = 0;
  let graphHashFailures = 0;
  let publicRussianIdentityFailures = 0;
  let forbiddenPublicEnglishFailures = 0;
  for (const row of manifest) {
    if (expectedSourceHashes.get(row.source_identity_id) !== row.source_row_sha256) sourceHashFailures += 1;
    if (shaObject(without(row, "row_sha256")) !== row.row_sha256) rowHashFailures += 1;
    if (!row.source_group || !row.source_uom_ru || !row.source_uom_policy || !/^[0-9a-f]{64}$/u.test(row.parameter_schema_sha256)
      || !/^[0-9a-f]{64}$/u.test(row.formula_resource_sha256) || row.review_status !== `DETERMINISTIC_${RUN_LABEL}_IDENTITY_REVIEW_ACCEPTED`) {
      requiredFieldFailures += 1;
    }
    const isBase = row.source_corpus === "BASE_WORK_CATALOG_10000";
    const raw = isBase ? baseById.get(row.source_identity_id) : expandedById.get(row.source_identity_id);
    const family = isBase ? null : familyById.get(row.source_family_id);
    if (!raw || (!isBase && !family)) {
      graphHashFailures += 1;
      continue;
    }
    const expectedParameter = isBase ? baseParameterSource(raw) : { parameter_schema: family!.parameterSchema };
    const expectedGraph = isBase ? baseFormulaResourceSource(raw) : expandedFormulaResourceSource(family!);
    if (shaObject(expectedParameter) !== row.parameter_schema_sha256 || shaObject(expectedGraph) !== row.formula_resource_sha256) {
      graphHashFailures += 1;
    }
    if (R555_CONTENT_SUCCESSOR && !isBase) {
      const identity = resolveExpandedPublicRussianIdentityR555(family!);
      if (row.public_title_ru !== identity.titleRu
        || stable(row.public_aliases) !== stable(identity.aliasesRu)
        || row.public_russian_lexicon_version !== PUBLIC_RUSSIAN_LEXICON_VERSION_R555) {
        publicRussianIdentityFailures += 1;
      }
    }
    if (R555_CONTENT_SUCCESSOR
      && [row.public_title_ru, ...row.public_aliases].some(containsForbiddenPublicEnglish)) {
      forbiddenPublicEnglishFailures += 1;
    }
  }
  if (sourceHashFailures) failures.push(`SOURCE_HASH_RED:${sourceHashFailures}`);
  if (rowHashFailures) failures.push(`ROW_HASH_RED:${rowHashFailures}`);
  if (requiredFieldFailures) failures.push(`REQUIRED_FIELDS_RED:${requiredFieldFailures}`);
  if (graphHashFailures) failures.push(`PARAMETER_FORMULA_RESOURCE_HASH_RED:${graphHashFailures}`);
  if (publicRussianIdentityFailures) failures.push(`PUBLIC_RUSSIAN_IDENTITY_RED:${publicRussianIdentityFailures}`);
  if (forbiddenPublicEnglishFailures) failures.push(`FORBIDDEN_PUBLIC_ENGLISH_RED:${forbiddenPublicEnglishFailures}`);

  let redirectFailures = 0;
  for (const row of redirects) {
    const target = row.redirect_target_source_identity_id ? byId.get(row.redirect_target_source_identity_id) : undefined;
    if (!target || target.classification !== "CANONICAL_VISIBLE" || target.canonical_work_id !== row.canonical_work_id
      || target.source_family_id !== row.source_family_id || target.redirect_target_source_identity_id !== null) {
      redirectFailures += 1;
    }
  }
  if (redirectFailures) failures.push(`REDIRECT_REVIEW_RED:${redirectFailures}`);
  if (new Set(visible.map((row) => row.canonical_work_id)).size !== visible.length) failures.push("DUPLICATE_VISIBLE_SEMANTIC_OWNER_RED");

  const searchByOwner = new Map(search.map((row) => [String(row.owner_source_identity_id), row]));
  if (search.length !== visible.length || searchByOwner.size !== visible.length) failures.push("SEARCH_CARDINALITY_RED");
  let searchFailures = 0;
  for (const row of visible) {
    const document = searchByOwner.get(row.source_identity_id);
    if (!document || document.canonical_work_id !== row.canonical_work_id || document.source_uom_ru !== row.source_uom_ru
      || document.parameter_schema_sha256 !== row.parameter_schema_sha256 || document.formula_resource_sha256 !== row.formula_resource_sha256
      || document.public_title_ru !== row.public_title_ru || stable(document.public_aliases) !== stable(row.public_aliases)
      || document.search_text_normalized !== normalize([row.public_title_ru, ...row.public_aliases].join(" "))
      || shaObject(without(document, "document_sha256")) !== document.document_sha256) searchFailures += 1;
  }
  if (searchFailures) failures.push(`SEARCH_BIJECTION_RED:${searchFailures}`);

  const sentinel = Object.fromEntries(SENTINELS.map((query) => {
    const normalized = normalize(query);
    const identities = search.filter((row) => String(row.search_text_normalized).includes(normalized))
      .map((row) => String(row.canonical_work_id));
    if (identities.length === 0) failures.push(`SENTINEL_ZERO:${query}`);
    return [query, { count: identities.length, identity_set_sha256: shaObject(identities), sample: identities.slice(0, 5) }];
  }));
  if (summary.master_sha256 !== MASTER_SHA256 || summary.pending_review !== 0) failures.push("SUMMARY_MASTER_OR_PENDING_RED");

  const checks = {
    exact_source_coverage: missing.length === 0 && extra.length === 0,
    source_hash_parity: sourceHashFailures === 0,
    per_row_hash_parity: rowHashFailures === 0,
    required_manifest_fields: requiredFieldFailures === 0,
    parameter_formula_resource_hash_parity: graphHashFailures === 0,
    full_redirect_review: redirectFailures === 0 && redirects.length === 1_288,
    tombstone_zero: tombstones.length === 0,
    duplicate_visible_semantic_owner_zero: new Set(visible.map((row) => row.canonical_work_id)).size === visible.length,
    one_search_document_per_visible: searchFailures === 0 && search.length === visible.length,
    sentinel_nonzero_all: Object.values(sentinel).every((value) => value.count > 0),
    pending_review_zero: summary.pending_review === 0,
    public_russian_identity_exact: !R555_CONTENT_SUCCESSOR || publicRussianIdentityFailures === 0,
    forbidden_public_english_zero: !R555_CONTENT_SUCCESSOR || forbiddenPublicEnglishFailures === 0,
  };
  const green = failures.length === 0 && Object.values(checks).every(Boolean);
  const receiptBase = {
    schema_version: `rik-expo-app-${RUN_ID}.full-catalog-source-independent-validation.v1`,
    generated_utc: new Date().toISOString(),
    master_sha256: MASTER_SHA256,
    status: green ? `GREEN_${RUN_LABEL}_FULL_CATALOG_SOURCE_AND_DISPOSITION_11610_OF_11610` : `RED_${RUN_LABEL}_FULL_CATALOG_SOURCE_AND_DISPOSITION`,
    validator_actor: `independent-${RUN_ID}-full-catalog-source-validator`,
    equation: {
      source_total: manifest.length,
      canonical_visible: visible.length,
      redirect_to_canonical: redirects.length,
      tombstoned_not_applicable: tombstones.length,
      pending_review: Number(summary.pending_review ?? -1),
      classification_sum: visible.length + redirects.length + tombstones.length,
    },
    checks,
    failures,
    sentinel_oracle: sentinel,
    artifacts: {
      manifest: { path: MANIFEST_PATH, bytes: readFileSync(resolve(MANIFEST_PATH)).length, sha256: sha256(readFileSync(resolve(MANIFEST_PATH))) },
      search_documents: { path: SEARCH_PATH, bytes: readFileSync(resolve(SEARCH_PATH)).length, sha256: sha256(readFileSync(resolve(SEARCH_PATH))) },
      summary: { path: SUMMARY_PATH, bytes: readFileSync(resolve(SUMMARY_PATH)).length, sha256: sha256(readFileSync(resolve(SUMMARY_PATH))) },
    },
    active_release_changed: false,
    technology_passports_green_claimed: false,
    production_accessed: false,
  };
  const receipt = { ...receiptBase, payload_sha256: shaObject(receiptBase) };
  atomicJson(RECEIPT_PATH, receipt);
  process.stdout.write(`${JSON.stringify({ status: receipt.status, equation: receipt.equation, checks, failures, payload_sha256: receipt.payload_sha256 })}\n`);
  if (!green) process.exitCode = 1;
}

main();
