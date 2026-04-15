import { useCallback } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import type { SupabaseClient } from "@supabase/supabase-js";

import { generateProposalPdfDocument } from "../../lib/catalog_api";
import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import {
  getPdfFlowErrorMessage,
  prepareAndPreviewPdfDocument,
} from "../../lib/documents/pdfDocumentActions";

export function useBuyerDocuments(params: {
  busy: unknown;
  supabase: SupabaseClient;
  /** XR-PDF: dismiss callback for the parent modal (if any). */
  onBeforeNavigate?: (() => void | Promise<void>) | null;
}) {
  const { busy, supabase, onBeforeNavigate } = params;
  const router = useRouter();

  const openProposalPdf = useCallback(
    async (pid: string | number) => {
      const id = String(pid || "").trim();
      if (!id) return;

      try {
        const template = await generateProposalPdfDocument(id, "buyer");
        await prepareAndPreviewPdfDocument({
          busy,
          supabase,
          key: `pdf:proposal:${id}`,
          label: "Открываю PDF…",
          descriptor: {
            ...template,
            title: `Предложение ${id.slice(0, 8)}`,
            fileName: buildPdfFileName({
              documentType: "proposal",
              title: "predlozhenie",
              entityId: id,
            }),
          },
          router,
          // XR-PDF: dismiss parent modal before pushing PDF viewer route
          onBeforeNavigate,
        });
      } catch (error) {
        Alert.alert("PDF", getPdfFlowErrorMessage(error, "Не удалось открыть PDF"));
      }
    },
    [busy, onBeforeNavigate, supabase, router],
  );

  return { openProposalPdf };
}
