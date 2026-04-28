import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { ActivityIndicator } from "react-native";
import type { WebViewProps } from "react-native-webview";

import type { DocumentAsset } from "../../src/lib/documents/pdfDocumentSessions";
import { createPdfSource } from "../../src/lib/pdfFileContract";
import { CenteredPanel } from "../../src/lib/pdf/pdfViewer.components";
import { PdfViewerNativeShell } from "../../src/lib/pdf/PdfViewerNativeShell";
import { PdfViewerWebShell } from "../../src/lib/pdf/PdfViewerWebShell";

type NativeWebViewEvent = {
  nativeEvent?: {
    description?: string;
    statusCode?: number;
  };
};

type MockNativeWebViewProps = WebViewProps;

const asset: DocumentAsset = {
  assetId: "asset-1",
  createdAt: "2026-04-19T00:00:00.000Z",
  documentType: "director_report",
  entityId: "object-1",
  fileSource: createPdfSource("https://example.com/director-report.pdf"),
  fileName: "director-report.pdf",
  mimeType: "application/pdf",
  originModule: "director",
  sizeBytes: 128,
  source: "generated",
  sourceKind: "remote-url",
  title: "Director Report",
  uri: "https://example.com/director-report.pdf",
};

function renderShell(element: React.ReactElement) {
  const rendererRef: { current: TestRenderer.ReactTestRenderer | null } = { current: null };
  act(() => {
    rendererRef.current = TestRenderer.create(element);
  });
  const renderer = rendererRef.current;
  if (!renderer) {
    throw new Error("shell renderer was not created");
  }
  return renderer;
}

describe("PdfViewerWebShell", () => {
  it("renders the iframe shell and delegates load/error events", () => {
    const onLoad = jest.fn();
    const onError = jest.fn();

    const renderer = renderShell(
      <PdfViewerWebShell
        asset={asset}
        width={1280}
        renderInstanceKey="render-1"
        webEmbeddedUri="https://example.com/embed.pdf"
        onLoad={onLoad}
        onError={onError}
      />,
    );

    const iframe = renderer.root.findByType("iframe");
    expect(iframe.props["data-render-key"]).toBe("render-1");
    expect(iframe.props.src).toBe("https://example.com/embed.pdf");
    expect(iframe.props.title).toBe("Director Report");

    act(() => {
      iframe.props.onLoad();
      iframe.props.onError();
    });

    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

describe("PdfViewerNativeShell", () => {
  it("renders native handoff loading until completion", () => {
    const renderer = renderShell(
      <PdfViewerNativeShell
        mode="native-handoff"
        asset={asset}
        completed={false}
        onToggleChrome={jest.fn()}
        onOpenAgain={jest.fn()}
      />,
    );

    expect(renderer.root.findAllByType(ActivityIndicator)).toHaveLength(1);
  });

  it("renders native handoff completion actions without executing side effects", () => {
    const onOpenAgain = jest.fn();
    const onShare = jest.fn();

    const renderer = renderShell(
      <PdfViewerNativeShell
        mode="native-handoff"
        asset={asset}
        completed
        onToggleChrome={jest.fn()}
        onOpenAgain={onOpenAgain}
        onShare={onShare}
      />,
    );

    const panel = renderer.root.findByType(CenteredPanel);
    expect(panel.props.onAction).toBe(onOpenAgain);
    expect(panel.props.onSecondaryAction).toBe(onShare);
  });

  it("renders native WebView and delegates render events", () => {
    const onLoadStart = jest.fn();
    const onLoadEnd = jest.fn();
    const onError = jest.fn();
    const onHttpError = jest.fn();
    const onRenderProcessGone = jest.fn();
    const MockNativePdfWebView = (props: MockNativeWebViewProps) =>
      React.createElement("NativePdfWebView", props);

    const renderer = renderShell(
      <PdfViewerNativeShell
        mode="native-webview"
        source={{ uri: "file:///tmp/director-report.pdf" }}
        renderInstanceKey="native-render-1"
        nativePdfWebView={MockNativePdfWebView}
        nativeWebViewReadAccessUri="file:///tmp"
        onLoadStart={onLoadStart}
        onLoadEnd={onLoadEnd}
        onError={onError}
        onHttpError={onHttpError}
        onRenderProcessGone={onRenderProcessGone}
        onOpenExternal={jest.fn()}
      />,
    );

    const webView = renderer.root.find((node) => String(node.type) === "NativePdfWebView");
    expect(webView.props.testID).toBe("native-pdf-webview");
    expect(webView.props.source).toEqual({ uri: "file:///tmp/director-report.pdf" });
    expect(webView.props.allowingReadAccessToURL).toBe("file:///tmp");

    const errorEvent = { nativeEvent: { description: "failed" } };
    const httpErrorEvent = { nativeEvent: { statusCode: 500 } };
    const processGoneEvent = { nativeEvent: { didCrash: true } };
    act(() => {
      webView.props.onLoadStart();
      webView.props.onLoadEnd();
      webView.props.onError(errorEvent);
      webView.props.onHttpError(httpErrorEvent);
      webView.props.onRenderProcessGone(processGoneEvent);
    });

    expect(onLoadStart).toHaveBeenCalledTimes(1);
    expect(onLoadEnd).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(errorEvent);
    expect(onHttpError).toHaveBeenCalledWith(httpErrorEvent);
    expect(onRenderProcessGone).toHaveBeenCalledWith(processGoneEvent);
  });

  it("renders the native unavailable fallback when WebView is absent", () => {
    const onOpenExternal = jest.fn();

    const renderer = renderShell(
      <PdfViewerNativeShell
        mode="native-webview"
        source={{ uri: "file:///tmp/director-report.pdf" }}
        renderInstanceKey="native-render-1"
        nativePdfWebView={null}
        onLoadStart={jest.fn()}
        onLoadEnd={jest.fn()}
        onError={jest.fn()}
        onHttpError={jest.fn()}
        onRenderProcessGone={jest.fn()}
        onOpenExternal={onOpenExternal}
      />,
    );

    const panel = renderer.root.findByType(CenteredPanel);
    expect(panel.props.onAction).toBe(onOpenExternal);
  });
});
