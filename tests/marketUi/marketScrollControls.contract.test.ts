import fs from "fs";
import path from "path";

const readSource = (...segments: string[]) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("market feed scroll controls contract", () => {
  it("keeps only one cross-platform scroll-to-top refresh control", () => {
    const source = readSource("src", "features", "market", "MarketHomeScreen.tsx");

    expect(source).toContain('testID="market_scroll_up_button"');
    expect(source).not.toContain('testID="market_scroll_down_button"');
    expect(source).toContain('testID="market_scroll_bottom_limit"');
    expect(source).toContain("const maxFeedScrollOffset = Math.max(0, feedContentHeight - feedViewportHeight)");
    expect(source).toContain("Math.min(maxFeedScrollOffset, event.nativeEvent.contentOffset.y)");
    expect(source).toContain("setScreenState((current) => ({ ...current, feedScrollOffset: nextOffset }))");
    expect(source).toContain("Math.min(Math.max(0, current.feedContentHeight - nextViewportHeight), current.feedScrollOffset)");
    expect(source).toContain("Math.min(Math.max(0, nextContentHeight - current.feedViewportHeight), current.feedScrollOffset)");
    expect(source).toContain("const showScrollTopControl = feedData.length > 0 && canScrollUp");
    expect(source).toContain("listRef.current?.scrollToOffset({ offset: 0, animated: true });");
    expect(source).toContain("handleRefreshFeed();");
    expect(source).not.toContain("scrollMarketFeedBy");
    expect(source).not.toContain("scrollPageStep");
    expect(source).not.toContain("canScrollDown");
    expect(source).not.toContain('Platform.OS === "web" && feedData.length > 0');
    expect(source).toContain("onContentSizeChange={handleFeedContentSizeChange}");
    expect(source).toContain("onLayout={handleFeedLayout}");
    expect(source).toContain("onScroll={handleFeedScroll}");
  });
});
