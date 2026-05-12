import { ExternalIntelGateway } from "../../src/features/ai/externalIntel/ExternalIntelGateway";
import { previewProcurementCopilotExternalIntel } from "../../src/features/ai/procurementCopilot/procurementCopilotExternalBridge";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

const disabledGateway = new ExternalIntelGateway({
  flags: {
    externalLiveFetchEnabled: false,
    provider: "disabled",
    liveFetchRequested: false,
    requireInternalEvidence: true,
    requireMarketplaceCheck: true,
    requireCitations: true,
    maxResults: 5,
    timeoutMs: 8000,
    cacheTtlMs: 86400000,
    approvedProviderConfigured: false,
  },
});

describe("procurement copilot external bridge", () => {
  it("reports disabled external intel by default without provider calls or results", async () => {
    const result = await previewProcurementCopilotExternalIntel({
      auth: buyerAuth,
      items: [{ materialLabel: "Cement M400", quantity: 10, unit: "bag" }],
      internalEvidenceRefs: ["internal_app:request:hash"],
      marketplaceChecked: true,
      externalRequested: true,
      externalGateway: disabledGateway,
    });

    expect(result).toMatchObject({
      status: "disabled",
      externalChecked: false,
      citations: [],
      supplierCards: [],
      providerCalled: false,
      mutationCount: 0,
    });
  });

  it("blocks external status before internal evidence and marketplace check", async () => {
    const result = await previewProcurementCopilotExternalIntel({
      auth: buyerAuth,
      items: [{ materialLabel: "Cement M400" }],
      internalEvidenceRefs: [],
      marketplaceChecked: false,
      externalRequested: true,
      externalGateway: disabledGateway,
    });

    expect(result).toMatchObject({
      status: "blocked",
      externalChecked: false,
      citations: [],
      supplierCards: [],
      mutationCount: 0,
    });
  });
});
