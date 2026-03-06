import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Platform, Share } from "react-native";
import { runPdfTop } from "../../lib/pdfRunner";
import { supabase } from "../../lib/supabaseClient";
import { exportPaymentOrderPdf, exportProposalPdf } from "../../lib/catalog_api";
import { openAttachment } from "../../lib/files";
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
    invoiceNo,
    invoiceDate,
    bankName,
    bik,
    rs,
    inn,
    kpp,
    gbusy,
    safeAlert,
    getErrorText,
  } = params;

  const onOpenProposalPdf = useCallback(async () => {
    const pid = String(current?.proposal_id ?? "").trim();
    if (!pid) return;

    await runPdfTop({
      busy: gbusy,
      supabase,
      key: `pdf:acc:prop:${pid}`,
      label: "Готовлю PDF...",
      mode: "preview",
      fileName: `Предложение_${pid}`,
      getRemoteUrl: () => exportProposalPdf(pid, "preview"),
    });
  }, [current, gbusy]);

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

  const onOpenProposalSource = useCallback(async () => {
    const pid = String(current?.proposal_id ?? "").trim();
    if (!pid) return;

    try {
      await openAttachment(pid, "proposal_pdf", { all: false });
    } catch (e: unknown) {
      safeAlert(
        "Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВР В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р вЂ™Р’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚Сњ РВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¶Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р В Р‹РВ Р’В Р В Џ",
        getErrorText(e),
      );
    }
  }, [current, getErrorText, safeAlert]);

  const onOpenInvoiceDoc = useCallback(async () => {
    const pid = String(current?.proposal_id ?? "").trim();
    if (!pid) return;

    try {
      await openAttachment(pid, "invoice", { all: false });
    } catch (e: unknown) {
      safeAlert("Р В Р’В Р вЂ™Р’В Р В Р’В Р В РІР‚в„–Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р В Р‹РВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р вЂ™Р’ВР В Р’В Р В Р‹РВ Р†РВ РІР‚С™С™ (invoice)", getErrorText(e));
    }
  }, [current, getErrorText, safeAlert]);

  const onOpenPaymentReport = useCallback(async () => {
    const propId = String(current?.proposal_id ?? "").trim();

    let payId = currentPaymentId;
    if (!payId && propId) {
      payId = await fetchLastPaymentIdByProposal(propId);
      if (payId) setCurrentPaymentId(payId);
    }

    if (!payId) {
      safeAlert(
        "Р В Р’В Р вЂ™Р’В Р В Р Р‹РЎСџРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¶Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р Р†РІР‚С›РІР‚“РВ Р’В Р вЂ™Р’В Р В Р вЂ Р Р†Р вЂљРЎвЂєР Р†Р вЂљРІР‚њ РВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р В Р‹РВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р вЂ™Р’ВР В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ў",
        "РВ Р’В Р вЂ™Р’В Р В Р Р‹Р РЋРЎв„ўР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ў payment_id. РВ Р’В Р вЂ™Р’В Р В Р’В Р В РІР‚в„–Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В¦Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р В Р‹РВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В° Р В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В±Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р В Р‹РВ Р’В Р В РІР‚В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРІР‚ќРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р вЂ™Р’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¶ Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р вЂ Р Р†Р вЂљРЎвЂєР Р†Р вЂљРІР‚њРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’Вµ Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В· Р В Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р вЂ™Р’В Р В РЎС›Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’В Р В Р’В Р Р†Р‚в„ўРВ РІР‚в„ўР вЂ™Р’В«Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВР В Р’В Р В Р‹РВ Р’В Р РЋРІР‚њРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р В Р‹РВ Р’В Р В РЏРВ Р’В Р Р†Р‚в„ўРВ РІР‚в„ўР вЂ™Р’В».",
      );
      return;
    }

    await runPdfTop({
      busy: gbusy,
      supabase,
      key: `pdf:acc:pay:${payId}`,
      label: "Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎвЂќР В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р‚СњРВ Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРЎв„ўР В Р’В Р В Р‹РВ Р†РВ РІР‚С™Р Р†РІР‚С›РІР‚“РВ Р’В Р вЂ™Р’В Р В Р’В Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р’В Р Р†Р вЂљРІвЂћвЂ“ Р В Р’В Р вЂ™Р’В Р В Р Р‹Р Р†Р вЂљРЎС›Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р В Р‹РВ Р’В Р В Р‹РВ Р†РВ РІР‚С™Р вЂ™Р’ВР В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р В РІР‚В Р В Р’В Р Р†Р вЂљРЎв„ўР В РІР‚в„ўР вЂ™Р’В¦",
      mode: "preview",
      fileName: `Р В Р’В Р вЂ™Р’В Р В Р Р‹РЎСџРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В»Р В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В°Р В Р’В Р В Р‹РВ Р†РВ РІР‚С™РЎв„ўРВ Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’ВµР В Р’В Р вЂ™Р’В Р В РІР‚в„ўР вЂ™Р’В¶_${payId}`,
      getRemoteUrl: () =>
        exportPaymentOrderPdf(payId, {
          supplier: supplierName || current?.supplier || null,
          invoice_number: invoiceNo || current?.invoice_number || null,
          invoice_date: invoiceDate || current?.invoice_date || null,
          bank_name: bankName || null,
          bik: bik || null,
          rs: rs || null,
          inn: inn || null,
          kpp: kpp || null,
        }),
    });
  }, [
    bankName,
    bik,
    current,
    currentPaymentId,
    gbusy,
    inn,
    invoiceDate,
    invoiceNo,
    kpp,
    rs,
    safeAlert,
    setCurrentPaymentId,
    supplierName,
  ]);

  return {
    onOpenProposalPdf,
    onShareCard,
    onOpenProposalSource,
    onOpenInvoiceDoc,
    onOpenPaymentReport,
  };
}
