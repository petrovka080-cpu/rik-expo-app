import { answerAiRoleBusinessWorkflow } from "../../src/lib/ai/roleBusinessCopilots";

const numeric = (answer: ReturnType<typeof answerAiRoleBusinessWorkflow>, key: string) =>
  answer.facts.flatMap((fact) => fact.numericFacts ?? []).find((fact) => fact.key === key)?.value;

describe("S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS: buyer workflow", () => {
  it("returns purchase draft from approved request without final PO creation", () => {
    const answer = answerAiRoleBusinessWorkflow({
      workflowId: "buyer_approved_request_to_purchase_draft",
      role: "buyer",
      screenId: "buyer",
      questionRu: "что купить по заявке №124",
    });

    expect(numeric(answer, "request_quantity")).toBe(80);
    expect(numeric(answer, "warehouse_issued")).toBe(20);
    expect(numeric(answer, "warehouse_remaining")).toBe(0);
    expect(numeric(answer, "purchase_needed")).toBe(60);
    expect(numeric(answer, "internal_marketplace_options")).toBe(2);
    expect(numeric(answer, "supplier_history_options")).toBe(1);
    expect(answer.draft?.draftType).toBe("purchase_draft");
    expect(answer.safetyStatus.finalSubmit).toBe(false);
  });
});
