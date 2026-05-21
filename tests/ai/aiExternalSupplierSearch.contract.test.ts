import { makeExternalKnowledgeAnswer } from "./aiVerifiedExternalKnowledgeTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: supplier search", () => {
  it("documents internal marketplace and supplier history before external sources", () => {
    const answer = makeExternalKnowledgeAnswer({
      requestId: "test:gkl-suppliers",
      questionRu: "найди поставщиков ГКЛ",
      normalizedQuestionRu: "найди поставщиков гкл",
      role: "buyer",
      screenId: "buyer",
      intent: "marketplace_supplier_search",
      entity: "supplier",
      materialNameRu: "ГКЛ",
    });
    expect(answer.answerTextRu).toContain("internal marketplace");
    expect(answer.answerTextRu).toContain("supplier history");
    expect(answer.result.sources.some((source) => source.sourceType === "external_marketplace")).toBe(true);
  });
});
