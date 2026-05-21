import { answerAiRoleBusinessWorkflow } from "../../src/lib/ai/roleBusinessCopilots";

const numeric = (answer: ReturnType<typeof answerAiRoleBusinessWorkflow>, key: string) =>
  answer.facts.flatMap((fact) => fact.numericFacts ?? []).find((fact) => fact.key === key)?.value;

describe("S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS: foreman workflow", () => {
  it("returns closeout blockers and draft without closing works", () => {
    const answer = answerAiRoleBusinessWorkflow({
      workflowId: "foreman_today_closeout",
      role: "foreman",
      screenId: "foreman",
      questionRu: "что мне закрыть сегодня",
    });

    expect(numeric(answer, "closable_today")).toBe(2);
    expect(numeric(answer, "needs_photo")).toBe(2);
    expect(numeric(answer, "needs_act")).toBe(1);
    expect(numeric(answer, "gkl_shortage")).toBe(60);
    expect(answer.draft?.finalSubmitAllowed).toBe(false);
    expect(answer.safetyStatus.finalSubmit).toBe(false);
  });
});
