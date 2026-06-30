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
    const feedCardCellSource = readSource("src", "features", "market", "components", "MarketHomeFeedCardCell.tsx");

    expect(headerChunk).not.toContain("<MarketHeroCarousel");
    expect(headerChunk).not.toContain("<MarketTenderBanner");
    expect(headerChunk).not.toContain("<MarketAssistantBanner");
    expect(headerChunk).not.toContain("Открыта карточка:");
    expect(feedCardCellSource).toContain('variant="market-primary"');
    expect(footerChunk).toContain("<MarketHeroCarousel");
    expect(footerChunk).toContain("<MarketTenderBanner");
    expect(footerChunk).toContain("<MarketAssistantBanner");
  });

  it("keeps market-primary cards focused on product info and quick contact only", () => {
    const source = readSource("src", "features", "market", "components", "MarketFeedCard.tsx");

    expect(source).toContain('variant?: "full" | "market-primary"');
    expect(source).toContain("const isMarketPrimary = variant === \"market-primary\"");
    expect(source).toContain("const imageSource = listing.imageUrl ? { uri: listing.imageUrl } : listing.imageSource");
    expect(source).toContain("source={imageSource}");
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

    expect(source).toContain("const galleryImageUrls = row.imageUrls.length ? row.imageUrls : row.imageUrl ? [row.imageUrl] : []");
    expect(source).toContain("...row.videoUrls.map");
    expect(source).toContain("testID=\"market_product_gallery\"");
    expect(source).toContain("testID=\"market_product_gallery_strip\"");
    expect(source).toContain("testID=\"market_product_hero_video\"");
    expect(source).toContain("styles.heroInfoColumn");
    expect(source).toContain("heroMediaItem?.kind === \"photo\"");
    expect(source.indexOf("Связаться с продавцом")).toBeGreaterThan(-1);
    expect(source.indexOf("Для ERP и закупок")).toBeGreaterThan(-1);
    expect(source.indexOf("Связаться с продавцом")).toBeLessThan(source.indexOf("Для ERP и закупок"));
    expect(source.indexOf("Ещё в маркете")).toBeLessThan(source.indexOf("Для ERP и закупок"));
  });
});
