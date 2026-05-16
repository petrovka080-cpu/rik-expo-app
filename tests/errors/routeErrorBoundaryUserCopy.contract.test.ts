import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { Text } from "react-native";

import ScreenErrorBoundary from "../../src/shared/ui/ScreenErrorBoundary";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../../src/lib/observability/platformObservability";

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn(() => false);

jest.mock("expo-router", () => ({
  router: {
    back: () => mockBack(),
    replace: (href: unknown) => mockReplace(href),
    canGoBack: () => mockCanGoBack(),
  },
}));

function textContent(renderer: ReactTestRenderer) {
  return renderer.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .flat(Infinity)
    .join(" ");
}

describe("route error boundary user copy", () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  const previousDebugFlag = process.env.EXPO_PUBLIC_SCREEN_ERROR_DEBUG;

  beforeEach(() => {
    const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
    runtime.__DEV__ = false;
    delete process.env.EXPO_PUBLIC_SCREEN_ERROR_DEBUG;
    mockBack.mockReset();
    mockReplace.mockReset();
    mockCanGoBack.mockReset();
    mockCanGoBack.mockReturnValue(false);
    resetPlatformObservabilityEvents();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleInfoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    if (previousDebugFlag == null) {
      delete process.env.EXPO_PUBLIC_SCREEN_ERROR_DEBUG;
    } else {
      process.env.EXPO_PUBLIC_SCREEN_ERROR_DEBUG = previousDebugFlag;
    }
    consoleInfoSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("shows safe copy with retry and back without raw stack or secrets", async () => {
    function Crash(): React.ReactElement {
      throw new Error("access_token=secret\n    at CrashScreen (secret.tsx:1:1)");
    }

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        React.createElement(
          ScreenErrorBoundary,
          {
            screen: "buyer",
            route: "/office/buyer",
            children: React.createElement(Crash),
          },
        ),
      );
    });

    const text = textContent(renderer);
    expect(text).toContain("Произошла ошибка");
    expect(text).toContain("Попробовать снова");
    expect(text).toContain("Назад");
    expect(text).not.toContain("access_token");
    expect(text).not.toContain("CrashScreen");
    expect(text).not.toMatch(/^\s*at\s+\S+\s+\(/m);

    const buttons = renderer.root.findAll(
      (node) => typeof node.props?.onPress === "function",
    );
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    await act(async () => {
      buttons[1]?.props.onPress();
    });

    expect(mockReplace).toHaveBeenCalledWith("/");
    expect(
      getPlatformObservabilityEvents().some(
        (event) => event.screen === "buyer" && event.event === "screen_error_back",
      ),
    ).toBe(true);
  });

  it("keeps debug error details behind an explicit dev flag", async () => {
    const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
    runtime.__DEV__ = true;

    function Crash(): React.ReactElement {
      throw new Error("debug-only-message");
    }

    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        React.createElement(
          ScreenErrorBoundary,
          {
            screen: "foreman",
            route: "/office/foreman",
            children: React.createElement(Crash),
          },
        ),
      );
    });
    expect(textContent(renderer)).not.toContain("debug-only-message");

    process.env.EXPO_PUBLIC_SCREEN_ERROR_DEBUG = "1";
    await act(async () => {
      renderer = TestRenderer.create(
        React.createElement(
          ScreenErrorBoundary,
          {
            screen: "foreman",
            route: "/office/foreman",
            children: React.createElement(Crash),
          },
        ),
      );
    });
    expect(textContent(renderer)).toContain("debug-only-message");
  });
});
