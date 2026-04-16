import { esc } from "../../api/pdf_director.format.ts";
import { joinHtml, renderDocumentShell, renderMuted } from "../pdf.director.sections.ts";

type DirectorFinancePreviewPdfModel = Record<string, any>;
const FINANCE_PREVIEW_STYLES = `
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;padding:16px;color:#111}
    h1{margin:0 0 10px 0}
    .muted{color:#64748b}
    pre{white-space:pre-wrap}
`;


const renderDirectorFinanceBody = (model: DirectorFinancePreviewPdfModel) =>
  joinHtml([
    `    <h1>Финансовый отчёт (директор)</h1>`,
    `    ${renderMuted("Черновая версия. Дальше оформим красиво.")}`,
    `    <pre>${esc(model.rowsJson)}</pre>`,
  ]);

export const renderDirectorFinancePdfHtml = (model: DirectorFinancePreviewPdfModel) =>
  renderDocumentShell({
    title: "Финансовый отчёт",
    styles: FINANCE_PREVIEW_STYLES,
    body: renderDirectorFinanceBody(model),
  });
