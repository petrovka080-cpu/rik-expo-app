import fs from "node:fs";
import path from "node:path";

describe("AI screen-by-screen magic web runner", () => {
  it("keeps web click proof wired to visible magic UI, button contract and no provider calls", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runAiScreenByScreenMagicWeb.ts"), "utf8");

    expect(source).toContain("ai.screen_magic_pack");
    expect(source).toContain("ai.screen_magic.action");
    expect(source).toContain("GREEN_AI_SCREEN_BY_SCREEN_MAGIC_WEB_READY");
    expect(source).toContain("buttons_clicked_on_web");
    expect(source).toContain("providerCalled: false");
    expect(source).toContain("dbWritesUsed: false");

    const screen = fs.readFileSync(path.join(process.cwd(), "src", "features", "ai", "AIAssistantScreen.tsx"), "utf8");
    const panels = fs.readFileSync(path.join(process.cwd(), "src", "features", "ai", "AIAssistantReadyProductPanels.tsx"), "utf8");
    expect(screen).toContain('text.startsWith("Готово от AI:") ? void send(text) : setInput(text)');
    expect(panels).toContain('onReadyProposalPress(`Готово от AI: ${button.label}`)');
  });
});
