import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { Alert, Text } from "react-native";

import { ProfileOtaDiagnosticsCard } from "./ProfileOtaDiagnosticsCard";
import type { OtaDiagnostics } from "@/src/lib/otaDiagnostics";

const mockClipboardSetStringAsync = jest.fn();
const mockCheckAndFetchOtaNow = jest.fn();
const mockGetOtaDiagnostics = jest.fn();
const mockBuildOtaDiagnosticsText = jest.fn();

jest.mock("@expo/vector-icons", () => ({
  Ionicons: (props: { name: string }) => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, null, props.name);
  },
}));

jest.mock("expo-clipboard", () => ({
  setStringAsync: (...args: unknown[]) => mockClipboardSetStringAsync(...args),
}));

jest.mock("@/src/lib/otaHardening", () => ({
  checkAndFetchOtaNow: (...args: unknown[]) => mockCheckAndFetchOtaNow(...args),
}));

jest.mock("@/src/lib/otaDiagnostics", () => ({
  buildOtaDiagnosticsText: (...args: unknown[]) => mockBuildOtaDiagnosticsText(...args),
  getOtaDiagnostics: (...args: unknown[]) => mockGetOtaDiagnostics(...args),
}));

function createDiagnostics(overrides: Partial<OtaDiagnostics> = {}): OtaDiagnostics {
  return {
    channel: "production",
    runtimeVersion: "1.0.0",
    updateId: "update-1",
    isEmbeddedLaunch: false,
    createdAt: "2026-04-02T00:00:00.000Z",
    nativeAppVersion: "1.0.0",
    nativeBuildVersion: "21",
    updatesUrl: "https://u.expo.dev/project-id",
    projectId: "project-id",
    expectedBranch: "production",
    severity: "warning",
    issues: [],
    actions: [],
    lastUpdateAgeHours: 1,
    isProbablyOutdated: false,
    isChannelMismatch: false,
    isRuntimeMismatchSuspected: false,
    appVersion: "1.0.0",
    nativeBuild: "21",
    launchSource: "downloaded-update",
    publishHint: "Publish to production",
    ...overrides,
  };
}

describe("ProfileOtaDiagnosticsCard", () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    mockClipboardSetStringAsync.mockReset();
    mockCheckAndFetchOtaNow.mockReset();
    mockGetOtaDiagnostics.mockReset();
    mockBuildOtaDiagnosticsText.mockReset();
    mockBuildOtaDiagnosticsText.mockReturnValue("diagnostics");

    alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  function renderCard(): ReactTestRenderer {
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(<ProfileOtaDiagnosticsCard />);
    });

    return renderer!;
  }

  it("shows safe OTA steps on release channels without calling manual fetch", async () => {
    mockGetOtaDiagnostics.mockReturnValue(createDiagnostics({ channel: "production", expectedBranch: "production" }));

    const renderer = renderCard();
    const textNodes = renderer.root.findAllByType(Text);

    expect(textNodes.some((node) => node.props.children === "Показать шаги OTA")).toBe(true);

    await act(async () => {
      renderer.root.findByProps({ testID: "ota-check-action" }).props.onPress();
    });

    expect(mockCheckAndFetchOtaNow).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      "OTA diagnostics",
      expect.stringContaining("ручная OTA-проверка отключена"),
    );
  });

  it("keeps manual check path available outside release channels", async () => {
    mockGetOtaDiagnostics.mockReturnValue(
      createDiagnostics({
        channel: "development-client",
        expectedBranch: "unknown",
      }),
    );
    mockCheckAndFetchOtaNow.mockResolvedValue({
      isAvailable: false,
      isFetched: false,
      message: "Новых OTA-обновлений нет.",
    });

    const renderer = renderCard();
    const textNodes = renderer.root.findAllByType(Text);

    expect(textNodes.some((node) => node.props.children === "Проверить OTA сейчас")).toBe(true);

    await act(async () => {
      await renderer.root.findByProps({ testID: "ota-check-action" }).props.onPress();
    });

    expect(mockCheckAndFetchOtaNow).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith("OTA diagnostics", "Новых OTA-обновлений нет.");
  });
});
