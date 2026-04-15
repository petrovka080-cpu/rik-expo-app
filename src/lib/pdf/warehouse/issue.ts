import {
  cssForm29,
  esc,
  fmtDateTimeRu,
  fmtQty,
  kindByCodePrefix,
  nnum,
  pickBasis,
  pickIssueNo,
  pickKindLabel,
  pickLineNameRu,
  pickLineUom,
  type WarehouseIssueHead,
  type WarehouseIssueLine,
} from "./shared";
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
    const mObj = n.match(/объект:\s*([^·\n\r]+)/i);
    const mWork = n.match(/вид:\s*([^·\n\r]+)/i);
    if (!objectGuess && mObj?.[1]) objectGuess = String(mObj[1]).trim();
    if (!workGuess && mWork?.[1]) workGuess = String(mWork[1]).trim();
  }

  const who = String(h.who ?? "").trim() || "—";
  const req = String(h.display_no ?? "").trim() || "—";

  const total = nnum(h.qty_total);
  const inReq = nnum(h.qty_in_req);
  const over = nnum(h.qty_over);

  const rowsHtml =
    lines.length > 0
      ? lines
        .map((ln, idx) => {
          const nameRu = pickLineNameRu(ln, args.nameByCode);
          const kind = kindByCodePrefix(ln.rik_code);
          const uom = pickLineUom(ln);

          const t = nnum(ln.qty_total);
          const r = nnum(ln.qty_in_req);
          const o = nnum(ln.qty_over);

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
      : `<tr><td class="t-center" colspan="6"><i>Нет строк</i></td></tr>`;

  const org = String(args.orgName ?? "").trim();
  const wh = String(args.warehouseName ?? "").trim();

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>${esc(issueNo)}</title>
<style>${cssForm29()}</style>
</head>
<body>
  <div class="page">
    <div class="h1">НАКЛАДНАЯ НА ОТПУСК МАТЕРИАЛОВ СО СКЛАДА</div>
    <div class="h2">${esc(kindLabel)}</div>

    <div class="meta">
      <div class="row"><div class="ml">Организация:</div><div class="mv">${esc(org || "—")}</div></div>
      <div class="row"><div class="ml">Склад:</div><div class="mv">${esc(wh || "—")}</div></div>

      <div class="row"><div class="ml">Номер:</div><div class="mv">${esc(issueNo)}</div></div>
      <div class="row"><div class="ml">Дата:</div><div class="mv">${esc(dt)}</div></div>

      <div class="row"><div class="ml">Основание:</div><div class="mv">${esc(basis)}</div></div>
      <div class="row"><div class="ml">Заявка:</div><div class="mv">${esc(req)}</div></div>

      <div class="row"><div class="ml">Объект:</div><div class="mv">${esc(objectGuess || "—")}</div></div>
      <div class="row"><div class="ml">Вид работ:</div><div class="mv">${esc(workGuess || "—")}</div></div>

      <div class="row"><div class="ml">Получатель:</div><div class="mv">${esc(who)}</div></div>
      <div class="row"><div class="ml">Примечание:</div><div class="mv">${esc(note || "—")}</div></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:34px">№</th>
          <th>Наименование</th>
          <th style="width:52px">Ед.</th>
          <th style="width:88px">По заявке</th>
          <th style="width:88px">Сверх</th>
          <th style="width:88px">Итого</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="totals">
      <div class="box"><span class="lbl">Итого отпущено:</span> ${esc(fmtQty(total))}</div>
      <div class="box"><span class="lbl">По заявке:</span> ${esc(fmtQty(inReq))}</div>
      <div class="box"><span class="lbl">Сверх заявки:</span> ${esc(fmtQty(over))}</div>
    </div>

    <div class="signs">
      <div class="sign"><div class="who">Кладовщик</div><div class="line"></div><div class="fio"></div></div>
      <div class="sign"><div class="who">Прораб / нач. участка</div><div class="line"></div><div class="fio"></div></div>
      <div class="sign"><div class="who">Получатель (МОЛ)</div><div class="line"></div><div class="fio">${esc(who)}</div></div>
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
  const period = from || to ? `${from || "—"} → ${to || "—"}` : "Весь период";

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
          const kindLabel = String(h.kind ?? "").toUpperCase() === "REQ" ? "По заявке" : "Без заявки";
          const who = String(h.who ?? "—");
          const req = String(h.display_no ?? "—");

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
      : `<tr><td class="t-center" colspan="9"><i>Нет выдач за период</i></td></tr>`;

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"/>
<title>Реестр выдач со склада</title>
<style>${cssForm29()}</style>
</head>
<body>
  <div class="page">
    <div class="h1">РЕЕСТР ВЫДАЧ СО СКЛАДА ЗА ПЕРИОД</div>
    <div class="h2">${esc(period)}</div>

    <div class="meta">
      <div class="row"><div class="ml">Организация:</div><div class="mv">${esc(org || "—")}</div></div>
      <div class="row"><div class="ml">Склад:</div><div class="mv">${esc(wh || "—")}</div></div>
      <div class="row"><div class="ml">Всего выдач:</div><div class="mv">${esc(String(rows.length))}</div></div>
      <div class="row"><div class="ml">Сформировано:</div><div class="mv">${esc(new Date().toLocaleString("ru-RU"))}</div></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:34px">№</th>
          <th style="width:120px">Дата</th>
          <th style="width:110px">Номер</th>
          <th style="width:90px">Тип</th>
          <th>Получатель</th>
          <th style="width:120px">Заявка</th>
          <th style="width:80px">Всего</th>
          <th style="width:90px">По заявке</th>
          <th style="width:90px">Сверх заявки</th>
        </tr>
      </thead>
      <tbody>
        ${body}
      </tbody>
    </table>

    <div class="totals">
      <div class="box"><span class="lbl">Итого отпущено:</span> ${esc(fmtQty(sumTotal))}</div>
      <div class="box"><span class="lbl">Итого по заявкам:</span> ${esc(fmtQty(sumInReq))}</div>
      <div class="box"><span class="lbl">Итого сверх заявок:</span> ${esc(fmtQty(sumOver))}</div>
    </div>

    <div class="signs">
      <div class="sign"><div class="who">Кладовщик</div><div class="line"></div><div class="fio"></div></div>
      <div class="sign"><div class="who">Прораб / нач. участка</div><div class="line"></div><div class="fio"></div></div>
    </div>

    <div class="page-footer"></div>
  </div>
</body></html>`;
}

