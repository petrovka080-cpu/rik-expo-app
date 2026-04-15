import { esc } from "../../api/pdf_director.format";
import type { DirectorManagementReportPdfModel } from "../../api/pdf_director.data";
import {
  joinHtml,
  renderBox,
  renderDocumentShell,
  renderLabelValueCell,
  renderMuted,
  renderPageFooter,
  renderTable,
  renderTag,
  renderTitledBoxSection,
} from "../pdf.director.sections";
import { formatMoneyKgs } from "./shared";
const MANAGEMENT_REPORT_STYLES = `
    @page { margin: 14mm 12mm 20mm 12mm; }

    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; color:#0f172a}
    h1{font-size:18px;margin:0 0 6px 0}
    h2{font-size:14px;margin:14px 0 6px 0}
    .muted{color:#64748b}
    .box{border:1px solid #e5e7eb;border-radius:14px;padding:12px;margin:10px 0;background:#fff}
    .row{display:flex;gap:12px;flex-wrap:wrap}
    .cell{flex:1 1 220px}
    .lbl{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#64748b}
    .val{margin-top:4px;font-size:14px;font-weight:900}

    table{width:100%;border-collapse:collapse;margin-top:10px;page-break-inside:auto}
    thead{display:table-header-group}
    tfoot{display:table-footer-group}
    tr{page-break-inside:avoid;page-break-after:auto}
    th,td{border:1px solid #e5e7eb;padding:8px 10px;vertical-align:top;font-size:13px}
    th{background:#f8fafc;font-weight:900}

    .tag{display:inline-block;padding:3px 8px;border-radius:999px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:900;font-size:11px}
    .bad{background:#fffbeb;border-color:#fde68a}
    .crit{background:#fef2f2;border-color:#fecaca}
    .ok{background:#ecfdf5;border-color:#a7f3d0}

    .page-footer{
      position:fixed;
      left:0; right:0;
      bottom:-12mm;
      text-align:center;
      color:#64748b;
      font-size:11px;
    }
    .page-footer:after{ content:"Стр. " counter(page); }
`;


const renderManagementSummary = (model: DirectorManagementReportPdfModel) =>
  renderBox(
    joinHtml([
      `<div class="row">
        ${renderLabelValueCell("Утверждено (allocation)", formatMoneyKgs(model.totalApproved))}
        ${renderLabelValueCell("Оплачено (allocation)", formatMoneyKgs(model.totalPaid))}
        ${renderLabelValueCell("Долг (по счетам)", formatMoneyKgs(model.totalDebt))}
        ${renderLabelValueCell("Просрочено", formatMoneyKgs(model.overdueSum))}
        ${renderLabelValueCell("Критично", formatMoneyKgs(model.criticalSum))}
        ${renderLabelValueCell("Переплата", model.totalOverpay > 0 ? formatMoneyKgs(model.totalOverpay) : "—")}
      </div>`,
      `<div class="muted" style="margin-top:8px">
      Быстро: ${model.top3Text ? `<b>${esc(model.top3Text)}</b>` : "ТОП-поставщики по долгу отсутствуют"}
      • Счета: не оплачено <b>${esc(String(model.unpaidCount))}</b>, частично <b>${esc(String(model.partialCount))}</b>, оплачено <b>${esc(String(model.paidCount))}</b>
    </div>`,
    ]),
  );

const renderManagementDebtSection = (model: DirectorManagementReportPdfModel) =>
  renderTitledBoxSection(
    `1) Обязательства и риски (ТОП ${model.topN} + Прочие)`,
    model.debtSupplierRows.length
      ? renderTable({
          headers: [
            { label: "Поставщик" },
            { label: "Долг" },
            { label: "Просрочено" },
            { label: "Критично" },
            { label: "Счетов" },
          ],
          rowsHtml: model.debtSupplierRows
            .map(
              (row) => `<tr>
                    <td>${esc(String(row.supplier || "—"))} ${row.showRisk ? renderTag(row.riskLabel, row.riskClassName) : ""}</td>
                    <td>${formatMoneyKgs(row.debt)}</td>
                    <td>${row.overdue > 0 ? formatMoneyKgs(row.overdue) : "—"}</td>
                    <td>${row.critical > 0 ? formatMoneyKgs(row.critical) : "—"}</td>
                    <td>${esc(String(Math.floor(row.invoices)))}</td>
                  </tr>`,
            )
            .join(""),
        })
      : renderMuted("Нет долгов/рисков за период."),
  );

const renderManagementKindsSection = (model: DirectorManagementReportPdfModel) =>
  renderTitledBoxSection(
    "2) Расходы по видам",
    model.kindRows.length
      ? renderTable({
          headers: [
            { label: "Вид" },
            { label: "Утверждено" },
            { label: "Оплачено" },
            { label: "Переплата" },
          ],
          rowsHtml: model.kindRows
            .map(
              (row) => `<tr>
                  <td>${esc(row.kind)}</td>
                  <td>${formatMoneyKgs(row.approved)}</td>
                  <td>${formatMoneyKgs(row.paid)}</td>
                  <td>${row.overpay > 0 ? formatMoneyKgs(row.overpay) : "—"}</td>
                </tr>`,
            )
            .join(""),
        })
      : renderMuted("Нет данных по расходам за период."),
  );

const renderManagementSpendSuppliersSection = (model: DirectorManagementReportPdfModel) =>
  renderTitledBoxSection(
    `3) ТОП поставщики по расходам (ТОП ${model.topN} + Прочие)`,
    model.spendSupplierRows.length
      ? renderTable({
          headers: [
            { label: "Поставщик" },
            { label: "Утверждено" },
            { label: "Оплачено" },
            { label: "Остаток" },
          ],
          rowsHtml: model.spendSupplierRows
            .map(
              (row) => `<tr>
                  <td>${esc(String(row.supplier || "—"))}</td>
                  <td>${formatMoneyKgs(row.approved)}</td>
                  <td>${formatMoneyKgs(row.paid)}</td>
                  <td>${row.rest > 0 ? formatMoneyKgs(row.rest) : "—"}</td>
                </tr>`,
            )
            .join(""),
        })
      : renderMuted("Нет данных по поставщикам за период."),
  );

const renderManagementProblemsSection = (model: DirectorManagementReportPdfModel) =>
  renderTitledBoxSection(
    "4) Проблемные счета (все поставщики, до 80 строк)",
    model.problemRows.length
      ? renderTable({
          headers: [
            { label: "Поставщик" },
            { label: "Документ" },
            { label: "Сумма" },
            { label: "Оплачено" },
            { label: "Остаток" },
            { label: "Риск" },
            { label: "Даты" },
          ],
          rowsHtml: model.problemRows
            .map(
              (row) => `<tr>
                    <td>${esc(row.supplier)}</td>
                    <td>${esc(row.title)}</td>
                    <td>${formatMoneyKgs(row.amount)}</td>
                    <td>${formatMoneyKgs(row.paid)}</td>
                    <td>${formatMoneyKgs(row.rest)}</td>
                    <td>${renderTag(row.riskLabel, row.riskClassName)}</td>
                    <td>${esc(row.datesText)}</td>
                  </tr>`,
            )
            .join(""),
        })
      : renderMuted("Проблемных счетов нет (долг = 0)."),
  );


export const renderDirectorManagementReportPdfHtml = (model: DirectorManagementReportPdfModel) =>
  renderDocumentShell({
    lang: "ru",
    title: "Управленческий финансовый отчёт",
    styles: MANAGEMENT_REPORT_STYLES,
    body: joinHtml([
      `<h1>Финансовый управленческий отчёт (директор)</h1>`,
      `<div class="muted">Период: <b>${esc(model.periodText)}</b> • ТОП поставщиков: <b>${esc(String(model.topN))}</b></div>`,
      renderManagementSummary(model),
      renderManagementDebtSection(model),
      renderManagementKindsSection(model),
      renderManagementSpendSuppliersSection(model),
      renderManagementProblemsSection(model),
      renderPageFooter(),
    ]),
  });
