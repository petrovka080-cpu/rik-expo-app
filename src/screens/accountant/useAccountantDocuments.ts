import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useRouter } from "expo-router";
import { Platform, Share } from "react-native";

import { openAppAttachment } from "../../lib/documents/attachmentOpener";
import { supabase } from "../../lib/supabaseClient";
import {
  exportProposalPdf,
  generateProposalPdfDocument,
} from "../../lib/catalog_api";
import { getLatestProposalAttachmentPreview, isPdfLike, openAttachment } from "../../lib/files";
import { buildPdfFileName, createPdfDocumentDescriptor } from "../../lib/documents/pdfDocument";
import { prepareAndPreviewPdfDocument } from "../../lib/documents/pdfDocumentActions";
import { useAccountantPaymentPdfBoundary } from "./accountant.paymentPdf.boundary";
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
  const openPaymentReportPreview = useAccountantPaymentPdfBoundary({
    busy: gbusy,
    safeAlert,
    setCurrentPaymentId,
  });

  const onOpenProposalPdf = useCallback(async () => {
    const pid = String(current?.proposal_id ?? "").trim();
    if (!pid) return;

    const template = await generateProposalPdfDocument(pid, "accountant");
    await prepareAndPreviewPdfDocument({
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
      router,
    });
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

  const previewAttachment = useCallback(
    async (pid: string, groupKey: string, title: string, busyKey: string) => {
      const att = await getLatestProposalAttachmentPreview(pid, groupKey);
      if (!isPdfLike(att.fileName, att.url)) {
        await openAppAttachment({ url: att.url, fileName: att.fileName });
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
      await prepareAndPreviewPdfDocument({
        busy: gbusy,
        supabase,
        key: busyKey,
        label: "Открываю документ…",
        descriptor: template,
        router,
      });
    },
    [gbusy, router],
  );

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
      await previewAttachment(pid, "invoice", "Счёт", `pdf:acc:invoice:${pid}`);
    } catch (e: unknown) {
      safeAlert("Счёт", getErrorText(e));
    }
  }, [current, getErrorText, previewAttachment, safeAlert]);

  const onOpenPaymentReport = useCallback(async () => {
    await openPaymentReportPreview({
      proposalId: current?.proposal_id,
      paymentId: currentPaymentId,
      supplierName,
    });
  }, [current?.proposal_id, currentPaymentId, openPaymentReportPreview, supplierName]);

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
