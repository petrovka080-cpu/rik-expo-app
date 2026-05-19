import fs from "node:fs";
import path from "node:path";

const root = path.join(__dirname, "..", "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("AI chat usability contract", () => {
  it("keeps the assistant surface wide, scrollable, and with the input visible", () => {
    const styles = read("src/features/ai/AIAssistantScreen.styles.ts");

    expect(styles).toContain("chatShell");
    expect(styles).toContain("maxWidth: 1120");
    expect(styles).toContain("messagesContent");
    expect(styles).toContain("maxWidth: 1088");
    expect(styles).toContain("overflow: \"scroll\"");
    expect(styles).toContain("composer");
    expect(styles).toContain("minHeight: 48");
  });

  it("uses value-oriented headers instead of route/runtime labels", () => {
    const panels = read("src/features/ai/AIAssistantReadyProductPanels.tsx");
    const header = panels.slice(
      panels.indexOf("export function AIAssistantProductHeader"),
      panels.indexOf("export function AIAssistantReadyProductPanels"),
    );

    expect(header).toContain("AI помощник");
    expect(header).toContain("Финансы сегодня");
    expect(header).toContain("Снабжение сегодня");
    expect(header).not.toContain("AI ассистент ·");
    expect(header).not.toMatch(/screenId|route key|provider|transport|runtime|policy:/i);
  });

  it("extends the existing screen magic panel instead of creating a duplicate chat framework", () => {
    const panels = read("src/features/ai/AIAssistantReadyProductPanels.tsx");

    expect(panels).toContain("buildAiScreenMagicPackFromWorkflowPack");
    expect(panels).toContain("screenMagicPack.userHeader");
    expect(panels).toContain("screenMagicButtons.map");
    expect(panels).not.toMatch(/createContext\(|useReducer\(|new AI chat framework/i);
  });
});
