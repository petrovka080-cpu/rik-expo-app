import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { Platform } from "react-native";

import PdfViewerScreen from "../../app/pdf-viewer";

const mockUseLocalSearchParams = jest.fn();
const mockRouterBack = jest.fn();
const mockRouterReplace = jest.fn();
const mockGetDocumentSessionSnapshot = jest.fn();
const mockTouchDocumentSession = jest.fn();
const mockFailDocumentSession = jest.fn();
const mockMarkPdfOpenVisible = jest.fn();
const mockFailPdfOpenVisible = jest.fn();

jest.mock("expo-router", () => ({
  router: {
    back: (...args: unknown[]) => mockRouterBack(...args),
    replace: (...args: unknown[]) => mockRouterReplace(...args),
  },
  useLocalSearchParams: (...args: unknown[]) => mockUseLocalSearchParams(...args),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@expo/vector-icons", () => {
  const mockReact = jest.requireActual("react") as typeof import("react");
  const { Text: MockText } = jest.requireActual("react-native") as typeof import("react-native");
  return {
    Ionicons: ({ name }: { name: string }) => mockReact.createElement(MockText, null, name),
  };
});

jest.mock("../../src/lib/documents/pdfDocumentSessions", () => ({
  failDocumentSession: (...args: unknown[]) => mockFailDocumentSession(...args),
  getDocumentSessionSnapshot: (...args: unknown[]) => mockGetDocumentSessionSnapshot(...args),
  touchDocumentSession: (...args: unknown[]) => mockTouchDocumentSession(...args),
}));

jest.mock("../../src/lib/documents/pdfDocumentActions", () => ({
  openPdfDocumentExternal: jest.fn(),
  sharePdfDocument: jest.fn(),
}));

jest.mock("../../src/lib/pdf/pdfOpenFlow", () => ({
  failPdfOpenVisible: (...args: unknown[]) => mockFailPdfOpenVisible(...args),
  markPdfOpenVisible: (...args: unknown[]) => mockMarkPdfOpenVisible(...args),
}));

jest.mock("../../src/lib/pdf/pdfCrashBreadcrumbs", () => ({
  recordPdfCrashBreadcrumb: jest.fn(),
  shouldRecordPdfCrashBreadcrumbs: () => false,
}));

jest.mock("../../src/lib/pdf/pdfSourceValidation", () => ({
  assertValidLocalPdfFile: jest.fn(),
  assertValidRemotePdfResponse: jest.fn(),
}));

jest.mock("../../src/lib/pdfRunner", () => ({
  openPdfPreview: jest.fn(),
}));

jest.mock("../../src/lib/observability/catchDiscipline", () => ({
  recordCatchDiscipline: jest.fn(),
}));

describe("PdfViewerScreen web lifecycle", () => {
  const originalPlatform = Platform.OS;

  const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockUseLocalSearchParams.mockReset();
    mockRouterBack.mockReset();
    mockRouterReplace.mockReset();
    mockGetDocumentSessionSnapshot.mockReset();
    mockTouchDocumentSession.mockReset();
    mockFailDocumentSession.mockReset();
    mockMarkPdfOpenVisible.mockReset();
    mockFailPdfOpenVisible.mockReset();

    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "web",
    });

    mockGetDocumentSessionSnapshot.mockReturnValue({
      session: null,
      asset: null,
    });
    mockUseLocalSearchParams.mockReturnValue({
      uri: "https://example.com/director-report.pdf",
      fileName: "director-report.pdf",
      title: "Director Report",
      sourceKind: "remote-url",
      documentType: "director_report",
      originModule: "director",
      source: "generated",
      entityId: "object-1",
      openToken: "open-1",
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  afterAll(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatform,
    });
  });

  it("keeps one stable web open cycle for a remote-url session", async () => {
    const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<PdfViewerScreen />);
      await flush();
    });

    const iframe = renderer!.root.find((node) => node.type === "iframe");

    const infoTextsBeforeLoad = infoSpy.mock.calls.map((call) => String(call[0] ?? ""));
    expect(infoTextsBeforeLoad.filter((text) => text.includes("[pdf-viewer] open"))).toHaveLength(1);
    expect(infoTextsBeforeLoad.filter((text) => text.includes("[pdf-viewer] viewer_before_render"))).toHaveLength(1);
    expect(infoTextsBeforeLoad.filter((text) => text.includes("[pdf-viewer] web_iframe_render"))).toHaveLength(1);
    expect(infoTextsBeforeLoad.filter((text) => text.includes("[pdf-viewer] ready"))).toHaveLength(0);

    await act(async () => {
      iframe.props.onLoad();
      await flush();
    });

    const infoTextsAfterLoad = infoSpy.mock.calls.map((call) => String(call[0] ?? ""));
    expect(infoTextsAfterLoad.filter((text) => text.includes("[pdf-viewer] open"))).toHaveLength(1);
    expect(infoTextsAfterLoad.filter((text) => text.includes("[pdf-viewer] viewer_before_render"))).toHaveLength(1);
    expect(infoTextsAfterLoad.filter((text) => text.includes("[pdf-viewer] web_iframe_render"))).toHaveLength(1);
    expect(infoTextsAfterLoad.filter((text) => text.includes("[pdf-viewer] web_iframe_load"))).toHaveLength(1);
    expect(infoTextsAfterLoad.filter((text) => text.includes("[pdf-viewer] ready"))).toHaveLength(1);
    expect(errorSpy).not.toHaveBeenCalled();

    infoSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
