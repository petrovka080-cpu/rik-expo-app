// src/lib/api/pdf_proposal.ts
import { supabase } from "../supabaseClient";
import { client, normStr } from "./_core";
import { openHtmlAsPdfUniversal } from "./pdf";
import { listSuppliers } from "./suppliers";
import type { Supplier } from "./types";

// Читаем «шапку» только теми полями, которые есть в твоей таблице proposals
async function selectProposalHeadSafe(idFilter: number | string) {
  const q = await supabase
    .from("proposals")
    .select(
      "status,submitted_at,buyer_fio,buyer_email,created_by,approved_at,proposal_no,display_no,id_short"
    )
    .eq("id", idFilter)
    .maybeSingle();

  if (q.error || !q.data) {
    return {
      status: "",
      submittedAt: null as string | null,
      buyerFioAny: null as string | null,
      approvedAt: null as string | null,
      proposalNo: null as string | null,
    };
  }

  const d: any = q.data;

  const buyerFio = (typeof d.buyer_fio === "string" ? d.buyer_fio.trim() : "") || "";
  const buyerEmail = (typeof d.buyer_email === "string" ? d.buyer_email.trim() : "") || "";
  const createdBy = (d.created_by ?? "") ? String(d.created_by) : "";

  // ✅ НЕ СВЕТИМ UUID
  const looksLikeUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdBy.trim()
    );

  const fallback =
    buyerFio ||
    buyerEmail ||
    (!looksLikeUuid && createdBy.trim() ? createdBy.trim() : "") ||
    null;

  const proposalNo =
    (typeof d.proposal_no === "string" && d.proposal_no.trim())
      ? d.proposal_no.trim()
      : (typeof d.display_no === "string" && d.display_no.trim())
      ? d.display_no.trim()
      : (d.id_short != null ? `PR-${String(d.id_short)}` : null);

  return {
    status: (typeof d.status === "string" ? d.status : "") || "",
    submittedAt: (d.submitted_at ?? null) as string | null,
    buyerFioAny: fallback,
    approvedAt: (d.approved_at ?? null) as string | null,
    proposalNo,
  };
}

function rikKindLabel(rikCode?: string | null): string {
  const p = String(rikCode ?? "").trim().toUpperCase().split("-")[0];
  switch (p) {
    case "MAT":
      return "Материал";
    case "WRK":
    case "WORK":
      return "Работа";
    case "SRV":
      return "Услуга";
    case "KIT":
      return "Комплект";
    case "SPEC":
      return "Спец.";
    default:
      return "";
  }
}

function stripContextFromText(raw: any) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s
    .replace(/объект\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/этаж\s*\/?\s*уровень\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/система\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/зона\s*\/?\s*участок\s*:\s*[^;\n]+;?\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function buildProposalPdfHtml(proposalId: number | string): Promise<string> {
  const pid = String(proposalId);
  const idFilter: number | string = /^\d+$/.test(pid) ? Number(pid) : pid;
  const locale = "ru-RU";

  const esc = (s: any) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const num = (v?: any) => {
    const n = Number(String(v ?? "").replace(",", ".").trim());
    return Number.isFinite(n) ? n : 0;
  };

  const fmt = (x: number) => x.toLocaleString(locale);

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
    if (s === "rejected" || s === "cancelled" || s === "отклонено" || s === "отклонена") return "Отклонена";
    return raw ?? "—";
  };

  try {
    const head = await selectProposalHeadSafe(idFilter);

    const status = head.status;
    const submittedAt = head.submittedAt;
    const buyerFio = head.buyerFioAny;
    const approvedAt = head.approvedAt;

    const prettyNo = head.proposalNo || `PR-${String(pid).slice(0, 8)}`;

    // строки предложения
    const { data: piRaw } = await supabase
      .from("proposal_items")
      .select("id, request_item_id, name_human, uom, qty, app_code, rik_code, price, supplier, note")
      .eq("proposal_id", idFilter)
      .order("id", { ascending: true });

    const pi: any[] = Array.isArray(piRaw) ? piRaw : [];

    // дотягиваем request_items + получаем request_id
    let requestIdFromItems: string | null = null;

    if (pi.length) {
      const ids = Array.from(new Set(pi.map((r) => r.request_item_id).filter(Boolean))).map(String);
      if (ids.length) {
        const ri = await supabase
          .from("request_items")
          .select("id, request_id, name_human, uom, qty, app_code, rik_code")
          .in("id", ids as any[]);

        if (!ri.error && Array.isArray(ri.data)) {
          const byId = new Map(ri.data.map((r: any) => [String(r.id), r]));
          for (const r of pi) {
            const src = byId.get(String(r.request_item_id));
            if (!src) continue;

            requestIdFromItems = requestIdFromItems || (src.request_id ? String(src.request_id) : null);

            r.name_human = r.name_human ?? src.name_human ?? null;
            r.uom = r.uom ?? src.uom ?? null;
            r.qty = r.qty ?? src.qty ?? null;
            r.app_code = r.app_code ?? src.app_code ?? null;
            r.rik_code = r.rik_code ?? src.rik_code ?? null;
          }
        }
      }
    }

    // ===== контекст заявки для шапки =====
    let objectName = "";
    let levelName = "";
    let systemName = "";
    let zoneName = "";
    let requestCreatedAt = "";
    let requestNeedBy = "";
    let requestStatus = "";
    let requestDisplayNo = "";

    if (requestIdFromItems) {
      const rid = requestIdFromItems;
      const reqFilter: number | string = /^\d+$/.test(rid) ? Number(rid) : rid;

      const req = await supabase
        .from("requests")
        .select("id,display_no,need_by,status,created_at,object_type_code,level_code,system_code,zone_code")
        .eq("id", reqFilter)
        .maybeSingle();

      if (!req.error && req.data) {
        const H: any = req.data;

        requestDisplayNo = String(H.display_no ?? "").trim();
        requestCreatedAt = formatDateTime(H.created_at);
        requestNeedBy = formatDate(H.need_by);
        requestStatus = normalizeStatusRu(H.status);

        const [obj, lvl, sys, zn] = await Promise.all([
          H.object_type_code
            ? supabase
                .from("ref_object_types")
                .select("name,name_ru,name_human_ru,display_name,alias_ru")
                .eq("code", H.object_type_code)
                .maybeSingle()
            : Promise.resolve({ data: null } as any),
          H.level_code
            ? supabase
                .from("ref_levels")
                .select("name,name_ru,name_human_ru,display_name,alias_ru")
                .eq("code", H.level_code)
                .maybeSingle()
            : Promise.resolve({ data: null } as any),
          H.system_code
            ? supabase
                .from("ref_systems")
                .select("name,name_ru,name_human_ru,display_name,alias_ru")
                .eq("code", H.system_code)
                .maybeSingle()
            : Promise.resolve({ data: null } as any),
          H.zone_code
            ? supabase
                .from("ref_zones")
                .select("name,name_ru,name_human_ru,display_name,alias_ru")
                .eq("code", H.zone_code)
                .maybeSingle()
            : Promise.resolve({ data: null } as any),
        ]);

        objectName = pickRefName(obj) || "";
        levelName = pickRefName(lvl) || "";
        systemName = pickRefName(sys) || "";
        zoneName = pickRefName(zn) || "";
      }
    }

    // поставщики
    const distinctSupplierNames = Array.from(
      new Set(pi.map((r) => String(r?.supplier || "").trim()).filter(Boolean))
    );
    let supplierCards: Supplier[] = [];

    if (distinctSupplierNames.length) {
      const all = await listSuppliers();
      supplierCards = distinctSupplierNames.map((nm) => {
        const hit = all.find((s) => normStr(s.name) === normStr(nm));
        return hit || ({ id: `ghost:${nm}`, name: nm } as Supplier);
      });
    }

    // справочник применений
    let appNames: Record<string, string> = {};
    try {
      const apps = await client.from("rik_apps" as any).select("app_code,name_human");
      if (!apps.error && Array.isArray(apps.data)) {
        appNames = Object.fromEntries(apps.data.map((a: any) => [a.app_code, a.name_human]));
      }
    } catch {}

    const includeSupplier = pi.some((r) => (r?.supplier ?? "").toString().trim() !== "");

    const body = (pi.length ? pi : [{ id: 0 }])
      .map((r: any, i: number) => {
        if (!pi.length) {
          return `<tr><td colspan="${includeSupplier ? 8 : 7}" class="empty">Нет строк</td></tr>`;
        }

        const qty = num(r.qty);
        const price = num(r.price);
        const amount = qty * price;

        const name = r.name_human ?? "";
        const kind = rikKindLabel(r.rik_code);
        const uom = r.uom ?? "";

        const app = r.app_code ? appNames[r.app_code] ?? r.app_code : "";
        const noteText = stripContextFromText(String(r.note ?? "").trim().replace(/^Прим\.\:\s*/i, ""));
        const appAndNote = [app, noteText].filter(Boolean).join(" · ");

        const supplier = (r.supplier ?? "").toString();

        return `<tr>
<td class="c-num">${i + 1}</td>
<td class="c-name">
  ${esc(name)}
  ${kind ? `<div class="sub">Тип: ${esc(kind)}</div>` : ``}
</td>
<td class="c-qty">${qty ? fmt(qty) : ""}</td>
<td class="c-uom">${esc(uom)}</td>
<td class="c-app">${esc(appAndNote)}</td>
${includeSupplier ? `<td class="c-supp">${esc(supplier)}</td>` : ``}
<td class="c-price">${price ? fmt(price) : ""}</td>
<td class="c-sum">${amount ? fmt(amount) : ""}</td>
</tr>`;
      })
      .join("");

    const suppliersHtml = supplierCards.length
      ? `
<div class="section-title">Поставщики</div>
${supplierCards
  .map((s) => {
    const meta: string[] = [];
    if (s.phone) meta.push(`Тел.: ${esc(s.phone)}`);
if (s.email) meta.push(`Email: ${esc(s.email)}`);
if (s.inn) meta.push(`ИНН: ${esc(s.inn)}`);
if (s.address) meta.push(`Адрес: ${esc(s.address)}`);

    const metaLine = meta.filter(Boolean).join(" · ");
    return `
<div class="supplier-line">
  <div class="s-name">${esc(s.name)}</div>
  ${metaLine ? `<div class="s-meta">${metaLine}</div>` : ``}
</div>`;
  })
  .join("")}
`
      : "";

    const total = pi.reduce((acc, r) => acc + num(r.qty) * num(r.price), 0);

    const generatedAt = new Date().toLocaleString(locale);
    const dateStr = (submittedAt ? new Date(submittedAt) : new Date()).toLocaleString(locale);

    const supplierTh = includeSupplier ? `<th style="width:160px">Поставщик</th>` : ``;
    const sumColspan = includeSupplier ? 7 : 6;

    // ===== СИСТЕМАТИЗАЦИЯ ШАПКИ =====
    // ЛЕВО: контекст/применение
    const leftPairs: Array<{ label: string; value: string }> = [
      { label: "Объект", value: objectName || "—" },
      { label: "Этаж / уровень", value: levelName || "—" },
      { label: "Система", value: systemName || "—" },
      { label: "Зона / участок", value: zoneName || "—" },
    ];

    // ПРАВО: служебные данные
    const rightPairs: Array<{ label: string; value: string }> = [
      { label: "Снабженец", value: buyerFio || "—" },
      { label: "Нужно к", value: requestNeedBy || "—" },
      { label: "Дата создания", value: requestCreatedAt || dateStr },
      { label: "Статус", value: requestStatus || normalizeStatusRu(status) || "—" },
      { label: "Заявка", value: requestDisplayNo ? `#${requestDisplayNo}` : "—" },
    ];

    const leftHtml = leftPairs
      .map(
        (p) => `<div class="meta-item"><span class="ml">${esc(p.label)}:</span><span class="mv">${esc(p.value)}</span></div>`
      )
      .join("");

    const rightHtml = rightPairs
      .map(
        (p) => `<div class="meta-item"><span class="ml">${esc(p.label)}:</span><span class="mv">${esc(p.value)}</span></div>`
      )
      .join("");

    return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<title>Предложение ${esc(prettyNo)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  :root{ --ink:#000; --muted:#222; --line:#000; --bg:#fff; }
  *{ box-sizing:border-box; }
  body{
    font-family: Arial, Helvetica, sans-serif;
    margin:0;
    padding:16px;
    color:var(--ink);
    background:var(--bg);
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

  /* ===== META: две колонки С ГРУППИРОВКОЙ (лево/право) ===== */
  .meta-wrap{ margin-top:10px; }
  .meta-2col{
    display:grid;
    grid-template-columns: 1fr 1fr;
    column-gap:40px;
    align-items:start;
  }
  .meta-col{ display:flex; flex-direction:column; gap:6px; }
  .meta-item{ font-size:12px; line-height:1.25; }
  .ml{ font-weight:700; }
  .mv{ margin-left:8px; word-break:break-word; }

  .section-title{
    margin-top:16px;
    font-size:12px;
    font-weight:700;
  }

  .supplier-line{ margin-top:8px; font-size:12px; }
  .s-name{ font-weight:700; }
  .s-meta{ margin-top:2px; color:#222; font-size:11px; }

  /* table like act */
  table.items{
    width:100%;
    border-collapse:collapse;
    margin-top:16px;
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

  .c-num{ width:50px; text-align:center; }
  .c-qty{ width:90px; text-align:center; }
  .c-uom{ width:70px; text-align:center; }
  .c-price{ width:110px; text-align:right; }
  .c-sum{ width:120px; text-align:right; }
  .c-supp{ width:160px; }
  .sub{ margin-top:2px; font-size:11px; color:#222; opacity:.8; }
  .sumline td{ font-weight:700; }
  .empty{ text-align:center; font-style:italic; }

  /* signatures — оставляем */
  .signs{display:flex;gap:24px;margin-top:24px;flex-wrap:wrap}
  .sign{flex:1 1 300px;border:1px dashed #cbd5e1;border-radius:8px;padding:10px 12px}
  .line{margin-top:24px;border-bottom:1px solid #334155;width:220px}
  .muted{ color:#333; font-size:11px; }

  @media print{
    body{padding:0;}
    .container{max-width:none;margin:0;padding:12mm;}
  }
  @page{ margin:12mm; }
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>Предложение на закупку № ${esc(prettyNo)}</h1>
    <div class="subtitle">
      Сформировано: ${esc(generatedAt)}
      ${approvedAt ? ` · <b>Утверждено:</b> ${esc(new Date(approvedAt).toLocaleString(locale))}` : ""}
      ${status ? ` · <b>Статус:</b> ${esc(normalizeStatusRu(status))}` : ""}
    </div>
  </header>

  <div class="meta-wrap">
    <div class="meta-2col">
      <div class="meta-col">
        ${leftHtml}
      </div>
      <div class="meta-col">
        ${rightHtml}
      </div>
    </div>
  </div>

  ${suppliersHtml}

  <table class="items">
    <thead>
      <tr>
        <th style="width:36px">#</th>
        <th>Наименование</th>
        <th style="width:90px">Кол-во</th>
        <th style="width:70px">Ед.</th>
        <th style="width:160px">Применение</th>
        ${supplierTh}
        <th style="width:110px">Цена</th>
        <th style="width:120px">Сумма</th>
      </tr>
    </thead>
    <tbody>
      ${body}
      ${pi.length ? `<tr class="sumline"><td colspan="${sumColspan}" style="text-align:right">ИТОГО</td><td style="text-align:right">${fmt(total)}</td></tr>` : ""}
    </tbody>
  </table>

  <div class="signs">
    <div class="sign">
      <div><b>Снабженец</b></div>
      <div class="line"></div>
      <div class="muted" style="margin-top:6px">/ ${esc(buyerFio || "")} /</div>
    </div>
    <div class="sign">
      <div><b>Директор</b></div>
      <div class="line"></div>
      <div class="muted" style="margin-top:6px">/  /</div>
    </div>
  </div>

  <div class="muted" style="margin-top:14px">
    Служебный ID: ${esc(pid)}
  </div>
</div>
</body>
</html>`;
  } catch (e: any) {
    const esc2 = (s: any) =>
      String(s ?? "").replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]!));
    return `<!doctype html><meta charset="utf-8"/><title>Ошибка</title>
<pre style="font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; padding:16px;">Ошибка подготовки PDF: ${esc2(
      e?.message || e
    )}</pre>`;
  }
}

export async function exportProposalPdf(
  proposalId: number | string,
  mode: "preview" | "share" = "preview"
) {
  const html = await buildProposalPdfHtml(proposalId);
  return openHtmlAsPdfUniversal(html, { share: mode === "share" });
}

