import fs from "node:fs";
import path from "node:path";

import { calculateGlobalConstructionEstimateSync, type GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";
import { createAiEstimatePdf, validateAiEstimatePdf, type AiEstimatePdfDocument } from "../../src/lib/aiEstimatePdf";
import { createEstimatePdf, extractEstimatePdfTextForProof } from "../../src/lib/estimatePdf";

export const SAFE_INTEGRATION_WAVE =
  "S_AI_ESTIMATE_PDF_SAFE_INTEGRATION_WITH_LEGACY_PDF_PROTECTION_DECISION_GATE_POINT_OF_NO_RETURN";
export const SELECTED_OPTION = "OPTION_B_ADD_ISOLATED_AI_ESTIMATE_PDF_RENDERER_ADAPTER";

export function artifactPath(name: string): string {
  return path.resolve(process.cwd(), "artifacts", name);
}

export function readJsonArtifact<T = Record<string, unknown>>(name: string): T {
  return JSON.parse(fs.readFileSync(artifactPath(name), "utf8")) as T;
}

export function readRepoFile(filePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), filePath), "utf8");
}

export function buildSafeIntegrationEstimate(workKey = "brick_masonry", volume = 74): GlobalEstimateResult {
  return calculateGlobalConstructionEstimateSync({
    explicitWorkKey: workKey,
    volume,
    unit: "sq_m",
    countryCode: "KG",
    city: "Bishkek",
    language: "ru",
    locale: "ru-KG",
    currency: "KGS",
  });
}

export function buildSafeIntegrationPdf(workKey = "brick_masonry", volume = 74): {
  estimate: GlobalEstimateResult;
  pdf: AiEstimatePdfDocument;
} {
  const estimate = buildSafeIntegrationEstimate(workKey, volume);
  const pdf = createAiEstimatePdf({
    estimate,
    runtimeTraceId: `test:${workKey}:${volume}`,
    route: "/chat",
    generatedAt: "2026-05-24T00:00:00.000Z",
    documentMode: "estimate",
  });
  return { estimate, pdf };
}

export function expectValidAiPdf(pdf: AiEstimatePdfDocument, estimate: GlobalEstimateResult): void {
  const validation = validateAiEstimatePdf({
    pdf: pdf.bytes,
    knownWorkKey: estimate.work.workKey,
    requiredText: [estimate.work.title, estimate.totals.displayGrandTotal, estimate.tax.taxLabel],
  });
  expect(validation.valid).toBe(true);
  expect(validation.failures).toEqual([]);
}

export function buildLegacyPdfProof() {
  const estimate = buildSafeIntegrationEstimate();
  const pdf = createEstimatePdf({
    estimate,
    runtimeTrace: {
      traceId: "legacy-test",
      selectedRoute: "estimate",
      selectedTool: "calculate_global_estimate",
      workKey: estimate.work.workKey,
    },
    generatedAt: "2026-05-24T00:00:00.000Z",
    language: "ru",
  });
  const extraction = extractEstimatePdfTextForProof({
    pdf: pdf.bytes,
    knownWorkKey: estimate.work.workKey,
    requiredText: [estimate.estimateId, estimate.totals.displayGrandTotal],
  });
  return { estimate, pdf, extraction };
}
