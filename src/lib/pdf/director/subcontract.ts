import { esc } from "../../api/pdf_director.format";
import type { DirectorSubcontractReportPdfModel } from "../../api/pdf_director.data";
import {
  joinHtml,
  renderDocumentShell,
  renderGridKpiCard,
  renderPageFooter,
  renderTable,
  renderTitledBoxSection,
} from "../pdf.director.sections";
import { formatMoney, renderSignaturesSection } from "./shared";
const SUBCONTRACT_REPORT_STYLES = `
    @page { margin: 12mm; }
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:#0f172a}
    h1{font-size:20px;margin:0 0 6px 0}
    h2{font-size:15px;margin:14px 0 8px}
    .muted{color:#64748b}
    .grid{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:8px}
    .kpi{border:1px solid #e5e7eb;border-radius:10px;padding:8px;background:#f8fafc}
    .kpi .l{font-size:11px;color:#64748b}
    .kpi .v{font-size:18px;font-weight:800;margin-top:3px}
    .box{border:1px solid #e5e7eb;border-radius:12px;padding:10px;margin-top:8px}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #e5e7eb;padding:6px 8px;font-size:12px;vertical-align:top}
    th{background:#f8fafc;text-align:left}
    .r{text-align:right}
    .page-footer{position:fixed;left:0;right:0;bottom:-8mm;text-align:center;color:#64748b;font-size:11px}
    .page-footer:after{content:"Стр. " counter(page)}
`;

const renderSubcontractMeta = (model: DirectorSubcontractReportPdfModel) =>
  joinHtml([
    `<div class="muted">Компания: <b>${esc(model.companyName)}</b> • Период: <b>${esc(model.periodText)}</b> • Объект: <b>${esc(model.objectText)}</b></div>`,
    `<div class="muted">Сформировано: ${esc(model.generatedAt)} • Сформировал: ${esc(model.generatedBy)}</div>`,
  ]);

const renderSubcontractKpis = (model: DirectorSubcontractReportPdfModel) =>
  `<h2>KPI по подрядам</h2>
    <div class="grid">
      ${renderGridKpiCard("Всего подрядов", esc(String(model.totalRows)))}
      ${renderGridKpiCard("Утверждено", esc(String(model.approvedCount)))}
      ${renderGridKpiCard("Активных подрядчиков", esc(String(model.contractorCount)))}
      ${renderGridKpiCard("Объектов с подрядами", esc(String(model.objectCount)))}
      ${renderGridKpiCard("Общая сумма", formatMoney(model.sumApproved))}
      ${renderGridKpiCard("Без суммы", esc(String(model.noAmount)))}
      ${renderGridKpiCard("Без вида работ", esc(String(model.noWork)))}
      ${renderGridKpiCard("Без объекта", esc(String(model.noObject)))}
    </div>`;

const renderSubcontractContractorsSection = (model: DirectorSubcontractReportPdfModel) =>
  renderTitledBoxSection(
    "Сводка по подрядчикам",
    renderTable({
      headers: [
        { label: "Подрядчик" },
        { label: "Подрядов", className: "r" },
        { label: "Объектов", className: "r" },
        { label: "Видов работ", className: "r" },
        { label: "Сумма", className: "r" },
      ],
      rowsHtml: model.contractorRows
        .map(
          (row) => `<tr><td>${esc(row.contractor)}</td><td class="r">${row.count}</td><td class="r">${row.objects}</td><td class="r">${row.works}</td><td class="r">${formatMoney(row.amount)}</td></tr>`,
        )
        .join(""),
      emptyMessage: "Нет данных",
      emptyColspan: 5,
    }),
  );

const renderSubcontractObjectsSection = (model: DirectorSubcontractReportPdfModel) =>
  renderTitledBoxSection(
    "Сводка по объектам",
    renderTable({
      headers: [
        { label: "Объект" },
        { label: "Подрядов", className: "r" },
        { label: "Подрядчиков", className: "r" },
        { label: "Видов работ", className: "r" },
        { label: "Сумма", className: "r" },
      ],
      rowsHtml: model.objectRows
        .map(
          (row) => `<tr><td>${esc(row.objectName)}</td><td class="r">${row.count}</td><td class="r">${row.contractors}</td><td class="r">${row.works}</td><td class="r">${formatMoney(row.amount)}</td></tr>`,
        )
        .join(""),
      emptyMessage: "Нет данных",
      emptyColspan: 5,
    }),
  );

const renderSubcontractApprovedSection = (model: DirectorSubcontractReportPdfModel) =>
  renderTitledBoxSection(
    "Утверждённые подряды",
    renderTable({
      headers: [
        { label: "№" },
        { label: "Подрядчик" },
        { label: "Объект" },
        { label: "Вид работ" },
        { label: "Статус" },
        { label: "Сумма", className: "r" },
        { label: "Утверждено" },
      ],
      rowsHtml: model.approvedRows
        .map(
          (row) => `<tr>
          <td>${esc(row.displayNo)}</td>
          <td>${esc(row.contractor)}</td>
          <td>${esc(row.objectName)}</td>
          <td>${esc(row.workType)}</td>
          <td>${esc(row.status)}</td>
          <td class="r">${formatMoney(row.totalPrice)}</td>
          <td>${esc(row.approvedAt)}</td>
        </tr>`,
        )
        .join(""),
      emptyMessage: "Нет данных",
      emptyColspan: 7,
    }),
  );

const renderSubcontractWorkTypesSection = (model: DirectorSubcontractReportPdfModel) =>
  renderTitledBoxSection(
    "Подряды по видам работ",
    renderTable({
      headers: [
        { label: "Вид работ" },
        { label: "Подрядов", className: "r" },
        { label: "Подрядчиков", className: "r" },
        { label: "Сумма", className: "r" },
      ],
      rowsHtml: model.workRows
        .map(
          (row) => `<tr><td>${esc(row.workType)}</td><td class="r">${row.count}</td><td class="r">${row.contractors}</td><td class="r">${formatMoney(row.amount)}</td></tr>`,
        )
        .join(""),
      emptyMessage: "Нет данных",
      emptyColspan: 4,
    }),
  );

const renderSubcontractProblemsSection = (model: DirectorSubcontractReportPdfModel) =>
  renderTitledBoxSection(
    "Проблемные зоны",
    renderTable({
      headers: [
        { label: "Проблема" },
        { label: "Кол-во", className: "r" },
        { label: "Комментарий" },
      ],
      rowsHtml: [
        `<tr><td>Подряды без суммы</td><td class="r">${model.noAmount}</td><td>Проверить total_price</td></tr>`,
        `<tr><td>Подряды без объекта</td><td class="r">${model.noObject}</td><td>Проверить object_name</td></tr>`,
        `<tr><td>Подряды без вида работ</td><td class="r">${model.noWork}</td><td>Проверить work_type</td></tr>`,
        `<tr><td>Подряды без подрядчика</td><td class="r">${model.noContractor}</td><td>Проверить contractor_org</td></tr>`,
        `<tr><td>Pending</td><td class="r">${model.pendingCount}</td><td>Ожидают решения директора</td></tr>`,
        `<tr><td>Rejected</td><td class="r">${model.rejectedCount}</td><td>Отклонены директором</td></tr>`,
      ].join(""),
    }),
  );


export const renderDirectorSubcontractReportPdfHtml = (model: DirectorSubcontractReportPdfModel) =>
  renderDocumentShell({
    title: "Директорский отчёт по подрядам",
    styles: SUBCONTRACT_REPORT_STYLES,
    body: joinHtml([
      `<h1>Директорский отчёт по подрядам</h1>`,
      renderSubcontractMeta(model),
      renderSubcontractKpis(model),
      renderSubcontractContractorsSection(model),
      renderSubcontractObjectsSection(model),
      renderSubcontractApprovedSection(model),
      renderSubcontractWorkTypesSection(model),
      renderSubcontractProblemsSection(model),
      renderSignaturesSection(),
      renderPageFooter(),
    ]),
  });
