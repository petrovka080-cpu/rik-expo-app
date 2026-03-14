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

export function getPdfFlowErrorMessage(error: unknown, fallback = "Could not open PDF"): string {
  if (error && typeof error === "object") {
    const maybeMessage = "message" in error ? (error as { message?: unknown }).message : undefined;
    const text = typeof maybeMessage === "string" ? maybeMessage.trim() : "";
    if (text) return text;
  }
  const text = String(error ?? "").trim();
  return text && text !== "[object Object]" ? text : fallback;
}

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
    try {
      console.info("[pdf-document-actions] prepare_requested", {
        stage: "prepare_requested",
        platform: Platform.OS,
        documentType: args.descriptor.documentType,
        originModule: args.descriptor.originModule,
        sourceUri: args.descriptor.uri ?? null,
        fileName: args.descriptor.fileName,
        busyKey: args.key ?? null,
      });
      const uri = await preparePdfLocalUri({
        supabase: args.supabase,
        getRemoteUrl: args.getRemoteUrl,
        fileName: args.descriptor.fileName,
      });
      console.info("[pdf-document-actions] prepare_ready", {
        stage: "prepare_ready",
        platform: Platform.OS,
        documentType: args.descriptor.documentType,
        originModule: args.descriptor.originModule,
        finalUri: uri,
        finalScheme: String(uri || "").match(/^([a-z0-9+.-]+):/i)?.[1]?.toLowerCase() || "",
        fileName: args.descriptor.fileName,
      });
      return { ...args.descriptor, uri };
    } catch (error) {
      const message = getPdfFlowErrorMessage(error, "PDF preparation failed");
      console.error("[pdf-document-actions] prepare_failed", {
        stage: "prepare_failed",
        platform: Platform.OS,
        documentType: args.descriptor.documentType,
        originModule: args.descriptor.originModule,
        fileName: args.descriptor.fileName,
        errorName: error && typeof error === "object" && "name" in error ? String((error as { name?: unknown }).name || "") : "",
        errorMessage: message,
      });
      throw new Error(message);
    }
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
  try {
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
        const message = getPdfFlowErrorMessage(error, "Viewer navigation failed");
        console.error("[pdf-document-actions] preview_navigation_failed", {
          stage: "navigation_failed",
          sessionId: session.sessionId,
          documentType: asset.documentType,
          originModule: asset.originModule,
          errorName: error && typeof error === "object" && "name" in error ? String((error as { name?: unknown }).name || "") : "",
          errorMessage: message,
        });
        throw new Error(message);
      }
    }
    console.warn("[pdf-document-actions] preview_without_router_fallback", {
      documentType: asset.documentType,
      originModule: asset.originModule,
      finalUri: asset.uri,
    });
    await openPdfPreview(asset.uri);
  } catch (error) {
    const message = getPdfFlowErrorMessage(error, "PDF preview failed");
    console.error("[pdf-document-actions] preview_failed", {
      stage: "preview_failed",
      platform: Platform.OS,
      documentType: doc.documentType,
      originModule: doc.originModule,
      fileName: doc.fileName,
      uri: doc.uri,
      errorName: error && typeof error === "object" && "name" in error ? String((error as { name?: unknown }).name || "") : "",
      errorMessage: message,
    });
    throw new Error(message);
  }
}

export async function sharePdfDocument(doc: DocumentDescriptor): Promise<void> {
  await openPdfShare(doc.uri, doc.fileName);
}

export async function openPdfDocumentExternal(doc: DocumentDescriptor): Promise<void> {
  await openPdfExternal(doc.uri, doc.fileName);
}
