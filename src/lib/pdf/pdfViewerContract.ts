import type {
  DocumentAsset,
  DocumentSession,
} from "../documents/pdfDocumentSessions";
import {
  createPdfSource,
  getUriScheme,
  hashString32,
  type PdfSource,
} from "../pdfFileContract";
import {
  normalizePdfFileName,
  type PdfDocumentType,
  type PdfOriginModule,
} from "../documents/pdfDocument";

export type PdfViewerPlatform = "web" | "ios" | "android";
export type PdfViewerState = "init" | "loading" | "ready" | "error" | "empty";
export type PdfViewerEmbeddedSource = { uri: string } | { html: string; baseUrl?: string };
export type PdfViewerDirectSourceParams = {
  uri?: string | string[];
  fileName?: string | string[];
  title?: string | string[];
  sourceKind?: string | string[];
  documentType?: string | string[];
  originModule?: string | string[];
  source?: string | string[];
  entityId?: string | string[];
};

export type PdfViewerResolution =
  | { kind: "missing-session" }
  | { kind: "session-error"; errorMessage: string }
  | { kind: "missing-asset" }
  | { kind: "unsupported-mobile-source"; errorMessage: string }
  | {
      kind: "resolved-native-handoff";
      asset: DocumentAsset;
      scheme: string;
      sourceKind: DocumentAsset["sourceKind"];
      renderer: "native-handoff";
      canonicalUri: string;
    }
  | {
      kind: "resolved-embedded";
      asset: DocumentAsset;
      source: PdfViewerEmbeddedSource;
      scheme: string;
      sourceKind: DocumentAsset["sourceKind"];
      renderer: "web-frame" | "native-webview";
      canonicalUri: string;
    };

const PDF_DOCUMENT_TYPES = new Set<PdfDocumentType>([
  "request",
  "proposal",
  "payment_order",
  "director_report",
  "report_export",
  "supplier_summary",
  "warehouse_register",
  "warehouse_materials",
  "warehouse_document",
  "contractor_act",
  "attachment_pdf",
]);

const PDF_ORIGIN_MODULES = new Set<PdfOriginModule>([
  "foreman",
  "buyer",
  "accountant",
  "director",
  "warehouse",
  "contractor",
  "reports",
]);

function takeParam(value?: string | string[]) {
  if (Array.isArray(value)) return String(value[0] || "").trim();
  return String(value || "").trim();
}

function normalizeViewerDocumentType(value: string): PdfDocumentType {
  return PDF_DOCUMENT_TYPES.has(value as PdfDocumentType)
    ? (value as PdfDocumentType)
    : "attachment_pdf";
}

function normalizeViewerOriginModule(value: string): PdfOriginModule {
  return PDF_ORIGIN_MODULES.has(value as PdfOriginModule)
    ? (value as PdfOriginModule)
    : "reports";
}

function normalizeViewerSource(value: string): "generated" | "attachment" {
  return value === "attachment" ? "attachment" : "generated";
}

function buildDirectAssetFileName(
  fileName: string,
  source: PdfSource,
  documentType: PdfDocumentType,
) {
  if (fileName) return normalizePdfFileName(fileName, "document");
  const tail = String(source.uri).split("?")[0].split("#")[0].split("/").filter(Boolean).pop();
  if (tail) return normalizePdfFileName(tail, "document");
  return normalizePdfFileName(`${documentType}_${hashString32(source.uri)}`, "document");
}

export function resolvePdfViewerDirectSnapshot(
  params: PdfViewerDirectSourceParams,
): { session: DocumentSession; asset: DocumentAsset } | null {
  const uri = takeParam(params.uri);
  if (!uri) return null;

  const fileSource = createPdfSource(uri);
  const title = takeParam(params.title) || "PDF";
  const documentType = normalizeViewerDocumentType(takeParam(params.documentType));
  const originModule = normalizeViewerOriginModule(takeParam(params.originModule));
  const source = normalizeViewerSource(takeParam(params.source));
  const fileName = buildDirectAssetFileName(takeParam(params.fileName), fileSource, documentType);
  const entityId = takeParam(params.entityId) || undefined;
  const stableKey = `${fileSource.kind}:${fileSource.uri}:${documentType}:${originModule}:${entityId ?? ""}`;
  const hash = hashString32(stableKey);
  const now = new Date().toISOString();
  const assetId = `direct_asset_${hash}`;
  const sessionId = `direct_session_${hash}`;

  return {
    session: {
      sessionId,
      assetId,
      status: "ready",
      createdAt: now,
      lastAccessAt: now,
    },
    asset: {
      assetId,
      uri: fileSource.uri,
      fileSource,
      sourceKind: fileSource.kind,
      fileName,
      title,
      mimeType: "application/pdf",
      documentType,
      originModule,
      source,
      createdAt: now,
      entityId,
    },
  };
}

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
  const normalizedUriPath = String(asset.uri || "")
    .split("#")[0]
    .split("?")[0]
    .toLowerCase();
  const normalizedFileName = String(asset.fileName || "").trim().toLowerCase();
  const normalizedMimeType = String(asset.mimeType || "").trim().toLowerCase();
  const isPdf =
    normalizedMimeType === "application/pdf"
    || normalizedFileName.endsWith(".pdf")
    || normalizedUriPath.endsWith(".pdf");
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

  if (
    platform === "ios"
    && ((assetSourceKind === "local-file" || scheme === "file")
      || (assetSourceKind === "remote-url" || scheme === "http" || scheme === "https"))
    && isPdf
  ) {
    return {
      kind: "resolved-embedded",
      asset,
      source: { uri: asset.uri },
      scheme,
      sourceKind:
        assetSourceKind === "remote-url" || scheme === "http" || scheme === "https"
          ? "remote-url"
          : "local-file",
      renderer: "native-webview",
      canonicalUri: asset.uri,
    };
  }

  if (
    ((assetSourceKind === "local-file" || scheme === "file")
      || (assetSourceKind === "remote-url" || scheme === "http" || scheme === "https"))
    && isPdf
  ) {
    return {
      kind: "resolved-native-handoff",
      asset,
      scheme,
      sourceKind:
        assetSourceKind === "remote-url" || scheme === "http" || scheme === "https"
          ? "remote-url"
          : "local-file",
      renderer: "native-handoff",
      canonicalUri: asset.uri,
    };
  }

  return {
    kind: "unsupported-mobile-source",
    errorMessage: "Mobile preview supports remote http(s) PDFs or local file:// PDF assets.",
  };
}
