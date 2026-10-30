import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import type { DocumentAsset } from "../../src/lib/documents/pdfDocumentSessions";
import { CenteredPanel, MenuAction } from "../../src/lib/pdf/pdfViewer.components";
import type { PdfViewerResolution } from "../../src/lib/pdf/pdfViewerContract";
import { PdfViewerNativeShell } from "../../src/lib/pdf/PdfViewerNativeShell";
import { PdfViewerScreenContent } from "../../src/lib/pdf/PdfViewerScreenContent";
import { PdfViewerWebShell } from "../../src/lib/pdf/PdfViewerWebShell";

jest.mock("@expo/vector-icons", () => {
  const mockReact = jest.requireActual("react") as typeof import("react");
  return {
    Ionicons: ({ name }: { name: string }) =>
      mockReact.createElement("MockIonicon", { name }),
  };
});

const asset: DocumentAsset = {
  assetId: "asset-1",
  uri: "https://example.com/report.pdf",
  fileSource: {
    kind: "remote-url",
    uri: "https://example.com/report.pdf",
  },
  sourceKind: "remote-url",
  fileName: "report.pdf",
  title: "Report",
  mimeType: "application/pdf",
  documentType: "director_report",
  originModule: "director",
  source: "generated",
  createdAt: "2026-04-20T10:00:00.000Z",
};

const embeddedResolution: PdfViewerResolution = {
  kind: "resolved-embedded",
  asset,
  source: { uri: asset.uri },
  scheme: "https",
  sourceKind: "remote-url",
  renderer: "web-frame",
  canonicalUri: asset.uri,
};

function createProps(
  overrides?: Partial<React.ComponentProps<typeof PdfViewerScreenContent>>,
): React.ComponentProps<typeof PdfViewerScreenContent> {
  return {
    title: asset.title,
    showChrome: true,
    headerHeight: 56,
    topInset: 0,
    menuOpen: false,
    asset,
    contentModel: {
      kind: "loading",
    },
    width: 1280,
    renderInstanceKey: "render-1",
    webEmbeddedUri: asset.uri,
    nativeHandoffCompleted: false,
    nativePdfWebView: null,
    nativeWebViewReadAccessUri: undefined,
    source: { uri: asset.uri },
    resolvedSource: embeddedResolution,
    showPageIndicator: false,
    pageIndicatorText: "1 / 1",
    onBack: jest.fn(),
    onToggleMenu: jest.fn(),
    onShare: jest.fn(),
    onDownload: jest.fn(),
    onOpenExternal: jest.fn(),
    onPrint: jest.fn(),
    onRetry: jest.fn(),
    onToggleChrome: jest.fn(),
    onOpenAgain: jest.fn(),
    onWebLoad: jest.fn(),
    onWebError: jest.fn(),
    onNativeLoadStart: jest.fn(),
    onNativeLoadEnd: jest.fn(),
    onNativeError: jest.fn(),
    onNativeHttpError: jest.fn(),
    onNativeRenderProcessGone: jest.fn(),
    ...overrides,
  };
}

function renderContent(
  props?: Partial<React.ComponentProps<typeof PdfViewerScreenContent>>,
) {
  const rendererRef: { current: TestRenderer.ReactTestRenderer | null } = { current: null };
  act(() => {
    rendererRef.current = TestRenderer.create(<PdfViewerScreenContent {...createProps(props)} />);
  });
  const renderer = rendererRef.current;
  if (!renderer) {
    throw new Error("presenter renderer was not created");
  }
  return renderer;
}

describe("PdfViewerScreenContent", () => {
  it("keeps Russian document actions accessible and delegated to the same callbacks", () => {
    const props = createProps({ menuOpen: true });
    const renderer = renderContent(props);
    expect(renderer.root.findByProps({ testID: "pdf-viewer-back" }).props.accessibilityLabel).toBe("Назад");
    const actions = renderer.root.findAllByType(MenuAction);
    expect(actions.map(action => action.props.label)).toEqual([
      "Поделиться", "Скачать", "Открыть в другом приложении", "Печать",
    ]);
    const callbacks = [props.onShare, props.onDownload, props.onOpenExternal, props.onPrint];
    actions.forEach((action, index) => {
      expect(action.props.onPress).toBe(callbacks[index]);
      act(() => action.props.onPress());
      expect(callbacks[index]).toHaveBeenCalledTimes(1);
      const accessible = action.findAll(node => node.props.accessibilityRole === "button"
        && node.props.accessibilityLabel === action.props.label);
      expect(accessible.length).toBeGreaterThan(0);
    });
    act(() => renderer.unmount());
  });

  it("renders the error branch through the extracted presenter contract", () => {
    const onRetry = jest.fn();
    const onOpenExternal = jest.fn();
    const renderer = renderContent({
      contentModel: {
        kind: "error",
        title: "Unable to open document",
        subtitle: "Preview failed to load.",
        allowOpenExternal: true,
        allowRetry: true,
      },
      onRetry,
      onOpenExternal,
    });

    const panel = renderer.root.findByType(CenteredPanel);
    expect(panel.props.onAction).toBe(onRetry);
    expect(panel.props.onSecondaryAction).toBe(onOpenExternal);
  });

  it("renders the embedded web shell and keeps shell callbacks delegated", () => {
    const onWebLoad = jest.fn();
    const onWebError = jest.fn();
    const renderer = renderContent({
      contentModel: {
        kind: "embedded-web",
        showLoadingOverlay: false,
      },
      onWebLoad,
      onWebError,
    });

    const shell = renderer.root.findByType(PdfViewerWebShell);
    expect(shell.props.webEmbeddedUri).toBe(asset.uri);
    expect(shell.props.onLoad).toBe(onWebLoad);
    expect(shell.props.onError).toBe(onWebError);
  });

  it("renders the native handoff shell without moving ownership back into the screen", () => {
    const onOpenAgain = jest.fn();
    const onShare = jest.fn();
    const renderer = renderContent({
      contentModel: {
        kind: "native-handoff",
        allowShare: true,
      },
      nativeHandoffCompleted: true,
      onOpenAgain,
      onShare,
    });

    const shell = renderer.root.findByType(PdfViewerNativeShell);
    expect(shell.props.mode).toBe("native-handoff");
    expect(shell.props.onOpenAgain).toBe(onOpenAgain);
    expect(shell.props.onShare).toBe(onShare);
  });
});
