import fs from "node:fs";
import path from "node:path";

import {
  evaluateReal10000Acceptance,
  slimResult,
  summarizeReal10000,
} from "../../scripts/e2e/real10000AcceptanceCore";

const CACHE_FILE = path.join(process.cwd(), "artifacts", "S_REAL_10000_DIVERSE_CONSTRUCTION_WORKS", "targeted_runtime_cache_no_pdf.json");

type CachedEvaluation = ReturnType<typeof evaluateReal10000Acceptance>;

function writeCache(evaluation: CachedEvaluation): void {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, `${JSON.stringify({
    cases: evaluation.cases.map(slimResult),
    failures: evaluation.failures,
  }, null, 2)}\n`, "utf8");
}

export function real10000Evaluation(): CachedEvaluation {
  if (fs.existsSync(CACHE_FILE)) {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) as CachedEvaluation;
  }
  const evaluation = evaluateReal10000Acceptance({ includePdf: false });
  writeCache(evaluation);
  return evaluation;
}

export function real10000Summary() {
  return summarizeReal10000(real10000Evaluation());
}
