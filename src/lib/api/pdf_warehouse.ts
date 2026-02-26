// src/lib/api/pdf_warehouse.ts
import { openHtmlAsPdfUniversal } from "./pdf";

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
  String(s ?? "")
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

const isMissingName = (v: any): boolean => {
  const s = String(v ?? "").trim();
  if (!s) return true;
  if (/^[-\u2014\u2013\u2212]+$/.test(s)) return true;
  const l = s.toLowerCase();
  if (l === "null" || l === "undefined" || l === "n/a") return true;
  if (l.includes("РІС’")) return true; // mojibake dash placeholder
  return false;
};

const fmtDateTimeRu = (iso?: string | null) => {
  const s = String(iso ?? "").trim();
  if (!s) return "вЂ”";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString("ru-RU");
};

const pickIssueNo = (h: WarehouseIssueHead) => {
  const x = String(h.issue_no ?? "").trim() || String(h.base_no ?? "").trim();
  if (x) return x;
  const id = String(h.issue_id ?? "").trim();
  return id ? `ISSUE-${id}` : "ISSUE-вЂ”";
};

const pickKindLabel = (h: WarehouseIssueHead) => {
  const k = String(h.kind ?? "").toUpperCase().trim();
  if (k === "REQ") return "Р’С‹РґР°С‡Р° РїРѕ Р·Р°СЏРІРєРµ";
  if (k === "FREE") return "Р’С‹РґР°С‡Р° Р±РµР· Р·Р°СЏРІРєРё";
  const note = String(h.note ?? "").toLowerCase();
  if (note.includes("СЃРІРѕР±РѕРґРЅ")) return "Р’С‹РґР°С‡Р° Р±РµР· Р·Р°СЏРІРєРё";
  if (note.includes("Р·Р°СЏРІРє")) return "Р’С‹РґР°С‡Р° РїРѕ Р·Р°СЏРІРєРµ";
  return "Р’С‹РґР°С‡Р° СЃРѕ СЃРєР»Р°РґР°";
};

const pickBasis = (h: WarehouseIssueHead) => {
  const dn = String(h.display_no ?? "").trim();
  if (dn) return `Р—Р°СЏРІРєР°: ${dn}`;
  const note = String(h.note ?? "").trim();
  return note ? note : "вЂ”";
};

const kindByCodePrefix = (codeRaw: any): string => {
  const c = String(codeRaw ?? "").trim().toUpperCase();
  if (!c) return "РџРѕР·РёС†РёСЏ";
  if (c.startsWith("MAT-")) return "РњР°С‚РµСЂРёР°Р»";
  if (c.startsWith("TOOL-")) return "РРЅСЃС‚СЂСѓРјРµРЅС‚";
  if (c.startsWith("WT-") || c.startsWith("WORK-")) return "Р Р°Р±РѕС‚Р°";
  if (c.startsWith("SRV-") || c.startsWith("SERV-")) return "РЈСЃР»СѓРіР°";
  if (c.startsWith("KIT-")) return "РљРѕРјРїР»РµРєС‚";
  return "РџРѕР·РёС†РёСЏ";
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
  .page-footer:after{ content:"РЎС‚СЂ. " counter(page); }
`;

const pickLineUom = (ln: any) => {
  const u = String(ln?.uom ?? ln?.uom_id ?? "").trim();
  return u ? esc(uomRu(u)) : "вЂ”";
};

const uomRu = (u: any) => {
  const raw = String(u ?? "").trim();
  if (!raw) return "вЂ”";

  const s = raw
    .replace(/\s+/g, "")
    .replace("ВІ", "2")
    .replace("Ві", "3")
    .toLowerCase();

  if (s === "m") return "Рј";
  if (s === "m2") return "РјВІ";
  if (s === "m3") return "РјВі";

  if (raw === "Рј" || raw === "РјВІ" || raw === "РјВі") return raw;

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

  return "вЂ”";
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
    const mObj = n.match(/РѕР±СЉРµРєС‚:\s*([^В·\n\r]+)/i);
    const mWork = n.match(/РІРёРґ:\s*([^В·\n\r]+)/i);
    if (!objectGuess && mObj?.[1]) objectGuess = String(mObj[1]).trim();
    if (!workGuess && mWork?.[1]) workGuess = String(mWork[1]).trim();
  }

  const who = String(h.who ?? "").trim() || "вЂ”";
  const req = String(h.display_no ?? "").trim() || "вЂ”";

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
      : `<tr><td class="t-center" colspan="6"><i>РќРµС‚ СЃС‚СЂРѕРє</i></td></tr>`;

  const org = String(args.orgName ?? "").trim();
  const wh = String(args.warehouseName ?? "").trim();

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>${esc(issueNo)}</title>
<style>${cssForm29()}</style>
</head>
<body>
  <div class="page">
    <div class="h1">РќРђРљР›РђР”РќРђРЇ РќРђ РћРўРџРЈРЎРљ РњРђРўР•Р РРђР›РћР’ РЎРћ РЎРљР›РђР”Рђ</div>
    <div class="h2">${esc(kindLabel)}</div>

    <div class="meta">
      <div class="row"><div class="ml">РћСЂРіР°РЅРёР·Р°С†РёСЏ:</div><div class="mv">${esc(org || "вЂ”")}</div></div>
      <div class="row"><div class="ml">РЎРєР»Р°Рґ:</div><div class="mv">${esc(wh || "вЂ”")}</div></div>

      <div class="row"><div class="ml">РќРѕРјРµСЂ:</div><div class="mv">${esc(issueNo)}</div></div>
      <div class="row"><div class="ml">Р”Р°С‚Р°:</div><div class="mv">${esc(dt)}</div></div>

      <div class="row"><div class="ml">РћСЃРЅРѕРІР°РЅРёРµ:</div><div class="mv">${esc(basis)}</div></div>
      <div class="row"><div class="ml">Р—Р°СЏРІРєР°:</div><div class="mv">${esc(req)}</div></div>

      <div class="row"><div class="ml">РћР±СЉРµРєС‚:</div><div class="mv">${esc(objectGuess || "вЂ”")}</div></div>
      <div class="row"><div class="ml">Р’РёРґ СЂР°Р±РѕС‚:</div><div class="mv">${esc(workGuess || "вЂ”")}</div></div>

      <div class="row"><div class="ml">РџРѕР»СѓС‡Р°С‚РµР»СЊ:</div><div class="mv">${esc(who)}</div></div>
      <div class="row"><div class="ml">РџСЂРёРјРµС‡Р°РЅРёРµ:</div><div class="mv">${esc(note || "вЂ”")}</div></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:34px">в„–</th>
          <th>РќР°РёРјРµРЅРѕРІР°РЅРёРµ</th>
          <th style="width:52px">Р•Рґ.</th>
          <th style="width:88px">РџРѕ Р·Р°СЏРІРєРµ</th>
          <th style="width:88px">РЎРІРµСЂС…</th>
          <th style="width:88px">РС‚РѕРіРѕ</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="totals">
      <div class="box"><span class="lbl">РС‚РѕРіРѕ РѕС‚РїСѓС‰РµРЅРѕ:</span> ${esc(fmtQty(total))}</div>
      <div class="box"><span class="lbl">РџРѕ Р·Р°СЏРІРєРµ:</span> ${esc(fmtQty(inReq))}</div>
      <div class="box"><span class="lbl">РЎРІРµСЂС… Р·Р°СЏРІРєРё:</span> ${esc(fmtQty(over))}</div>
    </div>

    <div class="signs">
      <div class="sign"><div class="who">РљР»Р°РґРѕРІС‰РёРє</div><div class="line"></div><div class="fio"></div></div>
      <div class="sign"><div class="who">РџСЂРѕСЂР°Р± / РЅР°С‡. СѓС‡Р°СЃС‚РєР°</div><div class="line"></div><div class="fio"></div></div>
      <div class="sign"><div class="who">РџРѕР»СѓС‡Р°С‚РµР»СЊ (РњРћР›)</div><div class="line"></div><div class="fio">${esc(who)}</div></div>
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
  const period = from || to ? `${from || "вЂ”"} в†’ ${to || "вЂ”"}` : "Р’РµСЃСЊ РїРµСЂРёРѕРґ";

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
          const kindLabel = String(h.kind ?? "").toUpperCase() === "REQ" ? "РџРѕ Р·Р°СЏРІРєРµ" : "Р‘РµР· Р·Р°СЏРІРєРё";
          const who = String(h.who ?? "вЂ”");
          const req = String(h.display_no ?? "вЂ”");

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
      : `<tr><td class="t-center" colspan="9"><i>РќРµС‚ РІС‹РґР°С‡ Р·Р° РїРµСЂРёРѕРґ</i></td></tr>`;

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>Р РµРµСЃС‚СЂ РІС‹РґР°С‡ СЃРѕ СЃРєР»Р°РґР°</title>
<style>${cssForm29()}</style>
</head>
<body>
  <div class="page">
    <div class="h1">Р Р•Р•РЎРўР  Р’Р«Р”РђР§ РЎРћ РЎРљР›РђР”Рђ Р—Рђ РџР•Р РРћР”</div>
    <div class="h2">${esc(period)}</div>

    <div class="meta">
      <div class="row"><div class="ml">РћСЂРіР°РЅРёР·Р°С†РёСЏ:</div><div class="mv">${esc(org || "вЂ”")}</div></div>
      <div class="row"><div class="ml">РЎРєР»Р°Рґ:</div><div class="mv">${esc(wh || "вЂ”")}</div></div>
      <div class="row"><div class="ml">Р’СЃРµРіРѕ РІС‹РґР°С‡:</div><div class="mv">${esc(String(rows.length))}</div></div>
      <div class="row"><div class="ml">РЎС„РѕСЂРјРёСЂРѕРІР°РЅРѕ:</div><div class="mv">${esc(new Date().toLocaleString("ru-RU"))}</div></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:34px">в„–</th>
          <th style="width:120px">Р”Р°С‚Р°</th>
          <th style="width:110px">РќРѕРјРµСЂ</th>
          <th style="width:90px">РўРёРї</th>
          <th>РџРѕР»СѓС‡Р°С‚РµР»СЊ</th>
          <th style="width:120px">Р—Р°СЏРІРєР°</th>
          <th style="width:80px">Р’СЃРµРіРѕ</th>
          <th style="width:90px">РџРѕ Р·Р°СЏРІРєРµ</th>
          <th style="width:90px">РЎРІРµСЂС… Р·Р°СЏРІРєРё</th>
        </tr>
      </thead>
      <tbody>
        ${body}
      </tbody>
    </table>

    <div class="totals">
      <div class="box"><span class="lbl">РС‚РѕРіРѕ РѕС‚РїСѓС‰РµРЅРѕ:</span> ${esc(fmtQty(sumTotal))}</div>
      <div class="box"><span class="lbl">РС‚РѕРіРѕ РїРѕ Р·Р°СЏРІРєР°Рј:</span> ${esc(fmtQty(sumInReq))}</div>
      <div class="box"><span class="lbl">РС‚РѕРіРѕ СЃРІРµСЂС… Р·Р°СЏРІРѕРє:</span> ${esc(fmtQty(sumOver))}</div>
    </div>

    <div class="signs">
      <div class="sign"><div class="who">РљР»Р°РґРѕРІС‰РёРє</div><div class="line"></div><div class="fio"></div></div>
      <div class="sign"><div class="who">РџСЂРѕСЂР°Р± / РЅР°С‡. СѓС‡Р°СЃС‚РєР°</div><div class="line"></div><div class="fio"></div></div>
    </div>

    <div class="page-footer"></div>
  </div>
</body></html>`;
}

export async function exportWarehouseHtmlPdf(opts: { fileName: string; html: string }): Promise<string> {
  return await openHtmlAsPdfUniversal(opts.html, {
    fileName: opts.fileName,
    title: opts.fileName,
  } as any);
}

// ====== NEW REPORTS (period) вЂ” Materials + Objects/Works ======

export type IssuedMaterialsReportRow = {
  material_code?: string | null;
  material_name?: string | null; // вњ… РїСЂРёС…РѕРґРёС‚ СЂСѓСЃСЃРєРёРј РёР· Р‘Р” (wh_report_issued_materials_fast)
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

  // вњ… counters РёР· wh_report_issued_summary_fast
  docsTotal: number;
  docsByReq: number;
  docsWithoutReq: number;
}): string {
  const from = String(args.periodFrom ?? "").trim();
  const to = String(args.periodTo ?? "").trim();
  const period = from || to ? `${from || "вЂ”"} в†’ ${to || "вЂ”"}` : "Р’РµСЃСЊ РїРµСЂРёРѕРґ";

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
          const name = !isMissingName(rawName) ? rawName : (code || "РџРѕР·РёС†РёСЏ");
          const uom = uomRu(String(r.uom ?? "").trim()) || "вЂ”";

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
        ? `<tr><td class="t-center" colspan="6"><i>Р”Р°РЅРЅС‹Рµ РЅРµ Р·Р°РіСЂСѓР¶РµРЅС‹ (РµСЃС‚СЊ РІС‹РґР°С‡Рё: ${esc(String(docsTotal))}). РћР±РЅРѕРІРё РѕС‚С‡С‘С‚ РёР»Рё СЃСѓР·СЊ РїРµСЂРёРѕРґ.</i></td></tr>`
        : `<tr><td class="t-center" colspan="6"><i>РќРµС‚ РґР°РЅРЅС‹С… Р·Р° РїРµСЂРёРѕРґ</i></td></tr>`);

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>Р’РµРґРѕРјРѕСЃС‚СЊ РѕС‚РїСѓСЃРєР° РјР°С‚РµСЂРёР°Р»РѕРІ</title>
<style>${cssForm29()}</style>
</head>
<body>
  <div class="page">
    <div class="h1">Р’Р•Р”РћРњРћРЎРўР¬ РћРўРџРЈРЎРљРђ РњРђРўР•Р РРђР›РћР’ РЎРћ РЎРљР›РђР”Рђ</div>
    <div class="h2">Р·Р° РїРµСЂРёРѕРґ ${esc(period)}</div>

    <div class="meta">
      <div class="row"><div class="ml">РћСЂРіР°РЅРёР·Р°С†РёСЏ:</div><div class="mv">${esc(org || "вЂ”")}</div></div>
      <div class="row"><div class="ml">РЎРєР»Р°Рґ:</div><div class="mv">${esc(wh || "вЂ”")}</div></div>

      <div class="row"><div class="ml">РћР±СЉРµРєС‚:</div><div class="mv">${esc(obj || "вЂ”")}</div></div>
      <div class="row"><div class="ml">Р’РёРґ СЂР°Р±РѕС‚ / СѓС‡Р°СЃС‚РѕРє:</div><div class="mv">${esc(work || "вЂ”")}</div></div>

      <div class="row"><div class="ml">РџРѕР·РёС†РёР№:</div><div class="mv">${esc(String(positions))}</div></div>
      <div class="row"><div class="ml">Р”Р°С‚Р° С„РѕСЂРјРёСЂРѕРІР°РЅРёСЏ:</div><div class="mv">${esc(new Date().toLocaleString("ru-RU"))}</div></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:34px">в„–</th>
          <th>РќР°РёРјРµРЅРѕРІР°РЅРёРµ РјР°С‚РµСЂРёР°Р»Р°</th>
          <th style="width:52px">Р•Рґ. РёР·Рј.</th>
          <th style="width:110px">РћС‚РїСѓС‰РµРЅРѕ РїРѕ Р·Р°СЏРІРєР°Рј</th>
          <th style="width:110px">РћС‚РїСѓС‰РµРЅРѕ Р±РµР· Р·Р°СЏРІРєРё</th>
          <th style="width:90px">РћС‚РїСѓС‰РµРЅРѕ РІСЃРµРіРѕ</th>
        </tr>
      </thead>
      <tbody>
        ${body}
      </tbody>
    </table>

    <!-- вњ… 3 РРўРћР“Рћ РџРћ Р”РћРљРЈРњР•РќРўРђРњ (РёР· С‚РѕРіРѕ Р¶Рµ РёСЃС‚РѕС‡РЅРёРєР°, С‡С‚Рѕ Рё СЃС‚СЂРѕРєРё) -->
    <div class="totals">
      <div class="box"><span class="lbl">Р’С‹РґР°С‡ РІСЃРµРіРѕ (РґРѕРєСѓРјРµРЅС‚РѕРІ):</span> ${esc(String(docsTotal))}</div>
      <div class="box"><span class="lbl">Р’С‹РґР°С‡ РїРѕ Р·Р°СЏРІРєР°Рј (РґРѕРєСѓРјРµРЅС‚РѕРІ):</span> ${esc(String(docsByReq))}</div>
      <div class="box"><span class="lbl">Р’С‹РґР°С‡ Р±РµР· Р·Р°СЏРІРєРё (РґРѕРєСѓРјРµРЅС‚РѕРІ):</span> ${esc(String(docsWithoutReq))}</div>
    </div>

    <div class="signs">
      <div class="sign"><div class="who">РљР»Р°РґРѕРІС‰РёРє</div><div class="line"></div><div class="fio"></div></div>
      <div class="sign"><div class="who">РџСЂРѕСЂР°Р± / РЅР°С‡. СѓС‡Р°СЃС‚РєР°</div><div class="line"></div><div class="fio"></div></div>
      <div class="sign"><div class="who">РџРѕР»СѓС‡Р°С‚РµР»СЊ (РњРћР›)</div><div class="line"></div><div class="fio"></div></div>
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

  objectName?: string | null; // РµСЃР»Рё РІС‹Р±СЂР°РЅ С„РёР»СЊС‚СЂ
  rows: IssuedByObjectWorkReportRow[];

  docsTotal: number;
}): string {
  const from = String(args.periodFrom ?? "").trim();
  const to = String(args.periodTo ?? "").trim();
  const period = from || to ? `${from || "вЂ”"} в†’ ${to || "вЂ”"}` : "Р’РµСЃСЊ РїРµСЂРёРѕРґ";

  const org = String(args.orgName ?? "").trim();
  const wh = String(args.warehouseName ?? "").trim();
  const objFilter = String(args.objectName ?? "").trim();

  const rows = Array.isArray(args.rows) ? args.rows : [];
  const positions = rows.length;

  const body =
    rows.length > 0
      ? rows
        .map((r, idx) => {
          const obj = String(r.object_name ?? "").trim() || "Р‘РµР· РѕР±СЉРµРєС‚Р°";
          const work = String(r.work_name ?? "").trim() || "Р‘РµР· РІРёРґР° СЂР°Р±РѕС‚";

          const docs = Math.max(0, Math.round(nnum(r.docs_cnt)));
          const reqCnt = Math.max(0, Math.round(nnum(r.req_cnt)));
          const days = Math.max(0, Math.round(nnum(r.active_days)));
          const uniq = Math.max(0, Math.round(nnum(r.uniq_materials)));

          const recText = String(r.recipients_text ?? "").trim() || "вЂ”";
          const top3 = String(r.top3_materials ?? "").trim() || "вЂ”";

          // РїРµСЂРµРЅРѕСЃС‹ СЃС‚СЂРѕРє РІ HTML
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
      : `<tr><td class="t-center" colspan="9"><i>РќРµС‚ РґР°РЅРЅС‹С… Р·Р° РїРµСЂРёРѕРґ</i></td></tr>`;

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>РћС‚С‡С‘С‚ РїРѕ РѕР±СЉРµРєС‚Р°Рј Рё РІРёРґР°Рј СЂР°Р±РѕС‚</title>
<style>${cssForm29()}</style>
</head>
<body>
  <div class="page">
    <div class="h1">РћРўР§РЃРў РџРћ РћР‘РЄР•РљРўРђРњ / Р’РР”РђРњ Р РђР‘РћРў Р—Рђ РџР•Р РРћР”</div>
    <div class="h2">${esc(period)}</div>

    <div class="meta">
      <div class="row"><div class="ml">РћСЂРіР°РЅРёР·Р°С†РёСЏ:</div><div class="mv">${esc(org || "вЂ”")}</div></div>
      <div class="row"><div class="ml">РЎРєР»Р°Рґ:</div><div class="mv">${esc(wh || "вЂ”")}</div></div>

      <div class="row"><div class="ml">Р¤РёР»СЊС‚СЂ (РѕР±СЉРµРєС‚):</div><div class="mv">${esc(objFilter || "вЂ”")}</div></div>
      <div class="row"><div class="ml">РЎС„РѕСЂРјРёСЂРѕРІР°РЅРѕ:</div><div class="mv">${esc(new Date().toLocaleString("ru-RU"))}</div></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:34px">в„–</th>
          <th style="width:160px">РћР±СЉРµРєС‚</th>
          <th>Р’РёРґ СЂР°Р±РѕС‚</th>
          <th style="width:76px">Р’С‹РґР°С‡</th>
          <th style="width:220px">РџРѕР»СѓС‡Р°С‚РµР»Рё (РїРѕ Р·Р°СЏРІРєРµ/Р±РµР·)</th>
          <th style="width:70px">РЈРЅРёРє. РјР°С‚</th>
          <th style="width:170px">РўРѕРї-3 РјР°С‚РµСЂРёР°Р»Р°</th>
          <th style="width:70px">Р—Р°СЏРІРѕРє</th>
          <th style="width:80px">РђРєС‚РёРІРЅ. РґРЅРµР№</th>
        </tr>
      </thead>
      <tbody>
        ${body}
      </tbody>
    </table>

    <div class="totals">
      <div class="box"><span class="lbl">РС‚РѕРіРѕ РїРѕР·РёС†РёР№:</span> ${esc(String(positions))}</div>
      <div class="box"><span class="lbl">РС‚РѕРіРѕ РІС‹РґР°С‡ (РґРѕРєСѓРјРµРЅС‚РѕРІ):</span> ${esc(String(args.docsTotal || 0))}</div>
    </div>

    <div class="signs">
      <div class="sign"><div class="who">РљР»Р°РґРѕРІС‰РёРє</div><div class="line"></div><div class="fio"></div></div>
      <div class="sign"><div class="who">РџСЂРѕСЂР°Р± / РЅР°С‡. СѓС‡Р°СЃС‚РєР°</div><div class="line"></div><div class="fio"></div></div>
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
  const period = from || to ? `${from || "вЂ”"} в†’ ${to || "вЂ”"}` : "Р’РµСЃСЊ РїРµСЂРёРѕРґ";

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
          const who = String(h.who ?? "вЂ”");

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
      : `<tr><td class="t-center" colspan="5"><i>РќРµС‚ РїСЂРёС…РѕРґРѕРІ Р·Р° РїРµСЂРёРѕРґ</i></td></tr>`;

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>Р РµРµСЃС‚СЂ РїСЂРёС…РѕРґР° РЅР° СЃРєР»Р°Рґ</title>
<style>${cssForm29()}</style>
</head>
<body>
  <div class="page">
    <div class="h1">Р Р•Р•РЎРўР  РџР РРҐРћР”Рђ РќРђ РЎРљР›РђР” Р—Рђ РџР•Р РРћР”</div>
    <div class="h2">${esc(period)}</div>

    <div class="meta">
      <div class="row"><div class="ml">РћСЂРіР°РЅРёР·Р°С†РёСЏ:</div><div class="mv">${esc(org || "вЂ”")}</div></div>
      <div class="row"><div class="ml">РЎРєР»Р°Рґ:</div><div class="mv">${esc(wh || "вЂ”")}</div></div>
      <div class="row"><div class="ml">Р’СЃРµРіРѕ РїСЂРёС…РѕРґРѕРІ:</div><div class="mv">${esc(String(rows.length))}</div></div>
      <div class="row"><div class="ml">РЎС„РѕСЂРјРёСЂРѕРІР°РЅРѕ:</div><div class="mv">${esc(new Date().toLocaleString("ru-RU"))}</div></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:34px">в„–</th>
          <th style="width:140px">Р”Р°С‚Р°</th>
          <th style="width:140px">РќРѕРјРµСЂ (PR)</th>
          <th>РљР»Р°РґРѕРІС‰РёРє</th>
          <th style="width:110px">РџСЂРёРЅСЏС‚Рѕ</th>
        </tr>
      </thead>
      <tbody>
        ${body}
      </tbody>
    </table>

    <div class="totals">
      <div class="box"><span class="lbl">РС‚РѕРіРѕ РїСЂРёРЅСЏС‚Рѕ:</span> ${esc(fmtQty(sumTotal))}</div>
    </div>

    <div class="signs">
      <div class="sign"><div class="who">РљР»Р°РґРѕРІС‰РёРє</div><div class="line"></div><div class="fio"></div></div>
      <div class="sign"><div class="who">Р—Р°РІ. СЃРєР»Р°РґРѕРј</div><div class="line"></div><div class="fio"></div></div>
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
  const who = String(inc.who ?? inc.warehouseman_fio ?? "вЂ”");
  const note = String(inc.note ?? "вЂ”");

  const total = lines.reduce((s, x) => s + nnum(x.qty_received ?? x.qty), 0);

  const rowsHtml = lines.length > 0 ? lines.map((ln, idx) => {
    const rawName = String(ln.name_ru ?? ln.name ?? ln.material_name ?? "").trim();
    const code = String(ln.code || "").trim();
    const hasName = !isMissingName(rawName);
    const name = hasName ? rawName : (code || "РџРѕР·РёС†РёСЏ");

    const uom = uomRu(ln.uom_id || ln.uom);
    const qty = nnum(ln.qty_received ?? ln.qty);
    const prItem = String(ln.purchase_item_id || "вЂ”");

    return `
<tr>
  <td class="t-center">${idx + 1}</td>
  <td>
    ${esc(name)}
    ${prItem !== "вЂ”" ? `<div class="small muted">ID: ${esc(prItem)}</div>` : ""}
  </td>
  <td class="t-center">${esc(uom)}</td>
  <td class="t-right">${esc(fmtQty(qty))}</td>
</tr>`;
  }).join("") : `<tr><td colspan="4" class="t-center">РќРµС‚ РґР°РЅРЅС‹С… Рѕ РїРѕР·РёС†РёСЏС…</td></tr>`;


  const org = String(args.orgName ?? "").trim();
  const wh = String(args.warehouseName ?? "").trim();

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>${esc(docNo)}</title>
<style>${cssForm29()}</style>
</head>
<body>
  <div class="page">
    <div class="h1">РџР РРҐРћР”РќР«Р™ РћР Р”Р•Р  (РЎРљР›РђР”)</div>
    <div class="h2">${esc(docNo)}</div>

    <div class="meta">
      <div class="row"><div class="ml">РћСЂРіР°РЅРёР·Р°С†РёСЏ:</div><div class="mv">${esc(org || "вЂ”")}</div></div>
      <div class="row"><div class="ml">РЎРєР»Р°Рґ:</div><div class="mv">${esc(wh || "вЂ”")}</div></div>

      <div class="row"><div class="ml">РќРѕРјРµСЂ PR:</div><div class="mv">${esc(docNo)}</div></div>
      <div class="row"><div class="ml">Р”Р°С‚Р° РїСЂРёС…РѕРґР°:</div><div class="mv">${esc(dt)}</div></div>

      <div class="row"><div class="ml">РљР»Р°РґРѕРІС‰РёРє:</div><div class="mv">${esc(who)}</div></div>
      <div class="row"><div class="ml">РџСЂРёРјРµС‡Р°РЅРёРµ:</div><div class="mv">${esc(note)}</div></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:34px">в„–</th>
          <th>РќР°РёРјРµРЅРѕРІР°РЅРёРµ</th>
          <th style="width:52px">Р•Рґ.</th>
          <th style="width:110px">РџСЂРёРЅСЏС‚Рѕ</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="totals">
      <div class="box"><span class="lbl">РС‚РѕРіРѕ РїСЂРёРЅСЏС‚Рѕ:</span> ${esc(fmtQty(total))}</div>
    </div>

    <div class="signs">
      <div class="sign"><div class="who">РљР»Р°РґРѕРІС‰РёРє</div><div class="line"></div><div class="fio">${esc(who)}</div></div>
      <div class="sign"><div class="who">РЎРґР°Р» (РџРѕСЃС‚Р°РІС‰РёРє/Р’РѕРґРёС‚РµР»СЊ)</div><div class="line"></div><div class="fio"></div></div>
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
  const period = from || to ? `${from || "вЂ”"} в†’ ${to || "вЂ”"}` : "Р’РµСЃСЊ РїРµСЂРёРѕРґ";

  const org = String(args.orgName ?? "").trim();
  const wh = String(args.warehouseName ?? "").trim();

  const rows = Array.isArray(args.rows) ? args.rows : [];
  const body = rows.length > 0
    ? rows.map((r, idx) => {
      const rawName = String(r.material_name ?? "").trim();
      const code = String(r.material_code ?? "").trim();
      const name = !isMissingName(rawName) ? rawName : (code || "РџРѕР·РёС†РёСЏ");
      const uom = uomRu(String(r.uom ?? "").trim()) || "вЂ”";
      const total = fmtQty(r.sum_total);

      return `
<tr>
  <td class="t-center">${idx + 1}</td>
  <td>${esc(name)}</td>
  <td class="t-center">${esc(uom)}</td>
  <td class="t-right">${esc(total)}</td>
</tr>`;
    }).join("")
    : `<tr><td class="t-center" colspan="4"><i>РќРµС‚ РґР°РЅРЅС‹С… Р·Р° РїРµСЂРёРѕРґ</i></td></tr>`;

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>Р’РµРґРѕРјРѕСЃС‚СЊ РїСЂРёС…РѕРґР° РјР°С‚РµСЂРёР°Р»РѕРІ</title>
<style>${cssForm29()}</style>
</head>
<body>
  <div class="page">
    <div class="h1">Р’Р•Р”РћРњРћРЎРўР¬ РџР РРҐРћР”Рђ РњРђРўР•Р РРђР›РћР’ РќРђ РЎРљР›РђР”</div>
    <div class="h2">Р·Р° РїРµСЂРёРѕРґ ${esc(period)}</div>

    <div class="meta">
      <div class="row"><div class="ml">РћСЂРіР°РЅРёР·Р°С†РёСЏ:</div><div class="mv">${esc(org || "вЂ”")}</div></div>
      <div class="row"><div class="ml">РЎРєР»Р°Рґ:</div><div class="mv">${esc(wh || "вЂ”")}</div></div>

      <div class="row"><div class="ml">РџРѕР·РёС†РёР№:</div><div class="mv">${esc(String(rows.length))}</div></div>
      <div class="row"><div class="ml">Р”Р°С‚Р° С„РѕСЂРјРёСЂРѕРІР°РЅРёСЏ:</div><div class="mv">${esc(new Date().toLocaleString("ru-RU"))}</div></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:34px">в„–</th>
          <th>РќР°РёРјРµРЅРѕРІР°РЅРёРµ РјР°С‚РµСЂРёР°Р»Р°</th>
          <th style="width:52px">Р•Рґ. РёР·Рј.</th>
          <th style="width:110px">РџСЂРёРЅСЏС‚Рѕ РІСЃРµРіРѕ</th>
        </tr>
      </thead>
      <tbody>
        ${body}
      </tbody>
    </table>

    <div class="totals">
      <div class="box"><span class="lbl">РџСЂРёС…РѕРґРѕРІ РІСЃРµРіРѕ (РґРѕРєСѓРјРµРЅС‚РѕРІ):</span> ${esc(String(args.docsTotal))}</div>
    </div>

    <div class="signs">
      <div class="sign"><div class="who">РљР»Р°РґРѕРІС‰РёРє</div><div class="line"></div><div class="fio"></div></div>
      <div class="sign"><div class="who">Р—Р°РІ. СЃРєР»Р°РґРѕРј</div><div class="line"></div><div class="fio"></div></div>
    </div>

    <div class="page-footer"></div>
  </div>
</body></html>`;
}

