import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";
import { Alert, Text } from "react-native";

import { ProfileOtaDiagnosticsCard } from "./ProfileOtaDiagnosticsCard";
import type { OtaDiagnostics } from "@/src/lib/otaDiagnostics";

const mockClipboardSetStringAsync = jest.fn();
const mockCheckAndFetchOtaNow = jest.fn();
const mockGetOtaDiagnostics = jest.fn();
const mockBuildOtaDiagnosticsText = jest.fn();
const mockUseUpdates = jest.fn();
const mockGetPdfCrashBreadcrumbs = jest.fn();
const mockBuildPdfCrashBreadcrumbsText = jest.fn();

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

jest.mock("expo-updates", () => ({
  useUpdates: (...args: unknown[]) => mockUseUpdates(...args),
}));

jest.mock("@/src/lib/otaHardening", () => ({
  checkAndFetchOtaNow: (...args: unknown[]) => mockCheckAndFetchOtaNow(...args),
}));

jest.mock("@/src/lib/otaDiagnostics", () => ({
  buildOtaDiagnosticsText: (...args: unknown[]) => mockBuildOtaDiagnosticsText(...args),
  getOtaDiagnostics: (...args: unknown[]) => mockGetOtaDiagnostics(...args),
}));

jest.mock("@/src/lib/pdf/pdfCrashBreadcrumbs", () => ({
  getPdfCrashBreadcrumbs: (...args: unknown[]) => mockGetPdfCrashBreadcrumbs(...args),
  buildPdfCrashBreadcrumbsText: (...args: unknown[]) => mockBuildPdfCrashBreadcrumbsText(...args),
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
    reasons: [],
    actions: [],
    lastUpdateAgeHours: 1,
    isProbablyOutdated: false,
    isChannelMismatch: false,
    isRuntimeMismatchSuspected: false,
    appVersion: "1.0.0",
    nativeBuild: "21",
    launchSource: "ota",
    publishHint: "Publish to production",
    verdict: "warning",
    configuredAppVersion: "1.0.0",
    configuredIosBuildNumber: "21",
    configuredAndroidVersionCode: "21",
    checkAutomatically: "ON_LOAD",
    fallbackToCacheTimeout: 0,
    appVersionSource: "remote",
    releaseLabel: "prod-hotfix",
    gitCommit: "abc123",
    updateGroupId: "group-1",
    updateMessage: "release-safe diagnostics",
    metadataSource: "manifest-metadata",
    metadataWarnings: [],
    updateAvailabilityState: "not-checked",
    updateAvailabilitySummary: "No in-session update result is available yet.",
    availableUpdateId: "not-provided",
    availableUpdateCreatedAt: "not-provided",
    downloadedUpdateId: "not-provided",
    downloadedUpdateCreatedAt: "not-provided",
    lastCheckForUpdateTimeSinceRestart: "not-provided",
    checkError: "not-provided",
    downloadError: "not-provided",
    isEmergencyLaunch: false,
    emergencyLaunchReason: "not-provided",
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
    mockUseUpdates.mockReset();
    mockGetPdfCrashBreadcrumbs.mockReset();
    mockBuildPdfCrashBreadcrumbsText.mockReset();
    mockBuildOtaDiagnosticsText.mockReturnValue("diagnostics");
    mockGetPdfCrashBreadcrumbs.mockResolvedValue([]);
    mockBuildPdfCrashBreadcrumbsText.mockReturnValue("breadcrumb-line");
    mockUseUpdates.mockReturnValue({});

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

  it("copies diagnostics together with persisted pdf crash breadcrumbs", async () => {
    mockGetOtaDiagnostics.mockReturnValue(createDiagnostics());
    mockGetPdfCrashBreadcrumbs.mockResolvedValue([
      {
        at: "2026-04-03T10:00:00.000Z",
        screen: "foreman",
        marker: "viewer_validation_start",
      },
    ]);
    mockBuildPdfCrashBreadcrumbsText.mockReturnValue(
      "2026-04-03T10:00:00.000Z | foreman | viewer_validation_start",
    );

    const renderer = renderCard();

    await act(async () => {
      await renderer.root.findByProps({ testID: "ota-copy-action" }).props.onPress();
    });

    expect(mockGetPdfCrashBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(mockBuildPdfCrashBreadcrumbsText).toHaveBeenCalledWith([
      {
        at: "2026-04-03T10:00:00.000Z",
        screen: "foreman",
        marker: "viewer_validation_start",
      },
    ]);
    expect(mockClipboardSetStringAsync).toHaveBeenCalledWith(
      "diagnostics\n\npdf_crash_breadcrumbs:\n2026-04-03T10:00:00.000Z | foreman | viewer_validation_start",
    );
    expect(alertSpy).toHaveBeenCalledWith("OTA diagnostics", expect.any(String));
  });
});
