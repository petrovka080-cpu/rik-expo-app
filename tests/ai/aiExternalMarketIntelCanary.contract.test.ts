import { ExternalIntelGateway } from "../../src/features/ai/externalIntel/ExternalIntelGateway";
import { listAiExternalProviderCapabilities } from "../../src/features/ai/externalIntel/aiExternalProviderRegistry";
import { validateAiExternalCitations } from "../../src/features/ai/externalIntel/aiExternalCitationPolicy";
import { resolveAiExternalSearchPolicy } from "../../src/features/ai/externalIntel/aiExternalSearchPolicy";
import {
  AI_EXTERNAL_SUPPLIER_CANDIDATE_CANARY_CONTRACT,
  previewAiExternalSupplierCandidatesCanary,
} from "../../src/features/ai/externalIntel/aiExternalSupplierCandidatePreview";
import type {
  ExternalIntelProvider,
  ExternalIntelProviderFlags,
} from "../../src/features/ai/externalIntel/externalIntelTypes";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

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

describe("AI external market intelligence canary", () => {
  it("keeps provider capabilities disabled by default and preview-only", () => {
    expect(listAiExternalProviderCapabilities()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: "disabled",
          liveFetchEnabledByDefault: false,
          citationsRequired: true,
          mutationCount: 0,
          finalActionAllowed: false,
          mobileApiKeyAllowed: false,
        }),
        expect.objectContaining({
          provider: "approved_search_api",
          liveFetchEnabledByDefault: false,
          controlledExternalFetchRequired: true,
          rawHtmlReturned: false,
        }),
      ]),
    );
  });

  it("requires internal evidence and marketplace check before external preview", () => {
    expect(resolveAiExternalSearchPolicy(input)).toMatchObject({
      allowed: true,
      status: "external_live_fetch_disabled",
      internalFirstRequired: true,
      marketplaceCheckRequired: true,
      citationsRequired: true,
      externalLiveFetchDefault: false,
      finalActionForbidden: true,
      mutationCount: 0,
      providerCalled: false,
    });
    expect(resolveAiExternalSearchPolicy({ ...input, internalEvidenceRefs: [] })).toMatchObject({
      allowed: false,
      status: "blocked_internal_first",
      blockers: ["BLOCKED_EXTERNAL_INTERNAL_FIRST_REQUIRED"],
    });
  });

  it("blocks results without matching citations or evidence", () => {
    expect(
      validateAiExternalCitations({
        rawHtmlReturned: false,
        citations: [],
        results: [
          {
            title: "Supplier",
            sourceId: "supplier_public_catalog.default",
            sourceCategory: "supplier_public_catalog",
            summary: "Preview only",
            urlHash: "url_hash",
            checkedAt: "2026-05-14T00:00:00.000Z",
            freshness: "fresh",
            evidenceRef: "external:supplier:1",
          },
        ],
      }),
    ).toMatchObject({
      ok: false,
      rawUrlReturned: false,
      rawHtmlReturned: false,
      blockers: ["BLOCKED_EXTERNAL_RESULT_WITHOUT_CITATION"],
    });
  });

  it("returns honest disabled status without creating external supplier candidates", async () => {
    await expect(
      previewAiExternalSupplierCandidatesCanary({
        auth: buyerAuth,
        input: {
          requestIdHash: "request_hash",
          items: [{ materialLabel: "Cement M400", quantity: 10, unit: "bag" }],
          location: "Bishkek",
          internalEvidenceRefs: ["internal_app:request:abc"],
          marketplaceChecked: true,
          limit: 5,
        },
      }),
    ).resolves.toMatchObject({
      status: "external_policy_not_enabled",
      candidates: [],
      citations: [],
      recommendationBoundary:
        "External candidate evidence is preview-only and forbidden for final supplier confirmation or order creation.",
      requiresApprovalForAction: true,
      finalActionAllowed: false,
      mutationCount: 0,
    });
  });

  it("maps approved provider results only as cited preview candidates", async () => {
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
      previewAiExternalSupplierCandidatesCanary({
        auth: buyerAuth,
        gateway: new ExternalIntelGateway({ flags: liveFlags, provider }),
        input: {
          requestIdHash: "request_hash",
          items: [{ materialLabel: "Cement M400", quantity: 10, unit: "bag" }],
          internalEvidenceRefs: ["internal_app:request:abc"],
          marketplaceChecked: true,
        },
      }),
    ).resolves.toMatchObject({
      status: "loaded",
      candidates: [
        expect.objectContaining({
          supplierLabel: "Cited supplier",
          citationRef: "external:supplier:1",
          evidenceRefs: ["external:supplier:1"],
          riskFlags: ["external_preview_only", "approval_required_for_action"],
        }),
      ],
      citations: [
        expect.objectContaining({
          sourceId: "supplier_public_catalog.default",
          urlHash: "hash_1",
        }),
      ],
      finalActionAllowed: false,
      mutationCount: 0,
    });
  });

  it("exports a no-mutation canary contract", () => {
    expect(AI_EXTERNAL_SUPPLIER_CANDIDATE_CANARY_CONTRACT).toMatchObject({
      internalFirstRequired: true,
      marketplaceCheckRequired: true,
      citationsRequired: true,
      externalLiveFetchDefault: false,
      previewOnly: true,
      mutationCount: 0,
      supplierConfirmationAllowed: false,
      orderCreationAllowed: false,
      finalActionAllowed: false,
      fakeSuppliersAllowed: false,
    });
  });
});
