import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { answerBuiltInAi } from "../../src/lib/ai/builtInAi/builtInAiIngress";
import {
  buildEstimatePresentationViewModel,
  isGenericKnownWorkRowName,
  validateEstimatePresentationViewModel,
  type EstimatePresentationViewModel,
} from "../../src/lib/ai/estimatePresentation";
import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate/globalEstimateTypes";

export const REQUEST_PROMPTS = {
  laminate: "Хочу уложить ламинат на 100 кв м",
  hydroTurbine: "смета на установку турбины на гэс мощностью 100 квт",
  roofWaterproofing: "хочу выполнить гидроизоляцию крыши на 100 кв м",
} as const;

export const EMBEDDED_AI_PROMPTS = {
  windows: "дай мне смету на установки окон",
  brick: "дай смету на кладку кирпича 74 кв метров",
  gableRoof: "дай смету на устройство двускатной крыши основание 100 кв метров",
  gkl: "смета на установку ГКЛ на стены 352 кв м",
  asphalt: "смета на асфальтирование 10000 кв м",
} as const;

export function estimateForRequest(prompt: string): GlobalEstimateResult {
  const result = answerBuiltInAi({
    text: prompt,
    screenContext: "request",
    route: "/request",
    role: "consumer",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  if (!result.toolResult.estimate) {
    throw new Error(`REQUEST_ESTIMATE_NOT_CREATED:${prompt}`);
  }
  return result.toolResult.estimate;
}

export function estimateForEmbeddedAi(prompt: string): GlobalEstimateResult {
  const result = answerBuiltInAi({
    text: prompt,
    screenContext: "foreman",
    route: "/ai?context=foreman",
    role: "foreman",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  if (!result.toolResult.estimate) {
    throw new Error(`EMBEDDED_AI_ESTIMATE_NOT_CREATED:${prompt}`);
  }
  return result.toolResult.estimate;
}

export function presentationForEstimate(result: GlobalEstimateResult): EstimatePresentationViewModel {
  const viewModel = buildEstimatePresentationViewModel(result);
  const validation = validateEstimatePresentationViewModel(viewModel);
  if (!validation.passed) {
    throw new Error(`PRESENTATION_INVALID:${validation.failures.join(",")}`);
  }
  return viewModel;
}

export function rowNames(viewModel: EstimatePresentationViewModel): string[] {
  return viewModel.rows.map((row) => row.name);
}

export function expectNoGenericKnownWorkRows(viewModel: EstimatePresentationViewModel): void {
  expect(viewModel.rows.filter((row) => isGenericKnownWorkRowName(row.name))).toEqual([]);
}

export function expectRowsContain(viewModel: EstimatePresentationViewModel, expected: readonly string[]): void {
  const haystack = rowNames(viewModel).join("\n").toLocaleLowerCase("ru-RU");
  for (const token of expected) {
    expect(haystack).toContain(token.toLocaleLowerCase("ru-RU"));
  }
}

export function requestDraft(prompt: string) {
  return buildConsumerRepairAiDraft(prompt);
}
