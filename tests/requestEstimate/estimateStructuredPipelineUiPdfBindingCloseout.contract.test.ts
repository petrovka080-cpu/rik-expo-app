import fs from "node:fs";
import path from "node:path";

import { runEstimateStructuredPipelineUiPdfBindingCloseout } from "../../scripts/audit/runEstimateStructuredPipelineUiPdfBindingCloseout";

describe("estimate structured pipeline UI/PDF binding closeout", () => {
  it("keeps request, marketplace, history, foreman AI, and PDF rows on the structured source of truth", () => {
    const artifactDir = path.resolve(
      process.cwd(),
      ".release-runtime",
      "jest-artifacts",
      "S_ESTIMATE_STRUCTURED_PIPELINE_UI_PDF_BINDING",
    );
    const proof = (() => {
      const previousArtifactDir = process.env.ESTIMATE_STRUCTURED_PIPELINE_UI_PDF_BINDING_ARTIFACT_DIR;
      process.env.ESTIMATE_STRUCTURED_PIPELINE_UI_PDF_BINDING_ARTIFACT_DIR = artifactDir;
      try {
        return runEstimateStructuredPipelineUiPdfBindingCloseout();
      } finally {
        if (previousArtifactDir === undefined) {
          delete process.env.ESTIMATE_STRUCTURED_PIPELINE_UI_PDF_BINDING_ARTIFACT_DIR;
        } else {
          process.env.ESTIMATE_STRUCTURED_PIPELINE_UI_PDF_BINDING_ARTIFACT_DIR = previousArtifactDir;
        }
      }
    })();

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

    const matrixPath = path.join(artifactDir, "matrix.json");
    expect(fs.existsSync(matrixPath)).toBe(true);
  });
});
