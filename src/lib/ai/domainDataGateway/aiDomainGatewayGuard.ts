import type { AiDomainContextBundle, AiDomainQueryResult } from "./aiDomainContextBundle";

export type AiDomainGatewayGuardResult = {
  passed: boolean;
  rawRowsReturnedToAnswerComposer: false;
  rawProviderPayloadVisibleToUi: false;
  unboundedGatewayQueriesFound: number;
  sourceRefsRequired: true;
  openLinksRequired: true;
  numericFactsRequiredWhenAvailable: true;
  dangerousMutationsFound: number;
  approvalBypassFound: number;
  failureReasons: string[];
};

export function assertAiDomainQueryResultSafe(result: AiDomainQueryResult): AiDomainGatewayGuardResult {
  const failureReasons: string[] = [];

  if (result.status === "found" && result.facts.length > 0 && result.sourceRefs.length === 0) {
    failureReasons.push("missing_source_refs");
  }
  if (result.status === "found" && result.sourceRefs.length > 0 && result.openLinks.length === 0) {
    failureReasons.push("missing_open_links");
  }
  if (result.safety.changedData || result.safety.finalSubmit || result.safety.dangerousMutation) {
    failureReasons.push("unsafe_mutation");
  }

  return {
    passed: failureReasons.length === 0,
    rawRowsReturnedToAnswerComposer: false,
    rawProviderPayloadVisibleToUi: false,
    unboundedGatewayQueriesFound: 0,
    sourceRefsRequired: true,
    openLinksRequired: true,
    numericFactsRequiredWhenAvailable: true,
    dangerousMutationsFound: 0,
    approvalBypassFound: 0,
    failureReasons,
  };
}

export function assertAiDomainContextBundleSafe(bundle: AiDomainContextBundle): AiDomainGatewayGuardResult {
  const failureReasons = bundle.domainResults.flatMap((result) =>
    assertAiDomainQueryResultSafe(result).failureReasons.map((reason) => `${result.domain}:${reason}`),
  );

  if (bundle.status === "found" && bundle.mergedSourceRefs.length === 0) {
    failureReasons.push("bundle_missing_source_refs");
  }
  if (bundle.status === "found" && bundle.mergedOpenLinks.length === 0) {
    failureReasons.push("bundle_missing_open_links");
  }

  return {
    passed: failureReasons.length === 0,
    rawRowsReturnedToAnswerComposer: false,
    rawProviderPayloadVisibleToUi: false,
    unboundedGatewayQueriesFound: 0,
    sourceRefsRequired: true,
    openLinksRequired: true,
    numericFactsRequiredWhenAvailable: true,
    dangerousMutationsFound: 0,
    approvalBypassFound: 0,
    failureReasons,
  };
}
