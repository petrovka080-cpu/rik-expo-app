import { buildUniversalSourcePlan, classifyUniversalIntent, extractUniversalEntity } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: document questions", () => {
  it("recognizes PDF/document explanation questions as document-scoped", () => {
    const questionRu = "что в этом PDF документе";

    expect(classifyUniversalIntent(questionRu)).toBe("document_pdf_explanation");
    expect(extractUniversalEntity(questionRu)).toBe("document");
    expect(buildUniversalSourcePlan({ questionRu }).internetAllowed).toBe(false);
  });
});
