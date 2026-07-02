import fs from "fs";
import path from "path";

const readSource = (...segments: string[]) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("market single-column feed contract", () => {
  it("keeps the marketplace feed to one full-width listing per row", () => {
    const screen = readSource("src", "features", "market", "MarketHomeScreen.tsx");
    const controller = readSource("src", "features", "market", "useMarketHomeController.ts");
    const cell = readSource("src", "features", "market", "components", "MarketHomeFeedCardCell.tsx");

    expect(controller).toContain("const numColumns = 1");
    expect(controller).toContain("const maxFeedWidth = 760");
    expect(controller).toContain("Math.max(280, usableWidth)");
    expect(screen).toContain('key="market-single-column-feed"');
    expect(screen).toContain("estimatedItemSize={520}");
    expect(screen).not.toContain("columnWrapperStyle");
    expect(cell).toContain('alignSelf: "center"');
    expect(cell).toContain("width");
  });
});
