import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import {
  buildAiEstimatePdfSourceFromGlobalEstimate,
  generateAiEstimatePdf,
} from "../../src/lib/ai/estimatePdf";
import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairRequestPdf,
} from "../../src/lib/consumerRequests";
import { validateEstimatePdf } from "../../src/lib/estimatePdf";

export type LiveEstimateCase = {
  id: string;
  route: "/ai" | "/chat" | "/request";
  prompt: string;
  expectedWorkKey: string;
  expectedTokens: string[];
};

export const LIVE_ESTIMATE_CASES: LiveEstimateCase[] = [
  {
    id: "asphalt_1000sqm",
    route: "/ai",
    prompt: "сделай мне смету на асфальтирование на 1000 кв м",
    expectedWorkKey: "asphalt_paving",
    expectedTokens: ["песчан", "щеб", "битум", "асфальтобетон", "техник", "уклад", "уплотнен"],
  },
  {
    id: "gkl_352sqm",
    route: "/chat",
    prompt: "смету на установку ГКЛ на 352 кв м",
    expectedWorkKey: "drywall_partition",
    expectedTokens: ["листы гкл", "направляющий профиль", "стоечный профиль", "креп", "лента для швов", "шпакл", "монтаж каркаса", "обшивка гкл"],
  },
  {
    id: "gable_roof_100sqm",
    route: "/chat",
    prompt: "дай смету на устройство двускатной крыши основание 100 кв метров",
    expectedWorkKey: "gable_roof_installation",
    expectedTokens: ["стропил", "мауэрлат", "гидроизоляц", "обреш", "кровельное покрытие", "добор", "монтаж стропильной", "монтаж кровли"],
  },
  {
    id: "brick_masonry_74sqm",
    route: "/chat",
    prompt: "дай смету на кладку кирпича 74 кв метров",
    expectedWorkKey: "brick_masonry",
    expectedTokens: ["кирпич", "раствор", "кладочная смесь", "кладочная сетка", "кладка", "расшив", "доставка"],
  },
];

export const CARPET_REQUEST_CASE: LiveEstimateCase = {
  id: "carpet_100sqm_request",
  route: "/request",
  prompt: "Хочу уложить ковролин на 100 кв м",
  expectedWorkKey: "carpet_laying",
  expectedTokens: ["ковролин", "подложка", "клей", "плинтус", "подготовка основания", "укладка ковролина", "подрезка"],
};

export const FORBIDDEN_GENERIC_ROW_PATTERNS = [
  /Основной материал:\s*Строительные работы/i,
  /Подготовка:\s*Строительные работы/i,
  /^Строительные работы$/i,
  /Материалы:\s*Строительные работы/i,
  /Работы:\s*Строительные работы/i,
];

function lower(value: string): string {
  return value.toLocaleLowerCase("ru-RU");
}

export function buildLiveEstimate(prompt: string, route: "/ai" | "/chat" = "/ai"): GlobalEstimateResult {
  const answer = answerBuiltInAi({
    text: prompt,
    screenContext: route === "/chat" ? "chat" : "foreman",
    route,
    role: "foreman",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  if (!answer.toolResult.estimate) {
    throw new Error(`Expected estimate for prompt: ${prompt}`);
  }
  return answer.toolResult.estimate;
}

export function allRowNames(estimate: GlobalEstimateResult): string[] {
  return estimate.sections.flatMap((section) => section.rows.map((row) => row.name));
}

export function expectSpecificRows(estimate: GlobalEstimateResult, expectedTokens: string[]): void {
  const rowText = lower(allRowNames(estimate).join("\n"));
  for (const token of expectedTokens) {
    expect(rowText).toContain(lower(token));
  }
}

export function expectNoGenericConstructionRows(estimate: GlobalEstimateResult): void {
  for (const row of estimate.sections.flatMap((section) => section.rows)) {
    for (const pattern of FORBIDDEN_GENERIC_ROW_PATTERNS) {
      expect(row.name).not.toMatch(pattern);
    }
  }
}

export function generateAndValidateLivePdf(estimate: GlobalEstimateResult) {
  const source = buildAiEstimatePdfSourceFromGlobalEstimate(estimate, {
    userId: "live-ai-estimate-pdf-reality-test",
  });
  const pdf = generateAiEstimatePdf({ source, userConfirmed: true });
  const validation = validateEstimatePdf({
    pdf: pdf.access.uri,
    knownWorkKey: estimate.work.workKey,
  });
  expect(validation.valid).toBe(true);
  return { pdf, validation };
}

export function buildCarpetRequestDraftAndPdf() {
  __resetConsumerRepairRequestStoreForTests();
  const aiDraft = buildConsumerRepairAiDraft(CARPET_REQUEST_CASE.prompt);
  const bundle = createConsumerRepairRequestDraft({
    consumerUserId: "live-request-user",
    problemText: CARPET_REQUEST_CASE.prompt,
    repairType: "Пол",
    aiDraft,
  });
  const withPdf = generateConsumerRepairRequestPdfForDraft({
    requestDraftId: bundle.draft.id,
    userId: "live-request-user",
  });
  const opened = getConsumerRepairRequestPdf({ requestDraftId: withPdf.draft.id });
  const validation = validateEstimatePdf({
    pdf: opened.signedUrl,
    knownWorkKey: CARPET_REQUEST_CASE.expectedWorkKey,
  });
  return { aiDraft, bundle: withPdf, opened, validation };
}
