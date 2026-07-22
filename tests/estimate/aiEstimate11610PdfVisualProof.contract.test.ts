import {
  runAiEstimate11610PdfVisualProof,
  STOP_AI_ESTIMATE_11610_PDF_VISUAL_1000_BLOCKED_NO_RELEASE,
} from "../../scripts/e2e/runAiEstimate11610PdfVisualProof";

describe("AI estimate 11610 PDF visual proof", () => {
  it("runs a real visual PDF smoke without claiming the full 1000-case gate", () => {
    const result = runAiEstimate11610PdfVisualProof({ limit: 1 });

    expect(result.summary.selected_templates).toBe(1);
    expect(result.summary.cases_completed).toBe(1);
    expect(result.summary.cases_passed).toBe(1);
    expect(result.summary.cases_failed).toBe(0);
    expect(result.summary.full_1000_pdf_visual_passed).toBe(false);
    expect(result.summary.limited_smoke_only).toBe(true);
    expect(result.summary.failure_samples).toEqual([]);
    expect(result.summary.final_status).toBe(STOP_AI_ESTIMATE_11610_PDF_VISUAL_1000_BLOCKED_NO_RELEASE);
  });
});
