import fs from "node:fs";
import path from "node:path";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { bindBoqRowsToCatalogItems } from "../../src/lib/ai/catalogBinding";
import {
  buildAiEstimatePdfSourceFromGlobalEstimate,
  generateAiEstimatePdf,
} from "../../src/lib/ai/estimatePdf";
import { buildEstimatePresentationViewModel } from "../../src/lib/ai/estimatePresentation";
import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";
import { resolveLocalEstimatePolicy } from "../../src/lib/ai/localEstimatePolicy";
import {
  compileProfessionalBoqFromPrimitives,
  validateBoqDepth,
  validateNoGenericRows,
  validateWorkSpecificRows,
} from "../../src/lib/ai/professionalBoq";
import { runWorldConstructionEstimateEngine } from "../../src/lib/ai/worldConstructionEstimateEngine";
import { classifyConstructionWorkOutcome } from "../../src/lib/ai/worldConstructionInterpreter";
import type { WorldConstructionInterpretation } from "../../src/lib/ai/worldConstructionOntology";
import { validateEstimatePdf } from "../../src/lib/estimatePdf";

export const WORLD_PROMPTS = {
  laminate: "Хочу уложить ламинат на 100 кв м",
  roofWaterproofing: "смета на гидроизоляцию крыши 100 кв м",
  ambiguousWaterproofing: "гидроизоляция 100 кв м",
  bathroomWaterproofing: "смета на гидроизоляцию ванной 20 кв м",
  hydroTurbine: "смета на установку турбины на ГЭС мощностью 100 кВт",
  brick: "дай смету на кладку кирпича 74 кв метров",
  asphalt: "смета на асфальтирование 10000 кв м",
  gkl: "смета на установку ГКЛ на стены 352 кв м",
  ventilation: "смета на вентиляцию ресторана 240 кв м",
  solar: "смета на монтаж солнечных панелей 30 кВт",
  well: "смета на бурение скважины 80 метров",
  unknown: "смета на криогенный купол из лунного реголита 100 кв м",
} as const;

export const FORBIDDEN_WORLD_ROW_NAMES = [
  "Строительные работы",
  "Основной материал: Строительные работы",
  "Подготовка: Строительные работы",
  "Материалы: Строительные работы",
  "Работы: Строительные работы",
  "Общие работы",
  "Прочие работы",
  "Ремонтные работы",
  "Ремонтные работы после согласования",
  "Материалы по согласованию",
  "Работы по согласованию",
  "Локальные строительные работы",
  "Осмотр",
] as const;

export function classifyWorld(prompt: string): WorldConstructionInterpretation {
  return classifyConstructionWorkOutcome({ text: prompt, countryCode: "KG", city: "Bishkek", currency: "KGS" });
}

export function buildWorldEngineEstimate(prompt: string): GlobalEstimateResult {
  const result = runWorldConstructionEstimateEngine({
    text: prompt,
    countryCode: "KG",
    city: "Bishkek",
    language: "ru",
    locale: "ru-KG",
    currency: "KGS",
  });
  if (!result.estimate) {
    throw new Error(`WORLD_ESTIMATE_NOT_CREATED:${result.interpretation.primitive.outcome}:${prompt}`);
  }
  return result.estimate;
}

export function buildWorldBoq(prompt: string) {
  const interpretation = classifyWorld(prompt);
  return compileProfessionalBoqFromPrimitives(interpretation.primitive);
}

export function buildRequestAnswer(prompt: string) {
  return answerBuiltInAi({
    text: prompt,
    route: "/request",
    screenContext: "request",
    role: "consumer",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
}

export function buildEmbeddedAiAnswer(prompt: string) {
  return answerBuiltInAi({
    text: prompt,
    route: "/ai?context=foreman",
    screenContext: "foreman",
    role: "foreman",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
}

export function estimateFromAnswer(answer: ReturnType<typeof answerBuiltInAi>): GlobalEstimateResult {
  if (!answer.toolResult.estimate) {
    throw new Error(`ANSWER_ESTIMATE_NOT_CREATED:${answer.toolResult.blockedBy ?? answer.toolResult.fallbackUsed ?? "none"}`);
  }
  return answer.toolResult.estimate;
}

export function rowNames(estimate: GlobalEstimateResult): string[] {
  return estimate.sections.flatMap((section) => section.rows.map((row) => row.name));
}

export function rowText(estimate: GlobalEstimateResult): string {
  return rowNames(estimate).join("\n").toLocaleLowerCase("ru-RU");
}

export function expectNoForbiddenWorldRows(estimate: GlobalEstimateResult): void {
  for (const row of rowNames(estimate)) {
    for (const forbidden of FORBIDDEN_WORLD_ROW_NAMES) {
      expect(row.trim().toLocaleLowerCase("ru-RU")).not.toBe(forbidden.toLocaleLowerCase("ru-RU"));
    }
  }
}

export function expectTokens(estimate: GlobalEstimateResult, tokens: readonly string[], min = tokens.length): void {
  const haystack = rowText(estimate);
  const matched = tokens.filter((token) => haystack.includes(token.toLocaleLowerCase("ru-RU")));
  expect(matched.length).toBeGreaterThanOrEqual(min);
}

export function expectProfessionalBoqValid(prompt: string): void {
  const boq = buildWorldBoq(prompt);
  const depth = validateBoqDepth(boq);
  const generic = validateNoGenericRows(boq);
  const specific = validateWorkSpecificRows(boq);
  expect({ depth, generic, specific }).toEqual({
    depth: expect.objectContaining({ passed: true }),
    generic: expect.objectContaining({ passed: true }),
    specific: expect.objectContaining({ passed: true }),
  });
}

export function expectPresentationAndPdf(estimate: GlobalEstimateResult): void {
  const viewModel = buildEstimatePresentationViewModel(estimate);
  expect(viewModel.rows.length).toBeGreaterThanOrEqual(12);
  expect(viewModel.actions.some((action) => action.id === "make_estimate_pdf" && action.visible)).toBe(true);
  const source = buildAiEstimatePdfSourceFromGlobalEstimate(estimate, { userId: "world-construction-test" });
  const pdf = generateAiEstimatePdf({ source, userConfirmed: true });
  const validation = validateEstimatePdf({ pdf: pdf.access.uri, knownWorkKey: estimate.work.workKey });
  expect(validation.valid).toBe(true);
  expect(validation.text).not.toMatch(/Ð|Ñ|�|undefined|\[object Object\]|NaN|null null/);
}

export async function bindCatalogWithNoProviderHits(estimate: GlobalEstimateResult) {
  return bindBoqRowsToCatalogItems({
    estimate,
    searchProvider: async () => [],
  });
}

export function localPolicyFor(prompt: string, countryCode?: string, city?: string) {
  return resolveLocalEstimatePolicy({ text: prompt, countryCode, city, locale: "ru-KG" });
}

export function requestDraftFor(prompt: string) {
  return buildConsumerRepairAiDraft(prompt);
}

export function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}
