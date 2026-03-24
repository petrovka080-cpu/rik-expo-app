import { createPdfSource, type PdfSource } from "../pdfFileContract";

export type PdfDocumentType =
  | "request"
  | "proposal"
  | "payment_order"
  | "director_report"
  | "report_export"
  | "supplier_summary"
  | "warehouse_register"
  | "warehouse_materials"
  | "warehouse_document"
  | "contractor_act"
  | "attachment_pdf";

export type PdfOriginModule =
  | "foreman"
  | "buyer"
  | "accountant"
  | "director"
  | "warehouse"
  | "contractor"
  | "reports";

export type DocumentDescriptor = {
  uri: string;
  fileSource: PdfSource;
  fileName: string;
  title: string;
  mimeType: "application/pdf";
  documentType: PdfDocumentType;
  source: "generated" | "attachment";
  originModule: PdfOriginModule;
  createdAt?: string;
  entityId?: string;
};

export type PdfViewerRouteParams = {
  sessionId: string;
};

type CreatePdfDocumentDescriptorArgs = {
  uri: string;
  title: string;
  fileName?: string | null;
  documentType: PdfDocumentType;
  source: "generated" | "attachment";
  originModule: PdfOriginModule;
  createdAt?: string;
  entityId?: string | number | null;
};

const DOC_LABELS: Record<PdfDocumentType, string> = {
  request: "request",
  proposal: "proposal",
  payment_order: "payment_order",
  director_report: "director_report",
  report_export: "report_export",
  supplier_summary: "supplier_summary",
  warehouse_register: "warehouse_register",
  warehouse_materials: "warehouse_materials",
  warehouse_document: "warehouse_document",
  contractor_act: "contractor_act",
  attachment_pdf: "attachment",
};

export function normalizePdfFileName(input?: string | null, fallback = "document"): string {
  const base = String(input || "").trim() || fallback;
  const sanitized = base
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const out = sanitized || fallback;
  return out.toLowerCase().endsWith(".pdf") ? out : `${out}.pdf`;
}

export function buildPdfFileName(args: {
  documentType: PdfDocumentType;
  title?: string | null;
  entityId?: string | number | null;
  dateIso?: string | null;
}): string {
  const typeLabel = DOC_LABELS[args.documentType] || "document";
  const titlePart = String(args.title || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const entityPart = String(args.entityId ?? "").trim().replace(/[^a-zA-Z0-9_-]+/g, "_");
  const datePart = String(args.dateIso || "").trim().slice(0, 10);
  const stem = [typeLabel, titlePart, datePart, entityPart].filter(Boolean).join("_");
  return normalizePdfFileName(stem, typeLabel);
}

export function createPdfDocumentDescriptor(
  args: CreatePdfDocumentDescriptorArgs,
): DocumentDescriptor {
  const fileSource = createPdfSource(args.uri);
  const uri = fileSource.uri;

  const title = String(args.title || "").trim() || DOC_LABELS[args.documentType];
  const createdAt = args.createdAt || new Date().toISOString();
  const fileName =
    normalizePdfFileName(
      args.fileName,
      buildPdfFileName({
        documentType: args.documentType,
        title,
        entityId: args.entityId,
        dateIso: createdAt,
      }),
    );

  return {
    uri,
    fileSource,
    fileName,
    title,
    mimeType: "application/pdf",
    documentType: args.documentType,
    source: args.source,
    originModule: args.originModule,
    createdAt,
    entityId: args.entityId == null ? undefined : String(args.entityId),
  };
}
