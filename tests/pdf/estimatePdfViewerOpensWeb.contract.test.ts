import fs from "node:fs";
import path from "node:path";

describe("estimate PDF web viewer contract", () => {
  it("has a live web spec that clicks make_pdf, opens /pdf-viewer and extracts text", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "tests/e2e/estimatePdf.web.spec.ts"), "utf8");
    expect(source).toContain("ai-estimate-make-pdf");
    expect(source).toContain("waitForURL(/pdf-viewer/");
    expect(source).toContain("estimatePdfInputToBytes");
    expect(source).toContain("extractEstimatePdfTextForProof");
    expect(source).toContain("artifacts");
    expect(source).toContain("estimate-pdf-reality");
  });
});
