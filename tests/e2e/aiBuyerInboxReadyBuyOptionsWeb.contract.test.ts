import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("AI buyer inbox ready buy options web runner contract", () => {
  const runner = read("scripts/e2e/runAiBuyerInboxReadyBuyOptionsWeb.ts");
  const assistantSource = read("src/features/ai/AIAssistantScreen.tsx");
  const panelsSource = read("src/features/ai/AIAssistantReadyProductPanels.tsx");
  const buyerGroupSource = read("src/screens/buyer/components/BuyerGroupBlock.tsx");
  const buyerSheetSource = read("src/screens/buyer/components/BuyerInboxSheetBody.tsx");

  it("checks buyer-ready options, deterministic procurement answers, and no unsafe effects", () => {
    expect(runner).toContain("/ai?context=buyer");
    expect(runner).toContain("Debug panels are hidden");
    expect(runner).toContain("Готовые варианты закупки");
    expect(runner).toContain("buyer.ready_buy_options.card");
    expect(runner).toContain("buyer.ready_buy_options.detail");
    expect(runner).toContain("providerCalled: false");
    expect(runner).toContain("dbWritesUsed: false");
    expect(runner).toContain("No direct order path");
    expect(runner).toContain("No direct payment path");
    expect(runner).toContain("No warehouse mutation path");
  });

  it("uses real product surfaces instead of chat-only shims", () => {
    expect(assistantSource).toContain("buildProcurementReadyBuyBundleFromSearchParams");
    expect(panelsSource).toContain('testID="ai.buyer_ready_buy_options"');
    expect(buyerGroupSource).toContain("BuyerReadyBuyOptionsBlock");
    expect(buyerSheetSource).toContain("BuyerReadyBuyOptionsBlock");
    expect(buyerGroupSource).toContain("readyBuyOptions");
    expect(buyerSheetSource).toContain("readyBuyOptions");
  });
});
