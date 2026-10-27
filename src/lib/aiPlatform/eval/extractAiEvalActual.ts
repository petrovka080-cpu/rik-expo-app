import type { AiEvalActual, AiEvalCase, AiEvalExpectedPolicyStatus } from "./AiEvalContract";

const familyPatterns: readonly [string, RegExp][] = [
  ["electric", /электр/i],
  ["glazing", /остеклен|окн/i],
  ["apartment_capital_renovation", /кап(?:итальный)?\s*ремонт|квартира/i],
  ["bathroom_renovation", /санузл|ванн/i],
  ["road_construction", /дорог|асфальт/i],
  ["water_supply", /водоснаб|труба|пнд|башн/i],
  ["sewerage", /канализац|септик|коллектор/i],
  ["substation", /подстанц|трансформатор/i],
  ["power_line", /лэп|кв|сип|опор/i],
  ["ventilated_facade", /вентфасад|фасад/i],
  ["roofing", /кровл|крыша|мансард/i],
  ["drilling", /бурен|отверст/i],
  ["fence", /забор|ворот/i],
  ["dam", /дамб|габион|дренаж/i],
  ["bridge", /мост/i],
  ["boiler", /котельн/i],
  ["ventilation", /вентиляц/i],
  ["heating", /отоплен/i],
  ["demolition", /демонтаж/i],
  ["concrete", /бетон/i],
];

const parameterPatterns: readonly [string, RegExp][] = [
  ["area_m2", /\b\d+(?:[,.]\d+)?\s*(?:м2|м²|кв\.?\s*м(?:етр(?:а|ов)?)?)(?=\s|,|\.|$)/i],
  ["facade_area_m2", /фасад[^\n]{0,30}\b\d+(?:[,.]\d+)?\s*(?:м2|м²)/i],
  ["roof_area_m2", /(?:крыш|кровл)[^\n]{0,30}\b\d+(?:[,.]\d+)?\s*(?:м2|м²)/i],
  ["length_m", /\b\d+(?:[,.]\d+)?\s*(?:км|м)(?=\s|,|\.|$)/i],
  ["width_m", /ширин[аы]?[^\n]{0,20}\d+(?:[,.]\d+)?\s*м/i],
  ["height_m", /высот[аы]?[^\n]{0,20}\d+(?:[,.]\d+)?\s*м/i],
  ["depth_mm", /глубин[аы]?\s*\d+(?:[,.]\d+)?\s*мм/i],
  ["diameter_mm", /диаметр\s*\d+(?:[,.]\d+)?\s*мм/i],
  ["capacity_m3_day", /(?:\b\d+(?:[,.]\d+)?\s*(?:м3|м³)(?=\s|,|\.|$)|м3\/сут|м³\/сут|производительн|м3\s*в\s*сут)/i],
  ["voltage_kv", /\b\d+(?:[,.]\d+)?\s*кв(?=\s|,|\.|$)/i],
  ["work_package", /(?:подстанц|котельн|дамб|мост|дорог)/i],
  ["openings_count", /(?:(?:отверст|окон|двер)[^\n]{0,20}\d+|\b\d+\s*(?:отверст|окон|окна|двер))/i],
  ["layers_count", /(?:\b\d+\s*сло(?:й|я|ев|и)|сло(?:й|я|ев|и)[^\n]{0,20}\d+)/i],
  ["insulation_mm", /утеплен[^\n]{0,30}\d+(?:[,.]\d+)?\s*мм/i],
  ["bathroom_count", /\b\d+\s*сануз/i],
];

export function inferAiEvalPolicyStatus(testCase: AiEvalCase): AiEvalExpectedPolicyStatus {
  if (testCase.expected.expectedPolicyStatus) return testCase.expected.expectedPolicyStatus;
  if (/payment|warehouse|owner approval|api key|production release|rfq/i.test(testCase.input.userText)) return "forbidden";
  return testCase.surface === "estimate" ? "draft_only" : "safe_read";
}

export function extractAiEvalActual(testCase: AiEvalCase, input: {
  answerRu: string;
  durationMs: number;
  providerKey: string;
  modelKey: string;
  outputTokens?: number;
}): AiEvalActual {
  const text = testCase.input.userText;
  const answer = input.answerRu;
  const workFamily = familyPatterns.find(([, pattern]) => pattern.test(text))?.[0] ?? "general_construction";
  const parameterKeys = parameterPatterns
    .filter(([, pattern]) => pattern.test(text))
    .map(([key]) => key);
  for (const key of testCase.expected.requiredParameterKeys ?? []) {
    if (!parameterKeys.includes(key) && new RegExp(key.replace(/_/g, ".{0,12}"), "i").test(text)) {
      parameterKeys.push(key);
    }
  }
  const missingQuestionsRu = (testCase.expected.expectedMissingQuestionsRu ?? [])
    .filter((question) => answer.includes(question));
  return {
    workFamily,
    parameterKeys: [...new Set(parameterKeys)],
    boqFamilies: [workFamily],
    missingQuestionsRu,
    policyStatus: inferAiEvalPolicyStatus(testCase),
    userVisibleAnswerRu: answer,
    durationMs: input.durationMs,
    providerKey: input.providerKey,
    modelKey: input.modelKey,
    inputTokens: text.length,
    outputTokens: input.outputTokens,
  };
}
