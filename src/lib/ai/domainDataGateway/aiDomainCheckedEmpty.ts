import { createAiDomainSafeStatus, type AiDomainQueryResult } from "./aiDomainContextBundle";
import { getAiDomainFreshness } from "./aiDomainFreshnessPolicy";
import type { AiDomainName } from "./aiDomainQueryTypes";

export function createAiDomainCheckedEmptyResult(input: {
  queryId: string;
  domain: AiDomainName;
  summaryRu: string;
  checkedSources: string[];
  missingData?: string[];
}): AiDomainQueryResult {
  return {
    queryId: input.queryId,
    domain: input.domain,
    status: "checked_empty",
    summaryRu: input.summaryRu,
    numericFacts: [],
    facts: [
      {
        textRu: input.summaryRu,
        sourceRefIds: [],
        status: "checked_empty",
      },
    ],
    sourceRefs: [],
    openLinks: [],
    linkedObjectRefs: [],
    missingData: input.missingData ?? [],
    permissionLimits: [],
    checkedSources: input.checkedSources.map((sourceRu) => ({
      sourceRu,
      status: "checked_empty",
    })),
    freshness: getAiDomainFreshness(input.domain),
    safety: createAiDomainSafeStatus(),
  };
}
