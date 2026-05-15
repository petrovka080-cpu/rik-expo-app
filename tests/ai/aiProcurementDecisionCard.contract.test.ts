import { buildAiProcurementDecisionCard } from "../../src/features/ai/procurement/aiProcurementDecisionCard";
import { rankAiInternalSuppliers } from "../../src/features/ai/procurement/aiInternalSupplierRanker";
import { buildAiProcurementRequestUnderstandingFromContext } from "../../src/features/ai/procurement/aiProcurementRequestUnderstanding";
import { resolveProcurementRequestContext } from "../../src/features/ai/procurement/procurementRequestContextResolver";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

function context() {
  return resolveProcurementRequestContext({
    auth: buyerAuth,
    requestId: "request-1",
    screenId: "buyer.requests",
    requestSnapshot: {
      requestId: "request-1",
      projectId: "project-1",
      projectTitle: "Tower A",
      location: "Bishkek",
      items: [{ materialLabel: "Cement M400", quantity: 12, unit: "bag" }],
    },
  });
}

describe("AI procurement decision card", () => {
  it("builds a professional decision card from internal evidence and supplier rank only", async () => {
    const procurementContext = context();
    const supplierRank = await rankAiInternalSuppliers({
      auth: buyerAuth,
      context: procurementContext,
      searchCatalogItems: async () => [
        { code: "M-001", name: "Cement M400", uom: "bag", kind: "material" },
      ],
      listSuppliers: async () => [
        {
          id: "supplier-1",
          name: "Alpha Supply",
          specialization: "cement",
          address: "Bishkek",
          website: "https://alpha.example",
        },
      ],
    });
    const card = buildAiProcurementDecisionCard({
      context: procurementContext,
      understanding: buildAiProcurementRequestUnderstandingFromContext(procurementContext),
      supplierRank,
    });

    expect(card).toMatchObject({
      status: "ready",
      riskLevel: "medium",
      internalFirst: true,
      internal_first: true,
      internalDataChecked: true,
      marketplaceChecked: true,
      externalFetch: false,
      external_fetch: false,
      supplierConfirmed: false,
      supplier_confirmed: false,
      orderCreated: false,
      order_created: false,
      warehouseMutated: false,
      warehouse_mutated: false,
      paymentCreated: false,
      payment_created: false,
      requiresApproval: true,
      mutationCount: 0,
    });
    expect(card.safeActions).toEqual(["search_catalog", "compare_suppliers"]);
    expect(card.draftActions).toEqual(["draft_request"]);
    expect(card.approvalRequiredActions).toEqual(["submit_for_approval"]);
    expect(card.forbiddenActions).toEqual(
      expect.arrayContaining([
        "external_live_fetch",
        "supplier_confirmation",
        "order_creation",
        "warehouse_mutation",
        "payment_creation",
      ]),
    );
    expect(card.situationSummary.length).toBeGreaterThan(0);
    expect(card.professionalAssessment.length).toBeGreaterThan(0);
    expect(card.evidenceRefs.length).toBeGreaterThan(0);
  });
});
