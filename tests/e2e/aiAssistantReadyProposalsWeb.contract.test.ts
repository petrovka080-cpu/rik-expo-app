import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("AI assistant ready proposals web runner contract", () => {
  const runner = read("scripts/e2e/runAiAssistantReadyProposalsWeb.ts");
  const assistantSource = read("src/features/ai/AIAssistantScreen.tsx");
  const productPanelsSource = read("src/features/ai/AIAssistantReadyProductPanels.tsx");

  it("checks product UI, deterministic answers, and approved request supplier state", () => {
    expect(runner).toContain("/ai?context=buyer");
    expect(runner).toContain("Debug cards are hidden");
    expect(runner).toContain("Готовые предложения");
    expect(runner).toContain("Главная — быстрый вход");
    expect(runner).toContain("Сначала смотри срочность");
    expect(runner).toContain("Готовых внутренних поставщиков не найдено");
    expect(runner).toContain("providerCalled: false");
    expect(runner).toContain("dbWritesUsed: false");
  });

  it("uses visible product IDs rather than test-only shims", () => {
    expect(productPanelsSource).toContain('testID="ai.ready_proposals"');
    expect(productPanelsSource).toContain('testID="ai.approved_request_supplier_options"');
    expect(productPanelsSource).toContain("debugAiContext &&");
    expect(assistantSource).toContain("AIAssistantReadyProductPanels");
  });
});
