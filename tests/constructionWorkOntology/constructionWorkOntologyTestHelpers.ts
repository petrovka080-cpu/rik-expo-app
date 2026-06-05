import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const WAVE = "S_CATALOG_WORK_PLATFORM_ADDITIVE_ONTOLOGY_MIGRATION_POINT_OF_NO_RETURN";
export const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_CATALOG_WORK_PLATFORM_ADDITIVE_ONTOLOGY_MIGRATION");
export const AUDIT_DIR = path.join(process.cwd(), "artifacts", "S_CATALOG_WORK_PLATFORM_ARCHITECTURE_AUDIT");
export const RESTORE_DIR = path.join(process.cwd(), "artifacts", "S_RESTORE_PRODUCT_UI_PDF_LIVE_WEB_SOURCE_OF_TRUTH");
export const MIGRATION_PATH = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260605090000_add_construction_work_ontology.sql",
);

export const REQUIRED_TABLES = [
  "construction_work_domains",
  "construction_work_definitions",
  "construction_work_aliases",
  "construction_work_classification_codes",
  "construction_work_catalog_links",
  "construction_work_recipe_rows",
  "construction_work_migration_audit",
];

export function readText(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

export function readMigration(): string {
  return fs.readFileSync(MIGRATION_PATH, "utf8");
}

export function readArtifactJson<T = Record<string, unknown>>(fileName: string): T {
  return JSON.parse(fs.readFileSync(path.join(ARTIFACT_DIR, fileName), "utf8")) as T;
}

export function readAuditJson<T = Record<string, unknown>>(fileName: string): T {
  return JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, fileName), "utf8")) as T;
}

export function readRestoreJson<T = Record<string, unknown>>(fileName: string): T {
  return JSON.parse(fs.readFileSync(path.join(RESTORE_DIR, fileName), "utf8")) as T;
}

export function changedFiles(): string[] {
  const output = execFileSync("git", ["status", "--short", "--untracked-files=all"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/\\/g, "/"));
}

export function createdTableNames(sql = readMigration()): string[] {
  return [...sql.matchAll(/create table if not exists public\.([a-z0-9_]+)/gi)].map((match) => match[1]);
}

const CLOSEOUT_PROOF_RUNNERS = new Set([
  "scripts/e2e/runAiEstimatePdfSafeIntegrationProof.ts",
  "scripts/e2e/runAndroidApi34LiveRequestEmbeddedAiProfessionalBoqPdfCatalogSmoke.ts",
]);

const GENERATED_RELEASE_ARTIFACT_PREFIXES = [
  "artifacts/S_AI_ESTIMATE_CORE_COMPLETION_",
  "artifacts/S_AI_ESTIMATE_PDF_SAFE_INTEGRATION_",
  "artifacts/S_AI_ESTIMATE_PDF_TABULAR_REGRESSION_",
  "artifacts/S_BUILT_IN_AI_10000_POST_BOQ_CATALOG_",
  "artifacts/S_CATALOG_ITEMS_GLOBAL_ESTIMATE_BINDING_",
  "artifacts/S_RATEBOOK_CATALOG_SOURCE_GOVERNANCE_",
  "artifacts/S_REQUEST_AI_ESTIMATE_BOQ_CATALOG_",
  "artifacts/S_REQUEST_ESTIMATE_CATALOG_BOQ_RELEASE_",
  "artifacts/S_REQUEST_ESTIMATE_DRAFT_STATE_MACHINE_",
  "artifacts/S_REQUEST_ESTIMATE_DRAFT_STATE_PAYLOAD_",
  "artifacts/pdf/ai-estimate-pdf-safe-integration/",
  "artifacts/pdf/ai-estimate-pdf-tabular-regression/",
  "artifacts/pdf/built-in-ai-50000-phase1/",
  "artifacts/pdf/built-in-ai-50000-phase2/",
];

export function extractDefinitionsInsert(sql = readMigration()): string {
  const match = sql.match(
    /insert into public\.construction_work_definitions[\s\S]*?values([\s\S]*?)on conflict \(work_key\) do nothing;/i,
  );
  if (!match) throw new Error("construction_work_definitions seed insert not found");
  return match[1];
}

export function extractSeedWorkRows(sql = readMigration()) {
  const block = extractDefinitionsInsert(sql);
  return [...block.matchAll(/\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'/g)].map(
    (match) => ({
      workKey: match[1],
      domainKey: match[2],
      systemKey: match[3],
      elementKey: match[4],
      operationKey: match[5],
    }),
  );
}

export function forbiddenDirtyFilesForWave(): string[] {
  return changedFiles().filter((file) => {
    if (file === "supabase/migrations/20260605090000_add_construction_work_ontology.sql") return false;
    if (file === "supabase/config.toml") return false;
    if (file.startsWith("supabase/.branches/")) return false;
    if (/^supabase\/migrations\/20\d+.*\.sql$/.test(file)) return false;
    if (file.startsWith("src/lib/constructionWork/")) return false;
    if (CLOSEOUT_PROOF_RUNNERS.has(file)) return false;
    if (GENERATED_RELEASE_ARTIFACT_PREFIXES.some((prefix) => file.startsWith(prefix))) return false;
    if (file === "scripts/e2e/canonicalApi34Evidence.ts") return false;
    if (file.startsWith("scripts/audit/")) return false;
    if (file.startsWith("scripts/release/")) return false;
    if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file)) return false;
    if (file.startsWith("tests/constructionWorkOntology/")) return false;
    if (file === "tests/perf/performance-budget.test.ts") return false;
    if (/^tests\/(marketplace|request|foreman|pdf|history)\/.*AfterOntology.*\.contract\.test\.ts$/.test(file)) return false;
    if (file.startsWith("artifacts/S_CATALOG_WORK_PLATFORM_ADDITIVE_ONTOLOGY_MIGRATION/")) return false;
    return true;
  });
}

export function expectNoForbiddenWaveScopeChanges(): void {
  expect(forbiddenDirtyFilesForWave()).toEqual([]);
}
