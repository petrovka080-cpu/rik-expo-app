import {
  cssForm29,
  esc,
  fmtQty,
  nnum,
  type WarehouseScalar,
  uomRu,
} from "./shared";
export type IssuedMaterialsReportRow = {
  material_code?: string | null;
  material_name?: string | null; // ✅ приходит русским из БД (wh_report_issued_materials_fast)
  uom?: string | null;

  sum_in_req?: WarehouseScalar;
  sum_free?: WarehouseScalar;
  sum_over?: WarehouseScalar;
  sum_total?: WarehouseScalar;

  docs_cnt?: WarehouseScalar;
  lines_cnt?: WarehouseScalar;
};

export type IssuedByObjectWorkReportRow = {
  object_id?: string | null;
  object_name?: string | null;
  work_name?: string | null;

  docs_cnt?: WarehouseScalar;
  req_cnt?: WarehouseScalar;
  active_days?: WarehouseScalar;

  uniq_materials?: WarehouseScalar;

  recipients_text?: string | null;
  top3_materials?: string | null;
};

export function buildWarehouseMaterialsReportHtml(args: {
  periodFrom?: string;
  periodTo?: string;

  orgName?: string;
  warehouseName?: string;

  objectName?: string | null;
  workName?: string | null;

  rows: IssuedMaterialsReportRow[];

  // ✅ counters из wh_report_issued_summary_fast
  docsTotal: number;
  docsByReq: number;
  docsWithoutReq: number;
}): string {
  const from = String(args.periodFrom ?? "").trim();
  const to = String(args.periodTo ?? "").trim();
  const period = from || to ? `${from || "—"} → ${to || "—"}` : "Весь период";

  const org = String(args.orgName ?? "").trim();
  const wh = String(args.warehouseName ?? "").trim();

  const obj = String(args.objectName ?? "").trim();
  const work = String(args.workName ?? "").trim();

  const rows = Array.isArray(args.rows) ? args.rows : [];
  const positions = rows.length;

  const docsTotal = Math.max(0, Math.round(nnum(args.docsTotal)));
  const docsByReq = Math.max(0, Math.round(nnum(args.docsByReq)));
  const docsWithoutReq = Math.max(0, Math.round(nnum(args.docsWithoutReq)));

  const body =
    rows.length > 0
      ? rows
        .map((r, idx) => {
          const rawName = String(r.material_name ?? "").trim();
          const code = String(r.material_code ?? "").trim();
          const isDashLike = /^[-\u2014\u2013\u2212]+$/.test(rawName);
          const name = rawName && !isDashLike ? rawName : (code || "-");
          const uom = uomRu(String(r.uom ?? "").trim()) || "—";

          const inReq = fmtQty(r.sum_in_req);
          const free = fmtQty(r.sum_free);
          const total = fmtQty(r.sum_total);

          return `
<tr>
  <td class="t-center">${idx + 1}</td>
  <td>${esc(name)}</td>
  <td class="t-center">${esc(uom)}</td>
  <td class="t-right">${esc(inReq)}</td>
  <td class="t-right">${esc(free)}</td>
  <td class="t-right">${esc(total)}</td>
</tr>`;
        })
        .join("")
      : (docsTotal > 0
        ? `<tr><td class="t-center" colspan="6"><i>Данные не загружены (есть выдачи: ${esc(String(docsTotal))}). Обнови отчёт или сузь период.</i></td></tr>`
        : `<tr><td class="t-center" colspan="6"><i>Нет данных за период</i></td></tr>`);

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>Ведомость отпуска материалов</title>
<style>${cssForm29()}</style>
</head>
<body>
  <div class="page">
    <div class="h1">ВЕДОМОСТЬ ОТПУСКА МАТЕРИАЛОВ СО СКЛАДА</div>
    <div class="h2">за период ${esc(period)}</div>

    <div class="meta">
      <div class="row"><div class="ml">Организация:</div><div class="mv">${esc(org || "—")}</div></div>
      <div class="row"><div class="ml">Склад:</div><div class="mv">${esc(wh || "—")}</div></div>

      <div class="row"><div class="ml">Объект:</div><div class="mv">${esc(obj || "—")}</div></div>
      <div class="row"><div class="ml">Вид работ / участок:</div><div class="mv">${esc(work || "—")}</div></div>

      <div class="row"><div class="ml">Позиций:</div><div class="mv">${esc(String(positions))}</div></div>
      <div class="row"><div class="ml">Дата формирования:</div><div class="mv">${esc(new Date().toLocaleString("ru-RU"))}</div></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:34px">№</th>
          <th>Наименование материала</th>
          <th style="width:52px">Ед. изм.</th>
          <th style="width:110px">Отпущено по заявкам</th>
          <th style="width:110px">Отпущено без заявки</th>
          <th style="width:90px">Отпущено всего</th>
        </tr>
      </thead>
      <tbody>
        ${body}
      </tbody>
    </table>

    <!-- ✅ 3 ИТОГО ПО ДОКУМЕНТАМ (из того же источника, что и строки) -->
    <div class="totals">
      <div class="box"><span class="lbl">Выдач всего (документов):</span> ${esc(String(docsTotal))}</div>
      <div class="box"><span class="lbl">Выдач по заявкам (документов):</span> ${esc(String(docsByReq))}</div>
      <div class="box"><span class="lbl">Выдач без заявки (документов):</span> ${esc(String(docsWithoutReq))}</div>
    </div>

    <div class="signs">
      <div class="sign"><div class="who">Кладовщик</div><div class="line"></div><div class="fio"></div></div>
      <div class="sign"><div class="who">Прораб / нач. участка</div><div class="line"></div><div class="fio"></div></div>
      <div class="sign"><div class="who">Получатель (МОЛ)</div><div class="line"></div><div class="fio"></div></div>
      <div></div>
    </div>

    <div class="page-footer"></div>
  </div>
</body></html>`;
}
export function buildWarehouseObjectWorkReportHtml(args: {
  periodFrom?: string;
  periodTo?: string;

  orgName?: string;
  warehouseName?: string;

  objectName?: string | null; // если выбран фильтр
  rows: IssuedByObjectWorkReportRow[];

  docsTotal: number;
}): string {
  const from = String(args.periodFrom ?? "").trim();
  const to = String(args.periodTo ?? "").trim();
  const period = from || to ? `${from || "—"} → ${to || "—"}` : "Весь период";

  const org = String(args.orgName ?? "").trim();
  const wh = String(args.warehouseName ?? "").trim();
  const objFilter = String(args.objectName ?? "").trim();

  const rows = Array.isArray(args.rows) ? args.rows : [];
  const positions = rows.length;

  const body =
    rows.length > 0
      ? rows
        .map((r, idx) => {
          const obj = String(r.object_name ?? "").trim() || "Без объекта";
          const work = String(r.work_name ?? "").trim() || "Без вида работ";

          const docs = Math.max(0, Math.round(nnum(r.docs_cnt)));
          const reqCnt = Math.max(0, Math.round(nnum(r.req_cnt)));
          const days = Math.max(0, Math.round(nnum(r.active_days)));
          const uniq = Math.max(0, Math.round(nnum(r.uniq_materials)));

          const recText = String(r.recipients_text ?? "").trim() || "—";
          const top3 = String(r.top3_materials ?? "").trim() || "—";

          // переносы строк в HTML
          const recHtml = esc(recText).replace(/\n/g, "<br/>");
          const topHtml = esc(top3).replace(/\n/g, "<br/>");

          return `
<tr>
  <td class="t-center">${idx + 1}</td>
  <td>${esc(obj)}</td>
  <td>${esc(work)}</td>

  <td class="t-right">${esc(String(docs))}</td>

  <td class="small">${recHtml}</td>

  <td class="t-right">${esc(String(uniq))}</td>

  <td class="small">${topHtml}</td>

  <td class="t-right">${esc(String(reqCnt))}</td>
  <td class="t-right">${esc(String(days))}</td>
</tr>`;
        })
        .join("")
      : `<tr><td class="t-center" colspan="9"><i>Нет данных за период</i></td></tr>`;

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>Отчёт по объектам и видам работ</title>
<style>${cssForm29()}</style>
</head>
<body>
  <div class="page">
    <div class="h1">ОТЧЁТ ПО ОБЪЕКТАМ / ВИДАМ РАБОТ ЗА ПЕРИОД</div>
    <div class="h2">${esc(period)}</div>

    <div class="meta">
      <div class="row"><div class="ml">Организация:</div><div class="mv">${esc(org || "—")}</div></div>
      <div class="row"><div class="ml">Склад:</div><div class="mv">${esc(wh || "—")}</div></div>

      <div class="row"><div class="ml">Фильтр (объект):</div><div class="mv">${esc(objFilter || "—")}</div></div>
      <div class="row"><div class="ml">Сформировано:</div><div class="mv">${esc(new Date().toLocaleString("ru-RU"))}</div></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:34px">№</th>
          <th style="width:160px">Объект</th>
          <th>Вид работ</th>
          <th style="width:76px">Выдач</th>
          <th style="width:220px">Получатели (по заявке/без)</th>
          <th style="width:70px">Уник. мат</th>
          <th style="width:170px">Топ-3 материала</th>
          <th style="width:70px">Заявок</th>
          <th style="width:80px">Активн. дней</th>
        </tr>
      </thead>
      <tbody>
        ${body}
      </tbody>
    </table>

    <div class="totals">
      <div class="box"><span class="lbl">Итого позиций:</span> ${esc(String(positions))}</div>
      <div class="box"><span class="lbl">Итого выдач (документов):</span> ${esc(String(args.docsTotal || 0))}</div>
    </div>

    <div class="signs">
      <div class="sign"><div class="who">Кладовщик</div><div class="line"></div><div class="fio"></div></div>
      <div class="sign"><div class="who">Прораб / нач. участка</div><div class="line"></div><div class="fio"></div></div>
    </div>

    <div class="page-footer"></div>
  </div>
</body></html>`;
}

