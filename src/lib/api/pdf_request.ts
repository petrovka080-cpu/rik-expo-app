// src/lib/api/pdf_request.ts
import { supabase } from "../supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";
import { openHtmlAsPdfUniversal } from "./pdf";

export async function resolveRequestLabel(rid: string | number): Promise<string> {
  const id = String(rid).trim();
  if (!id) return "#—";
  try {
    const { data, error } = await supabase
      .from("requests" as any)
      .select("display_no")
      .eq("id", id)
      .maybeSingle();
    if (!error && data?.display_no) {
      const dn = String(data.display_no).trim();
      if (dn) return dn;
    }
  } catch (e) {
    console.warn("[resolveRequestLabel]", (e as any)?.message ?? e);
  }
  return /^\d+$/.test(id) ? `#${id}` : `#${id.slice(0, 8)}`;
}

export async function batchResolveRequestLabels(
  ids: Array<string | number>
): Promise<Record<string, string>> {
  const uniq = Array.from(new Set(ids.map((x) => String(x ?? "").trim()).filter(Boolean)));
  if (!uniq.length) return {};
  try {
    const { data, error } = await supabase
      .from("requests" as any)
      .select("id, display_no")
      .in("id", uniq);
    if (error) throw error;
    const m: Record<string, string> = {};
    for (const r of data ?? []) {
      const id = String((r as any).id ?? "");
      const dn = String((r as any).display_no ?? "").trim();
      if (id && dn) m[id] = dn;
    }
    return m;
  } catch {
    return {};
  }
}

function stripContextFromNote(raw: any) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  // убираем типичный контекст, который дублирует шапку
  // (если он случайно попал в note)
  const lines = s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);

  const filtered = lines.filter((ln) => {
    const t = ln.toLowerCase();
    if (t.startsWith("объект:")) return false;
    if (t.startsWith("этаж") || t.startsWith("этаж/") || t.startsWith("этаж /")) return false;
    if (t.startsWith("система:")) return false;
    if (t.startsWith("зона:") || t.startsWith("зона /") || t.startsWith("зона/")) return false;
    if (t.startsWith("участок:")) return false;
    return true;
  });


  const oneLine = filtered.join("\n");
  const killed = oneLine
    .replace(/объект\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/этаж\s*\/?\s*уровень\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/система\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/зона\s*\/?\s*участок\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return killed;
}

export async function buildRequestPdfHtml(requestId: number | string): Promise<string> {
  const client: SupabaseClient = supabase;

  const rid = String(requestId);
  const idFilter: number | string = /^\d+$/.test(rid) ? Number(rid) : rid;
  const locale = "ru-RU";

  const esc = (s: any) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const fmtQty = (value: any) => {
    const num = Number(String(value ?? "").replace(",", "."));
    if (!Number.isFinite(num)) return "";
    return num.toLocaleString(locale, { maximumFractionDigits: 3 });
  };

  const pickRefName = (row: any) => {
    const source = (row && "data" in row ? (row as any).data : row) ?? {};
    const candidates = [
      source?.name_ru,
      source?.name_human_ru,
      source?.display_name,
      source?.alias_ru,
      source?.name,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
    return "";
  };

  const formatDate = (value: any) => {
    if (!value) return "";
    try {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toLocaleDateString(locale);
    } catch {}
    return String(value ?? "").trim();
  };

  const formatDateTime = (value: any) => {
    if (!value) return "";
    try {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toLocaleString(locale);
    } catch {}
    return String(value ?? "").trim();
  };

  const normalizeStatusRu = (raw?: string | null) => {
    const s = String(raw ?? "").trim().toLowerCase();
    if (!s) return "—";
    if (s === "draft" || s === "черновик") return "Черновик";
    if (s === "pending" || s === "на утверждении") return "На утверждении";
    if (s === "approved" || s === "утверждено" || s === "утверждена") return "Утверждена";
    if (s === "rejected" || s === "cancelled" || s === "отклонено" || s === "отклонена")
      return "Отклонена";
    return raw ?? "—";
  };

  const displayLabel = await resolveRequestLabel(rid);

  const head = await client
    .from("requests")
    .select(
      "id, foreman_name, need_by, comment, status, created_at, object_type_code, level_code, system_code, zone_code"
    )
    .eq("id", idFilter)
    .maybeSingle();

  if (head.error || !head.data) throw new Error("Заявка не найдена");
  const H: any = head.data;

  const [obj, lvl, sys, zn] = await Promise.all([
    H.object_type_code
      ? client
          .from("ref_object_types")
          .select("name,name_ru,name_human_ru,display_name,alias_ru")
          .eq("code", H.object_type_code)
          .maybeSingle()
      : Promise.resolve({ data: null } as any),
    H.level_code
      ? client
          .from("ref_levels")
          .select("name,name_ru,name_human_ru,display_name,alias_ru")
          .eq("code", H.level_code)
          .maybeSingle()
      : Promise.resolve({ data: null } as any),
    H.system_code
      ? client
          .from("ref_systems")
          .select("name,name_ru,name_human_ru,display_name,alias_ru")
          .eq("code", H.system_code)
          .maybeSingle()
      : Promise.resolve({ data: null } as any),
    H.zone_code
      ? client
          .from("ref_zones")
          .select("name,name_ru,name_human_ru,display_name,alias_ru")
          .eq("code", H.zone_code)
          .maybeSingle()
      : Promise.resolve({ data: null } as any),
  ]);

  const objectName = pickRefName(obj);
  const levelName = pickRefName(lvl);
  const systemName = pickRefName(sys);
  const zoneName = pickRefName(zn);

  const createdAt = formatDateTime(H.created_at);
  const needByFormatted = formatDate(H.need_by);
  const generatedAt = new Date().toLocaleString(locale);


  const metaPairs: Array<{ label: string; value: string }> = [
    { label: "Объект", value: objectName || "—" },
    { label: "Система", value: systemName || "—" },
    { label: "ФИО прораба", value: H.foreman_name || "(не указано)" },
    { label: "Нужно к", value: needByFormatted || "—" },
    { label: "ID заявки", value: String(H.id ?? "") || "—" },
    { label: "Этаж / уровень", value: levelName || "—" },
    { label: "Зона / участок", value: zoneName || "—" },
    { label: "Дата создания", value: createdAt || "—" },
    { label: "Статус", value: normalizeStatusRu(H.status) || "—" },
  ];

  const metaGridItems = metaPairs
    .map(
      (p) => `
<div class="meta-item">
  <span class="ml">${esc(p.label)}:</span>
  <span class="mv">${esc(p.value)}</span>
</div>`
    )
    .join("");

  const items = await client
    .from("request_items")
    .select("id, name_human, uom, qty, note, app_code, status")
    .eq("request_id", idFilter)
    .order("id", { ascending: true });

  const rows: any[] = Array.isArray(items.data) ? items.data : [];

  const body = rows.length
    ? rows
        .map((r: any, i: number) => {
          
          const cleaned = stripContextFromNote(r.note);
          const noteHtml = cleaned ? esc(cleaned).replace(/\n/g, "<br/>") : "";

          const itemStatus = normalizeStatusRu(r.status);

          return `<tr>
<td class="c-num">${i + 1}</td>
<td class="c-name">${esc(r.name_human || "")}</td>
<td class="c-uom">${esc(r.uom || "")}</td>
<td class="c-qty">${fmtQty(r.qty)}</td>
<td class="c-status">${esc(itemStatus)}</td>
<td class="c-note">${noteHtml || ""}</td>
</tr>`;
        })
        .join("")
    : `<tr><td colspan="6" class="empty">Нет позиций</td></tr>`;

  const commentBlock = H.comment
    ? `<div class="comment">
         <div class="comment-k">Комментарий</div>
         <div class="comment-v">${esc(H.comment)}</div>
       </div>`
    : "";

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<title>Заявка ${esc(displayLabel)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  :root{ --ink:#000; --muted:#222; --line:#000; --bg:#ffffff; }
  *{box-sizing:border-box;}
  body{
    font-family: Arial, Helvetica, sans-serif;
    background:var(--bg);
    margin:0;
    padding:16px;
    color:var(--ink);
  }
  .container{
    max-width:980px;
    margin:0 auto;
    background:#fff;
    padding:18px 20px;
  }

  header{ margin:0 0 14px 0; }
  h1{ margin:0; font-size:20px; font-weight:700; }
  .subtitle{ margin-top:6px; font-size:12px; }


  .meta-wrap{ margin-top:10px; }
  .meta-grid{
    display:grid;
    grid-template-columns: 1fr 1fr;
    column-gap:40px;
    row-gap:6px;
  }
  .meta-item{ font-size:12px; line-height:1.25; }
  .ml{ font-weight:700; }
  .mv{ margin-left:8px; word-break:break-word; }


  .comment{ margin-top:14px; }
  .comment-k{ font-size:12px; font-weight:700; margin-bottom:6px; }
  .comment-v{ font-size:12px; white-space:pre-wrap; word-break:break-word; }


  table.items{
    width:100%;
    border-collapse:collapse;
    margin-top: 18px;
    font-size:12px;
  }
  table.items th, table.items td{
    border:1px solid var(--line);
    padding:10px 10px;
    vertical-align:top;
  }
  table.items th{
    background:transparent;
    font-weight:700;
    text-align:center;
  }

  .c-num{ text-align:center; width:50px; }
  .c-uom{ text-align:center; width:70px; }
  .c-qty{ text-align:center; width:110px; }
  .c-status{ text-align:center; width:140px; }
  .c-note{ width:260px; }
  .empty{ text-align:center; font-style:italic; }


  .signs{display:flex;gap:18px;margin-top:16px;flex-wrap:wrap;}
  .sign{flex:1 1 260px;border:1px dashed #cbd5e1;border-radius:12px;padding:10px 12px;}
  .sign-label{font-size:12px;font-weight:800;color:#334155;}
  .sign-line{margin-top:26px;border-bottom:1px solid #0f172a;height:1px;width:220px;}
  .sign-name{margin-top:7px;font-size:11px;color:#666;}

  @media print{
    body{padding:0;}
    .container{max-width:none;margin:0;padding:12mm;}
  }
  @page { margin: 12mm; }
</style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Заявка ${esc(displayLabel)}</h1>
      <div class="subtitle">Сформировано: ${esc(generatedAt)}</div>
    </header>

    <div class="meta-wrap">
      <div class="meta-grid">
        ${metaGridItems}
      </div>
    </div>

    ${commentBlock}

    <table class="items">
      <thead>
        <tr>
          <th>№</th>
          <th>Позиция</th>
          <th>Ед.</th>
          <th>Количество</th>
          <th>Статус</th>
          <th>Примечание</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>

    <div class="signs">
      <div class="sign">
        <div class="sign-label">Прораб</div>
        <div class="sign-line"></div>
        <div class="sign-name">${esc(H.foreman_name || "")}</div>
      </div>
      <div class="sign">
        <div class="sign-label">Директор</div>
        <div class="sign-line"></div>
        <div class="sign-name">&nbsp;</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function exportRequestPdf(requestId: number | string) {
  const html = await buildRequestPdfHtml(requestId);
  return openHtmlAsPdfUniversal(html);
}

