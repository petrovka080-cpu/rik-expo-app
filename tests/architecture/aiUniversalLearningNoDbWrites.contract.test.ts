import fs from "node:fs";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE architecture: no DB writes", () => {
  it("does not perform DB writes from universal AI answers", () => {
    const source = fs.readFileSync("src/lib/ai/liveUi/liveAiActionRouter.ts", "utf8");
    expect(source).not.toMatch(/\.insert\s*\(|\.update\s*\(|\.delete\s*\(|\.upsert\s*\(|rpc\(\s*["'`].*(write|mutat|approve|pay|order|stock)/i);
  });
});
