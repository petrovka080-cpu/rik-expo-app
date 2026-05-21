import fs from "node:fs";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE architecture: no hooks", () => {
  it("keeps universal learning in pure services without React hooks", () => {
    const source = fs.readFileSync("src/lib/ai/liveUi/liveAiActionRouter.ts", "utf8");
    expect(source).not.toMatch(/from\s+["']react["']/);
    expect(source).not.toMatch(/function\s+use[A-Z][A-Za-z0-9_]*/);
    expect(source).not.toMatch(/const\s+use[A-Z][A-Za-z0-9_]*\s*=/);
  });
});
