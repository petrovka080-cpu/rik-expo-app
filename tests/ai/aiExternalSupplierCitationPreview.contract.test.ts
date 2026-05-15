import { ExternalIntelGateway } from "../../src/features/ai/externalIntel/ExternalIntelGateway";
import {
  AI_EXTERNAL_SUPPLIER_CITATION_PREVIEW_CONTRACT,
  previewAiExternalSupplierCitationPreview,
} from "../../src/features/ai/externalIntel/aiExternalSupplierCitationPreview";
import type {
  ExternalIntelProvider,
  ExternalIntelProviderFlags,
} from "../../src/features/ai/externalIntel/externalIntelTypes";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;
const input = {
  requestIdHash: "request_hash",
  items: [{ materialLabel: "Cement M400", quantity: 10, unit: "bag" }],
  location: "Bishkek",
  internalEvidenceRefs: ["internal_app:request:abc"],
  marketplaceChecked: true as const,
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

describe("AI external supplier citation preview", () => {
  it("keeps supplier preview citations-only and unable to create final actions", () => {
    expect(AI_EXTERNAL_SUPPLIER_CITATION_PREVIEW_CONTRACT).toMatchObject({
      internalFirstRequired: true,
      marketplaceCheckRequired: true,
      citationsRequired: true,
      externalLiveFetchDefault: false,
      previewOnly: true,
      supplierConfirmationAllowed: false,
      orderCreationAllowed: false,
      warehouseMutationAllowed: false,
      paymentCreationAllowed: false,
      rawHtmlReturned: false,
      mutationCount: 0,
      noFakeSuppliers: true,
    });
  });

  it("returns disabled preview honestly without fake suppliers", async () => {
    await expect(previewAiExternalSupplierCitationPreview({ auth: buyerAuth, input })).resolves.toMatchObject({
      contractId: "ai_external_supplier_citation_preview_v1",
      status: "external_policy_not_enabled",
      candidates: [],
      citations: [],
      citedPreview: true,
      citationsRequired: true,
      previewOnly: true,
      externalLiveFetchDefault: false,
      rawHtmlReturned: false,
      supplierConfirmationAllowed: false,
      orderCreationAllowed: false,
      warehouseMutationAllowed: false,
      paymentCreationAllowed: false,
      fakeSuppliersCreated: false,
      finalActionAllowed: false,
      mutationCount: 0,
      citationPolicyBlockers: [],
    });
  });

  it("maps approved provider output only when it has citation evidence", async () => {
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
              summary: "Cited external supplier preview.",
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

    await expect(
      previewAiExternalSupplierCitationPreview({
        auth: buyerAuth,
        input,
        gateway: new ExternalIntelGateway({ flags: liveFlags, provider }),
      }),
    ).resolves.toMatchObject({
      status: "loaded",
      candidates: [
        expect.objectContaining({
          supplierLabel: "Cited supplier",
          citationRef: "external:supplier:1",
          evidenceRefs: ["external:supplier:1"],
        }),
      ],
      citations: [expect.objectContaining({ urlHash: "hash_1" })],
      supplierConfirmationAllowed: false,
      orderCreationAllowed: false,
      paymentCreationAllowed: false,
      finalActionAllowed: false,
      mutationCount: 0,
    });
  });
});
