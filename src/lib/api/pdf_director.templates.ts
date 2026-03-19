import type {
  DirectorFinancePreviewPdfModel,
  DirectorManagementReportPdfModel,
  DirectorProductionReportPdfModel,
  DirectorSubcontractReportPdfModel,
  DirectorSupplierSummaryPdfModel,
} from "./pdf_director.data";
import { esc, money } from "./pdf_director.format";
import {
  joinHtml,
  renderBox,
  renderDocumentShell,
  renderGridKpiCard,
  renderInlineKpiRow,
  renderLabelValueCell,
  renderMuted,
  renderPageFooter,
  renderTable,
  renderTag,
  renderTitledBoxSection,
} from "./pdf_director.sections";

const FINANCE_PREVIEW_STYLES = `
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;padding:16px;color:#111}
    h1{margin:0 0 10px 0}
    .muted{color:#64748b}
    pre{white-space:pre-wrap}
`;

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

const formatMoney = (value: number) => esc(money(value));
const formatMoneyKgs = (value: number) => `${formatMoney(value)} KGS`;

const renderDirectorFinanceBody = (model: DirectorFinancePreviewPdfModel) =>
  joinHtml([
    `    <h1>Финансовый отчёт (директор)</h1>`,
    `    ${renderMuted("Черновая версия. Дальше оформим красиво.")}`,
    `    <pre>${esc(model.rowsJson)}</pre>`,
  ]);

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

export const renderDirectorFinancePdfHtml = (model: DirectorFinancePreviewPdfModel) =>
  renderDocumentShell({
    title: "Финансовый отчёт",
    styles: FINANCE_PREVIEW_STYLES,
    body: renderDirectorFinanceBody(model),
  });

export const renderDirectorSupplierSummaryPdfHtml = (model: DirectorSupplierSummaryPdfModel) =>
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

const renderSignaturesSection = () =>
  renderTitledBoxSection(
    "Подписи",
    `<div>Директор: ____________________</div>
      <div style="margin-top:10px">Ответственный: ____________________</div>`,
  );

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
