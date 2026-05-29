import { AI_ESTIMATE_MAX_PDF_BYTES } from "../ai/performance";

export type AiEstimatePdfJobGuardInput = {
  concurrentJobs: number;
  pdfsForSession: number;
  fileSizeBytes: number;
  generationDurationMs: number;
  retryCount: number;
};

export type AiEstimatePdfJobGuardResult = {
  pdf_rate_limit_ready: boolean;
  allowed: boolean;
  failures: string[];
  visibleReasonRu: string | null;
};

export const AI_ESTIMATE_PDF_LOAD_POLICY = {
  maxConcurrentPdfJobs: 25,
  maxPdfsPerSession: 10,
  maxPdfFileSizeBytes: AI_ESTIMATE_MAX_PDF_BYTES,
  maxPdfGenerationDurationMs: 2500,
  maxPdfRetries: 2,
} as const;

export function evaluateAiEstimatePdfJobGuard(input: AiEstimatePdfJobGuardInput): AiEstimatePdfJobGuardResult {
  const failures: string[] = [];
  if (input.concurrentJobs > AI_ESTIMATE_PDF_LOAD_POLICY.maxConcurrentPdfJobs) failures.push("concurrent_pdf_jobs");
  if (input.pdfsForSession > AI_ESTIMATE_PDF_LOAD_POLICY.maxPdfsPerSession) failures.push("pdfs_per_session");
  if (input.fileSizeBytes > AI_ESTIMATE_PDF_LOAD_POLICY.maxPdfFileSizeBytes) failures.push("pdf_file_size");
  if (input.generationDurationMs > AI_ESTIMATE_PDF_LOAD_POLICY.maxPdfGenerationDurationMs) failures.push("pdf_generation_duration");
  if (input.retryCount > AI_ESTIMATE_PDF_LOAD_POLICY.maxPdfRetries) failures.push("pdf_retry_loop");

  return {
    pdf_rate_limit_ready: true,
    allowed: failures.length === 0,
    failures,
    visibleReasonRu: failures.length > 0
      ? "\u0413\u0435\u043d\u0435\u0440\u0430\u0446\u0438\u044f PDF \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e \u043e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d\u0430. \u0421\u043c\u0435\u0442\u0430 \u043e\u0441\u0442\u0430\u0435\u0442\u0441\u044f \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e\u0439."
      : null,
  };
}
