import { makeExternalKnowledgeAnswer } from "./aiVerifiedExternalKnowledgeTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: material calculation", () => {
  it("keeps plaster consumption as a draft assumption", () => {
    const answer = makeExternalKnowledgeAnswer({
      requestId: "test:plaster",
      questionRu: "расход штукатурки на 200 м²",
      normalizedQuestionRu: "расход штукатурки на 200 м2",
      intent: "construction_material_calculation",
      entity: "material",
      workType: "plastering",
      materialNameRu: "штукатурка",
      quantity: { value: 200, unit: "м2" },
    });
    expect(answer.result.answerParts.some((part) => part.status === "draft_assumption")).toBe(true);
    expect(answer.result.sources.every((source) => source.canBeUsedAsProjectFact === false)).toBe(true);
  });
});
