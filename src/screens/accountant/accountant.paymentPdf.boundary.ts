import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useRouter } from "expo-router";
import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import {
  getPdfFlowErrorMessage,
  prepareAndPreviewPdfDocument,
} from "../../lib/documents/pdfDocumentActions";
import { supabase } from "../../lib/supabaseClient";
import { fetchLastPaymentIdByProposal } from "./accountant.payment";
import { generateAccountantPaymentReportPdfDocument } from "./accountantPaymentReportPdf.service";

export type AccountantPaymentPdfBusyLike = {
  run?: <T>(
    fn: () => Promise<T>,
    opts?: { key?: string; label?: string; minMs?: number },
  ) => Promise<T | null>;
};

type UseAccountantPaymentPdfBoundaryArgs = {
  busy: AccountantPaymentPdfBusyLike | unknown;
  safeAlert: (title: string, message: string) => void;
  setCurrentPaymentId: Dispatch<SetStateAction<number | null>>;
  /** XR-PDF: dismiss callback for the parent modal (if any). */
  onBeforeNavigate?: (() => void | Promise<void>) | null;
};

type OpenAccountantPaymentPdfRequest = {
  proposalId?: string | null;
  paymentId?: number | null;
  supplierName?: string | null;
};

export function useAccountantPaymentPdfBoundary(
  args: UseAccountantPaymentPdfBoundaryArgs,
) {
  const { busy, safeAlert, setCurrentPaymentId, onBeforeNavigate } = args;
  const router = useRouter();

  return useCallback(async (request: OpenAccountantPaymentPdfRequest) => {
    const proposalId = String(request.proposalId ?? "").trim();
    let paymentId = Number(request.paymentId ?? 0);
    if (!Number.isFinite(paymentId) || paymentId <= 0) paymentId = 0;

    if (!paymentId && proposalId) {
      const resolvedPaymentId = await fetchLastPaymentIdByProposal(proposalId);
      if (resolvedPaymentId) {
        paymentId = resolvedPaymentId;
        setCurrentPaymentId(resolvedPaymentId);
      }
    }

    if (!paymentId) {
      safeAlert(
        "Платёжное поручение",
        "Не найден payment_id для выбранного предложения.",
      );
      return;
    }

    try {
      const fileName = buildPdfFileName({
        documentType: "payment_order",
        title: request.supplierName || "payment_order",
        entityId: paymentId,
      });
      const template = await generateAccountantPaymentReportPdfDocument({
        paymentId,
        title: `Платёжное поручение ${paymentId}`,
        fileName,
      });
      const descriptor = {
        ...template,
        title: `Платёжное поручение ${paymentId}`,
        fileName,
      };
      await prepareAndPreviewPdfDocument({
        busy: busy as AccountantPaymentPdfBusyLike,
        supabase,
        key: `pdf:acc:pay:${paymentId}`,
        label: "Открываю платёжное поручение…",
        descriptor,
        router,
        // XR-PDF: dismiss parent modal before pushing PDF viewer route
        onBeforeNavigate,
      });
    } catch (error) {
      safeAlert(
        "Платёжное поручение",
        getPdfFlowErrorMessage(error, "Не удалось открыть PDF"),
      );
    }
  }, [busy, onBeforeNavigate, router, safeAlert, setCurrentPaymentId]);
}
