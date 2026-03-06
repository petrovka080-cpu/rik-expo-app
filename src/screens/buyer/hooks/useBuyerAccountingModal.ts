import { useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { repoGetLatestProposalPdfAttachment, repoGetProposalItemsForAccounting, repoGetSupplierCardByName } from "../buyer.repo";

type ProposalAttachmentUploader = (
  proposalId: string,
  file: Blob | File,
  fileName: string,
  groupKey: string
) => Promise<unknown>;

export function useBuyerAccountingModal(params: {
  supabase: SupabaseClient;
  buildProposalPdfHtml: (proposalId: string) => Promise<string>;
  uploadProposalAttachment: ProposalAttachmentUploader;
  setPropDocBusy: (v: boolean) => void;
  setPropDocAttached: (v: { name: string; url?: string } | null) => void;
  setInvAmount: (v: string) => void;
  setAcctSupp: (
    v: {
      name: string;
      inn?: string | null;
      bank?: string | null;
      phone?: string | null;
      email?: string | null;
    } | null
  ) => void;
  setAcctProposalId: (v: string | number | null) => void;
  setInvNumber: (v: string) => void;
  setInvDate: (v: string) => void;
  setInvCurrency: (v: string) => void;
  setInvFile: (v: File | { uri: string; name?: string } | null) => void;
  openAccountingSheet: (proposalId: string | number) => void;
}) {
  const {
    supabase,
    buildProposalPdfHtml,
    uploadProposalAttachment,
    setPropDocBusy,
    setPropDocAttached,
    setInvAmount,
    setAcctSupp,
    setAcctProposalId,
    setInvNumber,
    setInvDate,
    setInvCurrency,
    setInvFile,
    openAccountingSheet,
  } = params;

  const ensureProposalDocumentAttached = useCallback(
    async (proposalId: string) => {
      setPropDocBusy(true);
      try {
        const latest = await repoGetLatestProposalPdfAttachment(supabase, proposalId);
        if (latest?.file_name) {
          setPropDocAttached({ name: latest.file_name });
          return;
        }

        const html = await buildProposalPdfHtml(proposalId);
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const name = `proposal_${proposalId.slice(0, 8)}.html`;

        await uploadProposalAttachment(proposalId, blob, name, "proposal_pdf");
        setPropDocAttached({ name });
      } catch (error) {
        console.warn("[buyer] ensureProposalDocumentAttached:", error);
      } finally {
        setPropDocBusy(false);
      }
    },
    [supabase, buildProposalPdfHtml, uploadProposalAttachment, setPropDocBusy, setPropDocAttached]
  );

  const prefillAccountingFromProposal = useCallback(
    async (proposalId: string) => {
      try {
        const rows = await repoGetProposalItemsForAccounting(supabase, proposalId);

        let total = 0;
        for (const row of rows) {
          const qty = Number(row?.qty) || 0;
          const price = Number(row?.price) || 0;
          total += qty * price;
        }
        if (total > 0) setInvAmount(String(total));

        const names = Array.from(new Set(rows.map((row) => String(row?.supplier || "").trim()).filter(Boolean)));
        const name = names[0] || "";

        if (!name) {
          setAcctSupp(null);
          return;
        }

        const card = await repoGetSupplierCardByName(supabase, name);
        setAcctSupp({
          name: card?.name || name,
          inn: card?.inn || null,
          bank: card?.bank_account || null,
          phone: card?.phone || null,
          email: card?.email || null,
        });
      } catch {
        setAcctSupp(null);
      }
    },
    [supabase, setInvAmount, setAcctSupp]
  );

  const openAccountingModal = useCallback(
    (proposalId: string | number) => {
      setAcctProposalId(proposalId);
      setInvNumber("");
      setInvDate(new Date().toISOString().slice(0, 10));
      setInvAmount("");
      setInvCurrency("KGS");
      setInvFile(null);
      setPropDocAttached(null);
      setAcctSupp(null);
      openAccountingSheet(proposalId);
      ensureProposalDocumentAttached(String(proposalId));
      prefillAccountingFromProposal(String(proposalId));
    },
    [
      setAcctProposalId,
      setInvNumber,
      setInvDate,
      setInvAmount,
      setInvCurrency,
      setInvFile,
      setPropDocAttached,
      setAcctSupp,
      openAccountingSheet,
      ensureProposalDocumentAttached,
      prefillAccountingFromProposal,
    ]
  );

  return { openAccountingModal };
}

