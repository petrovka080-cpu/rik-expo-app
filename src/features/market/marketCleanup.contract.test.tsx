import fs from "fs";
import path from "path";

const readSource = (...segments: string[]) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("market cleanup contracts", () => {
  it("keeps market home primary header focused on search, categories and feed", () => {
    const source = readSource("src", "features", "market", "MarketHomeScreen.tsx");
    const headerStart = source.indexOf("const header = (");
    const footerStart = source.indexOf("const footer = (");
    const headerChunk = source.slice(headerStart, footerStart);
    const footerChunk = source.slice(footerStart);

    expect(headerChunk).not.toContain("<MarketHeroCarousel");
    expect(headerChunk).not.toContain("<MarketTenderBanner");
    expect(headerChunk).not.toContain("<MarketAssistantBanner");
    expect(headerChunk).not.toContain("Открыта карточка:");
    expect(source).toContain('variant="market-primary"');
    expect(footerChunk).toContain("<MarketHeroCarousel");
    expect(footerChunk).toContain("<MarketTenderBanner");
    expect(footerChunk).toContain("<MarketAssistantBanner");
  });

  it("keeps market-primary cards focused on product info and quick contact only", () => {
    const source = readSource("src", "features", "market", "components", "MarketFeedCard.tsx");

    expect(source).toContain('variant?: "full" | "market-primary"');
    expect(source).toContain("const isMarketPrimary = variant === \"market-primary\"");
    expect(source).toContain("!isMarketPrimary && listing.stockLabel");
    expect(source).toContain("!isMarketPrimary && listing.itemsPreview.length");
    expect(source).toContain("{isMarketPrimary ? (");
    expect(source).toContain("Позвонить");
    expect(source).toContain("WhatsApp");
    expect(source).toContain("На карте");
    expect(source).toContain("{showErpActions ? (");
  });

  it("keeps product page above the fold market-first and demotes ERP", () => {
    const source = readSource("app", "product", "[id].tsx");

    expect(source).not.toContain("<ScrollView horizontal");
    expect(source.indexOf("Связаться с продавцом")).toBeGreaterThan(-1);
    expect(source.indexOf("Для ERP и закупок")).toBeGreaterThan(-1);
    expect(source.indexOf("Связаться с продавцом")).toBeLessThan(source.indexOf("Для ERP и закупок"));
    expect(source.indexOf("Ещё в маркете")).toBeLessThan(source.indexOf("Для ERP и закупок"));
  });
});
