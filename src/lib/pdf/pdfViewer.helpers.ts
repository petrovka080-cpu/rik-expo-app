/**
 * PDF Viewer helper types and utility functions — mechanical extraction (C-REAL-2).
 * Extracted verbatim from app/pdf-viewer.tsx lines 73-207.
 * Web downloads materialize remote PDFs as local blobs to retain the viewer.
 */

import { Platform } from "react-native";
import { registerTimeout } from "../lifecycle/timerRegistry";
import { fetchWithRequestTimeout } from "../requestTimeoutPolicy";
import * as FileSystemModule from "expo-file-system/legacy";
import {
  assertValidLocalPdfFile,
  assertValidRemotePdfResponse,
} from "./pdfSourceValidation";
import type { PdfViewerResolution } from "./pdfViewerContract";
import type { DocumentAsset } from "../documents/pdfDocumentSessions";
import {
  openPdfDocumentExternal,
  sharePdfDocument,
} from "../documents/pdfDocumentActions";

export type ViewerFileInfo = {
  exists: boolean;
  sizeBytes?: number;
};

type FileSystemInfoResult = {
  exists?: unknown;
  size?: unknown;
};

type FileSystemCompatShape = {
  getInfoAsync?: (
    uri: string,
  ) => Promise<FileSystemInfoResult | null | undefined>;
  readAsStringAsync?: (
    uri: string,
    options: { encoding: "base64"; position?: number; length?: number },
  ) => Promise<string>;
};

export const FileSystemCompat: FileSystemCompatShape = FileSystemModule;

export function getUriScheme(uri?: string | null) {
  const value = String(uri || "").trim();
  const match = value.match(/^([a-z0-9+.-]+):/i);
  return match?.[1]?.toLowerCase() || "";
}

export async function inspectLocalPdfFile(
  uri: string,
): Promise<ViewerFileInfo | null> {
  if (!FileSystemCompat.getInfoAsync) return null;
  const info = await FileSystemCompat.getInfoAsync(uri);
  return {
    exists: Boolean(info?.exists),
    sizeBytes: Number.isFinite(Number(info?.size))
      ? Number(info?.size)
      : undefined,
  };
}

export async function validateEmbeddedPreviewResolution(
  resolution: Extract<PdfViewerResolution, { kind: "resolved-embedded" }>,
) {
  if (Platform.OS === "web") return;

  if (resolution.sourceKind === "local-file" || resolution.scheme === "file") {
    await assertValidLocalPdfFile({
      fileSystem: FileSystemCompat,
      uri: resolution.asset.uri,
      failureLabel: "PDF preview file",
      mode: Platform.OS === "ios" ? "size-only" : "content-probe",
    });
    return;
  }

  if (resolution.sourceKind === "remote-url") {
    await assertValidRemotePdfResponse({
      uri: resolution.asset.uri,
      failureLabel: "PDF preview response",
    });
  }
}

export async function downloadPdfAsset(asset: DocumentAsset) {
  if (Platform.OS === "web") {
    if (typeof document === "undefined") return;
    let downloadUri = asset.uri;
    let ownedObjectUrl: string | null = null;
    // Browsers ignore `download` for cross-origin URLs and navigate the current
    // tab. Download a local blob instead; session-owned blob URLs stay borrowed.
    if (getUriScheme(asset.uri) !== "blob") {
      const response = await fetchWithRequestTimeout(asset.uri, { headers: { Accept: "application/pdf" } }, {
        requestClass: "heavy_report_or_pdf_or_storage", screen: "request", surface: "pdf_viewer",
        owner: "pdf_viewer", operation: "download_pdf", sourceKind: "fetch:pdf_download",
      });
      if (!response.ok) throw new Error(`PDF download failed (${response.status}).`);
      const blob = await response.blob();
      const prefix = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
      if (String.fromCharCode(...prefix) !== "%PDF-") throw new Error("PDF download returned an invalid document.");
      ownedObjectUrl = URL.createObjectURL(blob);
      downloadUri = ownedObjectUrl;
    }
    const link = document.createElement("a");
    link.href = downloadUri;
    link.download = asset.fileName || `${asset.title || "document"}.pdf`;
    link.rel = "noopener";
    try {
      document.body.appendChild(link);
      link.click();
    } finally {
      link.remove();
      if (ownedObjectUrl) {
        const url = ownedObjectUrl;
        registerTimeout("pdf-viewer:web-download-url-revoke", () => URL.revokeObjectURL(url), 60_000);
      }
    }
    return;
  }
  await sharePdfDocument(asset);
}

export async function printPdfAsset(asset: DocumentAsset) {
  if (Platform.OS === "web") {
    if (typeof document === "undefined") return;
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.opacity = "0";
    frame.style.pointerEvents = "none";
    frame.src = asset.uri;
    document.body.appendChild(frame);
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      registerTimeout("pdf-viewer:web-print-iframe-remove", () => {
        document.body.removeChild(frame);
      }, 1200);
    };
    return;
  }
  await openPdfDocumentExternal(asset);
}
