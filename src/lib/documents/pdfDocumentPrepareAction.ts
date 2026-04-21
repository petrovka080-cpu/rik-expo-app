import { Platform } from "react-native";

import { preparePdfExecutionSource } from "../pdfRunner";
import { beginPdfLifecycleObservation } from "../pdf/pdfLifecycle";
import { createPdfSource } from "../pdfFileContract";
import { redactSensitiveText } from "../security/redaction";
import {
  assertCanonicalRemotePdfSource,
  extractUriScheme,
} from "./pdfDocumentActionPreconditions";
import {
  getPdfDocumentActionErrorName,
  getPdfFlowErrorMessage,
  normalizePdfDocumentActionError,
} from "./pdfDocumentActionError";
import type { PreparePdfDocumentArgs } from "./pdfDocumentActionTypes";
import type { DocumentDescriptor } from "./pdfDocument";

export async function executePreparePdfDocument(
  args: PreparePdfDocumentArgs,
): Promise<DocumentDescriptor> {
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
      if (__DEV__) console.info("[pdf-document-actions] prepare_requested", {
        stage: "prepare_requested",
        platform: Platform.OS,
        documentType: args.descriptor.documentType,
        originModule: args.descriptor.originModule,
        sourceUri: args.descriptor.uri ? redactSensitiveText(args.descriptor.uri) : null,
        fileName: args.descriptor.fileName,
        busyKey: args.key ?? null,
      });
      const preparedSource = await preparePdfExecutionSource({
        supabase: args.supabase as Parameters<typeof preparePdfExecutionSource>[0]["supabase"],
        source:
          args.descriptor.fileSource ??
          (args.descriptor.uri
            ? createPdfSource(args.descriptor.uri)
            : undefined),
        resolveSource: args.resolveSource,
        getRemoteUrl: args.getRemoteUrl,
        fileName: args.descriptor.fileName,
      });
      assertCanonicalRemotePdfSource(args.descriptor, preparedSource);
      const uri = preparedSource.uri;
      if (__DEV__) console.info("[pdf-document-actions] prepare_ready", {
        stage: "prepare_ready",
        platform: Platform.OS,
        documentType: args.descriptor.documentType,
        originModule: args.descriptor.originModule,
        finalUri: redactSensitiveText(uri),
        finalScheme: extractUriScheme(uri),
        finalSourceKind: preparedSource.kind,
        fileName: args.descriptor.fileName,
      });
      observation.success({
        sourceKind: preparedSource.kind,
        extra: {
          uri,
        },
      });
      return { ...args.descriptor, uri, fileSource: preparedSource };
    } catch (error) {
      const lifecycleError = observation.error(error, {
        fallbackMessage: "PDF preparation failed",
      });
      const message = getPdfFlowErrorMessage(
        lifecycleError,
        "PDF preparation failed",
      );
      if (__DEV__) console.error("[pdf-document-actions] prepare_failed", {
        stage: "prepare_failed",
        platform: Platform.OS,
        documentType: args.descriptor.documentType,
        originModule: args.descriptor.originModule,
        fileName: args.descriptor.fileName,
        errorName: getPdfDocumentActionErrorName(error),
        errorMessage: redactSensitiveText(message),
      });
      throw normalizePdfDocumentActionError(
        lifecycleError,
        "PDF preparation failed",
      );
    }
  };

  if (args.busy?.run) {
    const out = await args.busy.run(run, {
      key: args.key,
      label: args.label,
      minMs: 200,
    });
    if (!out) throw new Error("PDF preparation cancelled");
    return out;
  }

  return await run();
}
