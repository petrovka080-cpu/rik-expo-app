import React from "react";
import { View } from "react-native";

import type { DocumentAsset } from "../documents/pdfDocumentSessions";
import { VIEWER_BG } from "./pdfViewer.constants";
import { styles } from "./pdfViewer.styles";
import { buildPdfViewerWebFallbackHtml, needsPdfJsWebFallback } from "./pdfViewerWebFallback";
import {
  canPoolWebPdfFrame,
  mountPooledWebPdfFrame,
} from "./pdfViewerWebFramePool";

export type PdfViewerWebShellProps = {
  asset: DocumentAsset;
  width: number;
  renderInstanceKey: string;
  webEmbeddedUri: string;
  isReady?: boolean;
  onLoad: () => void;
  onError: () => void;
};

function decodeHtmlDataUri(uri: string): string {
  const value = String(uri || "").trim();
  if (!value.toLowerCase().startsWith("data:text/html")) return "";
  const commaIndex = value.indexOf(",");
  if (commaIndex < 0) return "";

  const metadata = value.slice(5, commaIndex).toLowerCase();
  const payload = value.slice(commaIndex + 1);
  if (!payload) return "";

  try {
    if (metadata.includes(";base64")) {
      return typeof atob === "function" ? atob(payload) : "";
    }
    return decodeURIComponent(payload);
  } catch {
    return "";
  }
}

/** Event-driven layout authority for this exact iframe, never an auth bypass. */
export function observePdfViewerFallbackVisibility(input: {
  iframe: HTMLIFrameElement;
  renderInstanceKey: string;
  onLoad: () => void;
  onError: () => void;
}): () => void {
  let stopped = false;
  let epoch = 0;
  let lastSignature = '';
  let current = { active: false, width: 0, height: 0, epoch: 0 };
  const sample = (resend = false) => {
    if (stopped) return;
    const bounds = input.iframe.getBoundingClientRect();
    const style = window.getComputedStyle(input.iframe);
    const positive = Number.isFinite(bounds.width) && Number.isFinite(bounds.height)
      && bounds.width > 0 && bounds.height > 0;
    const active = document.visibilityState === 'visible' && positive
      && style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse';
    const width = active ? Math.min(16384, Math.max(1, Math.round(bounds.width))) : 0;
    const height = active ? Math.min(16384, Math.max(1, Math.round(bounds.height))) : 0;
    const signature = active ? width + 'x' + height : 'inactive';
    const changed = signature !== lastSignature;
    if (!changed && !resend) return;
    if (changed) {
      if (epoch >= Number.MAX_SAFE_INTEGER) return;
      epoch += 1;
      lastSignature = signature;
      current = { active, width, height, epoch };
    }
    input.iframe.contentWindow?.postMessage({
      type: 'pdf-viewer-visibility', renderInstanceKey: input.renderInstanceKey,
      ...current,
    }, window.location.origin);
  };
  const receive = (event: MessageEvent) => {
    if (stopped || event.source !== input.iframe.contentWindow || event.origin !== window.location.origin) return;
    const message = event.data;
    if (!message || message.renderInstanceKey !== input.renderInstanceKey) return;
    if (message.type === 'pdf-viewer-layout-request') { sample(true); return; }
    if (message.type !== 'pdf-viewer-render') return;
    // Re-read actual geometry before accepting a late child receipt, even if
    // its ResizeObserver/visibility callback is still queued.
    sample();
    if (!current.active || message.visibilityEpoch !== current.epoch) return;
    if (message.kind === 'ready') input.onLoad();
    else if (message.kind === 'error') input.onError();
  };
  const changed = () => sample();
  const loaded = () => sample(true); // Same-epoch handshake resend, not another render.
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(changed);
  window.addEventListener('message', receive);
  document.addEventListener('visibilitychange', changed);
  window.addEventListener('resize', changed);
  input.iframe.addEventListener('load', loaded);
  observer?.observe(input.iframe);
  sample();
  return () => {
    stopped = true;
    observer?.disconnect();
    window.removeEventListener('message', receive);
    document.removeEventListener('visibilitychange', changed);
    window.removeEventListener('resize', changed);
    input.iframe.removeEventListener('load', loaded);
  };
}

export function PdfViewerWebShell({
  asset,
  width,
  renderInstanceKey,
  webEmbeddedUri,
  isReady = false,
  onLoad,
  onError,
}: PdfViewerWebShellProps) {
  const pooledContainerRef = React.useRef<HTMLDivElement | null>(null);
  const fallbackFrameRef = React.useRef<HTMLIFrameElement | null>(null);
  const usesPdfJsFallback = needsPdfJsWebFallback(asset, webEmbeddedUri);
  const htmlSrcDoc = React.useMemo(
    () => usesPdfJsFallback
      ? buildPdfViewerWebFallbackHtml(webEmbeddedUri, renderInstanceKey, window.location.origin)
      : decodeHtmlDataUri(webEmbeddedUri),
    [webEmbeddedUri, renderInstanceKey, usesPdfJsFallback],
  );
  const usesPooledFrame = !usesPdfJsFallback && canPoolWebPdfFrame(webEmbeddedUri);

  const fallbackCallbacks = React.useRef({ onLoad, onError });
  fallbackCallbacks.current = { onLoad, onError };
  React.useEffect(() => {
    const iframe = fallbackFrameRef.current;
    if (!usesPdfJsFallback || !iframe) return;
    return observePdfViewerFallbackVisibility({
      iframe, renderInstanceKey,
      onLoad: () => fallbackCallbacks.current.onLoad(),
      onError: () => fallbackCallbacks.current.onError(),
    });
  }, [usesPdfJsFallback, renderInstanceKey, webEmbeddedUri]);

  React.useEffect(() => {
    const container = pooledContainerRef.current;
    if (!usesPooledFrame || !container) return;
    const mounted = mountPooledWebPdfFrame({
      container,
      uri: webEmbeddedUri,
      title: asset.title || "PDF",
      renderInstanceKey,
      onLoad,
      onError,
    });
    return mounted.release;
  }, [
    asset.title,
    onError,
    onLoad,
    renderInstanceKey,
    usesPooledFrame,
    webEmbeddedUri,
  ]);

  React.useEffect(() => {
    const iframe = pooledContainerRef.current?.querySelector("iframe");
    if (iframe) iframe.setAttribute("aria-busy", String(!isReady));
  }, [isReady]);

  return (
    <View style={styles.viewerBody}>
      <View
        style={[
          styles.webFrameWrap,
          { maxWidth: width >= 1200 ? 1080 : width >= 860 ? 960 : width },
        ]}
      >
        {usesPooledFrame ? (
          <div
            ref={pooledContainerRef}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <iframe
            ref={fallbackFrameRef}
            key={renderInstanceKey}
            data-render-key={renderInstanceKey}
            data-testid="pdf-viewer-web-iframe"
            data-pdf-renderer={usesPdfJsFallback ? "pdfjs" : "browser"}
            aria-busy={!isReady}
            title={asset.title || "PDF"}
            src={htmlSrcDoc ? undefined : webEmbeddedUri || undefined}
            srcDoc={htmlSrcDoc || undefined}
            onLoad={usesPdfJsFallback ? undefined : onLoad}
            onError={onError}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              background: VIEWER_BG,
            }}
          />
        )}
      </View>
    </View>
  );
}
