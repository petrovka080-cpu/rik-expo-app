import fs from "node:fs";
import path from "node:path";

import {
  buildRealWork1000SourceFingerprint,
  REAL_WORK_1000_ARTIFACT_DIR,
  runRealWork1000RequestForemanAcceptanceProof,
  type RealWork1000RunResult,
} from "../../scripts/e2e/realWork1000RequestForemanAcceptanceCore";

const MATRIX_FILE = path.join(REAL_WORK_1000_ARTIFACT_DIR, "matrix.json");
const RESULTS_FILE = path.join(REAL_WORK_1000_ARTIFACT_DIR, "results.json");
const CASES_FILE = path.join(REAL_WORK_1000_ARTIFACT_DIR, "cases.json");

let memo: RealWork1000RunResult | null = null;

function cachedResultMatchesCurrentSource(): boolean {
  if (!fs.existsSync(MATRIX_FILE) || !fs.existsSync(RESULTS_FILE) || !fs.existsSync(CASES_FILE)) return false;
  const matrix = JSON.parse(fs.readFileSync(MATRIX_FILE, "utf8")) as { source_fingerprint?: string };
  const current = buildRealWork1000SourceFingerprint();
  return matrix.source_fingerprint === current.fingerprint;
}

export function realWork1000Result(): RealWork1000RunResult {
  if (memo) return memo;
  if (cachedResultMatchesCurrentSource()) {
    memo = {
      matrix: JSON.parse(fs.readFileSync(MATRIX_FILE, "utf8")) as Record<string, unknown>,
      results: JSON.parse(fs.readFileSync(RESULTS_FILE, "utf8")) as RealWork1000RunResult["results"],
      cases: JSON.parse(fs.readFileSync(CASES_FILE, "utf8")) as RealWork1000RunResult["cases"],
    };
    return memo;
  }
  memo = runRealWork1000RequestForemanAcceptanceProof();
  return memo;
}
