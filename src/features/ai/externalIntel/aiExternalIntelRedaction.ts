import {
  hashExternalIntelUrl,
  redactExternalIntelProviderError,
  redactExternalIntelQuery,
} from "./externalIntelRedaction";

export const AI_EXTERNAL_INTEL_REDACTION_CONTRACT = Object.freeze({
  contractId: "ai_external_intel_redaction_v1",
  rawUrlReturned: false,
  rawHtmlReturned: false,
  rawRowsReturned: false,
  secretsPrinted: false,
  maxQueryChars: 240,
} as const);

export type AiExternalIntelPreviewRedaction = {
  contractId: typeof AI_EXTERNAL_INTEL_REDACTION_CONTRACT.contractId;
  safe: boolean;
  redactedQuery: string;
  reason: string;
  rawUrlReturned: false;
  rawHtmlReturned: false;
  rawRowsReturned: false;
  secretsPrinted: false;
};

export function redactAiExternalIntelPreviewQuery(query: string): AiExternalIntelPreviewRedaction {
  const result = redactExternalIntelQuery(query);
  return {
    contractId: AI_EXTERNAL_INTEL_REDACTION_CONTRACT.contractId,
    safe: result.safe,
    redactedQuery: result.redactedQuery,
    reason: result.reason,
    rawUrlReturned: false,
    rawHtmlReturned: false,
    rawRowsReturned: false,
    secretsPrinted: false,
  };
}

export { hashExternalIntelUrl, redactExternalIntelProviderError };
