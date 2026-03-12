// src/screens/buyer/buyer.pdf.ts
import { router } from "expo-router";

import { openHtmlAsPdfUniversal } from "../../lib/api/pdf";
import { supabase } from "../../lib/supabaseClient";
import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import { preparePdfDocument, previewPdfDocument } from "../../lib/documents/pdfDocumentActions";
import { createGeneratedPdfDocument } from "../../lib/documents/pdfDocumentGenerators";

type ProposalPdfItemRow = {
  total_qty?: number | null;
  qty?: number | null;
  uom?: string | null;
  name_human?: string | null;
  rik_code?: string | null;
  price?: number | string | null;
};

type PdfDeps = {
  isWeb: boolean;
  buildProposalPdfHtml: (pidStr: string) => Promise<string>;
  proposalItems: (pidStr: string) => Promise<ProposalPdfItemRow[]>;
  resolveProposalPrettyTitle: (pidStr: string) => Promise<string>;
  getProposalMeta: (pidStr: string) => Promise<{ status?: string | null; buyer_fio?: string | null; submitted_at?: string | null }>;
  exportProposalPdfNative: (pid: string | number) => Promise<void>;
  alert: (title: string, message: string) => void;
};

function escHtml(s: unknown) {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return String(s ?? "").replace(/[&<>"']/g, (m) => map[m] ?? m);
}

export async function buildFallbackProposalHtmlClient(pidStr: string, deps: PdfDeps): Promise<string> {
  let rows: ProposalPdfItemRow[] = [];
  try {
    const r = await deps.proposalItems(pidStr);
    rows = Array.isArray(r) ? r : [];
  } catch {
    rows = [];
  }

  let pretty = "";
  try {
    pretty = (await deps.resolveProposalPrettyTitle(pidStr)) || "";
  } catch {}

  let meta: { status?: string | null; buyer_fio?: string | null; submitted_at?: string | null } = {};
  try {
    meta = (await deps.getProposalMeta(pidStr)) || {};
  } catch {}

  let total = 0;
  const trs = rows
    .map((r, i: number) => {
      const qty = Number(r?.total_qty ?? r?.qty ?? 0) || 0;
      const uom = r?.uom ?? "";
      const name = r?.name_human ?? "";
      const rik = r?.rik_code ? ` (${r.rik_code})` : "";
      const price = r?.price != null ? Number(r.price) : Number.NaN;
      const sum = Number.isFinite(price) ? qty * price : Number.NaN;
      if (Number.isFinite(sum)) total += sum;

      return `<tr>
      <td>${i + 1}</td>
      <td>${escHtml(name)}${escHtml(rik)}</td>
      <td>${qty}</td>
      <td>${escHtml(uom)}</td>
      <td>${Number.isFinite(price) ? price.toLocaleString() : "-"}</td>
      <td>${Number.isFinite(sum) ? sum.toLocaleString() : "-"}</td>
    </tr>`;
    })
    .join("");

  const title = pretty
    ? `Proposal: ${escHtml(pretty)}`
    : `Proposal #${escHtml(pidStr).slice(0, 8)}`;

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
  <div class="meta">Status: ${escHtml(meta.status ?? "-")} &middot; Buyer: ${escHtml(meta.buyer_fio ?? "-")} &middot; Sent: ${
    meta.submitted_at ? new Date(meta.submitted_at).toLocaleString() : "-"
  }</div>

  <table>
    <thead>
      <tr><th>#</th><th>Name</th><th>Qty</th><th>UOM</th><th>Price</th><th>Total</th></tr>
    </thead>
    <tbody>
      ${trs || '<tr><td colspan="6" style="color:#64748b">Empty</td></tr>'}
    </tbody>
    <tfoot>
      <tr><td colspan="5" style="text-align:right">Total:</td><td>${total ? total.toLocaleString() : "0"}</td></tr>
    </tfoot>
  </table>
</body></html>`;
}

export async function openBuyerProposalPdf(pid: string | number, deps: PdfDeps) {
  const pidStr = String(pid);

  try {
    let html = "";
    try {
      html = await deps.buildProposalPdfHtml(pidStr);
    } catch {
      html = "";
    }

    if (!html || String(html).trim().length < 80) {
      html = await buildFallbackProposalHtmlClient(pidStr, deps);
    }

    const uri = await openHtmlAsPdfUniversal(html);
    const template = await createGeneratedPdfDocument({
      uri,
      title: `Proposal ${pidStr.slice(0, 8)}`,
      fileName: buildPdfFileName({
        documentType: "proposal",
        title: "proposal",
        entityId: pidStr,
      }),
      documentType: "proposal",
      originModule: "buyer",
      entityId: pidStr,
    });
    const doc = await preparePdfDocument({
      supabase,
      descriptor: template,
      getRemoteUrl: () => template.uri,
    });
    await previewPdfDocument(doc, { router });
  } catch (e: unknown) {
    const msg = e instanceof Error && e.message ? e.message : String(e);
    deps.alert("Error", msg);
  }
}
