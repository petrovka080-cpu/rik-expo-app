import { answerUniversalRoleQa } from "../../src/lib/ai/universalRoleQa/universalAnswerComposer";
import {
  calculateUniversalRoutedEstimate,
  classifyEstimateIntent,
  type EstimateIntentRoute,
} from "../../src/lib/ai/estimateRouting";
import {
  assertSourceBackedGlobalEstimate,
  formatGlobalEstimateAnswer,
  type GlobalEstimateResult,
} from "../../src/lib/ai/globalEstimate";

export const FORBIDDEN_ESTIMATE_ANSWER_PHRASES = [
  "не найдено",
  "интернет не использовался",
  "marketplace не использовался",
  "pdf не найден",
  "источник ответа: данные приложения",
  "за 2026 найдено работ",
  "осмотр и уточнение объема работ",
  "осмотр и уточнение объёма работ",
  "ремонтные работы после согласования",
];

export function calculateEstimateForPrompt(prompt: string): {
  route: EstimateIntentRoute;
  result: GlobalEstimateResult;
  answerText: string;
} {
  const { route, result } = calculateUniversalRoutedEstimate(prompt, { countryCode: "KG", city: "Bishkek" });
  return {
    route,
    result,
    answerText: formatGlobalEstimateAnswer(result),
  };
}

export function expectProfessionalBoqEstimate(prompt: string, expectedWorkKey?: string): GlobalEstimateResult {
  const { route, result, answerText } = calculateEstimateForPrompt(prompt);
  const guard = assertSourceBackedGlobalEstimate(result);

  expect(route.shouldCallEstimateTool).toBe(true);
  expect(route.forbiddenFallbackToRoleQa).toBe(true);
  if (expectedWorkKey) expect(result.work.workKey).toBe(expectedWorkKey);
  expect(result.sections.some((section) => section.type === "materials" && section.rows.length > 0)).toBe(true);
  expect(result.sections.some((section) => section.type === "labor" && section.rows.length > 0)).toBe(true);
  expect(result.sections.flatMap((section) => section.rows).every((row) => row.displayQuantity && row.displayUnitPrice && row.displayTotal)).toBe(true);
  expect(result.totals.grandTotal).toBeGreaterThan(0);
  expect(result.tax.taxType).toBeTruthy();
  expect(result.regionalRisks.length).toBeGreaterThan(0);
  expect(result.clarifyingQuestions.length).toBeGreaterThan(0);
  expect(answerText).toContain("Сделать PDF");
  expect(answerText).toContain("Источники");
  expect(guard).toEqual({ passed: true, blockers: [] });
  for (const phrase of FORBIDDEN_ESTIMATE_ANSWER_PHRASES) {
    expect(answerText.toLowerCase()).not.toContain(phrase);
  }
  return result;
}

export function expectEstimateIntent(prompt: string): EstimateIntentRoute {
  const route = classifyEstimateIntent(prompt);
  expect(route.isEstimateIntent).toBe(true);
  expect(route.shouldCallEstimateTool).toBe(true);
  expect(route.forbiddenFallbackToRoleQa).toBe(true);
  return route;
}

export function expectRoleQaRoutesToGlobalEstimate(prompt: string, role = "director") {
  const answer = answerUniversalRoleQa({
    questionRu: prompt,
    role,
    screenId: "chat",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  expect(answer.intent).toBe("construction_estimate");
  expect(answer.globalEstimateResult).toBeDefined();
  expect(answer.estimateRoute?.shouldCallEstimateTool).toBe(true);
  expect(answer.estimateActions?.some((action) => action.id === "make_pdf" && action.visible)).toBe(true);
  expect(answer.sections[0]?.items[0]?.textRu).toContain("Сделать PDF");
  return answer;
}
