import fs from "node:fs";
import path from "node:path";

describe("AI 1000 post-BOQ architecture: no hardcoded foundation patch", () => {
  it("uses the global estimate templates instead of a prompt-only foundation patch", () => {
    const seed = fs.readFileSync(path.join(process.cwd(), "src/lib/ai/globalEstimate/globalEstimateSeedData.ts"), "utf8");
    const cases = fs.readFileSync(path.join(process.cwd(), "src/lib/ai/builtInAi1000/builtInAi1000PostBoqCatalogCases.ts"), "utf8");

    expect(seed).toContain('definition.category === "foundation"');
    expect(cases).not.toContain("hardcodedFoundationOnlyPatch");
    expect(cases).not.toContain("foundationOnlyPatch");
  });
});
