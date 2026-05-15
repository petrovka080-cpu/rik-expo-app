import { buildAiFieldCloseoutDraftEngine } from "../../src/features/ai/foreman/aiFieldCloseoutDraftEngine";
import {
  AI_FOREMAN_APPROVAL_CANDIDATE_CONTRACT,
  buildAiForemanApprovalCandidate,
} from "../../src/features/ai/foreman/aiForemanApprovalCandidate";
import { resolveAiForemanEvidence } from "../../src/features/ai/foreman/aiForemanEvidenceResolver";
import { buildAiForemanMissingEvidenceChecklist } from "../../src/features/ai/foreman/aiForemanMissingEvidenceChecklist";
import type { AiFieldContextSnapshot } from "../../src/features/ai/field/aiFieldWorkCopilotTypes";

const fieldContext: AiFieldContextSnapshot = {
  scope: "foreman_project_scope",
  objectId: "object:redacted",
  subcontractId: "subcontract:redacted",
  periodStart: "2026-05-15",
  periodEnd: "2026-05-15",
  workSummary: "Redacted closeout summary.",
  sourceEvidenceRefs: ["field:screen_state:redacted"],
  workItems: [
    {
      workId: "work:redacted",
      name: "redacted work",
      quantity: 1,
      unit: "scope",
      status: "ready_for_act",
      evidenceRefs: ["field:work_item:redacted"],
    },
  ],
};

describe("AI foreman approval candidate", () => {
  it("maps each foreman closeout screen to approval ledger routes without execution", async () => {
    const auth = { userId: "foreman-user", role: "foreman" as const };
    const screens = ["foreman.main", "foreman.ai.quick_modal", "foreman.subcontract"] as const;

    const candidates = await Promise.all(
      screens.map(async (screenId) => {
        const input = { fieldContext, reportKind: "progress" as const, actKind: "subcontract_progress" as const };
        const evidence = await resolveAiForemanEvidence({ auth, screenId, input });
        const checklist = buildAiForemanMissingEvidenceChecklist(evidence);
        const draft = await buildAiFieldCloseoutDraftEngine({ auth, evidence, checklist, input });
        return buildAiForemanApprovalCandidate({ auth, evidence, checklist, draft });
      }),
    );

    expect(AI_FOREMAN_APPROVAL_CANDIDATE_CONTRACT).toMatchObject({
      approvalRequired: true,
      executeOnlyAfterApprovedStatus: true,
      directExecuteAllowed: false,
      finalSubmitAllowed: false,
      signingAllowed: false,
      directSubcontractMutationAllowed: false,
      mutationCount: 0,
    });
    expect(candidates.map((candidate) => candidate.actionId)).toEqual([
      "foreman.main.approval",
      "foreman.ai.quick_modal.approval",
      "foreman.subcontract.approval",
    ]);
    for (const candidate of candidates) {
      expect(candidate.status).toBe("ready");
      expect(candidate.route?.routeStatus).toBe("ready");
      expect(candidate.approvalRequired).toBe(true);
      expect(candidate.directExecuteAllowed).toBe(false);
      expect(candidate.finalSubmitAllowed).toBe(false);
      expect(candidate.signingAllowed).toBe(false);
      expect(candidate.directSubcontractMutationAllowed).toBe(false);
      expect(candidate.redactedPayload.finalSubmitRequested).toBe(false);
      expect(candidate.redactedPayload.signingRequested).toBe(false);
      expect(candidate.redactedPayload.subcontractMutationRequested).toBe(false);
      expect(candidate.dbWrites).toBe(0);
      expect(candidate.finalExecution).toBe(0);
    }
  });
});
