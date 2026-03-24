import type { PaymentOrderPdfAttachment, PaymentOrderPdfBillGroup, PaymentOrderPdfContract } from "../api/paymentPdf.service";
import { normalizeRuTextForHtml } from "../text/encoding";

const esc = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const fmt2 = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed)
    ? parsed.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "";
};

const fmtQty = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed)
    ? parsed.toLocaleString("ru-RU", { maximumFractionDigits: 3 })
    : "";
};

function renderPaymentOrderAttachmentsHtml(attachments: PaymentOrderPdfAttachment[]): string {
  if (!attachments.length) {
    return `
    <div class="box">
      <div class="lbl">Р’Р»РѕР¶РµРЅРёСЏ</div>
      <div class="muted">РќРµС‚ РІР»РѕР¶РµРЅРёР№</div>
    </div>
  `;
  }

  return `
    <div class="box">
      <div class="lbl">Р’Р»РѕР¶РµРЅРёСЏ</div>
      <div class="attList">
        ${attachments
          .map((attachment) => {
            const kind = attachment.kind ? `<span class="attKind">${esc(attachment.kind)}</span>` : "";
            return `
              <a class="attRow" href="${esc(attachment.url)}" target="_blank" rel="noopener noreferrer">
                <div class="attName">${esc(attachment.name)}</div>
                ${kind}
              </a>
            `;
          })
          .join("")}
      </div>
      <div class="muted" style="margin-top:6px">РћС‚РєСЂС‹РІР°СЋС‚СЃСЏ РІ Р±СЂР°СѓР·РµСЂРµ РїРѕ СЃСЃС‹Р»РєРµ.</div>
    </div>
  `;
}

function renderPaymentOrderCardsHtml(bills: PaymentOrderPdfBillGroup[], currency: string): string {
  if (!bills.length) return `<div class="muted" style="margin-top:8px">РќРµС‚ СЃС‚СЂРѕРє</div>`;

  return bills
    .map((bill) => {
      const groupsHtml = bill.groups
        .map((group) => {
          const cards = group.lines
            .map((line) => `
              <div class="card">
                <div class="cardTop">
                  <div class="cardName">${esc(line.name || "вЂ”")}</div>
                  <div class="cardSum">${esc(fmt2(line.sum))} ${esc(currency)}</div>
                </div>
                <div class="cardMeta">${esc(fmtQty(line.qty))} ${esc(line.uom)} Г— ${esc(fmt2(line.price))}</div>
                <div class="cardMeta">
                  РћРїР»Р°С‡РµРЅРѕ РІСЃРµРіРѕ: <b>${esc(fmt2(line.paidAll))}</b> вЂў
                  СЌС‚РёРј РїР»Р°С‚РµР¶РѕРј: <b>${esc(fmt2(line.paidThis))}</b> вЂў
                  РѕСЃС‚Р°С‚РѕРє: <b>${esc(fmt2(line.rest))}</b> ${esc(currency)}
                </div>
              </div>
            `)
            .join("");

          return `
            <div class="groupHead">
              <div class="groupTitle">${esc(group.typeName)}</div>
              <div class="groupTotal">${esc(fmt2(group.total))} ${esc(currency)}</div>
            </div>
            ${cards}
            <div class="subTotalRow">
              <div>РС‚РѕРіРѕ РїРѕ ${esc(String(group.typeName).toLowerCase())}</div>
              <div class="subTotalVal">
                ${esc(fmt2(group.total))} ${esc(currency)}
                <div class="muted">РѕРїР»Р°С‡РµРЅРѕ РІСЃРµРіРѕ: <b>${esc(fmt2(group.paidAll))}</b> вЂў СЌС‚РёРј РїР»Р°С‚РµР¶РѕРј: <b>${esc(fmt2(group.paidThis))}</b> вЂў РѕСЃС‚Р°С‚РѕРє: <b>${esc(fmt2(group.rest))}</b></div>
              </div>
            </div>
          `;
        })
        .join("");

      return `
        <div class="billBox">
          <div class="billHead">
            <div class="billTitle">РЎС‡С‘С‚: ${esc(bill.invoiceNumber || "вЂ”")} РѕС‚ ${esc(bill.invoiceDate || "вЂ”")}</div>
            <div class="billSum">${esc(fmt2(bill.total))} ${esc(currency)}</div>
          </div>
          <div class="billSub">РџРѕСЃС‚Р°РІС‰РёРє: ${esc(bill.supplier || "вЂ”")}</div>
          ${groupsHtml}
          <div class="billTotalRow">
            <div>РРўРћР“Рћ РџРћ РЎР§РЃРўРЈ</div>
            <div class="billTotalVal">${esc(fmt2(bill.total))} ${esc(currency)}</div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderPaymentOrderSignHtml(accountantFio: string): string {
  return `
    <div class="signs">
      <div class="sign">
        <div class="sign-label">Р‘СѓС…РіР°Р»С‚РµСЂ</div>
        <div class="sign-line"></div>
        <div class="sign-name">${esc(accountantFio || "")}</div>
      </div>
      <div class="sign">
        <div class="sign-label">Р”РёСЂРµРєС‚РѕСЂ</div>
        <div class="sign-line"></div>
        <div class="sign-name">&nbsp;</div>
      </div>
    </div>
  `;
}

export function renderPaymentOrderPdfHtml(contract: PaymentOrderPdfContract): string {
  const { company, header, attachments, bills } = contract.payload;
  const attachmentsHtml = renderPaymentOrderAttachmentsHtml(attachments);
  const cardsHtml = renderPaymentOrderCardsHtml(bills, header.currency);
  const signHtml = renderPaymentOrderSignHtml(header.accountant_fio);

  return normalizeRuTextForHtml(`<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>РџР»Р°С‚С‘Р¶РЅС‹Р№ РѕС‚С‡С‘С‚ ${esc(header.payment_id)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  @page { margin: 14mm 12mm 16mm 12mm; }
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; padding:16px; color:#111}
  h1{font-size:18px;margin:0 0 10px 0}
  .pageFooter{position:fixed;left:0;right:0;bottom:0;padding:6px 12mm;font-size:11px;color:#64748b;border-top:1px solid #e5e7eb;background:#fff}
  .pageFooter .right{float:right}
  .pageCounter:before{content:"РЎС‚СЂ. " counter(page) " РёР· " counter(pages);}
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
  <span class="left">GOX BUILD вЂў РџР»Р°С‚С‘Р¶РЅС‹Р№ РѕС‚С‡С‘С‚</span>
  <span class="right pageCounter"></span>
</div>

<h1>РџР»Р°С‚С‘Р¶РЅС‹Р№ РѕС‚С‡С‘С‚</h1>
<div class="muted" style="margin:-6px 0 10px 0">Р’РЅСѓС‚СЂРµРЅРЅРёР№ РґРѕРєСѓРјРµРЅС‚. РќРµ СЏРІР»СЏРµС‚СЃСЏ Р±Р°РЅРєРѕРІСЃРєРёРј РїР»Р°С‚С‘Р¶РЅС‹Рј РїРѕСЂСѓС‡РµРЅРёРµРј.</div>

<div class="box">
  <div class="row">
    <div class="cell"><div class="lbl">РџР»Р°С‚С‘Р¶ ID</div><div class="val">${esc(header.payment_id)}</div></div>
    <div class="cell"><div class="lbl">Р”Р°С‚Р°/РІСЂРµРјСЏ РѕРїР»Р°С‚С‹</div><div class="val">${esc(header.paid_at)}</div></div>
    <div class="cell"><div class="lbl">РЎСѓРјРјР°</div><div class="val">${esc(fmt2(header.amount))} ${esc(header.currency)}</div></div>
  </div>

  <div class="row" style="margin-top:8px">
    <div class="cell">
      <div class="lbl">РћСЃРЅРѕРІР°РЅРёРµ</div>
      <div class="val">РЎС‡С‘С‚: ${esc(header.invoice_number)} РѕС‚ ${esc(header.invoice_date)}</div>
      <div class="muted" style="margin-top:6px">
        РС‚РѕРіРѕ РїРѕ СЃС‡С‘С‚Сѓ: <b>${esc(fmt2(header.invoice_total))} ${esc(header.currency)}</b> вЂў
        РћРїР»Р°С‡РµРЅРѕ РІСЃРµРіРѕ: <b>${esc(fmt2(header.total_paid))} ${esc(header.currency)}</b> вЂў
        РћСЃС‚Р°С‚РѕРє: <b>${esc(fmt2(header.rest))} ${esc(header.currency)}</b>
        ${header.overpay_all > 0 ? ` вЂў РџРµСЂРµРїР»Р°С‚Р°: <b>${esc(fmt2(header.overpay_all))} ${esc(header.currency)}</b>` : ``}
      </div>
      <div class="muted" style="margin-top:6px">Proposal: ${esc(header.proposal_id)}</div>
    </div>
  </div>

  <div class="row" style="margin-top:8px">
    <div class="cell">
      <div class="lbl">РЎСѓРјРјР° РїСЂРѕРїРёСЃСЊСЋ</div>
      <div class="val" style="font-size:13px">${esc(header.amount_words)}</div>
    </div>
  </div>

  <div class="warn">${esc(header.auto_note)}</div>
</div>

<div class="box">
  <div class="lbl">РџР»Р°С‚РµР»СЊС‰РёРє (РЅР°С€Р° РєРѕРјРїР°РЅРёСЏ)</div>
  <table>
    <tr><td>РќР°Р·РІР°РЅРёРµ</td><td>${esc(company.company_name || "вЂ”")}</td></tr>
    <tr><td>РРќРќ / РљРџРџ</td><td>${esc(company.inn || "вЂ”")} / ${esc(company.kpp || "вЂ”")}</td></tr>
    <tr><td>РђРґСЂРµСЃ</td><td>${esc(company.address || "вЂ”")}</td></tr>
    <tr><td>Р‘Р°РЅРє</td><td>${esc(company.bank_name || "вЂ”")}</td></tr>
    <tr><td>Р‘РРљ</td><td>${esc(company.bik || "вЂ”")}</td></tr>
    <tr><td>Р /СЃ</td><td>${esc(company.account || "вЂ”")}</td></tr>
    <tr><td>Рљ/СЃ</td><td>${esc(company.corr_account || "вЂ”")}</td></tr>
    <tr><td>РўРµР»/Email</td><td>${esc(company.phone || "вЂ”")} / ${esc(company.email || "вЂ”")}</td></tr>
  </table>
</div>

<div class="box">
  <div class="lbl">РџРѕР»СѓС‡Р°С‚РµР»СЊ (РїРѕСЃС‚Р°РІС‰РёРє)</div>
  <table>
    <tr><td>РџРѕСЃС‚Р°РІС‰РёРє</td><td>${esc(header.supplier || "вЂ”")}</td></tr>
    <tr><td>РќР°Р·РЅР°С‡РµРЅРёРµ</td><td>${esc(header.purpose || "вЂ”")}</td></tr>
    <tr><td>Р‘СѓС…РіР°Р»С‚РµСЂ</td><td>${esc(header.accountant_fio || "вЂ”")}</td></tr>
    <tr><td>РЎРїРѕСЃРѕР±</td><td>${esc(header.method)}</td></tr>

    <tr><td colspan="2" style="background:#f8fafc;font-weight:900">Р РµРєРІРёР·РёС‚С‹ РґР»СЏ РѕРїР»Р°С‚С‹</td></tr>
    <tr><td>Р‘Р°РЅРє</td><td>${esc(header.pay_bank)}</td></tr>
    <tr><td>Р‘РРљ</td><td>${esc(header.pay_bik)}</td></tr>
    <tr><td>Р /РЎ</td><td>${esc(header.pay_rs)}</td></tr>
    <tr><td>РРќРќ</td><td>${esc(header.pay_inn)}</td></tr>
    <tr><td>РљРџРџ</td><td>${esc(header.pay_kpp)}</td></tr>
  </table>
</div>

${attachmentsHtml}

<div class="box">
  <div class="lbl">Р Р°СЃС€РёС„СЂРѕРІРєР° РїР»Р°С‚РµР¶Р°</div>

  <div class="summaryRow">
    <div>Р’СЃРµРіРѕ РїРѕР·РёС†РёР№: <b>${esc(String(header.total_lines))}</b></div>
    <div><b>${esc(fmt2(header.invoice_total))} ${esc(header.currency)}</b></div>
  </div>

  <div class="summaryRow">
    <div>РћРїР»Р°С‡РµРЅРѕ СЌС‚РёРј РїР»Р°С‚РµР¶РѕРј</div>
    <div><b>${esc(fmt2(header.amount))} ${esc(header.currency)}</b></div>
  </div>

  <div class="summaryRow">
    <div>РћРїР»Р°С‡РµРЅРѕ РІСЃРµРіРѕ РїРѕ СЃС‡С‘С‚Сѓ</div>
    <div><b>${esc(fmt2(header.total_paid))} ${esc(header.currency)}</b></div>
  </div>

  <div class="summaryRow">
    <div>РћСЃС‚Р°С‚РѕРє РїРѕ СЃС‡С‘С‚Сѓ</div>
    <div><b>${esc(fmt2(header.rest))} ${esc(header.currency)}</b></div>
  </div>

  ${header.this_overpay > 0 ? `
  <div class="summaryRow">
    <div>РџРµСЂРµРїР»Р°С‚Р° СЌС‚РёРј РїР»Р°С‚РµР¶РѕРј</div>
    <div><b>${esc(fmt2(header.this_overpay))} ${esc(header.currency)}</b></div>
  </div>` : ``}

  ${cardsHtml}

  <div class="grandRow">
    <div>РћР‘Р©РР™ РРўРћР“ (РїРѕР·РёС†РёРё)</div>
    <div class="grandVal">${esc(fmt2(header.invoice_total))} ${esc(header.currency)}</div>
  </div>

  ${signHtml}
</div>

</body></html>`, {
    documentType: "payment_order",
    source: "payment_order_pdf",
  });
}
