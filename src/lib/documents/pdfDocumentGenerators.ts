import type { DocumentDescriptor } from "./pdfDocument";
import {
  buildGeneratedPdfDescriptor,
  createGeneratedPdfDescriptor,
} from "../pdf/pdf.runner";
import type { PdfSource } from "../pdfFileContract";

export async function generateRequestPdfDocument(args: {
  requestId: string | number;
  fileName?: string;
  title?: string;
  originModule: DocumentDescriptor["originModule"];
}): Promise<DocumentDescriptor> {
  const mod = await import("../api/pdf_request");
  const requestId = String(args.requestId);
  return buildGeneratedPdfDescriptor({
    getUri: () => mod.exportRequestPdf(requestId),
    title: args.title || `Request ${requestId}`,
    fileName: args.fileName,
    documentType: "request",
    originModule: args.originModule,
    entityId: requestId,
  });
}

export async function generateProposalPdfDocument(args: {
  proposalId: string | number;
  fileName?: string;
  title?: string;
  originModule: DocumentDescriptor["originModule"];
}): Promise<DocumentDescriptor> {
  const mod = await import("../api/pdf_proposal");
  const proposalId = String(args.proposalId);
  return buildGeneratedPdfDescriptor({
    getUri: () => mod.exportProposalPdf(proposalId, "preview"),
    title: args.title || `Proposal ${proposalId}`,
    fileName: args.fileName,
    documentType: "proposal",
    originModule: args.originModule,
    entityId: proposalId,
  });
}

export async function generatePaymentOrderPdfDocument(args: {
  paymentId: string | number;
  fileName?: string;
  title?: string;
  draft?: any;
  originModule: DocumentDescriptor["originModule"];
}): Promise<DocumentDescriptor> {
  const mod = await import("../api/pdf_payment");
  const service = await import("../api/paymentPdf.service");
  const paymentId = Number(args.paymentId);
  const prepared = await service.preparePaymentOrderPdf({
    paymentId,
    draft: args.draft,
    title: args.title,
    fileName: args.fileName,
  });
  return buildGeneratedPdfDescriptor({
    getUri: () => mod.exportPaymentOrderPdfContract(prepared.contract),
    title: prepared.contract.title,
    fileName: prepared.contract.fileName,
    documentType: prepared.contract.documentType,
    originModule: args.originModule,
    entityId: prepared.contract.entityId,
  });
}

export async function createGeneratedPdfDocument(args: {
  uri?: string;
  fileSource?: PdfSource;
  title: string;
  fileName?: string;
  documentType: DocumentDescriptor["documentType"];
  originModule: DocumentDescriptor["originModule"];
  entityId?: string | number;
}): Promise<DocumentDescriptor> {
  return createGeneratedPdfDescriptor({
    uri: args.uri,
    fileSource: args.fileSource,
    title: args.title,
    fileName: args.fileName,
    documentType: args.documentType,
    originModule: args.originModule,
    entityId: args.entityId,
  });
}

export async function generateDirectorPdfDocument(args: {
  getSource?: () => Promise<PdfSource>;
  getUri?: () => Promise<string>;
  title: string;
  fileName?: string;
  documentType: "director_report" | "supplier_summary";
  entityId?: string | number;
}): Promise<DocumentDescriptor> {
  return buildGeneratedPdfDescriptor({
    getSource: args.getSource,
    getUri: args.getUri,
    title: args.title,
    fileName: args.fileName,
    documentType: args.documentType,
    originModule: "director",
    entityId: args.entityId,
  });
}

export async function generateWarehousePdfDocument(args: {
  getSource?: () => Promise<PdfSource>;
  getUri?: () => Promise<string>;
  title: string;
  fileName?: string;
  documentType: "warehouse_register" | "warehouse_materials" | "warehouse_document";
  entityId?: string | number;
}): Promise<DocumentDescriptor> {
  return buildGeneratedPdfDescriptor({
    getSource: args.getSource,
    getUri: args.getUri,
    title: args.title,
    fileName: args.fileName,
    documentType: args.documentType,
    originModule: "warehouse",
    entityId: args.entityId,
  });
}
