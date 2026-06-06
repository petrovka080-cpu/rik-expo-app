import fs from "node:fs";
import path from "node:path";

import { runEstimateStructuredPipelineUiPdfBindingCloseout } from "../../scripts/audit/runEstimateStructuredPipelineUiPdfBindingCloseout";

describe("estimate structured pipeline UI/PDF binding closeout", () => {
  it("keeps request, marketplace, history, foreman AI, and PDF rows on the structured source of truth", () => {
    const proof = runEstimateStructuredPipelineUiPdfBindingCloseout();

    expect(proof.failures).toEqual([]);
    expect(proof.matrix).toMatchObject({
      passed: true,
      request_ui_pdf_payload_bound: true,
      marketplace_payload_bound: true,
      history_pdf_bound: true,
      foreman_ai_structured_estimate_bound: true,
      consumer_pdf_no_prompt_recalc: true,
      pdf_no_visible_internal_keys: true,
      pdf_no_mojibake: true,
      fake_green_claimed: false,
    });

    const matrixPath = path.resolve(
      process.cwd(),
      "artifacts",
      "S_ESTIMATE_STRUCTURED_PIPELINE_UI_PDF_BINDING",
      "matrix.json",
    );
    expect(fs.existsSync(matrixPath)).toBe(true);
  });
});
