import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("AI real role-screen assistants web runner contract", () => {
  const runner = read("scripts/e2e/runAiRealRoleScreenAssistantsWeb.ts");
  const assistantSource = read("src/features/ai/AIAssistantScreen.tsx");
  const panelsSource = read("src/features/ai/AIAssistantReadyProductPanels.tsx");

  it("checks product-first role packs for accountant and buyer on web", () => {
    expect(runner).toContain("/ai?context=accountant");
    expect(runner).toContain("/ai?context=buyer");
    expect(runner).toContain("ai.role_screen_assistant_pack");
    expect(runner).toContain("Готово от AI");
    expect(runner).toContain("providerCalled: false");
    expect(runner).toContain("dbWritesUsed: false");
  });

  it("wires the role assistant pack before chat answers", () => {
    expect(assistantSource).toContain("getAiRoleScreenAssistantPack");
    expect(assistantSource).toContain("roleScreenAssistantPack");
    expect(panelsSource).toContain('testID="ai.role_screen_assistant_pack"');
    expect(panelsSource.indexOf("Готово от AI")).toBeLessThan(panelsSource.indexOf("productStatusCard"));
  });
});
