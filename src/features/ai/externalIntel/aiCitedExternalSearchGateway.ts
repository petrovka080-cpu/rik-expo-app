import { createExternalIntelGateway, type ExternalIntelGateway } from "./ExternalIntelGateway";
import { validateAiExternalCitations } from "./aiExternalCitationPolicy";
import {
  AI_EXTERNAL_SOURCE_TRUST_POLICY_CONTRACT,
  resolveAiExternalSourceTrustPolicy,
  type AiExternalSourceTrustPolicyDecision,
} from "./aiExternalSourceTrustPolicy";
import type {
  ExternalIntelProviderFlags,
  ExternalIntelSearchPreviewInput,
  ExternalIntelSearchPreviewOutput,
} from "./externalIntelTypes";

export const AI_CITED_EXTERNAL_SEARCH_GATEWAY_CONTRACT = Object.freeze({
  contractId: "ai_cited_external_search_gateway_v1",
  internalFirstRequired: true,
  marketplaceCheckRequired: true,
  citationsRequired: true,
  externalLiveFetchDefault: false,
  external_live_fetch_default: false,
  previewOnly: true,
  mutationCount: 0,
  rawHtmlReturned: false,
  externalResultConfidenceRequired: true,
  uncontrolledExternalFetch: false,
  finalActionAllowed: false,
} as const);

export type AiCitedExternalSearchPreviewOutput = ExternalIntelSearchPreviewOutput & {
  contractId: typeof AI_CITED_EXTERNAL_SEARCH_GATEWAY_CONTRACT.contractId;
  citedPreview: true;
  sourceTrustStatus: AiExternalSourceTrustPolicyDecision["status"];
  citationsRequired: true;
  externalResultConfidenceRequired: true;
  externalResultConfidence: "none" | "low" | "medium";
  previewOnly: true;
  controlledExternalFetchRequired: true;
  uncontrolledExternalFetch: false;
  rawHtmlReturnedToClient: false;
  supplierConfirmed: false;
  orderCreated: false;
  warehouseMutated: false;
  paymentCreated: false;
  citationPolicyBlockers: readonly string[];
};

function decorate(
  output: ExternalIntelSearchPreviewOutput,
  sourceTrust: AiExternalSourceTrustPolicyDecision,
  citationPolicyBlockers: readonly string[] = [],
): AiCitedExternalSearchPreviewOutput {
  return {
    ...output,
    contractId: AI_CITED_EXTERNAL_SEARCH_GATEWAY_CONTRACT.contractId,
    citedPreview: true,
    sourceTrustStatus: sourceTrust.status,
    citationsRequired: true,
    externalResultConfidenceRequired: true,
    externalResultConfidence: output.results.length === 0 ? "none" : "low",
    previewOnly: true,
    controlledExternalFetchRequired: true,
    uncontrolledExternalFetch: false,
    rawHtmlReturned: false,
    rawHtmlReturnedToClient: false,
    mutationCount: 0,
    supplierConfirmed: false,
    orderCreated: false,
    warehouseMutated: false,
    paymentCreated: false,
    citationPolicyBlockers,
  };
}

function blockedOutput(
  sourceTrust: AiExternalSourceTrustPolicyDecision,
  providerCalled = false,
  citationPolicyBlockers: readonly string[] = [],
): AiCitedExternalSearchPreviewOutput {
  return decorate(
    {
      status: "blocked",
      internalFirst: true,
      externalChecked: false,
      externalStatus: "blocked",
      results: [],
      citations: [],
      nextAction: "blocked",
      forbiddenForFinalAction: true,
      mutationCount: 0,
      providerCalled,
      rawHtmlReturned: false,
    },
    sourceTrust,
    citationPolicyBlockers,
  );
}

export class AiCitedExternalSearchGateway {
  private readonly gateway: ExternalIntelGateway;
  private readonly flags?: ExternalIntelProviderFlags;

  constructor(params: {
    gateway?: ExternalIntelGateway;
    flags?: ExternalIntelProviderFlags;
  } = {}) {
    this.gateway = params.gateway ?? createExternalIntelGateway({ flags: params.flags });
    this.flags = params.flags;
  }

  async citedSearchPreview(
    input: ExternalIntelSearchPreviewInput,
  ): Promise<AiCitedExternalSearchPreviewOutput> {
    const sourceTrust = resolveAiExternalSourceTrustPolicy(input, this.flags);
    if (!sourceTrust.allowed) {
      return blockedOutput(sourceTrust);
    }

    const output = await this.gateway.searchPreview(input);
    const citationPolicy = validateAiExternalCitations(output);
    if (!citationPolicy.ok) {
      return blockedOutput(sourceTrust, output.providerCalled, citationPolicy.blockers);
    }

    return decorate(output, sourceTrust);
  }
}

export function createAiCitedExternalSearchGateway(params: {
  gateway?: ExternalIntelGateway;
  flags?: ExternalIntelProviderFlags;
} = {}): AiCitedExternalSearchGateway {
  return new AiCitedExternalSearchGateway(params);
}

export const AI_CITED_EXTERNAL_SEARCH_GATEWAY_SOURCE_TRUST_CONTRACT =
  AI_EXTERNAL_SOURCE_TRUST_POLICY_CONTRACT;
