import { openPdfShare } from "../pdfRunner";
import { beginPdfLifecycleObservation } from "../pdf/pdfLifecycle";
import { normalizePdfDocumentActionError } from "./pdfDocumentActionError";
import { resolvePdfDocumentActionKindPlan } from "./pdfDocumentActionPlan";
import type { DocumentDescriptor } from "./pdfDocument";

export async function executeSharePdfDocument(
  doc: DocumentDescriptor,
): Promise<void> {
  const actionPlan = resolvePdfDocumentActionKindPlan("share");
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
        actionKind: actionPlan.action,
      },
    });
  } catch (error) {
    throw normalizePdfDocumentActionError(
      observation.error(error, {
        fallbackMessage: "PDF share failed",
        extra: {
          openStrategy: "share_sheet",
          actionKind: actionPlan.action,
        },
      }),
      "PDF share failed",
    );
  }
}
