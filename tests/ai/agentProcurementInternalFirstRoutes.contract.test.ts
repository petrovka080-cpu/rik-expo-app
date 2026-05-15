import {
  AGENT_BFF_ROUTE_DEFINITIONS,
  getAgentProcurementRequestUnderstanding,
  previewAgentProcurementDecisionCard,
  previewAgentProcurementInternalFirstDraftRequest,
  previewAgentProcurementInternalSupplierRank,
} from "../../src/features/ai/agent/agentBffRouteShell";
import { resolveProcurementRequestContext } from "../../src/features/ai/procurement/procurementRequestContextResolver";
import { buildAiProcurementRequestUnderstandingFromContext } from "../../src/features/ai/procurement/aiProcurementRequestUnderstanding";
import type { AiInternalSupplierRankResult } from "../../src/features/ai/procurement/aiInternalSupplierRanker";

const auth = { userId: "buyer-user", role: "buyer" } as const;
const requestSnapshot = {
  requestId: "request-1",
  projectId: "project-1",
  projectTitle: "Tower A",
  location: "Bishkek",
  items: [{ materialLabel: "Cement M400", quantity: 12, unit: "bag" }],
} as const;

function context() {
  return resolveProcurementRequestContext({
    auth,
    requestId: "request-1",
    screenId: "buyer.requests",
    requestSnapshot,
  });
}

describe("agent procurement internal-first intelligence routes", () => {
  it("registers Wave 04 routes as role-scoped non-mutating BFF contracts", () => {
    expect(AGENT_BFF_ROUTE_DEFINITIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: "agent.procurement.request_understanding.read",
          endpoint: "GET /agent/procurement/request-understanding/:requestId",
          mutates: false,
          callsModelProvider: false,
          callsDatabaseDirectly: false,
        }),
        expect.objectContaining({
          operation: "agent.procurement.internal_supplier_rank.preview",
          endpoint: "POST /agent/procurement/internal-supplier-rank",
          mutates: false,
          callsModelProvider: false,
          callsDatabaseDirectly: false,
        }),
        expect.objectContaining({
          operation: "agent.procurement.decision_card.preview",
          endpoint: "POST /agent/procurement/decision-card",
          mutates: false,
          callsModelProvider: false,
          callsDatabaseDirectly: false,
        }),
        expect.objectContaining({
          operation: "agent.procurement.draft_request.internal_first_preview",
          endpoint: "POST /agent/procurement/draft-request-preview",
          mutates: false,
          callsModelProvider: false,
          callsDatabaseDirectly: false,
        }),
      ]),
    );
  });

  it("serves understanding, rank, decision, and draft preview with no final side effects", async () => {
    const understanding = getAgentProcurementRequestUnderstanding({
      auth,
      requestId: "request-1",
      screenId: "buyer.requests",
      requestSnapshot,
    });
    expect(understanding).toMatchObject({
      ok: true,
      data: {
        endpoint: "GET /agent/procurement/request-understanding/:requestId",
        readOnly: true,
        internalFirst: true,
        mutationCount: 0,
        providerCalled: false,
        dbAccessedDirectly: false,
      },
    });

    const procurementContext = context();
    const rank = await previewAgentProcurementInternalSupplierRank({
      auth,
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
    expect(rank).toMatchObject({
      ok: true,
      data: {
        endpoint: "POST /agent/procurement/internal-supplier-rank",
        readOnly: true,
        internalFirst: true,
        mutationCount: 0,
        providerCalled: false,
        dbAccessedDirectly: false,
        result: {
          supplier_confirmed: false,
          order_created: false,
          warehouse_mutated: false,
          payment_created: false,
        },
      },
    });
    if (!rank.ok) throw new Error("expected internal supplier rank response");
    const rankResult = rank.data.result as AiInternalSupplierRankResult;

    const card = previewAgentProcurementDecisionCard({
      auth,
      context: procurementContext,
      understanding: buildAiProcurementRequestUnderstandingFromContext(procurementContext),
      supplierRank: rankResult,
    });
    expect(card).toMatchObject({
      ok: true,
      data: {
        endpoint: "POST /agent/procurement/decision-card",
        approvalRequired: true,
        mutationCount: 0,
        result: {
          external_fetch: false,
          supplier_confirmed: false,
          order_created: false,
          warehouse_mutated: false,
          payment_created: false,
        },
      },
    });

    const draft = await previewAgentProcurementInternalFirstDraftRequest({
      auth,
      context: procurementContext,
      supplierRank: rankResult,
    });
    expect(draft).toMatchObject({
      ok: true,
      data: {
        endpoint: "POST /agent/procurement/draft-request-preview",
        readOnly: true,
        internalFirst: true,
        mutationCount: 0,
        result: {
          status: "draft_ready",
          requiresApproval: true,
          nextAction: "submit_for_approval",
        },
      },
    });
  });
});
