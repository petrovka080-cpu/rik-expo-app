import fs from "node:fs";
import path from "node:path";
import { answerBuiltInAi } from "../../src/lib/ai/builtInAi/builtInAiIngress";
import { buildConstructionWorkPlan } from "../../src/lib/ai/constructionInterpreter";
import { validateConstructionUnitSemantics } from "../../src/lib/ai/constructionFormulas";
import {
  assertUiRowsMatchGlobalEstimate,
  buildProfessionalEstimateTableViewModel,
  validateProfessionalEstimateTableViewModel,
} from "../../src/lib/ai/estimatePresentation";
import type { EstimatePresentationViewModel } from "../../src/lib/ai/estimatePresentation";
import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";
import { createEstimatePdf } from "../../src/lib/estimatePdf";

export const FOREMAN_GABLE_PROMPT = "дай смету на установку двухскатной крыши высота конька 2,5 метра и основание 67 кв м";
export const FOREMAN_PAVING_PROMPT = "смета на укладку брусчатки на 587 кв м";
export const FOREMAN_CANOPY_PROMPT = "смета на металлический навес на площади 647 кв метров";
export const FOREMAN_APARTMENT_PROMPT = "смета на капитальный ремонт квартиры размер 36 кв. метров";
export const FOREMAN_ROOF_WATERPROOFING_PROMPT = "смета на гидроизоляцию крыши 100 кв м";
export const REQUEST_LINOLEUM_PROMPT = "Хочу уложить линолеум на 100 кв м";
export const REQUEST_PAVING_PROMPT = "укладка брусчатки 587 кв м";
export const REQUEST_CANOPY_PROMPT = "металлический навес 647 кв м";
export const REQUEST_APARTMENT_PROMPT = "капитальный ремонт квартиры 36 кв м";
export const REQUEST_GABLE_PROMPT = "устройство двускатной крыши основание 67 кв м высота конька 2.5 м";

export function answerFor(route: "/request" | "/ai?context=foreman", prompt: string) {
  return answerBuiltInAi({
    text: prompt,
    screenContext: route === "/request" ? "request" : "foreman",
    route,
    role: route === "/request" ? "consumer" : "foreman",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
}

export function estimateFor(route: "/request" | "/ai?context=foreman", prompt: string): GlobalEstimateResult {
  const answer = answerFor(route, prompt);
  if (!answer.toolResult.estimate) {
    throw new Error(`ESTIMATE_MISSING:${route}:${prompt}:${answer.toolResult.blockedBy ?? answer.toolResult.fallbackUsed ?? "no result"}`);
  }
  return answer.toolResult.estimate;
}

export function presentationFor(estimate: GlobalEstimateResult): EstimatePresentationViewModel {
  const viewModel = buildProfessionalEstimateTableViewModel(estimate);
  const validation = validateProfessionalEstimateTableViewModel(viewModel);
  if (!validation.passed) throw new Error(`PRESENTATION_INVALID:${validation.failures.join(",")}`);
  assertUiRowsMatchGlobalEstimate(estimate, viewModel);
  return viewModel;
}

export function rowText(estimate: GlobalEstimateResult): string {
  return estimate.sections.flatMap((section) => section.rows.map((row) => row.name)).join("\n").toLocaleLowerCase("ru-RU");
}

export function units(estimate: GlobalEstimateResult): string[] {
  return estimate.sections.flatMap((section) => section.rows.map((row) => row.unit));
}

export function expectRows(estimate: GlobalEstimateResult, tokens: readonly string[], minimum = tokens.length): void {
  const text = rowText(estimate);
  const found = tokens.filter((token) => text.includes(token.toLocaleLowerCase("ru-RU")));
  expect(found.length).toBeGreaterThanOrEqual(minimum);
}

export function expectForbiddenRowsAbsent(estimate: GlobalEstimateResult, tokens: readonly string[]): void {
  const text = rowText(estimate);
  for (const token of tokens) expect(text).not.toContain(token.toLocaleLowerCase("ru-RU"));
}

export function expectProfessionalEstimate(route: "/request" | "/ai?context=foreman", prompt: string, workKey: string): GlobalEstimateResult {
  const answer = answerFor(route, prompt);
  expect(answer.route.intent).toBe("estimate");
  expect(answer.toolResult.toolName).toBe("calculate_global_estimate");
  expect(answer.toolResult.blockedBy).toBeUndefined();
  expect(answer.toolResult.estimate?.work.workKey).toBe(workKey);
  const estimate = answer.toolResult.estimate as GlobalEstimateResult;
  expect(validateConstructionUnitSemantics(estimate).passed).toBe(true);
  presentationFor(estimate);
  return estimate;
}

export function pdfFor(estimate: GlobalEstimateResult) {
  return createEstimatePdf({
    estimate,
    runtimeTrace: { selectedTool: "calculate_global_estimate", selectedRoute: "estimate", workKey: estimate.work.workKey },
    generatedAt: "2026-05-28T00:00:00.000Z",
    language: "ru",
  });
}

export function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}
