import { answerAiRoleBusinessWorkflow } from "../../src/lib/ai/roleBusinessCopilots";

const numeric = (answer: ReturnType<typeof answerAiRoleBusinessWorkflow>, key: string) =>
  answer.facts.flatMap((fact) => fact.numericFacts ?? []).find((fact) => fact.key === key)?.value;

describe("S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS: warehouse workflow", () => {
  it("traces GKL movement without mutating warehouse state", () => {
    const answer = answerAiRoleBusinessWorkflow({
      workflowId: "warehouse_item_trace",
      role: "warehouse",
      screenId: "warehouse",
      questionRu: "куда ушел ГКЛ",
    });

    expect(numeric(answer, "request_quantity")).toBe(80);
    expect(numeric(answer, "issued_quantity")).toBe(20);
    expect(numeric(answer, "remaining_stock")).toBe(0);
    expect(numeric(answer, "shortage")).toBe(60);
    expect(answer.safetyStatus.changedData).toBe(false);
    expect(answer.safetyStatus.dangerousMutation).toBe(false);
  });
});
