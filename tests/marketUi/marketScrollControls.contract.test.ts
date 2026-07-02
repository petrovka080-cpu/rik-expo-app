import fs from "fs";
import path from "path";

const readSource = (...segments: string[]) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("market feed scroll controls contract", () => {
  it("clamps arrow scrolling to the real list top and bottom", () => {
    const source = readSource("src", "features", "market", "MarketHomeScreen.tsx");

    expect(source).toContain('testID="market_scroll_up_button"');
    expect(source).toContain('testID="market_scroll_down_button"');
    expect(source).toContain('testID="market_scroll_bottom_limit"');
    expect(source).toContain("const maxFeedScrollOffset = Math.max(0, feedContentHeight - feedViewportHeight)");
    expect(source).toContain("Math.min(maxFeedScrollOffset, feedScrollOffset + delta)");
    expect(source).toContain("Math.min(maxFeedScrollOffset, event.nativeEvent.contentOffset.y)");
    expect(source).toContain("setFeedScrollOffset((current) => Math.max(0, Math.min(maxFeedScrollOffset, current)))");
    expect(source).toContain("disabled={!canScrollDown}");
    expect(source).toContain("onContentSizeChange={handleFeedContentSizeChange}");
    expect(source).toContain("onLayout={handleFeedLayout}");
    expect(source).toContain("onScroll={handleFeedScroll}");
  });
});
