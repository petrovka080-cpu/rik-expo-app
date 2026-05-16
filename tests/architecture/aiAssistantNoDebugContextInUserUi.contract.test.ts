import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("AI assistant no debug context in default user UI", () => {
  it("keeps raw knowledge preview behind explicit debugAiContext", () => {
    const source = [
      read("src/features/ai/AIAssistantScreen.tsx"),
      read("src/features/ai/AIAssistantReadyProductPanels.tsx"),
    ].join("\n");
    const debugGateIndex = source.indexOf("debugAiContext &&");
    const dataAwareIndex = source.indexOf("Data-aware context");

    expect(debugGateIndex).toBeGreaterThan(-1);
    expect(dataAwareIndex).toBeGreaterThan(debugGateIndex);
    expect(source).toContain("Подсказки и черновики. Опасные действия — только через согласование.");
    expect(source).not.toContain("AI-ключи не настроены");
    expect(source).not.toContain("safe guide mode");
  });

  it("removes provider-unavailable copy from assistant prompts", () => {
    const prompts = read("src/features/ai/assistantPrompts.ts");

    expect(prompts).not.toContain("AI-ключ сейчас не настроен");
    expect(prompts).not.toContain("safe guide mode");
    expect(prompts).toContain("Работаю в режиме подсказок и черновиков");
  });
});
