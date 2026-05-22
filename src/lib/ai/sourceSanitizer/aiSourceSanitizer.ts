import type { AiDomainContextBundle, AiDomainQueryResult, AiDomainSourceRef } from "../domainDataGateway/aiDomainContextBundle";

const FORBIDDEN_SOURCE_TOKENS = [
  "providerPayload",
  "rawRows",
  "rawDb",
  "select(*)",
  "sourceRef:",
  "sourceRef=",
  "mediaAssetId",
  "storageKey",
  "runtime_debug",
  "debug_provider",
] as const;

function sanitizeText(value: string): string {
  return FORBIDDEN_SOURCE_TOKENS.reduce(
    (text, token) => text.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "[sanitized]"),
    value,
  );
}

function sanitizeSourceRef(sourceRef: AiDomainSourceRef): AiDomainSourceRef {
  return {
    ...sourceRef,
    labelRu: sanitizeText(sourceRef.labelRu),
    permission: {
      ...sourceRef.permission,
      reasonRu: sourceRef.permission.reasonRu ? sanitizeText(sourceRef.permission.reasonRu) : undefined,
    },
    appLink: sourceRef.appLink
      ? {
          ...sourceRef.appLink,
          highlightText: sourceRef.appLink.highlightText ? sanitizeText(sourceRef.appLink.highlightText) : undefined,
        }
      : undefined,
  };
}

export function sanitizeAiDomainQueryResult(result: AiDomainQueryResult): AiDomainQueryResult {
  return {
    ...result,
    summaryRu: sanitizeText(result.summaryRu),
    facts: result.facts.map((fact) => ({
      ...fact,
      textRu: sanitizeText(fact.textRu),
    })),
    sourceRefs: result.sourceRefs.map(sanitizeSourceRef),
    openLinks: result.openLinks.map((link) => ({
      ...link,
      labelRu: sanitizeText(link.labelRu),
      disabledReasonRu: link.disabledReasonRu ? sanitizeText(link.disabledReasonRu) : undefined,
    })),
    missingData: result.missingData.map(sanitizeText),
    permissionLimits: result.permissionLimits.map((limit) => ({
      hiddenSourceType: sanitizeText(limit.hiddenSourceType),
      reasonRu: sanitizeText(limit.reasonRu),
    })),
    checkedSources: result.checkedSources.map((source) => ({
      ...source,
      sourceRu: sanitizeText(source.sourceRu),
    })),
    freshness: {
      ...result.freshness,
      reasonRu: result.freshness.reasonRu ? sanitizeText(result.freshness.reasonRu) : undefined,
    },
  };
}

export function sanitizeAiDomainContextBundle(bundle: AiDomainContextBundle): AiDomainContextBundle {
  const domainResults = bundle.domainResults.map(sanitizeAiDomainQueryResult);
  return {
    ...bundle,
    domainResults,
    mergedFacts: bundle.mergedFacts.map((fact) => ({
      ...fact,
      textRu: sanitizeText(fact.textRu),
    })),
    mergedSourceRefs: bundle.mergedSourceRefs.map(sanitizeSourceRef),
    mergedOpenLinks: bundle.mergedOpenLinks.map((link) => ({
      ...link,
      labelRu: sanitizeText(link.labelRu),
      disabledReasonRu: link.disabledReasonRu ? sanitizeText(link.disabledReasonRu) : undefined,
    })),
    crossDomainChain: bundle.crossDomainChain.map((step) => ({
      ...step,
      stepRu: sanitizeText(step.stepRu),
    })),
    missingData: bundle.missingData.map(sanitizeText),
    permissionLimits: bundle.permissionLimits.map((limit) => ({
      hiddenSourceType: sanitizeText(limit.hiddenSourceType),
      reasonRu: sanitizeText(limit.reasonRu),
    })),
    checkedSources: bundle.checkedSources.map((source) => ({
      ...source,
      sourceRu: sanitizeText(source.sourceRu),
    })),
  };
}

export function findAiSourceSanitizerLeaks(value: unknown): string[] {
  const serialized = JSON.stringify(value);
  return FORBIDDEN_SOURCE_TOKENS.filter((token) => serialized.toLowerCase().includes(token.toLowerCase()));
}

export function getAiSourceSanitizerForbiddenTokens(): readonly string[] {
  return FORBIDDEN_SOURCE_TOKENS;
}
