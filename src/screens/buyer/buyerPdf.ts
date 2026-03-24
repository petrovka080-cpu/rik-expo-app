// src/screens/buyer/buyer.pdf.ts
import { router } from "expo-router";

import { supabase } from "../../lib/supabaseClient";
import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import { preparePdfDocument, previewPdfDocument } from "../../lib/documents/pdfDocumentActions";
import { createGeneratedPdfDocument } from "../../lib/documents/pdfDocumentGenerators";
import { renderBuyerFallbackProposalPdfHtml } from "../../lib/pdf/pdf.buyer";
import { renderPdfHtmlToUri } from "../../lib/pdf/pdf.runner";

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

  return renderBuyerFallbackProposalPdfHtml({
    proposalId: pidStr,
    prettyTitle: pretty,
    meta,
    rows,
  });
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

    const uri = await renderPdfHtmlToUri({
      html,
      documentType: "proposal",
      source: "buyer_proposal_pdf",
    });
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
