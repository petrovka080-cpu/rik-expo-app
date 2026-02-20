// src/lib/api/pdf_payment.ts
import { supabase } from "../supabaseClient";
import { openHtmlAsPdfUniversal } from "./pdf";
import type { PaymentPdfDraft } from "./types";

function pick(draftVal: any, dbVal: any, fallback = "—") {
  const d = String(draftVal ?? "").trim();
  if (d) return d;
  const v = String(dbVal ?? "").trim();
  return v || fallback;
}

const nnum = (v: any) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const round2 = (v: number) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

function allocProportional(totalAmount: number, weights: number[]) {
  const total = Math.max(0, nnum(totalAmount));
  const ws = (weights || []).map((x) => Math.max(0, nnum(x)));
  const sumW = ws.reduce((a, b) => a + b, 0);

  const out = ws.map(() => 0);
  if (!total || sumW <= 0) return out;

  let acc = 0;
  for (let i = 0; i < ws.length; i++) {
    if (i === ws.length - 1) out[i] = round2(total - acc);
    else {
      const v = round2((total * ws[i]) / sumW);
      out[i] = v;
      acc = round2(acc + v);
    }
  }
  return out;
}

function moneyToWordsKGS(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const som = Math.floor(n);
  const tyiyn = Math.round((n - som) * 100);

  const unitsM = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
  const unitsF = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
  const teens = [
    "десять","одиннадцать","двенадцать","тринадцать","четырнадцать",
    "пятнадцать","шестнадцать","семнадцать","восемнадцать","девятнадцать"
  ];
  const tens = ["", "", "двадцать","тридцать","сорок","пятьдесят","шестьдесят","семьдесят","восемьдесят","девяносто"];
  const hundreds = ["", "сто","двести","триста","четыреста","пятьсот","шестьсот","семьсот","восемьсот","девятьсот"];

  const morph = (num: number, f1: string, f2: string, f5: string) => {
    const n10 = num % 10;
    const n100 = num % 100;
    if (n100 >= 11 && n100 <= 19) return f5;
    if (n10 === 1) return f1;
    if (n10 >= 2 && n10 <= 4) return f2;
    return f5;
  };

  const triadToWords = (num: number, female: boolean) => {
    const u = female ? unitsF : unitsM;
    const h = Math.floor(num / 100);
    const t = Math.floor((num % 100) / 10);
    const d = num % 10;
    const out: string[] = [];
    if (h) out.push(hundreds[h]);
    if (t === 1) out.push(teens[num % 100 - 10]);
    else {
      if (t) out.push(tens[t]);
      if (d) out.push(u[d]);
    }
    return out.join(" ");
  };

  const parts: string[] = [];
  const billions = Math.floor(som / 1_000_000_000);
  const millions = Math.floor((som % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((som % 1_000_000) / 1000);
  const rest = som % 1000;

  if (billions) {
    parts.push(triadToWords(billions, false));
    parts.push(morph(billions, "миллиард", "миллиарда", "миллиардов"));
  }
  if (millions) {
    parts.push(triadToWords(millions, false));
    parts.push(morph(millions, "миллион", "миллиона", "миллионов"));
  }
  if (thousands) {
    parts.push(triadToWords(thousands, true));
    parts.push(morph(thousands, "тысяча", "тысячи", "тысяч"));
  }
  if (rest || parts.length === 0) parts.push(triadToWords(rest, false));

  const somWord = morph(som, "сом", "сома", "сомов");
  const tyiynWord = morph(tyiyn, "тыйын", "тыйына", "тыйынов");

  const somText = parts.join(" ").replace(/\s+/g, " ").trim();
  return `${somText} ${somWord} ${String(tyiyn).padStart(2, "0")} ${tyiynWord}`.trim();
}

export async function buildPaymentOrderHtml(paymentId: number, draft?: PaymentPdfDraft): Promise<string> {
  const pid = Number(paymentId);
  if (!Number.isFinite(pid) || pid <= 0) throw new Error("payment_id invalid");

  const { data, error } = await supabase.rpc("get_payment_order_data", { p_payment_id: pid } as any);
  if (error) throw error;
  if (!data) throw new Error("Нет данных для платёжки");

  const payload = data as any;
  const c = payload.company ?? {};
  const p = payload.payment ?? {};
  const pr = payload.proposal ?? {};

  const esc = (s: any) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const attachmentsRaw =
    (Array.isArray(payload?.attachments) && payload.attachments) ||
    (Array.isArray(payload?.payment_files) && payload.payment_files) ||
    (Array.isArray(payload?.files) && payload.files) ||
    [];

  const attachments = (attachmentsRaw as any[])
    .map((x) => ({
      name: String(x.file_name ?? x.name ?? x.filename ?? "file").trim(),
      url: String(x.url ?? x.file_url ?? x.public_url ?? x.signed_url ?? "").trim(),
      kind: String(x.kind ?? x.group_key ?? x.type ?? "").trim(),
    }))
    .filter((x) => x.url);

  const attachmentsHtml = attachments.length
    ? `
    <div class="box">
      <div class="lbl">Вложения</div>
      <div class="attList">
        ${attachments
          .map((a) => {
            const kind = a.kind ? `<span class="attKind">${esc(a.kind)}</span>` : "";
            return `
              <a class="attRow" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">
                <div class="attName">${esc(a.name)}</div>
                ${kind}
              </a>
            `;
          })
          .join("")}
      </div>
      <div class="muted" style="margin-top:6px">Открываются в браузере по ссылке.</div>
    </div>
  `
    : `
    <div class="box">
      <div class="lbl">Вложения</div>
      <div class="muted">Нет вложений</div>
    </div>
  `;

  const fmt2 = (v: any) => {
    const n = Number(String(v ?? "").replace(",", "."));
    return Number.isFinite(n)
      ? n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "";
  };

  const fmtQty = (v: any) => {
    const n = Number(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) ? n.toLocaleString("ru-RU", { maximumFractionDigits: 3 }) : "";
  };

  const sumItems = (arr: any[]) =>
    (arr || []).reduce((s, it) => {
      const qty = nnum(it.qty);
      const price = nnum(it.price);
      return s + qty * price;
    }, 0);

  const paidAt = p.paid_at ? new Date(p.paid_at).toLocaleString("ru-RU") : "—";
  const cur = String(p.currency ?? pr.invoice_currency ?? "KGS");
  const fio = String(p.accountant_fio ?? "").trim();

  const supplier = pick(draft?.supplier, pr.supplier ?? p.supplier ?? payload?.supplier);
  const invNo = pick(draft?.invoice_number, pr.invoice_number ?? p.invoice_number);
  const invDt = pick(draft?.invoice_date, pr.invoice_date ?? p.invoice_date);

  const purposeDb = String(p.purpose ?? p.note ?? "").trim();
  const purposeAuto = `Оплата по счёту №${invNo} от ${invDt}. Поставщик: ${supplier}.`;
  const purpose = purposeDb ? purposeDb : purposeAuto;

  const payBank = pick(draft?.bank_name, (p as any)?.bank_name ?? (pr as any)?.bank_name, "—");
  const payBik  = pick(draft?.bik,      (p as any)?.bik      ?? (pr as any)?.bik,      "—");
  const payRs   = pick(draft?.rs,       (p as any)?.rs       ?? (pr as any)?.rs,       "—");
  const payInn  = pick(draft?.inn,      (p as any)?.inn      ?? (pr as any)?.inn,      "—");
  const payKpp  = pick(draft?.kpp,      (p as any)?.kpp      ?? (pr as any)?.kpp,      "—");

  const items = Array.isArray(payload?.items) ? payload.items : [];

  const itemKey = (it: any) => {
  
    const k =
      it?.proposal_item_id ??
      it?.proposalItemId ??
      it?.pi_id ??
      it?.item_id ??
      it?.id;
    return String(k ?? "").trim();
  };
 
  const payAmount = round2(nnum(p.amount));
  const totalPaid = round2(nnum(p.total_paid));

  const itemsTotal = round2(sumItems(items as any[]));
  const invoiceTotal = round2(nnum(pr.items_total) > 0 ? nnum(pr.items_total) : itemsTotal);
  const safeInvoiceTotal = invoiceTotal > 0 ? invoiceTotal : itemsTotal;

  const paidBefore = round2(Math.max(0, totalPaid - payAmount));

  const lineSum = (it: any) => round2(nnum(it.qty) * nnum(it.price));
  const lineTotals = (items as any[]).map((it) => lineSum(it));

  // --------------------------
  // ✅ paid_before per line (auto)
  // --------------------------
  const beforeAllocRaw = allocProportional(paidBefore, lineTotals);
  const beforeAlloc = beforeAllocRaw.map((v, i) => Math.min(round2(v), lineTotals[i]));
  const remain = lineTotals.map((t, i) => round2(Math.max(0, t - beforeAlloc[i])));

  // --------------------------
  // ✅ TRY LOAD MANUAL ALLOCATIONS (истина)
  // --------------------------
  let manualAllocMap = new Map<string, number>();
  try {
    const q = await supabase
      .from("proposal_payment_allocations")
      .select("proposal_item_id, amount")
      .eq("payment_id", pid);

    if (!q.error && Array.isArray(q.data) && q.data.length) {
      for (const r of q.data as any[]) {
        const k = String(r.proposal_item_id ?? "").trim();
        const a = round2(nnum(r.amount));
        if (k && a > 0) manualAllocMap.set(k, a);
      }
    }
  } catch {}

  const hasManual = manualAllocMap.size > 0;
  
  let thisAlloc = (items as any[]).map(() => 0);

  if (hasManual) {
    for (let i = 0; i < items.length; i++) {
      const k = itemKey(items[i]);
      const want = round2(nnum(manualAllocMap.get(k) ?? 0));
      thisAlloc[i] = Math.min(want, nnum(remain[i]));
    }
  } else {

    const thisAllocRaw = allocProportional(payAmount, remain);
    thisAlloc = thisAllocRaw.map((v, i) => Math.min(round2(v), nnum(remain[i])));
  }

  const paidItemTotal = lineTotals.map((t, i) => round2(nnum(beforeAlloc[i]) + nnum(thisAlloc[i])));
  const restItem = lineTotals.map((t, i) => round2(Math.max(0, nnum(t) - nnum(paidItemTotal[i]))));

  const thisSum = round2(thisAlloc.reduce((s, v) => s + nnum(v), 0));
  const thisOverpay = round2(Math.max(0, payAmount - thisSum));

  const rest = round2(Math.max(0, safeInvoiceTotal - Math.min(safeInvoiceTotal, totalPaid)));
  const overpayAll = round2(Math.max(0, totalPaid - safeInvoiceTotal));

  const amountWords = moneyToWordsKGS(payAmount);

  const billKeyOf = (it: any) => {
    const invNo2 = String(it?.invoice_number ?? invNo ?? "—").trim();
    const invDt2 = String(it?.invoice_date ?? invDt ?? "—").trim();
    const supp = String(it?.supplier ?? pr.supplier ?? "—").trim();
    return `${invNo2}||${invDt2}||${supp}`;
  };

  const kindOf = (it: any) => {
    const c = String(it?.rik_code ?? "").toUpperCase();
    if (c.startsWith("MAT-")) return "Материалы";
    if (c.startsWith("WRK-")) return "Работы";
    if (c.startsWith("SRV-") || c.startsWith("SVC-")) return "Услуги";
    return "Прочее";
  };

  const groupBy = <T,>(arr: T[], keyFn: (x: T) => string) => {
    const m = new Map<string, T[]>();
    for (const x of arr || []) {
      const k = keyFn(x);
      m.set(k, [...(m.get(k) ?? []), x]);
    }
    return Array.from(m.entries());
  };

  const bills = groupBy(items, billKeyOf);

  const autoNote = hasManual
    ? `Распределение по позициям: РУЧНОЕ (внесено бухгалтером).`
    : `Распределение по позициям рассчитано автоматически (пропорционально сумме позиций).`;

  const cardsHtml = bills.length
    ? bills
        .map(([billKey, billItems]) => {
          const [invNo3, invDt3, supp] = billKey.split("||");
          const billSum = sumItems(billItems as any[]);
          const typeGroups = groupBy(billItems as any[], (x: any) => kindOf(x));

          const typeHtml = typeGroups
            .map(([typeName, typeItems]) => {
              const typeSum = sumItems(typeItems as any[]);

              const cards = (typeItems as any[])
                .map((it: any) => {
                  const idx = (items as any[]).indexOf(it);
                  const name = String(it.name_human ?? it.name ?? "").trim();
                  const uom = String(it.uom ?? "").trim();
                  const qty = nnum(it.qty);
                  const price = nnum(it.price);
                  const sum = lineSum(it);

                  const paidAllLine = idx >= 0 ? paidItemTotal[idx] : 0;
                  const paidThisLine = idx >= 0 ? thisAlloc[idx] : 0;
                  const restLine = idx >= 0 ? restItem[idx] : sum;

                  return `
                    <div class="card">
                      <div class="cardTop">
                        <div class="cardName">${esc(name || "—")}</div>
                        <div class="cardSum">${esc(fmt2(sum))} ${esc(cur)}</div>
                      </div>
                      <div class="cardMeta">${esc(fmtQty(qty))} ${esc(uom)} × ${esc(fmt2(price))}</div>
                      <div class="cardMeta">
                        Оплачено всего: <b>${esc(fmt2(paidAllLine))}</b> •
                        этим платежом: <b>${esc(fmt2(paidThisLine))}</b> •
                        остаток: <b>${esc(fmt2(restLine))}</b> ${esc(cur)}
                      </div>
                    </div>
                  `;
                })
                .join("");

              const idxs = (typeItems as any[])
                .map((it: any) => (items as any[]).indexOf(it))
                .filter((i: number) => i >= 0);

              const paidAllGroup = round2(idxs.reduce((s: number, i: number) => s + paidItemTotal[i], 0));
              const paidThisGroup = round2(idxs.reduce((s: number, i: number) => s + thisAlloc[i], 0));
              const restGroup = round2(idxs.reduce((s: number, i: number) => s + restItem[i], 0));

              return `
                <div class="groupHead">
                  <div class="groupTitle">${esc(String(typeName))}</div>
                  <div class="groupTotal">${esc(fmt2(typeSum))} ${esc(cur)}</div>
                </div>
                ${cards}
                <div class="subTotalRow">
                  <div>Итого по ${esc(String(typeName).toLowerCase())}</div>
                  <div class="subTotalVal">
                    ${esc(fmt2(typeSum))} ${esc(cur)}
                    <div class="muted">оплачено всего: <b>${esc(fmt2(paidAllGroup))}</b> • этим платежом: <b>${esc(fmt2(paidThisGroup))}</b> • остаток: <b>${esc(fmt2(restGroup))}</b></div>
                  </div>
                </div>
              `;
            })
            .join("");

          return `
            <div class="billBox">
              <div class="billHead">
                <div class="billTitle">Счёт: ${esc(invNo3 || "—")} от ${esc(invDt3 || "—")}</div>
                <div class="billSum">${esc(fmt2(billSum))} ${esc(cur)}</div>
              </div>
              <div class="billSub">Поставщик: ${esc(supp || "—")}</div>
              ${typeHtml}
              <div class="billTotalRow">
                <div>ИТОГО ПО СЧЁТУ</div>
                <div class="billTotalVal">${esc(fmt2(billSum))} ${esc(cur)}</div>
              </div>
            </div>
          `;
        })
        .join("")
    : `<div class="muted" style="margin-top:8px">Нет строк</div>`;

  const signHtml = `
    <div class="signs">
      <div class="sign">
        <div class="sign-label">Бухгалтер</div>
        <div class="sign-line"></div>
        <div class="sign-name">${esc(fio || "")}</div>
      </div>
      <div class="sign">
        <div class="sign-label">Директор</div>
        <div class="sign-line"></div>
        <div class="sign-name">&nbsp;</div>
      </div>
    </div>
  `;

  const totalLines = items.length;

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>Платёжный отчёт ${esc(p.payment_id)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  @page { margin: 14mm 12mm 16mm 12mm; }
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; padding:16px; color:#111}
  h1{font-size:18px;margin:0 0 10px 0}
  .pageFooter{position:fixed;left:0;right:0;bottom:0;padding:6px 12mm;font-size:11px;color:#64748b;border-top:1px solid #e5e7eb;background:#fff}
  .pageFooter .right{float:right}
  .pageCounter:before{content:"Стр. " counter(page) " из " counter(pages);}
  .box{border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin:10px 0;background:#fff}
  .row{display:flex;gap:12px;flex-wrap:wrap}
  .cell{flex:1 1 260px}
  .lbl{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#64748b}
  .val{margin-top:4px;font-size:14px;font-weight:800;color:#0f172a}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  td{border:1px solid #e5e7eb;padding:8px 10px;vertical-align:top;font-size:13px}
  .muted{color:#64748b}
  .billBox{border:1px solid #e5e7eb;border-radius:14px;padding:12px;margin-top:10px;background:#fff}
  .billHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
  .billTitle{font-weight:900;color:#0f172a}
  .billSum{font-weight:900;color:#0f172a;white-space:nowrap}
  .billSub{margin-top:4px;color:#64748b;font-size:12px}
  .billTotalRow{display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding:10px 12px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px}
  .billTotalVal{font-weight:900;white-space:nowrap}
  .groupHead{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:10px;border-top:1px solid #e5e7eb}
  .groupTitle{font-weight:900;color:#0f172a}
  .groupTotal{font-weight:900;color:#0f172a;white-space:nowrap}
  .card{border:1px solid #e5e7eb;border-radius:12px;padding:10px 12px;background:#fff;margin-top:8px;page-break-inside:avoid}
  .cardTop{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
  .cardName{font-weight:800;color:#0f172a;flex:1}
  .cardSum{font-weight:900;color:#0f172a;white-space:nowrap}
  .cardMeta{margin-top:4px;color:#64748b;font-size:12px}
  .subTotalRow{display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding:8px 10px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px}
  .subTotalVal{font-weight:900;white-space:nowrap}
  .grandRow{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding:10px 12px;background:#f1f5f9;border-radius:12px;border:2px solid #0f172a}
  .grandVal{font-weight:900;white-space:nowrap}
  .signs{display:flex;gap:24px;margin-top:18px;flex-wrap:wrap}
  .sign{flex:1 1 280px;border:1px dashed #cbd5e1;border-radius:14px;padding:14px 16px;background:#f8fafc;page-break-inside:avoid}
  .sign-label{font-size:12px;font-weight:800;color:#334155}
  .sign-line{margin-top:26px;border-bottom:1px solid #0f172a;height:1px;width:220px}
  .sign-name{margin-top:8px;font-size:12px;color:#64748b}
  .summaryRow{display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:12px;background:#f8fafc}
  .attList{display:flex;flex-direction:column;gap:8px;margin-top:10px}
  .attRow{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:12px;text-decoration:none;color:#0f172a;background:#fff}
  .attRow:hover{background:#f8fafc}
  .attName{font-weight:800;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .attKind{font-size:11px;font-weight:900;padding:4px 8px;border-radius:999px;background:#eef2ff;color:#3730a3;border:1px solid #c7d2fe;white-space:nowrap}
  .warn{margin-top:10px;padding:10px 12px;border-radius:12px;border:1px solid #fde68a;background:#fffbeb;color:#92400e;font-weight:800;font-size:12px}
</style></head><body>

<div class="pageFooter">
  <span class="left">GOX BUILD • Платёжный отчёт</span>
  <span class="right pageCounter"></span>
</div>

<h1>Платёжный отчёт</h1>
<div class="muted" style="margin:-6px 0 10px 0">Внутренний документ. Не является банковским платёжным поручением.</div>

<div class="box">
  <div class="row">
    <div class="cell"><div class="lbl">Платёж ID</div><div class="val">${esc(p.payment_id)}</div></div>
    <div class="cell"><div class="lbl">Дата/время оплаты</div><div class="val">${esc(paidAt)}</div></div>
    <div class="cell"><div class="lbl">Сумма</div><div class="val">${esc(fmt2(payAmount))} ${esc(cur)}</div></div>
  </div>

  <div class="row" style="margin-top:8px">
    <div class="cell">
      <div class="lbl">Основание</div>
      <div class="val">Счёт: ${esc(invNo)} от ${esc(invDt)}</div>
      <div class="muted" style="margin-top:6px">
        Итого по счёту: <b>${esc(fmt2(safeInvoiceTotal))} ${esc(cur)}</b> •
        Оплачено всего: <b>${esc(fmt2(totalPaid))} ${esc(cur)}</b> •
        Остаток: <b>${esc(fmt2(rest))} ${esc(cur)}</b>
        ${overpayAll > 0 ? ` • Переплата: <b>${esc(fmt2(overpayAll))} ${esc(cur)}</b>` : ``}
      </div>
      <div class="muted" style="margin-top:6px">Proposal: ${esc(pr.proposal_id ?? "")}</div>
    </div>
  </div>

  <div class="row" style="margin-top:8px">
    <div class="cell">
      <div class="lbl">Сумма прописью</div>
      <div class="val" style="font-size:13px">${esc(amountWords)}</div>
    </div>
  </div>

  <div class="warn">${esc(autoNote)}</div>
</div>

<div class="box">
  <div class="lbl">Плательщик (наша компания)</div>
  <table>
    <tr><td>Название</td><td>${esc(c.company_name ?? "—")}</td></tr>
    <tr><td>ИНН / КПП</td><td>${esc(c.inn ?? "—")} / ${esc(c.kpp ?? "—")}</td></tr>
    <tr><td>Адрес</td><td>${esc(c.address ?? "—")}</td></tr>
    <tr><td>Банк</td><td>${esc(c.bank_name ?? "—")}</td></tr>
    <tr><td>БИК</td><td>${esc(c.bik ?? "—")}</td></tr>
    <tr><td>Р/с</td><td>${esc(c.account ?? "—")}</td></tr>
    <tr><td>К/с</td><td>${esc(c.corr_account ?? "—")}</td></tr>
    <tr><td>Тел/Email</td><td>${esc(c.phone ?? "—")} / ${esc(c.email ?? "—")}</td></tr>
  </table>
</div>

<div class="box">
  <div class="lbl">Получатель (поставщик)</div>
  <table>
    <tr><td>Поставщик</td><td>${esc(supplier || "—")}</td></tr>
    <tr><td>Назначение</td><td>${esc(purpose || "—")}</td></tr>
    <tr><td>Бухгалтер</td><td>${esc(fio || "—")}</td></tr>
    <tr><td>Способ</td><td>${esc(p.method ?? "")}</td></tr>

    <tr><td colspan="2" style="background:#f8fafc;font-weight:900">Реквизиты для оплаты</td></tr>
    <tr><td>Банк</td><td>${esc(payBank)}</td></tr>
    <tr><td>БИК</td><td>${esc(payBik)}</td></tr>
    <tr><td>Р/С</td><td>${esc(payRs)}</td></tr>
    <tr><td>ИНН</td><td>${esc(payInn)}</td></tr>
    <tr><td>КПП</td><td>${esc(payKpp)}</td></tr>
  </table>
</div>

${attachmentsHtml}

<div class="box">
  <div class="lbl">Расшифровка платежа</div>

  <div class="summaryRow">
    <div>Всего позиций: <b>${esc(String(totalLines))}</b></div>
    <div><b>${esc(fmt2(safeInvoiceTotal))} ${esc(cur)}</b></div>
  </div>

  <div class="summaryRow">
    <div>Оплачено этим платежом</div>
    <div><b>${esc(fmt2(payAmount))} ${esc(cur)}</b></div>
  </div>

  <div class="summaryRow">
    <div>Оплачено всего по счёту</div>
    <div><b>${esc(fmt2(totalPaid))} ${esc(cur)}</b></div>
  </div>

  <div class="summaryRow">
    <div>Остаток по счёту</div>
    <div><b>${esc(fmt2(rest))} ${esc(cur)}</b></div>
  </div>

  ${thisOverpay > 0 ? `
  <div class="summaryRow">
    <div>Переплата этим платежом</div>
    <div><b>${esc(fmt2(thisOverpay))} ${esc(cur)}</b></div>
  </div>` : ``}

  ${cardsHtml}

  <div class="grandRow">
    <div>ОБЩИЙ ИТОГ (позиции)</div>
    <div class="grandVal">${esc(fmt2(safeInvoiceTotal))} ${esc(cur)}</div>
  </div>

  ${signHtml}
</div>

</body></html>`;
}

export async function exportPaymentOrderPdf(paymentId: number, draft?: PaymentPdfDraft) {
  const html = await buildPaymentOrderHtml(paymentId, draft);
  return openHtmlAsPdfUniversal(html);
}
