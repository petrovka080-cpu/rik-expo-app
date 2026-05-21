import { answerAiRoleBusinessWorkflow } from "../../src/lib/ai/roleBusinessCopilots";

const numeric = (answer: ReturnType<typeof answerAiRoleBusinessWorkflow>, key: string) =>
  answer.facts.flatMap((fact) => fact.numericFacts ?? []).find((fact) => fact.key === key)?.value;

describe("S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS: director workflow", () => {
  it("returns decision queue numbers without auto approval", () => {
    const answer = answerAiRoleBusinessWorkflow({
      workflowId: "director_daily_decision_queue",
      role: "director",
      screenId: "director",
      questionRu: "что мне решить сегодня",
    });

    expect(numeric(answer, "decisions_count")).toBe(6);
    expect(numeric(answer, "shortage_gkl")).toBe(60);
    expect(numeric(answer, "payment_risk_sum")).toBe(125000);
    expect(numeric(answer, "warehouse_deficits")).toBe(4);
    expect(answer.safetyStatus.autoApproval).toBe(false);
    expect(answer.openLinks.length).toBeGreaterThanOrEqual(5);
  });
});
