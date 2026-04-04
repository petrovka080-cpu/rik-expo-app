/* eslint-disable import/no-unresolved */
// @ts-nocheck

export type WarehouseScalar = number | string | null | undefined;

export type WarehouseIssueHead = {
  issue_id: number | string;
  issue_no?: string | null;
  base_no?: string | null;
  event_dt?: string | null;
  kind?: string | null;
  who?: string | null;
  note?: string | null;
  request_id?: string | null;
  display_no?: string | null;
  qty_total?: WarehouseScalar;
  qty_in_req?: WarehouseScalar;
  qty_over?: WarehouseScalar;
  object_name?: string | null;
  work_name?: string | null;
};

export type WarehouseIssueLine = {
  issue_id: number | string;
  rik_code?: string | null;
  uom?: string | null;
  name_human?: string | null;
  qty_total?: WarehouseScalar;
  qty_in_req?: WarehouseScalar;
  qty_over?: WarehouseScalar;
  uom_id?: string | null;
  item_name_ru?: string | null;
  item_name?: string | null;
  name?: string | null;
  title?: string | null;
};

export type WarehouseIncomingRegisterRow = {
  event_dt?: string | null;
  display_no?: string | null;
  incoming_id?: string | number | null;
  who?: string | null;
  warehouseman_fio?: string | null;
  qty_total?: WarehouseScalar;
};

export type WarehouseIncomingHead = WarehouseIncomingRegisterRow & {
  note?: string | null;
};

export type WarehouseIncomingLine = {
  purchase_item_id?: string | null;
  name_ru?: string | null;
  name?: string | null;
  material_name?: string | null;
  code?: string | null;
  uom_id?: string | null;
  uom?: string | null;
  qty_received?: WarehouseScalar;
  qty?: WarehouseScalar;
};

export type WarehouseIncomingMaterialsRow = {
  material_code?: string | null;
  material_name?: string | null;
  uom?: string | null;
  sum_total?: WarehouseScalar;
};

export type WarehouseIssuedMaterialsRow = {
  material_code?: string | null;
  material_name?: string | null;
  uom?: string | null;
  sum_in_req?: WarehouseScalar;
  sum_free?: WarehouseScalar;
  sum_total?: WarehouseScalar;
};

export type WarehouseObjectWorkRow = {
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

const RU_MONTHS = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

export const esc = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const nnum = (value: unknown): number => {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const source = String(value).trim();
  if (!source) return 0;
  const normalized = source
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.\-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const fmtQty = (value: unknown) =>
  nnum(value).toLocaleString("ru-RU", { maximumFractionDigits: 3 });

export const fmtDateTimeRu = (value?: string | null) => {
  const source = String(value ?? "").trim();
  if (!source) return "—";
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return source;
  return date.toLocaleString("ru-RU");
};

export const formatRuDayLabel = (date: Date) => {
  const dd = String(date.getDate()).padStart(2, "0");
  return `${dd} ${RU_MONTHS[date.getMonth()] || ""} ${date.getFullYear()}`.trim();
};

export const uomRu = (uom: unknown) => {
  const raw = String(uom ?? "").trim();
  if (!raw) return "—";
  const normalized = raw.replace(/\s+/g, "").replace("²", "2").replace("³", "3").toLowerCase();
  if (normalized === "m") return "м";
  if (normalized === "m2") return "м²";
  if (normalized === "m3") return "м³";
  return raw;
};

export const pickIssueNo = (head: WarehouseIssueHead) => {
  const direct = String(head.issue_no ?? "").trim() || String(head.base_no ?? "").trim();
  if (direct) return direct;
  const id = String(head.issue_id ?? "").trim();
  return id ? `ISSUE-${id}` : "ISSUE-—";
};

export const pickKindLabel = (head: WarehouseIssueHead) => {
  const kind = String(head.kind ?? "").trim().toUpperCase();
  if (kind === "REQ") return "Выдача по заявке";
  if (kind === "FREE") return "Выдача без заявки";
  return "Выдача со склада";
};

export const pickBasis = (head: WarehouseIssueHead) => {
  const displayNo = String(head.display_no ?? "").trim();
  if (displayNo) return `Заявка: ${displayNo}`;
  const note = String(head.note ?? "").trim();
  return note || "—";
};

export const kindByCodePrefix = (code: unknown) => {
  const normalized = String(code ?? "").trim().toUpperCase();
  if (!normalized) return "Позиция";
  if (normalized.startsWith("MAT-")) return "Материал";
  if (normalized.startsWith("TOOL-")) return "Инструмент";
  if (normalized.startsWith("WT-") || normalized.startsWith("WORK-")) return "Работа";
  if (normalized.startsWith("SRV-") || normalized.startsWith("SERV-")) return "Услуга";
  return "Позиция";
};

export const pickLineNameRu = (
  line: WarehouseIssueLine,
  nameByCode?: Record<string, string>,
) => {
  const direct =
    String(line.name_human ?? "").trim() ||
    String(line.item_name_ru ?? "").trim() ||
    String(line.item_name ?? "").trim() ||
    String(line.name ?? "").trim() ||
    String(line.title ?? "").trim();
  if (direct) return esc(direct);
  const code = String(line.rik_code ?? "").trim().toUpperCase();
  const mapped = code && nameByCode ? String(nameByCode[code] ?? "").trim() : "";
  return esc(mapped || "—");
};

export const pickLineUom = (line: WarehouseIssueLine) =>
  esc(uomRu(line.uom ?? line.uom_id));

export const cssForm29 = () => `
  @page { margin: 12mm 12mm 18mm 12mm; }
  body{
    font-family: Arial, Helvetica, sans-serif;
    color:#000;
    background:#fff;
    margin:0;
    padding:0;
  }
  .page{ padding:12mm; }
  .h1{ font-size:16px; font-weight:700; text-align:center; margin:0 0 6px 0; }
  .h2{ font-size:12px; font-weight:700; margin:0 0 8px 0; text-align:center; }
  .meta{
    display:grid;
    grid-template-columns: 1fr 1fr;
    column-gap:18mm;
    row-gap:4px;
    font-size:11px;
    margin-top:8px;
  }
  .meta .row{ display:flex; gap:6px; }
  .ml{ font-weight:700; }
  .mv{ flex:1; border-bottom:1px solid #000; min-height:14px; padding:0 2px; }
  table{
    width:100%;
    border-collapse:collapse;
    margin-top:10px;
    font-size:11px;
    page-break-inside:auto;
  }
  thead{ display:table-header-group; }
  tr{ page-break-inside:avoid; page-break-after:auto; }
  th, td{
    border:1px solid #000;
    padding:6px 6px;
    vertical-align:top;
  }
  th{ font-weight:700; text-align:center; }
  .t-center{ text-align:center; }
  .t-right{ text-align:right; }
  .small{ font-size:10px; }
  .muted{ color:#333; }
  .totals{
    margin-top:10px;
    font-size:11px;
    display:flex;
    gap:12px;
    flex-wrap:wrap;
  }
  .totals .box{
    border:1px solid #000;
    padding:6px 8px;
    min-width: 200px;
  }
  .totals .lbl{ font-weight:700; }
  .signs{
    margin-top:12px;
    display:grid;
    grid-template-columns: 1fr 1fr;
    gap:10mm 14mm;
    font-size:11px;
  }
  .sign{
    display:flex;
    gap:8px;
    align-items:flex-end;
  }
  .sign .who{ font-weight:700; min-width: 160px; }
  .sign .line{ flex:1; border-bottom:1px solid #000; height:14px; }
  .sign .fio{ min-width: 140px; }
  .page-footer{
    position:fixed;
    left:0; right:0;
    bottom: -10mm;
    text-align:center;
    font-size:10px;
  }
  .page-footer:after{ content:"Стр. " counter(page); }
`;

export function buildWarehouseIssueFormHtml(args: {
  head: WarehouseIssueHead;
  lines: WarehouseIssueLine[];
  orgName?: string;
  warehouseName?: string;
  nameByCode?: Record<string, string>;
}): string {
  const issueNo = pickIssueNo(args.head);
  const rowsHtml =
    args.lines.length > 0
      ? args.lines
          .map((line, index) => `
<tr>
  <td class="t-center">${index + 1}</td>
  <td>
    ${pickLineNameRu(line, args.nameByCode)}
    <div class="small muted">${esc(kindByCodePrefix(line.rik_code))}</div>
  </td>
  <td class="t-center">${pickLineUom(line)}</td>
  <td class="t-right">${esc(fmtQty(line.qty_in_req))}</td>
  <td class="t-right">${esc(fmtQty(line.qty_over))}</td>
  <td class="t-right">${esc(fmtQty(line.qty_total))}</td>
</tr>`)
          .join("")
      : `<tr><td class="t-center" colspan="6"><i>Нет строк</i></td></tr>`;

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>${esc(issueNo)}</title>
<style>${cssForm29()}</style>
</head>
<body>
  <div class="page">
    <div class="h1">НАКЛАДНАЯ НА ОТПУСК МАТЕРИАЛОВ СО СКЛАДА</div>
    <div class="h2">${esc(pickKindLabel(args.head))}</div>
    <div class="meta">
      <div class="row"><div class="ml">Организация:</div><div class="mv">${esc(args.orgName || "—")}</div></div>
      <div class="row"><div class="ml">Склад:</div><div class="mv">${esc(args.warehouseName || "—")}</div></div>
      <div class="row"><div class="ml">Номер:</div><div class="mv">${esc(issueNo)}</div></div>
      <div class="row"><div class="ml">Дата:</div><div class="mv">${esc(fmtDateTimeRu(args.head.event_dt))}</div></div>
      <div class="row"><div class="ml">Основание:</div><div class="mv">${esc(pickBasis(args.head))}</div></div>
      <div class="row"><div class="ml">Получатель:</div><div class="mv">${esc(String(args.head.who ?? "").trim() || "—")}</div></div>
      <div class="row"><div class="ml">Объект:</div><div class="mv">${esc(String(args.head.object_name ?? "").trim() || "—")}</div></div>
      <div class="row"><div class="ml">Вид работ:</div><div class="mv">${esc(String(args.head.work_name ?? "").trim() || "—")}</div></div>
      <div class="row"><div class="ml">Примечание:</div><div class="mv">${esc(String(args.head.note ?? "").trim() || "—")}</div></div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:34px">№</th>
          <th>Наименование</th>
          <th style="width:52px">Ед.</th>
          <th style="width:88px">По заявке</th>
          <th style="width:88px">Сверх</th>
          <th style="width:88px">Итого</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <div class="totals">
      <div class="box"><span class="lbl">Итого отпущено:</span> ${esc(fmtQty(args.head.qty_total))}</div>
      <div class="box"><span class="lbl">По заявке:</span> ${esc(fmtQty(args.head.qty_in_req))}</div>
      <div class="box"><span class="lbl">Сверх заявки:</span> ${esc(fmtQty(args.head.qty_over))}</div>
    </div>
    <div class="signs">
      <div class="sign"><div class="who">Кладовщик</div><div class="line"></div><div class="fio"></div></div>
      <div class="sign"><div class="who">Прораб / нач. участка</div><div class="line"></div><div class="fio"></div></div>
      <div class="sign"><div class="who">Получатель (МОЛ)</div><div class="line"></div><div class="fio">${esc(String(args.head.who ?? "").trim())}</div></div>
      <div></div>
    </div>
    <div class="page-footer"></div>
  </div>
</body></html>`;
}

export function buildWarehouseIssuesRegisterHtml(args: {
  periodFrom?: string | null;
  periodTo?: string | null;
  issues: WarehouseIssueHead[];
  orgName?: string | null;
  warehouseName?: string | null;
}): string {
  const period =
    String(args.periodFrom ?? "").trim() || String(args.periodTo ?? "").trim()
      ? `${String(args.periodFrom ?? "").trim() || "—"} → ${String(args.periodTo ?? "").trim() || "—"}`
      : "Весь период";
  const body =
    args.issues.length > 0
      ? args.issues
          .map((head, index) => `
<tr>
  <td class="t-center">${index + 1}</td>
  <td class="t-center">${esc(fmtDateTimeRu(head.event_dt))}</td>
  <td class="t-center">${esc(pickIssueNo(head))}</td>
  <td class="t-center">${esc(String(head.kind ?? "").trim().toUpperCase() === "REQ" ? "По заявке" : "Без заявки")}</td>
  <td>${esc(String(head.who ?? "").trim() || "—")}</td>
  <td class="t-center">${esc(String(head.display_no ?? "").trim() || "—")}</td>
  <td class="t-right">${esc(fmtQty(head.qty_total))}</td>
  <td class="t-right">${esc(fmtQty(head.qty_in_req))}</td>
  <td class="t-right">${esc(fmtQty(head.qty_over))}</td>
</tr>`)
          .join("")
      : `<tr><td class="t-center" colspan="9"><i>Нет выдач за период</i></td></tr>`;

  const sumTotal = args.issues.reduce((sum, row) => sum + nnum(row.qty_total), 0);
  const sumInReq = args.issues.reduce((sum, row) => sum + nnum(row.qty_in_req), 0);
  const sumOver = args.issues.reduce((sum, row) => sum + nnum(row.qty_over), 0);

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>Реестр выдач со склада</title>
<style>${cssForm29()}</style>
</head>
<body>
  <div class="page">
    <div class="h1">РЕЕСТР ВЫДАЧ СО СКЛАДА ЗА ПЕРИОД</div>
    <div class="h2">${esc(period)}</div>
    <div class="meta">
      <div class="row"><div class="ml">Организация:</div><div class="mv">${esc(args.orgName || "—")}</div></div>
      <div class="row"><div class="ml">Склад:</div><div class="mv">${esc(args.warehouseName || "—")}</div></div>
      <div class="row"><div class="ml">Всего выдач:</div><div class="mv">${esc(String(args.issues.length))}</div></div>
      <div class="row"><div class="ml">Сформировано:</div><div class="mv">${esc(new Date().toLocaleString("ru-RU"))}</div></div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:34px">№</th>
          <th style="width:120px">Дата</th>
          <th style="width:110px">Номер</th>
          <th style="width:90px">Тип</th>
          <th>Получатель</th>
          <th style="width:120px">Заявка</th>
          <th style="width:80px">Всего</th>
          <th style="width:90px">По заявке</th>
          <th style="width:90px">Сверх заявки</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
    <div class="totals">
      <div class="box"><span class="lbl">Итого отпущено:</span> ${esc(fmtQty(sumTotal))}</div>
      <div class="box"><span class="lbl">Итого по заявкам:</span> ${esc(fmtQty(sumInReq))}</div>
      <div class="box"><span class="lbl">Итого сверх заявок:</span> ${esc(fmtQty(sumOver))}</div>
    </div>
    <div class="signs">
      <div class="sign"><div class="who">Кладовщик</div><div class="line"></div><div class="fio"></div></div>
      <div class="sign"><div class="who">Прораб / нач. участка</div><div class="line"></div><div class="fio"></div></div>
    </div>
    <div class="page-footer"></div>
  </div>
</body></html>`;
}

export function buildWarehouseIncomingRegisterHtml(args: {
  periodFrom?: string | null;
  periodTo?: string | null;
  items: WarehouseIncomingRegisterRow[];
  orgName?: string | null;
  warehouseName?: string | null;
}): string {
  const period =
    String(args.periodFrom ?? "").trim() || String(args.periodTo ?? "").trim()
      ? `${String(args.periodFrom ?? "").trim() || "—"} → ${String(args.periodTo ?? "").trim() || "—"}`
      : "Весь период";
  const body =
    args.items.length > 0
      ? args.items
          .map((item, index) => `
<tr>
  <td class="t-center">${index + 1}</td>
  <td class="t-center">${esc(fmtDateTimeRu(item.event_dt))}</td>
  <td class="t-center">${esc(String(item.display_no ?? "").trim() || `PR-${String(item.incoming_id ?? "").slice(0, 8)}`)}</td>
  <td>${esc(String(item.who ?? item.warehouseman_fio ?? "").trim() || "—")}</td>
  <td class="t-right">${esc(fmtQty(item.qty_total))}</td>
</tr>`)
          .join("")
      : `<tr><td class="t-center" colspan="5"><i>Нет приходов за период</i></td></tr>`;
  const sumTotal = args.items.reduce((sum, row) => sum + nnum(row.qty_total), 0);

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>Реестр прихода на склад</title>
<style>${cssForm29()}</style>
</head>
<body>
  <div class="page">
    <div class="h1">РЕЕСТР ПРИХОДА НА СКЛАД ЗА ПЕРИОД</div>
    <div class="h2">${esc(period)}</div>
    <div class="meta">
      <div class="row"><div class="ml">Организация:</div><div class="mv">${esc(args.orgName || "—")}</div></div>
      <div class="row"><div class="ml">Склад:</div><div class="mv">${esc(args.warehouseName || "—")}</div></div>
      <div class="row"><div class="ml">Всего приходов:</div><div class="mv">${esc(String(args.items.length))}</div></div>
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
      <tbody>${body}</tbody>
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
  orgName?: string | null;
  warehouseName?: string | null;
}): string {
  const docNo =
    String(args.incoming.display_no ?? "").trim() ||
    `PR-${String(args.incoming.incoming_id ?? "").slice(0, 8)}`;
  const rowsHtml =
    args.lines.length > 0
      ? args.lines
          .map((line, index) => {
            const name =
              String(line.name_ru ?? "").trim() ||
              String(line.name ?? "").trim() ||
              String(line.material_name ?? "").trim() ||
              String(line.code ?? "").trim() ||
              "Позиция";
            return `
<tr>
  <td class="t-center">${index + 1}</td>
  <td>
    ${esc(name)}
    ${String(line.purchase_item_id ?? "").trim() ? `<div class="small muted">ID: ${esc(String(line.purchase_item_id ?? "").trim())}</div>` : ""}
  </td>
  <td class="t-center">${esc(uomRu(line.uom_id ?? line.uom))}</td>
  <td class="t-right">${esc(fmtQty(line.qty_received ?? line.qty))}</td>
</tr>`;
          })
          .join("")
      : `<tr><td colspan="4" class="t-center">Нет данных о позициях</td></tr>`;

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>${esc(docNo)}</title>
<style>${cssForm29()}</style>
</head>
<body>
  <div class="page">
    <div class="h1">ПРИХОДНЫЙ ОРДЕР (СКЛАД)</div>
    <div class="h2">${esc(docNo)}</div>
    <div class="meta">
      <div class="row"><div class="ml">Организация:</div><div class="mv">${esc(args.orgName || "—")}</div></div>
      <div class="row"><div class="ml">Склад:</div><div class="mv">${esc(args.warehouseName || "—")}</div></div>
      <div class="row"><div class="ml">Номер PR:</div><div class="mv">${esc(docNo)}</div></div>
      <div class="row"><div class="ml">Дата прихода:</div><div class="mv">${esc(fmtDateTimeRu(args.incoming.event_dt))}</div></div>
      <div class="row"><div class="ml">Кладовщик:</div><div class="mv">${esc(String(args.incoming.who ?? args.incoming.warehouseman_fio ?? "").trim() || "—")}</div></div>
      <div class="row"><div class="ml">Примечание:</div><div class="mv">${esc(String(args.incoming.note ?? "").trim() || "—")}</div></div>
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
      <tbody>${rowsHtml}</tbody>
    </table>
    <div class="totals">
      <div class="box"><span class="lbl">Итого принято:</span> ${esc(fmtQty(args.lines.reduce((sum, row) => sum + nnum(row.qty_received ?? row.qty), 0)))}</div>
    </div>
    <div class="signs">
      <div class="sign"><div class="who">Кладовщик</div><div class="line"></div><div class="fio">${esc(String(args.incoming.who ?? args.incoming.warehouseman_fio ?? "").trim())}</div></div>
      <div class="sign"><div class="who">Сдал (Поставщик/Водитель)</div><div class="line"></div><div class="fio"></div></div>
    </div>
    <div class="page-footer"></div>
  </div>
</body></html>`;
}

export function buildWarehouseIncomingMaterialsReportHtml(args: {
  periodFrom?: string | null;
  periodTo?: string | null;
  orgName?: string | null;
  warehouseName?: string | null;
  rows: WarehouseIncomingMaterialsRow[];
  docsTotal: number;
}): string {
  const period =
    String(args.periodFrom ?? "").trim() || String(args.periodTo ?? "").trim()
      ? `${String(args.periodFrom ?? "").trim() || "—"} → ${String(args.periodTo ?? "").trim() || "—"}`
      : "Весь период";
  const body =
    args.rows.length > 0
      ? args.rows
          .map((row, index) => `
<tr>
  <td class="t-center">${index + 1}</td>
  <td>${esc(String(row.material_name ?? "").trim() || String(row.material_code ?? "").trim() || "-")}</td>
  <td class="t-center">${esc(uomRu(row.uom))}</td>
  <td class="t-right">${esc(fmtQty(row.sum_total))}</td>
</tr>`)
          .join("")
      : `<tr><td class="t-center" colspan="4"><i>Нет данных за период</i></td></tr>`;

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>Ведомость прихода материалов</title>
<style>${cssForm29()}</style>
</head>
<body>
  <div class="page">
    <div class="h1">ВЕДОМОСТЬ ПРИХОДА МАТЕРИАЛОВ НА СКЛАД</div>
    <div class="h2">${esc(period)}</div>
    <div class="meta">
      <div class="row"><div class="ml">Организация:</div><div class="mv">${esc(args.orgName || "—")}</div></div>
      <div class="row"><div class="ml">Склад:</div><div class="mv">${esc(args.warehouseName || "—")}</div></div>
      <div class="row"><div class="ml">Документов прихода:</div><div class="mv">${esc(String(args.docsTotal || 0))}</div></div>
      <div class="row"><div class="ml">Сформировано:</div><div class="mv">${esc(new Date().toLocaleString("ru-RU"))}</div></div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:34px">№</th>
          <th>Материал</th>
          <th style="width:90px">Ед.</th>
          <th style="width:120px">Принято</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
    <div class="signs">
      <div class="sign"><div class="who">Кладовщик</div><div class="line"></div><div class="fio"></div></div>
      <div class="sign"><div class="who">Зав. складом</div><div class="line"></div><div class="fio"></div></div>
    </div>
    <div class="page-footer"></div>
  </div>
</body></html>`;
}

export function buildWarehouseMaterialsReportHtml(args: {
  periodFrom?: string | null;
  periodTo?: string | null;
  orgName?: string | null;
  warehouseName?: string | null;
  objectName?: string | null;
  workName?: string | null;
  rows: WarehouseIssuedMaterialsRow[];
  docsTotal: number;
  docsByReq: number;
  docsWithoutReq: number;
}): string {
  const period =
    String(args.periodFrom ?? "").trim() || String(args.periodTo ?? "").trim()
      ? `${String(args.periodFrom ?? "").trim() || "—"} → ${String(args.periodTo ?? "").trim() || "—"}`
      : "Весь период";
  const body =
    args.rows.length > 0
      ? args.rows
          .map((row, index) => `
<tr>
  <td class="t-center">${index + 1}</td>
  <td>${esc(String(row.material_name ?? "").trim() || String(row.material_code ?? "").trim() || "-")}</td>
  <td class="t-center">${esc(uomRu(row.uom))}</td>
  <td class="t-right">${esc(fmtQty(row.sum_in_req))}</td>
  <td class="t-right">${esc(fmtQty(row.sum_free))}</td>
  <td class="t-right">${esc(fmtQty(row.sum_total))}</td>
</tr>`)
          .join("")
      : `<tr><td class="t-center" colspan="6"><i>Нет данных за период</i></td></tr>`;

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>Ведомость отпуска материалов</title>
<style>${cssForm29()}</style>
</head>
<body>
  <div class="page">
    <div class="h1">ВЕДОМОСТЬ ОТПУСКА МАТЕРИАЛОВ СО СКЛАДА</div>
    <div class="h2">за период ${esc(period)}</div>
    <div class="meta">
      <div class="row"><div class="ml">Организация:</div><div class="mv">${esc(args.orgName || "—")}</div></div>
      <div class="row"><div class="ml">Склад:</div><div class="mv">${esc(args.warehouseName || "—")}</div></div>
      <div class="row"><div class="ml">Объект:</div><div class="mv">${esc(String(args.objectName ?? "").trim() || "—")}</div></div>
      <div class="row"><div class="ml">Вид работ / участок:</div><div class="mv">${esc(String(args.workName ?? "").trim() || "—")}</div></div>
      <div class="row"><div class="ml">Позиций:</div><div class="mv">${esc(String(args.rows.length))}</div></div>
      <div class="row"><div class="ml">Дата формирования:</div><div class="mv">${esc(new Date().toLocaleString("ru-RU"))}</div></div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:34px">№</th>
          <th>Наименование материала</th>
          <th style="width:52px">Ед. изм.</th>
          <th style="width:110px">По заявкам</th>
          <th style="width:110px">Без заявки</th>
          <th style="width:90px">Всего</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
    <div class="totals">
      <div class="box"><span class="lbl">Выдач всего (документов):</span> ${esc(String(args.docsTotal || 0))}</div>
      <div class="box"><span class="lbl">Выдач по заявкам:</span> ${esc(String(args.docsByReq || 0))}</div>
      <div class="box"><span class="lbl">Выдач без заявки:</span> ${esc(String(args.docsWithoutReq || 0))}</div>
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
  periodFrom?: string | null;
  periodTo?: string | null;
  orgName?: string | null;
  warehouseName?: string | null;
  objectName?: string | null;
  rows: WarehouseObjectWorkRow[];
  docsTotal: number;
}): string {
  const period =
    String(args.periodFrom ?? "").trim() || String(args.periodTo ?? "").trim()
      ? `${String(args.periodFrom ?? "").trim() || "—"} → ${String(args.periodTo ?? "").trim() || "—"}`
      : "Весь период";
  const body =
    args.rows.length > 0
      ? args.rows
          .map((row, index) => `
<tr>
  <td class="t-center">${index + 1}</td>
  <td>${esc(String(row.object_name ?? "").trim() || "Без объекта")}</td>
  <td>${esc(String(row.work_name ?? "").trim() || "Без вида работ")}</td>
  <td class="t-right">${esc(String(Math.max(0, Math.round(nnum(row.docs_cnt)))) )}</td>
  <td class="small">${esc(String(row.recipients_text ?? "").trim() || "—").replace(/\n/g, "<br/>")}</td>
  <td class="t-right">${esc(String(Math.max(0, Math.round(nnum(row.uniq_materials)))) )}</td>
  <td class="small">${esc(String(row.top3_materials ?? "").trim() || "—").replace(/\n/g, "<br/>")}</td>
  <td class="t-right">${esc(String(Math.max(0, Math.round(nnum(row.req_cnt)))) )}</td>
  <td class="t-right">${esc(String(Math.max(0, Math.round(nnum(row.active_days)))) )}</td>
</tr>`)
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
      <div class="row"><div class="ml">Организация:</div><div class="mv">${esc(args.orgName || "—")}</div></div>
      <div class="row"><div class="ml">Склад:</div><div class="mv">${esc(args.warehouseName || "—")}</div></div>
      <div class="row"><div class="ml">Фильтр (объект):</div><div class="mv">${esc(String(args.objectName ?? "").trim() || "—")}</div></div>
      <div class="row"><div class="ml">Сформировано:</div><div class="mv">${esc(new Date().toLocaleString("ru-RU"))}</div></div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:34px">№</th>
          <th style="width:160px">Объект</th>
          <th>Вид работ</th>
          <th style="width:76px">Выдач</th>
          <th style="width:220px">Получатели</th>
          <th style="width:70px">Уник. мат</th>
          <th style="width:170px">Топ-3 материала</th>
          <th style="width:70px">Заявок</th>
          <th style="width:80px">Активн. дней</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
    <div class="totals">
      <div class="box"><span class="lbl">Итого позиций:</span> ${esc(String(args.rows.length))}</div>
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
