import type {
  DocumentAsset,
  DocumentSession,
} from "../documents/pdfDocumentSessions";
import { getUriScheme } from "../pdfFileContract";

export type PdfViewerPlatform = "web" | "ios" | "android";
export type PdfViewerState = "init" | "loading" | "ready" | "error" | "empty";
export type PdfViewerEmbeddedSource = { uri: string } | { html: string; baseUrl?: string };

export type PdfViewerResolution =
  | { kind: "missing-session" }
  | { kind: "session-error"; errorMessage: string }
  | { kind: "missing-asset" }
  | { kind: "unsupported-mobile-source"; errorMessage: string }
  | {
      kind: "resolved-embedded";
      asset: DocumentAsset;
      source: PdfViewerEmbeddedSource;
      scheme: string;
      sourceKind: DocumentAsset["sourceKind"];
      renderer: "web-frame" | "native-webview" | "native-local-webview";
      canonicalUri: string;
    };

export function appendPdfViewerHash(uri: string) {
  const value = String(uri || "").trim();
  if (!value) return "";
  const hashJoiner = value.includes("#") ? "&" : "#";
  return `${value}${hashJoiner}page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0`;
}

function escapeHtmlAttr(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function buildAndroidLocalPdfShell(uri: string) {
  const viewerUri = escapeHtmlAttr(appendPdfViewerHash(uri));
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta
    name="viewport"
    content="width=device-width,height=device-height,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"
  />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #111111;
    }
    body {
      position: fixed;
      inset: 0;
    }
    #viewport {
      position: fixed;
      inset: 0;
      overflow: hidden;
      background: #111111;
    }
    #frame, #embed {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      border: 0;
      background: #111111;
      display: block;
    }
  </style>
</head>
<body>
  <div id="viewport">
    <iframe id="frame" src="${viewerUri}" title="PDF" allowfullscreen></iframe>
    <embed id="embed" src="${viewerUri}" type="application/pdf" />
  </div>
</body>
</html>`;
}

export function getReadAccessParentUri(uri?: string | null) {
  const value = String(uri || "").trim();
  if (!value.startsWith("file://")) return undefined;
  const slashIndex = value.lastIndexOf("/");
  if (slashIndex <= "file://".length) return undefined;
  return value.slice(0, slashIndex);
}

export function resolvePdfViewerState(
  session: DocumentSession | null,
  asset: DocumentAsset | null,
  platform: PdfViewerPlatform,
): PdfViewerState {
  const resolution = resolvePdfViewerResolution({ session, asset, platform });
  if (resolution.kind === "missing-session") return "empty";
  if (resolution.kind === "session-error" || resolution.kind === "missing-asset") return "error";
  return "loading";
}

export function resolvePdfViewerResolution(args: {
  session: DocumentSession | null;
  asset: DocumentAsset | null;
  platform: PdfViewerPlatform;
}): PdfViewerResolution {
  const { session, asset, platform } = args;
  if (!session) return { kind: "missing-session" };
  if (session.status === "error") {
    return {
      kind: "session-error",
      errorMessage: session.errorMessage || "Preview failed to load.",
    };
  }
  if (!asset?.uri) return { kind: "missing-asset" };

  const scheme = getUriScheme(asset.uri);
  const isPdf = String(asset.uri || "").toLowerCase().endsWith(".pdf");
  const assetSourceKind = asset.sourceKind;

  if (platform === "web") {
    return {
      kind: "resolved-embedded",
      asset,
      source: { uri: asset.uri },
      scheme,
      sourceKind: assetSourceKind,
      renderer: "web-frame",
      canonicalUri: asset.uri,
    };
  }

  if ((assetSourceKind === "local-file" || scheme === "file") && isPdf) {
    return {
      kind: "resolved-embedded",
      asset,
      source:
        platform === "android"
          ? {
              html: buildAndroidLocalPdfShell(asset.uri),
              baseUrl: getReadAccessParentUri(asset.uri) ?? asset.uri,
            }
          : { uri: asset.uri },
      scheme,
      sourceKind: "local-file",
      renderer: platform === "android" ? "native-local-webview" : "native-webview",
      canonicalUri: asset.uri,
    };
  }

  if ((assetSourceKind === "remote-url" || scheme === "http" || scheme === "https") && isPdf) {
    return {
      kind: "resolved-embedded",
      asset,
      source: { uri: asset.uri },
      scheme,
      sourceKind: "remote-url",
      renderer: "native-webview",
      canonicalUri: asset.uri,
    };
  }

  return {
    kind: "unsupported-mobile-source",
    errorMessage: "Mobile preview supports remote http(s) PDFs or local file:// PDF assets.",
  };
}
