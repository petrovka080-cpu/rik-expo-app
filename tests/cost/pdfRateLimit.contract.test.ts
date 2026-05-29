import { evaluateAiEstimatePdfJobGuard } from "../../src/lib/estimatePdf";

describe("PDF rate limit", () => {
  it("defers PDF work with a visible reason when session limit is exceeded", () => {
    const result = evaluateAiEstimatePdfJobGuard({
      concurrentJobs: 1,
      pdfsForSession: 11,
      fileSizeBytes: 1000,
      generationDurationMs: 10,
      retryCount: 0,
    });
    expect(result.allowed).toBe(false);
    expect(result.visibleReasonRu).toBeTruthy();
  });
});
