import { evaluateAiEstimatePdfJobGuard, type AiEstimatePdfJobGuardInput } from "./aiEstimatePdfJobGuard";

export function evaluateAiEstimatePdfRateLimit(input: Pick<AiEstimatePdfJobGuardInput, "concurrentJobs" | "pdfsForSession" | "retryCount">) {
  return evaluateAiEstimatePdfJobGuard({
    ...input,
    fileSizeBytes: 0,
    generationDurationMs: 0,
  });
}
