import { answerAiRoleBusinessWorkflow } from "../../src/lib/ai/roleBusinessCopilots";

const numeric = (answer: ReturnType<typeof answerAiRoleBusinessWorkflow>, key: string) =>
  answer.facts.flatMap((fact) => fact.numericFacts ?? []).find((fact) => fact.key === key)?.value;

describe("S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS: office workflow", () => {
  it("returns stuck work queue and reminder draft without sending it", () => {
    const answer = answerAiRoleBusinessWorkflow({
      workflowId: "office_stuck_work_review",
      role: "office",
      screenId: "office",
      questionRu: "кому напомнить",
    });

    expect(numeric(answer, "stuck_tasks")).toBe(7);
    expect(numeric(answer, "overdue_tasks")).toBe(3);
    expect(numeric(answer, "document_tasks")).toBe(2);
    expect(numeric(answer, "approval_tasks")).toBe(2);
    expect(answer.draft?.draftType).toBe("reminder_draft");
    expect(answer.draft?.finalSubmitAllowed).toBe(false);
  });
});
