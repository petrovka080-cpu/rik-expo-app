import React from "react";
import { View } from "react-native";

import type { DocumentAsset } from "../documents/pdfDocumentSessions";
import { VIEWER_BG } from "./pdfViewer.constants";
import { styles } from "./pdfViewer.styles";

export type PdfViewerWebShellProps = {
  asset: DocumentAsset;
  width: number;
  renderInstanceKey: string;
  webEmbeddedUri: string;
  onLoad: () => void;
  onError: () => void;
};

export function PdfViewerWebShell({
  asset,
  width,
  renderInstanceKey,
  webEmbeddedUri,
  onLoad,
  onError,
}: PdfViewerWebShellProps) {
  return (
    <View style={styles.viewerBody}>
      <View
        style={[
          styles.webFrameWrap,
          { maxWidth: width >= 1200 ? 1080 : width >= 860 ? 960 : width },
        ]}
      >
        <iframe
          key={renderInstanceKey}
          data-render-key={renderInstanceKey}
          title={asset.title || "PDF"}
          src={webEmbeddedUri || undefined}
          onLoad={onLoad}
          onError={onError}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            background: VIEWER_BG,
          }}
        />
      </View>
    </View>
  );
}
