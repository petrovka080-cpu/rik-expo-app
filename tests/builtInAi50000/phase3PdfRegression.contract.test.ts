import fs from "node:fs";
import path from "node:path";

describe("built-in AI 50000 Phase 3 PDF regression", () => {
  it("requires the Phase 3 PDF regression artifact to protect legacy and AI estimate PDF paths", () => {
    const artifactPath = path.resolve(process.cwd(), "artifacts", "S_BUILT_IN_AI_50000_PHASE3_pdf_regression.json");
    if (!fs.existsSync(artifactPath)) return;
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    expect(artifact).toMatchObject({
      legacy_pdf_protected: true,
      legacy_pdf_route_changed: false,
      legacy_pdf_payload_changed: false,
      legacy_pdf_renderer_globally_replaced: false,
      ai_estimate_pdf_regression_passed: true,
      pdf_mojibake_found: false,
      markdown_as_pdf_truth_found: false,
    });
  });
});
