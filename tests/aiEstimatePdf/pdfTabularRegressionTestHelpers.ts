import { calculateGlobalConstructionEstimateSync, type GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";
import { createAiEstimatePdf, type AiEstimatePdfDocument } from "../../src/lib/aiEstimatePdf";
import { createEstimatePdf, extractEstimatePdfTextForProof } from "../../src/lib/estimatePdf";

export const PDF_TABULAR_REGRESSION_CASES = [
  {
    id: "roof_waterproofing",
    prompt: "гидроизоляция крыши 100 м²",
    expectedWorkKey: "roof_waterproofing",
  },
  {
    id: "bathroom_waterproofing",
    prompt: "гидроизоляция ванной 30 м²",
    expectedWorkKey: "bathroom_waterproofing",
  },
  {
    id: "foundation_waterproofing",
    prompt: "гидроизоляция фундамента 80 м²",
    expectedWorkKey: "foundation_waterproofing",
  },
  {
    id: "gable_roof_installation",
    prompt: "двускатная крыша 100 м²",
    expectedWorkKey: "gable_roof_installation",
  },
  {
    id: "brick_masonry",
    prompt: "кладка кирпича 74 м²",
    expectedWorkKey: "brick_masonry",
  },
  {
    id: "asphalt_paving",
    prompt: "асфальтирование 1000 м²",
    expectedWorkKey: "asphalt_paving",
  },
  {
    id: "ceramic_tile_floor_laying",
    prompt: "плитка на пол 174 м²",
    expectedWorkKey: "ceramic_tile_floor_laying",
  },
] as const;

export function buildPdfTabularRegressionEstimate(prompt: string): GlobalEstimateResult {
  return calculateGlobalConstructionEstimateSync({
    text: prompt,
    countryCode: "KG",
    city: "Bishkek",
    language: "ru",
    locale: "ru-KG",
    currency: "KGS",
  });
}

export function buildPdfTabularRegressionPdf(prompt: string = PDF_TABULAR_REGRESSION_CASES[0].prompt): {
  estimate: GlobalEstimateResult;
  pdf: AiEstimatePdfDocument;
} {
  const estimate = buildPdfTabularRegressionEstimate(prompt);
  const pdf = createAiEstimatePdf({
    estimate,
    runtimeTraceId: `pdf-tabular-regression:${estimate.work.workKey}`,
    route: "/request",
    generatedAt: "2026-05-26T00:00:00.000Z",
    documentMode: "estimate",
  });
  return { estimate, pdf };
}

export function buildLegacyPdfRegressionProof() {
  const estimate = buildPdfTabularRegressionEstimate("кладка кирпича 74 м²");
  const pdf = createEstimatePdf({
    estimate,
    runtimeTrace: {
      traceId: "legacy-pdf-tabular-regression",
      selectedRoute: "estimate",
      selectedTool: "calculate_global_estimate",
      workKey: estimate.work.workKey,
    },
    generatedAt: "2026-05-26T00:00:00.000Z",
    language: "ru",
  });
  const extraction = extractEstimatePdfTextForProof({
    pdf: pdf.bytes,
    knownWorkKey: estimate.work.workKey,
    requiredText: [estimate.totals.displayGrandTotal],
  });
  return { estimate, pdf, extraction };
}
