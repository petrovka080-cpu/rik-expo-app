import * as fs from "fs";
import * as path from "path";

describe("AI estimate PDF no second PDF framework contract", () => {
  it("does not create a second PDF runner or viewer under estimatePdf", () => {
    const files = fs.readdirSync(path.resolve(process.cwd(), "src/lib/ai/estimatePdf"));

    expect(files).not.toContain("pdfRunner.ts");
    expect(files).not.toContain("pdfViewer.tsx");
    expect(files).not.toContain("estimatePdfRunner.ts");
  });
});
