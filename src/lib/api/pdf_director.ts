// src/lib/api/pdf_director.ts
import { openHtmlAsPdfUniversal } from "./pdf";
import { normalizeRuTextForHtml } from "../text/encoding";
import {
  loadDirectorFinancePreviewPdfModel,
  loadDirectorSubcontractReportPdfModel,
  prepareDirectorManagementReportPdfModel,
  prepareDirectorProductionReportPdfModel,
  prepareDirectorSupplierSummaryPdfModel,
  type DirectorManagementReportPdfInput,
  type DirectorProductionPdfInput,
  type DirectorSubcontractPdfInput,
  type DirectorSupplierSummaryPdfInput,
} from "./pdf_director.data";
import {
  renderDirectorFinancePdfHtml,
  renderDirectorManagementReportPdfHtml,
  renderDirectorProductionReportPdfHtml,
  renderDirectorSubcontractReportPdfHtml,
  renderDirectorSupplierSummaryPdfHtml,
} from "./pdf_director.templates";

const buildDirectorPdf = (
  html: string,
  documentType: string,
  source: string,
) =>
  openHtmlAsPdfUniversal(
    normalizeRuTextForHtml(html, {
      documentType,
      source,
    }),
  );

export async function exportDirectorFinancePdf(): Promise<string> {
  const model = await loadDirectorFinancePreviewPdfModel();
  return buildDirectorPdf(
    renderDirectorFinancePdfHtml(model),
    "director_report",
    "director_finance",
  );
}

export async function exportDirectorSupplierSummaryPdf(
  p: DirectorSupplierSummaryPdfInput,
): Promise<string> {
  const model = prepareDirectorSupplierSummaryPdfModel(p);
  return buildDirectorPdf(
    renderDirectorSupplierSummaryPdfHtml(model),
    "supplier_summary",
    "director_supplier_summary",
  );
}

export async function exportDirectorManagementReportPdf(
  p: DirectorManagementReportPdfInput,
): Promise<string> {
  const model = prepareDirectorManagementReportPdfModel(p);
  return buildDirectorPdf(
    renderDirectorManagementReportPdfHtml(model),
    "director_report",
    "director_management",
  );
}

export async function exportDirectorProductionReportPdf(
  p: DirectorProductionPdfInput,
): Promise<string> {
  const model = prepareDirectorProductionReportPdfModel(p);
  return buildDirectorPdf(
    renderDirectorProductionReportPdfHtml(model),
    "director_report",
    "director_production",
  );
}

export async function exportDirectorSubcontractReportPdf(
  p: DirectorSubcontractPdfInput,
): Promise<string> {
  const model = await loadDirectorSubcontractReportPdfModel(p);
  return buildDirectorPdf(
    renderDirectorSubcontractReportPdfHtml(model),
    "director_report",
    "director_subcontract",
  );
}

export type {
  DirectorManagementReportPdfInput,
  DirectorProductionPdfInput,
  DirectorSubcontractPdfInput,
  DirectorSupplierSummaryPdfInput,
} from "./pdf_director.data";
