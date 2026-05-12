import {
  previewProcurementExternalSupplierCandidates,
  previewProcurementSupplierMatch,
} from "../../src/features/ai/procurement/procurementSupplierMatchEngine";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;
const contractorAuth = { userId: "contractor-user", role: "contractor" } as const;

describe("procurement external supplier candidates", () => {
  it("returns honest disabled status without fake external candidates", async () => {
    await expect(
      previewProcurementExternalSupplierCandidates({
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

  it("blocks roles that cannot use procurement request context", async () => {
    await expect(
      previewProcurementExternalSupplierCandidates({
        auth: contractorAuth,
        input: {
          items: [{ materialLabel: "Cement" }],
          internalEvidenceRefs: ["internal_app:request:abc"],
          marketplaceChecked: true,
        },
      }),
    ).resolves.toMatchObject({
      status: "blocked",
      candidates: [],
      finalActionAllowed: false,
      mutationCount: 0,
    });
  });

  it("integrates external status into supplier match without changing safe tool boundary", async () => {
    const result = await previewProcurementSupplierMatch({
      auth: buyerAuth,
      externalRequested: true,
      input: {
        requestIdHash: "request_hash",
        items: [{ materialLabel: "Cement M400", quantity: 10, unit: "bag" }],
      },
      searchCatalogItems: async () => [],
      listSuppliers: async () => [],
    });

    expect(result.output).toMatchObject({
      externalChecked: false,
      externalStatus: "external_policy_not_enabled",
      externalCitations: [],
      supplierCards: [],
      nextAction: "explain",
      requiresApproval: true,
    });
    expect(result.proof).toMatchObject({
      toolsCalled: ["search_catalog", "compare_suppliers"],
      mutationCount: 0,
      externalResultCanFinalize: false,
      orderCreationAllowed: false,
      supplierSelectionAllowed: false,
    });
  });
});
