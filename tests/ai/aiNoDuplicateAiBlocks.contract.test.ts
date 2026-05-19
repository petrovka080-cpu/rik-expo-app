import fs from "node:fs";
import path from "node:path";

import { buildAiRealUserUiMatrix } from "../../scripts/ai/aiRealUserButtonProof";

describe("AI block noise guard", () => {
  it("renders a single screenMagic AI block and keeps the matrix at one block per screen", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src", "features", "ai", "AIAssistantReadyProductPanels.tsx"),
      "utf8",
    );
    const matrix = buildAiRealUserUiMatrix({
      webProofPass: true,
      androidProofPass: true,
      webScreenshotsCaptured: true,
      androidScreenshotsCaptured: true,
    });

    expect((source.match(/testID="ai\.screen_magic_pack"/g) ?? [])).toHaveLength(1);
    expect(matrix.ai_blocks_per_screen_max).toBe(1);
  });
});
