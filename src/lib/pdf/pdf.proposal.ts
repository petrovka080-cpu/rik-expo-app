import type { ProposalPdfModel } from "./pdf.model";
import { normalizeRuTextForHtml } from "../text/encoding";

const esc = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function renderProposalPdfHtml(model: ProposalPdfModel): string {
  const supplierTh = model.includeSupplier ? `<th style="width:160px">Поставщик</th>` : ``;
  const sumColspan = model.includeSupplier ? 7 : 6;
  const suppliersHtml = model.suppliers.length
    ? `
<div class="section-title">Поставщики</div>
${model.suppliers
  .map(
    (supplier) => `
<div class="supplier-line">
  <div class="s-name">${esc(supplier.name)}</div>
  ${supplier.metaLine ? `<div class="s-meta">${esc(supplier.metaLine)}</div>` : ``}
</div>`,
  )
  .join("")}
`
    : "";

  const leftHtml = model.leftMetaFields
    .map(
      (field) => `<div class="meta-item"><span class="ml">${esc(field.label)}:</span><span class="mv">${esc(field.value)}</span></div>`,
    )
    .join("");
  const rightHtml = model.rightMetaFields
    .map(
      (field) => `<div class="meta-item"><span class="ml">${esc(field.label)}:</span><span class="mv">${esc(field.value)}</span></div>`,
    )
    .join("");

  const body = model.rows.length
    ? model.rows
        .map(
          (row, index) => `<tr>
<td class="c-num">${index + 1}</td>
<td class="c-name">
  ${esc(row.name)}
  ${row.kind ? `<div class="sub">Тип: ${esc(row.kind)}</div>` : ``}
</td>
<td class="c-qty">${esc(row.qtyText)}</td>
<td class="c-uom">${esc(row.uom)}</td>
<td class="c-app">${esc(row.appAndNote)}</td>
${model.includeSupplier ? `<td class="c-supp">${esc(row.supplier)}</td>` : ``}
<td class="c-price">${esc(row.priceText)}</td>
<td class="c-sum">${esc(row.amountText)}</td>
</tr>`,
        )
        .join("")
    : `<tr><td colspan="${model.includeSupplier ? 8 : 7}" class="empty">Нет строк</td></tr>`;

  return normalizeRuTextForHtml(`<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<title>Предложение ${esc(model.proposalLabel)}</title>
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
    <h1>Предложение на закупку № ${esc(model.proposalLabel)}</h1>
    <div class="subtitle">
      Сформировано: ${esc(model.generatedAt)}
      ${model.approvedAt ? ` · <b>Утверждено:</b> ${esc(model.approvedAt)}` : ""}
      ${model.status ? ` · <b>Статус:</b> ${esc(model.status)}` : ""}
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
      ${model.rows.length ? `<tr class="sumline"><td colspan="${sumColspan}" style="text-align:right">ИТОГО</td><td style="text-align:right">${esc(model.totalText)}</td></tr>` : ""}
    </tbody>
  </table>

  <div class="signs">
    <div class="sign">
      <div><b>Снабженец</b></div>
      <div class="line"></div>
      <div class="muted" style="margin-top:6px">/ ${esc(model.buyerFio)} /</div>
    </div>
    <div class="sign">
      <div><b>Директор</b></div>
      <div class="line"></div>
      <div class="muted" style="margin-top:6px">/  /</div>
    </div>
  </div>

  <div class="muted" style="margin-top:14px">
    Служебный ID: ${esc(model.serviceId)}
  </div>
</div>
</body>
</html>`, {
    documentType: "proposal",
    source: "director",
    maxLength: 500_000,
  });
}

export function renderProposalPdfErrorHtml(message: string): string {
  const safeMessage = esc(message);
  return normalizeRuTextForHtml(
    `<!doctype html><meta charset="utf-8"/><title>Ошибка</title>
<pre style="font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; padding:16px;">Ошибка подготовки PDF: ${safeMessage}</pre>`,
    {
      documentType: "proposal",
      source: "director",
      maxLength: 500_000,
    },
  );
}
