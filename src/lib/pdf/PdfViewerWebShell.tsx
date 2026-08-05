import React from "react";
import { View } from "react-native";

import type { DocumentAsset } from "../documents/pdfDocumentSessions";
import { VIEWER_BG } from "./pdfViewer.constants";
import { styles } from "./pdfViewer.styles";
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
  const htmlSrcDoc = React.useMemo(
    () => decodeHtmlDataUri(webEmbeddedUri),
    [webEmbeddedUri],
  );
  const usesPooledFrame = canPoolWebPdfFrame(webEmbeddedUri);

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
            key={renderInstanceKey}
            data-render-key={renderInstanceKey}
            data-testid="pdf-viewer-web-iframe"
            aria-busy={!isReady}
            title={asset.title || "PDF"}
            src={htmlSrcDoc ? undefined : webEmbeddedUri || undefined}
            srcDoc={htmlSrcDoc || undefined}
            onLoad={onLoad}
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
