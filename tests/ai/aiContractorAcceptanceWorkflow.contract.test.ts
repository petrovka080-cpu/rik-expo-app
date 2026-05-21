import { answerAiRoleBusinessWorkflow } from "../../src/lib/ai/roleBusinessCopilots";

const numeric = (answer: ReturnType<typeof answerAiRoleBusinessWorkflow>, key: string) =>
  answer.facts.flatMap((fact) => fact.numericFacts ?? []).find((fact) => fact.key === key)?.value;

describe("S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS: contractor workflow", () => {
  it("keeps contractor acceptance inside own scope", () => {
    const answer = answerAiRoleBusinessWorkflow({
      workflowId: "contractor_acceptance_closeout",
      role: "contractor",
      screenId: "contractor",
      questionRu: "что мешает закрыть мои работы",
    });

    expect(numeric(answer, "contractor_open_works")).toBe(4);
    expect(numeric(answer, "contractor_needs_photo")).toBe(2);
    expect(numeric(answer, "contractor_needs_act")).toBe(1);
    expect(numeric(answer, "contractor_open_remarks")).toBe(1);
    expect(answer.statusRu).toBe("Доступ ограничен");
    expect(answer.safetyStatus.finalSubmit).toBe(false);
  });
});
