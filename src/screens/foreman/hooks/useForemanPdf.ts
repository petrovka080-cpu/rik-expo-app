import { useCallback } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";

import { supabase } from "../../../lib/supabaseClient";
import type { RequestDetails } from "../../../lib/catalog_api";
import type { BusyCtx } from "../../../ui/GlobalBusy";
import { buildPdfFileName } from "../../../lib/documents/pdfDocument";
import { getPdfFlowErrorMessage } from "../../../lib/documents/pdfDocumentActions";
import { generateRequestPdfDocument } from "../../../lib/documents/pdfDocumentGenerators";
import {
  prepareAndPreviewGeneratedPdf,
  prepareAndShareGeneratedPdf,
} from "../../../lib/pdf/pdf.runner";

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

        const template = await generateRequestPdfDocument({
          requestId: ridKey,
          originModule: "foreman",
        });
        const title = requestDetails?.display_no
          ? `Заявка ${requestDetails.display_no}`
          : `Заявка ${ridKey}`;
        const descriptor = {
          ...template,
          title,
          fileName: buildPdfFileName({
            documentType: "request",
            title: requestDetails?.display_no || "zayavka",
            entityId: ridKey,
          }),
        };

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
        Alert.alert("PDF", getPdfFlowErrorMessage(error, "Не удалось открыть PDF"));
      }
    },
    [gbusy, router],
  );

  return { runRequestPdf };
}
