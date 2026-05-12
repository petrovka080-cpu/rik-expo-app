import { ExternalIntelGateway } from "../../src/features/ai/externalIntel/ExternalIntelGateway";
import type {
  ExternalIntelProvider,
  ExternalIntelProviderFlags,
} from "../../src/features/ai/externalIntel/externalIntelTypes";

const disabledInput = {
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

describe("external intelligence gateway", () => {
  it("uses the disabled provider by default and makes no network-backed provider call", async () => {
    await expect(new ExternalIntelGateway().searchPreview(disabledInput)).resolves.toMatchObject({
      status: "external_policy_not_enabled",
      internalFirst: true,
      externalChecked: false,
      results: [],
      citations: [],
      nextAction: "explain",
      forbiddenForFinalAction: true,
      mutationCount: 0,
      providerCalled: false,
      rawHtmlReturned: false,
    });
  });

  it("returns provider-not-configured when live flags are enabled without an approved provider adapter", async () => {
    await expect(
      new ExternalIntelGateway({
        flags: {
          ...liveFlags,
          approvedProviderConfigured: false,
        },
      }).searchPreview(disabledInput),
    ).resolves.toMatchObject({
      status: "external_provider_not_configured",
      externalChecked: false,
      providerCalled: false,
    });
  });

  it("blocks lookup without internal evidence before external sources", async () => {
    await expect(
      new ExternalIntelGateway().searchPreview({
        ...disabledInput,
        internalEvidenceRefs: [],
      }),
    ).resolves.toMatchObject({
      status: "blocked",
      externalChecked: false,
      nextAction: "blocked",
    });
  });

  it("redacts provider errors and does not expose provider payloads", async () => {
    const throwingProvider: ExternalIntelProvider = {
      provider: "approved_search_api",
      async searchPreview() {
        throw new Error("provider failure with hidden details");
      },
    };

    await expect(
      new ExternalIntelGateway({
        flags: liveFlags,
        provider: throwingProvider,
      }).searchPreview(disabledInput),
    ).resolves.toMatchObject({
      status: "blocked",
      externalChecked: false,
      results: [],
      citations: [],
      providerCalled: true,
      rawHtmlReturned: false,
    });
  });
});
