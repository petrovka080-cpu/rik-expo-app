import fs from "node:fs";
import path from "node:path";

describe("AI screen magic no debug user UI", () => {
  it("keeps magic UI visible while raw debug panels stay gated", () => {
    const panels = fs.readFileSync(path.join(process.cwd(), "src", "features", "ai", "AIAssistantReadyProductPanels.tsx"), "utf8");
    const screen = fs.readFileSync(path.join(process.cwd(), "src", "features", "ai", "AIAssistantScreen.tsx"), "utf8");

    expect(panels).toContain("ai.screen_magic_pack");
    expect(panels).toContain("ai.screen_magic.action");
    expect(panels).not.toContain("raw provider payload");
    expect(`${screen}\n${panels}`).toContain("debugAiContext &&");
  });
});
