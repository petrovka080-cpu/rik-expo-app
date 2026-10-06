import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { type FlatList, Platform } from "react-native";
import { FlashList } from "../../ui/FlashList";
import MarketHomeScreen from "./MarketHomeScreen";

const mockCancelRestore = jest.fn();
const mockScrollToOffset = jest.fn();
const mockListRef: { current: FlatList<unknown> | null } = { current: null };
const mockNoop = jest.fn();
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
jest.mock("./components/MarketHomeFeedCardCell", () => ({ MarketHomeFeedCardCell: () => null }));
jest.mock("./useMarketHomeController", () => ({
  useMarketHomeController: () => ({
    activeCategory: "all", query: "S27-6", side: "all", columnWidth: 300,
    feed: { categoryCounts: jest.requireActual("./marketHome.data").EMPTY_MARKET_HOME_CATEGORY_COUNTS },
    feedData: [{ id: "visible-card" }], feedPhase: "ready",
    feedErrorText: null, feedSubtitleText: "1 объявление", loadingMore: false, numColumns: 1, refreshing: false,
    listRef: mockListRef,
    handleCategorySelect: mockNoop, handleEndReached: mockNoop, handleFeedHeaderLayout: mockNoop,
    handleOpenListing: mockNoop, handleRefreshFeed: mockNoop, handleResetFeedFilters: mockNoop,
    openPhone: mockNoop, openWhatsApp: mockNoop, pushSupplierMap: mockNoop, setQuery: mockNoop, setSide: mockNoop,
    recordFeedScrollOffset: mockNoop, restoreFeedScrollOffset: mockNoop, cancelFeedScrollRestore: mockCancelRestore,
  }),
}));

describe("actual market list user scroll wiring", () => {
  let renderer: ReactTestRenderer;
  const originalPlatform = Platform.OS;
  beforeEach(() => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
    mockCancelRestore.mockClear(); mockScrollToOffset.mockClear(); mockNoop.mockClear();
    act(() => { renderer = TestRenderer.create(<MarketHomeScreen />); });
  });
  afterEach(() => {
    act(() => renderer.unmount());
    Object.defineProperty(Platform, "OS", { configurable: true, value: originalPlatform });
  });

  it.each(["onWheel", "onTouchStart", "onKeyDown", "onScrollBeginDrag"])(
    "cancels a pending restore from the list's %s event", event => {
      const list = renderer.root.findByType(FlashList);
      act(() => list.props[event]({}));
      expect(mockCancelRestore).toHaveBeenCalledTimes(1);
    },
  );

  it("cancels restoration before the user's scroll-to-top action", () => {
    const list = renderer.root.findByType(FlashList);
    act(() => {
      list.props.onLayout({ nativeEvent: { layout: { height: 400 } } });
      list.props.onContentSizeChange(300, 2000);
    });
    act(() => list.props.onScroll({ nativeEvent: { contentOffset: { y: 500 } } }));
    const scroll = jest.spyOn(mockListRef.current!, "scrollToOffset").mockImplementation(mockScrollToOffset);
    const button = renderer.root.findByProps({ testID: "market_scroll_up_button" });
    act(() => button.props.onPress());
    expect(mockCancelRestore).toHaveBeenCalledTimes(1);
    expect(mockScrollToOffset).toHaveBeenCalledWith({ offset: 0, animated: true });
    expect(mockCancelRestore.mock.invocationCallOrder[0]).toBeLessThan(mockScrollToOffset.mock.invocationCallOrder[0]!);
    scroll.mockRestore();
  });
});
