import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { BackHandler, Platform } from "react-native";
import { router } from "expo-router";
import { useAndroidSafeBackFallback } from "./useAndroidSafeBackFallback";

let mockFocus: () => void;
let mockBlur: () => void;
jest.mock("expo-router", () => ({
  router: { canGoBack: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useFocusEffect: (callback: () => (() => void) | undefined) => {
    const react = require("react") as typeof React;
    react.useEffect(() => {
      mockFocus = () => { mockBlur = callback() ?? (() => {}); };
      mockFocus();
      return () => mockBlur();
    }, [callback]);
  },
}));
jest.mock("react-native", () => ({
  Platform: { OS: "android" },
  BackHandler: { addEventListener: jest.fn() },
}));

describe("focused Android route with no preceding navigator screen", () => {
  let renderer: ReactTestRenderer;
  let listener: () => boolean | null | undefined;
  const remove = jest.fn();
  const Harness = () => { useAndroidSafeBackFallback("/(tabs)/market"); return null; };
  beforeEach(() => {
    Object.defineProperty(Platform, "OS", { value: "android", configurable: true });
    jest.clearAllMocks();
    jest.mocked(router.canGoBack).mockReturnValue(false);
    jest.mocked(BackHandler.addEventListener).mockImplementation((_event, callback) => {
      listener = callback;
      return { remove };
    });
  });
  afterEach(() => { if (renderer) act(() => renderer.unmount()); });

  it("consumes system Back and replaces a directly opened card with Market", () => {
    act(() => { renderer = TestRenderer.create(<Harness />); });
    expect(listener()).toBe(true);
    expect(router.replace).toHaveBeenCalledWith("/(tabs)/market");
    expect(router.back).not.toHaveBeenCalled();
  });

  it("lets the navigator return to the preceding feed and reads history at event time", () => {
    act(() => { renderer = TestRenderer.create(<Harness />); });
    jest.mocked(router.canGoBack).mockReturnValue(true);
    expect(listener()).toBe(false);
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    jest.mocked(router.canGoBack).mockReturnValue(false);
    expect(listener()).toBe(true);
    expect(router.replace).toHaveBeenCalledTimes(1);
  });

  it("removes the handler on blur and restores it only while the card is focused", () => {
    act(() => { renderer = TestRenderer.create(<Harness />); });
    act(() => mockBlur());
    expect(remove).toHaveBeenCalledTimes(1);
    act(() => mockFocus());
    expect(BackHandler.addEventListener).toHaveBeenCalledTimes(2);
    act(() => renderer.unmount());
    expect(remove).toHaveBeenCalledTimes(2);
  });

  it("keeps system Back available when the route child renders its error fallback", () => {
    class Boundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
      state = { failed: false };
      static getDerivedStateFromError() { return { failed: true }; }
      render() { return this.state.failed ? null : this.props.children; }
    }
    const BrokenChild = () => { throw new Error("controlled route child error"); };
    const WrappedRoute = () => {
      useAndroidSafeBackFallback("/(tabs)/market");
      return <Boundary><BrokenChild /></Boundary>;
    };
    const expectedErrorLog = jest.spyOn(console, "error").mockImplementation(() => {});
    try { act(() => { renderer = TestRenderer.create(<WrappedRoute />); }); }
    finally { expectedErrorLog.mockRestore(); }
    expect(BackHandler.addEventListener).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
    expect(listener()).toBe(true);
    expect(router.replace).toHaveBeenCalledWith("/(tabs)/market");
  });

  it.each(["web", "ios"])("keeps %s navigation outside the Android system handler", platform => {
    Object.defineProperty(Platform, "OS", { value: platform, configurable: true });
    act(() => { renderer = TestRenderer.create(<Harness />); });
    expect(BackHandler.addEventListener).not.toHaveBeenCalled();
  });
});
