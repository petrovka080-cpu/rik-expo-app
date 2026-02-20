// src/screens/buyer/buyer.pdf.ts

type PdfDeps = {
  isWeb: boolean;
  // внешний генератор HTML (серверный)
  buildProposalPdfHtml: (pidStr: string) => Promise<string>;
  // fallback: тянем строки
  proposalItems: (pidStr: string) => Promise<any[]>;
  // fallback: красивый заголовок
  resolveProposalPrettyTitle: (pidStr: string) => Promise<string>;
  // web: supabase read метаданных
  getProposalMeta: (pidStr: string) => Promise<{ status?: string | null; buyer_fio?: string | null; submitted_at?: string | null }>;
  // native: открыть PDF как раньше
  exportProposalPdfNative: (pid: string | number) => Promise<void>;

  // UI hooks
  alert: (title: string, message: string) => void;
};

/** web util */
function writeSafe(w: Window | null, html: string) {
  if (!w) return;
  try { w.document.open(); w.document.write(html); w.document.close(); w.focus(); } catch {}
}

function escHtml(s: any) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => (
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as any)[m]
  ));
}

/** ===== Fallback HTML builder (когда серверный HTML пуст/ошибка) ===== */
export async function buildFallbackProposalHtmlClient(pidStr: string, deps: PdfDeps): Promise<string> {
  // тянем строки предложения
  let rows: any[] = [];
  try {
    const r = await deps.proposalItems(pidStr);
    rows = Array.isArray(r) ? r : [];
  } catch { rows = []; }

  // красивый заголовок
  let pretty = "";
  try { pretty = (await deps.resolveProposalPrettyTitle(pidStr)) || ""; } catch {}

  // метаданные
  let meta: any = {};
  try { meta = (await deps.getProposalMeta(pidStr)) || {}; } catch {}

  let total = 0;
  const trs = rows.map((r: any, i: number) => {
    const qty = Number(r?.total_qty ?? r?.qty ?? 0) || 0;
    const uom = r?.uom ?? "";
    const name = r?.name_human ?? "";
    const rik = r?.rik_code ? ` (${r.rik_code})` : "";
    const price = r?.price != null ? Number(r.price) : NaN;
    const sum = Number.isFinite(price) ? qty * price : NaN;
    if (Number.isFinite(sum)) total += sum;

    return `<tr>
      <td>${i + 1}</td>
      <td>${escHtml(name)}${escHtml(rik)}</td>
      <td>${qty}</td>
      <td>${escHtml(uom)}</td>
      <td>${Number.isFinite(price) ? price.toLocaleString() : "—"}</td>
      <td>${Number.isFinite(sum) ? sum.toLocaleString() : "—"}</td>
    </tr>`;
  }).join("");

  const title =
    pretty ? `Предложение: ${escHtml(pretty)}` : `Предложение #${escHtml(pidStr).slice(0, 8)}`;

  return `<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  :root{ --text:#0f172a; --sub:#475569; --border:#e2e8f0; --bg:#ffffff; }
  body{ font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial; margin:24px; color:var(--text); background:var(--bg); }
  h1{ margin:0 0 8px; font-size:20px; }
  .meta{ color:var(--sub); margin-bottom:12px; }
  table{ width:100%; border-collapse:collapse; }
  th,td{ border:1px solid var(--border); padding:8px; text-align:left; vertical-align:top; }
  th{ background:#f8fafc; }
  tfoot td{ font-weight:700; }
</style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">Статус: ${escHtml(meta.status ?? "—")} · Снабженец: ${escHtml(meta.buyer_fio ?? "—")} · Отправлено: ${
    meta.submitted_at ? new Date(meta.submitted_at).toLocaleString() : "—"
  }</div>

  <table>
    <thead>
      <tr><th>#</th><th>Наименование</th><th>Кол-во</th><th>Ед.</th><th>Цена</th><th>Сумма</th></tr>
    </thead>
    <tbody>
      ${trs || '<tr><td colspan="6" style="color:#64748b">Пусто</td></tr>'}
    </tbody>
    <tfoot>
      <tr><td colspan="5" style="text-align:right">Итого:</td><td>${total ? total.toLocaleString() : "0"}</td></tr>
    </tfoot>
  </table>
</body></html>`;
}

/** ===== Unified open (web/new tab OR native) ===== */
export async function openBuyerProposalPdf(pid: string | number, deps: PdfDeps) {
  const pidStr = String(pid);

  try {
    if (!deps.isWeb) {
      await deps.exportProposalPdfNative(pid);
      return;
    }

    const w = window.open("about:blank", "_blank");
    if (!w) {
      deps.alert("Pop-up", "Разрешите всплывающие окна для сайта.");
      return;
    }

    writeSafe(
      w,
      '<!doctype html><meta charset="utf-8"><title>Готовим…</title>' +
        '<body style="font-family:system-ui;padding:24px;color:#0f172a">' +
        "<h1>Готовим документ…</h1><p>Пожалуйста, подождите.</p></body>"
    );

    let html = "";
    try {
      html = await deps.buildProposalPdfHtml(pidStr);
    } catch {
      html = "";
    }

    // если серверный HTML пустой/битый — fallback
    if (!html || String(html).trim().length < 80) {
      html = await buildFallbackProposalHtmlClient(pidStr, deps);
    }

    writeSafe(w, html);
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    if (deps.isWeb) {
      const w = window.open("", "_blank");
      if (w) {
        writeSafe(
          w,
          `<!doctype html><meta charset="utf-8"><title>Ошибка</title>
          <body style="font-family:system-ui;padding:24px;color:#0f172a">
            <h1>Ошибка</h1>
            <pre style="white-space:pre-wrap;background:#f1f5f9;padding:12px;border-radius:8px">${escHtml(msg)}</pre>
          </body>`
        );
        return;
      }
    }
    deps.alert("Ошибка", msg);
  }
}
