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
            label: "РџРѕРґРіРѕС‚Р°РІР»РёРІР°СЋ С„Р°Р№Р»...",
            descriptor,
          });
          return;
        }

        await prepareAndPreviewGeneratedPdf({
          busy: gbusy,
          supabase,
          key: `pdf:request:${ridKey}`,
          label: "РћС‚РєСЂС‹РІР°СЋ PDFвЂ¦",
          descriptor,
          router,
        });
      } catch (error) {
        Alert.alert("PDF", getPdfFlowErrorMessage(error, "РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РєСЂС‹С‚СЊ PDF"));
      }
    },
    [gbusy, router],
  );

  return { runRequestPdf };
}
