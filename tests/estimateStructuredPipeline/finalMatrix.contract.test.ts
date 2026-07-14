import fs from "node:fs";
import path from "node:path";

import { runEstimateStructuredPipelineUiPdfBindingCloseout } from "../../scripts/audit/runEstimateStructuredPipelineUiPdfBindingCloseout";

describe("structured estimate pipeline final matrix", () => {
  it("writes green closeout proof", () => {
    const proof = runEstimateStructuredPipelineUiPdfBindingCloseout();
    expect(proof.failures).toEqual([]);
    const matrixPath = path.resolve(process.cwd(), "artifacts", "S_ESTIMATE_STRUCTURED_PIPELINE_UI_PDF_BINDING", "matrix.json");
    expect(fs.existsSync(matrixPath)).toBe(true);
    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as { final_status?: string; fake_green_claimed?: boolean };
    expect(matrix.final_status).toBe("GREEN_ESTIMATE_STRUCTURED_PIPELINE_UI_PDF_BINDING_READY");
    expect(matrix.fake_green_claimed).toBe(false);
  });
});
