import fs from "node:fs";
import path from "node:path";

import {
  buildReal10000SourceFingerprint,
  evaluateReal10000Acceptance,
  REAL10000_SOURCE_FINGERPRINT_ALGORITHM,
  slimResult,
  summarizeReal10000,
  type Real10000SourceFingerprint,
  type Real10000Evaluation,
} from "../../scripts/e2e/real10000AcceptanceCore";

const CACHE_FILE = path.join(process.cwd(), "artifacts", "S_REAL_10000_DIVERSE_CONSTRUCTION_WORKS", "targeted_runtime_cache_no_pdf.json");
const CACHE_SCHEMA = 2;

type CachedEvaluation = Real10000Evaluation;
type CachedEvaluationFile = {
  cache_schema?: number;
  source_fingerprint_algorithm?: string;
  source_fingerprint?: string;
  source_fingerprint_files?: string[];
  cases?: CachedEvaluation["cases"];
  failures?: CachedEvaluation["failures"];
};

function sourceFilesMatch(cachedFiles: unknown, sourceFiles: readonly string[]): boolean {
  return Array.isArray(cachedFiles) &&
    cachedFiles.length === sourceFiles.length &&
    cachedFiles.every((filePath, index) => filePath === sourceFiles[index]);
}

function readCache(source: Real10000SourceFingerprint): CachedEvaluation | null {
  if (!fs.existsSync(CACHE_FILE)) return null;
  const cached = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) as CachedEvaluationFile;
  if (
    cached.cache_schema !== CACHE_SCHEMA ||
    cached.source_fingerprint_algorithm !== REAL10000_SOURCE_FINGERPRINT_ALGORITHM ||
    cached.source_fingerprint !== source.fingerprint ||
    !sourceFilesMatch(cached.source_fingerprint_files, source.files) ||
    !Array.isArray(cached.cases) ||
    !Array.isArray(cached.failures)
  ) {
    return null;
  }
  return { cases: cached.cases, failures: cached.failures };
}

function writeCache(evaluation: CachedEvaluation, source: Real10000SourceFingerprint): void {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, `${JSON.stringify({
    cache_schema: CACHE_SCHEMA,
    source_fingerprint_algorithm: REAL10000_SOURCE_FINGERPRINT_ALGORITHM,
    source_fingerprint: source.fingerprint,
    source_fingerprint_files: source.files,
    cases: evaluation.cases.map(slimResult),
    failures: evaluation.failures,
  }, null, 2)}\n`, "utf8");
}

export function real10000Evaluation(): CachedEvaluation {
  const source = buildReal10000SourceFingerprint();
  const cached = readCache(source);
  if (cached) return cached;
  const evaluation = evaluateReal10000Acceptance({ includePdf: false });
  writeCache(evaluation, source);
  return evaluation;
}

export function real10000Summary() {
  return summarizeReal10000(real10000Evaluation());
}
