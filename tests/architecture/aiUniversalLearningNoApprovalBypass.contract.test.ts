import fs from "node:fs";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE architecture: no approval bypass", () => {
  it("does not approve or bypass approval from the universal answer path", () => {
    const source = fs.readFileSync("src/lib/ai/liveUi/liveAiActionRouter.ts", "utf8");
    expect(source).not.toMatch(/autoApproval:\s*true|bypassApproval|approvalBypassFound:\s*[1-9]/);
  });
});
