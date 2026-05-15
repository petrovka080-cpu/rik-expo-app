import { buildAiProcurementRiskSignals } from "../../src/features/ai/procurement/aiProcurementRiskSignals";
import { resolveProcurementRequestContext } from "../../src/features/ai/procurement/procurementRequestContextResolver";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

describe("AI procurement risk signals", () => {
  it("raises risk for critical urgency and missing request fields without mutation", () => {
    const context = resolveProcurementRequestContext({
      auth: buyerAuth,
      requestId: "request-1",
      screenId: "buyer.requests",
      requestSnapshot: {
        requestId: "request-1",
        items: [{ materialLabel: "Rebar", urgency: "critical" }],
      },
    });
    const result = buildAiProcurementRiskSignals({ context });

    expect(result.riskLevel).toBe("high");
    expect(result.riskSignals.map((signal) => signal.id)).toEqual(
      expect.arrayContaining(["missing_request_data", "critical_urgency", "approval_required"]),
    );
    expect(result).toMatchObject({
      internalFirst: true,
      externalFetch: false,
      supplierConfirmed: false,
      orderCreated: false,
      warehouseMutated: false,
      paymentCreated: false,
      mutationCount: 0,
    });
  });

  it("keeps supplier-candidate gaps as approval-gated evidence, not fake cards", () => {
    const context = resolveProcurementRequestContext({
      auth: buyerAuth,
      requestId: "request-1",
      screenId: "buyer.requests",
      requestSnapshot: {
        requestId: "request-1",
        projectId: "project-1",
        items: [{ materialLabel: "Cement M400", quantity: 12, unit: "bag" }],
      },
    });
    const result = buildAiProcurementRiskSignals({
      context,
      supplierMatch: {
        status: "empty",
        internalDataChecked: true,
        marketplaceChecked: true,
        externalChecked: false,
        externalStatus: "not_requested",
        supplierCards: [],
        recommendationSummary: "No suppliers available.",
        missingData: ["supplier_candidates"],
        nextAction: "explain",
        requiresApproval: true,
        evidenceRefs: ["internal_app:request:1"],
      },
    });

    expect(result.riskSignals.map((signal) => signal.id)).toContain("supplier_candidates_missing");
    expect(result.evidenceRefs).toContain("internal_app:request:1");
    expect(result.mutationCount).toBe(0);
  });
});
