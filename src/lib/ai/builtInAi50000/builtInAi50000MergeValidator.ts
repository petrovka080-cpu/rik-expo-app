import type { BuiltInAi50000Case } from "./builtInAi50000CaseTypes";
import type { BuiltInAi50000Phase2ShardCaseResult, BuiltInAi50000Phase2ShardMatrix } from "./builtInAi50000ShardRunnerTypes";
import {
  BUILT_IN_AI_50000_TARGET_CASES_TOTAL,
  BUILT_IN_AI_50000_TARGET_SHARDS_TOTAL,
} from "./builtInAi50000Ontology";
import { validateBuiltInAi50000FullManifest } from "./validateBuiltInAi50000Case";

export type BuiltInAi50000Phase2MergeValidation = {
  valid: boolean;
  issues: string[];
};

export function validateBuiltInAi50000Phase2Merge(input: {
  cases: readonly BuiltInAi50000Case[];
  shardMatrices: readonly BuiltInAi50000Phase2ShardMatrix[];
  shardCaseResults: readonly BuiltInAi50000Phase2ShardCaseResult[];
  shardFailures: readonly unknown[];
}): BuiltInAi50000Phase2MergeValidation {
  const issues: string[] = [];
  const manifest = validateBuiltInAi50000FullManifest(input.cases);
  issues.push(...manifest.issues);
  if (input.shardMatrices.length !== BUILT_IN_AI_50000_TARGET_SHARDS_TOTAL) {
    issues.push(`SHARD_MATRIX_COUNT_INVALID:${input.shardMatrices.length}`);
  }
  if (input.shardFailures.length > 0) {
    issues.push(`SHARD_FAILURES_PRESENT:${input.shardFailures.length}`);
  }
  const passedCount = input.shardMatrices.reduce((sum, matrix) => sum + matrix.cases_passed, 0);
  const failedCount = input.shardMatrices.reduce((sum, matrix) => sum + matrix.cases_failed, 0);
  if (passedCount !== BUILT_IN_AI_50000_TARGET_CASES_TOTAL) issues.push(`PASSED_COUNT_INVALID:${passedCount}`);
  if (failedCount !== 0) issues.push(`FAILED_COUNT_INVALID:${failedCount}`);
  if (input.shardMatrices.some((matrix) => matrix.single_shard_green_claimed)) issues.push("SINGLE_SHARD_GREEN_CLAIMED");
  if (input.shardMatrices.some((matrix) => matrix.fake_green_claimed)) issues.push("FAKE_GREEN_CLAIMED");
  if (input.shardMatrices.some((matrix) => matrix.forbidden_fallback_rows_found)) issues.push("GENERIC_ROWS_FOUND");
  if (input.shardMatrices.some((matrix) => !matrix.source_evidence_present_all_priced_rows)) issues.push("SOURCE_EVIDENCE_MISSING");
  if (input.shardMatrices.some((matrix) => !matrix.product_search_cases_have_no_fake_stock_supplier_availability)) {
    issues.push("FAKE_STOCK_SUPPLIER_OR_AVAILABILITY_FOUND");
  }
  if (input.shardMatrices.some((matrix) => !matrix.dangerous_work_has_no_diy_instructions)) issues.push("DANGEROUS_DIY_FOUND");
  if (input.shardMatrices.some((matrix) => !matrix.pdf_action_present_all_estimate_cases)) issues.push("PDF_ACTION_MISSING");
  const resultIds = input.shardCaseResults.map((result) => result.id);
  if (new Set(resultIds).size !== resultIds.length) issues.push("DUPLICATE_CASE_RESULTS");
  const expectedIds = new Set(input.cases.map((testCase) => testCase.id));
  const missing = [...expectedIds].filter((id) => !resultIds.includes(id));
  if (missing.length > 0) issues.push(`MISSING_CASE_RESULTS:${missing.length}`);
  return {
    valid: issues.length === 0,
    issues,
  };
}
