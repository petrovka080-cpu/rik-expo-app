import { BUILT_IN_AI_50000_PHASE1_MACRO_DOMAINS } from "./builtInAi50000MacroDomains";
import {
  BUILT_IN_AI_50000_PHASE1_CASES_PER_MACRO_DOMAIN,
  BUILT_IN_AI_50000_PHASE1_CASES_TOTAL,
} from "./builtInAi50000Ontology";
import { buildBuiltInAi50000Phase1Cases } from "./builtInAi50000CaseGenerator";

export const BUILT_IN_AI_50000_PHASE1_CASES = buildBuiltInAi50000Phase1Cases(
  BUILT_IN_AI_50000_PHASE1_MACRO_DOMAINS,
);

export const BUILT_IN_AI_50000_PHASE1_ESTIMATE_CASES = Object.freeze(
  BUILT_IN_AI_50000_PHASE1_CASES.filter((testCase) => testCase.intent === "estimate"),
);

export const BUILT_IN_AI_50000_PHASE1_PRODUCT_CASES = Object.freeze(
  BUILT_IN_AI_50000_PHASE1_CASES.filter((testCase) => testCase.intent === "product_search"),
);

export const BUILT_IN_AI_50000_PHASE1_MACRO_DOMAIN_SUMMARY = Object.freeze(
  BUILT_IN_AI_50000_PHASE1_CASES.reduce<Record<string, number>>((summary, testCase) => {
    summary[testCase.macroDomainId] = (summary[testCase.macroDomainId] ?? 0) + 1;
    return summary;
  }, {}),
);

if (BUILT_IN_AI_50000_PHASE1_CASES.length !== BUILT_IN_AI_50000_PHASE1_CASES_TOTAL) {
  throw new Error(`BUILT_IN_AI_50000_PHASE1_CASE_COUNT_INVALID:${BUILT_IN_AI_50000_PHASE1_CASES.length}`);
}

for (const [macroDomainId, count] of Object.entries(BUILT_IN_AI_50000_PHASE1_MACRO_DOMAIN_SUMMARY)) {
  if (count !== BUILT_IN_AI_50000_PHASE1_CASES_PER_MACRO_DOMAIN) {
    throw new Error(`BUILT_IN_AI_50000_PHASE1_MACRO_DOMAIN_CASE_COUNT_INVALID:${macroDomainId}:${count}`);
  }
}
