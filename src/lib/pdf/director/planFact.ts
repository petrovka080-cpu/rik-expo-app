import type { StockFinanceActualsView } from "../../../features/office/stockFinanceActuals";
import {
  formatStockFinanceMoney,
  formatStockFinanceQty,
} from "../../../features/office/stockFinanceActuals";
import { esc } from "../../api/pdf_director.format";
import {
  joinHtml,
  renderDocumentShell,
  renderPageFooter,
  renderTable,
} from "../pdf.director.sections";

const PLAN_FACT_STYLES = `
    @page { margin: 14mm 12mm 20mm 12mm; }
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:#0f172a}
    h1{font-size:18px;margin:0 0 6px 0}
    h2{font-size:14px;margin:14px 0 6px 0}
    .muted{color:#64748b}
    .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}
    .kpi{border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;background:#fff}
    .kpi .l{font-size:11px;color:#64748b}
    .kpi .v{font-size:14px;font-weight:900;margin-top:4px}
    table{width:100%;border-collapse:collapse;margin-top:10px;page-break-inside:auto}
    thead{display:table-header-group}
    tr{page-break-inside:avoid;page-break-after:auto}
    th,td{border:1px solid #e5e7eb;padding:7px 8px;vertical-align:top;font-size:12px}
    th{background:#f8fafc;font-weight:900}
    .bad{color:#b91c1c;font-weight:900}
    .good{color:#047857;font-weight:900}
    .page-footer{position:fixed;left:0;right:0;bottom:-12mm;text-align:center;color:#64748b;font-size:11px}
    .page-footer:after{content:"Стр. " counter(page)}
`;

const deviationClass = (value: number | null) =>
  value == null ? "" : value > 0 ? "bad" : value < 0 ? "good" : "";

const renderKpi = (label: string, value: string) =>
  `<div class="kpi"><div class="l">${esc(label)}</div><div class="v">${esc(value)}</div></div>`;

const renderRows = (view: StockFinanceActualsView) =>
  view.items
    .map((item) => {
      const planFact = item.planFact;
      const amountDeltaClass = deviationClass(planFact.amountDelta);
      const qtyDeltaClass = deviationClass(planFact.qtyDelta);
      return `<tr>
        <td>${esc(planFact.name)}</td>
        <td>${esc(planFact.unit)}</td>
        <td>${esc(formatStockFinanceQty(planFact.plannedQty))}</td>
        <td>${esc(formatStockFinanceQty(planFact.actualProcuredQty))}</td>
        <td>${esc(formatStockFinanceQty(planFact.actualReceivedQty))}</td>
        <td>${esc(formatStockFinanceQty(planFact.actualIssuedQty))}</td>
        <td class="${qtyDeltaClass}">${esc(formatStockFinanceQty(planFact.qtyDelta))}</td>
        <td>${esc(formatStockFinanceMoney(planFact.plannedAmount))}</td>
        <td>${esc(formatStockFinanceMoney(planFact.actualProcurementAmount))}</td>
        <td>${esc(formatStockFinanceMoney(planFact.actualPaidAmount))}</td>
        <td class="${amountDeltaClass}">${esc(formatStockFinanceMoney(planFact.amountDelta))}</td>
      </tr>`;
    })
    .join("");

export const renderDirectorPlanFactPdfHtml = (view: StockFinanceActualsView) =>
  renderDocumentShell({
    lang: "ru",
    title: "План-факт",
    styles: PLAN_FACT_STYLES,
    body: joinHtml([
      `<h1>План-факт по заявке ${esc(view.requestId)}</h1>`,
      `<div class="muted">Закуплено, принято, выдано и оплачено по фактическому движению материалов.</div>`,
      `<section class="summary">
        ${renderKpi("Плановая сумма", formatStockFinanceMoney(view.totals.plannedAmount))}
        ${renderKpi("Факт закупки", formatStockFinanceMoney(view.totals.procurementAmount))}
        ${renderKpi("Оплачено", formatStockFinanceMoney(view.totals.paidAmount))}
        ${renderKpi("Отклонение", formatStockFinanceMoney(view.totals.amountDelta))}
      </section>`,
      `<h2>План-факт</h2>`,
      renderTable({
        headers: [
          { label: "Позиция" },
          { label: "Ед." },
          { label: "Плановое количество" },
          { label: "Закуплено" },
          { label: "Принято" },
          { label: "Выдано" },
          { label: "Отклонение количества" },
          { label: "Плановая сумма" },
          { label: "Фактическая сумма" },
          { label: "Оплачено" },
          { label: "Отклонение суммы" },
        ],
        rowsHtml: renderRows(view),
        emptyMessage: "Нет строк для план-факта.",
        emptyColspan: 11,
      }),
      renderPageFooter(),
    ]),
  });
