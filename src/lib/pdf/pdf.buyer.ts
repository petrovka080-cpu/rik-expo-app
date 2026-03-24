type BuyerFallbackProposalMeta = {
  status?: string | null;
  buyer_fio?: string | null;
  submitted_at?: string | null;
};

type BuyerFallbackProposalItem = {
  total_qty?: number | null;
  qty?: number | null;
  uom?: string | null;
  name_human?: string | null;
  rik_code?: string | null;
  price?: number | string | null;
};

const escapeBuyerHtml = (value: unknown) => {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return String(value ?? "").replace(/[&<>"']/g, (char) => map[char] ?? char);
};

export function renderBuyerFallbackProposalPdfHtml(args: {
  proposalId: string;
  prettyTitle?: string | null;
  meta?: BuyerFallbackProposalMeta;
  rows: BuyerFallbackProposalItem[];
}): string {
  const proposalId = String(args.proposalId || "").trim();
  const prettyTitle = String(args.prettyTitle || "").trim();
  const rows = Array.isArray(args.rows) ? args.rows : [];
  const meta = args.meta ?? {};

  let total = 0;
  const bodyRows = rows
    .map((row, index) => {
      const qty = Number(row.total_qty ?? row.qty ?? 0) || 0;
      const uom = String(row.uom ?? "");
      const name = String(row.name_human ?? "");
      const rik = row.rik_code ? ` (${row.rik_code})` : "";
      const price = row.price != null ? Number(row.price) : Number.NaN;
      const sum = Number.isFinite(price) ? qty * price : Number.NaN;
      if (Number.isFinite(sum)) total += sum;

      return `<tr>
      <td>${index + 1}</td>
      <td>${escapeBuyerHtml(name)}${escapeBuyerHtml(rik)}</td>
      <td>${qty}</td>
      <td>${escapeBuyerHtml(uom)}</td>
      <td>${Number.isFinite(price) ? price.toLocaleString() : "-"}</td>
      <td>${Number.isFinite(sum) ? sum.toLocaleString() : "-"}</td>
    </tr>`;
    })
    .join("");

  const title = prettyTitle
    ? `Proposal: ${escapeBuyerHtml(prettyTitle)}`
    : `Proposal #${escapeBuyerHtml(proposalId).slice(0, 8)}`;

  return `<!doctype html>
<html lang="en"><head>
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
  <div class="meta">Status: ${escapeBuyerHtml(meta.status ?? "-")} &middot; Buyer: ${escapeBuyerHtml(meta.buyer_fio ?? "-")} &middot; Sent: ${
    meta.submitted_at ? new Date(meta.submitted_at).toLocaleString() : "-"
  }</div>

  <table>
    <thead>
      <tr><th>#</th><th>Name</th><th>Qty</th><th>UOM</th><th>Price</th><th>Total</th></tr>
    </thead>
    <tbody>
      ${bodyRows || '<tr><td colspan="6" style="color:#64748b">Empty</td></tr>'}
    </tbody>
    <tfoot>
      <tr><td colspan="5" style="text-align:right">Total:</td><td>${total ? total.toLocaleString() : "0"}</td></tr>
    </tfoot>
  </table>
</body></html>`;
}
