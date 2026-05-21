import fs from "node:fs";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE architecture: no migrations", () => {
  it("does not add migration execution to universal learning", () => {
    const source = fs.readFileSync("src/lib/ai/liveUi/liveAiActionRouter.ts", "utf8");
    expect(source).not.toMatch(/migration|supabase\/migrations/i);
  });
});
