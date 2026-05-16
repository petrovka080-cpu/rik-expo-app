import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("AI real assistants no debug context in user UI", () => {
  it("keeps debug policy dumps behind existing debugAiContext and out of role assistant copy", () => {
    const panels = read("src/features/ai/AIAssistantReadyProductPanels.tsx");
    const userCopy = read("src/features/ai/realAssistants/aiRoleScreenAssistantUserCopy.ts");
    const debugIndex = panels.indexOf("debugAiContext &&");
    const dataAwareIndex = panels.indexOf("Data-aware context");

    expect(debugIndex).toBeGreaterThanOrEqual(0);
    expect(dataAwareIndex).toBeGreaterThan(debugIndex);
    expect(userCopy).toContain("AI-ключи не настроены");
    expect(userCopy).toContain("safe guide mode");
    expect(panels.slice(0, debugIndex)).not.toContain("allowedIntents");
    expect(panels.slice(0, debugIndex)).not.toContain("blockedIntents");
  });
});
