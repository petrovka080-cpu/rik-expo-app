import { resolveAiForemanEvidence } from "../../src/features/ai/foreman/aiForemanEvidenceResolver";
import {
  AI_FOREMAN_MISSING_EVIDENCE_CHECKLIST_CONTRACT,
  buildAiForemanMissingEvidenceChecklist,
} from "../../src/features/ai/foreman/aiForemanMissingEvidenceChecklist";
import type { AiFieldContextSnapshot } from "../../src/features/ai/field/aiFieldWorkCopilotTypes";

const completeContext: AiFieldContextSnapshot = {
  scope: "foreman_project_scope",
  objectId: "object:redacted",
  subcontractId: "subcontract:redacted",
  workSummary: "Redacted subcontract closeout summary.",
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

describe("AI foreman missing evidence checklist", () => {
  it("marks subcontract closeout evidence complete when required refs exist", async () => {
    const evidence = await resolveAiForemanEvidence({
      auth: { userId: "foreman-user", role: "foreman" },
      screenId: "foreman.subcontract",
      input: { fieldContext: completeContext },
    });
    const checklist = buildAiForemanMissingEvidenceChecklist(evidence);

    expect(AI_FOREMAN_MISSING_EVIDENCE_CHECKLIST_CONTRACT).toMatchObject({
      evidenceRequired: true,
      noFinalSubmit: true,
      noSigning: true,
      noDirectSubcontractMutation: true,
      mutationCount: 0,
    });
    expect(checklist.status).toBe("complete");
    expect(checklist.requiredMissingKinds).toEqual([]);
    expect(checklist.evidenceBacked).toBe(true);
    expect(checklist.mutationCount).toBe(0);
    expect(checklist.fakeChecklist).toBe(false);
  });

  it("reports missing work item evidence for subcontract closeout without creating a draft", async () => {
    const evidence = await resolveAiForemanEvidence({
      auth: { userId: "foreman-user", role: "foreman" },
      screenId: "foreman.subcontract",
      input: {
        fieldContext: {
          ...completeContext,
          workItems: [],
        },
      },
    });
    const checklist = buildAiForemanMissingEvidenceChecklist(evidence);

    expect(checklist.status).toBe("incomplete");
    expect(checklist.requiredMissingKinds).toContain("work_items");
    expect(checklist.noFinalSubmit).toBe(true);
    expect(checklist.noSigning).toBe(true);
    expect(checklist.noDirectSubcontractMutation).toBe(true);
    expect(checklist.dbWrites).toBe(0);
  });
});
