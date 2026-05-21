import { answerAiRoleBusinessWorkflow } from "../../src/lib/ai/roleBusinessCopilots";

const numeric = (answer: ReturnType<typeof answerAiRoleBusinessWorkflow>, key: string) =>
  answer.facts.flatMap((fact) => fact.numericFacts ?? []).find((fact) => fact.key === key)?.value;

describe("S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS: accountant workflow", () => {
  it("returns payment readiness numbers with accounting review warning", () => {
    const answer = answerAiRoleBusinessWorkflow({
      workflowId: "accountant_payment_readiness",
      role: "accountant",
      screenId: "accountant",
      questionRu: "какие платежи без документов",
    });

    expect(numeric(answer, "payments_missing_docs_count")).toBe(3);
    expect(numeric(answer, "payments_missing_docs_sum")).toBe(245000);
    expect(numeric(answer, "payment_77_sum")).toBe(125000);
    expect(numeric(answer, "payment_78_sum")).toBe(80000);
    expect(numeric(answer, "payment_78_partial_paid")).toBe(30000);
    expect(numeric(answer, "payment_79_sum")).toBe(40000);
    expect(`${answer.shortAnswerRu} ${answer.nextStepRu} ${answer.draft?.bodyRu}`).toContain("провер");
    expect(answer.safetyStatus.finalSubmit).toBe(false);
  });
});
