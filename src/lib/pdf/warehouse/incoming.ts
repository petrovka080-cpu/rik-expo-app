import {
  cssForm29,
  esc,
  fmtDateTimeRu,
  fmtQty,
  nnum,
  type WarehouseScalar,
  uomRu,
} from "./shared";
type WarehouseIncomingRegisterRow = {
  event_dt?: string | null;
  display_no?: string | null;
  incoming_id?: string | number | null;
  who?: string | null;
  qty_total?: WarehouseScalar;
  [key: string]: unknown;
};

type WarehouseIncomingHead = {
  incoming_id?: string | number | null;
  display_no?: string | null;
  event_dt?: string | null;
  who?: string | null;
  warehouseman_fio?: string | null;
  note?: string | null;
  [key: string]: unknown;
};

type WarehouseIncomingLine = {
  purchase_item_id?: string | null;
  name_ru?: string | null;
  name?: string | null;
  material_name?: string | null;
  code?: string | null;
  uom_id?: string | null;
  uom?: string | null;
  qty_received?: WarehouseScalar;
  qty?: WarehouseScalar;
  [key: string]: unknown;
};

type WarehouseIncomingMaterialsRow = {
  material_code?: string | null;
  material_name?: string | null;
  uom?: string | null;
  sum_total?: WarehouseScalar;
  [key: string]: unknown;
};
export function buildWarehouseIncomingRegisterHtml(args: {
  periodFrom?: string;
  periodTo?: string;
  items: WarehouseIncomingRegisterRow[];
  orgName?: string;
  warehouseName?: string;
}): string {
  const from = String(args.periodFrom ?? "").trim();
  const to = String(args.periodTo ?? "").trim();
  const period = from || to ? `${from || "—"} → ${to || "—"}` : "Весь период";

  const rows = Array.isArray(args.items) ? args.items : [];
  const sumTotal = rows.reduce((s, x) => s + nnum(x.qty_total), 0);

  const org = String(args.orgName ?? "").trim();
  const wh = String(args.warehouseName ?? "").trim();

  const body =
    rows.length > 0
      ? rows
        .map((h, idx) => {
          const dt = fmtDateTimeRu(h.event_dt);
          const docNo = h.display_no || `PR-${String(h.incoming_id ?? "").slice(0, 8)}`;
          const who = String(h.who ?? "—");

          const total = fmtQty(h.qty_total);

          return `
<tr>
  <td class="t-center">${idx + 1}</td>
  <td class="t-center">${esc(dt)}</td>
  <td class="t-center">${esc(docNo)}</td>
  <td>${esc(who)}</td>
  <td class="t-right">${esc(total)}</td>
</tr>`;
        })
        .join("")
      : `<tr><td class="t-center" colspan="5"><i>Нет приходов за период</i></td></tr>`;

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>Реестр прихода на склад</title>
<style>${cssForm29()}</style>
</head>
<body>
  <div class="page">
    <div class="h1">РЕЕСТР ПРИХОДА НА СКЛАД ЗА ПЕРИОД</div>
    <div class="h2">${esc(period)}</div>

    <div class="meta">
      <div class="row"><div class="ml">Организация:</div><div class="mv">${esc(org || "—")}</div></div>
      <div class="row"><div class="ml">Склад:</div><div class="mv">${esc(wh || "—")}</div></div>
      <div class="row"><div class="ml">Всего приходов:</div><div class="mv">${esc(String(rows.length))}</div></div>
      <div class="row"><div class="ml">Сформировано:</div><div class="mv">${esc(new Date().toLocaleString("ru-RU"))}</div></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:34px">№</th>
          <th style="width:140px">Дата</th>
          <th style="width:140px">Номер (PR)</th>
          <th>Кладовщик</th>
          <th style="width:110px">Принято</th>
        </tr>
      </thead>
      <tbody>
        ${body}
      </tbody>
    </table>

    <div class="totals">
      <div class="box"><span class="lbl">Итого принято:</span> ${esc(fmtQty(sumTotal))}</div>
    </div>

    <div class="signs">
      <div class="sign"><div class="who">Кладовщик</div><div class="line"></div><div class="fio"></div></div>
      <div class="sign"><div class="who">Зав. складом</div><div class="line"></div><div class="fio"></div></div>
    </div>

    <div class="page-footer"></div>
  </div>
</body></html>`;
}

export function buildWarehouseIncomingFormHtml(args: {
  incoming: WarehouseIncomingHead;
  lines: WarehouseIncomingLine[];
  orgName?: string;
  warehouseName?: string;
}): string {
  const inc = args.incoming;
  const lines = Array.isArray(args.lines) ? args.lines : [];

  const docNo = inc.display_no || `PR-${String(inc.incoming_id).slice(0, 8)}`;
  const dt = fmtDateTimeRu(inc.event_dt);
  const who = String(inc.who ?? inc.warehouseman_fio ?? "—");
  const note = String(inc.note ?? "—");

  const total = lines.reduce((s, x) => s + nnum(x.qty_received ?? x.qty), 0);

  const rowsHtml = lines.length > 0 ? lines.map((ln, idx) => {
    const rawName = String(ln.name_ru ?? ln.name ?? ln.material_name ?? "").trim();
    const code = String(ln.code || "").trim();
    const hasName = rawName !== "" && rawName !== "—" && rawName !== "-";
    const name = hasName ? rawName : (code || "Позиция");

    const uom = uomRu(ln.uom_id || ln.uom);
    const qty = nnum(ln.qty_received ?? ln.qty);
    const prItem = String(ln.purchase_item_id || "—");

    return `
<tr>
  <td class="t-center">${idx + 1}</td>
  <td>
    ${esc(name)}
    ${prItem !== "—" ? `<div class="small muted">ID: ${esc(prItem)}</div>` : ""}
  </td>
  <td class="t-center">${esc(uom)}</td>
  <td class="t-right">${esc(fmtQty(qty))}</td>
</tr>`;
  }).join("") : `<tr><td colspan="4" class="t-center">Нет данных о позициях</td></tr>`;


  const org = String(args.orgName ?? "").trim();
  const wh = String(args.warehouseName ?? "").trim();

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>${esc(docNo)}</title>
<style>${cssForm29()}</style>
</head>
<body>
  <div class="page">
    <div class="h1">ПРИХОДНЫЙ ОРДЕР (СКЛАД)</div>
    <div class="h2">${esc(docNo)}</div>

    <div class="meta">
      <div class="row"><div class="ml">Организация:</div><div class="mv">${esc(org || "—")}</div></div>
      <div class="row"><div class="ml">Склад:</div><div class="mv">${esc(wh || "—")}</div></div>

      <div class="row"><div class="ml">Номер PR:</div><div class="mv">${esc(docNo)}</div></div>
      <div class="row"><div class="ml">Дата прихода:</div><div class="mv">${esc(dt)}</div></div>

      <div class="row"><div class="ml">Кладовщик:</div><div class="mv">${esc(who)}</div></div>
      <div class="row"><div class="ml">Примечание:</div><div class="mv">${esc(note)}</div></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:34px">№</th>
          <th>Наименование</th>
          <th style="width:52px">Ед.</th>
          <th style="width:110px">Принято</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="totals">
      <div class="box"><span class="lbl">Итого принято:</span> ${esc(fmtQty(total))}</div>
    </div>

    <div class="signs">
      <div class="sign"><div class="who">Кладовщик</div><div class="line"></div><div class="fio">${esc(who)}</div></div>
      <div class="sign"><div class="who">Сдал (Поставщик/Водитель)</div><div class="line"></div><div class="fio"></div></div>
    </div>

    <div class="page-footer"></div>
  </div>
</body></html>`;
}

export function buildWarehouseIncomingMaterialsReportHtml(args: {
  periodFrom?: string;
  periodTo?: string;
  orgName?: string;
  warehouseName?: string;
  rows: WarehouseIncomingMaterialsRow[];
  docsTotal: number;
}): string {
  const from = String(args.periodFrom ?? "").trim();
  const to = String(args.periodTo ?? "").trim();
  const period = from || to ? `${from || "—"} → ${to || "—"}` : "Весь период";

  const org = String(args.orgName ?? "").trim();
  const wh = String(args.warehouseName ?? "").trim();

  const rows = Array.isArray(args.rows) ? args.rows : [];
  const body = rows.length > 0
    ? rows.map((r, idx) => {
      const rawName = String(r.material_name ?? "").trim();
      const code = String(r.material_code ?? "").trim();
      const isDashLike = /^[-\u2014\u2013\u2212]+$/.test(rawName);
      const name = rawName && !isDashLike ? rawName : (code || "-");
      const uom = uomRu(String(r.uom ?? "").trim()) || "—";
      const total = fmtQty(r.sum_total);

      return `
<tr>
  <td class="t-center">${idx + 1}</td>
  <td>${esc(name)}</td>
  <td class="t-center">${esc(uom)}</td>
  <td class="t-right">${esc(total)}</td>
</tr>`;
    }).join("")
    : `<tr><td class="t-center" colspan="4"><i>Нет данных за период</i></td></tr>`;

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>Ведомость прихода материалов</title>
<style>${cssForm29()}</style>
</head>
<body>
  <div class="page">
    <div class="h1">ВЕДОМОСТЬ ПРИХОДА МАТЕРИАЛОВ НА СКЛАД</div>
    <div class="h2">за период ${esc(period)}</div>

    <div class="meta">
      <div class="row"><div class="ml">Организация:</div><div class="mv">${esc(org || "—")}</div></div>
      <div class="row"><div class="ml">Склад:</div><div class="mv">${esc(wh || "—")}</div></div>

      <div class="row"><div class="ml">Позиций:</div><div class="mv">${esc(String(rows.length))}</div></div>
      <div class="row"><div class="ml">Дата формирования:</div><div class="mv">${esc(new Date().toLocaleString("ru-RU"))}</div></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:34px">№</th>
          <th>Наименование материала</th>
          <th style="width:52px">Ед. изм.</th>
          <th style="width:110px">Принято всего</th>
        </tr>
      </thead>
      <tbody>
        ${body}
      </tbody>
    </table>

    <div class="totals">
      <div class="box"><span class="lbl">Приходов всего (документов):</span> ${esc(String(args.docsTotal))}</div>
    </div>

    <div class="signs">
      <div class="sign"><div class="who">Кладовщик</div><div class="line"></div><div class="fio"></div></div>
      <div class="sign"><div class="who">Зав. складом</div><div class="line"></div><div class="fio"></div></div>
    </div>

    <div class="page-footer"></div>
  </div>
</body></html>`;
}
