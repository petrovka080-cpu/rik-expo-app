import * as FileSystemCompat from "expo-file-system/legacy";
import { Platform } from "react-native";

import { normalizePdfFileName } from "../documents/pdfDocument";
import { getFileSystemPaths } from "../fileSystemPaths";
import { getUriScheme, hashString32, isHttpUri } from "../pdfFileContract";

export type GeneratedPdfViewerAccessKind = "local-file" | "remote-url" | "signed-url" | "blob";

export type GeneratedPdfViewerRouteInput = {
  uri: string;
  fileName: string;
  title: string;
  accessKind: GeneratedPdfViewerAccessKind;
  documentType: string;
  originModule: string;
  source: string;
  entityId: string;
};

export type GeneratedPdfViewerRouteParams = {
  uri: string;
  title: string;
  fileName: string;
  sourceKind: "local-file" | "remote-url" | "blob";
  documentType: string;
  originModule: string;
  source: string;
  entityId: string;
};

const PDF_DATA_URI_PREFIX = "data:application/pdf;base64,";

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

export async function buildGeneratedPdfViewerRouteParams(
  input: GeneratedPdfViewerRouteInput,
): Promise<GeneratedPdfViewerRouteParams> {
  const originalUri = String(input.uri || "").trim();
  if (!originalUri) throw new Error("Generated PDF URI is empty.");
  const fileName = normalizePdfFileName(input.fileName, "generated-pdf");
  const uri =
    Platform.OS === "web"
      ? originalUri
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
