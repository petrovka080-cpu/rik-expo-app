import * as FileSystemCompat from "expo-file-system/legacy";
import { Platform } from "react-native";

import {
  createPdfDocumentDescriptor,
  normalizePdfFileName,
  type PdfDocumentType,
  type PdfOriginModule,
} from "../documents/pdfDocument";
import {
  createInMemoryDocumentPreviewSession,
  getDocumentSessionSnapshot,
} from "../documents/pdfDocumentSessions";
import { persistWebPdfPreviewSession } from "../documents/pdfWebPreviewCache";
import {
  buildWebPdfPreviewCacheKey,
  type WebPdfPreviewCacheIdentity,
} from "../documents/pdfWebPreviewIdentity";
import { getFileSystemPaths } from "../fileSystemPaths";
import { getUriScheme, hashString32, isHttpUri } from "../pdfFileContract";

export type GeneratedPdfViewerAccessKind = "local-file" | "remote-url" | "signed-url" | "blob";

export type GeneratedPdfViewerRouteInput = {
  uri: string;
  fileName: string;
  title: string;
  accessKind: GeneratedPdfViewerAccessKind;
  documentType: PdfDocumentType;
  originModule: PdfOriginModule;
  source: string;
  entityId: string;
  cacheKey?: string;
  cacheIdentity?: WebPdfPreviewCacheIdentity;
};

export type GeneratedPdfViewerDirectRouteParams = {
  uri: string;
  title: string;
  fileName: string;
  sourceKind: "local-file" | "remote-url" | "blob";
  documentType: PdfDocumentType;
  originModule: PdfOriginModule;
  source: string;
  entityId: string;
};

export type GeneratedPdfViewerRouteParams =
  | GeneratedPdfViewerDirectRouteParams
  | {
      sessionId: string;
      openToken: string;
    };

const PDF_DATA_URI_PREFIX = "data:application/pdf;base64,";
const activeWebPreviewSessionByCacheKey = new Map<string, string>();
const inFlightWebPreviewByCacheKey = new Map<
  string,
  Promise<GeneratedPdfViewerRouteParams>
>();

function extractPdfBase64Data(uri: string): string | null {
  const value = String(uri || "").trim();
  if (!value.toLowerCase().startsWith(PDF_DATA_URI_PREFIX)) return null;
  return value.slice(PDF_DATA_URI_PREFIX.length).trim();
}

function routeSourceKindForUri(uri: string, accessKind: GeneratedPdfViewerAccessKind) {
  const scheme = getUriScheme(uri);
  if (scheme === "file") return "local-file";
  if (isHttpUri(uri) || accessKind === "remote-url" || accessKind === "signed-url") return "remote-url";
  return "blob";
}

async function materializePdfDataUriToCache(input: {
  uri: string;
  fileName: string;
  entityId: string;
}): Promise<string> {
  const base64 = extractPdfBase64Data(input.uri);
  if (!base64) return input.uri;
  const { cacheDir } = getFileSystemPaths();
  if (!cacheDir) throw new Error("PDF cache directory is unavailable.");
  const dir = `${cacheDir}generated-pdfs/`;
  await FileSystemCompat.makeDirectoryAsync(dir, { intermediates: true });
  const safeFileName = normalizePdfFileName(input.fileName, "generated-pdf");
  const stableId = hashString32(`${input.entityId}:${safeFileName}:${base64.length}`);
  const targetUri = `${dir}${stableId}-${safeFileName}`;
  await FileSystemCompat.writeAsStringAsync(targetUri, base64, {
    encoding: FileSystemCompat.EncodingType.Base64,
  });
  return targetUri;
}

function materializePdfDataUriToWebBlob(uri: string): string {
  const base64 = extractPdfBase64Data(uri);
  if (
    !base64 ||
    typeof atob !== "function" ||
    typeof Blob === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    return uri;
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
}

export async function buildGeneratedPdfViewerRouteParams(
  input: GeneratedPdfViewerRouteInput,
): Promise<GeneratedPdfViewerRouteParams> {
  const originalUri = String(input.uri || "").trim();
  if (!originalUri) throw new Error("Generated PDF URI is empty.");
  const fileName = normalizePdfFileName(input.fileName, "generated-pdf");
  if (
    Platform.OS === "web"
    && (extractPdfBase64Data(originalUri) || getUriScheme(originalUri) === "blob")
  ) {
    if (!input.cacheIdentity) {
      throw new Error("Generated web PDF cache identity is required.");
    }
    const namespace =
      input.cacheKey
      ?? `generated-pdf:${input.documentType}:${input.originModule}:${input.entityId}:${fileName}`;
    const cacheKey = buildWebPdfPreviewCacheKey({
      namespace,
      identity: input.cacheIdentity,
    });
    const activeSessionId = activeWebPreviewSessionByCacheKey.get(cacheKey);
    if (activeSessionId) {
      const activeSnapshot = getDocumentSessionSnapshot(activeSessionId);
      if (activeSnapshot.session?.status === "ready" && activeSnapshot.asset) {
        return {
          sessionId: activeSessionId,
          openToken: "",
        };
      }
      activeWebPreviewSessionByCacheKey.delete(cacheKey);
    }

    const inFlight = inFlightWebPreviewByCacheKey.get(cacheKey);
    if (inFlight) return inFlight;
    const creation = (async (): Promise<GeneratedPdfViewerRouteParams> => {
      const webUri = materializePdfDataUriToWebBlob(originalUri);
      const { session, asset } = createInMemoryDocumentPreviewSession(
        createPdfDocumentDescriptor({
          uri: webUri,
          objectUrlOwnership:
            webUri !== originalUri && getUriScheme(webUri) === "blob"
              ? "document-session"
              : undefined,
          title: input.title,
          fileName,
          documentType: input.documentType,
          originModule: input.originModule,
          source: "generated",
          entityId: input.entityId,
        }),
      );
      await persistWebPdfPreviewSession({
        session,
        asset,
        namespace,
        identity: input.cacheIdentity!,
      }).catch(() => false);
      activeWebPreviewSessionByCacheKey.set(cacheKey, session.sessionId);
      return {
        sessionId: session.sessionId,
        openToken: "",
      };
    })();
    inFlightWebPreviewByCacheKey.set(cacheKey, creation);
    try {
      return await creation;
    } finally {
      inFlightWebPreviewByCacheKey.delete(cacheKey);
    }
  }
  const uri =
    Platform.OS === "web"
      ? materializePdfDataUriToWebBlob(originalUri)
      : await materializePdfDataUriToCache({
          uri: originalUri,
          fileName,
          entityId: input.entityId,
        });
  return {
    uri,
    title: input.title,
    fileName,
    sourceKind: routeSourceKindForUri(uri, input.accessKind),
    documentType: input.documentType,
    originModule: input.originModule,
    source: input.source,
    entityId: input.entityId,
  };
}

export function clearGeneratedPdfViewerSessionCache(): void {
  activeWebPreviewSessionByCacheKey.clear();
  inFlightWebPreviewByCacheKey.clear();
}
