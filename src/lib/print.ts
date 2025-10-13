// src/lib/print.ts
export function printHtml(title: string, bodyHtml: string) {
  if (typeof window === 'undefined') { alert('Печать доступна в веб-версии'); return; }
  const html = `
  <html><head><meta charset="utf-8"/><title>${title}</title>
  <style>
    body{font:14px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;padding:24px;}
    h1{font-size:18px;margin:0 0 12px;}
    table{width:100%;border-collapse:collapse;margin-top:12px;}
    th,td{border:1px solid #999;padding:6px 8px;text-align:left;}
    .meta{color:#555;margin-bottom:8px;}
  </style></head><body>${bodyHtml}</body></html>`;
  const w = window.open('', '_blank'); if (!w) return;
  w.document.open(); w.document.write(html); w.document.close(); w.focus(); w.print();
}

export function printReceiptDoc(rec: {date: string|null; qty: number; by?: string|null; note?: string|null},
  ctx: {po_no?: string|null; req?: {name?: string; qty?: number}|undefined}) {
  const body = `
    <h1>Приход на склад</h1>
    <div class="meta">PO: <b>${ctx.po_no ?? '—'}</b></div>
    <div class="meta">Позиция: <b>${ctx.req?.name ?? '—'}</b> (план: ${ctx.req?.qty ?? '—'})</div>
    <table><tr><th>Дата</th><th>Кол-во</th><th>Кто принял</th><th>Примечание</th></tr>
    <tr><td>${rec.date ?? '—'}</td><td>${rec.qty}</td><td>${rec.by ?? '—'}</td><td>${rec.note ?? ''}</td></tr></table>`;
  printHtml(`Приход ${ctx.po_no ?? ''}`, body);
}

export function printIssueDoc(iss: {date: string|null; qty: number; to?: string|null; obj?: string|null; sector?: string|null; brig?: string|null; note?: string|null},
  ctx: {po_no?: string|null; req?: {name?: string; qty?: number}|undefined}) {
  const body = `
    <h1>Требование-накладная</h1>
    <div class="meta">PO: <b>${ctx.po_no ?? '—'}</b></div>
    <div class="meta">Позиция: <b>${ctx.req?.name ?? '—'}</b> (план: ${ctx.req?.qty ?? '—'})</div>
    <table>
      <tr><th>Дата</th><th>Кол-во</th><th>Кому</th><th>Объект</th><th>Этаж/зона</th><th>Бригада</th><th>Примечание</th></tr>
      <tr><td>${iss.date ?? '—'}</td><td>${iss.qty}</td><td>${iss.to ?? '—'}</td><td>${iss.obj ?? '—'}</td>
          <td>${iss.sector ?? '—'}</td><td>${iss.brig ?? '—'}</td><td>${iss.note ?? ''}</td></tr>
    </table>`;
  printHtml(`Выдача ${ctx.po_no ?? ''}`, body);
}
