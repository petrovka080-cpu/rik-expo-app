import { BUILT_IN_AI_10000_POST_BOQ_DOMAINS } from "./builtInAi10000PostBoqDomains";
import {
  BUILT_IN_AI_10000_POST_BOQ_CASES_PER_DOMAIN,
  BUILT_IN_AI_10000_POST_BOQ_CASES_TOTAL,
  buildBuiltInAi10000PostBoqCases,
} from "./builtInAi10000PostBoqGenerator";
import type { BuiltInAi10000PostBoqCase } from "./builtInAi10000PostBoqCaseTypes";

export const BUILT_IN_AI_10000_POST_BOQ_CASES: readonly BuiltInAi10000PostBoqCase[] =
  buildBuiltInAi10000PostBoqCases(BUILT_IN_AI_10000_POST_BOQ_DOMAINS);

export const BUILT_IN_AI_10000_POST_BOQ_ESTIMATE_CASES = Object.freeze(
  BUILT_IN_AI_10000_POST_BOQ_CASES.filter((testCase) => testCase.intent === "estimate"),
);

export const BUILT_IN_AI_10000_POST_BOQ_PRODUCT_CASES = Object.freeze(
  BUILT_IN_AI_10000_POST_BOQ_CASES.filter((testCase) => testCase.intent === "product_search"),
);

export const BUILT_IN_AI_10000_POST_BOQ_DOMAIN_SUMMARY = Object.freeze(
  BUILT_IN_AI_10000_POST_BOQ_CASES.reduce<Record<string, number>>((summary, testCase) => {
    summary[testCase.domainId] = (summary[testCase.domainId] ?? 0) + 1;
    return summary;
  }, {}),
);

export const BUILT_IN_AI_10000_POST_BOQ_MACRO_GROUP_SUMMARY = Object.freeze(
  BUILT_IN_AI_10000_POST_BOQ_DOMAINS.reduce<Record<string, number>>((summary, domain) => {
    summary[domain.macroGroupId] = (summary[domain.macroGroupId] ?? 0) + BUILT_IN_AI_10000_POST_BOQ_CASES_PER_DOMAIN;
    return summary;
  }, {}),
);

if (BUILT_IN_AI_10000_POST_BOQ_CASES.length !== BUILT_IN_AI_10000_POST_BOQ_CASES_TOTAL) {
  throw new Error(`BUILT_IN_AI_10000_POST_BOQ_CASE_COUNT_INVALID:${BUILT_IN_AI_10000_POST_BOQ_CASES.length}`);
}

for (const [domainId, count] of Object.entries(BUILT_IN_AI_10000_POST_BOQ_DOMAIN_SUMMARY)) {
  if (count !== BUILT_IN_AI_10000_POST_BOQ_CASES_PER_DOMAIN) {
    throw new Error(`BUILT_IN_AI_10000_POST_BOQ_DOMAIN_CASE_COUNT_INVALID:${domainId}:${count}`);
  }
}
