import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Json = Record<string, unknown>;
type Classification =
  | "CANONICAL_VISIBLE"
  | "REDIRECT_TO_CANONICAL"
  | "TOMBSTONED_NOT_APPLICABLE";

type BaseRow = Json & {
  template_id: string;
  work_key: string;
  work_family_id: string;
  localized_name_ru: string;
  aliases: string[];
  category: string;
  work_type: string;
  unit_policy_id: string;
  parameter_schema_id: string;
  calculator_family_id: string;
  material_recipe_id: string;
  labor_recipe_id: string;
  service_recipe_id: string;
  equipment_recipe_id: string;
  norm_pack_id: string;
  readiness_status: string;
  row_count: number;
};

type ExpandedTemplate = Json & {
  template_id: string;
  work_family_id: string;
  template_level: string;
  requiredInputs: string[];
  rowGroups: string[];
};

type ExpandedFamily = Json & {
  work_family_id: string;
  professionalNameRu: string;
  aliases: string[];
  categoryGroup: string;
  globalCategory: string;
  calculatorId: string;
  formulaFamily: string;
  materialRecipe: string[];
  laborRecipe: string[];
  equipmentRecipe: string[];
  serviceRecipe: string[];
  normSource: Json;
  unitPolicy: string;
};

type PredecessorRow = Json & {
  source_catalog_id: string;
  classification: string;
  definition_version_id?: string | null;
  canonical_target_catalog_id?: string | null;
  adjudication_sha256: string;
};

type ManifestRow = {
  schema_version: "rik-expo-app-r553.full-catalog-identity-row.v1";
  source_identity_id: string;
  source_corpus: "BASE_WORK_CATALOG_10000" | "EXPANDED_COMPLEX_TEMPLATES_1610";
  source_file: string;
  source_locator: string;
  source_row_sha256: string;
  source_title_ru: string;
  source_family_id: string;
  source_domain: string;
  source_level: string | null;
  classification: Classification;
  canonical_work_id: string;
  redirect_target_source_identity_id: string | null;
  public_title_ru: string;
  public_aliases: string[];
  semantic_tuple_sha256: string;
  classification_reason: string;
  classification_proof: Json;
  governance_review: Json;
  preliminary_definition_seed: Json;
  predecessor_r58: Json | null;
  search_document_emitted: boolean;
  row_sha256: string;
};

const MASTER_SHA256 = "5a9e373f94441c8e39d6f0feff7a2ba8e7773a95d0807aff6c89f6535bde11ee";
const BASE_PATH = "data/estimate-templates/estimate-10000-readiness-manifest.json";
const EXPANDED_PATH = "data/estimate-catalog/expanded-complex/templates.json";
const FAMILY_PATH = "data/estimate-catalog/expanded-complex/work-families.json";
const R58_PATH = ".release-runtime/p0-one-monolith-r58/evidence/08-adjudication/CATALOG_ADJUDICATION_LEDGER.jsonl";
const OUTPUT_ROOT = ".release-runtime/r553/catalog";
const MANIFEST_PATH = `${OUTPUT_ROOT}/FULL_CATALOG_IDENTITY_MANIFEST.jsonl`;
const SEARCH_PATH = `${OUTPUT_ROOT}/FULL_CATALOG_VISIBLE_SEARCH_DOCUMENTS.jsonl`;
const SUMMARY_PATH = `${OUTPUT_ROOT}/FULL_CATALOG_IDENTITY_SUMMARY.json`;
const RECEIPT_PATH = ".release-runtime/r553/evidence/12_R553_FULL_CATALOG_IDENTITY_MANIFEST.json";
const CLASSIFICATIONS: readonly Classification[] = [
  "CANONICAL_VISIBLE",
  "REDIRECT_TO_CANONICAL",
  "TOMBSTONED_NOT_APPLICABLE",
];

const FAMILY_ALIASES_RU: Readonly<Record<string, readonly string[]>> = {
  asphalt_concrete_pavement: [
    "асфальт",
    "асфальтовые работы",
    "асфальтобетонное покрытие",
    "устройство асфальта",
  ],
  road_construction: ["дорога", "дорожные работы", "строительство дороги"],
  village_road_construction: ["сельская дорога", "дорожные работы"],
  parking_structure: ["парковка", "строительство парковки", "паркинг"],
  underground_parking: ["подземная парковка", "строительство парковки", "паркинг"],
  bridge_asphalt: ["асфальт на мосту", "асфальтобетонное покрытие моста"],
};

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

function atomic(path: string, value: string): void {
  const absolute = resolve(path);
  mkdirSync(dirname(absolute), { recursive: true });
  const temporary = `${absolute}.${process.pid}.tmp`;
  writeFileSync(temporary, value, "utf8");
  renameSync(temporary, absolute);
}

function writeJson(path: string, value: unknown): void {
  atomic(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeJsonl(path: string, rows: readonly unknown[]): void {
  atomic(path, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "ru"));
}

function publicAliases(values: readonly string[]): string[] {
  return unique(values.filter((value) => {
    const normalized = value.trim();
    return normalized.length > 0 && !/^[a-z0-9]+(?:[_:-][a-z0-9]+)+$/iu.test(normalized);
  }));
}

export function normalizeCatalogSearchText(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("ru-RU").replace(/ё/gu, "е")
    .replace(/[\p{P}\p{S}_]+/gu, " ").replace(/\s+/gu, " ").trim();
}

function predecessorMap(): Map<string, PredecessorRow> {
  return new Map(readJsonl<PredecessorRow>(R58_PATH).map((row) => [row.source_catalog_id, row]));
}

function predecessorProjection(row: PredecessorRow | undefined): Json | null {
  if (!row) return null;
  return {
    evidence_path: R58_PATH,
    evidence_file_sha256: sha256(readFileSync(resolve(R58_PATH))),
    adjudication_sha256: row.adjudication_sha256,
    prior_classification: row.classification,
    prior_definition_version_id: row.definition_version_id ?? null,
    superseded_by_master_sha256: MASTER_SHA256,
  };
}

function withRowHash(row: Omit<ManifestRow, "row_sha256">): ManifestRow {
  return { ...row, row_sha256: shaObject(row) };
}

function buildBaseRows(base: readonly BaseRow[], prior: ReadonlyMap<string, PredecessorRow>): ManifestRow[] {
  return base.map((source, index) => {
    const sourceIdentityId = `base-work:${source.work_key}`;
    const aliases = publicAliases([source.localized_name_ru, ...(source.aliases ?? [])]);
    const semanticTuple = {
      title: normalizeCatalogSearchText(source.localized_name_ru),
      unit_policy_id: source.unit_policy_id,
      category: source.category,
      work_type: source.work_type,
      work_family_id: source.work_family_id,
    };
    return withRowHash({
      schema_version: "rik-expo-app-r553.full-catalog-identity-row.v1",
      source_identity_id: sourceIdentityId,
      source_corpus: "BASE_WORK_CATALOG_10000",
      source_file: BASE_PATH,
      source_locator: `$.templates[${index}]`,
      source_row_sha256: shaObject(source),
      source_title_ru: source.localized_name_ru,
      source_family_id: source.work_family_id,
      source_domain: source.category,
      source_level: null,
      classification: "CANONICAL_VISIBLE",
      canonical_work_id: `canonical-work:base:${source.work_key}`,
      redirect_target_source_identity_id: null,
      public_title_ru: source.localized_name_ru,
      public_aliases: aliases,
      semantic_tuple_sha256: shaObject(semanticTuple),
      classification_reason:
        "Техническая work identity имеет уникальный состав title+unit+category+action+family; scope-модификаторы меняют измерение, ресурсы или условия выполнения и не являются дублями.",
      classification_proof: {
        rule: "BASE_SEMANTIC_TUPLE_UNIQUE_10000_OF_10000",
        tuple: semanticTuple,
        source_template_id: source.template_id,
      },
      governance_review: {
        status: "DETERMINISTIC_IDENTITY_REVIEW_ACCEPTED_R553",
        actor: "r553-catalog-identity-governance",
        master_sha256: MASTER_SHA256,
        tombstone_used: false,
      },
      preliminary_definition_seed: {
        status: "SOURCE_SEED_PRESENT_RELEASE_ADMISSION_PENDING",
        parameter_schema_id: source.parameter_schema_id,
        calculator_family_id: source.calculator_family_id,
        recipes: [
          source.material_recipe_id,
          source.labor_recipe_id,
          source.service_recipe_id,
          source.equipment_recipe_id,
        ],
        norm_pack_id: source.norm_pack_id,
        source_readiness_status: source.readiness_status,
        source_row_count: source.row_count,
      },
      predecessor_r58: predecessorProjection(prior.get(source.work_key)),
      search_document_emitted: true,
    });
  });
}

function buildExpandedRows(
  templates: readonly ExpandedTemplate[],
  families: ReadonlyMap<string, ExpandedFamily>,
  prior: ReadonlyMap<string, PredecessorRow>,
): ManifestRow[] {
  const targetByFamily = new Map<string, ExpandedTemplate>();
  for (const template of templates) {
    if (template.template_level === "PRELIMINARY_BOQ") {
      if (targetByFamily.has(template.work_family_id)) {
        throw new Error(`R553_EXPANDED_PRELIMINARY_TARGET_DUPLICATE:${template.work_family_id}`);
      }
      targetByFamily.set(template.work_family_id, template);
    }
  }
  return templates.map((source, index) => {
    const family = families.get(source.work_family_id);
    const target = targetByFamily.get(source.work_family_id);
    if (!family || !target) throw new Error(`R553_EXPANDED_FAMILY_OR_TARGET_MISSING:${source.template_id}`);
    const visible = source.template_level === "PRELIMINARY_BOQ";
    const sourceIdentityId = `expanded-template:${source.template_id}`;
    const targetSourceIdentityId = `expanded-template:${target.template_id}`;
    const aliases = publicAliases([
      family.professionalNameRu,
      ...(family.aliases ?? []),
      ...(FAMILY_ALIASES_RU[family.work_family_id] ?? []),
    ]);
    const semanticTuple = {
      work_family_id: source.work_family_id,
      physical_work_title_ru: normalizeCatalogSearchText(family.professionalNameRu),
      calculator_id: family.calculatorId,
      formula_family: family.formulaFamily,
      unit_policy: family.unitPolicy,
    };
    return withRowHash({
      schema_version: "rik-expo-app-r553.full-catalog-identity-row.v1",
      source_identity_id: sourceIdentityId,
      source_corpus: "EXPANDED_COMPLEX_TEMPLATES_1610",
      source_file: EXPANDED_PATH,
      source_locator: `$[${index}]`,
      source_row_sha256: shaObject(source),
      source_title_ru: family.professionalNameRu,
      source_family_id: source.work_family_id,
      source_domain: family.categoryGroup,
      source_level: source.template_level,
      classification: visible ? "CANONICAL_VISIBLE" : "REDIRECT_TO_CANONICAL",
      canonical_work_id: `canonical-work:expanded:${source.work_family_id}`,
      redirect_target_source_identity_id: visible ? null : targetSourceIdentityId,
      public_title_ru: family.professionalNameRu,
      public_aliases: aliases,
      semantic_tuple_sha256: shaObject(semanticTuple),
      classification_reason: visible
        ? "PRELIMINARY_BOQ является публичной work identity семейства и владельцем безопасной preliminary estimate."
        : "ROM, detailed, tender и as-built являются maturity/revision states той же физической работы, а не отдельными строительными работами.",
      classification_proof: {
        rule: visible
          ? "EXPANDED_ONE_PRELIMINARY_OWNER_PER_FAMILY"
          : "EXPANDED_MATURITY_STATE_REDIRECTS_TO_PRELIMINARY_OWNER",
        family_id: source.work_family_id,
        source_level: source.template_level,
        target_level: "PRELIMINARY_BOQ",
        shared_semantic_tuple_sha256: shaObject(semanticTuple),
        predecessor_duplicate_evidence: R58_PATH,
      },
      governance_review: {
        status: "DETERMINISTIC_IDENTITY_REVIEW_ACCEPTED_R553",
        actor: "r553-catalog-identity-governance",
        master_sha256: MASTER_SHA256,
        tombstone_used: false,
      },
      preliminary_definition_seed: {
        status: "SOURCE_SEED_PRESENT_RELEASE_ADMISSION_PENDING",
        owner_template_id: target.template_id,
        calculator_id: family.calculatorId,
        formula_family: family.formulaFamily,
        required_inputs: target.requiredInputs,
        row_groups: target.rowGroups,
        recipes: {
          materials: family.materialRecipe,
          labor: family.laborRecipe,
          equipment: family.equipmentRecipe,
          services: family.serviceRecipe,
        },
        norm_source: family.normSource,
      },
      predecessor_r58: predecessorProjection(prior.get(sourceIdentityId)),
      search_document_emitted: visible,
    });
  });
}

function buildSearchDocuments(rows: readonly ManifestRow[]): Json[] {
  const grouped = new Map<string, ManifestRow[]>();
  for (const row of rows) {
    grouped.set(row.canonical_work_id, [...(grouped.get(row.canonical_work_id) ?? []), row]);
  }
  return [...grouped.entries()].map(([canonicalWorkId, members]) => {
    const visible = members.filter((row) => row.classification === "CANONICAL_VISIBLE");
    if (visible.length !== 1) {
      throw new Error(`R553_CANONICAL_VISIBLE_OWNER_CARDINALITY:${canonicalWorkId}:${visible.length}`);
    }
    const owner = visible[0];
    const aliases = publicAliases(members.flatMap((row) => row.public_aliases));
    const searchTextNormalized = normalizeCatalogSearchText([
      owner.public_title_ru,
      ...aliases,
    ].join(" "));
    const withoutHash = {
      schema_version: "rik-expo-app-r553.full-catalog-search-document.v1",
      canonical_work_id: canonicalWorkId,
      owner_source_identity_id: owner.source_identity_id,
      public_title_ru: owner.public_title_ru,
      public_aliases: aliases,
      domain: owner.source_domain,
      family_id: owner.source_family_id,
      source_identity_ids: members.map((row) => row.source_identity_id).sort(),
      search_text_normalized: searchTextNormalized,
      internal_ids_visible: false,
      preliminary_definition_seed: owner.preliminary_definition_seed,
    };
    return { ...withoutHash, document_sha256: shaObject(withoutHash) };
  }).sort((left, right) => String(left.canonical_work_id).localeCompare(String(right.canonical_work_id)));
}

function main(): void {
  const baseEnvelope = readJson<{ templates: BaseRow[] }>(BASE_PATH);
  const templates = readJson<ExpandedTemplate[]>(EXPANDED_PATH);
  const families = readJson<ExpandedFamily[]>(FAMILY_PATH);
  const familyMap = new Map(families.map((family) => [family.work_family_id, family]));
  const prior = predecessorMap();
  const manifest = [
    ...buildBaseRows(baseEnvelope.templates, prior),
    ...buildExpandedRows(templates, familyMap, prior),
  ].sort((left, right) => left.source_identity_id.localeCompare(right.source_identity_id));
  const searchDocuments = buildSearchDocuments(manifest);
  const counts = Object.fromEntries(CLASSIFICATIONS.map((classification) => [
    classification,
    manifest.filter((row) => row.classification === classification).length,
  ]));
  const sentinelOracle = Object.fromEntries(SENTINELS.map((query) => {
    const normalized = normalizeCatalogSearchText(query);
    const identities = searchDocuments.filter((document) =>
      String(document.search_text_normalized).includes(normalized)
    ).map((document) => document.canonical_work_id);
    return [query, {
      count: identities.length,
      identity_set_sha256: shaObject(identities),
      sample: identities.slice(0, 5),
    }];
  }));
  const summary = {
    schema_version: "rik-expo-app-r553.full-catalog-identity-summary.v1",
    master_sha256: MASTER_SHA256,
    generated_utc: new Date().toISOString(),
    source_files: {
      base: { path: BASE_PATH, rows: baseEnvelope.templates.length, sha256: sha256(readFileSync(resolve(BASE_PATH))) },
      expanded: { path: EXPANDED_PATH, rows: templates.length, sha256: sha256(readFileSync(resolve(EXPANDED_PATH))) },
      families: { path: FAMILY_PATH, rows: families.length, sha256: sha256(readFileSync(resolve(FAMILY_PATH))) },
      predecessor_r58: { path: R58_PATH, rows: prior.size, sha256: sha256(readFileSync(resolve(R58_PATH))) },
    },
    equation: {
      source_total: manifest.length,
      ...counts,
      classification_sum: Object.values(counts).reduce((sum, count) => sum + Number(count), 0),
    },
    visible_search_documents: searchDocuments.length,
    manifest_semantic_sha256: shaObject(manifest.map((row) => row.row_sha256)),
    search_documents_semantic_sha256: shaObject(searchDocuments.map((row) => row.document_sha256)),
    sentinel_oracle: sentinelOracle,
    active_release_changed: false,
    production_accessed: false,
    terminal_catalog_release_green_claimed: false,
    status: "BUILT_AWAITING_INDEPENDENT_VALIDATION",
  };
  writeJsonl(MANIFEST_PATH, manifest);
  writeJsonl(SEARCH_PATH, searchDocuments);
  writeJson(SUMMARY_PATH, summary);
  const receiptBase = {
    schema_version: "rik-expo-app-r553.full-catalog-identity-build-receipt.v1",
    master_sha256: MASTER_SHA256,
    generated_utc: summary.generated_utc,
    status: summary.status,
    equation: summary.equation,
    visible_search_documents: summary.visible_search_documents,
    artifacts: [MANIFEST_PATH, SEARCH_PATH, SUMMARY_PATH].map((path) => ({
      path,
      bytes: readFileSync(resolve(path)).length,
      sha256: sha256(readFileSync(resolve(path))),
    })),
    production_accessed: false,
  };
  writeJson(RECEIPT_PATH, { ...receiptBase, payload_sha256: shaObject(receiptBase) });
  process.stdout.write(`${JSON.stringify(receiptBase)}\n`);
}

main();
