import fs from "fs";
import path from "path";

const readSource = (...segments: string[]) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("market clean top filter contract", () => {
  it("uses one compact top filter instead of the old noisy header and category rail", () => {
    const source = readSource("src", "features", "market", "MarketHomeScreen.tsx");
    const headerStart = source.indexOf("const header = (");
    const footerStart = source.indexOf("const footer = ");
    const headerChunk = source.slice(headerStart, footerStart);
    const footerChunk = source.slice(footerStart);

    expect(source).not.toContain("MarketHeaderBar");
    expect(source).not.toContain("MarketCategoryRail");
    expect(source).not.toContain("MarketHeroCarousel");
    expect(headerChunk).not.toContain("MarketTenderBanner");
    expect(headerChunk).not.toContain("MarketAssistantBanner");
    expect(footerChunk).not.toContain("MarketTenderBanner");
    expect(footerChunk).not.toContain("MarketAssistantBanner");
    expect(source).not.toContain("MarketAssistantBanner");
    expect(footerChunk).toContain('testID="market_scroll_bottom_limit"');
    expect(source).not.toContain("Смотреть все");
    expect(headerChunk).toContain('testID="market_top_filter_button"');
    expect(source).toContain('testID="market_top_filter_sheet"');
    expect(source).toContain('testID="market_top_filter_categories"');
    expect(source).toContain('testID="market_top_filter_sides"');
    expect(source).not.toContain('testID="market_top_filter_kinds"');
    expect(source).not.toContain('{ key: "auctions", label: "Торги" }');
    expect(source).toContain("MARKET_LISTING_CATEGORY_OPTIONS");
    expect(source).toContain("getFilterCategoryCount");
    expect(source).toContain("const categoryCounts = feed.categoryCounts");
    expect(source).not.toContain('if (key === "all") return feed.totalCount');
    expect(source).toContain("filterChipCount");
    expect(source).toContain("MARKET_FILTER_CATEGORIES");
  });
});
