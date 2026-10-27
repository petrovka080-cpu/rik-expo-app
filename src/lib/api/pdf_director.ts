// src/lib/api/pdf_director.ts
import { normalizeRuTextForHtml } from "../text/encoding";
import { recordPlatformObservability } from "../observability/platformObservability";
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
import {
  buildDirectorFinanceManagementManifestContract,
  type DirectorFinanceManagementManifestContract,
} from "../pdf/directorPdfPlatformContract";

const buildDirectorPdf = (
  html: string,
  args: {
    documentKind: DirectorPdfRenderDocumentKind;
    documentType: "director_report" | "supplier_summary";
    source: string;
    sourceBranch?: string | null;
    sourceFallbackReason?: string | null;
    financeManagementManifest?: DirectorFinanceManagementManifestContract | null;
  },
) =>
  renderDirectorPdf({
    documentKind: args.documentKind,
    documentType: args.documentType,
    source: args.source,
    sourceBranch: args.sourceBranch,
    sourceFallbackReason: args.sourceFallbackReason,
    financeManagementManifest: args.financeManagementManifest ?? null,
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
  p: DirectorSupplierSummaryPdfInput,
): Promise<string> {
  const t0 = Date.now();
  const source = await getDirectorFinancePdfSource({
    periodFrom: p.periodFrom,
    periodTo: p.periodTo,
  });
  const tSource = Date.now();
  const model = buildDirectorSupplierSummaryPdfModel({
    ...p,
    financeRows: source.financeRows,
    spendRows: source.spendRows,
  });
  const html = renderDirectorSupplierSummaryPdfHtml(model);
  const tModel = Date.now();
  const result = await buildDirectorPdf(
    html,
    {
      documentKind: "supplier_summary",
      documentType: "supplier_summary",
      source: source.source,
      sourceBranch: source.branchMeta.sourceBranch,
      sourceFallbackReason: source.branchMeta.fallbackReason ?? null,
    },
  );
  const tEnd = Date.now();
  // D-BACKEND-PDF: per-segment timing
  recordPlatformObservability({
    screen: "director",
    surface: "director_pdf_backend",
    category: "fetch",
    event: "supplier_summary_pdf_timing",
    result: "success",
    durationMs: tEnd - t0,
    sourceKind: source.source,
    extra: {
      sourceMs: tSource - t0,
      modelBuildMs: tModel - tSource,
      renderMs: tEnd - tModel,
      totalMs: tEnd - t0,
      htmlLength: html.length,
    },
  });
  return result;
}

export async function exportDirectorManagementReportPdf(
  p: DirectorManagementReportPdfInput,
): Promise<string> {
  const t0 = Date.now();
  const source = await getDirectorFinancePdfSource({
    periodFrom: p.periodFrom,
    periodTo: p.periodTo,
    dueDaysDefault: p.dueDaysDefault,
    criticalDays: p.criticalDays,
  });
  const tSource = Date.now();
  const model = buildDirectorManagementReportPdfModel({
    ...p,
    financeRows: source.financeRows,
    spendRows: source.spendRows,
  });
  const manifest = await buildDirectorFinanceManagementManifestContract({
    periodFrom: p.periodFrom,
    periodTo: p.periodTo,
    topN: p.topN,
    dueDaysDefault: p.dueDaysDefault,
    criticalDays: p.criticalDays,
    financeRows: source.financeRows,
    spendRows: source.spendRows,
    sourceKind: source.source,
  });
  const html = renderDirectorManagementReportPdfHtml(model);
  const tModel = Date.now();
  const result = await buildDirectorPdf(
    html,
    {
      documentKind: "management_report",
      documentType: "director_report",
      source: source.source,
      sourceBranch: source.branchMeta.sourceBranch,
      sourceFallbackReason: source.branchMeta.fallbackReason ?? null,
      financeManagementManifest: manifest,
    },
  );
  const tEnd = Date.now();
  // D-BACKEND-PDF: per-segment timing
  recordPlatformObservability({
    screen: "director",
    surface: "director_pdf_backend",
    category: "fetch",
    event: "management_report_pdf_timing",
    result: "success",
    durationMs: tEnd - t0,
    sourceKind: source.source,
    extra: {
      sourceMs: tSource - t0,
      modelBuildMs: tModel - tSource,
      renderMs: tEnd - tModel,
      totalMs: tEnd - t0,
      htmlLength: html.length,
      financeRows: source.financeRows.length,
      spendRows: source.spendRows.length,
      sourceVersion: manifest.sourceVersion,
      artifactVersion: manifest.artifactVersion,
    },
  });
  return result;
}

export async function exportDirectorProductionReportPdf(
  p: DirectorProductionPdfInput,
): Promise<string> {
  const t0 = Date.now();
  const source = await getDirectorProductionPdfSource({
    periodFrom: p.periodFrom,
    periodTo: p.periodTo,
    objectName: p.objectName,
    fallbackRepData: p.repData,
    fallbackRepDiscipline: p.repDiscipline,
    preferPriceStage: p.preferPriceStage,
  });
  const tSource = Date.now();
  const model = buildDirectorProductionReportPdfModel({
    ...p,
    repData: source.repData,
    repDiscipline: source.repDiscipline,
  });
  const html = renderDirectorProductionReportPdfHtml(model);
  const tModel = Date.now();
  const result = await buildDirectorPdf(
    html,
    {
      documentKind: "production_report",
      documentType: "director_report",
      source: source.source,
      sourceBranch: source.branchMeta.sourceBranch,
      sourceFallbackReason: source.branchMeta.fallbackReason ?? null,
    },
  );
  const tEnd = Date.now();
  // D-BACKEND-PDF: per-segment timing
  recordPlatformObservability({
    screen: "director",
    surface: "director_pdf_backend",
    category: "fetch",
    event: "production_report_pdf_timing",
    result: "success",
    durationMs: tEnd - t0,
    sourceKind: source.source,
    extra: {
      sourceMs: tSource - t0,
      modelBuildMs: tModel - tSource,
      renderMs: tEnd - tModel,
      totalMs: tEnd - t0,
      htmlLength: html.length,
    },
  });
  return result;
}

export async function exportDirectorSubcontractReportPdf(
  p: DirectorSubcontractPdfInput,
): Promise<string> {
  const t0 = Date.now();
  const source = await getDirectorSubcontractPdfSource({
    periodFrom: p.periodFrom,
    periodTo: p.periodTo,
    objectName: p.objectName,
  });
  const tSource = Date.now();
  const model = buildDirectorSubcontractReportPdfModel(p, source.rows);
  const html = renderDirectorSubcontractReportPdfHtml(model);
  const tModel = Date.now();
  const result = await buildDirectorPdf(
    html,
    {
      documentKind: "subcontract_report",
      documentType: "director_report",
      source: source.source,
      sourceBranch: source.branchMeta.sourceBranch,
      sourceFallbackReason: source.branchMeta.fallbackReason ?? null,
    },
  );
  const tEnd = Date.now();
  // D-BACKEND-PDF: per-segment timing
  recordPlatformObservability({
    screen: "director",
    surface: "director_pdf_backend",
    category: "fetch",
    event: "subcontract_report_pdf_timing",
    result: "success",
    durationMs: tEnd - t0,
    sourceKind: source.source,
    extra: {
      sourceMs: tSource - t0,
      modelBuildMs: tModel - tSource,
      renderMs: tEnd - tModel,
      totalMs: tEnd - t0,
      htmlLength: html.length,
      subcontractRows: source.rows.length,
    },
  });
  return result;
}

export type {
  DirectorManagementReportPdfInput,
  DirectorProductionPdfInput,
  DirectorSubcontractPdfInput,
  DirectorSupplierSummaryPdfInput,
} from "../pdf/pdf.model";
