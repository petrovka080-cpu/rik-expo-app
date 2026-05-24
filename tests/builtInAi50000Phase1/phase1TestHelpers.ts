import fs from "node:fs";
import path from "node:path";

import {
  BUILT_IN_AI_50000_PHASE1_CASES,
  BUILT_IN_AI_50000_PHASE1_GREEN_STATUS,
  BUILT_IN_AI_50000_PHASE1_MACRO_DOMAIN_SUMMARY,
  BUILT_IN_AI_50000_PHASE1_PRODUCT_CASES,
  BUILT_IN_AI_50000_PHASE1_SHARD_PLAN,
  validateBuiltInAi50000Phase1Manifest,
} from "../../src/lib/ai/builtInAi50000";

export function readPhase1Artifact<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "artifacts", name), "utf8")) as T;
}

export function getPhase1ManifestValidation() {
  return validateBuiltInAi50000Phase1Manifest(BUILT_IN_AI_50000_PHASE1_CASES);
}

export function getPhase1Matrix() {
  const filePath = path.join(process.cwd(), "artifacts", "S_BUILT_IN_AI_50000_PHASE1_matrix.json");
  if (!fs.existsSync(filePath)) {
    return {
      final_status: "MISSING",
      phase1_cases_total: BUILT_IN_AI_50000_PHASE1_CASES.length,
      phase1_cases_passed: 0,
      phase1_cases_failed: BUILT_IN_AI_50000_PHASE1_CASES.length,
      phase1_shards_total: BUILT_IN_AI_50000_PHASE1_SHARD_PLAN.length,
      macro_domains_total: Object.keys(BUILT_IN_AI_50000_PHASE1_MACRO_DOMAIN_SUMMARY).length,
      full_50k_green_claimed: false,
    };
  }
  return readPhase1Artifact<Record<string, unknown>>("S_BUILT_IN_AI_50000_PHASE1_matrix.json");
}

export function expectPhase1GreenMatrix(): void {
  const matrix = getPhase1Matrix();
  expect(matrix.final_status).toBe(BUILT_IN_AI_50000_PHASE1_GREEN_STATUS);
  expect(matrix.phase1_cases_total).toBe(5000);
  expect(matrix.phase1_cases_passed).toBe(5000);
  expect(matrix.phase1_cases_failed).toBe(0);
  expect(matrix.full_50k_green_claimed).toBe(false);
}

export const PHASE1_CASES = BUILT_IN_AI_50000_PHASE1_CASES;
export const PHASE1_PRODUCT_CASES = BUILT_IN_AI_50000_PHASE1_PRODUCT_CASES;
export const PHASE1_SHARD_PLAN = BUILT_IN_AI_50000_PHASE1_SHARD_PLAN;
