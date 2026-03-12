import { Platform } from "react-native";
import type { DocumentDescriptor } from "./pdfDocument";
import { createDocumentPreviewSession } from "./pdfDocumentSessions";
import {
  openPdfExternal,
  openPdfPreview,
  openPdfShare,
  preparePdfLocalUri,
  type BusyLike,
} from "../pdfRunner";

type PreparePdfDocumentArgs = {
  busy?: BusyLike;
  supabase: any;
  key?: string;
  label?: string;
  descriptor: Omit<DocumentDescriptor, "uri"> & { uri?: string };
  getRemoteUrl: () => Promise<string> | string;
};

export async function preparePdfDocument(args: PreparePdfDocumentArgs): Promise<DocumentDescriptor> {
  const run = async () => {
    const uri = await preparePdfLocalUri({
      supabase: args.supabase,
      getRemoteUrl: args.getRemoteUrl,
      fileName: args.descriptor.fileName,
    });
    return { ...args.descriptor, uri };
  };

  if (args.busy?.run) {
    const out = await args.busy.run(run, {
      key: args.key,
      label: args.label,
      minMs: 650,
    });
    if (!out) throw new Error("PDF preparation cancelled");
    return out;
  }

  return await run();
}

export async function previewPdfDocument(
  doc: DocumentDescriptor,
  opts?: {
    router?: { push: (href: { pathname: string; params: Record<string, string> }) => void };
  },
): Promise<void> {
  const scheme = String(doc.uri || "").match(/^([a-z0-9+.-]+):/i)?.[1]?.toLowerCase() || "";
  console.info("[pdf-document-actions] preview", {
    stage: "preview_requested",
    platform: Platform.OS,
    documentType: doc.documentType,
    originModule: doc.originModule,
    scheme,
    uri: doc.uri,
    fileName: doc.fileName,
  });
  const { session, asset } = await createDocumentPreviewSession(doc);
  console.info("[pdf-document-actions] preview_asset", {
    stage: "preview_asset_ready",
    sessionId: session.sessionId,
    documentType: asset.documentType,
    originModule: asset.originModule,
    uri: asset.uri,
    scheme: String(asset.uri || "").match(/^([a-z0-9+.-]+):/i)?.[1]?.toLowerCase() || "",
    fileName: asset.fileName,
    exists: typeof asset.sizeBytes === "number" ? true : undefined,
    sizeBytes: asset.sizeBytes,
  });
  if (opts?.router) {
    console.info("[pdf-document-actions] about_to_navigate_to_viewer", {
      sessionId: session.sessionId,
      documentType: asset.documentType,
      originModule: asset.originModule,
      finalUri: asset.uri,
      finalScheme: String(asset.uri || "").match(/^([a-z0-9+.-]+):/i)?.[1]?.toLowerCase() || "",
      isLocalFile: /^file:\/\//i.test(String(asset.uri || "")),
      fileName: asset.fileName,
    });
    try {
      opts.router.push({
        pathname: "/pdf-viewer",
        params: { sessionId: session.sessionId },
      });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[pdf-document-actions] preview_navigation_failed", {
        sessionId: session.sessionId,
        documentType: asset.documentType,
        originModule: asset.originModule,
        error: message,
      });
      throw error;
    }
  }
  console.warn("[pdf-document-actions] preview_without_router_fallback", {
    documentType: asset.documentType,
    originModule: asset.originModule,
    finalUri: asset.uri,
  });
  await openPdfPreview(asset.uri);
}

export async function sharePdfDocument(doc: DocumentDescriptor): Promise<void> {
  await openPdfShare(doc.uri);
}

export async function openPdfDocumentExternal(doc: DocumentDescriptor): Promise<void> {
  await openPdfExternal(doc.uri);
}
