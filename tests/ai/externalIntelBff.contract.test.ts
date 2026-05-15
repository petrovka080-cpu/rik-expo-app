import {
  AGENT_BFF_ROUTE_DEFINITIONS,
  AGENT_EXTERNAL_INTEL_BFF_CONTRACT,
  getAgentExternalIntelSources,
  previewAgentExternalIntelCitedSearch,
  previewAgentExternalIntelSearch,
  previewAgentProcurementExternalSupplierPreview,
} from "../../src/features/ai/agent/agentBffRouteShell";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

describe("external intelligence BFF contracts", () => {
  it("exposes read-only external intel route contracts without provider secrets", () => {
    expect(AGENT_EXTERNAL_INTEL_BFF_CONTRACT).toMatchObject({
      contractId: "agent_external_intel_bff_v1",
      endpoints: [
        "GET /agent/external-intel/sources",
        "POST /agent/external-intel/search/preview",
        "POST /agent/external-intel/cited-search-preview",
      ],
      liveEnabled: false,
      provider: "disabled",
      readOnly: true,
      citationsRequired: true,
      checkedAtRequired: true,
      rawHtmlReturned: false,
      mutationCount: 0,
      finalActionAllowed: false,
      supplierConfirmationAllowed: false,
      orderCreationAllowed: false,
    });
    expect(AGENT_BFF_ROUTE_DEFINITIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: "agent.external_intel.sources.read",
          mutates: false,
          executesTool: false,
          callsModelProvider: false,
          callsDatabaseDirectly: false,
        }),
        expect.objectContaining({
          operation: "agent.external_intel.search.preview",
          mutates: false,
          executesTool: false,
          callsModelProvider: false,
          callsDatabaseDirectly: false,
        }),
        expect.objectContaining({
          operation: "agent.external_intel.cited_search.preview",
          mutates: false,
          executesTool: false,
          callsModelProvider: false,
          callsDatabaseDirectly: false,
        }),
      ]),
    );
  });

  it("returns only source policy metadata from the sources route", () => {
    const envelope = getAgentExternalIntelSources({ auth: buyerAuth });

    expect(envelope).toMatchObject({
      ok: true,
      data: {
        documentType: "agent_external_intel_sources",
        endpoint: "GET /agent/external-intel/sources",
        result: {
          liveEnabled: false,
          provider: "disabled",
        },
        mutationCount: 0,
        providerCalled: false,
        dbAccessedDirectly: false,
      },
    });
    expect(JSON.stringify(envelope)).not.toMatch(/API_KEY|SECRET|TOKEN|PASSWORD|rawHtmlBody|providerPayload/i);
  });

  it("previews external search through disabled gateway with citations boundary intact", async () => {
    await expect(
      previewAgentExternalIntelSearch({
        auth: buyerAuth,
        input: {
          domain: "procurement",
          query: "cement suppliers",
          internalEvidenceRefs: ["internal_app:request:1"],
          marketplaceChecked: true,
          sourcePolicyIds: ["supplier_public_catalog.default"],
          limit: 5,
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        documentType: "agent_external_intel_search_preview",
        endpoint: "POST /agent/external-intel/search/preview",
        result: {
          status: "external_policy_not_enabled",
          internalFirst: true,
          externalChecked: false,
          results: [],
          citations: [],
          forbiddenForFinalAction: true,
          mutationCount: 0,
          providerCalled: false,
          rawHtmlReturned: false,
        },
        mutationCount: 0,
        dbAccessedDirectly: false,
      },
    });
  });

  it("previews cited external search through the Wave05 alias without provider calls", async () => {
    await expect(
      previewAgentExternalIntelCitedSearch({
        auth: buyerAuth,
        input: {
          domain: "procurement",
          query: "cement suppliers",
          internalEvidenceRefs: ["internal_app:request:1"],
          marketplaceChecked: true,
          sourcePolicyIds: ["supplier_public_catalog.default"],
          limit: 5,
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        documentType: "agent_external_intel_cited_search_preview",
        endpoint: "POST /agent/external-intel/cited-search-preview",
        result: {
          contractId: "ai_cited_external_search_gateway_v1",
          status: "external_policy_not_enabled",
          citationsRequired: true,
          previewOnly: true,
          controlledExternalFetchRequired: true,
          uncontrolledExternalFetch: false,
          supplierConfirmed: false,
          orderCreated: false,
          warehouseMutated: false,
          paymentCreated: false,
          rawHtmlReturned: false,
          mutationCount: 0,
          providerCalled: false,
        },
        mutationCount: 0,
        dbAccessedDirectly: false,
      },
    });
  });

  it("previews procurement external supplier citations through the Wave05 alias", async () => {
    await expect(
      previewAgentProcurementExternalSupplierPreview({
        auth: buyerAuth,
        input: {
          requestIdHash: "request_hash",
          items: [{ materialLabel: "Cement M400", quantity: 10, unit: "bag" }],
          internalEvidenceRefs: ["internal_app:request:1"],
          marketplaceChecked: true,
          limit: 5,
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        documentType: "agent_procurement_external_supplier_preview",
        endpoint: "POST /agent/procurement/external-supplier-preview",
        result: {
          contractId: "ai_external_supplier_citation_preview_v1",
          status: "external_policy_not_enabled",
          candidates: [],
          citations: [],
          previewOnly: true,
          supplierConfirmationAllowed: false,
          orderCreationAllowed: false,
          paymentCreationAllowed: false,
          finalActionAllowed: false,
          mutationCount: 0,
        },
        mutationCount: 0,
        providerCalled: false,
        dbAccessedDirectly: false,
      },
    });
  });

  it("requires auth for external intelligence BFF routes", async () => {
    expect(getAgentExternalIntelSources({ auth: null })).toMatchObject({
      ok: false,
      error: { code: "AGENT_EXTERNAL_INTEL_AUTH_REQUIRED" },
    });
    await expect(
      previewAgentExternalIntelSearch({
        auth: null,
        input: {
          domain: "procurement",
          query: "cement",
          internalEvidenceRefs: ["internal_app:request:1"],
          marketplaceChecked: true,
          sourcePolicyIds: ["supplier_public_catalog.default"],
        },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "AGENT_EXTERNAL_INTEL_AUTH_REQUIRED" },
    });
    await expect(
      previewAgentExternalIntelCitedSearch({
        auth: null,
        input: {
          domain: "procurement",
          query: "cement",
          internalEvidenceRefs: ["internal_app:request:1"],
          marketplaceChecked: true,
          sourcePolicyIds: ["supplier_public_catalog.default"],
        },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "AGENT_EXTERNAL_INTEL_AUTH_REQUIRED" },
    });
  });
});
