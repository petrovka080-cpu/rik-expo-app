// src/lib/api/pdf_payment.ts
import { openHtmlAsPdfUniversal } from "./pdf";
import {
  preparePaymentOrderPdf,
  type PaymentOrderPdfAttachment,
  type PaymentOrderPdfBillGroup,
  type PaymentOrderPdfCompany,
  type PaymentOrderPdfContract,
  type PaymentOrderPdfHeader,
} from "./paymentPdf.service";
import type { PaymentPdfDraft } from "./types";

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
      <div class="lbl">Вложения</div>
      <div class="muted">Нет вложений</div>
    </div>
  `;
  }

  return `
    <div class="box">
      <div class="lbl">Вложения</div>
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
      <div class="muted" style="margin-top:6px">Открываются в браузере по ссылке.</div>
    </div>
  `;
}

function renderPaymentOrderCardsHtml(bills: PaymentOrderPdfBillGroup[], currency: string): string {
  if (!bills.length) return `<div class="muted" style="margin-top:8px">Нет строк</div>`;

  return bills
    .map((bill) => {
      const groupsHtml = bill.groups
        .map((group) => {
          const cards = group.lines
            .map((line) => `
              <div class="card">
                <div class="cardTop">
                  <div class="cardName">${esc(line.name || "—")}</div>
                  <div class="cardSum">${esc(fmt2(line.sum))} ${esc(currency)}</div>
                </div>
                <div class="cardMeta">${esc(fmtQty(line.qty))} ${esc(line.uom)} × ${esc(fmt2(line.price))}</div>
                <div class="cardMeta">
                  Оплачено всего: <b>${esc(fmt2(line.paidAll))}</b> •
                  этим платежом: <b>${esc(fmt2(line.paidThis))}</b> •
                  остаток: <b>${esc(fmt2(line.rest))}</b> ${esc(currency)}
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
              <div>Итого по ${esc(String(group.typeName).toLowerCase())}</div>
              <div class="subTotalVal">
                ${esc(fmt2(group.total))} ${esc(currency)}
                <div class="muted">оплачено всего: <b>${esc(fmt2(group.paidAll))}</b> • этим платежом: <b>${esc(fmt2(group.paidThis))}</b> • остаток: <b>${esc(fmt2(group.rest))}</b></div>
              </div>
            </div>
          `;
        })
        .join("");

      return `
        <div class="billBox">
          <div class="billHead">
            <div class="billTitle">Счёт: ${esc(bill.invoiceNumber || "—")} от ${esc(bill.invoiceDate || "—")}</div>
            <div class="billSum">${esc(fmt2(bill.total))} ${esc(currency)}</div>
          </div>
          <div class="billSub">Поставщик: ${esc(bill.supplier || "—")}</div>
          ${groupsHtml}
          <div class="billTotalRow">
            <div>ИТОГО ПО СЧЁТУ</div>
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
        <div class="sign-label">Бухгалтер</div>
        <div class="sign-line"></div>
        <div class="sign-name">${esc(accountantFio || "")}</div>
      </div>
      <div class="sign">
        <div class="sign-label">Директор</div>
        <div class="sign-line"></div>
        <div class="sign-name">&nbsp;</div>
      </div>
    </div>
  `;
}

export function renderPaymentOrderHtml(contract: PaymentOrderPdfContract): string {
  const { company, header, attachments, bills } = contract.payload;
  const attachmentsHtml = renderPaymentOrderAttachmentsHtml(attachments);
  const cardsHtml = renderPaymentOrderCardsHtml(bills, header.currency);
  const signHtml = renderPaymentOrderSignHtml(header.accountant_fio);

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>Платёжный отчёт ${esc(header.payment_id)}</title>
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
    <div class="cell"><div class="lbl">Платёж ID</div><div class="val">${esc(header.payment_id)}</div></div>
    <div class="cell"><div class="lbl">Дата/время оплаты</div><div class="val">${esc(header.paid_at)}</div></div>
    <div class="cell"><div class="lbl">Сумма</div><div class="val">${esc(fmt2(header.amount))} ${esc(header.currency)}</div></div>
  </div>

  <div class="row" style="margin-top:8px">
    <div class="cell">
      <div class="lbl">Основание</div>
      <div class="val">Счёт: ${esc(header.invoice_number)} от ${esc(header.invoice_date)}</div>
      <div class="muted" style="margin-top:6px">
        Итого по счёту: <b>${esc(fmt2(header.invoice_total))} ${esc(header.currency)}</b> •
        Оплачено всего: <b>${esc(fmt2(header.total_paid))} ${esc(header.currency)}</b> •
        Остаток: <b>${esc(fmt2(header.rest))} ${esc(header.currency)}</b>
        ${header.overpay_all > 0 ? ` • Переплата: <b>${esc(fmt2(header.overpay_all))} ${esc(header.currency)}</b>` : ``}
      </div>
      <div class="muted" style="margin-top:6px">Proposal: ${esc(header.proposal_id)}</div>
    </div>
  </div>

  <div class="row" style="margin-top:8px">
    <div class="cell">
      <div class="lbl">Сумма прописью</div>
      <div class="val" style="font-size:13px">${esc(header.amount_words)}</div>
    </div>
  </div>

  <div class="warn">${esc(header.auto_note)}</div>
</div>

<div class="box">
  <div class="lbl">Плательщик (наша компания)</div>
  <table>
    <tr><td>Название</td><td>${esc(company.company_name || "—")}</td></tr>
    <tr><td>ИНН / КПП</td><td>${esc(company.inn || "—")} / ${esc(company.kpp || "—")}</td></tr>
    <tr><td>Адрес</td><td>${esc(company.address || "—")}</td></tr>
    <tr><td>Банк</td><td>${esc(company.bank_name || "—")}</td></tr>
    <tr><td>БИК</td><td>${esc(company.bik || "—")}</td></tr>
    <tr><td>Р/с</td><td>${esc(company.account || "—")}</td></tr>
    <tr><td>К/с</td><td>${esc(company.corr_account || "—")}</td></tr>
    <tr><td>Тел/Email</td><td>${esc(company.phone || "—")} / ${esc(company.email || "—")}</td></tr>
  </table>
</div>

<div class="box">
  <div class="lbl">Получатель (поставщик)</div>
  <table>
    <tr><td>Поставщик</td><td>${esc(header.supplier || "—")}</td></tr>
    <tr><td>Назначение</td><td>${esc(header.purpose || "—")}</td></tr>
    <tr><td>Бухгалтер</td><td>${esc(header.accountant_fio || "—")}</td></tr>
    <tr><td>Способ</td><td>${esc(header.method)}</td></tr>

    <tr><td colspan="2" style="background:#f8fafc;font-weight:900">Реквизиты для оплаты</td></tr>
    <tr><td>Банк</td><td>${esc(header.pay_bank)}</td></tr>
    <tr><td>БИК</td><td>${esc(header.pay_bik)}</td></tr>
    <tr><td>Р/С</td><td>${esc(header.pay_rs)}</td></tr>
    <tr><td>ИНН</td><td>${esc(header.pay_inn)}</td></tr>
    <tr><td>КПП</td><td>${esc(header.pay_kpp)}</td></tr>
  </table>
</div>

${attachmentsHtml}

<div class="box">
  <div class="lbl">Расшифровка платежа</div>

  <div class="summaryRow">
    <div>Всего позиций: <b>${esc(String(header.total_lines))}</b></div>
    <div><b>${esc(fmt2(header.invoice_total))} ${esc(header.currency)}</b></div>
  </div>

  <div class="summaryRow">
    <div>Оплачено этим платежом</div>
    <div><b>${esc(fmt2(header.amount))} ${esc(header.currency)}</b></div>
  </div>

  <div class="summaryRow">
    <div>Оплачено всего по счёту</div>
    <div><b>${esc(fmt2(header.total_paid))} ${esc(header.currency)}</b></div>
  </div>

  <div class="summaryRow">
    <div>Остаток по счёту</div>
    <div><b>${esc(fmt2(header.rest))} ${esc(header.currency)}</b></div>
  </div>

  ${header.this_overpay > 0 ? `
  <div class="summaryRow">
    <div>Переплата этим платежом</div>
    <div><b>${esc(fmt2(header.this_overpay))} ${esc(header.currency)}</b></div>
  </div>` : ``}

  ${cardsHtml}

  <div class="grandRow">
    <div>ОБЩИЙ ИТОГ (позиции)</div>
    <div class="grandVal">${esc(fmt2(header.invoice_total))} ${esc(header.currency)}</div>
  </div>

  ${signHtml}
</div>

</body></html>`;
}

export async function buildPaymentOrderHtml(paymentId: number, draft?: PaymentPdfDraft): Promise<string> {
  const prepared = await preparePaymentOrderPdf({ paymentId, draft });
  return renderPaymentOrderHtml(prepared.contract);
}

export async function exportPaymentOrderPdfContract(contract: PaymentOrderPdfContract): Promise<string> {
  return openHtmlAsPdfUniversal(renderPaymentOrderHtml(contract));
}

export async function exportPaymentOrderPdf(paymentId: number, draft?: PaymentPdfDraft): Promise<string> {
  const prepared = await preparePaymentOrderPdf({ paymentId, draft });
  return exportPaymentOrderPdfContract(prepared.contract);
}

export type {
  PaymentOrderPdfAttachment,
  PaymentOrderPdfBillGroup,
  PaymentOrderPdfCompany,
  PaymentOrderPdfContract,
  PaymentOrderPdfHeader,
};
