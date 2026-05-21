import {
  answerAiExternalKnowledge,
  type AiExternalKnowledgeAnswer,
  type AiExternalKnowledgePlanInput,
} from "../../src/lib/ai/externalKnowledge";

export function makeExternalKnowledgeAnswer(
  overrides: Partial<AiExternalKnowledgePlanInput> = {},
): AiExternalKnowledgeAnswer {
  return answerAiExternalKnowledge({
    requestId: "test:external:asphalt",
    questionRu: "дай смету на асфальт 100 м²",
    normalizedQuestionRu: "дай смету на асфальт 100 м2",
    role: "foreman",
    screenId: "foreman",
    intent: "construction_estimate",
    entity: "construction_work_type",
    quantity: { value: 100, unit: "м2" },
    workType: "asphalt_paving",
    countryCode: "KG",
    cityOrRegion: "Бишкек",
    internetAllowed: true,
    ...overrides,
  });
}

export function expectExternalAnswerSafe(answer: AiExternalKnowledgeAnswer): void {
  expect(answer.guard.passed).toBe(true);
  expect(answer.result.safetyStatus.changedData).toBe(false);
  expect(answer.result.safetyStatus.finalSubmit).toBe(false);
  expect(answer.result.sources.every((source) => source.canBeUsedAsProjectFact === false)).toBe(true);
}
