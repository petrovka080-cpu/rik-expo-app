// src/lib/api/pdf_director.ts
import { normalizeRuTextForHtml } from "../text/encoding";
import {
  buildDirectorFinancePreviewPdfModel,
  buildDirectorManagementReportPdfModel,
  buildDirectorProductionReportPdfModel,
  buildDirectorSubcontractReportPdfModel,
  buildDirectorSupplierSummaryPdfModel,
} from "../pdf/pdf.builder";
import type {
  DirectorManagementReportPdfInput,
  DirectorProductionPdfInput,
  DirectorSubcontractPdfInput,
  DirectorSupplierSummaryPdfInput,
} from "../pdf/pdf.model";
import {
  getDirectorFinancePdfSource,
  getDirectorProductionPdfSource,
  getDirectorSubcontractPdfSource,
} from "./directorPdfSource.service";
import {
  renderDirectorPdf,
  type DirectorPdfRenderDocumentKind,
} from "./directorPdfRender.service";
import {
  renderDirectorFinancePdfHtml,
  renderDirectorManagementReportPdfHtml,
  renderDirectorProductionReportPdfHtml,
  renderDirectorSubcontractReportPdfHtml,
  renderDirectorSupplierSummaryPdfHtml,
} from "../pdf/pdf.template";

const buildDirectorPdf = (
  html: string,
  args: {
    documentKind: DirectorPdfRenderDocumentKind;
    documentType: "director_report" | "supplier_summary";
    source: string;
    sourceBranch?: string | null;
    sourceFallbackReason?: string | null;
  },
) =>
  renderDirectorPdf({
    documentKind: args.documentKind,
    documentType: args.documentType,
    source: args.source,
    sourceBranch: args.sourceBranch,
    sourceFallbackReason: args.sourceFallbackReason,
    html: normalizeRuTextForHtml(html, {
      documentType: args.documentType,
      source: args.source,
    }),
  });

export async function exportDirectorFinancePdf(): Promise<string> {
  const model = await buildDirectorFinancePreviewPdfModel();
  return buildDirectorPdf(
    renderDirectorFinancePdfHtml(model),
    {
      documentKind: "finance_preview",
      documentType: "director_report",
      source: "director_finance",
      sourceBranch: "client_only",
    },
  );
}

export async function exportDirectorSupplierSummaryPdf(
  p: DirectorSupplierSummaryPdfInput & {
    loadFallbackRows?: (() => Promise<{
      financeRows: import("../../screens/director/director.finance").FinanceRow[];
      spendRows: import("../../screens/director/director.finance").FinSpendRow[];
    }>) | null;
  },
): Promise<string> {
  const source = await getDirectorFinancePdfSource({
    periodFrom: p.periodFrom,
    periodTo: p.periodTo,
    fallbackFinanceRows: p.financeRows,
    fallbackSpendRows: p.spendRows,
    fallbackRowsLoader: p.loadFallbackRows,
  });
  const model = buildDirectorSupplierSummaryPdfModel({
    ...p,
    financeRows: source.financeRows,
    spendRows: source.spendRows,
  });
  return buildDirectorPdf(
    renderDirectorSupplierSummaryPdfHtml(model),
    {
      documentKind: "supplier_summary",
      documentType: "supplier_summary",
      source: source.source,
      sourceBranch: source.branchMeta.sourceBranch,
      sourceFallbackReason: source.branchMeta.fallbackReason ?? null,
    },
  );
}

export async function exportDirectorManagementReportPdf(
  p: DirectorManagementReportPdfInput & {
    loadFallbackRows?: (() => Promise<{
      financeRows: import("../../screens/director/director.finance").FinanceRow[];
      spendRows: import("../../screens/director/director.finance").FinSpendRow[];
    }>) | null;
  },
): Promise<string> {
  const source = await getDirectorFinancePdfSource({
    periodFrom: p.periodFrom,
    periodTo: p.periodTo,
    dueDaysDefault: p.dueDaysDefault,
    criticalDays: p.criticalDays,
    fallbackFinanceRows: p.financeRows,
    fallbackSpendRows: p.spendRows,
    fallbackRowsLoader: p.loadFallbackRows,
  });
  const model = buildDirectorManagementReportPdfModel({
    ...p,
    financeRows: source.financeRows,
    spendRows: source.spendRows,
  });
  return buildDirectorPdf(
    renderDirectorManagementReportPdfHtml(model),
    {
      documentKind: "management_report",
      documentType: "director_report",
      source: source.source,
      sourceBranch: source.branchMeta.sourceBranch,
      sourceFallbackReason: source.branchMeta.fallbackReason ?? null,
    },
  );
}

export async function exportDirectorProductionReportPdf(
  p: DirectorProductionPdfInput,
): Promise<string> {
  const source = await getDirectorProductionPdfSource({
    periodFrom: p.periodFrom,
    periodTo: p.periodTo,
    objectName: p.objectName,
    fallbackRepData: p.repData,
    fallbackRepDiscipline: p.repDiscipline,
    preferPriceStage: p.preferPriceStage,
  });
  const model = buildDirectorProductionReportPdfModel({
    ...p,
    repData: source.repData,
    repDiscipline: source.repDiscipline,
  });
  return buildDirectorPdf(
    renderDirectorProductionReportPdfHtml(model),
    {
      documentKind: "production_report",
      documentType: "director_report",
      source: source.source,
      sourceBranch: source.branchMeta.sourceBranch,
      sourceFallbackReason: source.branchMeta.fallbackReason ?? null,
    },
  );
}

export async function exportDirectorSubcontractReportPdf(
  p: DirectorSubcontractPdfInput,
): Promise<string> {
  const source = await getDirectorSubcontractPdfSource({
    periodFrom: p.periodFrom,
    periodTo: p.periodTo,
    objectName: p.objectName,
  });
  const model = buildDirectorSubcontractReportPdfModel(p, source.rows);
  return buildDirectorPdf(
    renderDirectorSubcontractReportPdfHtml(model),
    {
      documentKind: "subcontract_report",
      documentType: "director_report",
      source: source.source,
      sourceBranch: source.branchMeta.sourceBranch,
      sourceFallbackReason: source.branchMeta.fallbackReason ?? null,
    },
  );
}

export type {
  DirectorManagementReportPdfInput,
  DirectorProductionPdfInput,
  DirectorSubcontractPdfInput,
  DirectorSupplierSummaryPdfInput,
} from "../pdf/pdf.model";
