import {
  answerBuiltInAi,
  type AiRouteParityTrace,
  type BuiltInAiAnswer,
} from "../../src/lib/ai/builtInAi";
import {
  P0_UNFINISHED_AI_ESTIMATE_CASES,
  validateAiEstimateCoreAnswer,
  type UnfinishedAiEstimateCase,
} from "../../src/lib/ai/globalEstimate";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";

export type AiRouteParityRoute = "/chat" | "/ai" | "/request";

export const ROUTE_PARITY_ROUTES: readonly AiRouteParityRoute[] = ["/chat", "/ai", "/request"] as const;

const REQUIRED_CASE_IDS = new Set(["001", "002", "004", "005", "006"]);

export const ROUTE_PARITY_CASES: readonly UnfinishedAiEstimateCase[] = P0_UNFINISHED_AI_ESTIMATE_CASES.filter((testCase) =>
  REQUIRED_CASE_IDS.has(testCase.id),
);

if (ROUTE_PARITY_CASES.length !== REQUIRED_CASE_IDS.size) {
  throw new Error(`ROUTE_PARITY_CASE_PACK_INVALID:${ROUTE_PARITY_CASES.map((testCase) => testCase.id).join(",")}`);
}

export function toCoreRoute(route: AiRouteParityRoute): "chat" | "ai_foreman" | "request" {
  if (route === "/ai") return "ai_foreman";
  if (route === "/request") return "request";
  return "chat";
}

export function answerRouteParityCase(testCase: UnfinishedAiEstimateCase, route: AiRouteParityRoute): BuiltInAiAnswer {
  return answerBuiltInAi({
    text: testCase.promptRu,
    screenContext: route === "/ai" ? "foreman" : route.slice(1),
    route: route === "/ai" ? "/ai?context=foreman" : route,
    role: route === "/request" ? "consumer" : "foreman",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
}

export function buildAiRouteParityTrace(params: {
  route: AiRouteParityRoute;
  testCase: UnfinishedAiEstimateCase;
  answer: BuiltInAiAnswer;
}): AiRouteParityTrace {
  const { answer, route, testCase } = params;
  const estimate = answer.toolResult.estimate;
  const failures: string[] = [];
  if (answer.route.intent !== "estimate" || answer.runtimeTrace.detectedIntent !== "estimate") failures.push("intent_not_estimate");
  if (answer.toolResult.toolName !== "calculate_global_estimate" || answer.runtimeTrace.selectedTool !== "calculate_global_estimate") {
    failures.push("backend_tool_not_selected");
  }
  if (!answer.toolResult.backendCalled || !answer.runtimeTrace.backendCalled) failures.push("backend_not_called");
  if (!estimate) failures.push("structured_result_missing");
  if (estimate && estimate.work.workKey !== testCase.expectedWorkKey) failures.push("work_key_mismatch");
  if (!answer.runtimeTrace.outputContract.hasTable) failures.push("ui_table_missing");
  if (!answer.actions.some((action) => action.id === "make_pdf" && action.visible)) failures.push("pdf_action_missing");
  if (failures.length) {
    throw new Error(`AI_ROUTE_PARITY_TRACE_INVALID:${testCase.id}:${route}:${failures.join(",")}`);
  }
  if (!estimate) {
    throw new Error(`AI_ROUTE_PARITY_ESTIMATE_MISSING:${testCase.id}:${route}`);
  }
  return {
    route,
    prompt: testCase.promptRu,
    detectedIntent: "estimate",
    workKey: estimate.work.workKey,
    selectedTool: "calculate_global_estimate",
    backendCalled: true,
    structuredResultUsed: true,
    uiRenderedTable: true,
    actions: answer.actions.filter((action) => action.visible).map((action) => action.id),
  };
}

export function expectRouteParityAnswer(testCase: UnfinishedAiEstimateCase, route: AiRouteParityRoute): AiRouteParityTrace {
  const answer = answerRouteParityCase(testCase, route);
  const validation = validateAiEstimateCoreAnswer({ testCase, answer, route: toCoreRoute(route) });
  expect(validation.failures).toEqual([]);
  expect(validation.passed).toBe(true);
  return buildAiRouteParityTrace({ route, testCase, answer });
}

export function expectNoGenericRows(text: string, testCase: UnfinishedAiEstimateCase): void {
  const lowerText = text.toLocaleLowerCase("ru-RU");
  for (const forbidden of testCase.forbiddenRowsContain) {
    expect(lowerText).not.toContain(forbidden.toLocaleLowerCase("ru-RU"));
  }
}

export function buildRequestDraftForRouteParity(testCase: UnfinishedAiEstimateCase) {
  const draft = buildConsumerRepairAiDraft(testCase.promptRu);
  const itemText = draft.items.map((item) => item.titleRu).join("\n");
  expect(draft.items.length).toBeGreaterThan(0);
  expect(draft.repairType).toBeTruthy();
  expect(draft.repairType).not.toBe("repair");
  expect(draft.items.every((item) => item.source === "reference_price_book")).toBe(true);
  for (const token of testCase.expectedRowsContain) {
    expect(itemText.toLocaleLowerCase("ru-RU")).toContain(token.toLocaleLowerCase("ru-RU"));
  }
  expectNoGenericRows(itemText, testCase);
  return draft;
}

export function totalFor(testCase: UnfinishedAiEstimateCase, route: AiRouteParityRoute): number {
  const answer = answerRouteParityCase(testCase, route);
  const total = answer.toolResult.estimate?.totals.grandTotal;
  if (total == null || Number.isNaN(total)) {
    throw new Error(`AI_ROUTE_PARITY_TOTAL_MISSING:${testCase.id}:${route}`);
  }
  return total;
}
