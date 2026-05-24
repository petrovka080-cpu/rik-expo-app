import fs from "node:fs";
import path from "node:path";

describe("PDF integration no estimate calculation in PDF layer", () => {
  it("keeps calculators out of src/lib/aiEstimatePdf", () => {
    const dir = path.resolve(process.cwd(), "src/lib/aiEstimatePdf");
    const source = fs.readdirSync(dir)
      .filter((file) => file.endsWith(".ts"))
      .map((file) => fs.readFileSync(path.join(dir, file), "utf8"))
      .join("\n");
    expect(source).not.toMatch(/calculateGlobalConstructionEstimate|answerBuiltInAi|resolveWorkKey|ratebook/i);
    expect(source).toContain("GlobalEstimateResult");
  });
});
