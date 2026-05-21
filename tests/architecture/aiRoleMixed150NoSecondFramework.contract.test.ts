import fs from "fs";
import path from "path";

describe("S_AI_ROLE_MIXED_150 architecture: no second framework", () => {
  it("keeps the wave inside the approved evaluation layer", () => {
    const repoRoot = path.resolve(__dirname, "../..");
    for (const forbidden of ["src/lib/ai2", "src/lib/newAi", "src/lib/smartAssistant", "src/lib/aiMagicV2"]) {
      expect(fs.existsSync(path.join(repoRoot, forbidden))).toBe(false);
    }
    expect(fs.existsSync(path.join(repoRoot, "src/lib/ai/evaluation/goldenBusinessDataset"))).toBe(true);
  });
});
