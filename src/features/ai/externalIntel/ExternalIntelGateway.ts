import { DisabledExternalIntelProvider } from "./DisabledExternalIntelProvider";
import { resolveInternalFirstExternalGate } from "./internalFirstExternalGate";
import { resolveExternalIntelProviderFlags } from "./externalIntelProviderFlags";
import { EXTERNAL_SOURCE_REGISTRY } from "./externalSourceRegistry";
import {
  hashExternalIntelUrl,
  redactExternalIntelProviderError,
  redactExternalIntelQuery,
} from "./externalIntelRedaction";
import type {
  ExternalIntelCitation,
  ExternalIntelDomain,
  ExternalIntelProvider,
  ExternalIntelProviderFlags,
  ExternalIntelSearchPreviewInput,
  ExternalIntelSearchPreviewOutput,
  ExternalIntelSearchResult,
  ExternalIntelSourcesResponse,
  ExternalSourcePolicy,
} from "./externalIntelTypes";

const DEFAULT_EXTERNAL_INTEL_LIMIT = 5;
const MAX_EXTERNAL_INTEL_LIMIT = 5;

function clampLimit(limit: number | undefined, flags: ExternalIntelProviderFlags): number {
  const requested = Number.isFinite(limit) && Number(limit) > 0 ? Math.floor(Number(limit)) : DEFAULT_EXTERNAL_INTEL_LIMIT;
  return Math.min(requested, flags.maxResults, MAX_EXTERNAL_INTEL_LIMIT);
}

function emptyOutput(params: {
  status: ExternalIntelSearchPreviewOutput["status"];
  externalChecked: boolean;
  nextAction: ExternalIntelSearchPreviewOutput["nextAction"];
  providerCalled?: boolean;
}): ExternalIntelSearchPreviewOutput {
  return {
    status: params.status,
    internalFirst: true,
    externalChecked: params.externalChecked,
    externalStatus: params.status,
    results: [],
    citations: [],
    nextAction: params.nextAction,
    forbiddenForFinalAction: true,
    mutationCount: 0,
    providerCalled: params.providerCalled ?? false,
    rawHtmlReturned: false,
  };
}

function policiesForInput(input: ExternalIntelSearchPreviewInput): ExternalSourcePolicy[] {
  const requested = new Set(input.sourcePolicyIds);
  return EXTERNAL_SOURCE_REGISTRY.filter(
    (policy) => requested.has(policy.sourceId) && policy.allowedDomains.includes(input.domain),
  );
}

function normalizeResult(result: ExternalIntelSearchResult): ExternalIntelSearchResult | null {
  if (
    !result.title.trim() ||
    !result.sourceId.trim() ||
    !result.summary.trim() ||
    !result.checkedAt.trim() ||
    !result.evidenceRef.trim()
  ) {
    return null;
  }

  return {
    title: result.title.slice(0, 160),
    sourceId: result.sourceId,
    sourceCategory: result.sourceCategory,
    summary: result.summary.slice(0, 320),
    urlHash: result.urlHash.trim() || hashExternalIntelUrl(`${result.sourceId}:${result.title}`),
    checkedAt: result.checkedAt,
    freshness: result.freshness,
    evidenceRef: result.evidenceRef,
  };
}

function citationsForResults(results: readonly ExternalIntelSearchResult[]): ExternalIntelCitation[] {
  return results.map((result) => ({
    sourceId: result.sourceId,
    title: result.title,
    urlHash: result.urlHash,
    checkedAt: result.checkedAt,
  }));
}

export class ExternalIntelGateway {
  private readonly provider: ExternalIntelProvider;
  private readonly flags: ExternalIntelProviderFlags;

  constructor(params: {
    provider?: ExternalIntelProvider;
    flags?: ExternalIntelProviderFlags;
  } = {}) {
    this.provider = params.provider ?? new DisabledExternalIntelProvider();
    this.flags = params.flags ?? resolveExternalIntelProviderFlags();
  }

  listSources(): ExternalIntelSourcesResponse {
    return {
      liveEnabled: this.flags.externalLiveFetchEnabled,
      provider: this.flags.provider,
      sources: EXTERNAL_SOURCE_REGISTRY.map((policy) => ({ ...policy })),
    };
  }

  async searchPreview(input: ExternalIntelSearchPreviewInput): Promise<ExternalIntelSearchPreviewOutput> {
    const redaction = redactExternalIntelQuery(input.query);
    if (!redaction.safe) {
      return emptyOutput({
        status: "blocked",
        externalChecked: false,
        nextAction: "blocked",
      });
    }

    const policies = policiesForInput(input);
    const domain = input.domain as ExternalIntelDomain;
    const gate = resolveInternalFirstExternalGate({
      domain,
      internalDataChecked: input.internalEvidenceRefs.length > 0,
      marketplaceChecked: input.marketplaceChecked,
      internalEvidenceRefs: input.internalEvidenceRefs,
      sourcePolicyIds: policies.map((policy) => policy.sourceId),
    });

    if (!gate.allowed) {
      return emptyOutput({
        status: "blocked",
        externalChecked: false,
        nextAction: "blocked",
      });
    }

    if (!this.flags.externalLiveFetchEnabled) {
      return emptyOutput({
        status: "external_policy_not_enabled",
        externalChecked: false,
        nextAction: "explain",
      });
    }

    if (
      this.flags.provider !== "approved_search_api" ||
      !this.flags.approvedProviderConfigured ||
      this.provider.provider !== "approved_search_api"
    ) {
      return emptyOutput({
        status: "external_provider_not_configured",
        externalChecked: false,
        nextAction: "explain",
      });
    }

    try {
      const providerOutput = await this.provider.searchPreview({
        domain: input.domain,
        query: redaction.redactedQuery,
        location: input.location,
        policies,
        limit: clampLimit(input.limit, this.flags),
      });
      const normalizedResults = providerOutput.results
        .map(normalizeResult)
        .filter((result): result is ExternalIntelSearchResult => result !== null);
      if (
        providerOutput.rawHtmlReturned !== false ||
        normalizedResults.length !== providerOutput.results.length ||
        providerOutput.citations.some((citation) => !citation.sourceId || !citation.urlHash || !citation.checkedAt)
      ) {
        return emptyOutput({
          status: "blocked",
          externalChecked: false,
          nextAction: "blocked",
          providerCalled: providerOutput.providerCalled,
        });
      }

      const citations = providerOutput.citations.length > 0
        ? providerOutput.citations
        : citationsForResults(normalizedResults);
      return {
        status: normalizedResults.length > 0 ? "loaded" : "empty",
        internalFirst: true,
        externalChecked: true,
        externalStatus: normalizedResults.length > 0 ? "loaded" : "empty",
        results: normalizedResults,
        citations,
        nextAction: normalizedResults.length > 0 ? "draft" : "explain",
        forbiddenForFinalAction: true,
        mutationCount: 0,
        providerCalled: providerOutput.providerCalled,
        rawHtmlReturned: false,
      };
    } catch (error) {
      redactExternalIntelProviderError(error);
      return emptyOutput({
        status: "blocked",
        externalChecked: false,
        nextAction: "blocked",
        providerCalled: true,
      });
    }
  }
}

export function createExternalIntelGateway(params: {
  provider?: ExternalIntelProvider;
  flags?: ExternalIntelProviderFlags;
} = {}): ExternalIntelGateway {
  return new ExternalIntelGateway(params);
}
