import { answerAiRoleBusinessWorkflow } from "../../src/lib/ai/roleBusinessCopilots";

const numeric = (answer: ReturnType<typeof answerAiRoleBusinessWorkflow>, key: string) =>
  answer.facts.flatMap((fact) => fact.numericFacts ?? []).find((fact) => fact.key === key)?.value;

describe("S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS: client workflow", () => {
  it("returns client-safe progress without internal finance leakage", () => {
    const answer = answerAiRoleBusinessWorkflow({
      workflowId: "client_progress_summary",
      role: "client",
      screenId: "client",
      questionRu: "что сделано за неделю",
    });

    expect(numeric(answer, "client_completed_tasks")).toBe(5);
    expect(numeric(answer, "client_delayed_tasks")).toBe(2);
    expect(numeric(answer, "client_visible_gkl_shortage")).toBe(60);
    expect(answer.statusRu).toBe("Доступ ограничен");
    expect(answer.shortAnswerRu).not.toMatch(/полные финансы|service_role|debug/i);
  });
});
