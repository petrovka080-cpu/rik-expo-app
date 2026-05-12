import {
  buildProcurementCopilotNoMutationProof,
  previewProcurementCopilotSubmitForApproval,
} from "../../src/features/ai/procurementCopilot/procurementCopilotActionPolicy";

describe("procurement copilot action safety", () => {
  it("keeps supplier, order, warehouse, document, and final action mutation disabled", () => {
    expect(buildProcurementCopilotNoMutationProof(["search_catalog", "compare_suppliers"])).toEqual({
      toolsCalled: ["search_catalog", "compare_suppliers"],
      mutationCount: 0,
      finalMutationAllowed: false,
      supplierConfirmationAllowed: false,
      orderCreationAllowed: false,
      warehouseMutationAllowed: false,
      documentSendAllowed: false,
      externalResultCanFinalize: false,
    });
  });

  it("submit_for_approval is preview-only and blocks without persistence backend", () => {
    expect(
      previewProcurementCopilotSubmitForApproval({
        draftId: "draft-1",
        requestIdHash: "request_hash",
        screenId: "buyer.procurement",
        summary: "Ready for approval.",
        idempotencyKey: "idem-1",
        evidenceRefs: ["internal_app:request:hash"],
      }),
    ).toMatchObject({
      status: "blocked",
      blocker: "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_READY",
      approvalRequired: true,
      idempotencyRequired: true,
      auditRequired: true,
      redactedPayloadOnly: true,
      persisted: false,
      mutationCount: 0,
      finalExecution: 0,
    });
  });
});
