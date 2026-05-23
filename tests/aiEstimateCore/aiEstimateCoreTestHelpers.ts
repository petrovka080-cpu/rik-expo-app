import { answerBuiltInAi, type BuiltInAiAnswer } from "../../src/lib/ai/builtInAi";
import {
  P0_UNFINISHED_AI_ESTIMATE_CASES,
  UNFINISHED_AI_ESTIMATE_CASES,
  validateAiEstimateCoreAnswer,
  type UnfinishedAiEstimateCase,
} from "../../src/lib/ai/globalEstimate";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";

export { P0_UNFINISHED_AI_ESTIMATE_CASES, UNFINISHED_AI_ESTIMATE_CASES };

export function answerCase(testCase: UnfinishedAiEstimateCase, route: "chat" | "ai_foreman" | "request" = "chat"): BuiltInAiAnswer {
  return answerBuiltInAi({
    text: testCase.promptRu,
    screenContext: route === "ai_foreman" ? "foreman" : route,
    route: route === "ai_foreman" ? "/ai?context=foreman" : `/${route}`,
    role: route === "request" ? "consumer" : "foreman",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
}

export function expectCaseValid(testCase: UnfinishedAiEstimateCase, route: "chat" | "ai_foreman" | "request" = "chat"): BuiltInAiAnswer {
  const answer = answerCase(testCase, route);
  const validation = validateAiEstimateCoreAnswer({ testCase, answer, route });
  expect(validation.failures).toEqual([]);
  expect(validation.passed).toBe(true);
  return answer;
}

export function expectNoGenericRowsInAnswer(answer: BuiltInAiAnswer): void {
  const rows = answer.toolResult.estimate?.sections.flatMap((section) => section.rows.map((row) => row.name)) ?? [];
  expect(rows.join("\n")).not.toMatch(/Основной материал:\s*Строительные работы|Подготовка:\s*Строительные работы|^Строительные работы$/im);
}

export function buildStructuredRequestDraft(testCase = P0_UNFINISHED_AI_ESTIMATE_CASES[1]) {
  const draft = buildConsumerRepairAiDraft(testCase.promptRu);
  return { draft, testCase };
}
