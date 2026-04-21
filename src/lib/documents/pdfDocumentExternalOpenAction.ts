import { openPdfExternal } from "../pdfRunner";
import { beginPdfLifecycleObservation } from "../pdf/pdfLifecycle";
import { normalizePdfDocumentActionError } from "./pdfDocumentActionError";
import { resolvePdfDocumentActionKindPlan } from "./pdfDocumentActionPlan";
import type { DocumentDescriptor } from "./pdfDocument";

export async function executeOpenPdfDocumentExternal(
  doc: DocumentDescriptor,
): Promise<void> {
  const actionPlan = resolvePdfDocumentActionKindPlan("external_open");
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
        actionKind: actionPlan.action,
      },
    });
  } catch (error) {
    throw normalizePdfDocumentActionError(
      observation.error(error, {
        fallbackMessage: "PDF external open failed",
        extra: {
          openStrategy: "external",
          actionKind: actionPlan.action,
        },
      }),
      "PDF external open failed",
    );
  }
}
