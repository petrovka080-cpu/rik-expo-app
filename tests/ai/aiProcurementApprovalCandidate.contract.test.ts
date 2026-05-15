import {
  AI_PROCUREMENT_APPROVAL_CANDIDATE_CONTRACT,
  buildAiProcurementApprovalCandidate,
} from "../../src/features/ai/procurement/aiProcurementApprovalCandidate";
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

describe("AI procurement approval candidate", () => {
  it("maps procurement decision candidates to the existing approval ledger route", () => {
    const candidate = buildAiProcurementApprovalCandidate({
      auth: buyerAuth,
      context: context(),
      recommendedSupplier: {
        rank: 1,
        supplierLabel: "Alpha Supply",
        score: 24,
        evidenceRefs: ["catalog:compare_suppliers:supplier:1"],
        riskFlags: [],
        supplierConfirmed: false,
        orderCreated: false,
      },
      evidenceRefs: ["internal_app:request:abc", "catalog:compare_suppliers:supplier:1"],
    });

    expect(AI_PROCUREMENT_APPROVAL_CANDIDATE_CONTRACT).toMatchObject({
      approvalRequired: true,
      executeOnlyAfterApprovedStatus: true,
      directExecuteAllowed: false,
      supplierConfirmationAllowed: false,
      orderCreationAllowed: false,
      mutationCount: 0,
    });
    expect(candidate).toMatchObject({
      status: "ready",
      blocker: null,
      screenId: "buyer.requests",
      actionId: "buyer.requests.approval",
      recommendedSupplierLabel: "Alpha Supply",
      approvalRequired: true,
      executeOnlyAfterApprovedStatus: true,
      directExecuteAllowed: false,
      redactedPayloadOnly: true,
      supplierConfirmationAllowed: false,
      orderCreationAllowed: false,
      finalExecution: 0,
      mutationCount: 0,
    });
    expect(candidate.route).toMatchObject({
      domain: "procurement",
      routeKind: "submit_for_approval",
      noDirectExecutePath: true,
    });
  });

  it("blocks approval candidates without internal evidence", () => {
    const candidate = buildAiProcurementApprovalCandidate({
      auth: buyerAuth,
      context: context(),
      recommendedSupplier: null,
      evidenceRefs: [],
    });

    expect(candidate).toMatchObject({
      status: "blocked",
      blocker: "BLOCKED_AI_PROCUREMENT_INTERNAL_EVIDENCE_MISSING",
      directExecuteAllowed: false,
      mutationCount: 0,
    });
  });
});
