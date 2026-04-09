import { useCallback } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";

import { supabase } from "../../../lib/supabaseClient";
import type { RequestDetails } from "../../../lib/catalog_api";
import type { BusyCtx } from "../../../ui/GlobalBusy";
import { getPdfFlowErrorMessage } from "../../../lib/documents/pdfDocumentActions";
import {
  prepareAndPreviewGeneratedPdf,
  prepareAndShareGeneratedPdf,
} from "../../../lib/pdf/pdf.runner";
import { recordCatchDiscipline } from "../../../lib/observability/catchDiscipline";
import { buildForemanRequestPdfDescriptor } from "../foreman.requestPdf.service";

export function useForemanPdf(gbusy: BusyCtx) {
  const router = useRouter();

  const runRequestPdf = useCallback(
    async (
      mode: "share" | "preview",
      requestId: string,
      requestDetails: RequestDetails | null,
      syncMeta: (rid: string, ctx: string) => Promise<void>,
    ) => {
      const ridKey = String(requestId).trim();
      if (!ridKey) return;

      try {
        await syncMeta(ridKey, mode === "share" ? "onPdfShare" : "onPdfExport");

        const descriptor = await buildForemanRequestPdfDescriptor({
          requestId: ridKey,
          generatedBy: requestDetails?.foreman_name ?? null,
          displayNo: requestDetails?.display_no ?? null,
          title: requestDetails?.display_no
            ? `Заявка ${requestDetails.display_no}`
            : `Заявка ${ridKey}`,
        });

        if (mode === "share") {
          await prepareAndShareGeneratedPdf({
            busy: gbusy,
            supabase,
            key: `pdfshare:request:${ridKey}`,
            label: "Подготавливаю файл...",
            descriptor,
          });
          return;
        }

        await prepareAndPreviewGeneratedPdf({
          busy: gbusy,
          supabase,
          key: `pdf:request:${ridKey}`,
          label: "Открываю PDF…",
          descriptor,
          router,
        });
      } catch (error) {
        recordCatchDiscipline({
          screen: "foreman",
          surface: mode === "share" ? "foreman_pdf_share" : "foreman_pdf_open",
          event: mode === "share" ? "foreman_request_pdf_share_failed" : "foreman_request_pdf_open_failed",
          kind: "critical_fail",
          error,
          category: "ui",
          sourceKind: "pdf:request",
          errorStage: mode === "share" ? "share" : "open_view",
          extra: {
            requestId: ridKey,
            action: mode === "share" ? "runRequestPdfShare" : "runRequestPdfPreview",
          },
        });
        Alert.alert("PDF", getPdfFlowErrorMessage(error, "Не удалось открыть PDF"));
      }
    },
    [gbusy, router],
  );

  return { runRequestPdf };
}
