import {
  AI_FIELD_CLOSEOUT_DRAFT_ENGINE_CONTRACT,
  buildAiFieldCloseoutDraftEngine,
} from "../../src/features/ai/foreman/aiFieldCloseoutDraftEngine";
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
      quantity: 2,
      unit: "m2",
      status: "ready_for_act",
      evidenceRefs: ["field:work_item:redacted"],
    },
  ],
  documents: [{ documentType: "photo", evidenceRef: "field:document:redacted" }],
};

describe("AI field closeout draft engine", () => {
  it("builds report, act, and message drafts without final submit or signing", async () => {
    const auth = { userId: "foreman-user", role: "foreman" as const };
    const input = { fieldContext, reportKind: "progress" as const, actKind: "subcontract_progress" as const };
    const evidence = await resolveAiForemanEvidence({ auth, screenId: "foreman.subcontract", input });
    const checklist = buildAiForemanMissingEvidenceChecklist(evidence);
    const draft = await buildAiFieldCloseoutDraftEngine({ auth, evidence, checklist, input });

    expect(AI_FIELD_CLOSEOUT_DRAFT_ENGINE_CONTRACT).toMatchObject({
      draftOnly: true,
      finalSubmitAllowed: false,
      signingAllowed: false,
      directSubcontractMutationAllowed: false,
      reportPublished: false,
      actSigned: false,
      messageSent: false,
      mutationCount: 0,
      fakeDraftCreated: false,
    });
    expect(draft.status).toBe("drafted");
    expect(draft.reportDraft?.status).toBe("draft");
    expect(draft.actDraft?.status).toBe("draft");
    expect(draft.messageDraft?.sent).toBe(false);
    expect(draft.draftItems.map((item) => item.kind)).toEqual([
      "draft_report",
      "draft_act",
      "draft_message",
    ]);
    expect(draft.evidenceBacked).toBe(true);
    expect(draft.finalSubmitAllowed).toBe(false);
    expect(draft.signingAllowed).toBe(false);
    expect(draft.directSubcontractMutationAllowed).toBe(false);
    expect(draft.mutationCount).toBe(0);
    expect(draft.dbWrites).toBe(0);
  });

  it("stays empty when required evidence is missing", async () => {
    const auth = { userId: "foreman-user", role: "foreman" as const };
    const evidence = await resolveAiForemanEvidence({
      auth,
      screenId: "foreman.subcontract",
      input: { fieldContext: { ...fieldContext, workItems: [] } },
    });
    const checklist = buildAiForemanMissingEvidenceChecklist(evidence);
    const draft = await buildAiFieldCloseoutDraftEngine({ auth, evidence, checklist });

    expect(draft.status).toBe("empty");
    expect(draft.finalSubmitAllowed).toBe(false);
    expect(draft.signingAllowed).toBe(false);
    expect(draft.directSubcontractMutationAllowed).toBe(false);
    expect(draft.fakeDraftCreated).toBe(false);
  });
});
