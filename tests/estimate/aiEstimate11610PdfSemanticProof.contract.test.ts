import {
  runAiEstimate11610PdfSemanticProof,
  STOP_AI_ESTIMATE_11610_PDF_SEMANTIC_PARITY_BLOCKED_NO_RELEASE,
} from "../../scripts/e2e/runAiEstimate11610PdfSemanticProof";

describe("AI estimate 11610 PDF semantic proof", () => {
  it("runs a real PDF semantic smoke without claiming full PDF parity", () => {
    const result = runAiEstimate11610PdfSemanticProof({ limit: 1 });

    expect(result.summary.selected_templates).toBe(1);
    expect(result.summary.cases_completed).toBe(1);
    expect(result.summary.cases_passed).toBe(1);
    expect(result.summary.cases_failed).toBe(0);
    expect(result.summary.full_11610_pdf_semantic_passed).toBe(false);
    expect(result.summary.pdf_visual_render_1000_passed).toBe(false);
    expect(result.summary.limited_smoke_only).toBe(true);
    expect(result.summary.failure_samples).toEqual([]);
    expect(result.summary.final_status).toBe(STOP_AI_ESTIMATE_11610_PDF_SEMANTIC_PARITY_BLOCKED_NO_RELEASE);
  });
});
