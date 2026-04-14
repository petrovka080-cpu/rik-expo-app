/**
 * PDF Viewer helper types and utility functions — mechanical extraction (C-REAL-2).
 * Extracted verbatim from app/pdf-viewer.tsx lines 73-207.
 * No logic changed.
 */

import { Platform } from "react-native";
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
    const link = document.createElement("a");
    link.href = asset.uri;
    link.download = asset.fileName || `${asset.title || "document"}.pdf`;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      setTimeout(() => {
        document.body.removeChild(frame);
      }, 1200);
    };
    return;
  }
  await openPdfDocumentExternal(asset);
}
