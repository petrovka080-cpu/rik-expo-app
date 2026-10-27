import { BUILT_IN_AI_50000_PHASE1_MACRO_DOMAINS } from "./builtInAi50000MacroDomains";
import {
  BUILT_IN_AI_50000_TARGET_CASES_PER_DOMAIN,
  BUILT_IN_AI_50000_TARGET_CASES_TOTAL,
  BUILT_IN_AI_50000_TARGET_DOMAINS_PER_MACRO_DOMAIN,
} from "./builtInAi50000Ontology";
import { buildBuiltInAi50000FullCases } from "./builtInAi50000FullGenerator";

export const BUILT_IN_AI_50000_FULL_CASES = buildBuiltInAi50000FullCases(
  BUILT_IN_AI_50000_PHASE1_MACRO_DOMAINS,
);

export const BUILT_IN_AI_50000_FULL_ESTIMATE_CASES = Object.freeze(
  BUILT_IN_AI_50000_FULL_CASES.filter((testCase) => testCase.intent === "estimate"),
);

export const BUILT_IN_AI_50000_FULL_PRODUCT_CASES = Object.freeze(
  BUILT_IN_AI_50000_FULL_CASES.filter((testCase) => testCase.intent === "product_search"),
);

export const BUILT_IN_AI_50000_FULL_MACRO_DOMAIN_SUMMARY = Object.freeze(
  BUILT_IN_AI_50000_FULL_CASES.reduce<Record<string, number>>((summary, testCase) => {
    summary[testCase.macroDomainId] = (summary[testCase.macroDomainId] ?? 0) + 1;
    return summary;
  }, {}),
);

export const BUILT_IN_AI_50000_FULL_DOMAIN_SUMMARY = Object.freeze(
  BUILT_IN_AI_50000_FULL_CASES.reduce<Record<string, number>>((summary, testCase) => {
    summary[testCase.domainId] = (summary[testCase.domainId] ?? 0) + 1;
    return summary;
  }, {}),
);

if (BUILT_IN_AI_50000_FULL_CASES.length !== BUILT_IN_AI_50000_TARGET_CASES_TOTAL) {
  throw new Error(`BUILT_IN_AI_50000_FULL_CASE_COUNT_INVALID:${BUILT_IN_AI_50000_FULL_CASES.length}`);
}

for (const [macroDomainId, count] of Object.entries(BUILT_IN_AI_50000_FULL_MACRO_DOMAIN_SUMMARY)) {
  if (count !== BUILT_IN_AI_50000_TARGET_DOMAINS_PER_MACRO_DOMAIN * BUILT_IN_AI_50000_TARGET_CASES_PER_DOMAIN) {
    throw new Error(`BUILT_IN_AI_50000_FULL_MACRO_DOMAIN_CASE_COUNT_INVALID:${macroDomainId}:${count}`);
  }
}

for (const [domainId, count] of Object.entries(BUILT_IN_AI_50000_FULL_DOMAIN_SUMMARY)) {
  if (count !== BUILT_IN_AI_50000_TARGET_CASES_PER_DOMAIN) {
    throw new Error(`BUILT_IN_AI_50000_FULL_DOMAIN_CASE_COUNT_INVALID:${domainId}:${count}`);
  }
}
