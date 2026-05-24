import {
  BUILT_IN_AI_50000_PHASE1_CASES_PER_MACRO_DOMAIN,
  BUILT_IN_AI_50000_PHASE1_CASES_TOTAL,
  BUILT_IN_AI_50000_PHASE1_CRITICAL_CASE_IDS,
  BUILT_IN_AI_50000_PHASE1_SHARDS_TOTAL,
  BUILT_IN_AI_50000_TARGET_CASES_PER_DOMAIN,
  BUILT_IN_AI_50000_TARGET_CASES_PER_SHARD,
  BUILT_IN_AI_50000_TARGET_CASES_TOTAL,
  BUILT_IN_AI_50000_TARGET_DOMAINS_TOTAL,
  BUILT_IN_AI_50000_TARGET_MACRO_DOMAINS_TOTAL,
  BUILT_IN_AI_50000_TARGET_SHARDS_TOTAL,
} from "./builtInAi50000Ontology";
import type { BuiltInAi50000Case, BuiltInAi50000Phase1Case } from "./builtInAi50000CaseTypes";

export type BuiltInAi50000CaseValidation = {
  valid: boolean;
  issues: string[];
};

function add(issues: string[], condition: boolean, code: string): void {
  if (!condition) issues.push(code);
}

export function validateBuiltInAi50000Phase1Case(testCase: BuiltInAi50000Phase1Case): BuiltInAi50000CaseValidation {
  const issues: string[] = [];
  add(issues, testCase.id.length > 0, "CASE_ID_REQUIRED");
  add(issues, Number.isInteger(testCase.shardId) && testCase.shardId >= 0 && testCase.shardId < BUILT_IN_AI_50000_PHASE1_SHARDS_TOTAL, "SHARD_ID_INVALID");
  add(issues, testCase.macroDomainId.length > 0, "MACRO_DOMAIN_REQUIRED");
  add(issues, testCase.workKey.length > 0, "WORK_KEY_REQUIRED");
  add(issues, testCase.promptRu.length > 0, "PROMPT_REQUIRED");
  add(issues, testCase.expectedTool.length > 0, "EXPECTED_TOOL_REQUIRED");
  add(issues, testCase.requiredRateKeys.length > 0, "RATE_KEYS_REQUIRED");
  add(issues, testCase.expectedRowsContain.length > 0, "EXPECTED_ROWS_REQUIRED");
  add(issues, testCase.forbiddenRowsContain.length > 0, "FORBIDDEN_ROWS_REQUIRED");
  add(issues, testCase.routeCoverage.length > 0, "ROUTE_COVERAGE_REQUIRED");
  if (testCase.intent === "estimate") {
    add(issues, testCase.expectedTool === "calculate_global_estimate", "ESTIMATE_TOOL_MUST_BE_GLOBAL_ESTIMATE");
    add(issues, Boolean(testCase.templateId), "ESTIMATE_TEMPLATE_REQUIRED");
    add(issues, testCase.requiresPdfAction, "ESTIMATE_PDF_ACTION_REQUIRED");
    add(issues, testCase.requiresTaxStatusOrWarning, "ESTIMATE_TAX_STATUS_REQUIRED");
  }
  if (testCase.intent === "product_search") {
    add(issues, testCase.expectedTool === "search_material_products" || testCase.expectedTool === "search_marketplace_products", "PRODUCT_TOOL_INVALID");
    add(issues, Boolean(testCase.productSearch), "PRODUCT_POLICY_REQUIRED");
    add(issues, !testCase.requiresPdfAction, "PRODUCT_PDF_ACTION_NOT_REQUIRED");
  }
  if (testCase.dangerousWork) {
    add(issues, testCase.noDiyInstructionsRequired, "DANGEROUS_NO_DIY_REQUIRED");
    add(issues, testCase.specialistReviewRequired, "DANGEROUS_SPECIALIST_REVIEW_REQUIRED");
  }
  return {
    valid: issues.length === 0,
    issues,
  };
}

export function validateBuiltInAi50000Phase1Manifest(cases: readonly BuiltInAi50000Phase1Case[]): BuiltInAi50000CaseValidation {
  const issues: string[] = [];
  add(issues, cases.length === BUILT_IN_AI_50000_PHASE1_CASES_TOTAL, "PHASE1_CASE_COUNT_INVALID");
  const ids = cases.map((testCase) => testCase.id);
  add(issues, new Set(ids).size === ids.length, "DUPLICATE_CASE_IDS");
  for (const criticalId of BUILT_IN_AI_50000_PHASE1_CRITICAL_CASE_IDS) {
    add(issues, ids.includes(criticalId), `CRITICAL_CASE_MISSING:${criticalId}`);
  }
  const macroCounts = cases.reduce<Record<string, number>>((summary, testCase) => {
    summary[testCase.macroDomainId] = (summary[testCase.macroDomainId] ?? 0) + 1;
    return summary;
  }, {});
  add(issues, Object.keys(macroCounts).length === 25, "MACRO_DOMAIN_COVERAGE_INVALID");
  for (const [macroDomainId, count] of Object.entries(macroCounts)) {
    add(issues, count === BUILT_IN_AI_50000_PHASE1_CASES_PER_MACRO_DOMAIN, `MACRO_DOMAIN_COUNT_INVALID:${macroDomainId}:${count}`);
  }
  for (const testCase of cases) {
    const result = validateBuiltInAi50000Phase1Case(testCase);
    for (const issue of result.issues) {
      issues.push(`${testCase.id}:${issue}`);
    }
  }
  return {
    valid: issues.length === 0,
    issues,
  };
}

const KNOWN_UNITS = new Set(["sq_m", "linear_m", "pcs", "kg", "set"]);
const FORBIDDEN_WORK_KEYS = new Set(["construction_work", "generic_construction_work", "other"]);

export function validateBuiltInAi50000FullCase(testCase: BuiltInAi50000Case): BuiltInAi50000CaseValidation {
  const issues: string[] = [];
  add(issues, testCase.id.length > 0, "CASE_ID_REQUIRED");
  add(issues, Number.isInteger(testCase.shardId) && testCase.shardId >= 0 && testCase.shardId < BUILT_IN_AI_50000_TARGET_SHARDS_TOTAL, "SHARD_ID_INVALID");
  add(issues, testCase.macroDomainId.length > 0, "MACRO_DOMAIN_REQUIRED");
  add(issues, testCase.domainId.length > 0, "DOMAIN_REQUIRED");
  add(issues, testCase.workKey.length > 0 && !FORBIDDEN_WORK_KEYS.has(testCase.workKey), "WORK_KEY_INVALID");
  add(issues, testCase.promptRu.length > 0, "PROMPT_REQUIRED");
  add(issues, testCase.expectedTool.length > 0, "EXPECTED_TOOL_REQUIRED");
  add(issues, testCase.requiredRateKeys.length > 0, "RATE_KEYS_REQUIRED");
  add(issues, testCase.expectedRowsContain.length > 0, "EXPECTED_ROWS_REQUIRED");
  add(issues, testCase.forbiddenRowsContain.length > 0, "FORBIDDEN_ROWS_REQUIRED");
  add(issues, testCase.routeCoverage.length > 0, "ROUTE_COVERAGE_REQUIRED");
  if (testCase.unit) add(issues, KNOWN_UNITS.has(testCase.unit), `UNKNOWN_UNIT:${testCase.unit}`);
  if (testCase.intent === "estimate") {
    add(issues, testCase.expectedTool === "calculate_global_estimate", "ESTIMATE_TOOL_MUST_BE_GLOBAL_ESTIMATE");
    add(issues, Boolean(testCase.templateId), "ESTIMATE_TEMPLATE_REQUIRED");
    add(issues, testCase.requiredRateKeys.length > 0, "ESTIMATE_RATE_KEYS_REQUIRED");
    add(issues, testCase.requiresPdfAction, "ESTIMATE_PDF_ACTION_REQUIRED");
    add(issues, testCase.requiresTaxStatusOrWarning, "ESTIMATE_TAX_STATUS_REQUIRED");
  }
  if (testCase.intent === "product_search") {
    add(issues, testCase.expectedTool === "search_material_products" || testCase.expectedTool === "search_marketplace_products", "PRODUCT_TOOL_INVALID");
    add(issues, Boolean(testCase.productSearch), "PRODUCT_POLICY_REQUIRED");
    add(issues, !testCase.requiresPdfAction, "PRODUCT_PDF_ACTION_NOT_REQUIRED");
  }
  if (testCase.dangerousWork) {
    add(issues, testCase.noDiyInstructionsRequired, "DANGEROUS_NO_DIY_REQUIRED");
    add(issues, testCase.specialistReviewRequired, "DANGEROUS_SPECIALIST_REVIEW_REQUIRED");
  }
  return {
    valid: issues.length === 0,
    issues,
  };
}

export function validateBuiltInAi50000FullManifest(cases: readonly BuiltInAi50000Case[]): BuiltInAi50000CaseValidation {
  const issues: string[] = [];
  add(issues, cases.length === BUILT_IN_AI_50000_TARGET_CASES_TOTAL, "FULL_CASE_COUNT_INVALID");
  const ids = cases.map((testCase) => testCase.id);
  const prompts = cases.map((testCase) => testCase.promptRu);
  add(issues, new Set(ids).size === ids.length, "DUPLICATE_CASE_IDS");
  add(issues, new Set(prompts).size === prompts.length, "DUPLICATE_PROMPTS_WITHOUT_VARIANT");
  for (const criticalId of BUILT_IN_AI_50000_PHASE1_CRITICAL_CASE_IDS) {
    add(issues, ids.includes(criticalId), `CRITICAL_CASE_MISSING:${criticalId}`);
  }
  const macroCounts = cases.reduce<Record<string, number>>((summary, testCase) => {
    summary[testCase.macroDomainId] = (summary[testCase.macroDomainId] ?? 0) + 1;
    return summary;
  }, {});
  const domainCounts = cases.reduce<Record<string, number>>((summary, testCase) => {
    summary[testCase.domainId] = (summary[testCase.domainId] ?? 0) + 1;
    return summary;
  }, {});
  const shardCounts = cases.reduce<Record<string, number>>((summary, testCase) => {
    summary[String(testCase.shardId)] = (summary[String(testCase.shardId)] ?? 0) + 1;
    return summary;
  }, {});
  add(issues, Object.keys(macroCounts).length === BUILT_IN_AI_50000_TARGET_MACRO_DOMAINS_TOTAL, "MACRO_DOMAIN_COVERAGE_INVALID");
  add(issues, Object.keys(domainCounts).length === BUILT_IN_AI_50000_TARGET_DOMAINS_TOTAL, "DOMAIN_COVERAGE_INVALID");
  add(issues, Object.keys(shardCounts).length === BUILT_IN_AI_50000_TARGET_SHARDS_TOTAL, "SHARD_COVERAGE_INVALID");
  for (const [domainId, count] of Object.entries(domainCounts)) {
    add(issues, count === BUILT_IN_AI_50000_TARGET_CASES_PER_DOMAIN, `DOMAIN_CASE_COUNT_INVALID:${domainId}:${count}`);
  }
  for (const [shardId, count] of Object.entries(shardCounts)) {
    add(issues, count === BUILT_IN_AI_50000_TARGET_CASES_PER_SHARD, `SHARD_CASE_COUNT_INVALID:${shardId}:${count}`);
  }
  for (const testCase of cases) {
    const result = validateBuiltInAi50000FullCase(testCase);
    for (const issue of result.issues) {
      issues.push(`${testCase.id}:${issue}`);
    }
  }
  return {
    valid: issues.length === 0,
    issues,
  };
}
