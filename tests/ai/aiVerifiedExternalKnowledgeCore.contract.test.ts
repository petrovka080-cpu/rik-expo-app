import { AI_VERIFIED_EXTERNAL_KNOWLEDGE_GREEN_STATUS, buildAiExternalKnowledgeProofMatrix } from "../../src/lib/ai/externalKnowledge";
import { expectExternalAnswerSafe, makeExternalKnowledgeAnswer } from "./aiVerifiedExternalKnowledgeTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE: core", () => {
  it("returns a guarded read-only external knowledge answer", () => {
    const answer = makeExternalKnowledgeAnswer();
    expectExternalAnswerSafe(answer);
    expect(answer.answerTextRu).toContain("Коротко:");
    expect(answer.answerTextRu).toContain("Внешние источники:");
    expect(answer.answerTextRu).toContain("Статус:");

    const matrix = buildAiExternalKnowledgeProofMatrix({ answers: [answer] });
    expect(matrix.final_status).toBe(AI_VERIFIED_EXTERNAL_KNOWLEDGE_GREEN_STATUS);
  });
});
