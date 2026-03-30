import type { Href } from "expo-router";
import { Platform } from "react-native";
import type { DocumentDescriptor } from "./pdfDocument";
import { createDocumentPreviewSession } from "./pdfDocumentSessions";
import {
  openPdfExternal,
  openPdfPreview,
  openPdfShare,
  preparePdfExecutionSource,
  type BusyLike,
} from "../pdfRunner";
import { beginPdfLifecycleObservation } from "../pdf/pdfLifecycle";
import { createPdfSource, type PdfSource } from "../pdfFileContract";

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
  resolveSource?: () => Promise<PdfSource> | PdfSource;
  getRemoteUrl?: () => Promise<string> | string;
};

export type PdfViewerRouterLike = {
  push: (href: Href, options?: unknown) => void;
};

export async function preparePdfDocument(args: PreparePdfDocumentArgs): Promise<DocumentDescriptor> {
  const run = async () => {
    const observation = beginPdfLifecycleObservation({
      screen: "reports",
      surface: "pdf_document_actions",
      event: "pdf_output_prepare",
      stage: "output_prepare",
      sourceKind: "pdf:document",
      context: {
        documentFamily: args.descriptor.documentType,
        documentType: args.descriptor.documentType,
        originModule: args.descriptor.originModule,
        entityId: args.descriptor.entityId ?? null,
        fileName: args.descriptor.fileName,
        source: args.descriptor.uri ?? args.descriptor.fileSource?.uri ?? null,
      },
    });
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
      const preparedSource = await preparePdfExecutionSource({
        supabase: args.supabase,
        source:
          args.descriptor.fileSource ??
          (args.descriptor.uri ? createPdfSource(args.descriptor.uri) : undefined),
        resolveSource: args.resolveSource,
        getRemoteUrl: args.getRemoteUrl,
        fileName: args.descriptor.fileName,
      });
      const uri = preparedSource.uri;
      console.info("[pdf-document-actions] prepare_ready", {
        stage: "prepare_ready",
        platform: Platform.OS,
        documentType: args.descriptor.documentType,
        originModule: args.descriptor.originModule,
        finalUri: uri,
        finalScheme: String(uri || "").match(/^([a-z0-9+.-]+):/i)?.[1]?.toLowerCase() || "",
        finalSourceKind: preparedSource.kind,
        fileName: args.descriptor.fileName,
      });
      observation.success({
        sourceKind: preparedSource.kind,
        extra: {
          uri: uri,
        },
      });
      return { ...args.descriptor, uri, fileSource: preparedSource };
    } catch (error) {
      const lifecycleError = observation.error(error, {
        fallbackMessage: "PDF preparation failed",
      });
      const message = getPdfFlowErrorMessage(lifecycleError, "PDF preparation failed");
      console.error("[pdf-document-actions] prepare_failed", {
        stage: "prepare_failed",
        platform: Platform.OS,
        documentType: args.descriptor.documentType,
        originModule: args.descriptor.originModule,
        fileName: args.descriptor.fileName,
        errorName: error && typeof error === "object" && "name" in error ? String((error as { name?: unknown }).name || "") : "",
        errorMessage: message,
      });
      throw lifecycleError instanceof Error ? lifecycleError : new Error(message);
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
    router?: PdfViewerRouterLike;
  },
): Promise<void> {
  const outputObservation = beginPdfLifecycleObservation({
    screen: "reports",
    surface: "pdf_document_actions",
    event: "pdf_preview_output_prepare",
    stage: "output_prepare",
    sourceKind: doc.fileSource.kind,
    context: {
      documentFamily: doc.documentType,
      documentType: doc.documentType,
      originModule: doc.originModule,
      entityId: doc.entityId ?? null,
      fileName: doc.fileName,
      source: doc.uri,
    },
  });
  const openObservation = beginPdfLifecycleObservation({
    screen: "reports",
    surface: "pdf_document_actions",
    event: "pdf_preview_open",
    stage: "open_view",
    sourceKind: doc.fileSource.kind,
    context: {
      documentFamily: doc.documentType,
      documentType: doc.documentType,
      originModule: doc.originModule,
      entityId: doc.entityId ?? null,
      fileName: doc.fileName,
      source: doc.uri,
    },
  });
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
    const { session, asset } = await (async () => {
      try {
        return await createDocumentPreviewSession(doc);
      } catch (error) {
        throw outputObservation.error(error, {
          fallbackMessage: "PDF preview asset preparation failed",
        });
      }
    })();
    outputObservation.success({
      sourceKind: asset.sourceKind,
      extra: {
        sessionId: session.sessionId,
        assetId: asset.assetId,
      },
    });
    console.info("[pdf-document-actions] preview_asset", {
      stage: "preview_asset_ready",
      sessionId: session.sessionId,
      documentType: asset.documentType,
      originModule: asset.originModule,
      sourceKind: asset.sourceKind,
      uri: asset.uri,
      scheme: String(asset.uri || "").match(/^([a-z0-9+.-]+):/i)?.[1]?.toLowerCase() || "",
      fileName: asset.fileName,
      exists: typeof asset.sizeBytes === "number" ? true : undefined,
      sizeBytes: asset.sizeBytes,
    });
    if (opts?.router) {
      const viewerHref: Href = {
        pathname: "/pdf-viewer",
        params: { sessionId: session.sessionId },
      };
      console.info("[pdf-document-actions] about_to_navigate_to_viewer", {
        sessionId: session.sessionId,
        documentType: asset.documentType,
        originModule: asset.originModule,
        finalUri: asset.uri,
        finalScheme: String(asset.uri || "").match(/^([a-z0-9+.-]+):/i)?.[1]?.toLowerCase() || "",
        finalSourceKind: asset.sourceKind,
        isLocalFile: /^file:\/\//i.test(String(asset.uri || "")),
        fileName: asset.fileName,
      });
      try {
        opts.router.push(viewerHref);
        openObservation.success({
          sourceKind: asset.sourceKind,
          extra: {
            route: "/pdf-viewer",
            sessionId: session.sessionId,
          },
        });
        return;
      } catch (error) {
        const lifecycleError = openObservation.error(error, {
          fallbackMessage: "Viewer navigation failed",
          extra: {
            sessionId: session.sessionId,
          },
        });
        const message = getPdfFlowErrorMessage(lifecycleError, "Viewer navigation failed");
        console.error("[pdf-document-actions] preview_navigation_failed", {
          stage: "navigation_failed",
          sessionId: session.sessionId,
          documentType: asset.documentType,
          originModule: asset.originModule,
          errorName: error && typeof error === "object" && "name" in error ? String((error as { name?: unknown }).name || "") : "",
          errorMessage: message,
        });
        throw lifecycleError instanceof Error ? lifecycleError : new Error(message);
      }
    }
    console.warn("[pdf-document-actions] preview_without_router_fallback", {
      documentType: asset.documentType,
      originModule: asset.originModule,
      finalUri: asset.uri,
    });
    try {
      await openPdfPreview(asset.uri);
      openObservation.success({
        sourceKind: asset.sourceKind,
        extra: {
          openStrategy: "direct_preview",
        },
      });
    } catch (error) {
      throw openObservation.error(error, {
        fallbackMessage: "PDF preview open failed",
        extra: {
          openStrategy: "direct_preview",
        },
      });
    }
  } catch (error) {
    const lifecycleError = error;
    const message = getPdfFlowErrorMessage(lifecycleError, "PDF preview failed");
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
    throw lifecycleError instanceof Error ? lifecycleError : new Error(message);
  }
}

export async function sharePdfDocument(doc: DocumentDescriptor): Promise<void> {
  const observation = beginPdfLifecycleObservation({
    screen: "reports",
    surface: "pdf_document_actions",
    event: "pdf_share_open",
    stage: "open_view",
    sourceKind: doc.fileSource.kind,
    context: {
      documentFamily: doc.documentType,
      documentType: doc.documentType,
      originModule: doc.originModule,
      entityId: doc.entityId ?? null,
      fileName: doc.fileName,
      source: doc.uri,
    },
  });
  try {
    await openPdfShare(doc.fileSource.uri, doc.fileName);
    observation.success({
      extra: {
        openStrategy: "share_sheet",
      },
    });
  } catch (error) {
    throw observation.error(error, {
      fallbackMessage: "PDF share failed",
      extra: {
        openStrategy: "share_sheet",
      },
    });
  }
}

export async function openPdfDocumentExternal(doc: DocumentDescriptor): Promise<void> {
  const observation = beginPdfLifecycleObservation({
    screen: "reports",
    surface: "pdf_document_actions",
    event: "pdf_external_open",
    stage: "open_view",
    sourceKind: doc.fileSource.kind,
    context: {
      documentFamily: doc.documentType,
      documentType: doc.documentType,
      originModule: doc.originModule,
      entityId: doc.entityId ?? null,
      fileName: doc.fileName,
      source: doc.uri,
    },
  });
  try {
    await openPdfExternal(doc.fileSource.uri, doc.fileName);
    observation.success({
      extra: {
        openStrategy: "external",
      },
    });
  } catch (error) {
    throw observation.error(error, {
      fallbackMessage: "PDF external open failed",
      extra: {
        openStrategy: "external",
      },
    });
  }
}
