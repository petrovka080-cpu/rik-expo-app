import { AI_ESTIMATE_PDF_LOAD_POLICY, evaluateAiEstimatePdfJobGuard } from "./aiEstimatePdfJobGuard";

export function validateAiEstimatePdfLoadPolicy(): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  for (const [key, value] of Object.entries(AI_ESTIMATE_PDF_LOAD_POLICY)) {
    if (!Number.isFinite(value) || value <= 0) failures.push(`invalid_pdf_policy:${key}`);
  }
  const boundary = evaluateAiEstimatePdfJobGuard({
    concurrentJobs: AI_ESTIMATE_PDF_LOAD_POLICY.maxConcurrentPdfJobs,
    pdfsForSession: AI_ESTIMATE_PDF_LOAD_POLICY.maxPdfsPerSession,
    fileSizeBytes: AI_ESTIMATE_PDF_LOAD_POLICY.maxPdfFileSizeBytes,
    generationDurationMs: AI_ESTIMATE_PDF_LOAD_POLICY.maxPdfGenerationDurationMs,
    retryCount: AI_ESTIMATE_PDF_LOAD_POLICY.maxPdfRetries,
  });
  if (!boundary.allowed) failures.push("pdf_policy_blocks_boundary");
  return { passed: failures.length === 0, failures };
}
