import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import { createGeneratedPdfDocument } from "../../lib/documents/pdfDocumentGenerators";
import { generateForemanRequestPdfViaBackend } from "../../lib/api/foremanRequestPdfBackend.service";
import { buildForemanRequestClientSourceFingerprint } from "../../lib/pdf/foremanRequestPdf.shared";
import { getUriScheme } from "../../lib/pdfFileContract";

export async function buildForemanRequestPdfDescriptor(args: {
  requestId: string;
  generatedBy?: string | null;
  displayNo?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  objectName?: string | null;
  title?: string | null;
}) {
  const requestId = String(args.requestId ?? "").trim();
  if (!requestId) {
    throw new Error("Foreman request PDF requestId is required");
  }

  if (__DEV__) console.info("[foreman-pdf] history_descriptor_build_start", {
    requestId,
    generatedBy: args.generatedBy ?? null,
    displayNo: args.displayNo ?? null,
  });

  const backend = await generateForemanRequestPdfViaBackend({
    version: "v1",
    role: "foreman",
    documentType: "request",
    requestId,
    generatedBy: args.generatedBy ?? null,
    clientSourceFingerprint: buildForemanRequestClientSourceFingerprint({
      requestId,
      displayNo: args.displayNo ?? null,
      status: args.status ?? null,
      createdAt: args.createdAt ?? null,
      updatedAt: args.updatedAt ?? null,
      objectName: args.objectName ?? null,
    }),
  });

  const displayNo = String(args.displayNo ?? "").trim();
  const title =
    String(args.title ?? "").trim() ||
    (displayNo ? `Заявка ${displayNo}` : `Заявка ${requestId}`);

  const descriptor = await createGeneratedPdfDocument({
    fileSource: backend.source,
    title,
    fileName:
      backend.fileName ||
      buildPdfFileName({
        documentType: "request",
        title: displayNo || requestId,
        entityId: requestId,
      }),
    documentType: "request",
    originModule: "foreman",
    entityId: requestId,
  });

  if (__DEV__) console.info("[foreman-pdf] history_descriptor_ready", {
    requestId,
    sourceKind: descriptor.fileSource.kind,
    uriScheme: getUriScheme(descriptor.uri),
    uri: descriptor.uri,
    fileName: descriptor.fileName,
  });

  return descriptor;
}
