import { answerAiRoleBusinessWorkflow } from "../../src/lib/ai/roleBusinessCopilots";

const numeric = (answer: ReturnType<typeof answerAiRoleBusinessWorkflow>, key: string) =>
  answer.facts.flatMap((fact) => fact.numericFacts ?? []).find((fact) => fact.key === key)?.value;

describe("S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS: document workflow", () => {
  it("links PDF evidence to payment/request/work without final linking", () => {
    const answer = answerAiRoleBusinessWorkflow({
      workflowId: "document_pdf_evidence_linking",
      role: "documents",
      screenId: "documents",
      questionRu: "с чем связан счет",
    });

    expect(numeric(answer, "invoice_number")).toBe(45);
    expect(numeric(answer, "invoice_amount")).toBe(125000);
    expect(numeric(answer, "pdf_page")).toBe(1);
    expect(numeric(answer, "missing_act")).toBe(1);
    expect(answer.openLinks.some((link) => link.labelRu.includes("PDF"))).toBe(true);
    expect(answer.safetyStatus.finalSubmit).toBe(false);
  });
});
