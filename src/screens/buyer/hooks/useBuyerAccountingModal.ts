import { useCallback, useEffect, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { repoGetLatestProposalPdfAttachment, repoGetProposalItemsForAccounting, repoGetSupplierCardByName } from "../buyer.repo";
import { reportAndSwallow } from "../../../lib/observability/catchDiscipline";
import { recordPlatformObservability } from "../../../lib/observability/platformObservability";
import { abortController, isAbortError } from "../../../lib/requestCancellation";

type ProposalAttachmentUploader = (
  proposalId: string,
  file: Blob | File,
  fileName: string,
  groupKey: string
) => Promise<unknown>;

const warnBuyerAccountingModal = (scope: string, error: unknown) => {
  if (__DEV__) {
    console.warn(`[buyer.accounting] ${scope}:`, error);
  }
};

type AccountingModalRequestSlot = {
  requestId: number;
  proposalId: string;
  controller: AbortController;
};

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
  const requestSeqRef = useRef(0);
  const requestSlotRef = useRef<AccountingModalRequestSlot | null>(null);

  const recordSkip = useCallback(
    (
      event: string,
      slot: AccountingModalRequestSlot,
      sourceKind: string,
      guardReason: string,
    ) => {
      recordPlatformObservability({
        screen: "buyer",
        surface: "accounting_modal",
        category: "fetch",
        event,
        result: "skipped",
        sourceKind,
        extra: {
          proposalId: slot.proposalId,
          requestId: slot.requestId,
          guardReason,
        },
      });
    },
    [],
  );

  const isActiveSlot = useCallback(
    (slot: AccountingModalRequestSlot) =>
      requestSlotRef.current === slot && !slot.controller.signal.aborted,
    [],
  );

  const commitIfActive = useCallback(
    (
      slot: AccountingModalRequestSlot,
      event: string,
      sourceKind: string,
      commit: () => void,
    ) => {
      if (!isActiveSlot(slot)) {
        recordSkip(event, slot, sourceKind, "stale_owner");
        return false;
      }
      commit();
      return true;
    },
    [isActiveSlot, recordSkip],
  );

  useEffect(() => {
    return () => {
      abortController(
        requestSlotRef.current?.controller ?? null,
        "buyer_accounting_modal_unmounted",
      );
      requestSlotRef.current = null;
    };
  }, []);

  const ensureProposalDocumentAttached = useCallback(
    async (proposalId: string, slot: AccountingModalRequestSlot) => {
      commitIfActive(
        slot,
        "proposal_document_attach_commit_skipped",
        "proposal_html_attachment",
        () => {
          setPropDocBusy(true);
        },
      );
      try {
        const latest = await repoGetLatestProposalPdfAttachment(supabase, proposalId);
        if (latest?.file_name) {
          commitIfActive(
            slot,
            "proposal_document_attach_commit_skipped",
            "proposal_html_attachment",
            () => {
              setPropDocAttached({ name: latest.file_name });
            },
          );
          return;
        }

        const html = await buildProposalPdfHtml(proposalId);
        if (!isActiveSlot(slot)) {
          recordSkip(
            "proposal_document_attach_commit_skipped",
            slot,
            "proposal_html_attachment",
            "stale_owner",
          );
          return;
        }
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const name = `proposal_${proposalId.slice(0, 8)}.html`;

        await uploadProposalAttachment(proposalId, blob, name, "proposal_html");
        commitIfActive(
          slot,
          "proposal_document_attach_commit_skipped",
          "proposal_html_attachment",
          () => {
            setPropDocAttached({ name });
          },
        );
      } catch (error) {
        if (isAbortError(error)) {
          recordSkip(
            "proposal_document_attach_skipped",
            slot,
            "proposal_html_attachment",
            "aborted",
          );
          return;
        }
        if (!isActiveSlot(slot)) {
          recordSkip(
            "proposal_document_attach_skipped",
            slot,
            "proposal_html_attachment",
            "stale_owner",
          );
          return;
        }
        warnBuyerAccountingModal("ensureProposalDocumentAttached", error);
        reportAndSwallow({
          screen: "buyer",
          surface: "accounting_modal",
          event: "proposal_document_attach_failed",
          error,
          kind: "soft_failure",
          sourceKind: "proposal_html_attachment",
          errorStage: "prepare_proposal_document",
          extra: {
            proposalId,
          },
        });
      } finally {
        commitIfActive(
          slot,
          "proposal_document_attach_commit_skipped",
          "proposal_html_attachment",
          () => {
            setPropDocBusy(false);
          },
        );
      }
    },
    [
      buildProposalPdfHtml,
      commitIfActive,
      isActiveSlot,
      recordSkip,
      setPropDocAttached,
      setPropDocBusy,
      supabase,
      uploadProposalAttachment,
    ]
  );

  const prefillAccountingFromProposal = useCallback(
    async (proposalId: string, slot: AccountingModalRequestSlot) => {
      try {
        const rows = await repoGetProposalItemsForAccounting(supabase, proposalId, {
          signal: slot.controller.signal,
        });
        if (!isActiveSlot(slot)) {
          recordSkip(
            "accounting_prefill_skipped",
            slot,
            "proposal_accounting_prefill",
            "stale_owner",
          );
          return;
        }

        let total = 0;
        for (const row of rows) {
          const qty = Number(row?.qty) || 0;
          const price = Number(row?.price) || 0;
          total += qty * price;
        }
        if (total > 0) {
          commitIfActive(
            slot,
            "accounting_prefill_commit_skipped",
            "proposal_accounting_prefill",
            () => {
              setInvAmount(String(total));
            },
          );
        }

        const names = Array.from(new Set(rows.map((row) => String(row?.supplier || "").trim()).filter(Boolean)));
        const name = names[0] || "";

        if (!name) {
          commitIfActive(
            slot,
            "accounting_prefill_commit_skipped",
            "proposal_accounting_prefill",
            () => {
              setAcctSupp(null);
            },
          );
          return;
        }

        const card = await repoGetSupplierCardByName(supabase, name, {
          signal: slot.controller.signal,
        });
        commitIfActive(
          slot,
          "accounting_prefill_commit_skipped",
          "proposal_accounting_prefill",
          () => {
            setAcctSupp({
              name: card?.name || name,
              inn: card?.inn || null,
              bank: card?.bank_account || null,
              phone: card?.phone || null,
              email: card?.email || null,
            });
          },
        );
      } catch (error) {
        if (isAbortError(error)) {
          recordSkip(
            "accounting_prefill_skipped",
            slot,
            "proposal_accounting_prefill",
            "aborted",
          );
          return;
        }
        if (!isActiveSlot(slot)) {
          recordSkip(
            "accounting_prefill_skipped",
            slot,
            "proposal_accounting_prefill",
            "stale_owner",
          );
          return;
        }
        reportAndSwallow({
          screen: "buyer",
          surface: "accounting_modal",
          event: "accounting_prefill_failed",
          error,
          kind: "soft_failure",
          sourceKind: "proposal_accounting_prefill",
          errorStage: "prefill_accounting",
          extra: {
            proposalId,
          },
        });
        commitIfActive(
          slot,
          "accounting_prefill_commit_skipped",
          "proposal_accounting_prefill",
          () => {
            setAcctSupp(null);
          },
        );
      }
    },
    [commitIfActive, isActiveSlot, recordSkip, setAcctSupp, setInvAmount, supabase]
  );

  const openAccountingModal = useCallback(
    (proposalId: string | number) => {
      const normalizedProposalId = String(proposalId);
      abortController(
        requestSlotRef.current?.controller ?? null,
        "buyer_accounting_modal_request_replaced",
      );
      const slot = {
        requestId: requestSeqRef.current + 1,
        proposalId: normalizedProposalId,
        controller: new AbortController(),
      };
      requestSeqRef.current = slot.requestId;
      requestSlotRef.current = slot;
      setAcctProposalId(proposalId);
      setInvNumber("");
      setInvDate(new Date().toISOString().slice(0, 10));
      setInvAmount("");
      setInvCurrency("KGS");
      setInvFile(null);
      setPropDocAttached(null);
      setAcctSupp(null);
      openAccountingSheet(proposalId);
      void ensureProposalDocumentAttached(normalizedProposalId, slot);
      void prefillAccountingFromProposal(normalizedProposalId, slot);
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
