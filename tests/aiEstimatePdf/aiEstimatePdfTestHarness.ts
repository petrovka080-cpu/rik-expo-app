import { buildConstructionEstimateAnswer } from "../../src/lib/ai/estimateEngine";
import { buildAiEstimatePdfSourceFromConstructionEstimate } from "../../src/lib/ai/estimatePdf";

export function buildAiEstimatePdfSourceFixture() {
  const estimate = buildConstructionEstimateAnswer("дай смету на укладку ламината 100 м²");
  return buildAiEstimatePdfSourceFromConstructionEstimate(estimate, {
    sourceId: "test_ai_estimate_laminate_100",
    userId: "consumer_test_user",
    createdAt: "2026-05-23T00:00:00.000Z",
  });
}
