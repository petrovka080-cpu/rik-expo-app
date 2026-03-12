import { createPdfDocumentDescriptor, type DocumentDescriptor } from "./pdfDocument";

export async function generateRequestPdfDocument(args: {
  requestId: string | number;
  fileName?: string;
  title?: string;
  originModule: DocumentDescriptor["originModule"];
}): Promise<DocumentDescriptor> {
  const mod = await import("../api/pdf_request");
  const requestId = String(args.requestId);
  const uri = await mod.exportRequestPdf(requestId);
  return createPdfDocumentDescriptor({
    uri,
    title: args.title || `Request ${requestId}`,
    fileName: args.fileName,
    documentType: "request",
    source: "generated",
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
  const uri = await mod.exportProposalPdf(proposalId, "preview");
  return createPdfDocumentDescriptor({
    uri,
    title: args.title || `Proposal ${proposalId}`,
    fileName: args.fileName,
    documentType: "proposal",
    source: "generated",
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
  const paymentId = String(args.paymentId);
  const uri = await mod.exportPaymentOrderPdf(Number(paymentId), args.draft);
  return createPdfDocumentDescriptor({
    uri,
    title: args.title || `Payment Order ${paymentId}`,
    fileName: args.fileName,
    documentType: "payment_order",
    source: "generated",
    originModule: args.originModule,
    entityId: paymentId,
  });
}

export async function createGeneratedPdfDocument(args: {
  uri: string;
  title: string;
  fileName?: string;
  documentType: DocumentDescriptor["documentType"];
  originModule: DocumentDescriptor["originModule"];
  entityId?: string | number;
}): Promise<DocumentDescriptor> {
  return createPdfDocumentDescriptor({
    uri: args.uri,
    title: args.title,
    fileName: args.fileName,
    documentType: args.documentType,
    source: "generated",
    originModule: args.originModule,
    entityId: args.entityId,
  });
}

export async function generateDirectorPdfDocument(args: {
  getUri: () => Promise<string>;
  title: string;
  fileName?: string;
  documentType: "director_report" | "supplier_summary";
  entityId?: string | number;
}): Promise<DocumentDescriptor> {
  const uri = await args.getUri();
  return await createGeneratedPdfDocument({
    uri,
    title: args.title,
    fileName: args.fileName,
    documentType: args.documentType,
    originModule: "director",
    entityId: args.entityId,
  });
}

export async function generateWarehousePdfDocument(args: {
  getUri: () => Promise<string>;
  title: string;
  fileName?: string;
  documentType: "warehouse_register" | "warehouse_materials" | "warehouse_document";
  entityId?: string | number;
}): Promise<DocumentDescriptor> {
  const uri = await args.getUri();
  return await createGeneratedPdfDocument({
    uri,
    title: args.title,
    fileName: args.fileName,
    documentType: args.documentType,
    originModule: "warehouse",
    entityId: args.entityId,
  });
}
