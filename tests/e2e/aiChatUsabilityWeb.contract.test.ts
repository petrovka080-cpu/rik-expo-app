import fs from "node:fs";
import path from "node:path";

import {
  AI_CHAT_USABILITY_GREEN_STATUS,
  buildAiChatUsabilityFoundationMatrix,
} from "../../src/features/ai/screenMagic/aiScreenMagicProof";

const root = path.join(__dirname, "..", "..");

describe("AI chat usability web proof contract", () => {
  it("has a web proof runner and a green foundation matrix contract", () => {
    const runner = fs.readFileSync(path.join(root, "scripts/e2e/runAiChatUsabilityWeb.ts"), "utf8");
    const matrix = buildAiChatUsabilityFoundationMatrix({
      webProofPass: true,
      androidProofPass: false,
      chatDialogNotTiny: true,
      chatDialogScrolls: true,
      inputVisible: true,
      uselessTopHeaderRemoved: true,
      debugCopyHidden: true,
      providerUnavailableCopyHidden: true,
    });

    expect(runner).toContain("AI_CHAT_USABILITY_WAVE");
    expect(runner).toContain("dialog not tiny");
    expect(runner).toContain("question answer uses screen context");
    expect(matrix.final_status).toBe(AI_CHAT_USABILITY_GREEN_STATUS);
    expect(matrix.web_proof_pass).toBe(true);
  });
});
