import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("AI real assistants no generic chat-only architecture", () => {
  it("puts prepared role-screen work into the user UI before generic chat", () => {
    const assistant = read("src/features/ai/AIAssistantScreen.tsx");
    const panels = read("src/features/ai/AIAssistantReadyProductPanels.tsx");
    const engine = read("src/features/ai/realAssistants/aiRoleScreenAssistantEngine.ts");

    expect(assistant).toContain("getAiRoleScreenAssistantPack");
    expect(panels).toContain("Готово от AI");
    expect(panels).toContain("Самое важное");
    expect(engine).toContain("describeAiRoleScreenAssistantPack");
    expect(panels.indexOf("Готово от AI")).toBeLessThan(panels.indexOf("Готовые предложения"));
  });
});
