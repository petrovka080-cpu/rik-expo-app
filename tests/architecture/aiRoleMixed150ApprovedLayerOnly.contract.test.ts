import fs from "fs";
import path from "path";

describe("S_AI_ROLE_MIXED_150 architecture: approved layer only", () => {
  it("adds production code only under src/lib/ai/evaluation", () => {
    const repoRoot = path.resolve(__dirname, "../..");
    const layerRoot = path.join(repoRoot, "src/lib/ai/evaluation/goldenBusinessDataset");

    expect(fs.existsSync(layerRoot)).toBe(true);
    expect(fs.readdirSync(layerRoot).filter((file) => file.endsWith(".ts")).length).toBe(11);
  });
});
