// src/lib/api/pdf_director.ts
import { openHtmlAsPdfUniversal } from "./pdf";
import { listAccountantInbox } from "./accountant";
import { normalizeRuText } from "../text/encoding";

const esc = (s: any) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export async function exportDirectorFinancePdf(): Promise<string> {
  const rows = await listAccountantInbox();

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
  <title>Финансовый отчёт</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;padding:16px;color:#111}
    h1{margin:0 0 10px 0}
    .muted{color:#64748b}
    pre{white-space:pre-wrap}
  </style></head><body>
    <h1>Финансовый отчёт (директор)</h1>
    <div class="muted">Черновая версия. Дальше оформим красиво.</div>
    <pre>${esc(JSON.stringify(rows ?? [], null, 2))}</pre>
  </body></html>`;

  return openHtmlAsPdfUniversal(normalizeRuText(html));
}

const nnum = (v: any) => {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;

  const s0 = String(v).trim();
  if (!s0) return 0;

  const s = s0
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.\-]/g, "");

  const parts = s.split(".");
  const normalized = parts.length <= 2 ? s : `${parts[0]}.${parts.slice(1).join("")}`;

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

const money = (v: any) => {
  const n = nnum(v);
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
};

const fmtDateOnly = (iso?: string | null) => {
  const s = String(iso ?? "").trim();
  if (!s) return "—";
  const d = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d.split("-").reverse().join(".");
  return d;
};

const pickIso10 = (...vals: any[]) => {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (!s || s === "—") continue;
    return s.slice(0, 10);
  }
  return null;
};

const proposalPretty = (r: any) => {
  const src = r?.row ?? r?.raw ?? r ?? {};

  const pn = String(
    src?.proposal_no ??
      src?.proposalNo ??
      src?.pretty ??
      src?.proposals?.proposal_no ??
      ""
  ).trim();

  if (pn) return pn;

  const pid = String(src?.proposalId ?? src?.proposal_id ?? src?.id ?? "").trim();
  return pid ? `PR-${pid.slice(0, 8)}` : "";
};

function kindNorm(name: any) {
  const k = String(name ?? "").trim();
  if (!k) return "Другое";
  if (k === "Материалы" || k === "Работы" || k === "Услуги" || k === "Другое") return k;

  const t = k.toLowerCase();
  if (t.includes("мат")) return "Материалы";
  if (t.includes("работ")) return "Работы";
  if (t.includes("услуг")) return "Услуги";
  return "Другое";
}

export async function exportDirectorSupplierSummaryPdf(p: {
  supplier: string;
  periodFrom?: string | null;
  periodTo?: string | null;
  financeRows: any[];
  spendRows?: any[];
  onlyOverpay?: boolean;
}): Promise<string> {
  const supplier = String(p.supplier ?? "").trim() || "—";
  const finAll = Array.isArray(p.financeRows) ? p.financeRows : [];
  const spendAll = Array.isArray(p.spendRows) ? p.spendRows : [];
  const onlyOverpay = !!p.onlyOverpay;
  const from = p.periodFrom ? String(p.periodFrom).slice(0, 10) : null;
  const to = p.periodTo ? String(p.periodTo).slice(0, 10) : null;

  const inPeriod = (iso: any) => {
    if (!from && !to) return true;
    const d = String(iso ?? "").slice(0, 10);
    if (!d) return true;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };

  // detect kind mode by spendRows
  const spendForDetect = spendAll
    .filter((r) => String(r?.supplier ?? "").trim() === supplier)
    .filter((r) => inPeriod(r?.director_approved_at));

  const kindSet = new Set<string>(
    spendForDetect.map((r: any) => kindNorm(r?.kind_name ?? r?.kindName)).filter(Boolean)
  );
  const kindFilter = kindSet.size === 1 ? Array.from(kindSet)[0] : null;

  const spend = spendAll
    .filter((r) => String(r?.supplier ?? "").trim() === supplier)
    .filter((r) => inPeriod(r?.director_approved_at))
    .filter((r: any) => !kindFilter || kindNorm(r?.kind_name ?? r?.kindName) === kindFilter)
    .filter((r: any) => !onlyOverpay || nnum(r?.overpay_alloc) > 0);

  const overpayByProposal = new Map<string, number>();
  const kindByProposal = new Map<string, string>();

  for (const r of spend) {
    const pid = String(r?.proposal_id ?? "").trim();
    if (!pid) continue;

    const ov = nnum(r?.overpay_alloc);
    if (ov > 0) overpayByProposal.set(pid, (overpayByProposal.get(pid) ?? 0) + ov);

    const k = kindNorm(r?.kind_name ?? r?.kindName);
    if (k) kindByProposal.set(pid, k);
  }

  let totalApproved = 0;
  let totalPaid = 0;
  let totalRest = 0;
  let items: Array<{
    title: string;
    invoiceDate: any;
    approvedAt: any;
    dueDate: any;
    paidFirstAt: any;
    paidLastAt: any;

    amount: number;
    paid: number;
    rest: number;
    status: string;

    overpay?: number;
    kindForRow?: string;
  }> = [];

  if (kindFilter) {
    // spend rows for this kind
    const spendKind = spendAll
      .filter((r) => String(r?.supplier ?? "").trim() === supplier)
      .filter((r) => inPeriod(r?.director_approved_at))
      .filter((r: any) => kindNorm(r?.kind_name ?? r?.kindName) === kindFilter);

    totalApproved = spendKind.reduce((s, r: any) => s + nnum(r?.approved_alloc), 0);
    totalPaid = spendKind.reduce((s, r: any) => s + nnum(r?.paid_alloc_cap ?? r?.paid_alloc), 0);
    totalRest = Math.max(totalApproved - totalPaid, 0);

    const pidSet = new Set<string>(
      spendKind.map((r: any) => String(r?.proposal_id ?? "").trim()).filter(Boolean)
    );

    const fin = finAll
      .filter((r) => String(r?.supplier ?? "").trim() === supplier)
      .filter((r) => inPeriod(r?.approvedAtIso ?? r?.approved_at ?? r?.director_approved_at))
      .filter((r) => {
        const pid = String(r?.proposalId ?? r?.proposal_id ?? "").trim();
        return pid && pidSet.has(pid);
      });

    items = fin.map((r: any) => {
      const amount = nnum(r?.amount);
      const paid = nnum(r?.paidAmount);
      const rest = Math.max(amount - paid, 0);
      const status =
        amount <= 0 ? "прочее" : paid <= 0 ? "не оплачено" : rest <= 0 ? "оплачено" : "частично";
      const pid = String(r?.proposalId ?? r?.proposal_id ?? r?.id ?? "").trim();
      const overpay = pid ? (overpayByProposal.get(pid) ?? 0) : 0;
      const kindForRow = pid ? (kindByProposal.get(pid) ?? "") : "";

      return {
        title: String(r?.invoiceNumber ?? r?.invoice_number ?? "").trim()
          ? `Счёт №${String(r?.invoiceNumber ?? r?.invoice_number).trim()}`
          : proposalPretty(r)
            ? `Предложение ${proposalPretty(r)}`
            : "Счёт",

        invoiceDate: pickIso10(
          r?.invoiceDate,
          r?.invoice_date,
          r?.raw?.invoice_at,
          r?.raw?.invoice_created_at,
          r?.raw?.created_at
        ),

        approvedAt: pickIso10(
          r?.director_approved_at,
          r?.approvedAtIso,
          r?.approved_at,
          r?.raw?.director_approved_at,
          r?.raw?.approved_at,
          r?.raw?.approvedAtIso,
          r?.created_at
        ),

        dueDate: pickIso10(
          r?.dueDate,
          r?.due_date,
          r?.raw?.due_at
        ),

        paidFirstAt: pickIso10(
          r?.paid_first_at,
          r?.raw?.paid_first_at
        ),
        paidLastAt: pickIso10(
          r?.paid_last_at,
          r?.raw?.paid_last_at
        ),

        amount,
        paid,
        rest,
        status,
        overpay,
        kindForRow,
      };
    });

    if (onlyOverpay) {
      items = (items as any[]).filter((x: any) => nnum(x.overpay) > 0);
    }
  } else {
    const fin = finAll
      .filter((r) => String(r?.supplier ?? "").trim() === supplier)
      .filter((r) => inPeriod(r?.approvedAtIso ?? r?.approved_at ?? r?.director_approved_at));

    items = fin.map((r: any) => {
      const amount = nnum(r?.amount);
      const paid = nnum(r?.paidAmount);
      const rest = Math.max(amount - paid, 0);
      const status =
        amount <= 0 ? "прочее" : paid <= 0 ? "не оплачено" : rest <= 0 ? "оплачено" : "частично";
      const pid = String(r?.proposalId ?? r?.proposal_id ?? r?.id ?? "").trim();
      const overpay = pid ? (overpayByProposal.get(pid) ?? 0) : 0;
      const kindForRow = pid ? (kindByProposal.get(pid) ?? "") : "";

      return {
        title: String(r?.invoiceNumber ?? r?.invoice_number ?? "").trim()
          ? `Счёт №${String(r?.invoiceNumber ?? r?.invoice_number).trim()}`
          : proposalPretty(r)
            ? `Предложение ${proposalPretty(r)}`
            : "Счёт",

        invoiceDate: pickIso10(
          r?.invoiceDate,
          r?.invoice_date,
          r?.raw?.invoice_at,
          r?.raw?.invoice_created_at,
          r?.raw?.created_at
        ),

        approvedAt: pickIso10(
          r?.director_approved_at,
          r?.approvedAtIso,
          r?.approved_at,
          r?.raw?.director_approved_at,
          r?.raw?.approved_at,
          r?.raw?.approvedAtIso,
          r?.created_at
        ),

        dueDate: pickIso10(
          r?.dueDate,
          r?.due_date,
          r?.raw?.due_at
        ),

        // ✅ payments dates
        paidFirstAt: pickIso10(
          r?.paid_first_at,
          r?.raw?.paid_first_at
        ),
        paidLastAt: pickIso10(
          r?.paid_last_at,
          r?.raw?.paid_last_at
        ),

        amount,
        paid,
        rest,
        status,
        overpay,
        kindForRow,
      };
    });

    if (onlyOverpay) {
      items = (items as any[]).filter((x: any) => nnum(x.overpay) > 0);
    }
    totalApproved = items.reduce((s, x) => s + nnum(x.amount), 0);
    totalPaid = items.reduce((s, x) => s + nnum(x.paid), 0);
    totalRest = Math.max(totalApproved - totalPaid, 0);
  }

  const cntAll = items.length;
  const cntUnpaid = items.filter((x) => x.status === "не оплачено").length;
  const cntPartial = items.filter((x) => x.status === "частично").length;
  const cntPaid = items.filter((x) => x.status === "оплачено").length;

  const byKind = new Map<string, { approved: number; paid: number; overpay: number }>();
  for (const r of spend) {
    const k = kindNorm(r?.kind_name ?? r?.kindName);
    const a = nnum(r?.approved_alloc);
    const pd = nnum(r?.paid_alloc_cap ?? r?.paid_alloc);
    const ov = nnum(r?.overpay_alloc);
    const cur = byKind.get(k) ?? { approved: 0, paid: 0, overpay: 0 };
    cur.approved += a;
    cur.paid += pd;
    cur.overpay += ov;
    byKind.set(k, cur);
  }

  const kindOrder = ["Материалы", "Работы", "Услуги", "Другое"];
  const kindRows = kindOrder
    .filter((k) => byKind.has(k))
    .map((k) => ({ kind: k, ...byKind.get(k)! }))
    .filter((x) => x.approved !== 0 || x.paid !== 0 || x.overpay !== 0);

  const detail = [...items].sort((a, b) => {
    const wa = a.status === "не оплачено" ? 0 : a.status === "частично" ? 1 : 2;
    const wb = b.status === "не оплачено" ? 0 : b.status === "частично" ? 1 : 2;
    if (wa !== wb) return wa - wb;
    const da = String(a.dueDate ?? a.invoiceDate ?? "").slice(0, 10);
    const db = String(b.dueDate ?? b.invoiceDate ?? "").slice(0, 10);
    return da.localeCompare(db);
  });

  const periodTxt =
    from || to ? `${from ? fmtDateOnly(from) : "—"} → ${to ? fmtDateOnly(to) : "—"}` : "Весь период";

  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
  <title>Сводка по поставщику</title>
  <style>
    @page { margin: 14mm 12mm 20mm 12mm; } /* снизу больше места под номер страницы */

    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; color:#0f172a}
    h1{font-size:18px;margin:0 0 8px 0}
    .muted{color:#64748b}
    .box{border:1px solid #e5e7eb;border-radius:14px;padding:12px;margin:10px 0;background:#fff}
    .row{display:flex;gap:12px;flex-wrap:wrap}
    .cell{flex:1 1 220px}
    .lbl{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#64748b}
    .val{margin-top:4px;font-size:14px;font-weight:900}
    .kpi{display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding:10px 12px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px}

    /* ============================== MAYAK: PRINT TABLE HEADER REPEAT ============================== */
    table{width:100%;border-collapse:collapse;margin-top:10px;page-break-inside:auto}
    thead{display:table-header-group}
    tfoot{display:table-footer-group}
    tr{page-break-inside:avoid;page-break-after:auto}
    th,td{border:1px solid #e5e7eb;padding:8px 10px;vertical-align:top;font-size:13px}
    th{background:#f8fafc;font-weight:900}
    /* ============================ END MAYAK: PRINT TABLE HEADER REPEAT ============================ */

    .tag{display:inline-block;padding:3px 8px;border-radius:999px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:900;font-size:11px}
    .tag.bad{background:#fffbeb;border-color:#fde68a}
    .tag.mid{background:#eef2ff;border-color:#c7d2fe}
    .tag.ok{background:#ecfdf5;border-color:#a7f3d0}

    /* ============================== MAYAK: PAGE NUMBERS ============================== */
    .page-footer{
      position:fixed;
      left:0; right:0;
      bottom:-12mm;
      text-align:center;
      color:#64748b;
      font-size:11px;
    }
    .page-footer:after{ content:"Стр. " counter(page); }
    /* ============================ END MAYAK: PAGE NUMBERS ============================ */
  </style></head><body>

  <h1>Сводка по поставщику</h1>
  <div class="muted">Поставщик: <b>${esc(supplier)}</b> • Период: <b>${esc(periodTxt)}</b>${kindFilter ? ` • Вид: <b>${esc(kindFilter)}</b>` : ""}</div>

  <div class="box">
    <div class="row">
      <div class="cell"><div class="lbl">Утверждено</div><div class="val">${esc(money(totalApproved))} KGS</div></div>
      <div class="cell"><div class="lbl">Оплачено</div><div class="val">${esc(money(totalPaid))} KGS</div></div>
      <div class="cell"><div class="lbl">Остаток</div><div class="val">${esc(money(totalRest))} KGS</div></div>
    </div>

    <div class="kpi"><div>Счетов всего</div><div><b>${esc(String(cntAll))}</b></div></div>
    <div class="kpi"><div>Не оплачено</div><div><b>${esc(String(cntUnpaid))}</b></div></div>
    <div class="kpi"><div>Частично</div><div><b>${esc(String(cntPartial))}</b></div></div>
    <div class="kpi"><div>Оплачено</div><div><b>${esc(String(cntPaid))}</b></div></div>
  </div>

  <div class="box">
    <div class="lbl">Разрез по видам (allocation)</div>
    ${
      kindRows.length
        ? `<table>
            <thead>
              <tr>
                <th>Вид</th>
                <th>Утверждено</th>
                <th>Оплачено</th>
                <th>Переплата</th>
              </tr>
            </thead>
            <tbody>
              ${kindRows
                .map(
                  (k) => `<tr>
                    <td>${esc(k.kind)}</td>
                    <td>${esc(money(k.approved))} KGS</td>
                    <td>${esc(money(k.paid))} KGS</td>
                    <td>${k.overpay > 0 ? `${esc(money(k.overpay))} KGS` : "—"}</td>
                  </tr>`
                )
                .join("")}
            </tbody>
          </table>`
        : `<div class="muted" style="margin-top:8px">Нет данных по видам (spendRows пустой или нет доступа).</div>`
    }
  </div>

  <div class="box">
    <div class="lbl">Детализация счетов</div>
    ${
      detail.length
        ? `<table>
            <thead>
              <tr>
                <th>Счёт</th>
                <th>Сумма</th>
                <th>Оплачено</th>
                <th>Остаток</th>
                <th>Статус</th>
                <th>Переплата</th>
                <th>Даты</th>
              </tr>
            </thead>
            <tbody>
              ${detail
                .slice(0, 80)
                .map((x) => {
                  const tag =
                    x.status === "не оплачено"
                      ? `<span class="tag bad">не оплачено</span>`
                      : x.status === "частично"
                        ? `<span class="tag mid">частично</span>`
                        : `<span class="tag ok">оплачено</span>`;

                  const payTxt =
                    x.paidFirstAt && x.paidLastAt
                      ? (String(x.paidFirstAt) === String(x.paidLastAt)
                          ? `опл. ${fmtDateOnly(x.paidFirstAt)}`
                          : `опл. ${fmtDateOnly(x.paidFirstAt)} → ${fmtDateOnly(x.paidLastAt)}`)
                      : x.paidFirstAt
                        ? `опл. ${fmtDateOnly(x.paidFirstAt)}`
                        : x.paidLastAt
                          ? `опл. ${fmtDateOnly(x.paidLastAt)}`
                          : "";

                  const dates = [
                    x.approvedAt ? `утв. ${fmtDateOnly(x.approvedAt)}` : "",
                    payTxt,
                    x.invoiceDate ? `счёт ${fmtDateOnly(x.invoiceDate)}` : "",
                    x.dueDate ? `срок ${fmtDateOnly(x.dueDate)}` : "",
                  ]
                    .filter(Boolean)
                    .join(" • ");

                  return `<tr>
  <td>${esc(x.title)}</td>
  <td>${esc(money(x.amount))}</td>
  <td>${esc(money(x.paid))}</td>
  <td>${esc(money(x.rest))}</td>
  <td>${tag}</td>
  <td>${nnum((x as any).overpay) > 0 ? esc(money((x as any).overpay)) : "—"}</td>
  <td>${esc(dates || "—")}</td>
</tr>`;
                })
                .join("")}
            </tbody>
          </table>`
        : `<div class="muted" style="margin-top:8px">Нет счетов по поставщику за период.</div>`
    }
  </div>

  <div class="page-footer"></div>
</body></html>`;

  return openHtmlAsPdfUniversal(normalizeRuText(html));
}

// ============================================================================
// ✅ NEW: DIRECTOR MANAGEMENT REPORT (TOP-15 + OTHERs) — НЕ ЛОМАЕТ СТАРЫЕ PDF
// ============================================================================

const iso10 = (v: any) => String(v ?? "").trim().slice(0, 10);

const todayIso10 = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const periodText = (from?: string | null, to?: string | null) => {
  const f = from ? fmtDateOnly(iso10(from)) : "—";
  const t = to ? fmtDateOnly(iso10(to)) : "—";
  return from || to ? `${f} → ${t}` : "Весь период";
};

const clampIso = (s: any) => {
  const v = String(s ?? "").trim();
  return v ? v.slice(0, 10) : "";
};

const addDaysIso = (iso: string, days: number) => {
  const d0 = clampIso(iso);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d0)) return "";
  const dt = new Date(d0 + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + Math.max(0, Math.floor(Number(days || 0))));
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

function topNWithOthers<T>(
  rows: T[],
  n: number,
  sumFields: string[],
  makeOthers: (agg: Record<string, number> & { count: number }) => T
): T[] {
  const top = rows.slice(0, Math.max(0, n));
  const rest = rows.slice(Math.max(0, n));
  if (!rest.length) return top;

  const agg: Record<string, number> & { count: number } = { count: rest.length };
  for (const f of sumFields) agg[f] = 0;

  for (const r of rest) {
    for (const f of sumFields) {
      const v = Number((r as any)?.[f] ?? 0);
      agg[f] += Number.isFinite(v) ? v : 0;
    }
  }

  return [...top, makeOthers(agg)];
}

const pickSupplier = (r: any) => {
  const s =
    String(r?.supplier ?? r?.raw?.supplier ?? r?.row?.supplier ?? "").trim() || "—";
  return s;
};

const pickInvoiceNumber = (r: any) => {
  const inv = String(r?.invoiceNumber ?? r?.invoice_number ?? r?.invoiceNo ?? "").trim();
  return inv;
};

const pickApprovedIso = (r: any) =>
  pickIso10(
    r?.approvedAtIso,
    r?.director_approved_at,
    r?.approved_at,
    r?.raw?.director_approved_at,
    r?.raw?.approved_at,
    r?.row?.director_approved_at
  );

const pickInvoiceIso = (r: any) =>
  pickIso10(
    r?.invoiceDate,
    r?.invoice_date,
    r?.invoice_at,
    r?.raw?.invoice_at,
    r?.raw?.created_at,
    r?.created_at
  );

const pickDueIso = (r: any) =>
  pickIso10(
    r?.dueDate,
    r?.due_date,
    r?.raw?.due_at
  );

const invoiceTitle = (r: any) => {
  const inv = pickInvoiceNumber(r);
  if (inv) return `Счёт №${inv}`;
  const pretty = proposalPretty(r);
  if (pretty) return `Предложение ${pretty}`;
  const pid = String(r?.proposalId ?? r?.proposal_id ?? r?.id ?? "").trim();
  return pid ? `Документ #${pid.slice(0, 8)}` : "Документ";
};

export async function exportDirectorManagementReportPdf(p: {
  periodFrom?: string | null;
  periodTo?: string | null;

  financeRows: any[]; // finRows (уже отфильтрованные/подготовленные на экране)
  spendRows: any[];   // finSpendRows (v_director_finance_spend_kinds_v3)

  topN?: number;              // default 15
  dueDaysDefault?: number;    // default 7 (как у тебя в UI)
  criticalDays?: number;      // default 14
}): Promise<string> {
  const TOP = Math.max(1, Math.floor(Number(p.topN ?? 15)));
  const DUE_DAYS = Math.max(0, Math.floor(Number(p.dueDaysDefault ?? 7)));
  const CRIT_DAYS = Math.max(1, Math.floor(Number(p.criticalDays ?? 14)));

  const finAll = Array.isArray(p.financeRows) ? p.financeRows : [];
  const spendAll = Array.isArray(p.spendRows) ? p.spendRows : [];

  const from = p.periodFrom ? iso10(p.periodFrom) : "";
  const to = p.periodTo ? iso10(p.periodTo) : "";
  const t0 = todayIso10();

  const inPeriod = (iso: any) => {
    const d = iso10(iso);
    if (!d) return true;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };

  // ---------- 1) Расходы по видам (из spendRows) ----------
  const byKind = new Map<string, { approved: number; paid: number; overpay: number }>();
  const bySupplierSpend = new Map<string, { approved: number; paid: number; rest: number }>();

  for (const r of spendAll) {
    const aIso = clampIso(r?.director_approved_at ?? r?.approved_at ?? r?.approvedAtIso);
    if (!inPeriod(aIso)) continue;

    const k = kindNorm(r?.kind_name ?? r?.kindName ?? r?.kind);
    const a = nnum(r?.approved_alloc);
    const pd = nnum(r?.paid_alloc_cap ?? r?.paid_alloc);
    const ov = nnum(r?.overpay_alloc);

    const curK = byKind.get(k) ?? { approved: 0, paid: 0, overpay: 0 };
    curK.approved += a;
    curK.paid += pd;
    curK.overpay += ov;
    byKind.set(k, curK);

    const sup = String(r?.supplier ?? "").trim() || "—";
    const curS = bySupplierSpend.get(sup) ?? { approved: 0, paid: 0, rest: 0 };
    curS.approved += a;
    curS.paid += pd;
    curS.rest += Math.max(a - pd, 0);
    bySupplierSpend.set(sup, curS);
  }

  const kindOrder = ["Материалы", "Работы", "Услуги", "Другое"];
  const kindRows = kindOrder
    .filter((k) => byKind.has(k))
    .map((k) => ({ kind: k, ...byKind.get(k)! }))
    .filter((x) => x.approved !== 0 || x.paid !== 0 || x.overpay !== 0);

  const totalApproved = kindRows.reduce((s, x) => s + nnum(x.approved), 0);
  const totalPaid = kindRows.reduce((s, x) => s + nnum(x.paid), 0);
  const totalOverpay = kindRows.reduce((s, x) => s + nnum(x.overpay), 0);

  // ТОП-15 по расходам + Прочие
  const spendSupListRaw = Array.from(bySupplierSpend.entries())
    .map(([supplier, v]) => ({ supplier, approved: v.approved, paid: v.paid, rest: v.rest }))
    .sort((a, b) => nnum(b.approved) - nnum(a.approved));

  const spendSupList = topNWithOthers(
    spendSupListRaw,
    TOP,
    ["approved", "paid", "rest"],
    (agg) => ({
      supplier: `Прочие (${agg.count})`,
      approved: agg.approved || 0,
      paid: agg.paid || 0,
      rest: agg.rest || 0,
    })
  );

  // ---------- 2) Долги/риски (из financeRows) ----------
  type Inv = {
    supplier: string;
    title: string;
    amount: number;
    paid: number;
    rest: number;
    approvedIso: string;
    invoiceIso: string;
    dueIso: string;
    overdue: boolean;
    critical: boolean;
    paidFirstAt: string;
    paidLastAt: string;
  };

  const invs: Inv[] = [];

  for (const r of finAll) {
    const supplier = pickSupplier(r);

    const amount = nnum(r?.amount ?? r?.invoice_amount ?? r?.invoiceAmount ?? 0);
    const paid = nnum(r?.paidAmount ?? r?.total_paid ?? r?.totalPaid ?? r?.paid_amount ?? 0);
    const rest = Math.max(amount - paid, 0);

    // для управленческого отчёта берём только то, где есть смысл
    if (amount <= 0 && rest <= 0) continue;

    const approvedIso = clampIso(pickApprovedIso(r) ?? "");
    const invoiceIso = clampIso(pickInvoiceIso(r) ?? "");
    const anchorIso = approvedIso || invoiceIso;

    if (!inPeriod(anchorIso)) continue;

    const dueRaw = clampIso(pickDueIso(r) ?? "");
    const dueIso =
      dueRaw ||
      (invoiceIso ? addDaysIso(invoiceIso, DUE_DAYS) : "") ||
      (approvedIso ? addDaysIso(approvedIso, DUE_DAYS) : "");

    const overdue = rest > 0 && !!dueIso && dueIso < t0;

    let critical = false;
    if (overdue && dueIso) {
      const dd = new Date(dueIso + "T00:00:00Z").getTime();
      const tt = new Date(t0 + "T00:00:00Z").getTime();
      const days = Math.floor((tt - dd) / (24 * 3600 * 1000));
      critical = days >= CRIT_DAYS;
    }

    invs.push({
      supplier,
      title: invoiceTitle(r),
      amount,
      paid,
      rest,
      approvedIso,
      invoiceIso,
      dueIso,
      overdue,
      critical,
      paidFirstAt: clampIso(r?.paid_first_at ?? r?.raw?.paid_first_at ?? ""),
      paidLastAt: clampIso(r?.paid_last_at ?? r?.raw?.paid_last_at ?? ""),
    });
  }

  const totalDebt = invs.reduce((s, x) => s + Math.max(nnum(x.rest), 0), 0);
  const overdueSum = invs.reduce((s, x) => s + (x.overdue ? Math.max(nnum(x.rest), 0) : 0), 0);
  const criticalSum = invs.reduce((s, x) => s + (x.critical ? Math.max(nnum(x.rest), 0) : 0), 0);

  const unpaidCnt = invs.filter((x) => x.amount > 0 && x.paid <= 0 && x.rest > 0).length;
  const partialCnt = invs.filter((x) => x.amount > 0 && x.paid > 0 && x.rest > 0).length;
  const paidCnt = invs.filter((x) => x.amount > 0 && x.rest <= 0).length;

  // ТОП-15 по долгу + Прочие
  const bySupplierDebt = new Map<string, { debt: number; overdue: number; critical: number; invoices: number }>();
  for (const x of invs) {
    if (x.rest <= 0) continue;
    const cur = bySupplierDebt.get(x.supplier) ?? { debt: 0, overdue: 0, critical: 0, invoices: 0 };
    cur.debt += x.rest;
    cur.invoices += 1;
    if (x.overdue) cur.overdue += x.rest;
    if (x.critical) cur.critical += x.rest;
    bySupplierDebt.set(x.supplier, cur);
  }

  const debtSupListRaw = Array.from(bySupplierDebt.entries())
    .map(([supplier, v]) => ({ supplier, debt: v.debt, overdue: v.overdue, critical: v.critical, invoices: v.invoices }))
    .sort((a, b) => nnum(b.debt) - nnum(a.debt));

  const debtSupList = topNWithOthers(
    debtSupListRaw,
    TOP,
    ["debt", "overdue", "critical", "invoices"],
    (agg) => ({
      supplier: `Прочие (${agg.count})`,
      debt: agg.debt || 0,
      overdue: agg.overdue || 0,
      critical: agg.critical || 0,
      invoices: agg.invoices || 0,
    })
  );

  // ТОП-3 быстрых (из ТОП-15 по долгу)
  const top3Txt = debtSupListRaw.slice(0, 3).map((x) => `${x.supplier}: ${money(x.debt)} KGS`).join(" • ");

  // ---------- 3) Проблемные счета (везде, общий список) ----------
  const problemInvs = invs
    .filter((x) => x.rest > 0) // долг
    .sort((a, b) => {
      // критично -> просрочено -> остальные, потом по сумме долга
      const ra = a.critical ? 0 : a.overdue ? 1 : 2;
      const rb = b.critical ? 0 : b.overdue ? 1 : 2;
      if (ra !== rb) return ra - rb;
      return nnum(b.rest) - nnum(a.rest);
    })
    .slice(0, 80);

  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
  <title>Управленческий финансовый отчёт</title>
  <style>
    @page { margin: 14mm 12mm 20mm 12mm; } /* снизу больше места под номер страницы */

    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; color:#0f172a}
    h1{font-size:18px;margin:0 0 6px 0}
    h2{font-size:14px;margin:14px 0 6px 0}
    .muted{color:#64748b}
    .box{border:1px solid #e5e7eb;border-radius:14px;padding:12px;margin:10px 0;background:#fff}
    .row{display:flex;gap:12px;flex-wrap:wrap}
    .cell{flex:1 1 220px}
    .lbl{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#64748b}
    .val{margin-top:4px;font-size:14px;font-weight:900}

    /* ============================== MAYAK: PRINT TABLE HEADER REPEAT ============================== */
    table{width:100%;border-collapse:collapse;margin-top:10px;page-break-inside:auto}
    thead{display:table-header-group}
    tfoot{display:table-footer-group}
    tr{page-break-inside:avoid;page-break-after:auto}
    th,td{border:1px solid #e5e7eb;padding:8px 10px;vertical-align:top;font-size:13px}
    th{background:#f8fafc;font-weight:900}
    /* ============================ END MAYAK: PRINT TABLE HEADER REPEAT ============================ */

    .tag{display:inline-block;padding:3px 8px;border-radius:999px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:900;font-size:11px}
    .bad{background:#fffbeb;border-color:#fde68a}
    .crit{background:#fef2f2;border-color:#fecaca}
    .ok{background:#ecfdf5;border-color:#a7f3d0}

    /* ============================== MAYAK: PAGE NUMBERS ============================== */
    .page-footer{
      position:fixed;
      left:0; right:0;
      bottom:-12mm;
      text-align:center;
      color:#64748b;
      font-size:11px;
    }
    .page-footer:after{ content:"Стр. " counter(page); }
    /* ============================ END MAYAK: PAGE NUMBERS ============================ */
  </style></head><body>

  <h1>Финансовый управленческий отчёт (директор)</h1>
  <div class="muted">Период: <b>${esc(periodText(p.periodFrom, p.periodTo))}</b> • ТОП поставщиков: <b>${esc(String(TOP))}</b></div>

  <div class="box">
    <div class="row">
      <div class="cell"><div class="lbl">Утверждено (allocation)</div><div class="val">${esc(money(totalApproved))} KGS</div></div>
      <div class="cell"><div class="lbl">Оплачено (allocation)</div><div class="val">${esc(money(totalPaid))} KGS</div></div>
      <div class="cell"><div class="lbl">Долг (по счетам)</div><div class="val">${esc(money(totalDebt))} KGS</div></div>
      <div class="cell"><div class="lbl">Просрочено</div><div class="val">${esc(money(overdueSum))} KGS</div></div>
      <div class="cell"><div class="lbl">Критично</div><div class="val">${esc(money(criticalSum))} KGS</div></div>
      <div class="cell"><div class="lbl">Переплата</div><div class="val">${totalOverpay > 0 ? esc(money(totalOverpay)) + " KGS" : "—"}</div></div>
    </div>
    <div class="muted" style="margin-top:8px">
      Быстро: ${top3Txt ? `<b>${esc(top3Txt)}</b>` : "ТОП-поставщики по долгу отсутствуют"}
      • Счета: не оплачено <b>${esc(String(unpaidCnt))}</b>, частично <b>${esc(String(partialCnt))}</b>, оплачено <b>${esc(String(paidCnt))}</b>
    </div>
  </div>

  <h2>1) Обязательства и риски (ТОП ${esc(String(TOP))} + Прочие)</h2>
  <div class="box">
    ${
      debtSupList.length
        ? `<table>
            <thead>
              <tr>
                <th>Поставщик</th>
                <th>Долг</th>
                <th>Просрочено</th>
                <th>Критично</th>
                <th>Счетов</th>
              </tr>
            </thead>
            <tbody>
              ${debtSupList
                .map((x: any) => {
                  const risk =
                    nnum(x.critical) > 0 ? `<span class="tag crit">критично</span>`
                    : nnum(x.overdue) > 0 ? `<span class="tag bad">просрочено</span>`
                    : `<span class="tag ok">ок</span>`;
                  return `<tr>
                    <td>${esc(String(x.supplier || "—"))} ${String(x.supplier || "").startsWith("Прочие") ? "" : risk}</td>
                    <td>${esc(money(x.debt))} KGS</td>
                    <td>${nnum(x.overdue) > 0 ? esc(money(x.overdue)) + " KGS" : "—"}</td>
                    <td>${nnum(x.critical) > 0 ? esc(money(x.critical)) + " KGS" : "—"}</td>
                    <td>${esc(String(Math.floor(nnum(x.invoices))))}</td>
                  </tr>`;
                })
                .join("")}
            </tbody>
          </table>`
        : `<div class="muted">Нет долгов/рисков за период.</div>`
    }
  </div>

  <h2>2) Расходы по видам</h2>
  <div class="box">
    ${
      kindRows.length
        ? `<table>
            <thead>
              <tr>
                <th>Вид</th>
                <th>Утверждено</th>
                <th>Оплачено</th>
                <th>Переплата</th>
              </tr>
            </thead>
            <tbody>
              ${kindRows
                .map((k: any) => `<tr>
                  <td>${esc(k.kind)}</td>
                  <td>${esc(money(k.approved))} KGS</td>
                  <td>${esc(money(k.paid))} KGS</td>
                  <td>${nnum(k.overpay) > 0 ? esc(money(k.overpay)) + " KGS" : "—"}</td>
                </tr>`)
                .join("")}
            </tbody>
          </table>`
        : `<div class="muted">Нет данных по расходам за период.</div>`
    }
  </div>

  <h2>3) ТОП поставщики по расходам (ТОП ${esc(String(TOP))} + Прочие)</h2>
  <div class="box">
    ${
      spendSupList.length
        ? `<table>
            <thead>
              <tr>
                <th>Поставщик</th>
                <th>Утверждено</th>
                <th>Оплачено</th>
                <th>Остаток</th>
              </tr>
            </thead>
            <tbody>
              ${spendSupList
                .map((x: any) => `<tr>
                  <td>${esc(String(x.supplier || "—"))}</td>
                  <td>${esc(money(x.approved))} KGS</td>
                  <td>${esc(money(x.paid))} KGS</td>
                  <td>${nnum(x.rest) > 0 ? esc(money(x.rest)) + " KGS" : "—"}</td>
                </tr>`)
                .join("")}
            </tbody>
          </table>`
        : `<div class="muted">Нет данных по поставщикам за период.</div>`
    }
  </div>

  <h2>4) Проблемные счета (все поставщики, до 80 строк)</h2>
  <div class="box">
    ${
      problemInvs.length
        ? `<table>
            <thead>
              <tr>
                <th>Поставщик</th>
                <th>Документ</th>
                <th>Сумма</th>
                <th>Оплачено</th>
                <th>Остаток</th>
                <th>Риск</th>
                <th>Даты</th>
              </tr>
            </thead>
            <tbody>
              ${problemInvs
                .map((x: any) => {
                  const risk =
                    x.critical ? `<span class="tag crit">критично</span>`
                    : x.overdue ? `<span class="tag bad">просрочено</span>`
                    : `<span class="tag">долг</span>`;

                  const payTxt =
                    x.paidFirstAt && x.paidLastAt
                      ? (String(x.paidFirstAt) === String(x.paidLastAt)
                          ? `опл. ${fmtDateOnly(x.paidFirstAt)}`
                          : `опл. ${fmtDateOnly(x.paidFirstAt)} → ${fmtDateOnly(x.paidLastAt)}`)
                      : x.paidFirstAt
                        ? `опл. ${fmtDateOnly(x.paidFirstAt)}`
                        : x.paidLastAt
                          ? `опл. ${fmtDateOnly(x.paidLastAt)}`
                          : "";

                  const dates = [
                    x.approvedIso ? `утв. ${fmtDateOnly(x.approvedIso)}` : "",
                    payTxt,
                    x.invoiceIso ? `счёт ${fmtDateOnly(x.invoiceIso)}` : "",
                    x.dueIso ? `срок ${fmtDateOnly(x.dueIso)}` : "",
                  ].filter(Boolean).join(" • ");

                  return `<tr>
                    <td>${esc(x.supplier)}</td>
                    <td>${esc(x.title)}</td>
                    <td>${esc(money(x.amount))} KGS</td>
                    <td>${esc(money(x.paid))} KGS</td>
                    <td>${esc(money(x.rest))} KGS</td>
                    <td>${risk}</td>
                    <td>${esc(dates || "—")}</td>
                  </tr>`;
                })
                .join("")}
            </tbody>
          </table>`
        : `<div class="muted">Проблемных счетов нет (долг = 0).</div>`
    }
  </div>

  <div class="page-footer"></div>
</body></html>`;

  return openHtmlAsPdfUniversal(normalizeRuText(html));
}
