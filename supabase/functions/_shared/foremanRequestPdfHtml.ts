const esc = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

type ForemanRequestPdfMetaField = {
  label: string;
  value: string;
};

type ForemanRequestPdfRow = {
  name: string;
  uom: string;
  qtyText: string;
  status: string;
  note: string;
};

type ForemanRequestPdfModel = {
  requestLabel: string;
  generatedAt: string;
  comment: string;
  foremanName: string;
  metaFields: ForemanRequestPdfMetaField[];
  rows: ForemanRequestPdfRow[];
};

const renderRequestCommentBlock = (comment: string) =>
  comment
    ? `<div class="comment">
         <div class="comment-k">РљРѕРјРјРµРЅС‚Р°СЂРёР№</div>
         <div class="comment-v">${esc(comment)}</div>
       </div>`
    : "";

const renderRequestRows = (model: ForemanRequestPdfModel) =>
  model.rows.length
    ? model.rows
        .map((row, index) => {
          const noteHtml = row.note ? esc(row.note).replace(/\n/g, "<br/>") : "";
          return `<tr>
<td class="c-num">${index + 1}</td>
<td class="c-name">${esc(row.name)}</td>
<td class="c-uom">${esc(row.uom)}</td>
<td class="c-qty">${esc(row.qtyText)}</td>
<td class="c-status">${esc(row.status)}</td>
<td class="c-note">${noteHtml}</td>
</tr>`;
        })
        .join("")
    : `<tr><td colspan="6" class="empty">РќРµС‚ РїРѕР·РёС†РёР№</td></tr>`;

const renderRequestMetaGrid = (model: ForemanRequestPdfModel) =>
  model.metaFields
    .map(
      (field) => `
<div class="meta-item">
  <span class="ml">${esc(field.label)}:</span>
  <span class="mv">${esc(field.value)}</span>
</div>`,
    )
    .join("");

export function renderForemanRequestPdfHtml(model: ForemanRequestPdfModel): string {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<title>Р—Р°СЏРІРєР° ${esc(model.requestLabel)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  :root{ --ink:#000; --line:#000; --bg:#ffffff; }
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
    margin-top:18px;
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
      <h1>Р—Р°СЏРІРєР° ${esc(model.requestLabel)}</h1>
      <div class="subtitle">РЎС„РѕСЂРјРёСЂРѕРІР°РЅРѕ: ${esc(model.generatedAt)}</div>
    </header>

    <div class="meta-wrap">
      <div class="meta-grid">
        ${renderRequestMetaGrid(model)}
      </div>
    </div>

    ${renderRequestCommentBlock(model.comment)}

    <table class="items">
      <thead>
        <tr>
          <th>в„–</th>
          <th>РџРѕР·РёС†РёСЏ</th>
          <th>Р•Рґ.</th>
          <th>РљРѕР»РёС‡РµСЃС‚РІРѕ</th>
          <th>РЎС‚Р°С‚СѓСЃ</th>
          <th>РџСЂРёРјРµС‡Р°РЅРёРµ</th>
        </tr>
      </thead>
      <tbody>${renderRequestRows(model)}</tbody>
    </table>

    <div class="signs">
      <div class="sign">
        <div class="sign-label">РџСЂРѕСЂР°Р±</div>
        <div class="sign-line"></div>
        <div class="sign-name">${esc(model.foremanName)}</div>
      </div>
      <div class="sign">
        <div class="sign-label">Р”РёСЂРµРєС‚РѕСЂ</div>
        <div class="sign-line"></div>
        <div class="sign-name">&nbsp;</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
