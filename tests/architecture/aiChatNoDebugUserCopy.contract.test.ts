import fs from "node:fs";
import path from "node:path";

const root = path.join(__dirname, "..", "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("AI chat no debug user copy architecture", () => {
  it("keeps debug/runtime/provider wording out of the normal assistant header", () => {
    const panels = read("src/features/ai/AIAssistantReadyProductPanels.tsx");
    const header = panels.slice(
      panels.indexOf("export function AIAssistantProductHeader"),
      panels.indexOf("export function AIAssistantReadyProductPanels"),
    );

    expect(header).not.toMatch(/Data-aware context|allowedIntents|blockedIntents|approval_required|role:|screen:|policy:/i);
    expect(header).not.toMatch(/provider|transport|runtime|module unavailable|AI keys unavailable/i);
  });

  it("keeps raw context preview behind an explicit debug gate", () => {
    const panels = read("src/features/ai/AIAssistantReadyProductPanels.tsx");
    const debugIndex = panels.indexOf("debugAiContext &&");
    const previewIndex = panels.indexOf("Data-aware context");

    expect(debugIndex).toBeGreaterThan(-1);
    expect(previewIndex).toBeGreaterThan(debugIndex);
  });
});
