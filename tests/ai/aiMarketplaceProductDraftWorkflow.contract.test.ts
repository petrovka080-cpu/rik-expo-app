import { answerAiRoleBusinessWorkflow } from "../../src/lib/ai/roleBusinessCopilots";

const numeric = (answer: ReturnType<typeof answerAiRoleBusinessWorkflow>, key: string) =>
  answer.facts.flatMap((fact) => fact.numericFacts ?? []).find((fact) => fact.key === key)?.value;

describe("S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS: marketplace workflow", () => {
  it("prepares product card only as draft and does not invent a price", () => {
    const answer = answerAiRoleBusinessWorkflow({
      workflowId: "marketplace_photo_product_draft",
      role: "marketplace_user",
      screenId: "market",
      questionRu: "подготовь карточку товара",
    });

    expect(numeric(answer, "similar_internal_products")).toBe(2);
    expect(numeric(answer, "missing_product_fields")).toBe(7);
    expect(numeric(answer, "invented_price")).toBe(0);
    expect(answer.draft?.draftType).toBe("marketplace_product_draft");
    expect(answer.draft?.finalSubmitAllowed).toBe(false);
  });
});
