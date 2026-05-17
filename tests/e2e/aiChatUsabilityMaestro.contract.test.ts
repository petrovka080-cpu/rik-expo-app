import fs from "node:fs";
import path from "node:path";

import {
  AI_CHAT_USABILITY_GREEN_STATUS,
  AI_CHAT_USABILITY_REQUIRED_SCREENS,
  buildAiChatUsabilityFoundationMatrix,
} from "../../src/features/ai/screenMagic/aiScreenMagicProof";

const root = path.join(__dirname, "..", "..");

describe("AI chat usability Maestro proof contract", () => {
  it("has an Android targetability proof runner for the required AI chat screens", () => {
    const runner = fs.readFileSync(path.join(root, "scripts/e2e/runAiChatUsabilityMaestro.ts"), "utf8");
    const matrix = buildAiChatUsabilityFoundationMatrix({
      webProofPass: false,
      androidProofPass: true,
      chatDialogNotTiny: true,
      chatDialogScrolls: true,
      inputVisible: true,
      uselessTopHeaderRemoved: true,
      debugCopyHidden: true,
      providerUnavailableCopyHidden: true,
    });

    expect(matrix.screens_checked).toEqual([...AI_CHAT_USABILITY_REQUIRED_SCREENS]);
    expect(runner).toContain("input targetable");
    expect(runner).toContain("safe_read button targetable");
    expect(matrix.final_status).toBe(AI_CHAT_USABILITY_GREEN_STATUS);
    expect(matrix.android_proof_pass).toBe(true);
  });
});
