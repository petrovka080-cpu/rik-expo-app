import {
  AGENT_BFF_ROUTE_DEFINITIONS,
  AGENT_EXTERNAL_INTEL_BFF_CONTRACT,
  getAgentExternalIntelSources,
  previewAgentExternalIntelSearch,
} from "../../src/features/ai/agent/agentBffRouteShell";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

describe("external intelligence BFF contracts", () => {
  it("exposes read-only external intel route contracts without provider secrets", () => {
    expect(AGENT_EXTERNAL_INTEL_BFF_CONTRACT).toMatchObject({
      contractId: "agent_external_intel_bff_v1",
      endpoints: [
        "GET /agent/external-intel/sources",
        "POST /agent/external-intel/search/preview",
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
  });
});
