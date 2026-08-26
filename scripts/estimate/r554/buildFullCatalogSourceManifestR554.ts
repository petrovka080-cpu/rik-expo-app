import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  PUBLIC_RUSSIAN_LEXICON_VERSION_R555,
  resolveBasePublicRussianTitleR555,
  resolveExpandedPublicRussianIdentityR555,
} from "../../../src/lib/estimate/publicRussianLexiconR555";

type Json = Record<string, unknown>;
type SourceRow = Json & {
  source_identity_id: string;
  source_corpus: string;
  source_row_sha256: string;
  source_family_id: string;
  source_domain: string;
  classification: "CANONICAL_VISIBLE" | "REDIRECT_TO_CANONICAL" | "TOMBSTONED_NOT_APPLICABLE";
  canonical_work_id: string;
  redirect_target_source_identity_id: string | null;
  public_title_ru: string;
  public_aliases: string[];
  semantic_tuple_sha256: string;
  predecessor_r58: Json;
  preliminary_definition_seed: Json;
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
const PREDECESSOR_MASTER_SHA256 = R555_MODE
  ? "a875aa334eba28d4b7c654a05b3d19d21cb508a87015bbffcfd4f3d81805aa0b"
  : "5a9e373f94441c8e39d6f0feff7a2ba8e7773a95d0807aff6c89f6535bde11ee";
const BASE_PATH = "data/estimate-templates/estimate-10000-readiness-manifest.json";
const EXPANDED_PATH = "data/estimate-catalog/expanded-complex/templates.json";
const FAMILY_PATH = "data/estimate-catalog/expanded-complex/work-families.json";
const PREDECESSOR_MANIFEST = R555_MODE
  ? ".release-runtime/r554/catalog/FULL_CATALOG_SOURCE_MANIFEST.jsonl"
  : ".release-runtime/r553/catalog/FULL_CATALOG_IDENTITY_MANIFEST.jsonl";
const PREDECESSOR_SEARCH = R555_MODE
  ? ".release-runtime/r554/catalog/FULL_CATALOG_VISIBLE_SEARCH_DOCUMENTS.jsonl"
  : ".release-runtime/r553/catalog/FULL_CATALOG_VISIBLE_SEARCH_DOCUMENTS.jsonl";
const OUTPUT_ROOT = R555_CONTENT_SUCCESSOR
  ? ".release-runtime/r555/catalog-russian-v1"
  : `.release-runtime/${RUN_ID}/catalog`;
const MANIFEST_PATH = `${OUTPUT_ROOT}/FULL_CATALOG_SOURCE_MANIFEST.jsonl`;
const SEARCH_PATH = `${OUTPUT_ROOT}/FULL_CATALOG_VISIBLE_SEARCH_DOCUMENTS.jsonl`;
const SUMMARY_PATH = `${OUTPUT_ROOT}/FULL_CATALOG_SOURCE_MANIFEST_SUMMARY.json`;
const RECEIPT_PATH = R555_MODE
  ? R555_CONTENT_SUCCESSOR
    ? ".release-runtime/r555/evidence/15A_R555_PUBLIC_RUSSIAN_CATALOG_SUCCESSOR_BUILD.json"
    : ".release-runtime/r555/evidence/15_R555_FULL_CATALOG_SOURCE_MANIFEST_BUILD.json"
  : ".release-runtime/r554/evidence/07_R554_FULL_CATALOG_SOURCE_MANIFEST_BUILD.json";
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

function atomic(path: string, text: string): void {
  const absolute = resolve(path);
  mkdirSync(dirname(absolute), { recursive: true });
  const temporary = `${absolute}.${process.pid}.tmp`;
  writeFileSync(temporary, text, "utf8");
  renameSync(temporary, absolute);
}

function writeJson(path: string, value: unknown): void {
  atomic(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeJsonl(path: string, rows: unknown[]): void {
  atomic(path, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function normalize(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("ru-RU").replace(/ё/gu, "е")
    .replace(/[\p{P}\p{S}_]+/gu, " ").replace(/\s+/gu, " ").trim();
}

function baseUnitRu(unitPolicyId: string): string {
  const code = unitPolicyId.match(/_(m2|m3|kg|ton|linear_m|piece|set|point|hour|day)_v\d+$/iu)?.[1] ?? "";
  return ({ m2: "м²", m3: "м³", kg: "кг", ton: "т", linear_m: "м", piece: "шт.", set: "компл.", point: "точка", hour: "ч", day: "дн." } as Record<string, string>)[code] ?? "ед. по технологическому паспорту";
}

function expandedUnitRu(family: Json): string {
  const schema = Array.isArray(family.parameterSchema) ? family.parameterSchema as Json[] : [];
  const keys = new Set(schema.filter((row) => Array.isArray(row.requiredFor) && row.requiredFor.includes("PRELIMINARY_BOQ"))
    .map((row) => String(row.key ?? "")));
  if (keys.has("area_m2") || (keys.has("length_m") && keys.has("width_m"))) return "м²";
  if (keys.has("volume_m3") || (keys.has("length_m") && keys.has("width_m") && keys.has("height_m"))) return "м³";
  if (keys.has("length_m")) return "м";
  if ([...keys].some((key) => /count|quantity|units/iu.test(key))) return "шт.";
  return "ед. по технологическому паспорту";
}

function baseParameterSource(row: Json): Json {
  return {
    parameter_schema_id: row.parameter_schema_id,
    parameter_schema_status: row.parameter_schema_status,
  };
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
  const baseById = new Map(base.map((row) => [`base-work:${String(row.work_key)}`, row]));
  const baseTitleCounts = base.reduce((counts, row) => {
    const title = String(row.localized_name_ru);
    counts.set(title, (counts.get(title) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const expandedById = new Map(expanded.map((row) => [`expanded-template:${String(row.template_id)}`, row]));
  const familyById = new Map(families.map((row) => [String(row.work_family_id), row]));
  const predecessorRows = readJsonl<SourceRow>(PREDECESSOR_MANIFEST);
  const predecessorSearch = readJsonl<Json>(PREDECESSOR_SEARCH);
  const predecessorSearchByOwner = new Map(predecessorSearch.map((row) => [String(row.owner_source_identity_id), row]));

  const manifest: Json[] = predecessorRows.map<Json>((row) => {
    const isBase = row.source_corpus === "BASE_WORK_CATALOG_10000";
    const raw = isBase ? baseById.get(row.source_identity_id) : expandedById.get(row.source_identity_id);
    if (!raw) throw new Error(`${RUN_LABEL}_SOURCE_ROW_MISSING:${row.source_identity_id}`);
    const family = isBase ? null : familyById.get(row.source_family_id);
    if (!isBase && !family) throw new Error(`${RUN_LABEL}_SOURCE_FAMILY_MISSING:${row.source_identity_id}`);
    const parameterSource = isBase ? baseParameterSource(raw) : { parameter_schema: family!.parameterSchema };
    const formulaResourceSource = isBase ? baseFormulaResourceSource(raw) : expandedFormulaResourceSource(family!);
    const publicRussianIdentity = R555_CONTENT_SUCCESSOR
      ? isBase
        ? {
          titleRu: resolveBasePublicRussianTitleR555({
            localizedNameRu: String(raw.localized_name_ru),
            category: String(raw.category),
            duplicateTitleCount: baseTitleCounts.get(String(raw.localized_name_ru)) ?? 0,
          }),
          aliasesRu: [] as string[],
          lexiconVersion: PUBLIC_RUSSIAN_LEXICON_VERSION_R555,
        }
        : resolveExpandedPublicRussianIdentityR555(family!)
      : null;
    if (publicRussianIdentity && publicRussianIdentity.aliasesRu.length === 0) {
      publicRussianIdentity.aliasesRu.push(publicRussianIdentity.titleRu);
    }
    const withoutHash = {
      ...row,
      schema_version: `rik-expo-app-${RUN_ID}.full-catalog-source-row.v1`,
      source_group: isBase ? String(raw.work_family_id) : String(family!.categoryGroup),
      source_title_ru: publicRussianIdentity?.titleRu ?? row.source_title_ru,
      public_title_ru: publicRussianIdentity?.titleRu ?? row.public_title_ru,
      public_aliases: publicRussianIdentity?.aliasesRu ?? row.public_aliases,
      public_russian_lexicon_version: publicRussianIdentity?.lexiconVersion ?? null,
      source_uom_ru: isBase ? baseUnitRu(String(raw.unit_policy_id)) : expandedUnitRu(family!),
      source_uom_policy: isBase ? String(raw.unit_policy_id) : String(family!.unitPolicy),
      parameter_schema_sha256: shaObject(parameterSource),
      formula_resource_sha256: shaObject(formulaResourceSource),
      previous_release_mapping: row.predecessor_r58,
      review_status: `DETERMINISTIC_${RUN_LABEL}_IDENTITY_REVIEW_ACCEPTED`,
      technology_passport_status: "SOURCE_SEED_PRESENT_BUILD_PENDING",
      r553_predecessor_row_sha256: row.row_sha256,
      governance_review: {
        status: `DETERMINISTIC_IDENTITY_REVIEW_ACCEPTED_${RUN_LABEL}`,
        actor: `${RUN_ID}-catalog-source-governance`,
        master_sha256: MASTER_SHA256,
        full_redirect_review: true,
        pending_review: false,
        tombstone_used: false,
      },
    } as Json;
    delete withoutHash.row_sha256;
    return { ...withoutHash, row_sha256: shaObject(withoutHash) };
  }).sort((left, right) => String(left.source_identity_id).localeCompare(String(right.source_identity_id)));

  const visibleById = new Map(manifest.filter((row) => row.classification === "CANONICAL_VISIBLE")
    .map((row) => [String(row.source_identity_id), row]));
  const searchDocuments: Json[] = [...visibleById.values()].map<Json>((row) => {
    const predecessor = predecessorSearchByOwner.get(String(row.source_identity_id));
    if (!predecessor) throw new Error(`${RUN_LABEL}_SEARCH_PREDECESSOR_MISSING:${String(row.source_identity_id)}`);
    const withoutHash = {
      ...predecessor,
      schema_version: `rik-expo-app-${RUN_ID}.full-catalog-search-document.v1`,
      source_group: row.source_group,
      source_uom_ru: row.source_uom_ru,
      parameter_schema_sha256: row.parameter_schema_sha256,
      formula_resource_sha256: row.formula_resource_sha256,
      public_title_ru: row.public_title_ru,
      public_aliases: row.public_aliases,
      search_text_normalized: normalize([row.public_title_ru, ...(row.public_aliases as string[])].join(" ")),
      public_russian_lexicon_version: row.public_russian_lexicon_version ?? null,
      r553_predecessor_document_sha256: predecessor.document_sha256,
    } as Json;
    delete withoutHash.document_sha256;
    return { ...withoutHash, document_sha256: shaObject(withoutHash) };
  }).sort((left, right) => String(left.canonical_work_id).localeCompare(String(right.canonical_work_id)));

  const counts = Object.fromEntries(["CANONICAL_VISIBLE", "REDIRECT_TO_CANONICAL", "TOMBSTONED_NOT_APPLICABLE"].map((classification) => [
    classification,
    manifest.filter((row) => row.classification === classification).length,
  ]));
  const sentinelOracle = Object.fromEntries(SENTINELS.map((query) => {
    const token = normalize(query);
    const ids = searchDocuments.filter((row) => String(row.search_text_normalized).includes(token))
      .map((row) => String(row.canonical_work_id));
    return [query, { count: ids.length, identity_set_sha256: shaObject(ids), sample: ids.slice(0, 5) }];
  }));
  const summary = {
    schema_version: `rik-expo-app-${RUN_ID}.full-catalog-source-summary.v1`,
    master_sha256: MASTER_SHA256,
    predecessor_master_sha256: PREDECESSOR_MASTER_SHA256,
    generated_utc: new Date().toISOString(),
    source_files: {
      base: { path: BASE_PATH, rows: base.length, sha256: sha256(readFileSync(resolve(BASE_PATH))) },
      expanded: { path: EXPANDED_PATH, rows: expanded.length, sha256: sha256(readFileSync(resolve(EXPANDED_PATH))) },
      families: { path: FAMILY_PATH, rows: families.length, sha256: sha256(readFileSync(resolve(FAMILY_PATH))) },
      predecessor_manifest: { path: PREDECESSOR_MANIFEST, rows: predecessorRows.length, sha256: sha256(readFileSync(resolve(PREDECESSOR_MANIFEST))) },
      predecessor_search: { path: PREDECESSOR_SEARCH, rows: predecessorSearch.length, sha256: sha256(readFileSync(resolve(PREDECESSOR_SEARCH))) },
    },
    equation: { source_total: manifest.length, ...counts, classification_sum: Object.values(counts).reduce((sum, count) => sum + Number(count), 0) },
    visible_search_documents: searchDocuments.length,
    pending_review: 0,
    manifest_semantic_sha256: shaObject(manifest.map((row) => row.row_sha256)),
    search_documents_semantic_sha256: shaObject(searchDocuments.map((row) => row.document_sha256)),
    sentinel_oracle: sentinelOracle,
    active_release_changed: false,
    content_admission_green_claimed: false,
    public_russian_content_successor: R555_CONTENT_SUCCESSOR,
    public_russian_lexicon_version: R555_CONTENT_SUCCESSOR ? PUBLIC_RUSSIAN_LEXICON_VERSION_R555 : null,
    production_accessed: false,
    status: `BUILT_${RUN_LABEL}_AWAITING_INDEPENDENT_VALIDATION`,
  };
  writeJsonl(MANIFEST_PATH, manifest);
  writeJsonl(SEARCH_PATH, searchDocuments);
  writeJson(SUMMARY_PATH, summary);
  const receiptBase = {
    schema_version: `rik-expo-app-${RUN_ID}.full-catalog-source-build-receipt.v1`,
    master_sha256: MASTER_SHA256,
    generated_utc: summary.generated_utc,
    status: summary.status,
    equation: summary.equation,
    visible_search_documents: searchDocuments.length,
    pending_review: 0,
    artifacts: [MANIFEST_PATH, SEARCH_PATH, SUMMARY_PATH].map((path) => ({ path, bytes: readFileSync(resolve(path)).length, sha256: sha256(readFileSync(resolve(path))) })),
    production_accessed: false,
  };
  writeJson(RECEIPT_PATH, { ...receiptBase, payload_sha256: shaObject(receiptBase) });
  process.stdout.write(`${JSON.stringify(receiptBase)}\n`);
}

main();
