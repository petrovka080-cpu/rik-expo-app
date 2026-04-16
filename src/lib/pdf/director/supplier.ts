import { esc } from "../../api/pdf_director.format.ts";
import {
  renderDirectorSupplierSummaryPdfHtmlShared,
  type DirectorSupplierSummaryPdfModelShared,
} from "../directorSupplierSummary.shared.ts";
import {
  joinHtml,
  renderBox,
  renderDocumentShell,
  renderInlineKpiRow,
  renderLabelValueCell,
  renderMuted,
  renderPageFooter,
  renderTable,
  renderTag,
} from "../pdf.director.sections.ts";
import { formatMoney, formatMoneyKgs } from "./shared.ts";

type DirectorSupplierSummaryPdfModel = DirectorSupplierSummaryPdfModelShared;
const SUPPLIER_SUMMARY_STYLES = `
    @page { margin: 14mm 12mm 20mm 12mm; }

    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; color:#0f172a}
    h1{font-size:18px;margin:0 0 8px 0}
    .muted{color:#64748b}
    .box{border:1px solid #e5e7eb;border-radius:14px;padding:12px;margin:10px 0;background:#fff}
    .row{display:flex;gap:12px;flex-wrap:wrap}
    .cell{flex:1 1 220px}
    .lbl{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#64748b}
    .val{margin-top:4px;font-size:14px;font-weight:900}
    .kpi{display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding:10px 12px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px}

    table{width:100%;border-collapse:collapse;margin-top:10px;page-break-inside:auto}
    thead{display:table-header-group}
    tfoot{display:table-footer-group}
    tr{page-break-inside:avoid;page-break-after:auto}
    th,td{border:1px solid #e5e7eb;padding:8px 10px;vertical-align:top;font-size:13px}
    th{background:#f8fafc;font-weight:900}

    .tag{display:inline-block;padding:3px 8px;border-radius:999px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:900;font-size:11px}
    .tag.bad{background:#fffbeb;border-color:#fde68a}
    .tag.mid{background:#eef2ff;border-color:#c7d2fe}
    .tag.ok{background:#ecfdf5;border-color:#a7f3d0}

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


const renderSupplierSummaryMeta = (model: DirectorSupplierSummaryPdfModel) =>
  `<div class="muted">Поставщик: <b>${esc(model.supplier)}</b> • Период: <b>${esc(model.periodText)}</b>${model.kindFilter ? ` • Вид: <b>${esc(model.kindFilter)}</b>` : ""}</div>`;

const renderSupplierSummaryOverview = (model: DirectorSupplierSummaryPdfModel) =>
  renderBox(
    joinHtml([
      `<div class="row">
        ${renderLabelValueCell("Утверждено", formatMoneyKgs(model.totalApproved))}
        ${renderLabelValueCell("Оплачено", formatMoneyKgs(model.totalPaid))}
        ${renderLabelValueCell("Остаток", formatMoneyKgs(model.totalRest))}
      </div>`,
      renderInlineKpiRow("Счетов всего", esc(String(model.countAll))),
      renderInlineKpiRow("Не оплачено", esc(String(model.countUnpaid))),
      renderInlineKpiRow("Частично", esc(String(model.countPartial))),
      renderInlineKpiRow("Оплачено", esc(String(model.countPaid))),
    ]),
  );

const renderSupplierSummaryKinds = (model: DirectorSupplierSummaryPdfModel) =>
  renderBox(
    joinHtml([
      `<div class="lbl">Разрез по видам (allocation)</div>`,
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
        : renderMuted("Нет данных по видам (spendRows пустой или нет доступа).", "margin-top:8px"),
    ]),
  );

const renderSupplierSummaryDetails = (model: DirectorSupplierSummaryPdfModel) =>
  renderBox(
    joinHtml([
      `<div class="lbl">Детализация счетов</div>`,
      model.detailRows.length
        ? renderTable({
            headers: [
              { label: "Счёт" },
              { label: "Сумма" },
              { label: "Оплачено" },
              { label: "Остаток" },
              { label: "Статус" },
              { label: "Переплата" },
              { label: "Даты" },
            ],
            rowsHtml: model.detailRows
              .map(
                (row) => `<tr>
  <td>${esc(row.title)}</td>
  <td>${formatMoney(row.amount)}</td>
  <td>${formatMoney(row.paid)}</td>
  <td>${formatMoney(row.rest)}</td>
  <td>${renderTag(row.status, row.statusClassName)}</td>
  <td>${row.overpay > 0 ? formatMoney(row.overpay) : "—"}</td>
  <td>${esc(row.datesText)}</td>
</tr>`,
              )
              .join(""),
          })
        : renderMuted("Нет счетов по поставщику за период.", "margin-top:8px"),
    ]),
  );


export const renderDirectorSupplierSummaryPdfHtml = (model: DirectorSupplierSummaryPdfModel) =>
  renderDirectorSupplierSummaryPdfHtmlShared(model);

export const renderDirectorSupplierSummaryPdfHtmlLegacy = (model: DirectorSupplierSummaryPdfModel) =>
  renderDocumentShell({
    lang: "ru",
    title: "Сводка по поставщику",
    styles: SUPPLIER_SUMMARY_STYLES,
    body: joinHtml([
      `<h1>Сводка по поставщику</h1>`,
      renderSupplierSummaryMeta(model),
      renderSupplierSummaryOverview(model),
      renderSupplierSummaryKinds(model),
      renderSupplierSummaryDetails(model),
      renderPageFooter(),
    ]),
  });
