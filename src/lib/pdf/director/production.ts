import { esc } from "../../api/pdf_director.format";
import type { DirectorProductionReportPdfModel } from "../../api/pdf_director.data";
import {
  joinHtml,
  renderDocumentShell,
  renderGridKpiCard,
  renderPageFooter,
  renderTable,
  renderTitledBoxSection,
} from "../pdf.director.sections";
import { formatMoney, renderSignaturesSection } from "./shared";
const PRODUCTION_REPORT_STYLES = `
    @page { margin: 12mm; }
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:#0f172a}
    h1{font-size:20px;margin:0 0 6px 0}
    h2{font-size:15px;margin:14px 0 8px}
    .muted{color:#64748b}
    .box{border:1px solid #e5e7eb;border-radius:12px;padding:10px;margin-top:8px}
    .grid{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:8px}
    .kpi{border:1px solid #e5e7eb;border-radius:10px;padding:8px;background:#f8fafc}
    .kpi .l{font-size:11px;color:#64748b}
    .kpi .v{font-size:18px;font-weight:800;margin-top:3px}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #e5e7eb;padding:6px 8px;font-size:12px;vertical-align:top}
    th{background:#f8fafc;text-align:left}
    .warn{color:#b91c1c;font-weight:700}
    .r{text-align:right}
    .page-footer{position:fixed;left:0;right:0;bottom:-8mm;text-align:center;color:#64748b;font-size:11px}
    .page-footer:after{content:"Стр. " counter(page)}
`;


const renderProductionMeta = (model: DirectorProductionReportPdfModel) =>
  joinHtml([
    `<div class="muted">Компания: <b>${esc(model.companyName)}</b> • Период: <b>${esc(model.periodText)}</b> • Объект: <b>${esc(model.objectName)}</b></div>`,
    `<div class="muted">Сформировано: ${esc(model.generatedAt)} • Сформировал: ${esc(model.generatedBy)}</div>`,
  ]);

const renderProductionKpis = (model: DirectorProductionReportPdfModel) =>
  `<h2>Сводка KPI</h2>
    <div class="grid">
      ${renderGridKpiCard("Документы", esc(String(model.issuesTotal)))}
      ${renderGridKpiCard("Позиции", esc(String(model.itemsTotal)))}
      ${renderGridKpiCard("Без заявки", esc(String(model.itemsNoRequest)))}
      ${renderGridKpiCard("Без вида работ", esc(String(model.withoutWork)))}
      ${renderGridKpiCard("Без объекта", esc(String(model.issuesNoObject)))}
      ${renderGridKpiCard("Расход", formatMoney(model.issueCost))}
      ${renderGridKpiCard("Закупки", formatMoney(model.purchaseCost))}
      ${renderGridKpiCard("Расход / Закупки", `${esc(String(model.ratioPct))}%`)}
    </div>`;

const renderProductionWorksSection = (model: DirectorProductionReportPdfModel) =>
  renderTitledBoxSection(
    "Сводка по видам работ",
    joinHtml([
      renderTable({
        headers: [
          { label: "Вид работ" },
          { label: "Позиции", className: "r" },
          { label: "По заявке", className: "r" },
          { label: "Свободно", className: "r" },
          { label: "Документов", className: "r" },
        ],
        rowsHtml: model.worksRows
          .map(
            (row) => `<tr>
            <td>${row.isWithoutWork ? `<span class="warn">${esc(row.workTypeName || "Без вида работ")}</span>` : esc(row.workTypeName || "—")}</td>
            <td class="r">${esc(String(row.totalPositions))}</td>
            <td class="r">${esc(String(row.reqPositions))}</td>
            <td class="r">${esc(String(row.freePositions))}</td>
            <td class="r">${esc(String(row.totalDocs))}</td>
          </tr>`,
          )
          .join(""),
        emptyMessage: "Нет данных",
        emptyColspan: 5,
      }),
      model.rowsLimitedNote
        ? `<div class="muted" style="margin-top:8px">${esc(model.rowsLimitedNote)} Полная детализация доступна в Excel.</div>`
        : "",
    ]),
  );

const renderProductionObjectsSection = (model: DirectorProductionReportPdfModel) =>
  renderTitledBoxSection(
    "Сводка по объектам",
    renderTable({
      headers: [
        { label: "Объект" },
        { label: "Документы", className: "r" },
        { label: "Позиции", className: "r" },
        { label: "Без заявки", className: "r" },
        { label: "Без вида работ", className: "r" },
      ],
      rowsHtml: model.objectRows
        .map(
          (row) => `<tr>
            <td>${esc(row.obj)}</td>
            <td class="r">${esc(String(row.docs))}</td>
            <td class="r">${esc(String(row.positions))}</td>
            <td class="r">${esc(String(row.noReq))}</td>
            <td class="r">${esc(String(row.noWork))}</td>
          </tr>`,
        )
        .join(""),
      emptyMessage: "Нет данных",
      emptyColspan: 5,
    }),
  );

const renderProductionMaterialsSection = (model: DirectorProductionReportPdfModel) =>
  renderTitledBoxSection(
    "Материалы",
    renderTable({
      headers: [
        { label: "Материал" },
        { label: "Кол-во", className: "r" },
        { label: "Ед." },
        { label: "Документов", className: "r" },
        { label: "Без заявки", className: "r" },
      ],
      rowsHtml: model.materialRows
        .map(
          (row) => `<tr>
            <td>${esc(row.title)}</td>
            <td class="r">${esc(String(row.qtyTotal))}</td>
            <td>${esc(row.uom)}</td>
            <td class="r">${esc(String(row.docsCount))}</td>
            <td class="r">${esc(String(row.qtyWithoutRequest))}</td>
          </tr>`,
        )
        .join(""),
      emptyMessage: "Нет данных",
      emptyColspan: 5,
    }),
  );

const renderProductionProblemsSection = (model: DirectorProductionReportPdfModel) =>
  renderTitledBoxSection(
    "Проблемные зоны",
    renderTable({
      headers: [
        { label: "Проблема" },
        { label: "Кол-во", className: "r" },
        { label: "Комментарий" },
      ],
      rowsHtml: model.problemRows
        .map(
          (row) => `<tr><td>${esc(row.problem)}</td><td class="r">${esc(String(row.count))}</td><td>${esc(row.comment)}</td></tr>`,
        )
        .join(""),
    }),
  );


export const renderDirectorProductionReportPdfHtml = (model: DirectorProductionReportPdfModel) =>
  renderDocumentShell({
    title: "Директорский производственный отчёт",
    styles: PRODUCTION_REPORT_STYLES,
    body: joinHtml([
      `<h1>Директорский производственный отчёт</h1>`,
      renderProductionMeta(model),
      renderProductionKpis(model),
      renderProductionWorksSection(model),
      renderProductionObjectsSection(model),
      renderProductionMaterialsSection(model),
      renderProductionProblemsSection(model),
      renderSignaturesSection(),
      renderPageFooter(),
    ]),
  });
