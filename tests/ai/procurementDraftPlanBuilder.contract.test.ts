import { buildProcurementDraftPreview } from "../../src/features/ai/procurement/procurementDraftPlanBuilder";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

describe("procurement draft plan builder", () => {
  it("uses draft_request only and never prepares a final submit", async () => {
    const result = await buildProcurementDraftPreview({
      auth: buyerAuth,
      input: {
        requestIdHash: "request_hash",
        projectIdHash: "project_hash",
        title: "Request draft",
        supplierLabel: "Internal Supplier One",
        items: [{ materialLabel: "Cement M400", quantity: 12, unit: "bag" }],
        evidenceRefs: ["internal_app:request:request_hash", "catalog:compare_suppliers:supplier:1"],
      },
    });

    expect(result.output).toMatchObject({
      status: "draft_ready",
      draftPreview: {
        title: "Request draft",
        items: [
          {
            materialLabel: "Cement M400",
            quantity: 12,
            unit: "bag",
            supplierLabel: "Internal Supplier One",
          },
        ],
      },
      requiresApproval: true,
      nextAction: "submit_for_approval",
    });
    expect(result.output.evidenceRefs).toEqual(
      expect.arrayContaining(["internal_app:request:request_hash", "draft_request:input:item:1"]),
    );
    expect(result.proof).toMatchObject({
      toolsCalled: ["draft_request"],
      mutationCount: 0,
      finalMutationAllowed: false,
      supplierSelectionAllowed: false,
      orderCreationAllowed: false,
      warehouseMutationAllowed: false,
    });
  });
});
