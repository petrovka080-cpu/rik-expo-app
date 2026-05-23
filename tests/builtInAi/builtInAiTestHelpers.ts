import { answerBuiltInAi, type BuiltInAiAnswer, type BuiltInAiScreenContext } from "../../src/lib/ai/builtInAi";

export const BUILT_IN_AI_PROMPTS = {
  requestTile15: "Хочу уложить плитку на 15 кв метров",
  requestWindow: "Хочу заменить пластиковое окно 1.5 на 1.5 м",
  foremanTile174: "смета на укладку плитки кафельной на 174 кв м",
  foremanCarpet100: "мне нужно уложить ковролин на 100 кв м",
  roof100: "дай смету на устройство двускатной крыши основание 100 кв метров",
  brick74: "дай смету на кладку кирпича 74 кв метров",
  asphalt10000: "дай смету на прокладку асфальта на 10000 кв метров",
  rebarProduct: "найди арматуру Ø14 для каркаса дома",
  tileProduct: "подбери плитку для ванной 40 м²",
  laminateProduct: "найди ламинат на 100 м²",
} as const;

export function runBuiltInAi(prompt: string, screenContext: BuiltInAiScreenContext = "chat", role = "foreman"): BuiltInAiAnswer {
  return answerBuiltInAi({
    text: prompt,
    screenContext,
    route: screenContext === "request" ? "/request" : screenContext === "foreman" ? "/ai?context=foreman" : "/ai",
    role,
    countryCode: "KG",
    cityOrRegion: "Bishkek",
    userId: "test-user",
  });
}

export function expectBuiltInEstimate(prompt: string, expectedWorkKey: string, screenContext: BuiltInAiScreenContext = "chat") {
  const answer = runBuiltInAi(prompt, screenContext, screenContext === "foreman" ? "foreman" : "unknown");
  expect(answer.route.intent).toBe("estimate");
  expect(answer.toolResult.toolName).toBe("calculate_global_estimate");
  expect(answer.toolResult.backendCalled).toBe(true);
  expect(answer.toolResult.estimate?.work.workKey).toBe(expectedWorkKey);
  expect(answer.answerTextRu).toContain("|");
  expect(answer.answerTextRu).toMatch(/Источники|Sources/i);
  expect(answer.actions.some((action) => action.id === "make_pdf" && action.visible)).toBe(true);
  expect(answer.runtimeTrace.outputContract).toMatchObject({
    hasTable: true,
    hasMaterials: true,
    hasLabor: true,
    hasSources: true,
    hasPdfAction: true,
  });
  const rows = answer.toolResult.estimate?.sections.flatMap((section) => section.rows) ?? [];
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.filter((row) => row.unitPrice != null).every((row) => row.sourceEvidence.length > 0)).toBe(true);
  return answer;
}

export function expectBuiltInProductSearch(prompt: string) {
  const answer = runBuiltInAi(prompt, "chat", "buyer");
  expect(["product_search", "marketplace_lookup"]).toContain(answer.route.intent);
  expect(answer.toolResult.backendCalled).toBe(true);
  expect(answer.toolResult.productSearch?.candidates.length).toBeGreaterThan(0);
  expect(answer.toolResult.productSearch?.sourceBacked).toBe(true);
  expect(answer.toolResult.productSearch?.fakeStockOrAvailabilityFound).toBe(false);
  expect(answer.answerTextRu).toContain("|");
  expect(answer.answerTextRu.toLowerCase()).not.toContain("в наличии");
  return answer;
}

export function expectNoGenericEstimateFallback(answer: BuiltInAiAnswer): void {
  const forbidden = [
    "Осмотр и уточнение объёма работ",
    "Ремонтные работы после согласования",
    "За 2026 найдено работ",
    "Источник ответа: данные приложения",
    "Интернет не использовался",
    "Marketplace не использовался",
    "не найдено",
  ];
  for (const phrase of forbidden) {
    expect(answer.answerTextRu.toLowerCase()).not.toContain(phrase.toLowerCase());
  }
}
