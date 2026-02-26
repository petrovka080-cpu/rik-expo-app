// src/lib/api/pdf_warehouse.ts
import { openHtmlAsPdfUniversal } from "./pdf";
import { normalizeRuText } from "../text/encoding";

export type WarehouseIssueHead = {
  issue_id: number | string;
  issue_no?: string | null;
  base_no?: string | null;
  event_dt?: string | null;

  kind?: "FREE" | "REQ" | string | null;
  who?: string | null;
  note?: string | null;

  request_id?: string | null;
  display_no?: string | null;

  qty_total?: any;
  qty_in_req?: any;
  qty_over?: any;

  object_name?: string | null;
  work_name?: string | null;
};

export type WarehouseIssueLine = {
  issue_id: number | string;
  rik_code?: string | null;
  uom?: string | null;
  name_human?: string | null;

  qty_total?: any;
  qty_in_req?: any;
  qty_over?: any;

  uom_id?: string | null;
  item_name_ru?: string | null;
  item_name?: string | null;
  name?: string | null;
  title?: string | null;
};

const esc = (s: any) =>
  String(normalizeRuText(String(s ?? "")))
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const nnum = (v: any): number => {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s0 = String(v).trim();
  if (!s0) return 0;
  const s = s0.replace(/\s+/g, "").replace(/,/g, ".").replace(/[^\d.\-]/g, "");
  const parts = s.split(".");
  const normalized = parts.length <= 2 ? s : `${parts[0]}.${parts.slice(1).join("")}`;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

const fmtQty = (v: any) => nnum(v).toLocaleString("ru-RU", { maximumFractionDigits: 3 });

const fmtDateTimeRu = (iso?: string | null) => {
  const s = String(iso ?? "").trim();
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString("ru-RU");
};

const pickIssueNo = (h: WarehouseIssueHead) => {
  const x = String(h.issue_no ?? "").trim() || String(h.base_no ?? "").trim();
  if (x) return x;
  const id = String(h.issue_id ?? "").trim();
  return id ? `ISSUE-${id}` : "ISSUE-—";
};

const pickKindLabel = (h: WarehouseIssueHead) => {
  const k = String(h.kind ?? "").toUpperCase().trim();
  if (k === "REQ") return "Выдача по заявке";
  if (k === "FREE") return "Выдача без заявки";
  const note = String(h.note ?? "").toLowerCase();
  if (note.includes("свободн")) return "Выдача без заявки";
  if (note.includes("заявк")) return "Выдача по заявке";
  return "Выдача со склада";
};

const pickBasis = (h: WarehouseIssueHead) => {
  const dn = String(h.display_no ?? "").trim();
  if (dn) return `Заявка: ${dn}`;
  const note = String(h.note ?? "").trim();
  return note ? note : "—";
};

const kindByCodePrefix = (codeRaw: any): string => {
  const c = String(codeRaw ?? "").trim().toUpperCase();
  if (!c) return "Позиция";
  if (c.startsWith("MAT-")) return "Материал";
  if (c.startsWith("TOOL-")) return "Инструмент";
  if (c.startsWith("WT-") || c.startsWith("WORK-")) return "Работа";
  if (c.startsWith("SRV-") || c.startsWith("SERV-")) return "Услуга";
  if (c.startsWith("KIT-")) return "Комплект";
  return "Позиция";
};

const cssForm29 = () => `
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

const pickLineUom = (ln: any) => {
  const u = String(ln?.uom ?? ln?.uom_id ?? "").trim();
  return u ? esc(uomRu(u)) : "—";
};

const uomRu = (u: any) => {
  const raw = String(u ?? "").trim();
  if (!raw) return "—";

  const s = raw
    .replace(/\s+/g, "")
    .replace("²", "2")
    .replace("³", "3")
    .toLowerCase();

  if (s === "m") return "м";
  if (s === "m2") return "м²";
  if (s === "m3") return "м³";

  if (raw === "м" || raw === "м²" || raw === "м³") return raw;

  return raw;
};

const pickLineNameRu = (ln: any, nameByCode?: Record<string, string>) => {
  const direct =
    String(ln?.name_human ?? "").trim() ||
    String(ln?.item_name_ru ?? "").trim() ||
    String(ln?.item_name ?? "").trim() ||
    String(ln?.name ?? "").trim() ||
    String(ln?.title ?? "").trim();

  if (direct) return esc(direct);

  const code = String(ln?.rik_code ?? "").trim().toUpperCase();
  const fromMap = code && nameByCode ? String(nameByCode[code] ?? "").trim() : "";
  if (fromMap) return esc(fromMap);

  return "—";
};

export function buildWarehouseIssueFormHtml(args: {
  head: WarehouseIssueHead;
  lines: WarehouseIssueLine[];
  orgName?: string;
  warehouseName?: string;
  nameByCode?: Record<string, string>;
}): string {
  const h = args.head;
  const lines = Array.isArray(args.lines) ? args.lines : [];

  const issueNo = pickIssueNo(h);
  const dt = fmtDateTimeRu(h.event_dt);
  const kindLabel = pickKindLabel(h);
  const basis = pickBasis(h);

  const note = String(h.note ?? "").trim();
  let objectGuess = String(h.object_name ?? "").trim();
  let workGuess = String(h.work_name ?? "").trim();
  if (!objectGuess || !workGuess) {
    const n = note;
    const mObj = n.match(/объект:\s*([^·\n\r]+)/i);
    const mWork = n.match(/вид:\s*([^·\n\r]+)/i);
    if (!objectGuess && mObj?.[1]) objectGuess = String(mObj[1]).trim();
    if (!workGuess && mWork?.[1]) workGuess = String(mWork[1]).trim();
  }

  const who = String(h.who ?? "").trim() || "—";
  const req = String(h.display_no ?? "").trim() || "—";

  const total = nnum(h.qty_total);
  const inReq = nnum(h.qty_in_req);
  const over = nnum(h.qty_over);

  const rowsHtml =
    lines.length > 0
      ? lines
        .map((ln, idx) => {
          const nameRu = pickLineNameRu(ln, args.nameByCode);
          const kind = kindByCodePrefix((ln as any)?.rik_code);
          const uom = pickLineUom(ln);

          const t = nnum((ln as any).qty_total);
          const r = nnum((ln as any).qty_in_req);
          const o = nnum((ln as any).qty_over);

          return `
<tr>
  <td class="t-center">${idx + 1}</td>
  <td>
    ${nameRu}
    <div class="small muted">${esc(kind)}</div>
  </td>
  <td class="t-center">${uom}</td>
  <td class="t-right">${esc(fmtQty(r))}</td>
  <td class="t-right">${esc(fmtQty(o))}</td>
  <td class="t-right">${esc(fmtQty(t))}</td>
</tr>`;
        })
        .join("")
      : `<tr><td class="t-center" colspan="6"><i>Нет строк</i></td></tr>`;

  const org = String(args.orgName ?? "").trim();
  const wh = String(args.warehouseName ?? "").trim();

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>${esc(issueNo)}</title>
<style>${cssForm29()}</style>
</head>
<body>
  <div class="page">
    <div class="h1">НАКЛАДНАЯ НА ОТПУСК МАТЕРИАЛОВ СО СКЛАДА</div>
    <div class="h2">${esc(kindLabel)}</div>

    <div class="meta">
      <div class="row"><div class="ml">Организация:</div><div class="mv">${esc(org || "—")}</div></div>
      <div class="row"><div class="ml">Склад:</div><div class="mv">${esc(wh || "—")}</div></div>

      <div class="row"><div class="ml">Номер:</div><div class="mv">${esc(issueNo)}</div></div>
      <div class="row"><div class="ml">Дата:</div><div class="mv">${esc(dt)}</div></div>

      <div class="row"><div class="ml">Основание:</div><div class="mv">${esc(basis)}</div></div>
      <div class="row"><div class="ml">Заявка:</div><div class="mv">${esc(req)}</div></div>

      <div class="row"><div class="ml">Объект:</div><div class="mv">${esc(objectGuess || "—")}</div></div>
      <div class="row"><div class="ml">Вид работ:</div><div class="mv">${esc(workGuess || "—")}</div></div>

      <div class="row"><div class="ml">Получатель:</div><div class="mv">${esc(who)}</div></div>
      <div class="row"><div class="ml">Примечание:</div><div class="mv">${esc(note || "—")}</div></div>
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
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="totals">
      <div class="box"><span class="lbl">Итого отпущено:</span> ${esc(fmtQty(total))}</div>
      <div class="box"><span class="lbl">По заявке:</span> ${esc(fmtQty(inReq))}</div>
      <div class="box"><span class="lbl">Сверх заявки:</span> ${esc(fmtQty(over))}</div>
    </div>

    <div class="signs">
      <div class="sign"><div class="who">Кладовщик</div><div class="line"></div><div class="fio"></div></div>
      <div class="sign"><div class="who">Прораб / нач. участка</div><div class="line"></div><div class="fio"></div></div>
      <div class="sign"><div class="who">Получатель (МОЛ)</div><div class="line"></div><div class="fio">${esc(who)}</div></div>
      <div></div>
    </div>

    <div class="page-footer"></div>
  </div>
</body></html>`;
}

export function buildWarehouseIssuesRegisterHtml(args: {
  periodFrom?: string;
  periodTo?: string;
  issues: WarehouseIssueHead[];
  orgName?: string;
  warehouseName?: string;
}): string {
  const from = String(args.periodFrom ?? "").trim();
  const to = String(args.periodTo ?? "").trim();
  const period = from || to ? `${from || "—"} → ${to || "—"}` : "Весь период";

  const rows = Array.isArray(args.issues) ? args.issues : [];

  const sumTotal = rows.reduce((s, x) => s + nnum(x.qty_total), 0);
  const sumInReq = rows.reduce((s, x) => s + nnum(x.qty_in_req), 0);
  const sumOver = rows.reduce((s, x) => s + nnum(x.qty_over), 0);

  const org = String(args.orgName ?? "").trim();
  const wh = String(args.warehouseName ?? "").trim();

  const body =
    rows.length > 0
      ? rows
        .map((h, idx) => {
          const dt = fmtDateTimeRu(h.event_dt);
          const issueNo = pickIssueNo(h);
          const kindLabel = String(h.kind ?? "").toUpperCase() === "REQ" ? "По заявке" : "Без заявки";
          const who = String(h.who ?? "—");
          const req = String(h.display_no ?? "—");

          const total = fmtQty(h.qty_total);
          const inReq = fmtQty(h.qty_in_req);
          const over = fmtQty(h.qty_over);

          return `
<tr>
  <td class="t-center">${idx + 1}</td>
  <td class="t-center">${esc(dt)}</td>
  <td class="t-center">${esc(issueNo)}</td>
  <td class="t-center">${esc(kindLabel)}</td>
  <td>${esc(who)}</td>
  <td class="t-center">${esc(req)}</td>
  <td class="t-right">${esc(total)}</td>
  <td class="t-right">${esc(inReq)}</td>
  <td class="t-right">${esc(over)}</td>
</tr>`;
        })
        .join("")
      : `<tr><td class="t-center" colspan="9"><i>Нет выдач за период</i></td></tr>`;

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>Реестр выдач со склада</title>
<style>${cssForm29()}</style>
</head>
<body>
  <div class="page">
    <div class="h1">РЕЕСТР ВЫДАЧ СО СКЛАДА ЗА ПЕРИОД</div>
    <div class="h2">${esc(period)}</div>

    <div class="meta">
      <div class="row"><div class="ml">Организация:</div><div class="mv">${esc(org || "—")}</div></div>
      <div class="row"><div class="ml">Склад:</div><div class="mv">${esc(wh || "—")}</div></div>
      <div class="row"><div class="ml">Всего выдач:</div><div class="mv">${esc(String(rows.length))}</div></div>
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
      <tbody>
        ${body}
      </tbody>
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

export async function exportWarehouseHtmlPdf(opts: { fileName: string; html: string }): Promise<string> {
  return await openHtmlAsPdfUniversal(normalizeRuText(opts.html), {
    fileName: opts.fileName,
    title: opts.fileName,
  } as any);
}

// ====== NEW REPORTS (period) — Materials + Objects/Works ======

export type IssuedMaterialsReportRow = {
  material_code?: string | null;
  material_name?: string | null; // ✅ приходит русским из БД (wh_report_issued_materials_fast)
  uom?: string | null;

  sum_in_req?: any;
  sum_free?: any;
  sum_over?: any;
  sum_total?: any;

  docs_cnt?: any;
  lines_cnt?: any;
};

export type IssuedByObjectWorkReportRow = {
  object_id?: string | null;
  object_name?: string | null;
  work_name?: string | null;

  docs_cnt?: any;
  req_cnt?: any;
  active_days?: any;

  uniq_materials?: any;

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

export function buildWarehouseIncomingRegisterHtml(args: {
  periodFrom?: string;
  periodTo?: string;
  items: any[];
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
          const docNo = h.display_no || `PR-${h.incoming_id?.slice(0, 8)}`;
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
  incoming: any;
  lines: any[];
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
  rows: any[]; // IncomingMaterialsFastRow[]
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
