import type {
  PdfDocumentType,
  PdfOriginModule,
} from "../documents/pdfDocument";
import type {
  DirectorFinancePreviewPdfModel,
  DirectorManagementReportPdfInput,
  DirectorManagementReportPdfModel,
  DirectorProductionPdfInput,
  DirectorProductionReportPdfModel,
  DirectorSubcontractPdfInput,
  DirectorSubcontractReportPdfModel,
  DirectorSupplierSummaryPdfInput,
  DirectorSupplierSummaryPdfModel,
} from "../api/pdf_director.data";

export type PdfGeneratedBuildArgs = {
  title: string;
  fileName?: string | null;
  documentType: PdfDocumentType;
  originModule: PdfOriginModule;
  entityId?: string | number | null;
};

export type RequestPdfMetaField = {
  label: string;
  value: string;
};

export type RequestPdfRowModel = {
  name: string;
  uom: string;
  qtyText: string;
  status: string;
  note: string;
};

export type RequestPdfModel = {
  requestLabel: string;
  generatedAt: string;
  comment: string;
  foremanName: string;
  metaFields: RequestPdfMetaField[];
  rows: RequestPdfRowModel[];
};

export type ReportsExportPdfSectionModel = {
  title: string;
  columns: string[];
  rows: (string | number)[][];
};

export type ReportsExportPdfModel = {
  title: string;
  sections: ReportsExportPdfSectionModel[];
};

export type ProposalPdfMetaField = {
  label: string;
  value: string;
};

export type ProposalPdfSupplierModel = {
  name: string;
  metaLine: string;
};

export type ProposalPdfRowModel = {
  name: string;
  kind: string;
  qtyText: string;
  uom: string;
  appAndNote: string;
  supplier: string;
  priceText: string;
  amountText: string;
};

export type ProposalPdfModel = {
  proposalLabel: string;
  generatedAt: string;
  approvedAt: string;
  status: string;
  leftMetaFields: ProposalPdfMetaField[];
  rightMetaFields: ProposalPdfMetaField[];
  suppliers: ProposalPdfSupplierModel[];
  includeSupplier: boolean;
  rows: ProposalPdfRowModel[];
  totalText: string;
  buyerFio: string;
  serviceId: string;
};

export type {
  DirectorFinancePreviewPdfModel,
  DirectorManagementReportPdfInput,
  DirectorManagementReportPdfModel,
  DirectorProductionPdfInput,
  DirectorProductionReportPdfModel,
  DirectorSubcontractPdfInput,
  DirectorSubcontractReportPdfModel,
  DirectorSupplierSummaryPdfInput,
  DirectorSupplierSummaryPdfModel,
};
