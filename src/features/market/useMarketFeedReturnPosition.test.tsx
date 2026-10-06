import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { useMarketFeedReturnPosition } from "./useMarketFeedReturnPosition";
import { useMarketUiStore } from "./marketUi.store";

let mockFocus: () => void;
let mockBlur: () => void;
jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => (() => void)) => {
    const react = require("react") as typeof React;
    react.useEffect(() => {
      mockFocus = () => { mockBlur = callback(); };
      mockFocus();
      return () => mockBlur();
    }, [callback]);
  },
}));

describe("market feed position across product navigation", () => {
  let renderer: ReactTestRenderer;
  let port: ReturnType<typeof useMarketFeedReturnPosition>;
  let frames: Map<number, FrameRequestCallback>;
  let frameId: number;
  let requestFrame: jest.SpyInstance;
  let cancelFrame: jest.SpyInstance;
  const scrollToOffset = jest.fn();
  const listRef = { current: { scrollToOffset } };
  const Harness = ({ filter = "all:S27-6" }) => {
    port = useMarketFeedReturnPosition(listRef, filter);
    return null;
  };
  const flushFrame = () => act(() => {
    const pending = [...frames.values()]; frames.clear();
    pending.forEach(callback => callback(0));
  });
  const returnFromListing = () => act(() => {
    port.saveListingReturnOffset(); mockBlur();
    port.recordFeedScrollOffset(0); // hidden screen layout must not replace the saved position
    mockFocus();
  });
  beforeEach(() => {
    useMarketUiStore.getState().resetFilters();
    frames = new Map(); frameId = 0; scrollToOffset.mockReset();
    requestFrame = jest.spyOn(global, "requestAnimationFrame").mockImplementation(callback => {
      frames.set(++frameId, callback); return frameId;
    });
    cancelFrame = jest.spyOn(global, "cancelAnimationFrame").mockImplementation(id => { frames.delete(id); });
    act(() => { renderer = TestRenderer.create(<Harness />); });
  });
  afterEach(() => {
    act(() => renderer.unmount()); requestFrame.mockRestore(); cancelFrame.mockRestore();
  });

  it("restores the latest position on each return, including a second opening", () => {
    act(() => port.recordFeedScrollOffset(1307)); returnFromListing(); flushFrame();
    expect(scrollToOffset).toHaveBeenLastCalledWith({ offset: 1307, animated: false });
    act(() => { port.recordFeedScrollOffset(1307); port.recordFeedScrollOffset(1411); });
    returnFromListing(); flushFrame();
    expect(scrollToOffset).toHaveBeenLastCalledWith({ offset: 1411, animated: false });
  });

  it("restores after the feed unmounts and preserves a clamped target until layout settles", () => {
    act(() => { port.recordFeedScrollOffset(828); port.saveListingReturnOffset(); renderer.unmount(); });
    act(() => { renderer = TestRenderer.create(<Harness />); });
    flushFrame();
    expect(scrollToOffset).toHaveBeenLastCalledWith({ offset: 828, animated: false });
    // A browser/native navigator may reattach the list at the target without
    // emitting another scroll event before the user opens the next card.
    returnFromListing(); flushFrame();
    expect(scrollToOffset).toHaveBeenLastCalledWith({ offset: 828, animated: false });
    act(() => { port.recordFeedScrollOffset(684); port.restoreFeedScrollOffset(); });
    flushFrame();
    expect(scrollToOffset).toHaveBeenLastCalledWith({ offset: 828, animated: false });
    act(() => port.recordFeedScrollOffset(828));
    expect(useMarketUiStore.getState().listingReturnPosition).toBeNull();
    act(() => { port.recordFeedScrollOffset(1029); port.saveListingReturnOffset(); renderer.unmount(); });
    act(() => { renderer = TestRenderer.create(<Harness />); });
    flushFrame();
    expect(scrollToOffset).toHaveBeenLastCalledWith({ offset: 1029, animated: false });
  });

  it("does not restore a saved position into another filtered feed", () => {
    act(() => { port.recordFeedScrollOffset(828); port.saveListingReturnOffset(); renderer.unmount(); });
    act(() => { renderer = TestRenderer.create(<Harness filter="all:other" />); });
    flushFrame();
    expect(scrollToOffset).not.toHaveBeenCalled();
    expect(useMarketUiStore.getState().listingReturnPosition).toBeNull();
  });

  it("cancels an unconsumed remount target when the user starts scrolling", () => {
    act(() => { port.recordFeedScrollOffset(828); port.saveListingReturnOffset(); renderer.unmount(); });
    act(() => { renderer = TestRenderer.create(<Harness />); });
    act(() => { port.cancelFeedScrollRestore(); port.recordFeedScrollOffset(540); });
    flushFrame();
    expect(scrollToOffset).not.toHaveBeenCalled();
    expect(useMarketUiStore.getState().listingReturnPosition).toBeNull();
    returnFromListing(); flushFrame();
    expect(scrollToOffset).toHaveBeenLastCalledWith({ offset: 540, animated: false });
  });

  it("retries a temporarily clamped restore when layout finishes measuring", () => {
    act(() => port.recordFeedScrollOffset(1307)); returnFromListing(); flushFrame();
    act(() => { port.recordFeedScrollOffset(1154); port.restoreFeedScrollOffset(); }); flushFrame();
    expect(scrollToOffset).toHaveBeenLastCalledWith({ offset: 1307, animated: false });
    act(() => port.recordFeedScrollOffset(1307));
    scrollToOffset.mockClear(); act(() => port.restoreFeedScrollOffset()); flushFrame();
    expect(scrollToOffset).not.toHaveBeenCalled();
  });

  it("lets a new user gesture replace a pending restoration", () => {
    act(() => port.recordFeedScrollOffset(1307)); returnFromListing();
    act(() => { port.cancelFeedScrollRestore(); port.recordFeedScrollOffset(850); }); flushFrame();
    expect(scrollToOffset).not.toHaveBeenCalled();
    returnFromListing(); flushFrame();
    expect(scrollToOffset).toHaveBeenLastCalledWith({ offset: 850, animated: false });
  });

  it("keeps the actual position if the filter changes without moving the list", () => {
    act(() => port.recordFeedScrollOffset(1307)); returnFromListing();
    act(() => renderer.update(<Harness filter="all:another-search" />)); flushFrame();
    expect(scrollToOffset).not.toHaveBeenCalled();
    returnFromListing(); flushFrame();
    expect(scrollToOffset).toHaveBeenLastCalledWith({ offset: 1307, animated: false });
  });

  it("remembers the actual clamp when a filter cancels the pending target", () => {
    act(() => port.recordFeedScrollOffset(1307)); returnFromListing(); flushFrame();
    act(() => port.recordFeedScrollOffset(1154));
    act(() => renderer.update(<Harness filter="all:S27-6 " />));
    scrollToOffset.mockClear(); returnFromListing(); flushFrame();
    expect(scrollToOffset).toHaveBeenLastCalledWith({ offset: 1154, animated: false });
  });
});
