import React from "react";
import TestRenderer, {
  act,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import { Text } from "react-native";

import ScreenErrorBoundary from "./ScreenErrorBoundary";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../../lib/observability/platformObservability";

describe("ScreenErrorBoundary", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
    runtime.__DEV__ = false;
    resetPlatformObservabilityEvents();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("shows fallback, logs the crash and retries the screen subtree", async () => {
    let shouldThrow = true;

    function CrashOnce() {
      if (shouldThrow) {
        throw new Error("test crash");
      }
      return <Text>screen-ok</Text>;
    }

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <ScreenErrorBoundary screen="foreman" route="/foreman">
          <CrashOnce />
        </ScreenErrorBoundary>,
      );
    });

    expect(renderer.root.findByProps({ testID: "screen-error-fallback" })).toBeTruthy();
    expect(
      getPlatformObservabilityEvents().some(
        (event) => event.screen === "foreman" && event.event === "screen_error",
      ),
    ).toBe(true);

    shouldThrow = false;
    const retryNode = renderer.root.find(
      (node: ReactTestInstance) => typeof node.props?.onPress === "function",
    );
    await act(async () => {
      retryNode.props.onPress();
    });

    expect(
      renderer.root
        .findAllByType(Text)
        .some((node) => String(node.props.children ?? "") === "screen-ok"),
    ).toBe(true);
    expect(
      getPlatformObservabilityEvents().some(
        (event) => event.screen === "foreman" && event.event === "screen_error_retry",
      ),
    ).toBe(true);
  });
});
