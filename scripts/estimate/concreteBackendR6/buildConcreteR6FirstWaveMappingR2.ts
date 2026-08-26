import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Client } from "pg";

import { CONCRETE_R6_DEFINITIONS } from "./concreteProfessionalDefinitionsR6";
import { REAL_PROFESSIONAL_ESTIMATES_R2_SPEC_SHA256 } from "./reinforcedConcreteStripFoundationR1";

type Json = Record<string, any>;

const CONTRACT = "real-professional-estimates-r2.concrete-first-wave-mapping.v1";
const MASTER_SPEC_PATH = resolve("C:/Users/User/Downloads/MASTER_TZ_REAL_PROFESSIONAL_ESTIMATES_R1_RU (1).md");
const CANDIDATE_RELEASE_ID = "06e19aee-e921-5b66-8fc3-c441ab918d29";
const SEARCH_RELEASE_ID = "367c2439-df83-5f27-bedd-89247b50caae";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const OUTPUT = resolve(".release-runtime/real-professional-estimates-r2/evidence/03-successor/CONCRETE_R6_FIRST_WAVE_MAPPING.json");
const APPROVED_STRIP_CATALOG_ID = "concrete_foundation_interior_strip_foundation_form_standard";
const STOP_WORDS = new Set([
  "бетон", "бетона", "бетонная", "бетонной", "бетонный", "бетонных",
  "железобетонная", "железобетонной", "железобетонный", "железобетонных",
  "монолитная", "монолитной", "монолитный", "монолитных",
  "конструкция", "конструкции", "конструкций", "монтаж", "установка", "устройство", "работы",
]);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("ru-RU").replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9]+/giu, " ").trim().replace(/\s+/gu, " ");
}

function tokens(value: string): Set<string> {
  return new Set(normalize(value).split(" ").filter((token) => token.length > 2 && !STOP_WORDS.has(token)));
}

function overlapScore(left: string, right: string): number {
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);
  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 100;
  const leftTokens = tokens(normalizedLeft);
  const rightTokens = tokens(normalizedRight);
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  const jaccard = union === 0 ? 0 : intersection / union;
  const containment = normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft) ? 30 : 0;
  return Math.round((jaccard * 70 + containment) * 1_000) / 1_000;
}

function bestScore(seedNames: readonly string[], candidateNames: readonly string[]): number {
  return Math.max(...seedNames.flatMap((seed) => candidateNames.map((candidate) => overlapScore(seed, candidate))));
}

function atomicWrite(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

async function main(): Promise<void> {
  invariant(sha256(readFileSync(MASTER_SPEC_PATH)) === REAL_PROFESSIONAL_ESTIMATES_R2_SPEC_SHA256,
    "CONCRETE_R6_MAPPING_MASTER_DRIFT");

  const client = new Client({ connectionString: DATABASE_URL, application_name: "concrete-r6-first-wave-mapping-r2-readonly" });
  await client.connect();
  let release: Json;
  let candidates: Json[];
  try {
    await client.query("begin transaction read only");
    release = (await client.query(`select id::text,release_key,status,parent_release_id::text,definition_count,activated_at
      from public.estimate_definition_release where id=$1`, [CANDIDATE_RELEASE_ID])).rows[0] as Json;
    candidates = (await client.query(`select m.catalog_id,m.definition_version_id::text,m.source_batch,m.publication_state,
      m.baseline_ready,m.scenario_ready,w.title_ru,w.work_key,w.source_identity,
      coalesce(search.aliases,'{}'::text[]) aliases,search.canonical_name_ru search_title,
      search.adjudication_class,search.selectable,search.canonical_target_catalog_id,search.replacement_catalog_id
      from public.estimate_cumulative_manifest_entry m
      join public.estimate_work_identity w on w.catalog_id=m.catalog_id
      left join public.estimate_search_document search on search.search_release_id=$2 and search.catalog_id=m.catalog_id
      where m.release_id=$1 and m.domain_id='concrete' order by m.catalog_id`, [CANDIDATE_RELEASE_ID, SEARCH_RELEASE_ID])).rows as Json[];
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }

  invariant(release?.status === "prepared" && release.activated_at == null, "CONCRETE_R6_MAPPING_RELEASE_DRIFT");
  invariant(candidates.length === 1_220, `CONCRETE_R6_MAPPING_DENOMINATOR:${candidates.length}`);
  const mapping = CONCRETE_R6_DEFINITIONS.map((definition) => {
    const seedNames = [definition.titleRu, ...definition.aliasesRu, definition.catalogId.replace("r6-concrete:", "")];
    const ranked = candidates.map((candidate) => {
      const candidateNames = [
        candidate.title_ru,
        candidate.search_title,
        candidate.work_key,
        candidate.source_identity,
        candidate.catalog_id,
        ...(Array.isArray(candidate.aliases) ? candidate.aliases : []),
      ].filter((value): value is string => typeof value === "string" && value.trim() !== "");
      return {
        catalogId: candidate.catalog_id,
        definitionVersionId: candidate.definition_version_id,
        titleRu: candidate.title_ru,
        sourceBatch: candidate.source_batch,
        publicationState: candidate.publication_state,
        baselineReady: candidate.baseline_ready,
        scenarioReady: candidate.scenario_ready,
        searchClass: candidate.adjudication_class,
        selectable: candidate.selectable,
        canonicalTargetCatalogId: candidate.canonical_target_catalog_id,
        replacementCatalogId: candidate.replacement_catalog_id,
        score: bestScore(seedNames, candidateNames),
      };
    }).sort((left, right) => right.score - left.score || left.catalogId.localeCompare(right.catalogId));
    const approvedStrip = definition.catalogId === "r6-concrete:strip_foundation"
      ? ranked.find((candidate) => candidate.catalogId === APPROVED_STRIP_CATALOG_ID)
      : undefined;
    const top = ranked.slice(0, 12);
    return {
      r6CatalogId: definition.catalogId,
      titleRu: definition.titleRu,
      geometryKind: definition.geometryKind,
      normativeBinding: definition.normativeBinding,
      approvedCatalogId: approvedStrip?.catalogId ?? null,
      approvedDefinitionVersionId: approvedStrip?.definitionVersionId ?? null,
      mappingStatus: approvedStrip
        ? "APPROVED_SUCCESSOR_ALREADY_PREPARED"
        : top[0]!.score >= 70 && top[0]!.score - top[1]!.score >= 10
          ? "CANDIDATE_MAPPING_REQUIRES_EXACT_RATE_AND_ENGINEERING_REVIEW"
          : "AMBIGUOUS_MAPPING_REQUIRES_MANUAL_ADJUDICATION",
      scoreMargin: Math.round((top[0]!.score - top[1]!.score) * 1_000) / 1_000,
      topCandidates: top,
    };
  });
  invariant(mapping.length === 16, `CONCRETE_R6_MAPPING_FIRST_WAVE:${mapping.length}`);
  invariant(mapping.filter((row) => row.approvedCatalogId).length === 1, "CONCRETE_R6_MAPPING_APPROVED_COUNT");

  const payload = {
    contract: CONTRACT,
    generatedAt: new Date().toISOString(),
    masterSpecSha256: REAL_PROFESSIONAL_ESTIMATES_R2_SPEC_SHA256,
    candidateRelease: release,
    concreteDenominator: candidates.length,
    firstWaveDenominator: mapping.length,
    approvedMappings: mapping.filter((row) => row.approvedCatalogId).length,
    unresolvedMappings: mapping.filter((row) => !row.approvedCatalogId).length,
    policy: "NO_AUTOMATIC_PROMOTION_WITHOUT_UNIQUE_CATALOG_ID_AND_EXACT_NORMATIVE_RATE",
    mapping,
    databaseWritesApplied: 0,
    status: "RED_15_CONCRETE_FIRST_WAVE_MAPPINGS_REQUIRE_ADJUDICATION",
  };
  atomicWrite(OUTPUT, { ...payload, payloadSha256: sha256(Buffer.from(JSON.stringify(payload), "utf8")) });
  process.stdout.write(`${JSON.stringify({
    output: OUTPUT,
    concreteDenominator: candidates.length,
    approvedMappings: payload.approvedMappings,
    unresolvedMappings: payload.unresolvedMappings,
    statuses: Object.fromEntries([...new Set(mapping.map((row) => row.mappingStatus))]
      .map((status) => [status, mapping.filter((row) => row.mappingStatus === status).length])),
  }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
