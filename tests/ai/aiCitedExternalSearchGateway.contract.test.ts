import { ExternalIntelGateway } from "../../src/features/ai/externalIntel/ExternalIntelGateway";
import {
  AI_CITED_EXTERNAL_SEARCH_GATEWAY_CONTRACT,
  AiCitedExternalSearchGateway,
} from "../../src/features/ai/externalIntel/aiCitedExternalSearchGateway";
import type {
  ExternalIntelProvider,
  ExternalIntelProviderFlags,
} from "../../src/features/ai/externalIntel/externalIntelTypes";

const input = {
  domain: "procurement" as const,
  query: "cement suppliers Bishkek",
  internalEvidenceRefs: ["internal_app:request:abc"],
  marketplaceChecked: true,
  sourcePolicyIds: ["supplier_public_catalog.default"],
  limit: 5,
};

const liveFlags: ExternalIntelProviderFlags = {
  externalLiveFetchEnabled: true,
  provider: "approved_search_api",
  liveFetchRequested: true,
  requireInternalEvidence: true,
  requireMarketplaceCheck: true,
  requireCitations: true,
  maxResults: 5,
  timeoutMs: 8000,
  cacheTtlMs: 86400000,
  approvedProviderConfigured: true,
};

describe("AI cited external search gateway", () => {
  it("returns an honest disabled preview by default without provider calls or mutations", async () => {
    expect(AI_CITED_EXTERNAL_SEARCH_GATEWAY_CONTRACT).toMatchObject({
      citationsRequired: true,
      externalLiveFetchDefault: false,
      previewOnly: true,
      mutationCount: 0,
      rawHtmlReturned: false,
      uncontrolledExternalFetch: false,
      finalActionAllowed: false,
    });

    await expect(new AiCitedExternalSearchGateway().citedSearchPreview(input)).resolves.toMatchObject({
      contractId: "ai_cited_external_search_gateway_v1",
      status: "external_policy_not_enabled",
      sourceTrustStatus: "preview_ready_live_fetch_disabled",
      results: [],
      citations: [],
      citationsRequired: true,
      externalResultConfidenceRequired: true,
      externalResultConfidence: "none",
      previewOnly: true,
      controlledExternalFetchRequired: true,
      uncontrolledExternalFetch: false,
      rawHtmlReturned: false,
      rawHtmlReturnedToClient: false,
      mutationCount: 0,
      providerCalled: false,
      supplierConfirmed: false,
      orderCreated: false,
      warehouseMutated: false,
      paymentCreated: false,
      citationPolicyBlockers: [],
    });
  });

  it("allows only provider results with matching citations and evidence", async () => {
    const provider: ExternalIntelProvider = {
      provider: "approved_search_api",
      async searchPreview() {
        return {
          status: "loaded",
          providerCalled: true,
          mutationCount: 0,
          rawHtmlReturned: false,
          results: [
            {
              title: "Cited supplier",
              sourceId: "supplier_public_catalog.default",
              sourceCategory: "supplier_public_catalog",
              summary: "Preview-only cited supplier result.",
              urlHash: "hash_1",
              checkedAt: "2026-05-14T00:00:00.000Z",
              freshness: "fresh",
              evidenceRef: "external:supplier:1",
            },
          ],
          citations: [
            {
              sourceId: "supplier_public_catalog.default",
              title: "Cited supplier",
              urlHash: "hash_1",
              checkedAt: "2026-05-14T00:00:00.000Z",
            },
          ],
        };
      },
    };
    const gateway = new AiCitedExternalSearchGateway({
      gateway: new ExternalIntelGateway({ flags: liveFlags, provider }),
      flags: liveFlags,
    });

    await expect(gateway.citedSearchPreview(input)).resolves.toMatchObject({
      status: "loaded",
      externalResultConfidence: "low",
      results: [expect.objectContaining({ evidenceRef: "external:supplier:1" })],
      citations: [expect.objectContaining({ urlHash: "hash_1" })],
      mutationCount: 0,
      rawHtmlReturned: false,
    });
  });

  it("blocks live results whose citations do not match returned evidence", async () => {
    const provider: ExternalIntelProvider = {
      provider: "approved_search_api",
      async searchPreview() {
        return {
          status: "loaded",
          providerCalled: true,
          mutationCount: 0,
          rawHtmlReturned: false,
          results: [
            {
              title: "Uncited supplier",
              sourceId: "supplier_public_catalog.default",
              sourceCategory: "supplier_public_catalog",
              summary: "Missing matching citation.",
              urlHash: "hash_result",
              checkedAt: "2026-05-14T00:00:00.000Z",
              freshness: "fresh",
              evidenceRef: "external:supplier:missing-citation",
            },
          ],
          citations: [
            {
              sourceId: "supplier_public_catalog.default",
              title: "Different citation",
              urlHash: "hash_other",
              checkedAt: "2026-05-14T00:00:00.000Z",
            },
          ],
        };
      },
    };
    const gateway = new AiCitedExternalSearchGateway({
      gateway: new ExternalIntelGateway({ flags: liveFlags, provider }),
      flags: liveFlags,
    });

    await expect(gateway.citedSearchPreview(input)).resolves.toMatchObject({
      status: "blocked",
      providerCalled: true,
      results: [],
      citations: [],
      citationPolicyBlockers: ["BLOCKED_EXTERNAL_RESULT_WITHOUT_CITATION"],
      mutationCount: 0,
      rawHtmlReturned: false,
    });
  });
});
