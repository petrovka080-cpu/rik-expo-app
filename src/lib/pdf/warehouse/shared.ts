// src/lib/pdf/pdf.warehouse.ts
import { normalizeRuText, normalizeRuTextForHtml } from "../../text/encoding";
import { renderPdfHtmlToUri } from "../pdf.runner";

export type WarehouseScalar = number | string | null | undefined;

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

  qty_total?: unknown;
  qty_in_req?: unknown;
  qty_over?: unknown;

  object_name?: string | null;
  work_name?: string | null;
};

export type WarehouseIssueLine = {
  issue_id: number | string;
  rik_code?: string | null;
  uom?: string | null;
  name_human?: string | null;

  qty_total?: unknown;
  qty_in_req?: unknown;
  qty_over?: unknown;

  uom_id?: string | null;
  item_name_ru?: string | null;
  item_name?: string | null;
  name?: string | null;
  title?: string | null;
};

type WarehouseLineLike = Record<string, unknown> | null | undefined;

export const esc = (value: unknown) =>
  String(normalizeRuText(String(value ?? "")))
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const nnum = (value: unknown): number => {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const s0 = String(value).trim();
  if (!s0) return 0;
  const s = s0.replace(/\s+/g, "").replace(/,/g, ".").replace(/[^\d.\-]/g, "");
  const parts = s.split(".");
  const normalized = parts.length <= 2 ? s : `${parts[0]}.${parts.slice(1).join("")}`;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

export const fmtQty = (value: unknown) =>
  nnum(value).toLocaleString("ru-RU", { maximumFractionDigits: 3 });

export const fmtDateTimeRu = (iso?: string | null) => {
  const s = String(iso ?? "").trim();
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString("ru-RU");
};

export const pickIssueNo = (h: WarehouseIssueHead) => {
  const x = String(h.issue_no ?? "").trim() || String(h.base_no ?? "").trim();
  if (x) return x;
  const id = String(h.issue_id ?? "").trim();
  return id ? `ISSUE-${id}` : "ISSUE-—";
};

export const pickKindLabel = (h: WarehouseIssueHead) => {
  const k = String(h.kind ?? "").toUpperCase().trim();
  if (k === "REQ") return "Выдача по заявке";
  if (k === "FREE") return "Выдача без заявки";
  const note = String(h.note ?? "").toLowerCase();
  if (note.includes("свободн")) return "Выдача без заявки";
  if (note.includes("заявк")) return "Выдача по заявке";
  return "Выдача со склада";
};

export const pickBasis = (h: WarehouseIssueHead) => {
  const dn = String(h.display_no ?? "").trim();
  if (dn) return `Заявка: ${dn}`;
  const note = String(h.note ?? "").trim();
  return note ? note : "—";
};

export const kindByCodePrefix = (codeRaw: unknown): string => {
  const c = String(codeRaw ?? "").trim().toUpperCase();
  if (!c) return "Позиция";
  if (c.startsWith("MAT-")) return "Материал";
  if (c.startsWith("TOOL-")) return "Инструмент";
  if (c.startsWith("WT-") || c.startsWith("WORK-")) return "Работа";
  if (c.startsWith("SRV-") || c.startsWith("SERV-")) return "Услуга";
  if (c.startsWith("KIT-")) return "Комплект";
  return "Позиция";
};

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

export const pickLineUom = (line: WarehouseLineLike) => {
  const u = String(line?.uom ?? line?.uom_id ?? "").trim();
  return u ? esc(uomRu(u)) : "—";
};

export const uomRu = (uom: unknown) => {
  const raw = String(uom ?? "").trim();
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

export const pickLineNameRu = (line: WarehouseLineLike, nameByCode?: Record<string, string>) => {
  const direct =
    String(line?.name_human ?? "").trim() ||
    String(line?.item_name_ru ?? "").trim() ||
    String(line?.item_name ?? "").trim() ||
    String(line?.name ?? "").trim() ||
    String(line?.title ?? "").trim();

  if (direct) return esc(direct);

  const code = String(line?.rik_code ?? "").trim().toUpperCase();
  const fromMap = code && nameByCode ? String(nameByCode[code] ?? "").trim() : "";
  if (fromMap) return esc(fromMap);

  return "—";
};

export async function exportWarehouseHtmlPdf(opts: { fileName: string; html: string }): Promise<string> {
  return renderPdfHtmlToUri({
    html: normalizeRuTextForHtml(opts.html, {
      documentType: "warehouse_document",
      source: "warehouse_html_export",
    }),
    documentType: "warehouse_document",
    source: "warehouse_html_export",
  });
}
