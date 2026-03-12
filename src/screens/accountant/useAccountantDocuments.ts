import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useRouter } from "expo-router";
import { Platform, Share } from "react-native";

import { supabase } from "../../lib/supabaseClient";
import {
  exportProposalPdf,
  generatePaymentOrderPdfDocument,
  generateProposalPdfDocument,
} from "../../lib/catalog_api";
import { getLatestProposalAttachmentPreview, isPdfLike, openAttachment, openSignedUrlUniversal } from "../../lib/files";
import { buildPdfFileName, createPdfDocumentDescriptor } from "../../lib/documents/pdfDocument";
import { preparePdfDocument, previewPdfDocument } from "../../lib/documents/pdfDocumentActions";
import { fetchLastPaymentIdByProposal } from "./accountant.payment";
import type { AccountantInboxUiRow } from "./types";

type Params = {
  current: AccountantInboxUiRow | null;
  currentPaymentId: number | null;
  setCurrentPaymentId: Dispatch<SetStateAction<number | null>>;
  supplierName: string;
  invoiceNo: string;
  invoiceDate: string;
  bankName: string;
  bik: string;
  rs: string;
  inn: string;
  kpp: string;
  gbusy: unknown;
  safeAlert: (title: string, msg: string) => void;
  getErrorText: (e: unknown) => string;
};

export function useAccountantDocuments(params: Params) {
  const {
    current,
    currentPaymentId,
    setCurrentPaymentId,
    supplierName,
    gbusy,
    safeAlert,
    getErrorText,
  } = params;
  const router = useRouter();

  const onOpenProposalPdf = useCallback(async () => {
    const pid = String(current?.proposal_id ?? "").trim();
    if (!pid) return;

    const template = await generateProposalPdfDocument(pid, "accountant");
    const doc = await preparePdfDocument({
      busy: gbusy,
      supabase,
      key: `pdf:acc:prop:${pid}`,
      label: "Открываю PDF…",
      descriptor: {
        ...template,
        title: `Предложение ${pid.slice(0, 8)}`,
        fileName: buildPdfFileName({
          documentType: "proposal",
          title: "predlozhenie",
          entityId: pid,
        }),
      },
      getRemoteUrl: () => template.uri,
    });

    await previewPdfDocument(doc, { router });
  }, [current, gbusy, router]);

  const onShareCard = useCallback(async () => {
    try {
      const pid = String(current?.proposal_id ?? "").trim();
      if (!pid) return;

      const uriOrUrl = await exportProposalPdf(pid, "preview");

      if (Platform.OS === "web") {
        window.open(String(uriOrUrl), "_blank", "noopener,noreferrer");
        return;
      }
      await Share.share({ message: String(uriOrUrl) });
    } catch (e: unknown) {
      safeAlert("Ошибка", getErrorText(e));
    }
  }, [current, getErrorText, safeAlert]);

  const previewAttachment = useCallback(async (pid: string, groupKey: string, title: string, busyKey: string) => {
    const att = await getLatestProposalAttachmentPreview(pid, groupKey);
    if (!isPdfLike(att.fileName, att.url)) {
      await openSignedUrlUniversal(att.url, att.fileName);
      return;
    }

    const template = createPdfDocumentDescriptor({
      uri: att.url,
      title,
      fileName: att.fileName,
      documentType: "attachment_pdf",
      source: "attachment",
      originModule: "accountant",
      entityId: pid,
    });
    const doc = await preparePdfDocument({
      busy: gbusy,
      supabase,
      key: busyKey,
      label: "Открываю документ…",
      descriptor: template,
      getRemoteUrl: () => att.url,
    });
    await previewPdfDocument(doc, { router });
  }, [gbusy, router]);

  const onOpenProposalSource = useCallback(async () => {
    const pid = String(current?.proposal_id ?? "").trim();
    if (!pid) return;

    try {
      await previewAttachment(pid, "proposal_pdf", "Документ предложения", `pdf:acc:proposal-src:${pid}`);
    } catch (e: unknown) {
      safeAlert("Документ предложения", getErrorText(e));
    }
  }, [current, getErrorText, previewAttachment, safeAlert]);

  const onOpenInvoiceDoc = useCallback(async () => {
    const pid = String(current?.proposal_id ?? "").trim();
    if (!pid) return;

    try {
      await previewAttachment(pid, "invoice", "Счет", `pdf:acc:invoice:${pid}`);
    } catch (e: unknown) {
      safeAlert("Счет", getErrorText(e));
    }
  }, [current, getErrorText, previewAttachment, safeAlert]);

  const onOpenPaymentReport = useCallback(async () => {
    const propId = String(current?.proposal_id ?? "").trim();

    let payId = currentPaymentId;
    if (!payId && propId) {
      payId = await fetchLastPaymentIdByProposal(propId);
      if (payId) setCurrentPaymentId(payId);
    }

    if (!payId) {
      safeAlert("Платежное поручение", "Не найден payment_id для выбранного предложения.");
      return;
    }

    const template = await generatePaymentOrderPdfDocument(payId, "accountant");
    const doc = await preparePdfDocument({
      busy: gbusy,
      supabase,
      key: `pdf:acc:pay:${payId}`,
      label: "Открываю платежное поручение…",
      descriptor: {
        ...template,
        title: `Платежное поручение ${payId}`,
        fileName: buildPdfFileName({
          documentType: "payment_order",
          title: supplierName || "payment_order",
          entityId: payId,
        }),
      },
      getRemoteUrl: () => template.uri,
    });
    await previewPdfDocument(doc, { router });
  }, [current, currentPaymentId, gbusy, router, safeAlert, setCurrentPaymentId, supplierName]);

  const openLegacyAttachment = useCallback(async (pid: string, groupKey: string) => {
    await openAttachment(pid, groupKey, { all: false });
  }, []);

  return {
    onOpenProposalPdf,
    onShareCard,
    onOpenProposalSource,
    onOpenInvoiceDoc,
    onOpenPaymentReport,
    openLegacyAttachment,
  };
}
