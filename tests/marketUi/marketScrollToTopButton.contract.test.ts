import fs from "fs";
import path from "path";

const readSource = (...segments: string[]) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("market scroll-to-top button contract", () => {
  it("uses one absolute top jump instead of relative step scrolling", () => {
    const source = readSource("src", "features", "market", "MarketHomeScreen.tsx");

    expect(source).toContain("const scrollMarketFeedToTop = () => {");
    expect(source).toContain("listRef.current?.scrollToOffset({ offset: 0, animated: true });");
    expect(source).toContain("setScreenState((current) => ({ ...current, feedScrollOffset: 0 }));");
    expect(source).toContain("handleRefreshFeed();");
    expect(source).toContain('testID="market_scroll_up_button"');
    expect(source).toContain("onPress={scrollMarketFeedToTop}");
    expect(source).toContain("const showScrollTopControl = feedData.length > 0 && canScrollUp");
    expect(source).not.toContain('testID="market_scroll_down_button"');

    const upButtonIndex = source.indexOf('testID="market_scroll_up_button"');
    const upButtonChunk = source.slice(Math.max(0, upButtonIndex - 500), upButtonIndex + 300);

    expect(upButtonChunk).not.toContain("scrollMarketFeedBy(-scrollPageStep)");
    expect(upButtonChunk).not.toContain("scrollBy(");
    expect(upButtonChunk).not.toContain("setInterval(");
    expect(upButtonChunk).not.toContain("setTimeout(");
    expect(upButtonChunk).not.toContain("requestAnimationFrame(");
    expect(upButtonChunk).not.toContain("__TEST__");
    expect(upButtonChunk).not.toContain("@ts-ignore");
    expect(source).not.toContain('Platform.OS === "web" && feedData.length > 0');
  });
});
