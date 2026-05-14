import {
  AI_CONTRACTOR_ACT_DRAFT_ENGINE_CONTRACT,
  draftAiContractorAct,
  planAiFieldAction,
} from "../../src/features/ai/field/aiContractorActDraftEngine";
import type { AiFieldContextSnapshot } from "../../src/features/ai/field/aiFieldWorkCopilotTypes";

const contractorContext: AiFieldContextSnapshot = {
  scope: "contractor_own_scope",
  subcontractId: "subcontract:redacted",
  periodStart: "2026-05-14",
  periodEnd: "2026-05-14",
  workSummary: "Redacted subcontract work is ready for act drafting.",
  sourceEvidenceRefs: ["field:subcontract_scope:redacted"],
  workItems: [
    {
      workId: "work:redacted",
      name: "redacted work item",
      quantity: 2,
      unit: "pcs",
      status: "ready_for_act",
      evidenceRefs: ["field:work_item:redacted"],
    },
  ],
};

describe("AI contractor act draft engine", () => {
  it("creates contractor-own draft_act preview without signing, payment, or warehouse mutation", async () => {
    const draft = await draftAiContractorAct({
      auth: { userId: "contractor-user", role: "contractor" },
      input: { fieldContext: contractorContext, actKind: "work_completion" },
    });

    expect(AI_CONTRACTOR_ACT_DRAFT_ENGINE_CONTRACT).toMatchObject({
      backendFirst: true,
      contractorOwnScopeEnforced: true,
      draftOnly: true,
      mutationCount: 0,
      actSigned: false,
      contractorConfirmation: false,
      paymentMutation: false,
      warehouseMutation: false,
      fakeFieldCards: false,
    });
    expect(draft.status).toBe("draft");
    expect(draft.contractorOwnScopeEnforced).toBe(true);
    expect(draft.suggestedToolId).toBe("draft_act");
    expect(draft.evidenceBacked).toBe(true);
    expect(draft.mutationCount).toBe(0);
    expect(draft.finalExecution).toBe(0);
    expect(draft.actSigned).toBe(false);
    expect(draft.paymentMutation).toBe(false);
    expect(draft.warehouseMutation).toBe(false);
    expect(draft.draft).toMatchObject({
      role_scope: "contractor_own_subcontract_scope",
      role_scoped: true,
      mutation_count: 0,
      final_submit: 0,
      act_signed: 0,
      contractor_confirmation: 0,
      payment_mutation: 0,
      warehouse_mutation: 0,
    });
  });

  it("blocks contractor attempts to use foreman project scope", async () => {
    const draft = await draftAiContractorAct({
      auth: { userId: "contractor-user", role: "contractor" },
      input: {
        fieldContext: {
          ...contractorContext,
          scope: "foreman_project_scope",
        },
      },
    });

    expect(draft).toMatchObject({
      status: "blocked",
      suggestedToolId: null,
      suggestedMode: "forbidden",
      contractorOwnScopeEnforced: true,
      mutationCount: 0,
      actSigned: false,
      contractorConfirmation: false,
    });
  });

  it("plans safe reads, drafts, approval previews, and blocks final execution intents", async () => {
    const safeRead = await planAiFieldAction({
      auth: { userId: "foreman-user", role: "foreman" },
      input: { fieldContext: { ...contractorContext, scope: "foreman_project_scope" }, intent: "read_context" },
    });
    const submitPreview = await planAiFieldAction({
      auth: { userId: "foreman-user", role: "foreman" },
      input: { fieldContext: { ...contractorContext, scope: "foreman_project_scope" }, intent: "submit_for_approval" },
    });
    const forbidden = await planAiFieldAction({
      auth: { userId: "foreman-user", role: "foreman" },
      input: { fieldContext: { ...contractorContext, scope: "foreman_project_scope" }, intent: "sign_act" },
    });

    expect(safeRead).toMatchObject({
      status: "preview",
      classification: "FIELD_SAFE_READ_RECOMMENDATION",
      suggestedMode: "safe_read",
      mutationCount: 0,
      finalExecution: 0,
    });
    expect(submitPreview).toMatchObject({
      status: "preview",
      classification: "FIELD_APPROVAL_REQUIRED_RECOMMENDATION",
      suggestedToolId: "submit_for_approval",
      suggestedMode: "approval_required",
      approvalRequired: true,
      mutationCount: 0,
    });
    expect(forbidden).toMatchObject({
      status: "blocked",
      classification: "FIELD_FORBIDDEN_RECOMMENDATION_BLOCKED",
      approvalRequired: true,
      finalExecution: 0,
      actSigned: false,
      contractorConfirmation: false,
    });
  });
});
